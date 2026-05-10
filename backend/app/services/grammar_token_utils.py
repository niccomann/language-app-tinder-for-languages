import hashlib
import json
from typing import List, Optional


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


def sentence_challenge_sort_key(
    challenge,
    profile_part_of_speech: Optional[List[str]],
) -> tuple[int, int]:
    focus = (challenge.grammar_focus or "").casefold()
    preferred_focus_terms = {
        part.casefold().replace("_", " ").replace("-", " ")
        for part in (profile_part_of_speech or [])
        if part.strip()
    }
    focus_match = any(term in focus for term in preferred_focus_terms)
    return (0 if focus_match else 1, challenge.id or 0)
