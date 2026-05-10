from collections import OrderedDict
from collections.abc import Callable, Iterable, Sequence
from typing import Any

from app.models import LearningPreferenceProfile


FUNCTIONAL_CATEGORIES = {"function_words", "grammar"}
FUNCTIONAL_PARTS_OF_SPEECH = {
    "article",
    "pronoun",
    "preposition",
    "conjunction",
    "particle",
    "adverb",
}

DOMAIN_ALIASES = {
    "travel": {"travel", "transport", "places", "shopping", "food", "culinary", "city", "everyday"},
    "work": {"work", "business", "administration", "communication"},
    "study": {"study", "school", "culture", "history", "language", "learning"},
    "technology": {"technology", "software", "data", "communication"},
    "current-life": {"everyday", "travel", "technology", "communication"},
    "timeless": {"home", "people", "family", "nature", "objects", "time"},
    "culture-history": {"culture", "history", "school", "language"},
}

STYLE_FREQUENCY_HINTS = {
    "modern": {"very_common", "common"},
    "current-life": {"very_common", "common"},
    "classic": {"useful"},
    "timeless": {"very_common", "common", "useful"},
    "balanced": {"very_common", "common", "useful"},
}

STYLE_LEVEL_HINTS = {
    "modern": {"A1", "A2", "B1"},
    "current-life": {"A1", "A2", "B1"},
    "classic": {"B1", "B2", "C1"},
    "timeless": {"A1", "A2", "B1"},
    "balanced": {"A1", "A2", "B1", "B2"},
}


def normalize_label(value: Any) -> str:
    return str(value or "").strip().casefold().replace(" ", "_").replace("-", "_")


def expanded_domain_targets(domains: Iterable[str]) -> set[str]:
    targets: set[str] = set()
    for domain in domains:
        normalized = normalize_label(domain)
        targets.add(normalized)
        targets.update(DOMAIN_ALIASES.get(normalized, set()))
    return targets


def card_values(card: Any) -> set[str]:
    return {
        normalize_label(getattr(card, "category", "")),
        normalize_label(getattr(card, "thematic_domain", "")),
    } - {""}


def card_matches_domains(card: Any, profile: LearningPreferenceProfile) -> bool:
    targets = expanded_domain_targets(profile.domains)
    return bool(targets and card_values(card) & targets)


def is_functional_card(card: Any) -> bool:
    category = normalize_label(getattr(card, "category", ""))
    part_of_speech = normalize_label(getattr(card, "part_of_speech", ""))
    return category in FUNCTIONAL_CATEGORIES or part_of_speech in FUNCTIONAL_PARTS_OF_SPEECH


def style_matches(card: Any, profile: LearningPreferenceProfile) -> bool:
    frequency = str(getattr(card, "frequency_band", "") or "")
    cefr_level = str(getattr(card, "cefr_level", "") or "")
    for style in profile.wordStyles:
        normalized = normalize_label(style)
        if frequency in STYLE_FREQUENCY_HINTS.get(normalized, set()):
            return True
        if cefr_level in STYLE_LEVEL_HINTS.get(normalized, set()):
            return True
    return False


def tone_matches(card: Any, profile: LearningPreferenceProfile) -> bool:
    register = normalize_label(getattr(card, "language_register", ""))
    selected_tones = {normalize_label(tone) for tone in profile.tones}
    if not register or register == "neutral":
        return False
    if register in selected_tones:
        return True
    if register == "informal" and selected_tones & {"friendly", "casual"}:
        return True
    if register == "formal" and selected_tones & {"formal", "technical"}:
        return True
    return False


def card_preference_score(card: Any, profile: LearningPreferenceProfile) -> int:
    score = 0
    if card_matches_domains(card, profile):
        score += 8
    if tone_matches(card, profile):
        score += 3
    if style_matches(card, profile):
        score += 2

    part_of_speech = normalize_label(getattr(card, "part_of_speech", ""))
    preferred_parts = {normalize_label(part) for part in profile.preferredPartsOfSpeech}
    if part_of_speech and part_of_speech in preferred_parts:
        score += 2

    return score


def has_active_profile(profile: LearningPreferenceProfile) -> bool:
    return bool(
        profile.domains
        or profile.tones
        or profile.wordStyles
        or profile.preferredPartsOfSpeech
        or profile.exerciseBias
        or profile.difficultyMode != "adaptive"
        or profile.semanticDiversityMode != "balanced"
    )


def _candidate_id(candidate_item: tuple[Any, Any, Any]) -> int:
    card = candidate_item[1]
    return int(getattr(card, "id", 0) or id(card))


