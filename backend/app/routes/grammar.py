import re
import json
import hashlib

from fastapi import APIRouter, Query
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlmodel import select

from app.services.grammar_conjugations import build_present_conjugation_rows
from app.services.schema_utils import database_column_exists, database_table_exists
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
    SentenceChallengeEntity,
)

router = APIRouter(prefix="/api/grammar", tags=["grammar"])


NOUN_CATEGORY_HINTS = {
    "animals",
    "family",
    "food",
    "nature",
    "objects",
}


GRAMMAR_STARTER_CARDS = [
    *[
        {"word": word, "translation": translation, "part_of_speech": "pronoun", "category": "grammar"}
        for word, translation in [
            ("ich", "I"),
            ("du", "you"),
            ("er", "he"),
            ("sie", "she/they"),
            ("es", "it"),
            ("wir", "we"),
            ("ihr", "you plural"),
            ("Sie", "you formal"),
            ("man", "one"),
            ("mich", "me"),
            ("dich", "you"),
            ("uns", "us"),
            ("euch", "you plural"),
            ("ihm", "him"),
            ("ihnen", "them"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "article", "category": "grammar"}
        for word, translation in [
            ("der", "the"),
            ("die", "the"),
            ("das", "the"),
            ("den", "the"),
            ("dem", "the"),
            ("des", "the"),
            ("ein", "a"),
            ("eine", "a"),
            ("einen", "a"),
            ("einem", "a"),
            ("einer", "a"),
            ("kein", "no"),
            ("keine", "no"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "preposition", "category": "grammar"}
        for word, translation in [
            ("in", "in"),
            ("auf", "on"),
            ("mit", "with"),
            ("zu", "to"),
            ("von", "from"),
            ("aus", "out of"),
            ("bei", "at"),
            ("nach", "after/to"),
            ("vor", "before/in front of"),
            ("unter", "under"),
            ("neben", "next to"),
            ("zwischen", "between"),
            ("durch", "through"),
            ("gegen", "against"),
            ("ohne", "without"),
            ("um", "around"),
            ("an", "at/on"),
            ("seit", "since"),
            ("bis", "until"),
            ("trotz", "despite"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "conjunction", "category": "grammar"}
        for word, translation in [
            ("und", "and"),
            ("oder", "or"),
            ("aber", "but"),
            ("weil", "because"),
            ("dass", "that"),
            ("wenn", "if/when"),
            ("obwohl", "although"),
            ("denn", "because"),
            ("sondern", "but rather"),
            ("bevor", "before"),
            ("nachdem", "after"),
            ("waehrend", "while"),
            ("als", "when"),
            ("bis", "until"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "adverb", "category": "grammar"}
        for word, translation in [
            ("heute", "today"),
            ("leider", "unfortunately"),
            ("schnell", "quickly"),
            ("langsam", "slowly"),
            ("gern", "gladly"),
            ("immer", "always"),
            ("oft", "often"),
            ("nie", "never"),
            ("morgen", "tomorrow"),
            ("gestern", "yesterday"),
            ("hier", "here"),
            ("dort", "there"),
            ("sehr", "very"),
            ("schon", "already"),
            ("noch", "still"),
            ("vielleicht", "maybe"),
            ("zusammen", "together"),
            ("allein", "alone"),
            ("bald", "soon"),
            ("jetzt", "now"),
            ("wirklich", "really"),
            ("besonders", "especially"),
            ("sofort", "immediately"),
            ("wieder", "again"),
            ("manchmal", "sometimes"),
            ("kaum", "hardly"),
            ("fast", "almost"),
            ("oben", "above"),
            ("unten", "below"),
            ("links", "left"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "adjective", "category": "grammar"}
        for word, translation in [
            ("gut", "good"),
            ("schlecht", "bad"),
            ("gross", "big"),
            ("klein", "small"),
            ("neu", "new"),
            ("alt", "old"),
            ("leicht", "easy"),
            ("schwer", "difficult"),
            ("ruhig", "calm"),
            ("stark", "strong"),
            ("warm", "warm"),
            ("kalt", "cold"),
            ("richtig", "correct"),
            ("falsch", "wrong"),
            ("wichtig", "important"),
            ("einfach", "simple"),
            ("kurz", "short"),
            ("lang", "long"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "verb", "category": "verbs"}
        for word, translation in [
            ("sein", "to be"),
            ("haben", "to have"),
            ("werden", "to become"),
            ("gehen", "to go"),
            ("kommen", "to come"),
            ("sehen", "to see"),
            ("sprechen", "to speak"),
            ("lesen", "to read"),
            ("essen", "to eat"),
            ("trinken", "to drink"),
            ("lernen", "to learn"),
            ("schlafen", "to sleep"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "noun", "category": "grammar", "gender": gender, "plural_form": plural}
        for word, translation, gender, plural in [
            ("Garten", "garden", "masculine", "Gaerten"),
            ("Zeit", "time", "feminine", "Zeiten"),
            ("Freund", "friend", "masculine", "Freunde"),
            ("Buch", "book", "neuter", "Buecher"),
        ]
    ],
]


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


def card_part_of_speech(card: FlashcardEntity) -> Optional[str]:
    if card.part_of_speech:
        return card.part_of_speech.lower()

    category = (card.category or "").lower()
    if category in {"verbs", "actions"}:
        return "verb"
    if category == "colors":
        return "adjective"
    if category in NOUN_CATEGORY_HINTS:
        return "noun"
    return None


def build_grammar_starter_cards(
    flashcards: list[FlashcardEntity],
    language: str,
) -> list[FlashcardEntity]:
    existing = {
        ((card.word or "").casefold(), card_part_of_speech(card))
        for card in flashcards
    }
    starter_cards: list[FlashcardEntity] = []

    for index, starter in enumerate(GRAMMAR_STARTER_CARDS, start=1):
        key = (starter["word"].casefold(), starter["part_of_speech"])
        if key in existing:
            continue

        starter_cards.append(
            FlashcardEntity(
                id=-index,
                word=starter["word"],
                translation=starter["translation"],
                image_url="",
                language=language,
                difficulty="easy",
                category=starter["category"],
                cefr_level="A1",
                frequency_band="very_common",
                part_of_speech=starter["part_of_speech"],
                gender=starter.get("gender"),
                plural_form=starter.get("plural_form"),
            )
        )

    return starter_cards


def grammar_card_sort_key(card: FlashcardEntity, priority_words: dict[str, int]) -> tuple[int, int]:
    card_id = card.id or 0
    stable_id = card_id if card_id > 0 else abs(card_id)
    return (priority_words.get(card.word, 10_000), stable_id)


def common_node_fields(card: FlashcardEntity, source_word_id: Optional[int] = None) -> dict[str, Any]:
    return {
        "lemma": card.word,
        "part_of_speech": card_part_of_speech(card),
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
    if not database_table_exists(session, "words"):
        return {}

    order_by_ground_truth = (
        "CASE WHEN w.is_ground_truth THEN 0 ELSE 1 END,"
        if database_column_exists(session, "words", "is_ground_truth")
        else ""
    )
    rows = session.execute(
        text(
            f"""
            SELECT
                f.id AS flashcard_id,
                w.id AS source_word_id
            FROM flashcards f
            JOIN words w ON w.word = f.word AND w.language = f.language
            WHERE f.language = :language
            ORDER BY f.id, {order_by_ground_truth} w.id
            """
        ),
        {"language": language},
    ).mappings().all()

    source_word_ids: dict[int, int] = {}
    for row in rows:
        flashcard_id = int(row["flashcard_id"])
        if flashcard_id not in source_word_ids:
            source_word_ids[flashcard_id] = int(row["source_word_id"])
    return source_word_ids


def parse_token_json(value: str) -> list[str]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [str(token) for token in parsed if str(token).strip()]


def merge_option_tokens(
    correct_tokens: list[str],
    distractor_tokens: list[str],
    seed: str,
    limit: int = 12,
) -> list[str]:
    tokens: list[str] = []
    seen: set[str] = set()
    for token in [*correct_tokens, *distractor_tokens]:
        normalized = token.casefold()
        if normalized in seen:
            continue
        seen.add(normalized)
        tokens.append(token)
        if len(tokens) >= limit:
            break

    tokens.sort(key=lambda token: hashlib.sha256(f"{seed}:{token.casefold()}".encode("utf-8")).hexdigest())
    if len(tokens) > len(correct_tokens) and tokens[:len(correct_tokens)] == correct_tokens:
        tokens = tokens[1:] + tokens[:1]
    return tokens


def build_fallback_present_conjugations(lemma: str) -> list[dict[str, Any]]:
    return build_present_conjugation_rows(lemma)


def get_fallback_present_conjugations_by_flashcard(
    session: SessionDependency,
    language: str,
) -> dict[int, list[dict[str, Any]]]:
    cards = session.exec(
        select(FlashcardEntity)
        .where(FlashcardEntity.language == language)
        .order_by(FlashcardEntity.id)
    ).all()

    starter_cards = build_grammar_starter_cards(cards, language)
    conjugations: dict[int, list[dict[str, Any]]] = {}
    for card in [*cards, *starter_cards]:
        if card.id is None or card_part_of_speech(card) != "verb":
            continue
        fallback_rows = build_fallback_present_conjugations(card.word)
        if fallback_rows:
            conjugations[int(card.id)] = fallback_rows
    return conjugations


def get_present_conjugations_by_flashcard(session: SessionDependency, language: str) -> dict[int, list[dict[str, Any]]]:
    if not database_table_exists(session, "verb_conjugations"):
        return get_fallback_present_conjugations_by_flashcard(session, language)

    if database_column_exists(session, "verb_conjugations", "flashcard_id"):
        rows = session.execute(
            text(
                """
                SELECT
                    flashcard_id,
                    mood,
                    tense,
                    person,
                    number,
                    pronoun,
                    form
                FROM verb_conjugations
                WHERE mood = 'indicative'
                  AND tense = 'present'
                  AND flashcard_id IN (
                      SELECT id FROM flashcards WHERE language = :language
                  )
                ORDER BY flashcard_id, pronoun, person, number, id
                """
            ),
            {"language": language},
        ).mappings().all()
        return group_present_conjugation_rows(rows) or get_fallback_present_conjugations_by_flashcard(session, language)

    if not database_table_exists(session, "words"):
        return get_fallback_present_conjugations_by_flashcard(session, language)

    rows = session.execute(
        text(
            """
            SELECT
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

    return group_present_conjugation_rows(rows)


def group_present_conjugation_rows(rows: list[dict[str, Any]]) -> dict[int, list[dict[str, Any]]]:
    conjugations: dict[int, list[dict[str, Any]]] = {}
    seen: set[tuple[int, str]] = set()
    for row in rows:
        flashcard_id = int(row["flashcard_id"])
        key = (flashcard_id, row["pronoun"])
        if key in seen:
            continue
        seen.add(key)
        conjugations.setdefault(flashcard_id, []).append(dict(row))
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


@router.get("/sentence-challenges", response_model=List[SentenceChallenge])
async def get_sentence_challenges(
    session: SessionDependency,
    language: str = Query("de", description="Target language code"),
    difficulty: Optional[str] = Query(None, description="Filter by challenge difficulty"),
    limit: int = Query(20, description="Maximum number of challenges to return"),
):
    """
    Return deterministic sentence-placement challenges from database ground truth.
    The client can correct answers locally by comparing selected tokens to
    correct_tokens, avoiding AI latency in the user interaction path.
    """
    query = (
        select(SentenceChallengeEntity)
        .where(
            SentenceChallengeEntity.language == language,
            SentenceChallengeEntity.is_active == True,  # noqa: E712
        )
        .order_by(SentenceChallengeEntity.id)
        .limit(limit)
    )
    if difficulty:
        query = query.where(SentenceChallengeEntity.difficulty == difficulty)

    challenges = session.exec(query).all()

    return [
        SentenceChallenge(
            id=challenge.id or 0,
            language=challenge.language,
            prompt_language=challenge.prompt_language,
            target_language=challenge.target_language,
            prompt=challenge.prompt,
            correct_sentence=challenge.correct_sentence,
            correct_tokens=parse_token_json(challenge.correct_tokens),
            distractor_tokens=parse_token_json(challenge.distractor_tokens),
            option_tokens=merge_option_tokens(
                parse_token_json(challenge.correct_tokens),
                parse_token_json(challenge.distractor_tokens),
                seed=f"{challenge.id}:{challenge.prompt}",
            ),
            difficulty=challenge.difficulty,
            grammar_focus=challenge.grammar_focus,
            cefr_level=challenge.cefr_level,
            validation_mode=challenge.validation_mode,
        )
        for challenge in challenges
    ]


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
    limit: int = Query(360, description="Approximate grammar tokens to return"),
):
    """
    Get available nodes for sentence building.
    Dynamically generates student-ready grammar tokens from flashcards.
    Uses the rich producer schema:
    - nouns expose case and number variants;
    - verbs expose present indicative conjugations;
    - adjectives, adverbs, prepositions, pronouns, articles, and conjunctions remain their own token types.
    """
    query = select(FlashcardEntity).where(FlashcardEntity.language == language).order_by(FlashcardEntity.id)
    flashcards = session.exec(query).all()
    flashcards = [*flashcards, *build_grammar_starter_cards(flashcards, language)]
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
        "der": 0,
        "die": 1,
        "das": 2,
        "ein": 3,
        "eine": 4,
        "und": 0,
        "oder": 1,
        "aber": 2,
        "weil": 3,
        "dass": 4,
        "wenn": 5,
        "in": 0,
        "auf": 1,
        "mit": 2,
        "zu": 3,
        "von": 4,
        "ich": 0,
        "du": 1,
        "er": 2,
        "sie": 3,
        "wir": 4,
        "man": 5,
    }
    base_source_limits = {
        "noun": 28,
        "verb": 14,
        "adjective": 18,
        "adverb": 30,
        "preposition": 22,
        "pronoun": 20,
        "article": 12,
        "conjunction": 18,
    }
    scale = max(0.5, min(2.0, limit / 360))
    source_limits = {
        part_of_speech: max(6, round(source_limit * scale))
        for part_of_speech, source_limit in base_source_limits.items()
    }

    grouped_cards: dict[str, list[FlashcardEntity]] = {}
    for card in flashcards:
        part_of_speech = card_part_of_speech(card) or ""
        if part_of_speech in source_limits:
            grouped_cards.setdefault(part_of_speech, []).append(card)

    for cards in grouped_cards.values():
        cards.sort(key=lambda card: grammar_card_sort_key(card, priority_words))

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

    for card in grouped_cards.get("article", [])[:source_limits["article"]]:
        add_simple_word_node(available_nodes, card, source_word_ids.get(card.id or 0), "article")

    for card in grouped_cards.get("conjunction", [])[:source_limits["conjunction"]]:
        add_simple_word_node(available_nodes, card, source_word_ids.get(card.id or 0), "conjunction")
    
    return available_nodes
