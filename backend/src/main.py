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
    "http://localhost:5500",
    "https://tradeit-x2uy.onrender.com",
]

app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ["SESSION_SECRET"],
    same_site="lax",
    https_only=False,
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


@app.get("/")
def home():
    return {"message": "Backend radi!"}


@app.get("/api/v1/admin/test")
def admin_test(admin: User = Depends(require_admin)):
    return {
        "message": "Welcome, administrator!",
        "user_id": admin.id,
    }
