from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Session

from src.models.listings import Listing
from src.models.rentals import Rental
from src.models.rental_request import RentalRequest
from src.models.rental_terms import RentalTerms

from src.schemas.rentals import (
    HandoverCreate,
    RentalBookingCreate,
    RentalQuoteCreate,
    RentalQuoteResponse,
)

PLATFORM_FEE_RATE = 0.10

# Statusi najmova koji blokiraju termin
BLOCKING_RENTAL_STATUSES = ("confirmed", "active")


def _is_available(db: Session, listing_id: int, start_date, end_date) -> bool:
    """
    Termin je zauzet ako postoji najam (rentals) za isti oglas čiji se
    datumi (pohranjeni u rental_request) preklapaju s traženim rasponom.
    """
    stmt = (
        sa.select(Rental.id)
        .join(RentalRequest, RentalRequest.id == Rental.request_id)
        .where(
            Rental.listing_id == listing_id,
            Rental.status.in_(BLOCKING_RENTAL_STATUSES),
            RentalRequest.start_date < end_date,
            RentalRequest.end_date > start_date,
        )
        .limit(1)
    )
    return db.scalar(stmt) is None


def _compute_price(price_cents: int, days: int) -> tuple[int, int, int]:
    """Vraća (rental_amount_cents, platform_fee_cents, total_amount_cents)."""
    rental_amount_cents = price_cents * days
    platform_fee_cents = int(rental_amount_cents * PLATFORM_FEE_RATE)
    return rental_amount_cents, platform_fee_cents, rental_amount_cents + platform_fee_cents


def calculate_quote(db: Session, quote_data: RentalQuoteCreate) -> RentalQuoteResponse | None:
    """
    Provjerava dostupnost oglasa i računa cijenu (dnevna cijena * broj dana + provizija).
    Shema nema tablicu za privremene ponude pa se ništa ne sprema u bazu 
    izračun je bez stanja, a konačne cijene upisuju se u rental_terms pri prihvaćanju zahtjeva.
    """
    listing = db.get(Listing, quote_data.listing_id)
    if not listing:
        return None

    days = (quote_data.end_date - quote_data.start_date).days
    if days <= 0:
        return None

    if not _is_available(db, listing.id, quote_data.start_date, quote_data.end_date):
        return None

    rental_amount_cents, platform_fee_cents, total_cents = _compute_price(
        listing.price_cents, days
    )

    return RentalQuoteResponse(
        listing_id=listing.id,
        start_date=quote_data.start_date,
        end_date=quote_data.end_date,
        days=days,
        price_per_day_cents=listing.price_cents,
        service_fee_cents=platform_fee_cents,
        total_cents=total_cents,
    )


def create_booking(
    db: Session, booking_data: RentalBookingCreate, renter_id: str
) -> RentalRequest | None:
    """
    Najmoprimac kreira zahtjev za najam (rental_request) sa statusom "pending".
    Stvarni najam (rentals + rental_terms) nastaje tek kad vlasnik prihvati zahtjev
    (vidi accept_request).
    Vraća None ako oglas ne postoji, najmoprimac je vlasnik, datumi nisu ispravni
    ili je termin već zauzet.
    """
    listing = db.get(Listing, booking_data.listing_id)
    if not listing or listing.owner_id == renter_id:
        return None

    if (booking_data.end_date - booking_data.start_date).days <= 0:
        return None

    if not _is_available(db, listing.id, booking_data.start_date, booking_data.end_date):
        return None

    request_row = RentalRequest(
        listing_id=listing.id,
        renter_id=renter_id,
        start_date=booking_data.start_date,
        end_date=booking_data.end_date,
        status="pending",
    )
    db.add(request_row)
    db.commit()
    db.refresh(request_row)

    return request_row


def accept_request(db: Session, request_id: int, owner_id: str) -> Rental | None:
    """
    Vlasnik oglasa prihvaća zahtjev: kreira se Rental (status "confirmed")
    i RentalTerms s fiksiranim iznosima. Vraća None ako zahtjev ne postoji,
    nije "pending", korisnik nije vlasnik ili je termin u međuvremenu zauzet.
    """
    request_row = db.get(RentalRequest, request_id)
    if not request_row or request_row.status != "pending":
        return None

    listing = db.get(Listing, request_row.listing_id)
    if not listing or listing.owner_id != owner_id:
        return None

    if not _is_available(db, listing.id, request_row.start_date, request_row.end_date):
        return None

    days = (request_row.end_date - request_row.start_date).days
    rental_amount_cents, platform_fee_cents, total_cents = _compute_price(
        listing.price_cents, days
    )

    rental_row = Rental(
        request_id=request_row.id,
        listing_id=listing.id,
        renter_id=request_row.renter_id,
        status="confirmed",
    )
    db.add(rental_row)
    db.flush()  # dohvaća rental_row.id za rental_terms

    db.add(
        RentalTerms(
            rental_id=rental_row.id,
            rental_amount_cents=rental_amount_cents,
            platform_fee_cents=platform_fee_cents,
            total_amount_cents=total_cents,
        )
    )
    request_row.status = "accepted"
    db.commit()
    db.refresh(rental_row)

    return rental_row


def process_handover(
    db: Session, rental_id: int, handover_data: HandoverCreate, user_id: str
) -> bool:
    """
    Ažurira status najma pri primopredaji (pickup -> active, return -> completed)
    ako je korisnik sudionik najma (vlasnik oglasa ili najmoprimac).
    Shema nema tablicu rental_handover, pa se bilješke ne spremaju.
    Vraća True pri uspjehu, inače False.
    """
    rental = db.get(Rental, rental_id)
    if not rental:
        return False

    # rentals nema owner_id – vlasnik se dohvaća preko oglasa
    listing = db.get(Listing, rental.listing_id)
    if not listing:
        return False

    if user_id not in (listing.owner_id, rental.renter_id):
        return False

    if handover_data.stage == "pickup" and rental.status == "confirmed":
        rental.status = "active"
    elif handover_data.stage == "return" and rental.status == "active":
        rental.status = "completed"
    else:
        return False

    db.commit()
    return True