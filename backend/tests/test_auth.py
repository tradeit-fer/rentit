#testovi rade bez potrebe ukljucivanja backenda ili frontenda
import os
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest #biblioteka za automatsko testiranje u pythonu. Prepoznaje funkcije koje pocinju s test_ i pokrece ih
from fastapi import HTTPException
from fastapi.testclient import TestClient


os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SESSION_SECRET", "test-only-secret")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault("FRONTEND_URL", "http://localhost:8000")

from src.main import app
from src.dependencies import get_db
from src.services import session_service
from src.services.session_service import get_current_session, get_current_user, verify_csrf
from src.authorization import require_admin
#src.main ce zahtijevati sve environ varijable pa ih uzimamo odmah na pocetku

@pytest.fixture #za pojasnjenje osobi koja se bude pitala, ovo je funkcija koja priprema podatek ili objekte potrebne testovima
def db():
    return MagicMock() #lazni objekt koji imitira ponasanje stvarnog objekta, odnosno SQLAlchemy sesija baze podataka u ovome slucaju


@pytest.fixture
def session():
    return SimpleNamespace( #jednostavan objekt kojem atributima pristupamo tako sto samo napisemo session.id ....
        id="s1", user_id="u1", token_hash=session_service.hash_token("real-session"),
        csrf_token_hash=session_service.hash_token("real-csrf"),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1), revoked_at=None,
    )


def test_create_session_stores_only_hashes(db):
    session_token, csrf_token = session_service.create_session(db, "u1")
    stored = db.add.call_args.args[0]
    assert stored.user_id == "u1"
    assert stored.token_hash == session_service.hash_token(session_token)
    assert stored.csrf_token_hash == session_service.hash_token(csrf_token)
    assert session_token != csrf_token
    assert stored.token_hash != session_token
    assert stored.csrf_token_hash != csrf_token
    db.commit.assert_called_once()


@pytest.mark.parametrize("cookie,record,expected", [
    (None, None, 401),
    ("bad", None, 401),
])
def test_current_session_rejects_missing_or_unknown_cookie(db, cookie, record, expected):
    db.scalar.return_value = record
    request = SimpleNamespace(cookies={"rentit_session": cookie} if cookie else {})
    with pytest.raises(HTTPException) as exc:
        session_service.get_current_session(request, db)
    assert exc.value.status_code == expected


@pytest.mark.parametrize("state", ["revoked", "expired"])
def test_current_session_rejects_revoked_or_expired(db, session, state):
    if state == "revoked":
        session.revoked_at = datetime.now(timezone.utc)
    else:
        session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db.scalar.return_value = session
    with pytest.raises(HTTPException) as exc:
        session_service.get_current_session(SimpleNamespace(cookies={"rentit_session": "real-session"}), db)
    assert exc.value.status_code == 401


def test_current_session_accepts_valid_cookie(db, session):
    db.scalar.return_value = session
    assert session_service.get_current_session(SimpleNamespace(cookies={"rentit_session": "real-session"}), db) is session


@pytest.mark.parametrize("token,expected", [(None, 403), ("incorrect", 403), ("real-csrf", 200)])
def test_csrf_header(session, token, expected):
    if expected == 200:
        assert session_service.verify_csrf(session, token) is session
    else:
        with pytest.raises(HTTPException) as exc:
            session_service.verify_csrf(session, token)
        assert exc.value.status_code == expected


def test_rotate_csrf_invalidates_old_token(db, session):
    old_hash = session.csrf_token_hash
    new_token = session_service.rotate_csrf_token(db, session)
    assert old_hash != session.csrf_token_hash
    assert session.csrf_token_hash == session_service.hash_token(new_token)
    db.commit.assert_called_once()


def test_revoke_session(db, session):
    session_service.revoke_session(db, session)
    assert session.revoked_at is not None
    db.commit.assert_called_once()


@pytest.mark.parametrize("role,expected", [("user", 403), ("admin", 200)])
def test_admin_authorization(role, expected):
    user = SimpleNamespace(role=role)
    if expected == 200:
        assert require_admin(user) is user
    else:
        with pytest.raises(HTTPException) as exc:
            require_admin(user)
        assert exc.value.status_code == expected


