import re

from fastapi import APIRouter, Query, Request
from typing import List, Optional
from sqlmodel import select
from pydantic import BaseModel

from app.database import SessionDependency
from app.database.models import ExampleSentenceEntity, FlashcardEntity
from app.routes.cards import load_adaptive_candidates
from app.services.adaptive_learning import adaptive_sort_key


router = APIRouter(prefix="/api/games", tags=["games"])

# Languages that exist as their own words in `flashcards`. Every card also
# carries an English `translation`, so English (and any language not produced
# yet, e.g. es/pt) is served through that shared pivot instead.
WORD_LANGUAGES = {"de", "fr", "it"}

CEFR_LEVELS = ("A1", "A2", "B1", "B2")

# The original seed filled every word with one A1 placeholder
# ("Der X ist hier." -> "The X is here."). Those are hidden from the listening
# feature; only real, varied sentences are shown.
_TEMPLATE_TRANSLATION = re.compile(r"^the\s+.+\s+is here\.?$", re.IGNORECASE)
_TEMPLATE_SENTENCE = re.compile(r"\bist hier\.?$", re.IGNORECASE)


class MatchPair(BaseModel):
    id: int
    target_word: str
    base_word: str
    audio_base64: Optional[str] = None


class ExampleSentenceLite(BaseModel):
    sentence: str
    translation: Optional[str] = None


class WordSentences(BaseModel):
    id: int
    word: str
    sentences: List[ExampleSentenceLite]


class WordImage(BaseModel):
    image_base64: Optional[str] = None


def _norm(value: str) -> str:
    return (value or "").strip().lower()


def _norm_level(level: Optional[str]) -> Optional[str]:
    if not level:
        return None
    candidate = level.strip().upper()
    return candidate if candidate in CEFR_LEVELS else None


def _is_template(sentence: Optional[str], translation: Optional[str]) -> bool:
    if translation and _TEMPLATE_TRANSLATION.match(translation.strip()):
        return True
    if sentence and _TEMPLATE_SENTENCE.search(sentence.strip()):
        return True
    return False


@router.get("/match-pairs", response_model=List[MatchPair])
async def get_match_pairs(
    session: SessionDependency,
    request: Request,
    target: str = Query(..., description="Target language code (de/fr/it)"),
    base: str = Query("en", description="Base language code"),
    limit: int = Query(20, ge=1, le=60, description="Max number of pairs"),
    max_cefr_level: Optional[str] = Query(None, description="Hard cap for path-unlocked CEFR level"),
):
    """Ready-to-play word-matching pairs for the matching game.

    The target side is picked with the adaptive selection (weak words first).
    The base side is resolved through the shared English translation: when the
    base language has its own words (de/fr/it) we look up the sibling word for
    the same English meaning; otherwise the English translation itself is shown.
    Pairs are deduplicated by meaning so a screen never has two correct answers.
    """
    user_id = getattr(request.state, "user_id", None) or "default_user"
    target = _norm(target)
    base = _norm(base)

    base_is_pivot = base == target or base not in WORD_LANGUAGES

    base_word_by_meaning: dict[str, str] = {}
    if not base_is_pivot:
        base_rows = session.exec(
            select(FlashcardEntity.word, FlashcardEntity.translation).where(
                FlashcardEntity.language == base
            )
        ).all()
        for word, translation in base_rows:
            key = _norm(translation)
            if key and key not in base_word_by_meaning:
                base_word_by_meaning[key] = word

    candidates = load_adaptive_candidates(session, target, None, user_id, max_cefr_level)
    ordered = sorted(candidates, key=lambda item: adaptive_sort_key(item[0]))

    selected: list[tuple[FlashcardEntity, str]] = []
    seen_meanings: set[str] = set()
    for candidate, card, _stats in ordered:
        meaning = _norm(card.translation)
        if not meaning or meaning in seen_meanings:
            continue
        if base_is_pivot:
            base_word = card.translation
            if _norm(card.word) == meaning:
                continue  # identical cognate (Hotel/hotel) — trivial match
        else:
            base_word = base_word_by_meaning.get(meaning)
            if not base_word or _norm(base_word) == _norm(card.word):
                continue
        seen_meanings.add(meaning)
        selected.append((card, base_word))
        if len(selected) >= limit:
            break

    ids = [card.id for card, _ in selected]
    audio_by_id: dict[int, Optional[str]] = {}
    if ids:
        rows = session.exec(
            select(FlashcardEntity.id, FlashcardEntity.audio_base64).where(
                FlashcardEntity.id.in_(ids)
            )
        ).all()
        audio_by_id = {row[0]: row[1] for row in rows}

    return [
        MatchPair(
            id=card.id,
            target_word=card.word,
            base_word=base_word,
            audio_base64=audio_by_id.get(card.id),
        )
        for card, base_word in selected
    ]


