"""Recommender ranks subtitles whose vocabulary best matches a user vocab dict."""

import pytest

from app.services.recommender import Recommender, RecommenderCache


@pytest.fixture
def cache():
    corpus = {
        ("de", "tt1"): "der hund läuft im park und bellt laut",
        ("de", "tt2"): "die quantenphysik beschreibt subatomare teilchen",
        ("de", "tt3"): "der hund spielt mit dem ball im garten",
    }
    metadata = {
        "tt1": {"title": "Hund1", "year": 2001},
        "tt2": {"title": "Physik", "year": 2010},
        "tt3": {"title": "Hund2", "year": 2003},
    }
    return RecommenderCache.from_corpus(corpus=corpus, metadata=metadata)


def test_ranks_doglike_films_first_for_dog_vocab(cache):
    user_vocab = {"hund": 0.6, "park": 0.2, "garten": 0.2}
    rec = Recommender(cache)
    results = rec.recommend(user_vocab=user_vocab, language="de", limit=3)
    imdb_order = [r["imdb_id"] for r in results]
    assert imdb_order[0] in {"tt1", "tt3"}
    assert imdb_order[-1] == "tt2"
    assert results[-1]["score"] == 0.0
    assert all(0.0 <= r["score"] <= 1.0 for r in results)
    assert all("sample_known_words" in r for r in results)
    assert all(r["user_vocab_count"] == 3 for r in results)


def test_empty_vocab_returns_empty(cache):
    rec = Recommender(cache)
    assert rec.recommend(user_vocab={}, language="de", limit=10) == []


def test_unknown_language_returns_empty(cache):
    rec = Recommender(cache)
    assert rec.recommend(user_vocab={"x": 1.0}, language="zh", limit=10) == []


def test_no_vocab_overlap_still_returns_ranked_zero_score_films(cache):
    rec = Recommender(cache)
    results = rec.recommend(user_vocab={"rakete": 1.0}, language="de", limit=10)

    assert [result["imdb_id"] for result in results] == ["tt1", "tt2", "tt3"]
    assert all(result["score"] == 0.0 for result in results)
    assert all(result["shared_vocab_count"] == 0 for result in results)
    assert all(result["sample_known_words"] == [] for result in results)


def test_score_is_distinct_subtitle_vocabulary_coverage_not_relative_rank():
    cache = RecommenderCache.from_corpus(
        corpus={
            ("de", "ttcoverage"): "a hund hund katze baum",
        },
        metadata={
            "ttcoverage": {"title": "Coverage", "year": 2024},
        },
    )

    rec = Recommender(cache)
    results = rec.recommend(user_vocab={"hund": 1.0}, language="de", limit=1)

    assert results[0]["score"] == 0.333333
    assert results[0]["user_vocab_count"] == 1
    assert results[0]["shared_vocab_count"] == 1
    assert results[0]["subtitle_unique_word_count"] == 3
    assert results[0]["subtitle_token_count"] == 5


def test_honors_explicit_document_token_minimum_when_caller_sets_one():
    cache = RecommenderCache.from_corpus(
        corpus={
            ("de", "ttstub"): "hund hund katze baum",
            ("de", "ttmovie"): " ".join(["hund", *["katze"] * 99]),
        },
        metadata={
            "ttstub": {"title": "Stub", "year": 2024},
            "ttmovie": {"title": "Movie", "year": 2024},
        },
        min_document_tokens=100,
    )

    rec = Recommender(cache)
    results = rec.recommend(user_vocab={"hund": 1.0}, language="de", limit=10)

    assert [result["imdb_id"] for result in results] == ["ttmovie"]
    assert results[0]["shared_vocab_count"] == 1
    assert results[0]["subtitle_unique_word_count"] == 2
    assert results[0]["subtitle_token_count"] == 100


def test_matches_inflected_italian_verb_forms_by_root():
    cache = RecommenderCache.from_corpus(
        corpus={
            ("it", "ttgo"): "sono andato al mercato andai via e andrò a casa",
            ("it", "ttfood"): "mangio pane fresco con olio",
        },
        metadata={
            "ttgo": {"title": "Viaggio", "year": 1999},
            "ttfood": {"title": "Cena", "year": 2000},
        },
    )

    rec = Recommender(cache)
    results = rec.recommend(user_vocab={"andare": 1.0}, language="it", limit=2)

    assert [result["imdb_id"] for result in results] == ["ttgo", "ttfood"]
    assert results[0]["shared_vocab_count"] == 1
    assert results[0]["sample_known_words"] == ["andare"]
    assert results[1]["score"] == 0.0
    assert results[1]["shared_vocab_count"] == 0
