import re

from fastapi import APIRouter, Query
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlmodel import select

from app.services.sentence_validator import (
    sentence_validator_service,
    NodeInfo,
    ConnectionInfo,
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


def get_plural_article(case: str = "nominative") -> str:
    """Get the German definite article for plural nouns."""
    if case == "dative":
        return "den"
    return "die"


def format_noun_phrase(article: str, noun: str, capitalize: bool = False) -> str:
    phrase = f"{article} {noun}".strip() if article else noun
    if capitalize and phrase:
        return phrase[0].upper() + phrase[1:]
    return phrase


def format_plural_noun_for_case(noun: str, case: str) -> str:
    if case == "dative" and not noun.endswith(("n", "s")):
        return f"{noun}n"
    return noun


def node_id_part(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", value).strip("_").lower()


def common_node_fields(card: FlashcardEntity, source_word_id: Optional[int] = None) -> dict[str, Any]:
    return {
        "lemma": card.word,
        "part_of_speech": card.part_of_speech,
        "translation": card.translation,
        "source_word_id": source_word_id,
        "image_base64": card.image_base64,
        "cefr_level": card.cefr_level,
        "frequency_band": card.frequency_band,
        "register": card.language_register,
        "difficulty": card.difficulty,
        "category": card.category,
    }


def get_source_word_ids_by_flashcard(session: SessionDependency, language: str) -> dict[int, int]:
    rows = session.execute(
        text(
            """
            SELECT DISTINCT ON (f.id)
                f.id AS flashcard_id,
                w.id AS source_word_id
            FROM flashcards f
            JOIN words w ON w.word = f.word AND w.language = f.language
            WHERE f.language = :language
            ORDER BY f.id, CASE WHEN w.is_ground_truth THEN 0 ELSE 1 END, w.id
            """
        ),
        {"language": language},
    ).mappings().all()
    return {int(row["flashcard_id"]): int(row["source_word_id"]) for row in rows}


def get_present_conjugations_by_flashcard(session: SessionDependency, language: str) -> dict[int, list[dict[str, Any]]]:
    rows = session.execute(
        text(
            """
            SELECT DISTINCT ON (f.id, vc.pronoun)
                f.id AS flashcard_id,
                vc.mood,
                vc.tense,
                vc.person,
                vc.number,
                vc.pronoun,
                vc.form
            FROM flashcards f
            JOIN words w ON w.word = f.word AND w.language = f.language
            JOIN verb_conjugations vc ON vc.word_id = w.id
            WHERE f.language = :language
              AND vc.mood = 'indicative'
              AND vc.tense = 'present'
            ORDER BY f.id, vc.pronoun, vc.person, vc.number, vc.id
            """
        ),
        {"language": language},
    ).mappings().all()

    conjugations: dict[int, list[dict[str, Any]]] = {}
    for row in rows:
        conjugations.setdefault(int(row["flashcard_id"]), []).append(dict(row))
    return conjugations


def add_noun_nodes(
    available_nodes: list[GrammarNode],
    card: FlashcardEntity,
    source_word_id: Optional[int],
) -> None:
    common_fields = common_node_fields(card, source_word_id)
    singular_forms = [
        ("subject", "nominative", "singular", get_article_for_gender(card.gender, "nominative"), True),
        ("object", "accusative", "singular", get_article_for_gender(card.gender, "accusative"), False),
        ("indirect_object", "dative", "singular", get_article_for_gender(card.gender, "dative"), False),
    ]

    for node_type, case, number, article, capitalize in singular_forms:
        label = format_noun_phrase(article, card.word, capitalize)
        available_nodes.append(GrammarNode(
            id=f"{node_type}_{card.id}_{case}_singular",
            label=label,
            type=node_type,
            surface_form=label,
            meta=GrammarNodeMeta(case=case, gender=card.gender, number=number),
            **common_fields,
        ))

    if card.plural_form and card.plural_form != card.word:
        plural_forms = [
            ("subject", "nominative", get_plural_article("nominative"), True),
            ("object", "accusative", get_plural_article("accusative"), False),
            ("indirect_object", "dative", get_plural_article("dative"), False),
        ]
        for node_type, case, article, capitalize in plural_forms:
            noun_form = format_plural_noun_for_case(card.plural_form, case)
            label = format_noun_phrase(article, noun_form, capitalize)
            available_nodes.append(GrammarNode(
                id=f"{node_type}_{card.id}_{case}_plural",
                label=label,
                type=node_type,
                surface_form=label,
                meta=GrammarNodeMeta(case=case, gender=card.gender, number="plural"),
                **common_fields,
            ))


def add_verb_nodes(
    available_nodes: list[GrammarNode],
    card: FlashcardEntity,
    source_word_id: Optional[int],
    conjugations: list[dict[str, Any]],
) -> None:
    common_fields = common_node_fields(card, source_word_id)
    if not conjugations:
        available_nodes.append(GrammarNode(
            id=f"verb_{card.id}_infinitive",
            label=card.word,
            type="predicate",
            surface_form=card.word,
            meta=GrammarNodeMeta(tense="infinitive"),
            **common_fields,
        ))
        return

    for conjugation in conjugations:
        form = conjugation["form"]
        pronoun = conjugation["pronoun"]
        available_nodes.append(GrammarNode(
            id=f"verb_{card.id}_{node_id_part(pronoun)}",
            label=form,
            type="predicate",
            surface_form=form,
            meta=GrammarNodeMeta(
                tense=conjugation["tense"],
                mood=conjugation["mood"],
                person=conjugation["person"],
                number=conjugation["number"],
                pronoun=pronoun,
            ),
            **common_fields,
        ))


def add_simple_word_node(
    available_nodes: list[GrammarNode],
    card: FlashcardEntity,
    source_word_id: Optional[int],
    node_type: str,
) -> None:
    label = card.word.capitalize() if node_type == "pronoun" and card.word == "ich" else card.word
    available_nodes.append(GrammarNode(
        id=f"{node_type}_{card.id}",
        label=label,
        type=node_type,
        surface_form=label,
        meta=GrammarNodeMeta(),
        **common_node_fields(card, source_word_id),
    ))


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
    limit: int = Query(240, description="Approximate grammar tokens to return"),
):
    """
    Get available nodes for sentence building.
    Dynamically generates student-ready grammar tokens from flashcards.
    Uses the rich producer schema:
    - nouns expose case and number variants;
    - verbs expose present indicative conjugations;
    - adjectives, adverbs, prepositions, and pronouns remain their own token types.
    """
    query = select(FlashcardEntity).where(FlashcardEntity.language == language).order_by(FlashcardEntity.id)
    flashcards = session.exec(query).all()
    source_word_ids = get_source_word_ids_by_flashcard(session, language)
    conjugations_by_flashcard = get_present_conjugations_by_flashcard(session, language)

    priority_words = {
        "sein": 0,
        "haben": 1,
        "werden": 2,
        "gehen": 3,
        "kommen": 4,
        "sehen": 5,
        "sprechen": 6,
        "lesen": 7,
        "essen": 8,
        "trinken": 9,
        "fliegen": 10,
        "Katze": 0,
        "Hund": 1,
        "Biene": 2,
        "Garten": 3,
    }
    base_source_limits = {
        "noun": 24,
        "verb": 12,
        "adjective": 18,
        "adverb": 18,
        "preposition": 12,
        "pronoun": 12,
    }
    scale = max(0.5, min(2.0, limit / 240))
    source_limits = {
        part_of_speech: max(6, round(source_limit * scale))
        for part_of_speech, source_limit in base_source_limits.items()
    }

    grouped_cards: dict[str, list[FlashcardEntity]] = {}
    for card in flashcards:
        part_of_speech = (card.part_of_speech or "").lower()
        if part_of_speech in source_limits:
            grouped_cards.setdefault(part_of_speech, []).append(card)

    for cards in grouped_cards.values():
        cards.sort(key=lambda card: (priority_words.get(card.word, 10_000), card.id or 0))

    available_nodes: list[GrammarNode] = []
    for card in grouped_cards.get("noun", [])[:source_limits["noun"]]:
        add_noun_nodes(available_nodes, card, source_word_ids.get(card.id or 0))

    for card in grouped_cards.get("pronoun", [])[:source_limits["pronoun"]]:
        add_simple_word_node(available_nodes, card, source_word_ids.get(card.id or 0), "pronoun")

    for card in grouped_cards.get("verb", [])[:source_limits["verb"]]:
        add_verb_nodes(
            available_nodes,
            card,
            source_word_ids.get(card.id or 0),
            conjugations_by_flashcard.get(card.id or 0, []),
        )

    for card in grouped_cards.get("adjective", [])[:source_limits["adjective"]]:
        add_simple_word_node(available_nodes, card, source_word_ids.get(card.id or 0), "adjective")

    for card in grouped_cards.get("adverb", [])[:source_limits["adverb"]]:
        add_simple_word_node(available_nodes, card, source_word_ids.get(card.id or 0), "adverb")

    for card in grouped_cards.get("preposition", [])[:source_limits["preposition"]]:
        add_simple_word_node(available_nodes, card, source_word_ids.get(card.id or 0), "preposition")
    
    return available_nodes