def _take_unique(
    source: Sequence[tuple[Any, Any, Any]],
    count: int,
    selected_ids: set[int],
) -> list[tuple[Any, Any, Any]]:
    selected: list[tuple[Any, Any, Any]] = []
    for item in source:
        item_id = _candidate_id(item)
        if item_id in selected_ids:
            continue
        selected.append(item)
        selected_ids.add(item_id)
        if len(selected) >= count:
            break
    return selected


def semantic_group_key(card: Any) -> str:
    return (
        normalize_label(getattr(card, "thematic_domain", ""))
        or normalize_label(getattr(card, "category", ""))
        or normalize_label(getattr(card, "part_of_speech", ""))
        or "ungrouped"
    )


def _spread_semantic_groups(
    source: Sequence[tuple[Any, Any, Any]],
) -> list[tuple[Any, Any, Any]]:
    grouped: OrderedDict[str, list[tuple[Any, Any, Any]]] = OrderedDict()
    for item in source:
        grouped.setdefault(semantic_group_key(item[1]), []).append(item)

    spread: list[tuple[Any, Any, Any]] = []
    while grouped:
        for group_key in list(grouped.keys()):
            spread.append(grouped[group_key].pop(0))
            if not grouped[group_key]:
                del grouped[group_key]
    return spread


def _cluster_semantic_groups(
    source: Sequence[tuple[Any, Any, Any]],
) -> list[tuple[Any, Any, Any]]:
    grouped: OrderedDict[str, list[tuple[Any, Any, Any]]] = OrderedDict()
    for item in source:
        grouped.setdefault(semantic_group_key(item[1]), []).append(item)
    return [item for group_items in grouped.values() for item in group_items]


def order_by_semantic_diversity_mode(
    source: Sequence[tuple[Any, Any, Any]],
    mode: str,
) -> list[tuple[Any, Any, Any]]:
    normalized_mode = normalize_label(mode)
    if normalized_mode == "wide":
        return _spread_semantic_groups(source)
    if normalized_mode == "precise":
        return _cluster_semantic_groups(source)
    return list(source)


def select_preference_weighted_candidates(
    candidates: Sequence[tuple[Any, Any, Any]],
    profile: LearningPreferenceProfile,
    limit: int,
    adaptive_sort_key: Callable[[Any], tuple[int, float, int, int]],
) -> list[tuple[Any, Any, Any]]:
    if not has_active_profile(profile):
        return sorted(candidates, key=lambda item: adaptive_sort_key(item[0]))[:limit]

    def preference_sort_key(item: tuple[Any, Any, Any]) -> tuple[int, tuple[int, float, int, int]]:
        candidate, card, _stats = item
        return (-card_preference_score(card, profile), adaptive_sort_key(candidate))

    preferred = sorted(
        [
            item
            for item in candidates
            if not is_functional_card(item[1])
            and (card_matches_domains(item[1], profile) or card_preference_score(item[1], profile) > 0)
        ],
        key=preference_sort_key,
    )
    functional = sorted(
        [item for item in candidates if is_functional_card(item[1])],
        key=preference_sort_key,
    )
    exploration = sorted(
        [
            item
            for item in candidates
            if not is_functional_card(item[1])
            and not card_matches_domains(item[1], profile)
            and card_preference_score(item[1], profile) == 0
        ],
        key=lambda item: adaptive_sort_key(item[0]),
    )
    preferred = order_by_semantic_diversity_mode(preferred, profile.semanticDiversityMode)
    functional = order_by_semantic_diversity_mode(functional, profile.semanticDiversityMode)
    exploration = order_by_semantic_diversity_mode(exploration, profile.semanticDiversityMode)

    functional_count = min(len(functional), max(1, round(limit * 0.18))) if functional else 0
    exploration_count = min(len(exploration), round(limit * 0.08)) if exploration else 0
    preferred_count = max(0, limit - functional_count - exploration_count)

    selected_ids: set[int] = set()
    selected: list[tuple[Any, Any, Any]] = []
    selected.extend(_take_unique(preferred, preferred_count, selected_ids))
    selected.extend(_take_unique(functional, functional_count, selected_ids))
    selected.extend(_take_unique(exploration, exploration_count, selected_ids))

    if len(selected) < limit:
        fallback = sorted(candidates, key=preference_sort_key)
        fallback = order_by_semantic_diversity_mode(fallback, profile.semanticDiversityMode)
        selected.extend(_take_unique(fallback, limit - len(selected), selected_ids))

    return selected[:limit]
