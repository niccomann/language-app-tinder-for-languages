from datetime import datetime
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
