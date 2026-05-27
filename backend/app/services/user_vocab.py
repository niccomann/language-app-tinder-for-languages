"""Extract a normalized weighted vocabulary for a user in a target language.

Output: dict[str, float] where keys are lowercased lemmas and values sum to 1.
Weight per word = log(1 + times_seen) * (confidence_score / 100.0);
missing confidence falls back to 0.5.
"""

from math import log1p

from sqlmodel import Session, select

from app.database.models import FlashcardEntity, UserWordStatisticsEntity


WEIGHT_FLOOR = 0.05


def extract_user_vocab(session: Session, *, user_id: str, language: str) -> dict[str, float]:
    flashcard_words = {
        word.lower()
        for word in session.exec(
            select(FlashcardEntity.word).where(FlashcardEntity.language == language)
        ).all()
        if word
    }
    if not flashcard_words:
        return {}

    stats_rows = session.exec(
        select(UserWordStatisticsEntity).where(
            UserWordStatisticsEntity.user_id == user_id,
            UserWordStatisticsEntity.language == language,
        )
    ).all()

    weighted_vocab: dict[str, float] = {}
    for stats in stats_rows:
        word = stats.word.lower()
        if word not in flashcard_words:
            continue

        times_seen = int(stats.times_seen or 0)
        confidence_weight = (
            0.5
            if stats.confidence_score is None
            else float(stats.confidence_score) / 100.0
        )
        weight = log1p(times_seen) * confidence_weight
        if weight <= 0:
            weight = WEIGHT_FLOOR

        weighted_vocab[word] = weighted_vocab.get(word, 0.0) + weight

    total_weight = sum(weighted_vocab.values())
    if total_weight <= 0:
        return {}

    return {
        word: weight / total_weight
        for word, weight in weighted_vocab.items()
    }
