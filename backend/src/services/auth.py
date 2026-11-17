from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.models.users import User
from src.models.external_identities import ExternalIdentity
from src.models.user_profiles import UserProfile

# kreiranje google profila
def _create_google_user_profile(db: Session, user: User, display_name: str) -> UserProfile:
   profile = UserProfile(
      id=str(uuid4()),
      user_id=user.id,
      display_name=display_name,
   )
   db.add(profile)
   try:
      db.commit()
   except Exception:
      db.rollback()
      raise
   return profile

def get_or_create_google_user(db: Session, google_user: dict,) -> tuple[User, bool]:
   google_sub = google_user.get("sub")
   email = (google_user.get("email") or "").strip().lower()
   name = google_user.get("name") or email

   if not google_sub or not email or google_user.get("email_verified") is not True:
      raise HTTPException(status_code=401, detail="Google identity could not be verified.",)

   # Prvo se provjerava postoji li već ovaj Google identitet

   identity = db.scalar(
      select(ExternalIdentity).where(
         ExternalIdentity.provider == "google",
         ExternalIdentity.provider_subject == google_sub,
      )
   )

   if identity:
      user = db.get(User, identity.user_id)
      if user is None or not user.is_active:
         raise HTTPException(status_code=403, detail="Account is unavailable.",)

      # prepoznaje profil i korisnicima koji su se registrirali prije uvođenja profila
      if user.profile is None:
         _create_google_user_profile(db, user, user.name)

      return user, False

   # Bitno je da ne povežemo automatski račun samo prema e-mailu
   existing_user = db.scalar(
      select(User).where(
         func.lower(User.email) == email
      )
   )

   if existing_user:
      raise HTTPException(
         status_code=409, detail="An account with this email already exists.",)

   # Stvaranje RentIt korisnika

   user = User(
      id=str(uuid4()),
      name=name,
      email=email,
      role="user",
      is_active=True,
   )

   # Vezanje Usera s njegovim Google identitetom

   identity = ExternalIdentity(
      id=str(uuid4()),
      user_id=user.id,
      provider="google",
      provider_subject=google_sub,
   )
   profile = UserProfile(
      id=str(uuid4()),
      user_id=user.id,
      display_name=name,
   )

   try:
      db.add(user)
      db.add(identity)
      db.add(profile)
      db.commit()
   except IntegrityError:
      db.rollback()
      raise HTTPException(status_code=409, detail="Account registration conflict.",)

   db.refresh(user)

   return user, True