def test_me_requires_login():
    # The missing cookie must be rejected before any database query.
    with TestClient(app) as client: #testclient(app) simulira http klijenta koji komunicira s fastapi backendom a with ga automatski onda zatvori 
        response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_csrf_endpoint_rotates_and_disables_cache(db, session):
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_session] = lambda: session
    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/auth/csrf")
        assert response.status_code == 200
        assert response.json()["csrf_token"]
        assert response.headers["cache-control"] == "no-store"
        db.commit.assert_called_once()
    finally:
        app.dependency_overrides.clear()


def test_logout_revokes_session_and_clears_cookie(db, session):
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[verify_csrf] = lambda: session
    try:
        with TestClient(app) as client:
            response = client.post("/api/v1/auth/logout")
        assert response.status_code == 200
        assert session.revoked_at is not None
        assert "rentit_session=" in response.headers["set-cookie"]
        assert response.headers["cache-control"] == "no-store"
    finally:
        app.dependency_overrides.clear()


def test_me_returns_current_user():
    user = SimpleNamespace(id="u1", name="Test User", email="test@example.com", role="user")
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/auth/me")
        assert response.status_code == 200
        assert response.json() == {"id": "u1", "name": "Test User", "email": "test@example.com", "role": "user"}
    finally:
        app.dependency_overrides.clear()


def test_google_identity_requires_verified_email(db):
    from src.services.auth import get_or_create_google_user
    with pytest.raises(HTTPException) as exc:
        get_or_create_google_user(db, {"sub": "google-123", "email": "x@example.com", "email_verified": False})
    assert exc.value.status_code == 401
    db.commit.assert_not_called()


def test_google_identity_does_not_link_existing_email(db):
    from src.services.auth import get_or_create_google_user
    db.scalar.side_effect = [None, SimpleNamespace(id="existing")]
    with pytest.raises(HTTPException) as exc:
        get_or_create_google_user(db, {"sub": "google-123", "email": "x@example.com", "email_verified": True})
    assert exc.value.status_code == 409
    db.commit.assert_not_called()


def test_google_identity_creates_user_and_provider_mapping(db):
    from src.services.auth import get_or_create_google_user
    from src.models.users import User
    from src.models.external_identities import ExternalIdentity
    db.scalar.side_effect = [None, None]
    user, is_new = get_or_create_google_user(db, {"sub": "google-123", "email": "X@Example.com", "email_verified": True, "name": "Example"})
    assert is_new is True
    assert user.email == "x@example.com"
    assert user.role == "user"
    added = [call.args[0] for call in db.add.call_args_list]
    assert any(isinstance(obj, User) for obj in added)
    assert any(isinstance(obj, ExternalIdentity) and obj.user_id == user.id and obj.provider_subject == "google-123" for obj in added)
    db.commit.assert_called_once()


def test_google_identity_reuses_existing_account(db):
    from src.services.auth import get_or_create_google_user
    existing_user = SimpleNamespace(id="u1", is_active=True)
    db.scalar.return_value = SimpleNamespace(user_id="u1")
    db.get.return_value = existing_user
    user, is_new = get_or_create_google_user(db, {"sub": "google-123", "email": "x@example.com", "email_verified": True})
    assert user is existing_user
    assert is_new is False
    db.commit.assert_not_called()


def test_google_callback_sets_session_cookie(monkeypatch, db):
    from unittest.mock import AsyncMock
    from src import main

    monkeypatch.setattr(main.oauth.google, "authorize_access_token", AsyncMock(return_value={
        "userinfo": {"sub": "google-123", "email": "test@example.com", "email_verified": True}
    }))
    monkeypatch.setattr(main, "get_or_create_google_user", lambda db, google_user: (SimpleNamespace(id="u1"), False))
    monkeypatch.setattr(main, "create_session", lambda db, user_id: ("test-session-token", "csrf-token"))
    app.dependency_overrides[get_db] = lambda: db
    try:
        with TestClient(app, follow_redirects=False) as client:
            response = client.get("/api/v1/auth/google/callback")
        assert response.status_code == 303
        assert response.headers["location"] == os.environ["FRONTEND_URL"]
        cookie = response.headers["set-cookie"].lower()
        assert "rentit_session=" in cookie
        assert "httponly" in cookie
        assert "samesite=none" in cookie
        assert response.headers["cache-control"] == "no-store"
    finally:
        app.dependency_overrides.clear()
