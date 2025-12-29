import logging
from datetime import UTC, datetime
from typing import Optional, Any

from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel

from app.core.config import config

log = logging.getLogger(__name__)


class BaseEntity(SQLModel):
    """
    Base entity for all database models.
    
    Includes common fields like id, created_at, and updated_at.
    """
    _use_sqlite = config.database.use_sqlite
    _schema = str(config.database.db_schema)
    
    if not _use_sqlite:
        if not isinstance(_schema, str):
            log.error(f"CRITICAL: Schema is not a string! Type: {type(_schema).__name__}, Value: {_schema}")
            raise TypeError(f"Database schema must be a string, got {type(_schema).__name__}")
        __table_args__ = {"schema": _schema}
    else:
        __table_args__ = {}
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_column_kwargs={"onupdate": lambda: datetime.now(UTC)},
    )


class FlashcardEntity(BaseEntity, table=True):
    """
    Flashcard entity representing a language learning card.
    Extended with rich linguistic data from language_info_extraction.
    """
    __tablename__ = "flashcards"
    
    word: str = Field(nullable=False, index=True)
    translation: str = Field(nullable=False)
    image_url: str = Field(nullable=False)
    language: str = Field(nullable=False, index=True)
    difficulty: Optional[str] = Field(default=None)
    category: Optional[str] = Field(default=None, index=True)
    
    cefr_level: Optional[str] = Field(default=None, index=True)
    frequency_band: Optional[str] = Field(default=None, index=True)
    register: Optional[str] = Field(default=None)
    thematic_domain: Optional[str] = Field(default=None, index=True)
    
    part_of_speech: Optional[str] = Field(default=None, index=True)
    gender: Optional[str] = Field(default=None, index=True)
    plural_form: Optional[str] = Field(default=None)
    is_compound: Optional[bool] = Field(default=False)
    word_formation: Optional[str] = Field(default=None)
    
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class EtymologyEntity(BaseEntity, table=True):
    """Etymology information for a word. Extensible for future linguistic data."""
    __tablename__ = "etymologies"
    
    flashcard_id: int = Field(foreign_key="flashcards.id", index=True)
    origin_language: Optional[str] = Field(default=None)
    origin_word: Optional[str] = Field(default=None)
    etymology_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    language_family: Optional[str] = Field(default=None)
    time_period: Optional[str] = Field(default=None)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class ExampleSentenceEntity(BaseEntity, table=True):
    """Example sentences showing word usage."""
    __tablename__ = "example_sentences"
    
    flashcard_id: int = Field(foreign_key="flashcards.id", index=True)
    sentence: str = Field(nullable=False)
    translation: Optional[str] = Field(default=None)
    difficulty_level: Optional[str] = Field(default=None)
    context_type: Optional[str] = Field(default=None)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class FalseFriendEntity(BaseEntity, table=True):
    """False friends - words that look similar but have different meanings."""
    __tablename__ = "false_friends"
    
    flashcard_id: int = Field(foreign_key="flashcards.id", index=True)
    target_language: str = Field(nullable=False)
    similar_word: str = Field(nullable=False)
    similar_word_meaning: Optional[str] = Field(default=None)
    confusion_level: Optional[str] = Field(default=None)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class ProverbEntity(BaseEntity, table=True):
    """Proverbs and idioms containing the word."""
    __tablename__ = "proverbs"
    
    flashcard_id: int = Field(foreign_key="flashcards.id", index=True)
    expression: str = Field(nullable=False)
    literal_meaning: Optional[str] = Field(default=None)
    figurative_meaning: Optional[str] = Field(default=None)
    expression_type: Optional[str] = Field(default=None)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class CollocationEntity(BaseEntity, table=True):
    """Common word combinations and collocations."""
    __tablename__ = "collocations"
    
    flashcard_id: int = Field(foreign_key="flashcards.id", index=True)
    collocate_word: str = Field(nullable=False)
    collocation_type: Optional[str] = Field(default=None)
    example_phrase: Optional[str] = Field(default=None)
    frequency: Optional[str] = Field(default=None)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class DialectVariantEntity(BaseEntity, table=True):
    """Regional dialect variants of a word."""
    __tablename__ = "dialect_variants"
    
    flashcard_id: int = Field(foreign_key="flashcards.id", index=True)
    region: str = Field(nullable=False)
    dialect_name: Optional[str] = Field(default=None)
    variant_word: str = Field(nullable=False)
    pronunciation: Optional[str] = Field(default=None)
    usage_notes: Optional[str] = Field(default=None)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class UserProgressEntity(BaseEntity, table=True):
    """
    User progress entity tracking which cards the user knows.
    Tracks separate counts for right swipes (known) and left swipes (unknown).
    """
    __tablename__ = "user_progress"
    
    card_id: str = Field(nullable=False, index=True)
    known: bool = Field(nullable=False)
    review_count: int = Field(default=1, nullable=False)
    swipe_right_count: int = Field(default=0, nullable=False)
    swipe_left_count: int = Field(default=0, nullable=False)
    last_reviewed: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AudioCacheEntity(BaseEntity, table=True):
    """
    Cache for TTS audio files stored as base64.
    Avoids repeated OpenAI API calls for the same text.
    """
    __tablename__ = "audio_cache"
    
    text_hash: str = Field(nullable=False, index=True, unique=True)
    text: str = Field(nullable=False)
    language: str = Field(default="de", nullable=False)
    voice: str = Field(default="nova", nullable=False)
    audio_base64: str = Field(nullable=False)
