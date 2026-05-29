"""Subtitle recommender using coverage scoring with BM25/TF-IDF tie-breaking."""

from __future__ import annotations

import re
import unicodedata
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
LexicalAliases = dict[str, dict[str, str]]


@dataclass(frozen=True)
class _LanguageIndex:
    imdb_ids: tuple[str, ...]
    tokenized_docs: tuple[tuple[str, ...], ...]
    document_word_counts: tuple[int, ...]
    document_vocab: tuple[frozenset[str], ...]
    metadata: dict[str, dict[str, Any]]
    lexical_aliases: dict[str, str]
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
        lexical_aliases: LexicalAliases | None = None,
        min_document_tokens: int = 1,
        min_unique_tokens: int = 1,
    ) -> "RecommenderCache":
        normalized_aliases = _normalize_lexical_aliases(lexical_aliases or {})
        grouped: dict[str, list[tuple[str, tuple[str, ...], int]]] = {}
        for (language, imdb_id), text in corpus.items():
            if language not in SUPPORTED_LANGUAGES:
                continue

            raw_word_count = _raw_word_count(text)
            tokens = tuple(
                tokenize(
                    text,
                    language=language,
                    lexical_aliases=normalized_aliases.get(language),
                )
            )
            if len(tokens) < min_document_tokens or len(frozenset(tokens)) < min_unique_tokens:
                continue

            grouped.setdefault(language, []).append((imdb_id, tokens, raw_word_count))

        languages: dict[str, _LanguageIndex] = {}
        for language, documents in grouped.items():
            imdb_ids = tuple(imdb_id for imdb_id, _tokens, _raw_word_count in documents)
            tokenized_docs = tuple(tokens for _imdb_id, tokens, _raw_word_count in documents)
            document_word_counts = tuple(raw_word_count for _imdb_id, _tokens, raw_word_count in documents)
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
                document_word_counts=document_word_counts,
                document_vocab=document_vocab,
                metadata=metadata,
                lexical_aliases=normalized_aliases.get(language, {}),
                bm25=bm25,
                tfidf_vectorizer=vectorizer,
                tfidf_matrix=tfidf_matrix,
            )

        return cls(languages=languages)


class Recommender:
    """Rank subtitles by normalized word coverage for a weighted user vocabulary."""

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

        query_weights, query_labels = _normalize_query_vocab(
            user_vocab,
            language=language,
            lexical_aliases=index.lexical_aliases,
        )
        if not query_weights:
            return []

        query_terms = _weighted_query_terms(query_weights)
        if not query_terms:
            return []

        bm25_scores = _normalize_scores(index.bm25.get_scores(query_terms) if index.bm25 else [])
        query_vector = index.tfidf_vectorizer.transform([query_terms])
        tfidf_scores = np.asarray((index.tfidf_matrix @ query_vector.T).toarray()).ravel()
        tfidf_scores = np.clip(tfidf_scores, 0.0, 1.0)

        query_vocab = frozenset(query_weights)
        user_vocab_count = len(query_vocab)
        retrieval_scores = np.clip((0.55 * bm25_scores) + (0.45 * tfidf_scores), 0.0, 1.0)
        known_word_keys = tuple(
            sorted(document_vocab & query_vocab)
            for document_vocab in index.document_vocab
        )
        coverage_scores = tuple(
            (len(known_keys) / len(document_vocab)) if document_vocab else 0.0
            for known_keys, document_vocab in zip(known_word_keys, index.document_vocab)
        )

        ranked_positions = sorted(
            range(len(index.imdb_ids)),
            key=lambda position: (
                -coverage_scores[position],
                -retrieval_scores[position],
                index.imdb_ids[position],
            ),
        )

        results: list[dict[str, Any]] = []
        for position in ranked_positions[:limit]:
            imdb_id = index.imdb_ids[position]
            known_words = _known_word_labels(
                list(known_word_keys[position]),
                query_labels,
            )
            item_metadata = index.metadata.get(imdb_id, {})
            results.append(
                {
                    "imdb_id": imdb_id,
                    "title": item_metadata.get("title"),
                    "year": item_metadata.get("year"),
                    "score": round(float(coverage_scores[position]), 6),
                    "user_vocab_count": user_vocab_count,
                    "shared_vocab_count": len(known_words),
                    "subtitle_unique_word_count": len(index.document_vocab[position]),
                    "subtitle_token_count": index.document_word_counts[position],
                    "sample_known_words": known_words[:_SAMPLE_WORD_LIMIT],
                }
            )

        return results


