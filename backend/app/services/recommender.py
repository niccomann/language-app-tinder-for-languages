"""Classical subtitle recommender using BM25 retrieval and TF-IDF re-ranking."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

import numpy as np
from rank_bm25 import BM25Okapi
from sklearn.feature_extraction.text import TfidfVectorizer

try:
    import stopwordsiso
except ImportError:  # pragma: no cover - dependency is declared for runtime
    stopwordsiso = None


SUPPORTED_LANGUAGES = ("de", "fr", "it", "en")

_WORD_RE = re.compile(r"\w+", re.UNICODE)
_QUERY_REPEAT_CAP = 8
_SAMPLE_WORD_LIMIT = 8


@dataclass(frozen=True)
class _LanguageIndex:
    imdb_ids: tuple[str, ...]
    tokenized_docs: tuple[tuple[str, ...], ...]
    document_vocab: tuple[frozenset[str], ...]
    metadata: dict[str, dict[str, Any]]
    bm25: BM25Okapi | None
    tfidf_vectorizer: TfidfVectorizer | None
    tfidf_matrix: Any


@dataclass(frozen=True)
class RecommenderCache:
    """In-memory per-language recommender indices."""

    languages: dict[str, _LanguageIndex]

    @classmethod
    def from_corpus(
        cls,
        *,
        corpus: dict[tuple[str, str], str],
        metadata: dict[str, dict],
    ) -> "RecommenderCache":
        grouped: dict[str, list[tuple[str, tuple[str, ...]]]] = {}
        for (language, imdb_id), text in corpus.items():
            if language not in SUPPORTED_LANGUAGES:
                continue

            tokens = tuple(tokenize(text, language=language))
            if not tokens:
                continue

            grouped.setdefault(language, []).append((imdb_id, tokens))

        languages: dict[str, _LanguageIndex] = {}
        for language, documents in grouped.items():
            imdb_ids = tuple(imdb_id for imdb_id, _tokens in documents)
            tokenized_docs = tuple(tokens for _imdb_id, tokens in documents)
            document_vocab = tuple(frozenset(tokens) for tokens in tokenized_docs)
            bm25 = BM25Okapi([list(tokens) for tokens in tokenized_docs])

            vectorizer = TfidfVectorizer(
                analyzer=lambda doc_tokens: doc_tokens,
                lowercase=False,
                token_pattern=None,
            )
            tfidf_matrix = vectorizer.fit_transform([list(tokens) for tokens in tokenized_docs])

            languages[language] = _LanguageIndex(
                imdb_ids=imdb_ids,
                tokenized_docs=tokenized_docs,
                document_vocab=document_vocab,
                metadata=metadata,
                bm25=bm25,
                tfidf_vectorizer=vectorizer,
                tfidf_matrix=tfidf_matrix,
            )

        return cls(languages=languages)


class Recommender:
    """Rank subtitles by overlap with a weighted user vocabulary."""

    def __init__(self, cache: RecommenderCache):
        self.cache = cache

    def recommend(
        self,
        *,
        user_vocab: dict[str, float],
        language: str,
        limit: int,
    ) -> list[dict[str, Any]]:
        if not user_vocab or limit <= 0:
            return []

        index = self.cache.languages.get(language)
        if index is None or not index.imdb_ids:
            return []

        query_weights = _normalize_query_vocab(user_vocab, language=language)
        if not query_weights:
            return []

        query_terms = _weighted_query_terms(query_weights)
        if not query_terms:
            return []

        bm25_scores = _normalize_scores(index.bm25.get_scores(query_terms) if index.bm25 else [])
        query_vector = index.tfidf_vectorizer.transform([query_terms])
        tfidf_scores = np.asarray((index.tfidf_matrix @ query_vector.T).toarray()).ravel()
        tfidf_scores = np.clip(tfidf_scores, 0.0, 1.0)

        combined = np.clip((0.55 * bm25_scores) + (0.45 * tfidf_scores), 0.0, 1.0)
        if not np.any(combined > 0.0):
            return []
        query_vocab = frozenset(query_weights)

        ranked_positions = sorted(
            range(len(index.imdb_ids)),
            key=lambda position: (-combined[position], index.imdb_ids[position]),
        )

        results: list[dict[str, Any]] = []
        for position in ranked_positions[:limit]:
            imdb_id = index.imdb_ids[position]
            known_words = sorted(index.document_vocab[position] & query_vocab)
            item_metadata = index.metadata.get(imdb_id, {})
            results.append(
                {
                    "imdb_id": imdb_id,
                    "title": item_metadata.get("title"),
                    "year": item_metadata.get("year"),
                    "score": round(float(combined[position]), 6),
                    "shared_vocab_count": len(known_words),
                    "sample_known_words": known_words[:_SAMPLE_WORD_LIMIT],
                }
            )

        return results


def tokenize(text: str, *, language: str) -> list[str]:
    stopwords = _stopwords_for(language)
    tokens: list[str] = []
    for match in _WORD_RE.finditer(text or ""):
        token = match.group(0).casefold()
        if len(token) <= 1 or token in stopwords:
            continue
        tokens.append(token)
    return tokens


def _stopwords_for(language: str) -> frozenset[str]:
    if stopwordsiso is None:
        return frozenset()
    try:
        return frozenset(word.casefold() for word in stopwordsiso.stopwords(language))
    except Exception:
        return frozenset()


def _normalize_query_vocab(user_vocab: dict[str, float], *, language: str) -> dict[str, float]:
    query_weights: dict[str, float] = {}
    for raw_word, raw_weight in user_vocab.items():
        try:
            weight = float(raw_weight)
        except (TypeError, ValueError):
            continue
        if weight <= 0:
            continue

        tokens = tokenize(str(raw_word), language=language)
        for token in tokens:
            query_weights[token] = query_weights.get(token, 0.0) + weight

    return query_weights


def _weighted_query_terms(query_weights: dict[str, float]) -> list[str]:
    max_weight = max(query_weights.values(), default=0.0)
    if max_weight <= 0:
        return []

    query_terms: list[str] = []
    for word, weight in sorted(query_weights.items()):
        repeats = max(1, round((weight / max_weight) * _QUERY_REPEAT_CAP))
        query_terms.extend([word] * min(repeats, _QUERY_REPEAT_CAP))
    return query_terms


def _normalize_scores(scores: Any) -> np.ndarray:
    values = np.asarray(scores, dtype=float)
    if values.size == 0:
        return values

    values = np.nan_to_num(values, nan=0.0, posinf=0.0, neginf=0.0)
    values = np.maximum(values, 0.0)
    max_score = float(values.max(initial=0.0))
    if max_score <= 0.0:
        return np.zeros_like(values, dtype=float)
    return np.clip(values / max_score, 0.0, 1.0)
