from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel

from app.core.config import config


class AccountEntity(SQLModel, table=True):
    """
    Optional account created when a user signs in with Google. It maps a stable
    Google identity to a `canonical_user_id` (the X-User-Id used for all data),
    so the same person gets the same progress on every device. Anonymous use
    continues to work without an account.
    """
    __tablename__ = "accounts"

    if not config.database.use_sqlite:
        __table_args__ = {"schema": str(config.database.db_schema)}

    google_sub: str = Field(primary_key=True, index=True, max_length=64)
    email: str = Field(index=True, max_length=255)
    is_owner: bool = Field(default=False)
    canonical_user_id: str = Field(index=True, max_length=64)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login_at: Optional[datetime] = Field(default=None)
