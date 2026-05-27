from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

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


def _client_with_seeded_engine(tmp_path, monkeypatch):
    engine = _make_engine(tmp_path)
    _seed_recommendations_data(engine)
    monkeypatch.setattr(recommendations, "_get_engine", lambda: engine)
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
