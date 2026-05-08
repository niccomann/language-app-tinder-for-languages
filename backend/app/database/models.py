import logging
from datetime import UTC, date, datetime
from typing import Optional, Any

from sqlalchemy import Column, String, Text
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
    image_url: str = Field(nullable=False)  # Legacy field - DB requires NOT NULL
    language: str = Field(nullable=False, index=True)
    difficulty: Optional[str] = Field(default=None)
    category: Optional[str] = Field(default=None, index=True)
    
    cefr_level: Optional[str] = Field(default=None, index=True)
    frequency_band: Optional[str] = Field(default=None, index=True)
    language_register: Optional[str] = Field(default=None, sa_column=Column("register", String, nullable=True))
    thematic_domain: Optional[str] = Field(default=None, index=True)
    
    part_of_speech: Optional[str] = Field(default=None, index=True)
    gender: Optional[str] = Field(default=None, index=True)
    plural_form: Optional[str] = Field(default=None)
    is_compound: Optional[bool] = Field(default=False)
    word_formation: Optional[str] = Field(default=None)
    
    image_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    image_coherence_score: Optional[int] = Field(default=None)
    pronunciation_ipa: Optional[str] = Field(default=None)
    example_sentence: Optional[str] = Field(default=None, sa_column=Column(Text))
    etymology_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    visual_mnemonic: Optional[str] = Field(default=None, sa_column=Column(Text))
    memory_hook: Optional[str] = Field(default=None, sa_column=Column(Text))
    audio_base64: Optional[str] = Field(default=None, sa_column=Column(Text))  # TTS audio from extraction
    
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class EtymologyEntity(BaseEntity, table=True):
    """Etymology information for a word. Extensible for future linguistic data."""
    __tablename__ = "etymologies"
    
    flashcard_id: int = Field(foreign_key="public.flashcards.id", index=True)
    origin_language: Optional[str] = Field(default=None)
    origin_word: Optional[str] = Field(default=None)
    etymology_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    language_family: Optional[str] = Field(default=None)
    time_period: Optional[str] = Field(default=None)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class ExampleSentenceEntity(BaseEntity, table=True):
    """Example sentences showing word usage."""
    __tablename__ = "example_sentences"
    
    flashcard_id: int = Field(foreign_key="public.flashcards.id", index=True)
    sentence: str = Field(nullable=False)
    translation: Optional[str] = Field(default=None)
    difficulty_level: Optional[str] = Field(default=None)
    context_type: Optional[str] = Field(default=None)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class FalseFriendEntity(BaseEntity, table=True):
    """False friends - words that look similar but have different meanings."""
    __tablename__ = "false_friends"
    
    flashcard_id: int = Field(foreign_key="public.flashcards.id", index=True)
    target_language: str = Field(nullable=False)
    similar_word: str = Field(nullable=False)
    similar_word_meaning: Optional[str] = Field(default=None)
    confusion_level: Optional[str] = Field(default=None)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class ProverbEntity(BaseEntity, table=True):
    """Proverbs and idioms containing the word."""
    __tablename__ = "proverbs"
    
    flashcard_id: int = Field(foreign_key="public.flashcards.id", index=True)
    expression: str = Field(nullable=False)
    literal_meaning: Optional[str] = Field(default=None)
    figurative_meaning: Optional[str] = Field(default=None)
    expression_type: Optional[str] = Field(default=None)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class CollocationEntity(BaseEntity, table=True):
    """Common word combinations and collocations."""
    __tablename__ = "collocations"
    
    flashcard_id: int = Field(foreign_key="public.flashcards.id", index=True)
    collocate_word: str = Field(nullable=False)
    collocation_type: Optional[str] = Field(default=None)
    example_phrase: Optional[str] = Field(default=None)
    frequency: Optional[str] = Field(default=None)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class DialectVariantEntity(BaseEntity, table=True):
    """Regional dialect variants of a word."""
    __tablename__ = "dialect_variants"
    
    flashcard_id: int = Field(foreign_key="public.flashcards.id", index=True)
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


