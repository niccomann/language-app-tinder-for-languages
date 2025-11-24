import logging
from datetime import UTC, datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.core.config import config

log = logging.getLogger(__name__)


class BaseEntity(SQLModel):
    """
    Base entity for all database models.
    
    Includes common fields like id, created_at, and updated_at.
    """
    _schema = str(config.database.db_schema)
    
    if not isinstance(_schema, str):
        log.error(f"CRITICAL: Schema is not a string! Type: {type(_schema).__name__}, Value: {_schema}")
        raise TypeError(f"Database schema must be a string, got {type(_schema).__name__}")
    
    __table_args__ = {"schema": _schema}
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_column_kwargs={"onupdate": lambda: datetime.now(UTC)},
    )


class FlashcardEntity(BaseEntity, table=True):
    """
    Flashcard entity representing a language learning card.
    """
    __tablename__ = "flashcards"
    
    word: str = Field(nullable=False, index=True)
    translation: str = Field(nullable=False)
    image_url: str = Field(nullable=False)
    language: str = Field(nullable=False, index=True)
    difficulty: Optional[str] = Field(default=None)
    category: Optional[str] = Field(default=None, index=True)


class UserProgressEntity(BaseEntity, table=True):
    """
    User progress entity tracking which cards the user knows.
    """
    __tablename__ = "user_progress"
    
    card_id: str = Field(nullable=False, index=True)
    known: bool = Field(nullable=False)
    review_count: int = Field(default=1, nullable=False)
    last_reviewed: datetime = Field(default_factory=lambda: datetime.now(UTC))
