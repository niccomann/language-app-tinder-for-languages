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
    assert all(0.0 <= r["score"] <= 1.0 for r in results)
    assert all("sample_known_words" in r for r in results)


def test_empty_vocab_returns_empty(cache):
    rec = Recommender(cache)
    assert rec.recommend(user_vocab={}, language="de", limit=10) == []


def test_unknown_language_returns_empty(cache):
    rec = Recommender(cache)
    assert rec.recommend(user_vocab={"x": 1.0}, language="zh", limit=10) == []
