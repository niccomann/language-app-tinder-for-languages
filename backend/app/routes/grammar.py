from fastapi import APIRouter, Query
from typing import List, Optional
from pydantic import BaseModel
from sqlmodel import select

from app.database import SessionDependency
from app.database.models import (
    FlashcardEntity,
    GrammarSentenceEntity,
    GrammarSentenceNodeEntity,
    GrammarSentenceEdgeEntity,
    SentenceChallengeEntity,
)
from app.models import LearningPreferenceProfile
from app.services.grammar_node_builders import (
    add_noun_nodes,
    add_simple_word_node,
    add_verb_nodes,
    grammar_card_sort_key,
)
from app.services.grammar_present_conjugations import (
    get_present_conjugations_by_flashcard,
    get_source_word_ids_by_flashcard,  # re-exported for backward-compat with tests
)
from app.services.grammar_schemas import (
    GrammarEdge,
    GrammarNode,
    GrammarNodeMeta,
    GrammarSentence,
    SentenceChallenge,
)
from app.services.grammar_starter_cards import (
    build_grammar_starter_cards,
    card_part_of_speech,
)
from app.services.grammar_token_utils import (
    merge_option_tokens,
    parse_token_json,
    sentence_challenge_sort_key,
)
from app.services.sentence_validator import (
    ConnectionInfo,
    NodeInfo,
    sentence_validator_service,
)


router = APIRouter(prefix="/api/grammar", tags=["grammar"])


PRIORITY_WORDS = {
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


BASE_SOURCE_LIMITS = {
    "noun": 28,
    "verb": 14,
    "adjective": 18,
    "adverb": 30,
    "preposition": 22,
    "pronoun": 20,
    "article": 12,
    "conjunction": 18,
}


@router.get("/sentence-challenges", response_model=List[SentenceChallenge])
async def get_sentence_challenges(
    session: SessionDependency,
    language: str = Query("de", description="Target language code"),
    difficulty: Optional[str] = Query(None, description="Filter by challenge difficulty"),
    limit: int = Query(20, description="Maximum number of challenges to return"),
    profile_part_of_speech: Optional[List[str]] = Query(None, description="Preference profile grammar focus"),
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
    )
    if difficulty:
        query = query.where(SentenceChallengeEntity.difficulty == difficulty)

    challenges = session.exec(query).all()
    challenges = sorted(
        challenges,
        key=lambda challenge: sentence_challenge_sort_key(challenge, profile_part_of_speech),
    )[:limit]

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
        language=request.language,
    )

    return ValidateSentenceResponse(
        status=result.status.value,
        sentence=result.sentence,
        grammar_correct=result.grammar_correct,
        semantic_correct=result.semantic_correct,
        explanation=result.explanation,
        suggestion=result.suggestion,
    )


@router.get("/available-nodes", response_model=List[GrammarNode])
async def get_available_nodes(
    session: SessionDependency,
    language: str = Query("de", description="Language code"),
    limit: int = Query(360, description="Approximate grammar tokens to return"),
    profile_domain: Optional[List[str]] = Query(None, description="Preference profile domains"),
    profile_tone: Optional[List[str]] = Query(None, description="Preference profile tones"),
    profile_word_style: Optional[List[str]] = Query(None, description="Preference profile word styles"),
    profile_part_of_speech: Optional[List[str]] = Query(None, description="Preference profile parts of speech"),
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
    preference_profile = LearningPreferenceProfile(
        domains=profile_domain or [],
        tones=profile_tone or [],
        wordStyles=profile_word_style or [],
        preferredPartsOfSpeech=profile_part_of_speech or [],
    )
    source_word_ids = get_source_word_ids_by_flashcard(session, language)
    conjugations_by_flashcard = get_present_conjugations_by_flashcard(session, language)

    scale = max(0.5, min(2.0, limit / 360))
    source_limits = {
        part_of_speech: max(6, round(source_limit * scale))
        for part_of_speech, source_limit in BASE_SOURCE_LIMITS.items()
    }

    grouped_cards: dict[str, list[FlashcardEntity]] = {}
    for card in flashcards:
        part_of_speech = card_part_of_speech(card) or ""
        if part_of_speech in source_limits:
            grouped_cards.setdefault(part_of_speech, []).append(card)

    for cards in grouped_cards.values():
        cards.sort(key=lambda card: grammar_card_sort_key(card, PRIORITY_WORDS, preference_profile))

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