def _words_with_real_sentences(
    session: SessionDependency, target: str, level: Optional[str]
) -> set[int]:
    """Flashcard ids in `target` that have at least one non-template sentence
    (optionally restricted to a CEFR level)."""
    stmt = (
        select(
            ExampleSentenceEntity.flashcard_id,
            ExampleSentenceEntity.sentence,
            ExampleSentenceEntity.translation,
        )
        .join(FlashcardEntity, FlashcardEntity.id == ExampleSentenceEntity.flashcard_id)
        .where(FlashcardEntity.language == target)
    )
    if level:
        stmt = stmt.where(ExampleSentenceEntity.difficulty_level == level)
    return {
        fid
        for fid, sentence, translation in session.exec(stmt).all()
        if not _is_template(sentence, translation)
    }


@router.get("/sentence-practice", response_model=List[int])
async def get_sentence_practice(
    session: SessionDependency,
    request: Request,
    target: str = Query(..., description="Target language code (de/fr/it)"),
    level: Optional[str] = Query(None, description="CEFR level filter (A1/A2/B1/B2)"),
    limit: int = Query(10, ge=1, le=30, description="Max words"),
):
    """Flashcard ids for the standalone 'listen to sentences' feature.

    Picks words the learner already knows best (highest confidence first) that
    have a real (non-template) example sentence at the requested level, so the
    slideshow is always populated. The frontend then loads each word's sentence
    via /example-sentences.
    """
    user_id = getattr(request.state, "user_id", None) or "default_user"
    target = _norm(target)
    level = _norm_level(level)

    with_sentences = _words_with_real_sentences(session, target, level)
    if not with_sentences:
        return []

    candidates = load_adaptive_candidates(session, target, None, user_id)
    eligible = [candidate for candidate, _card, _stats in candidates if candidate.id in with_sentences]
    eligible.sort(key=lambda c: c.confidence_score, reverse=True)
    return [candidate.id for candidate in eligible[:limit]]


@router.get("/word-image", response_model=WordImage)
async def get_word_image(
    session: SessionDependency,
    id: int = Query(..., description="Flashcard id"),
):
    """Single flashcard's image (base64), or null if the word has none.

    Kept separate from /example-sentences because images are ~100KB each; the
    sentence slideshow lazy-loads only the current and next word's image.
    """
    image = session.exec(
        select(FlashcardEntity.image_base64).where(FlashcardEntity.id == id)
    ).first()
    return WordImage(image_base64=image or None)


@router.get("/example-sentences", response_model=List[WordSentences])
async def get_example_sentences(
    session: SessionDependency,
    ids: str = Query(..., description="Comma-separated flashcard ids (the played words)"),
    level: Optional[str] = Query(None, description="CEFR level filter (A1/A2/B1/B2)"),
    per_word: int = Query(1, ge=1, le=5, description="Max sentences per word"),
):
    """Example sentences for the words just practiced in the matching game.

    Used by the post-game listening phase: returns, in the requested order, the
    flashcards that have real (non-template) example sentences at the requested
    level (words without are skipped), so the frontend can read them aloud with
    OpenAI TTS.
    """
    level = _norm_level(level)
    id_list: list[int] = []
    seen: set[int] = set()
    for part in ids.split(","):
        part = part.strip()
        if part.isdigit():
            value = int(part)
            if value not in seen:
                seen.add(value)
                id_list.append(value)
    id_list = id_list[:50]
    if not id_list:
        return []

    word_rows = session.exec(
        select(FlashcardEntity.id, FlashcardEntity.word).where(FlashcardEntity.id.in_(id_list))
    ).all()
    word_by_id = {row[0]: row[1] for row in word_rows}

    stmt = select(ExampleSentenceEntity).where(ExampleSentenceEntity.flashcard_id.in_(id_list))
    if level:
        stmt = stmt.where(ExampleSentenceEntity.difficulty_level == level)
    sentence_rows = session.exec(stmt).all()
    by_card: dict[int, list[ExampleSentenceEntity]] = {}
    for row in sentence_rows:
        if _is_template(row.sentence, row.translation):
            continue
        by_card.setdefault(row.flashcard_id, []).append(row)

    result: list[WordSentences] = []
    for fid in id_list:
        sentences = by_card.get(fid)
        if not sentences:
            continue
        chosen = sorted(sentences, key=lambda s: s.id)[:per_word]
        result.append(
            WordSentences(
                id=fid,
                word=word_by_id.get(fid, ""),
                sentences=[
                    ExampleSentenceLite(sentence=s.sentence, translation=s.translation)
                    for s in chosen
                ],
            )
        )
    return result
