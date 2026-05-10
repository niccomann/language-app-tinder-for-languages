from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class GrammarNodeMeta(BaseModel):
    case: Optional[str] = None
    gender: Optional[str] = None
    number: Optional[str] = None
    tense: Optional[str] = None
    mood: Optional[str] = None
    person: Optional[int] = None
    pronoun: Optional[str] = None


class GrammarNode(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    label: str
    type: str
    lemma: Optional[str] = None
    surface_form: Optional[str] = None
    part_of_speech: Optional[str] = None
    translation: Optional[str] = None
    source_word_id: Optional[int] = None
    image_base64: Optional[str] = None
    meta: Optional[GrammarNodeMeta] = None
    x: Optional[float] = None
    y: Optional[float] = None
    cefr_level: Optional[str] = None
    frequency_band: Optional[str] = None
    language_register: Optional[str] = Field(default=None, alias="register", serialization_alias="register")
    thematic_domain: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None


class GrammarEdge(BaseModel):
    source: str
    target: str
    label: str


class GrammarSentence(BaseModel):
    id: str
    german: str
    english: str
    nodes: List[GrammarNode]
    edges: List[GrammarEdge]
    difficulty: str


class SentenceChallenge(BaseModel):
    id: int
    language: str
    prompt_language: str
    target_language: str
    prompt: str
    correct_sentence: str
    correct_tokens: List[str]
    distractor_tokens: List[str]
    option_tokens: List[str]
    difficulty: str
    grammar_focus: Optional[str] = None
    cefr_level: Optional[str] = None
    validation_mode: str = "ground_truth"
