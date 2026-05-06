from datetime import UTC, datetime
from typing import Any, Optional


CONFIDENCE_MIN = 0
CONFIDENCE_MAX = 100
CORRECT_CONFIDENCE_DELTA = 12
INCORRECT_CONFIDENCE_DELTA = -18


def clamp_confidence_score(score: int) -> int:
    return max(CONFIDENCE_MIN, min(CONFIDENCE_MAX, score))


def next_confidence_score(current_score: int, correct: bool) -> int:
    delta = CORRECT_CONFIDENCE_DELTA if correct else INCORRECT_CONFIDENCE_DELTA
    return clamp_confidence_score(current_score + delta)


def knowledge_level_from_confidence(confidence_score: int) -> int:
    clamped_score = clamp_confidence_score(confidence_score)
    return min(10, max(1, (clamped_score // 10) + 1))


def _get_candidate_value(candidate: Any, name: str, default: Any = None) -> Any:
    return getattr(candidate, name, default)


def _adaptive_bucket(candidate: Any) -> int:
    confidence_score = int(_get_candidate_value(candidate, "confidence_score", 0) or 0)
    times_seen = int(_get_candidate_value(candidate, "times_seen", 0) or 0)

    if times_seen > 0 and confidence_score < 30:
        return 0
    if times_seen == 0:
        return 1
    if confidence_score < 80:
        return 2
    return 3


def adaptive_sort_key(candidate: Any) -> tuple[int, float, int, int]:
    last_practiced: Optional[datetime] = _get_candidate_value(candidate, "last_practiced")
    last_practiced_timestamp = last_practiced.timestamp() if last_practiced else 0
    times_seen = int(_get_candidate_value(candidate, "times_seen", 0) or 0)
    card_id = int(_get_candidate_value(candidate, "id", 0) or 0)

    return (_adaptive_bucket(candidate), last_practiced_timestamp, times_seen, card_id)


def selection_reason(candidate: Any) -> str:
    confidence_score = int(_get_candidate_value(candidate, "confidence_score", 0) or 0)
    times_seen = int(_get_candidate_value(candidate, "times_seen", 0) or 0)

    if times_seen == 0:
        return "new"
    if confidence_score < 30:
        return "struggling"
    if confidence_score < 80:
        return "learning"
    return "review"


def _as_aware_datetime(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def trend_from_delta(level_delta: Optional[float]) -> str:
    if level_delta is None:
        return "new"
    if level_delta >= 0.5:
        return "improving"
    if level_delta <= -0.5:
        return "declining"
    return "stable"


def build_learning_summary(
    stats: list[Any],
    *,
    now: Optional[datetime] = None,
    previous_average_knowledge_level: Optional[float] = None,
) -> dict[str, Any]:
    checked_at = _as_aware_datetime(now) or datetime.now(UTC)

    if not stats:
        return {
            "average_confidence": 0.0,
            "average_knowledge_level": 1.0,
            "total_words_practiced": 0,
            "total_practice_sessions": 0,
            "words_struggling": 0,
            "words_learning": 0,
            "words_mastered": 0,
            "trend": "new",
            "level_delta": 0.0,
            "last_practiced": None,
            "days_since_last_practice": None,
            "should_reengage": False,
        }

    confidence_scores = [
        clamp_confidence_score(int(_get_candidate_value(item, "confidence_score", 0) or 0))
        for item in stats
    ]
    knowledge_levels = [knowledge_level_from_confidence(score) for score in confidence_scores]
    last_practiced_values = [
        value
        for value in (
            _as_aware_datetime(_get_candidate_value(item, "last_practiced"))
            for item in stats
        )
        if value is not None
    ]

    average_confidence = round(sum(confidence_scores) / len(confidence_scores), 1)
    average_knowledge_level = round(sum(knowledge_levels) / len(knowledge_levels), 1)
    last_practiced = max(last_practiced_values) if last_practiced_values else None
    days_since_last_practice = (
        max(0, (checked_at.date() - last_practiced.date()).days)
        if last_practiced
        else None
    )
    level_delta = (
        round(average_knowledge_level - previous_average_knowledge_level, 1)
        if previous_average_knowledge_level is not None
        else None
    )

    return {
        "average_confidence": average_confidence,
        "average_knowledge_level": average_knowledge_level,
        "total_words_practiced": len(stats),
        "total_practice_sessions": sum(
            int(_get_candidate_value(item, "times_seen", 0) or 0)
            for item in stats
        ),
        "words_struggling": len([score for score in confidence_scores if score < 30]),
        "words_learning": len([score for score in confidence_scores if 30 <= score < 80]),
        "words_mastered": len([score for score in confidence_scores if score >= 80]),
        "trend": trend_from_delta(level_delta),
        "level_delta": level_delta or 0.0,
        "last_practiced": last_practiced,
        "days_since_last_practice": days_since_last_practice,
        "should_reengage": bool(days_since_last_practice is not None and days_since_last_practice >= 3),
    }
