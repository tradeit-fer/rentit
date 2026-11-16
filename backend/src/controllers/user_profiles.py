from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.dependencies import get_db
from src.models.users import User
from src.schemas.user import UserResponse
from src.services.session_service import get_current_user
from src.services.user_profiles import UserProfileService

router = APIRouter(prefix="/api/v2", tags=["User profiles"])

@router.get("/me", response_model=UserResponse, response_model_exclude_none=True)
def get_my_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Return the signed-in user's stored profile details."""
    profile = UserProfileService(db).get_user_profile(user.id)
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        display_name=profile.display_name if profile else None,
        phone=profile.phone if profile else None,
        city=profile.city if profile else None,
        bio=profile.bio if profile else None,
        avatar_key=profile.avatar_key if profile else None,
    )
