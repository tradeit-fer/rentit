import sqlalchemy as sa
from sqlalchemy import select, join
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from services.exceptions import PermissionDeniedError, ConflictError, NotFoundError
from services.categories import CategoryService
from services.user import UserService

from models.listings import Listing
from src.models.listings import Listing
from src.models.listing_location import ListingLocation

from schemas.listing import OwnerInfo, ListingCreate


class ListingService:
    def __init__(self, db: Session):
        self.db = db


    def getByCategory(self, category: str) -> list[Listing]:
        ls = CategoryService(self.db)
        categories = ls.get_with_descendants(category, True)

        stmt = (sa.select(Listing).where(Listing.category.in_(categories)))

        listings = list(self.db.scalars(stmt))

        if listings is None:
            raise NotFoundError("Oglasi u kategoriji", category)
        return listings

    def getOwner(self, listingID: int) -> OwnerInfo:
        us = UserService(self.db)
        listing = self.db.get(Listing, listingID)
        if listing is None:
            raise NotFoundError("Oglas", listingID)
        return us.getOwnerByID(listing.owner_id)

    def create(self, listing: ListingCreate, owner_ID: str) -> Listing:
            cs = CategoryService(self.db)
    
            listing_row = Listing()
            listing_row.title = listing.title
            listing_row.description = listing.description
            listing_row.owner_id = owner_ID
            listing_row.category_id = cs.get_ID_by_name(listing.category)
            listing_row.price_cents = listing.price_per_day
    
            self.db.add(listing_row)
            self.db.commit()
            self.db.refresh(listing_row)
    
            # Vraćamo oglas preko get_listing_by_id da se učitaju sve relacije za ListingResponse
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
                    joinedload(Listing.category_rel),
                    joinedload(Listing.location_rel),
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
    
            # 5. Sortiranje rezultata
            if sort == "price_asc":
                stmt = stmt.order_by(Listing.price_cents.asc())
            elif sort == "price_desc":
                stmt = stmt.order_by(Listing.price_cents.desc())
            else:
                stmt = stmt.order_by(Listing.id.desc())
    
            # 6. Paginacija
            offset = (page - 1) * limit
            stmt = stmt.offset(offset).limit(limit)
    
            return list(self.db.scalars(stmt).unique())

    def get_listing_by_id(self, listing_id: int) -> Listing | None:
            stmt = (
                sa.select(Listing)
                .options(
                    joinedload(Listing.category_rel),
                    joinedload(Listing.location_rel),
                    joinedload(Listing.owner),
                )
                .where(Listing.id == listing_id)
            )
            return self.db.scalar(stmt)