from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.dependencies import get_db
from src.schemas.error import ErrorResponse
from src.schemas.listing import ListingCreate, ListingResponse
from src.services.listing_service import ListingService
from src.services.exceptions import NotFoundError

from src.services.session_service import get_current_user, verify_csrf

router = APIRouter(prefix = "/api/v2/listings", tags = ["Listings"])

# GET /api/v2/listings - svi oglasi + pretraga oglasa
@router.get("", response_model = List[ListingResponse])
def get_listings(
    category: Optional[str] = Query(None, description = "Naziv kategorije"),
    search: Optional[str] = Query(None, description = "Pretraga po naslovu ili opisu"),
    lat: Optional[float] = Query(None, ge = -90, le = 90, description = "Širina geolokacije"),
    lng: Optional[float] = Query(None, ge = -180, le = 180, description = "Dužina geolokacije"),
    radius: Optional[float] = Query(None, gt = 0, description = "Radijus pretrage u kilometrima"),
    min_price: Optional[int] = Query(None, ge = 0, description = "Minimalna cijena u centima"),
    max_price: Optional[int] = Query(None, ge = 0, description = "Maksimalna cijena u centima"),
    start_date: Optional[str] = Query(None, description = "Početak najma (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description = "Kraj najma (YYYY-MM-DD)"),
    sort: Optional[str] = Query(None, description = "Sortiranje rezultata"),
    page: int = Query(1, ge = 1, description = "Broj stranice"),
    limit: int = Query(20, ge = 1, le = 100, description = "Broj stavki po stranici"),
    db: Session = Depends(get_db),
):

    # min_price mora biti manje od max_price
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "UNPROCESSABLE_ENTITY",
                "message": "Minimum price cannot be greater than maximum price.",
            },
        )

    # lat i lng moraju doci zajedno
    if (lat is None) != (lng is None):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "UNPROCESSABLE_ENTITY",
                "message": "Latitude and longitude must be provided together.",
            },
        )

    # radius nema smisla bez tocke
    if radius is not None and lat is None:
        raise HTTPException(
            status_code = 422,
            detail = {
                "code": "UNPROCESSABLE_ENTITY",
                "message": "Radius requires latitude and longitude.",
            },
        )


    service = ListingService(db)
    listings = service.get_listings(
        category=category,
        search=search,
        lat=lat,
        lng=lng,
        radius=radius,
        min_price=min_price,
        max_price=max_price,
        start_date=start_date,
        end_date=end_date,
        sort=sort,
        page=page,
        limit=limit,
    )
    return listings

# GET /api/v2/listings/{listing_id} - detalji jednog oglasa
@router.get(
    "/{listing_id}",
    response_model = ListingResponse,
    responses = {404: {"model": ErrorResponse}},
)
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    listing = ListingService(db).get_listing_by_id(listing_id)
    if not listing:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail = {
                "code": "NOT_FOUND",
                "message": f"Oglas s ID-jem {listing_id} nije pronađen."
            },
        )
    return listing

# POST /api/v2/listings - kreiranje novog oglasa
@router.post(
    "",
    response_model = ListingResponse,
    status_code = status.HTTP_201_CREATED,
    responses = {
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
)
def create_listing(
    payload: ListingCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),     # osiguravanje CSRF provjere
):
    service = ListingService(db)
    try:
        new_listing = service.create_listing(payload, current_user.id)
    except NotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error.message,
        )
    return new_listing
