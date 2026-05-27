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
                    full_text="hund hund hund hund hund spielt im park",
                    source="opensubtitles",
                    license="test",
                    validated_at=validated_at,
                ),
                SubtitleEntity(
                    movie_id=dog_movie.id,
                    language="de",
                    full_text="der hund ist freundlich",
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