def tokenize(
    text: str,
    *,
    language: str,
    lexical_aliases: dict[str, str] | None = None,
) -> list[str]:
    stopwords = _stopwords_for(language)
    tokens: list[str] = []
    for match in _WORD_RE.finditer(text or ""):
        token = _surface_key(match.group(0))
        if len(token) <= 1 or token in stopwords:
            continue
        tokens.append(_lexical_key(token, language=language, lexical_aliases=lexical_aliases))
    return tokens


def _raw_word_count(text: str) -> int:
    return sum(1 for _match in _WORD_RE.finditer(text or ""))


def _stopwords_for(language: str) -> frozenset[str]:
    if stopwordsiso is None:
        return frozenset()
    try:
        return frozenset(_surface_key(word) for word in stopwordsiso.stopwords(language))
    except Exception:
        return frozenset()


def _normalize_query_vocab(
    user_vocab: dict[str, float],
    *,
    language: str,
    lexical_aliases: dict[str, str] | None = None,
) -> tuple[dict[str, float], dict[str, list[str]]]:
    query_weights: dict[str, float] = {}
    query_labels: dict[str, list[str]] = {}
    for raw_word, raw_weight in user_vocab.items():
        try:
            weight = float(raw_weight)
        except (TypeError, ValueError):
            continue
        if weight <= 0:
            continue

        raw_label = str(raw_word)
        tokens = tokenize(raw_label, language=language, lexical_aliases=lexical_aliases)
        for token in tokens:
            query_weights[token] = query_weights.get(token, 0.0) + weight
            labels = query_labels.setdefault(token, [])
            if raw_label not in labels:
                labels.append(raw_label)

    return query_weights, query_labels


def _surface_key(text: str) -> str:
    casefolded = str(text or "").casefold()
    normalized = unicodedata.normalize("NFKD", casefolded)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def _normalize_lexical_aliases(aliases_by_language: LexicalAliases) -> LexicalAliases:
    normalized: LexicalAliases = {}
    for language, aliases in aliases_by_language.items():
        language_aliases: dict[str, str] = {}
        for surface, lemma in aliases.items():
            surface_key = _surface_key(surface)
            lemma_key = _stem_token(_surface_key(lemma), language=language)
            if surface_key and lemma_key:
                language_aliases[surface_key] = lemma_key
        if language_aliases:
            normalized[language] = language_aliases
    return normalized


def _lexical_key(
    token: str,
    *,
    language: str,
    lexical_aliases: dict[str, str] | None,
) -> str:
    if lexical_aliases and token in lexical_aliases:
        return lexical_aliases[token]
    return _stem_token(token, language=language)


def _stem_token(token: str, *, language: str) -> str:
    if language == "it":
        return _italian_stem(token)
    if language == "fr":
        return _suffix_stem(
            token,
            (
                "eraient", "erions", "eriez", "aient", "ions", "iez",
                "ees", "aux", "euse", "euses", "ment", "es", "ee", "er",
                "ir", "re", "s", "e",
            ),
            min_length=5,
        )
    if language == "en":
        return _suffix_stem(
            token,
            ("ing", "edly", "ed", "ies", "es", "s"),
            min_length=5,
        )
    return token


def _italian_stem(token: str) -> str:
    if token.startswith("andr") and len(token) > 4:
        return "and"
    return _suffix_stem(
        token,
        (
            "erebbero", "irebbero", "arebbero", "eremmo", "iremmo", "aremmo",
            "ereste", "ireste", "areste", "eranno", "iranno", "aranno",
            "erai", "irai", "arai", "ero", "iro", "aro", "erei", "irei",
            "arei", "ato", "ata", "ati", "ate", "uto", "uta", "uti", "ute",
            "ito", "ita", "iti", "ite", "are", "ere", "ire", "ai",
        ),
        min_length=5,
    )


def _suffix_stem(token: str, suffixes: tuple[str, ...], *, min_length: int) -> str:
    for suffix in suffixes:
        if token.endswith(suffix) and len(token) - len(suffix) >= min_length - 2:
            return token[: -len(suffix)]
    return token


def _known_word_labels(keys: list[str], query_labels: dict[str, list[str]]) -> list[str]:
    known_words: list[str] = []
    seen: set[str] = set()
    for key in keys:
        for label in query_labels.get(key, [key]):
            if label in seen:
                continue
            seen.add(label)
            known_words.append(label)
    return sorted(known_words)


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
