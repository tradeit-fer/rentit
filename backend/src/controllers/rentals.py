from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.dependencies import get_db
from src.models.users import User
from src.schemas.error import ErrorResponse
from src.schemas.rentals import (
    HandoverCreate,
    RentalBookingCreate,
    RentalQuoteCreate,
    RentalQuoteResponse,
)

from src.services import rental_service
from src.services.session_service import get_current_user, verify_csrf

# ruter za rezervacije i najam
router = APIRouter(prefix = "/api/v2/rentals", tags = ["Rentals"])

# POST /api/v2/rentals/quote - izračun cijene najma
@router.post(
    "/quote",
    response_model = RentalQuoteResponse,
    status_code = status.HTTP_200_OK,
    responses = {400: {"model": ErrorResponse}}
)
def create_rental_quote(
    payload: RentalQuoteCreate,
    db: Session = Depends(get_db),
):
    quote = rental_service.calculate_quote(db = db, quote_data = payload)
    if not quote:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail = {
                "code": "DATES_UNAVAILABLE",
                "message": "Oglas nije dostupan za odabrani vremenski period"
            },
        )
    return quote

# POST /api/v2/rentals - potvrda i kreiranje rezervacije
@router.post(
    "",
    status_code = status.HTTP_201_CREATED,
    responses = {
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
)
def create_booking(
    payload: RentalBookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
):
    booking = rental_service.create_booking(
        db = db, booking_data = payload, renter_id = current_user.id
    )
    if not booking:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail = {
                "code": "INVALID_QUOTE",
                "message": "Ponuda (quote) je istekla ili nije važeća."
            },
        )
    return booking

# POST /api/v2/rentals/{rental_id}/handover - primopredaja
@router.post(
    "/{rental_id}/handover",
    status_code = status.HTTP_200_OK,
    responses = {
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},   
    },
)
def record_handover(
    rental_id: int,
    payload: HandoverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
):
    success = rental_service.process_handover(
        db = db, rental_id = rental_id, handover_data = payload, user_id = current_user.id
    )
    if not success:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail={
                "code": "RENTAL_NOT_FOUND",
                "message": "Rezervacija nije pronađena ili niste sudionik u njoj.",
            },
        )
    return {"status": "success", "message": f"Handover '{payload.stage}' uspješno zabilježen."}