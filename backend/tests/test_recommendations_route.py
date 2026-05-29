from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app.database import get_database_session
from app.database.models import (
    FlashcardEntity,
    MovieEntity,
    SubtitleEntity,
    UserWordStatisticsEntity,
)
from app.main import app
from app.routes import recommendations


def _make_engine(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'recommendations.db'}")
    SQLModel.metadata.create_all(engine)
    return engine


def _seed_recommendations_data(engine):
    validated_at = datetime.now(UTC)
    with Session(engine) as session:
        session.add(
            FlashcardEntity(
                word="hund",
                translation="dog",
                image_url="x",
                language="de",
                plural_form="Hunde",
            )
        )
        session.add(
            UserWordStatisticsEntity(
                user_id="u1",
                word="hund",
                language="de",
                confidence_score=80,
                times_seen=5,
            )
        )
        dog_movie = MovieEntity(imdb_id="ttdog", title="Dog Movie", year=2020)
        quantum_movie = MovieEntity(imdb_id="ttquantum", title="Quantum Movie", year=2021)
        session.add(dog_movie)
        session.add(quantum_movie)
        session.commit()
        session.refresh(dog_movie)
        session.refresh(quantum_movie)

        session.add_all(
            [
                SubtitleEntity(
                    movie_id=dog_movie.id,
                    language="de",
                    full_text="hunde hunde hunde hunde hunde spielen im park",
                    source="opensubtitles",
                    license="test",
                    validated_at=validated_at,
                ),
                SubtitleEntity(
                    movie_id=dog_movie.id,
                    language="de",
                    full_text="die hunde sind freundlich",
                    source="secondary",
                    license="test",
                    validated_at=validated_at,
                ),
                SubtitleEntity(
                    movie_id=quantum_movie.id,
                    language="de",
                    full_text="quantenphysik teilchen experiment labor",
                    source="opensubtitles",
                    license="test",
                    validated_at=validated_at,
                ),
            ]
        )
        session.commit()


def _session_override(engine):
    def _override():
        with Session(engine) as session:
            yield session

    return _override


def _client_with_seeded_engine(tmp_path, monkeypatch):
    engine = _make_engine(tmp_path)
    _seed_recommendations_data(engine)
    monkeypatch.setattr(recommendations, "_get_engine", lambda: engine)
    monkeypatch.setitem(app.dependency_overrides, get_database_session, _session_override(engine))
    recommendations._reset_cache()
    return TestClient(app)


