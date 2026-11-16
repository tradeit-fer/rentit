import os
from pathlib import Path
from dotenv import load_dotenv

# Učitavanje .env datoteke prije uvoza aplikacije
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from src.authorization import require_admin
from src.controllers.auth import router as auth_router
from src.controllers.listings import router as listings_router
from src.controllers.rentals import router as rentals_router
from src.models.users import User

app = FastAPI(
    title="RentIt API",
    description="API specifikacija za RentIt web aplikaciju",
    version="2.0.0",
)

# Frontend adrese kojima je dopušten pristup API-ju
origins = [
    origin.strip()
    for origin in (
        os.getenv("CORS_ORIGINS") or os.environ["FRONTEND_URL"]
    ).split(",")
    if origin.strip()
]

session_cookie_secure = os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true"
session_cookie_samesite = os.getenv("SESSION_COOKIE_SAMESITE", "none").lower()
oauth_session_cookie_secure = os.getenv("OAUTH_SESSION_COOKIE_SECURE", "false").lower() == "true"
app.add_middleware(
   SessionMiddleware,
   secret_key=os.environ["SESSION_SECRET"],
   same_site="lax",
   https_only=oauth_session_cookie_secure,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registracija ruta
app.include_router(auth_router)
app.include_router(listings_router)
app.include_router(rentals_router)

   google_user = token["userinfo"]

   user, is_new = get_or_create_google_user(db, google_user,)

   session_token, csrf_token = create_session(db, user.id)

   response = RedirectResponse(
      url=os.environ["FRONTEND_URL"],
      status_code=303,
   )

   response.set_cookie(
      key="rentit_session",
      value=session_token,
      httponly=True,
      secure=session_cookie_secure,
      samesite=session_cookie_samesite,
      max_age=int(SESSION_DURATION.total_seconds()),
      path="/",
   )

   response.headers["Cache-Control"] = "no-store" #NE SPREMAT U PREDMEMORIJU ZBOG OSJETLJIVIH INFORMACIJA

   return response

@app.get("/")
def home():
    return {"message": "Backend radi!"}

   csrf_token = rotate_csrf_token(db, session)

   response.headers["Cache-Control"] = "no-store"

   return {
      "csrf_token": csrf_token
   }

@app.post("/api/v1/auth/logout")
def logout(
   response: Response,
   session: AuthSession = Depends(verify_csrf),
   db: Session = Depends(get_db),
):

   revoke_session(db, session)

   response.delete_cookie(
      key="rentit_session",
      path="/",
      secure=session_cookie_secure,
      samesite=session_cookie_samesite,
   )

   response.headers["Cache-Control"] = "no-store"

   return{
      "message": "Succesfully logged out"
   }

@app.get("/api/v1/admin/test")
def admin_test(admin: User = Depends(require_admin)):
    return {
        "message": "Welcome, administrator!",
        "user_id": admin.id,
    }