class UserWordStatisticsEntity(BaseEntity, table=True):
    """
    Statistics on word knowledge for each user.
    Separate table to track how well a user knows each word (0-100 confidence score).
    Key is word name + user_id for easy lookup.
    """
    __tablename__ = "user_word_statistics"
    
    user_id: str = Field(default="default_user", nullable=False, index=True)
    word: str = Field(nullable=False, index=True)
    language: str = Field(default="de", nullable=False, index=True)
    confidence_score: int = Field(default=0, nullable=False)
    times_seen: int = Field(default=0, nullable=False)
    times_correct: int = Field(default=0, nullable=False)
    times_incorrect: int = Field(default=0, nullable=False)
    last_practiced: Optional[datetime] = Field(default=None)


class LearningSnapshotEntity(BaseEntity, table=True):
    """
    Daily aggregate of a user's language knowledge.
    Used by dashboards and re-engagement UI to show learning direction over time.
    """
    __tablename__ = "learning_snapshots"

    user_id: str = Field(default="default_user", nullable=False, index=True)
    language: str = Field(default="de", nullable=False, index=True)
    snapshot_date: date = Field(nullable=False, index=True)
    average_confidence: float = Field(default=0.0, nullable=False)
    average_knowledge_level: float = Field(default=1.0, nullable=False)
    total_words_practiced: int = Field(default=0, nullable=False)
    total_practice_sessions: int = Field(default=0, nullable=False)
    words_struggling: int = Field(default=0, nullable=False)
    words_learning: int = Field(default=0, nullable=False)
    words_mastered: int = Field(default=0, nullable=False)


class GrammarSentenceEntity(BaseEntity, table=True):
    """
    Grammar sentences for the Sentence Graph feature.
    Each sentence has associated nodes and edges for visualization.
    """
    __tablename__ = "grammar_sentences"
    
    german: str = Field(nullable=False)
    english: str = Field(nullable=False)
    difficulty: str = Field(default="beginner", nullable=False)
    language: str = Field(default="de", nullable=False, index=True)
    audio_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class SentenceChallengeEntity(BaseEntity, table=True):
    """
    Ground-truth sentence placement challenge.
    Used for instant, deterministic correction in production without AI inference.
    """
    __tablename__ = "sentence_challenges"

    language: str = Field(default="de", nullable=False, index=True)
    prompt_language: str = Field(default="en", nullable=False, index=True)
    target_language: str = Field(default="de", nullable=False, index=True)
    prompt: str = Field(sa_column=Column(Text, nullable=False))
    correct_sentence: str = Field(sa_column=Column(Text, nullable=False))
    correct_tokens: str = Field(sa_column=Column(Text, nullable=False))
    distractor_tokens: str = Field(sa_column=Column(Text, nullable=False))
    difficulty: str = Field(default="beginner", nullable=False, index=True)
    grammar_focus: Optional[str] = Field(default=None, index=True)
    cefr_level: Optional[str] = Field(default=None, index=True)
    validation_mode: str = Field(default="ground_truth", nullable=False)
    is_active: bool = Field(default=True, nullable=False, index=True)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class GrammarSentenceNodeEntity(BaseEntity, table=True):
    """
    Nodes within a grammar sentence (subject, predicate, object, etc.).
    """
    __tablename__ = "grammar_sentence_nodes"
    
    sentence_id: int = Field(foreign_key="public.grammar_sentences.id", index=True)
    node_id: str = Field(nullable=False)
    label: str = Field(nullable=False)
    node_type: str = Field(nullable=False)
    image_base64: Optional[str] = Field(default=None)
    meta_case: Optional[str] = Field(default=None)
    meta_gender: Optional[str] = Field(default=None)
    meta_number: Optional[str] = Field(default=None)
    meta_tense: Optional[str] = Field(default=None)
    position_x: Optional[float] = Field(default=None)
    position_y: Optional[float] = Field(default=None)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class GrammarSentenceEdgeEntity(BaseEntity, table=True):
    """
    Edges connecting nodes within a grammar sentence.
    """
    __tablename__ = "grammar_sentence_edges"
    
    sentence_id: int = Field(foreign_key="public.grammar_sentences.id", index=True)
    source_node_id: str = Field(nullable=False)
    target_node_id: str = Field(nullable=False)
    label: str = Field(nullable=False)
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))
