from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select

from app.database import get_database_session
from app.database.models import FlashcardEntity, UserWordStatisticsEntity
from app.main import app


def _make_engine(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'user-context.db'}")
    SQLModel.metadata.create_all(engine)
    return engine


def _session_override(engine):
    def _override():
        with Session(engine) as session:
            yield session

    return _override


def _client_for_engine(engine, monkeypatch):
    monkeypatch.setitem(app.dependency_overrides, get_database_session, _session_override(engine))
    return TestClient(app)


def test_statistics_update_uses_header_user_when_body_omits_user_id(tmp_path, monkeypatch):
    engine = _make_engine(tmp_path)
    client = _client_for_engine(engine, monkeypatch)

    response = client.post(
        "/api/statistics/update",
        headers={"X-User-Id": "header-user"},
        json={"word": "hund", "language": "de", "correct": True},
    )

    assert response.status_code == 200

    header_stats = client.get(
        "/api/statistics/all?language=de",
        headers={"X-User-Id": "header-user"},
    )
    legacy_stats = client.get("/api/statistics/all?language=de&user_id=default_user")

    assert [item["word"] for item in header_stats.json()] == ["hund"]
    assert legacy_stats.json() == []


def test_adaptive_cards_use_header_user_stats_when_query_omits_user_id(tmp_path, monkeypatch):
    engine = _make_engine(tmp_path)
    validated_at = datetime.now(UTC)
    with Session(engine) as session:
        session.add_all(
            [
                FlashcardEntity(word="stark", translation="strong", image_url="", language="zz"),
                FlashcardEntity(word="neu", translation="new", image_url="", language="zz"),
                UserWordStatisticsEntity(
                    user_id="header-user",
                    word="stark",
                    language="zz",
                    confidence_score=47,
                    times_seen=3,
                    times_correct=2,
                    times_incorrect=1,
                    last_practiced=validated_at,
                ),
            ]
        )
        session.commit()

    client = _client_for_engine(engine, monkeypatch)

    response = client.get(
        "/api/cards/adaptive?language=zz&limit=10",
        headers={"X-User-Id": "header-user"},
    )

    assert response.status_code == 200
    cards_by_word = {card["word"]: card for card in response.json()}
    assert cards_by_word["stark"]["confidence_score"] == 47
    assert cards_by_word["stark"]["times_seen"] == 3


def test_adaptive_query_uses_header_user_stats_when_body_omits_user_id(tmp_path, monkeypatch):
    engine = _make_engine(tmp_path)
    with Session(engine) as session:
        session.add_all(
            [
                FlashcardEntity(word="filmwort", translation="movie word", image_url="", language="zz"),
                UserWordStatisticsEntity(
                    user_id="header-user",
                    word="filmwort",
                    language="zz",
                    confidence_score=88,
                    times_seen=6,
                    times_correct=6,
                    times_incorrect=0,
                ),
            ]
        )
        session.commit()

    client = _client_for_engine(engine, monkeypatch)

    response = client.post(
        "/api/cards/adaptive/query",
        headers={"X-User-Id": "header-user"},
        json={"language": "zz", "limit": 10},
    )

    assert response.status_code == 200
    assert response.json()[0]["word"] == "filmwort"
    assert response.json()[0]["confidence_score"] == 88
