from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.user_profiles import UserProfile

class UserProfileService:
    def __init__(self, db: Session):
        self.db = db

    # dohvat profila iz baze
    def get_user_profile(self, user_id: str) -> UserProfile | None:
        return self.db.scalar(
            select(UserProfile).where(UserProfile.user_id == user_id)
        )
