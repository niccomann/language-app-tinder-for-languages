from typing import Optional

from sqlmodel import Field, SQLModel

from app.core.config import config


class UserEntity(SQLModel, table=True):
    """
    Device-based anonymous user. The UUID is generated client-side at first
    launch and used as the primary key.
    """
    __tablename__ = "users"

    if not config.database.use_sqlite:
        __table_args__ = {"schema": str(config.database.db_schema)}

    user_id: str = Field(primary_key=True, index=True, max_length=64)
    display_name: str = Field(max_length=40)
    age: Optional[int] = Field(default=None, ge=5, le=120)
    target_language: str = Field(default="de", max_length=8)
    proficiency_level: str = Field(default="beginner", max_length=16)
    daily_goal_minutes: int = Field(default=10)
    onboarding_completed: bool = Field(default=False)