def test_recommendations_rank_matching_dog_movie_first(tmp_path, monkeypatch):
    client = _client_with_seeded_engine(tmp_path, monkeypatch)

    response = client.get(
        "/api/movies/recommendations?language=de&limit=5",
        headers={"X-User-Id": "u1"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body
    assert body[0]["imdb_id"] == "ttdog"
    assert body[0]["title"] == "Dog Movie"
    assert body[0]["shared_vocab_count"] >= 1
    assert body[0]["subtitle_unique_word_count"] >= body[0]["shared_vocab_count"]
    assert body[0]["subtitle_token_count"] >= body[0]["subtitle_unique_word_count"]


def test_recommendations_empty_vocab_returns_empty_list(tmp_path, monkeypatch):
    client = _client_with_seeded_engine(tmp_path, monkeypatch)

    response = client.get(
        "/api/movies/recommendations?language=de&limit=5",
        headers={"X-User-Id": "empty-user"},
    )

    assert response.status_code == 200
    assert response.json() == []


def test_recommendations_require_user_id(tmp_path, monkeypatch):
    client = _client_with_seeded_engine(tmp_path, monkeypatch)

    response = client.get("/api/movies/recommendations?language=de&limit=5")

    assert response.status_code == 400
    assert response.json()["detail"] == "X-User-Id header required"


def test_movie_poster_redirects_to_safe_imdb_image(monkeypatch):
    recommendations._reset_poster_cache()
    calls = []

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "d": [
                    {
                        "id": "tt0050083",
                        "i": {
                            "imageUrl": "https://m.media-amazon.com/images/M/example.jpg",
                        },
                    }
                ]
            }

    def fake_get(url, *, headers, timeout):
        calls.append((url, headers, timeout))
        return FakeResponse()

    monkeypatch.setattr(recommendations.requests, "get", fake_get)
    client = TestClient(app)

    response = client.get("/api/movies/poster/tt0050083", follow_redirects=False)
    cached = client.get("/api/movies/poster/tt0050083", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"] == "https://m.media-amazon.com/images/M/example.jpg"
    assert response.headers["cache-control"] == "public, max-age=86400"
    assert cached.status_code == 302
    assert len(calls) == 1
    assert calls[0][0] == "https://v2.sg.media-imdb.com/suggestion/t/tt0050083.json"
    recommendations._reset_poster_cache()


def test_movie_poster_rejects_unsafe_redirect_hosts(monkeypatch):
    recommendations._reset_poster_cache()

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "d": [
                    {
                        "id": "tt0050083",
                        "i": {
                            "imageUrl": "https://attacker.example/poster.jpg",
                        },
                    }
                ]
            }

    monkeypatch.setattr(recommendations.requests, "get", lambda *args, **kwargs: FakeResponse())
    client = TestClient(app)

    response = client.get("/api/movies/poster/tt0050083", follow_redirects=False)

    assert response.status_code == 404
    assert response.json()["detail"] == "Movie poster not found"
    recommendations._reset_poster_cache()


def test_movie_poster_rejects_invalid_imdb_ids():
    recommendations._reset_poster_cache()
    client = TestClient(app)

    response = client.get("/api/movies/poster/not-an-imdb-id", follow_redirects=False)

    assert response.status_code == 404


def test_recommendations_cache_reset_requires_admin_token(tmp_path, monkeypatch):
    client = _client_with_seeded_engine(tmp_path, monkeypatch)
    admin_token = "x" * 32
    monkeypatch.setenv("MOVIE_RECOMMENDER_ADMIN_TOKEN", admin_token)

    forbidden = client.post("/api/movies/recommendations/cache/reset")
    assert forbidden.status_code == 403

    response = client.get(
        "/api/movies/recommendations?language=de&limit=5",
        headers={"X-User-Id": "u1"},
    )
    assert response.status_code == 200
    assert recommendations._cache is not None

    reset = client.post(
        "/api/movies/recommendations/cache/reset",
        headers={"X-Admin-Token": admin_token},
    )

    assert reset.status_code == 200
    assert reset.json() == {"status": "reset"}
    assert recommendations._cache is None

    repeated = client.post(
        "/api/movies/recommendations/cache/reset",
        headers={"X-Admin-Token": admin_token},
    )
    assert repeated.status_code == 429


def test_recommendations_cache_reset_rejects_weak_admin_token(tmp_path, monkeypatch):
    client = _client_with_seeded_engine(tmp_path, monkeypatch)
    monkeypatch.setenv("MOVIE_RECOMMENDER_ADMIN_TOKEN", "short-token")

    reset = client.post(
        "/api/movies/recommendations/cache/reset",
        headers={"X-Admin-Token": "short-token"},
    )

    assert reset.status_code == 403


def test_recommendations_aggregate_duplicate_subtitle_sources(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'aggregation.db'}")
    SQLModel.metadata.create_all(engine)
    validated_at = datetime.now(UTC)
    with Session(engine) as session:
        session.add(FlashcardEntity(word="bonuswort", translation="bonus", image_url="x", language="de"))
        session.add(
            UserWordStatisticsEntity(
                user_id="u1",
                word="bonuswort",
                language="de",
                confidence_score=100,
                times_seen=4,
            )
        )
        movie = MovieEntity(imdb_id="ttdupe", title="Dupe Movie", year=2022)
        session.add(movie)
        session.commit()
        session.refresh(movie)
        session.add_all(
            [
                SubtitleEntity(
                    movie_id=movie.id,
                    language="de",
                    full_text="allgemeiner text ohne zielwort",
                    source="a",
                    license="test",
                    validated_at=validated_at,
                ),
                SubtitleEntity(
                    movie_id=movie.id,
                    language="de",
                    full_text="bonuswort erscheint nur in der zweiten quelle",
                    source="b",
                    license="test",
                    validated_at=validated_at,
                ),
            ]
        )
        session.commit()

    monkeypatch.setattr(recommendations, "_get_engine", lambda: engine)
    monkeypatch.setitem(app.dependency_overrides, get_database_session, _session_override(engine))
    recommendations._reset_cache()
    client = TestClient(app)

    response = client.get(
        "/api/movies/recommendations?language=de&limit=5",
        headers={"X-User-Id": "u1"},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["imdb_id"] == "ttdupe"
    assert body[0]["sample_known_words"] == ["bonuswort"]


def test_recommendations_include_tiny_subtitle_stubs(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'tiny-stubs.db'}")
    SQLModel.metadata.create_all(engine)
    validated_at = datetime.now(UTC)
    with Session(engine) as session:
        session.add(FlashcardEntity(word="hund", translation="dog", image_url="x", language="de"))
        session.add(
            UserWordStatisticsEntity(
                user_id="u1",
                word="hund",
                language="de",
                confidence_score=100,
                times_seen=4,
            )
        )
        movie = MovieEntity(imdb_id="ttstub", title="Stub Movie", year=2024)
        session.add(movie)
        session.commit()
        session.refresh(movie)
        session.add(
            SubtitleEntity(
                movie_id=movie.id,
                language="de",
                full_text="hund hund katze baum",
                source="opensubtitles",
                license="test",
                validated_at=validated_at,
            )
        )
        session.commit()

    monkeypatch.setattr(recommendations, "_get_engine", lambda: engine)
    monkeypatch.setitem(app.dependency_overrides, get_database_session, _session_override(engine))
    recommendations._reset_cache()
    client = TestClient(app)

    response = client.get(
        "/api/movies/recommendations?language=de&limit=5",
        headers={"X-User-Id": "u1"},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["imdb_id"] == "ttstub"
    assert body[0]["score"] == 0.333333
    assert body[0]["shared_vocab_count"] == 1
    assert body[0]["subtitle_unique_word_count"] == 3
    assert body[0]["subtitle_token_count"] == 4
