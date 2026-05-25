from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.core.config import config
from app.database.account_models import AccountEntity
from app.database.connection import DatabaseConnection
from app.database.user_models import UserEntity

router = APIRouter(prefix="/api/auth", tags=["auth"])

_db = DatabaseConnection()


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=10)
    # The device's current anonymous user id, adopted as the account's canonical
    # id on first login so existing progress carries over.
    current_user_id: str | None = Field(default=None, max_length=64)


class AuthOut(BaseModel):
    canonical_user_id: str
    email: str
    is_owner: bool


@router.post("/google", response_model=AuthOut)
def login_with_google(payload: GoogleLoginRequest):
    client_id = config.auth.google_client_id
    if not client_id:
        raise HTTPException(status_code=503, detail="Google login is not configured")

    try:
        claims = google_id_token.verify_oauth2_token(
            payload.id_token, google_requests.Request(), client_id
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    google_sub = claims.get("sub")
    email = (claims.get("email") or "").strip().lower()
    if not google_sub or not email:
        raise HTTPException(status_code=401, detail="Google token missing identity")
    if not claims.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Google email not verified")

    is_owner = email in config.auth.owner_emails
    now = datetime.now(timezone.utc)

    with Session(_db.engine) as session:
        account = session.get(AccountEntity, google_sub)
        if account is None:
            account = AccountEntity(
                google_sub=google_sub,
                email=email,
                is_owner=is_owner,
                canonical_user_id=payload.current_user_id or f"google-{google_sub}",
                created_at=now,
                last_login_at=now,
            )
        else:
            # Keep email / owner status fresh; canonical_user_id never changes
            # once set so the account always resolves to the same data.
            account.email = email
            account.is_owner = is_owner
            account.last_login_at = now
        session.add(account)

        # Ensure a profile exists for the canonical id so the app lands the user
        # in-app after login instead of bouncing back to onboarding. Only create
        # one when missing (a returning account / already-onboarded device keeps
        # its existing profile).
        if session.get(UserEntity, account.canonical_user_id) is None:
            display_name = (claims.get("given_name") or claims.get("name") or "Tu")[:40]
            session.add(UserEntity(
                user_id=account.canonical_user_id,
                display_name=display_name,
                target_language="de",
                onboarding_completed=True,
            ))

        session.commit()
        session.refresh(account)

        return AuthOut(
            canonical_user_id=account.canonical_user_id,
            email=account.email,
            is_owner=account.is_owner,
        )
