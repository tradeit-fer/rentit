import sqlalchemy as sa
from sqlalchemy import select, join
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from src.services.exceptions import PermissionDeniedError, ConflictError, NotFoundError
from src.services.categories import CategoryService
from src.services.user import UserService
from src.services.rental_service import BLOCKING_RENTAL_STATUSES

from src.models.listings import Listing
from src.models.listing_location import ListingLocation
from src.models.rental_request import RentalRequest
from src.models.rentals import Rental

from src.schemas.listing import OwnerInfo, ListingCreate


class ListingService:
    def __init__(self, db: Session):
        self.db = db

    def getOwner(self, listingID: int) -> OwnerInfo:
        us = UserService(self.db)
        listing = self.db.get(Listing, listingID)
        if listing is None:
            raise NotFoundError("Oglas", listingID)
        return us.getOwnerByID(listing.owner_id)

    def create_listing(self, listing: ListingCreate, owner_ID: str) -> Listing:
        category_id = CategoryService(self.db).get_ID_by_name(listing.category)
        listing_row = Listing(
            title=listing.title,
            description=listing.description,
            owner_id=owner_ID,
            category_id=category_id,
            price_cents=listing.price_per_day,
            deposit_cents=listing.deposit,
            location=ListingLocation(public_location=listing.location),
            tags=listing.tags,
            features=listing.features,
            images=listing.images,
        )
        try:
            self.db.add(listing_row)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return self.get_listing_by_id(listing_row.id)

    def get_listings(
            self,
            category: str | None = None,
            search: str | None = None,
            lat: float | None = None,
            lng: float | None = None,
            radius: float | None = None,
            min_price: int | None = None,
            max_price: int | None = None,
            start_date: str | None = None,
            end_date: str | None = None,
            sort: str | None = None,
            page: int = 1,
            limit: int = 20,
        ) -> list[Listing]:
            stmt = (
                sa.select(Listing)
                .outerjoin(ListingLocation, Listing.id == ListingLocation.listing_id)
                .options(
                    joinedload(Listing.category),
                    joinedload(Listing.location),
                    joinedload(Listing.owner),
                )
            )
    
            # 1. Filtriranje po kategoriji (uključujući potkategorije)
            if category:
                cs = CategoryService(self.db)
                categories = cs.get_with_descendants(category, True)
                stmt = stmt.where(Listing.category_id.in_(categories))
    
            # 2. Pretraga po naslovu ili opisu
            if search:
                stmt = stmt.where(
                    sa.or_(
                        Listing.title.ilike(f"%{search}%"),
                        Listing.description.ilike(f"%{search}%"),
                    )
                )
    
            # 3. Filtriranje po rasponu cijene (u centima)
            if min_price is not None:
                stmt = stmt.where(Listing.price_cents >= min_price)
            if max_price is not None:
                stmt = stmt.where(Listing.price_cents <= max_price)
    
            # 4. Geolokacijsko filtriranje u radijusu (km)
            if lat is not None and lng is not None and radius is not None:
                earth_radius_km = 6371.0
                distance_expr = earth_radius_km * sa.func.acos(
                    sa.func.cos(sa.func.radians(lat))
                    * sa.func.cos(sa.func.radians(ListingLocation.latitude))
                    * sa.func.cos(
                        sa.func.radians(ListingLocation.longitude) - sa.func.radians(lng)
                    )
                    + sa.func.sin(sa.func.radians(lat))
                    * sa.func.sin(sa.func.radians(ListingLocation.latitude))
                )
                stmt = stmt.where(distance_expr <= radius)

            # 5. Filtriranje po vremenskoj dostupnosti
            if start_date is not None and end_date is not None:
                zauzeto = (
                    sa.select(sa.literal(1))
                    .select_from(RentalRequest)
                    .join(Rental, Rental.request_id == RentalRequest.id)
                    .where(
                        RentalRequest.listing_id == Listing.id,
                        Rental.status.in_(BLOCKING_RENTAL_STATUSES),
                        RentalRequest.start_date < end_date,
                        RentalRequest.end_date > start_date,
                    )
                    .exists()
                )
                stmt = stmt.where(~zauzeto)

            # 6. Sortiranje rezultata
            if sort == "price_asc":
                stmt = stmt.order_by(Listing.price_cents.asc())
            elif sort == "price_desc":
                stmt = stmt.order_by(Listing.price_cents.desc())
            else:
                stmt = stmt.order_by(Listing.id.desc())
    
            # 7. Paginacija
            offset = (page - 1) * limit
            stmt = stmt.offset(offset).limit(limit)
    
            return list(self.db.scalars(stmt).unique())

    def get_listing_by_id(self, listing_id: int) -> Listing | None:
            stmt = (
                sa.select(Listing)
                .options(
                    joinedload(Listing.category),
                    joinedload(Listing.location),
                    joinedload(Listing.owner),
                )
                .where(Listing.id == listing_id)
            )
            return self.db.scalar(stmt)

