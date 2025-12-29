from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel

from app.services.sentence_validator import (
    sentence_validator_service,
    NodeInfo,
    ConnectionInfo,
    ValidationResult,
    ValidationStatus
)

router = APIRouter(prefix="/api/grammar", tags=["grammar"])

class GrammarNodeMeta(BaseModel):
    case: Optional[str] = None
    gender: Optional[str] = None
    number: Optional[str] = None
    tense: Optional[str] = None

class GrammarNode(BaseModel):
    id: str
    label: str
    type: str  # subject, predicate, object
    image_url: Optional[str] = None  # Image for the node
    meta: Optional[GrammarNodeMeta] = None
    x: Optional[float] = None  # For initial layout hint
    y: Optional[float] = None
    cefr_level: Optional[str] = None
    frequency_band: Optional[str] = None
    register: Optional[str] = None
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

# Mock Data
SENTENCES = [
    GrammarSentence(
        id="1",
        german="Der Hund beißt den Mann",
        english="The dog bites the man",
        difficulty="beginner",
        nodes=[
            GrammarNode(id="n1", label="Der Hund", type="subject", image_url="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200", meta=GrammarNodeMeta(case="nominative", gender="masculine"), x=100, y=200),
            GrammarNode(id="n2", label="beißt", type="predicate", image_url="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200", meta=GrammarNodeMeta(tense="present"), x=300, y=200),
            GrammarNode(id="n3", label="den Mann", type="object", image_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200", meta=GrammarNodeMeta(case="accusative", gender="masculine"), x=500, y=200)
        ],
        edges=[
            GrammarEdge(source="n1", target="n2", label="wer?"),
            GrammarEdge(source="n2", target="n3", label="wen?")
        ]
    ),
    GrammarSentence(
        id="2",
        german="Die Frau liest das Buch",
        english="The woman reads the book",
        difficulty="beginner",
        nodes=[
            GrammarNode(id="n1", label="Die Frau", type="subject", image_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200", meta=GrammarNodeMeta(case="nominative", gender="feminine"), x=100, y=200),
            GrammarNode(id="n2", label="liest", type="predicate", image_url="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200", meta=GrammarNodeMeta(tense="present"), x=300, y=200),
            GrammarNode(id="n3", label="das Buch", type="object", image_url="https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200", meta=GrammarNodeMeta(case="accusative", gender="neuter"), x=500, y=200)
        ],
        edges=[
            GrammarEdge(source="n1", target="n2", label="wer?"),
            GrammarEdge(source="n2", target="n3", label="was?")
        ]
    ),
    GrammarSentence(
        id="3",
        german="Das Kind gibt dem Vater den Ball",
        english="The child gives the ball to the father",
        difficulty="intermediate",
        nodes=[
            GrammarNode(id="n1", label="Das Kind", type="subject", image_url="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=200", meta=GrammarNodeMeta(case="nominative", gender="neuter"), x=100, y=200),
            GrammarNode(id="n2", label="gibt", type="predicate", image_url="https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=200", meta=GrammarNodeMeta(tense="present"), x=300, y=200),
            GrammarNode(id="n3", label="dem Vater", type="indirect_object", image_url="https://images.unsplash.com/photo-1552058544-f2b08422138a?w=200", meta=GrammarNodeMeta(case="dative", gender="masculine"), x=500, y=100),
            GrammarNode(id="n4", label="den Ball", type="direct_object", image_url="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200", meta=GrammarNodeMeta(case="accusative", gender="masculine"), x=500, y=300)
        ],
        edges=[
            GrammarEdge(source="n1", target="n2", label="wer?"),
            GrammarEdge(source="n2", target="n3", label="wem?"),
            GrammarEdge(source="n2", target="n4", label="was?")
        ]
    )
]

@router.get("/sentences", response_model=List[GrammarSentence])
async def get_grammar_sentences():
    """
    Get a list of sentences with their grammar graph structure
    """
    return SENTENCES


class ValidateSentenceRequest(BaseModel):
    nodes: List[NodeInfo]
    connections: List[ConnectionInfo]
    language: str = "de"


class ValidateSentenceResponse(BaseModel):
    status: str
    sentence: str
    grammar_correct: bool
    semantic_correct: bool
    explanation: str
    suggestion: Optional[str] = None


@router.post("/validate-sentence", response_model=ValidateSentenceResponse)
async def validate_sentence(request: ValidateSentenceRequest):
    """
    Validate a user-constructed sentence using LLM.
    Returns validation status (green/yellow/red) with explanation.
    """
    result = sentence_validator_service.validate_sentence(
        nodes=request.nodes,
        connections=request.connections,
        language=request.language
    )
    
    return ValidateSentenceResponse(
        status=result.status.value,
        sentence=result.sentence,
        grammar_correct=result.grammar_correct,
        semantic_correct=result.semantic_correct,
        explanation=result.explanation,
        suggestion=result.suggestion
    )


@router.get("/available-nodes", response_model=List[GrammarNode])
async def get_available_nodes():
    """
    Get all available nodes for sentence building.
    Returns a pool of subjects, verbs, and objects.
    """
    available_nodes = [
        # Subjects - with linguistic data
        GrammarNode(id="subj_1", label="Der Hund", type="subject", image_url="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200", meta=GrammarNodeMeta(case="nominative", gender="masculine"), cefr_level="A1", frequency_band="very_common", category="animals", difficulty="easy"),
        GrammarNode(id="subj_2", label="Die Katze", type="subject", image_url="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200", meta=GrammarNodeMeta(case="nominative", gender="feminine"), cefr_level="A1", frequency_band="very_common", category="animals", difficulty="easy"),
        GrammarNode(id="subj_3", label="Das Kind", type="subject", image_url="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=200", meta=GrammarNodeMeta(case="nominative", gender="neuter"), cefr_level="A1", frequency_band="very_common", category="family", difficulty="easy"),
        GrammarNode(id="subj_4", label="Die Frau", type="subject", image_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200", meta=GrammarNodeMeta(case="nominative", gender="feminine"), cefr_level="A1", frequency_band="very_common", category="family", difficulty="easy"),
        GrammarNode(id="subj_5", label="Der Mann", type="subject", image_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200", meta=GrammarNodeMeta(case="nominative", gender="masculine"), cefr_level="A1", frequency_band="very_common", category="family", difficulty="easy"),
        GrammarNode(id="subj_6", label="Der Arzt", type="subject", image_url="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200", meta=GrammarNodeMeta(case="nominative", gender="masculine"), cefr_level="A2", frequency_band="common", category="professions", difficulty="medium"),
        GrammarNode(id="subj_7", label="Die Lehrerin", type="subject", image_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200", meta=GrammarNodeMeta(case="nominative", gender="feminine"), cefr_level="A2", frequency_band="common", category="professions", difficulty="medium"),
        GrammarNode(id="subj_8", label="Der Wissenschaftler", type="subject", image_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200", meta=GrammarNodeMeta(case="nominative", gender="masculine"), cefr_level="B1", frequency_band="moderate", category="professions", difficulty="hard"),
        
        # Verbs - with linguistic data
        GrammarNode(id="verb_1", label="frisst", type="predicate", image_url="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200", meta=GrammarNodeMeta(tense="present"), cefr_level="A1", frequency_band="common", category="actions", difficulty="easy"),
        GrammarNode(id="verb_2", label="liest", type="predicate", image_url="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200", meta=GrammarNodeMeta(tense="present"), cefr_level="A1", frequency_band="very_common", category="actions", difficulty="easy"),
        GrammarNode(id="verb_3", label="trinkt", type="predicate", image_url="https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200", meta=GrammarNodeMeta(tense="present"), cefr_level="A1", frequency_band="very_common", category="actions", difficulty="easy"),
        GrammarNode(id="verb_4", label="sieht", type="predicate", image_url="https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=200", meta=GrammarNodeMeta(tense="present"), cefr_level="A1", frequency_band="very_common", category="actions", difficulty="easy"),
        GrammarNode(id="verb_5", label="liebt", type="predicate", image_url="https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200", meta=GrammarNodeMeta(tense="present"), cefr_level="A2", frequency_band="common", category="emotions", difficulty="easy"),
        GrammarNode(id="verb_6", label="untersucht", type="predicate", image_url="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200", meta=GrammarNodeMeta(tense="present"), cefr_level="B1", frequency_band="moderate", category="actions", difficulty="medium"),
        GrammarNode(id="verb_7", label="analysiert", type="predicate", image_url="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200", meta=GrammarNodeMeta(tense="present"), cefr_level="B2", frequency_band="moderate", category="actions", difficulty="hard"),
        
        # Objects - with linguistic data
        GrammarNode(id="obj_1", label="das Buch", type="object", image_url="https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200", meta=GrammarNodeMeta(case="accusative", gender="neuter"), cefr_level="A1", frequency_band="very_common", category="objects", difficulty="easy"),
        GrammarNode(id="obj_2", label="den Ball", type="object", image_url="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200", meta=GrammarNodeMeta(case="accusative", gender="masculine"), cefr_level="A1", frequency_band="common", category="sports", difficulty="easy"),
        GrammarNode(id="obj_3", label="die Milch", type="object", image_url="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200", meta=GrammarNodeMeta(case="accusative", gender="feminine"), cefr_level="A1", frequency_band="very_common", category="food", difficulty="easy"),
        GrammarNode(id="obj_4", label="das Futter", type="object", image_url="https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=200", meta=GrammarNodeMeta(case="accusative", gender="neuter"), cefr_level="A2", frequency_band="common", category="food", difficulty="easy"),
        GrammarNode(id="obj_5", label="die Kartoffeln", type="object", image_url="https://images.unsplash.com/photo-1518977676601-b53f82ber?w=200", meta=GrammarNodeMeta(case="accusative", gender="feminine"), cefr_level="A2", frequency_band="common", category="food", difficulty="medium"),
        GrammarNode(id="obj_6", label="den Kaffee", type="object", image_url="https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200", meta=GrammarNodeMeta(case="accusative", gender="masculine"), cefr_level="A1", frequency_band="very_common", category="food", difficulty="easy"),
        GrammarNode(id="obj_7", label="den Patienten", type="object", image_url="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=200", meta=GrammarNodeMeta(case="accusative", gender="masculine"), cefr_level="B1", frequency_band="moderate", category="health", difficulty="medium"),
        GrammarNode(id="obj_8", label="die Daten", type="object", image_url="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200", meta=GrammarNodeMeta(case="accusative", gender="feminine"), cefr_level="B2", frequency_band="common", category="technology", difficulty="hard"),
    ]
    return available_nodes
