import sqlalchemy as sa
from sqlalchemy.orm import Session

from services.exceptions import PermissionDeniedError, ConflictError, NotFoundError

from models.user_profiles import UserProfile

class UserProfileService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_profile(self, user_id: int) -> UserProfile:
        self.db = self.db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        if not self.db:
            raise PermissionDeniedError()
        return self.db

    #def create(self, user_profile: UserProfile) -> UserProfile:
