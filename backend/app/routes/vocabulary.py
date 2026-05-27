"""Import a list of already-known words and mark them as known for the user.

Lets a user paste (or upload) a vocabulary they already know so it is added to
their knowledge without swiping. Matching is hybrid: an LLM (OpenAI) normalizes
the pasted words to dictionary base forms when available, with a deterministic
fallback (lowercase + strip articles/punctuation) so it always works even when
the OpenAI quota is exhausted.

Matched catalog flashcards are marked known via UserWordStatistics
(confidence high -> counts as mastered by the adaptive system) and UserProgress.
"""
import json
import logging
import os
import re
from datetime import UTC, datetime

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.core.user_middleware import require_user_id
from app.database.connection import DatabaseConnection
from app.database.models import (
    FlashcardEntity,
    UserProgressEntity,
    UserWordStatisticsEntity,
)

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/vocabulary", tags=["vocabulary"])

_db = DatabaseConnection()

KNOWN_CONFIDENCE = 85
MAX_WORDS = 1000

# Leading articles/determiners to strip per language so "der Hund" matches "Hund".
ARTICLES = {
    "der", "die", "das", "des", "dem", "den", "ein", "eine", "einen", "einem", "einer",
    "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "l",
    "le", "les", "des", "du", "de", "une",
    "el", "los", "las", "unos", "unas",
    "the", "a", "an",
}


def normalize_word(raw: str) -> str:
    """Lowercase, drop punctuation, and strip a single leading article."""
    cleaned = re.sub(r"[^\w\s'’-]", " ", raw, flags=re.UNICODE).strip().lower()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        return ""
    parts = cleaned.split(" ")
    if len(parts) > 1 and parts[0] in ARTICLES:
        parts = parts[1:]
    return " ".join(parts).strip()


def split_candidates(text: str) -> list[str]:
    """Split pasted text into candidate words by lines, commas, semicolons, tabs."""
    rough = re.split(r"[\n,;\t]+", text)
    seen: set[str] = set()
    out: list[str] = []
    for token in rough:
        token = token.strip()
        if not token:
            continue
        key = token.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(token)
        if len(out) >= MAX_WORDS:
            break
    return out


def llm_normalize(candidates: list[str], language: str) -> list[str] | None:
    """Best-effort: map each word to its dictionary base form via OpenAI.
    Returns None on any failure (no key, quota/429, bad output) -> deterministic fallback."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or not candidates:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        prompt = (
            f"These are words a learner says they already know, in language code '{language}'.\n"
            "For EACH input, return its dictionary base form (lemma) in that language "
            "(singular, no article, infinitive for verbs). Keep the same order and count.\n"
            f"Input (one per line):\n{chr(10).join(candidates)}\n\n"
            'Return ONLY a JSON array of strings, e.g. ["Hund","gehen"]. No commentary.'
        )
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a precise lexicographer. Output only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            timeout=20,
        )
        content = (resp.choices[0].message.content or "").strip()
        start, end = content.find("["), content.rfind("]")
        if start == -1 or end == -1:
            return None
        parsed = json.loads(content[start : end + 1])
        if isinstance(parsed, list) and len(parsed) == len(candidates):
            return [str(x) for x in parsed]
        return None
    except Exception as exc:  # noqa: BLE001 - any failure -> fallback to deterministic
        log.info("LLM normalize unavailable, using deterministic match: %s", exc)
        return None


class ImportKnownRequest(BaseModel):
    language: str = Field(min_length=2, max_length=8)
    text: str = Field(min_length=1, max_length=20000)


class ImportKnownResult(BaseModel):
    submitted: int
    matched: int
    added: int
    already_known: int
    matched_words: list[str]
    unmatched_words: list[str]


@router.post("/import-known", response_model=ImportKnownResult)
def import_known(payload: ImportKnownRequest, request: Request):
    user_id = require_user_id(request)
    language = payload.language.strip().lower()

    candidates = split_candidates(payload.text)
    if not candidates:
        return ImportKnownResult(
            submitted=0, matched=0, added=0, already_known=0,
            matched_words=[], unmatched_words=[],
        )

    normalized_inputs = llm_normalize(candidates, language) or candidates
    now = datetime.now(UTC)

    with Session(_db.engine) as session:
        rows = session.exec(
            select(FlashcardEntity.id, FlashcardEntity.word).where(
                FlashcardEntity.language == language
            )
        ).all()
        # normalized key -> list of (id, word) (catalog has inflected duplicates)
        index: dict[str, list[tuple[int, str]]] = {}
        for fid, word in rows:
            key = normalize_word(word)
            if key:
                index.setdefault(key, []).append((fid, word))

        matched_words: list[str] = []
        unmatched_words: list[str] = []
        matched_cards: dict[int, str] = {}
        seen_keys: set[str] = set()
        for original, normalized in zip(candidates, normalized_inputs):
            key = normalize_word(normalized)
            hits = index.get(key) or index.get(normalize_word(original))
            if hits:
                if key not in seen_keys:
                    seen_keys.add(key)
                    matched_words.append(hits[0][1])
                for fid, word in hits:
                    matched_cards[fid] = word
            else:
                unmatched_words.append(original)

        added = 0
        already_known = 0
        for fid, word in matched_cards.items():
            stat = session.exec(
                select(UserWordStatisticsEntity).where(
                    UserWordStatisticsEntity.user_id == user_id,
                    UserWordStatisticsEntity.word == word,
                    UserWordStatisticsEntity.language == language,
                )
            ).first()
            if stat and stat.confidence_score >= 80:
                already_known += 1
                continue
            if stat is None:
                stat = UserWordStatisticsEntity(
                    user_id=user_id, word=word, language=language,
                    confidence_score=KNOWN_CONFIDENCE, times_seen=1, times_correct=1,
                    last_practiced=now,
                )
            else:
                stat.confidence_score = KNOWN_CONFIDENCE
                stat.times_seen += 1
                stat.times_correct += 1
                stat.last_practiced = now
            session.add(stat)

            card_id = str(fid)
            prog = session.exec(
                select(UserProgressEntity).where(
                    UserProgressEntity.user_id == user_id,
                    UserProgressEntity.card_id == card_id,
                )
            ).first()
            if prog is None:
                session.add(UserProgressEntity(
                    user_id=user_id, card_id=card_id, known=True,
                    review_count=1, swipe_right_count=1, swipe_left_count=0,
                    last_reviewed=now,
                ))
            else:
                prog.known = True
                prog.swipe_right_count += 1
                prog.review_count += 1
                prog.last_reviewed = now
                session.add(prog)
            added += 1

        session.commit()

    return ImportKnownResult(
        submitted=len(candidates),
        matched=len(matched_words),
        added=added,
        already_known=already_known,
        matched_words=matched_words[:100],
        unmatched_words=unmatched_words[:100],
    )
