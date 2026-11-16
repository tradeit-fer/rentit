import os
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from src.dependencies import get_db
from src.models.auth_sessions import AuthSession
from src.models.users import User
from src.services.auth import get_or_create_google_user
from src.services.session_service import (
    SESSION_DURATION,
    create_session,
    get_current_session,
    get_current_user,
    revoke_session,
    rotate_csrf_token,
    verify_csrf,
)

# Zadržavamo /api/v1/auth da ostane usklađeno s Google Cloud Console redirect URI-jem
router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

session_cookie_secure = os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true"
session_cookie_samesite = os.getenv("SESSION_COOKIE_SAMESITE", "none").lower()

oauth = OAuth()
oauth.register(
   name="google",
   client_id=os.environ["GOOGLE_CLIENT_ID"],
   client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
   server_metadata_url=(
      "https://accounts.google.com/.well-known/openid-configuration"
   ),
   client_kwargs={
      "scope": "openid email profile"
   },
)

@router.get("/google")
async def google_login(request: Request):
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    google_user = token["userinfo"]

    user, is_new = get_or_create_google_user(db, google_user)
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

    response.headers["Cache-Control"] = "no-store"
    return response

@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }

@router.get("/csrf")
def get_csrf_token(
    response: Response,
    session: AuthSession = Depends(get_current_session),
    db: Session = Depends(get_db),
):
    csrf_token = rotate_csrf_token(db, session)
    response.headers["Cache-Control"] = "no-store"
    return {
        "csrf_token": csrf_token
    }


@router.post("/logout")
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