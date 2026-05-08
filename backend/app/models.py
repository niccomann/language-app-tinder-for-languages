from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Etymology(OrmModel):
    """Etymology information for a word."""
    id: Optional[int] = None
    origin_language: Optional[str] = None
    origin_word: Optional[str] = None
    etymology_text: Optional[str] = None
    language_family: Optional[str] = None
    time_period: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class ExampleSentence(OrmModel):
    """Example sentence showing word usage."""
    id: Optional[int] = None
    sentence: str
    translation: Optional[str] = None
    difficulty_level: Optional[str] = None
    context_type: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class FalseFriend(OrmModel):
    """False friend - word that looks similar but has different meaning."""
    id: Optional[int] = None
    target_language: str
    similar_word: str
    similar_word_meaning: Optional[str] = None
    confusion_level: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class Proverb(OrmModel):
    """Proverb or idiom containing the word."""
    id: Optional[int] = None
    expression: str
    literal_meaning: Optional[str] = None
    figurative_meaning: Optional[str] = None
    expression_type: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class Collocation(OrmModel):
    """Common word combination."""
    id: Optional[int] = None
    collocate_word: str
    collocation_type: Optional[str] = None
    example_phrase: Optional[str] = None
    frequency: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class DialectVariant(OrmModel):
    """Regional dialect variant."""
    id: Optional[int] = None
    region: str
    dialect_name: Optional[str] = None
    variant_word: str
    pronunciation: Optional[str] = None
    usage_notes: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class Flashcard(OrmModel):
    """Base flashcard with core fields."""
    id: int
    word: str
    translation: str
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    audio_base64: Optional[str] = None
    language: str
    difficulty: Optional[str] = None
    category: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class FlashcardEnriched(Flashcard):
    """Flashcard with rich linguistic data from language_info_extraction."""
    cefr_level: Optional[str] = None
    frequency_band: Optional[str] = None
    language_register: Optional[str] = Field(default=None, alias="register", serialization_alias="register")
    thematic_domain: Optional[str] = None
    part_of_speech: Optional[str] = None
    gender: Optional[str] = None
    plural_form: Optional[str] = None
    is_compound: Optional[bool] = None
    word_formation: Optional[str] = None
    image_coherence_score: Optional[int] = None
    pronunciation_ipa: Optional[str] = None
    example_sentence: Optional[str] = None
    etymology_text: Optional[str] = None
    visual_mnemonic: Optional[str] = None
    memory_hook: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class FlashcardDetail(FlashcardEnriched):
    """Full flashcard detail with all relational data."""
    etymologies: List[Etymology] = []
    examples: List[ExampleSentence] = []
    false_friends: List[FalseFriend] = []
    proverbs: List[Proverb] = []
    collocations: List[Collocation] = []
    dialect_variants: List[DialectVariant] = []


class FlashcardWithProgress(FlashcardEnriched):
    """Flashcard with user progress information."""
    known: Optional[bool] = None
    review_count: Optional[int] = None
    swipe_right_count: Optional[int] = None
    swipe_left_count: Optional[int] = None
    last_reviewed: Optional[datetime] = None


class LibraryFilters(BaseModel):
    """Available filter options for the library."""
    cefr_levels: List[str] = []
    frequency_bands: List[str] = []
    registers: List[str] = []
    genders: List[str] = []
    parts_of_speech: List[str] = []
    word_formations: List[str] = []
    categories: List[str] = []
    thematic_domains: List[str] = []


class LibraryStats(BaseModel):
    """Statistics for the word library."""
    total_words: int = 0
    words_with_etymology: int = 0
    words_with_examples: int = 0
    words_with_false_friends: int = 0
    words_with_proverbs: int = 0
    by_cefr_level: Dict[str, int] = {}
    by_gender: Dict[str, int] = {}
    by_part_of_speech: Dict[str, int] = {}


class ProgressRequest(BaseModel):
    card_id: str
    known: bool


class ProgressResponse(BaseModel):
    cards_reviewed: int
    known_count: int
    unknown_count: int
