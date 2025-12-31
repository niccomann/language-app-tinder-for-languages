from fastapi import APIRouter, Query
from typing import List, Optional
from pydantic import BaseModel
from sqlmodel import select

from app.services.sentence_validator import (
    sentence_validator_service,
    NodeInfo,
    ConnectionInfo,
    ValidationResult,
    ValidationStatus
)
from app.database import SessionDependency
from app.database.models import (
    FlashcardEntity,
    GrammarSentenceEntity,
    GrammarSentenceNodeEntity,
    GrammarSentenceEdgeEntity,
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
    type: str
    image_base64: Optional[str] = None
    meta: Optional[GrammarNodeMeta] = None
    x: Optional[float] = None
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


def get_article_for_gender(gender: Optional[str], case: str = "nominative") -> str:
    """Get the German article based on gender and case."""
    articles = {
        "nominative": {"masculine": "Der", "feminine": "Die", "neuter": "Das"},
        "accusative": {"masculine": "den", "feminine": "die", "neuter": "das"},
        "dative": {"masculine": "dem", "feminine": "der", "neuter": "dem"},
    }
    if not gender or gender not in ["masculine", "feminine", "neuter"]:
        return ""
    return articles.get(case, articles["nominative"]).get(gender, "")


def map_part_of_speech_to_node_type(part_of_speech: Optional[str], is_subject: bool = True) -> str:
    """Map part_of_speech from flashcard to grammar node type."""
    if not part_of_speech:
        return "object"
    
    part_of_speech_lower = part_of_speech.lower()
    
    if part_of_speech_lower == "verb":
        return "predicate"
    elif part_of_speech_lower == "noun":
        return "subject" if is_subject else "object"
    elif part_of_speech_lower == "adjective":
        return "object"
    else:
        return "object"


@router.get("/sentences", response_model=List[GrammarSentence])
async def get_grammar_sentences(
    session: SessionDependency,
    language: str = Query("de", description="Language code"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
):
    """
    Get grammar sentences from database with their nodes and edges.
    """
    query = select(GrammarSentenceEntity).where(GrammarSentenceEntity.language == language)
    
    if difficulty:
        query = query.where(GrammarSentenceEntity.difficulty == difficulty)
    
    sentences = session.exec(query).all()
    
    result = []
    for sentence in sentences:
        nodes_query = select(GrammarSentenceNodeEntity).where(
            GrammarSentenceNodeEntity.sentence_id == sentence.id
        )
        nodes_data = session.exec(nodes_query).all()
        
        edges_query = select(GrammarSentenceEdgeEntity).where(
            GrammarSentenceEdgeEntity.sentence_id == sentence.id
        )
        edges_data = session.exec(edges_query).all()
        
        nodes = [
            GrammarNode(
                id=node.node_id,
                label=node.label,
                type=node.node_type,
                image_base64=node.image_base64,
                meta=GrammarNodeMeta(
                    case=node.meta_case,
                    gender=node.meta_gender,
                    number=node.meta_number,
                    tense=node.meta_tense,
                ) if any([node.meta_case, node.meta_gender, node.meta_number, node.meta_tense]) else None,
                x=node.position_x,
                y=node.position_y,
            )
            for node in nodes_data
        ]
        
        edges = [
            GrammarEdge(
                source=edge.source_node_id,
                target=edge.target_node_id,
                label=edge.label,
            )
            for edge in edges_data
        ]
        
        result.append(GrammarSentence(
            id=str(sentence.id),
            german=sentence.german,
            english=sentence.english,
            nodes=nodes,
            edges=edges,
            difficulty=sentence.difficulty,
        ))
    
    return result


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
async def get_available_nodes(
    session: SessionDependency,
    language: str = Query("de", description="Language code"),
    limit: int = Query(50, description="Max nodes to return"),
):
    """
    Get available nodes for sentence building.
    Dynamically generates nodes from flashcards.
    - If part_of_speech is set: nouns → subjects/objects, verbs → predicates
    - If part_of_speech is not set: all words become subjects and objects
    """
    query = select(FlashcardEntity).where(FlashcardEntity.language == language)
    flashcards = session.exec(query.limit(limit * 3)).all()
    
    available_nodes = []
    subject_count = 0
    verb_count = 0
    object_count = 0
    max_per_type = limit // 3
    
    for card in flashcards:
        part_of_speech = (card.part_of_speech or "").lower()
        
        if part_of_speech == "verb":
            if verb_count < max_per_type:
                verb_count += 1
                available_nodes.append(GrammarNode(
                    id=f"verb_{card.id}",
                    label=card.word,
                    type="predicate",
                    image_base64=card.image_base64,
                    meta=GrammarNodeMeta(tense="present"),
                    cefr_level=card.cefr_level,
                    frequency_band=card.frequency_band,
                    register=card.register,
                    difficulty=card.difficulty,
                    category=card.category,
                ))
        else:
            article_nom = get_article_for_gender(card.gender, "nominative") if card.gender else ""
            article_acc = get_article_for_gender(card.gender, "accusative") if card.gender else ""
            
            if subject_count < max_per_type:
                subject_count += 1
                label_subject = f"{article_nom} {card.word}".strip() if article_nom else card.word
                available_nodes.append(GrammarNode(
                    id=f"subj_{card.id}",
                    label=label_subject,
                    type="subject",
                    image_base64=card.image_base64,
                    meta=GrammarNodeMeta(case="nominative", gender=card.gender) if card.gender else None,
                    cefr_level=card.cefr_level,
                    frequency_band=card.frequency_band,
                    register=card.register,
                    difficulty=card.difficulty,
                    category=card.category,
                ))
            
            if object_count < max_per_type:
                object_count += 1
                label_object = f"{article_acc} {card.word}".strip() if article_acc else card.word
                available_nodes.append(GrammarNode(
                    id=f"obj_{card.id}",
                    label=label_object,
                    type="object",
                    image_base64=card.image_base64,
                    meta=GrammarNodeMeta(case="accusative", gender=card.gender) if card.gender else None,
                    cefr_level=card.cefr_level,
                    frequency_band=card.frequency_band,
                    register=card.register,
                    difficulty=card.difficulty,
                    category=card.category,
                ))
    
    return available_nodes
