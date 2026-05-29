from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from app.database.models import FeedbackEntity
from app.main import app
from app.services import feedback_service


client = TestClient(app)


def _make_engine(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'feedback.db'}")
    SQLModel.metadata.create_all(engine)
    return engine


def _created_at(offset_ms: int) -> datetime:
    return datetime(2026, 1, 1, tzinfo=UTC) + timedelta(milliseconds=offset_ms)


def test_submit_feedback_stores_optional_persona(monkeypatch):
    saved = {}

    def fake_save_feedback(**kwargs):
        saved.update(kwargs)
        return {"id": "fb-1", "created_at": 1710000000000}

    monkeypatch.setattr("app.routes.feedback.save_feedback", fake_save_feedback)

    response = client.post(
        "/api/feedback",
        json={
            "message": "Great app",
            "sentiment": "like",
            "nickname": "Nico",
            "age": 34,
            "profession": "scientific",
            "gender": "undisclosed",
            "native_language": "it",
            "target_level": "b1",
            "learning_motivation": "Movies",
        },
    )

    assert response.status_code == 200
    assert saved["persona"] == {
        "nickname": "Nico",
        "age": 34,
        "profession": "scientific",
        "gender": "undisclosed",
        "native_language": "it",
        "target_level": "b1",
        "learning_motivation": "Movies",
    }


def test_save_feedback_writes_to_database(monkeypatch, tmp_path):
    monkeypatch.setenv("ENV", "prod")
    engine = _make_engine(tmp_path)
    monkeypatch.setattr(feedback_service, "_db_engine", lambda: engine, raising=False)

    item = feedback_service.save_feedback(
        message="Great app",
        sentiment="like",
        source_url="https://customizeyourlingua.com/learn",
        persona={"age": 34, "profession": "scientific"},
    )

    assert item["storage"] == "database"
    assert item["message"] == "Great app"
    assert item["persona"] == {"age": 34, "profession": "scientific"}
    with Session(engine) as session:
        saved = session.get(FeedbackEntity, 1)
    assert saved is not None
    assert saved.external_id == item["id"]
    assert saved.message == "Great app"


def test_list_feedback_reads_database_history(monkeypatch, tmp_path):
    monkeypatch.setenv("ENV", "dev")
    engine = _make_engine(tmp_path)
    monkeypatch.setattr(feedback_service, "_db_engine", lambda: engine, raising=False)
    with Session(engine) as session:
        session.add(
            FeedbackEntity(
                external_id="old",
                created_at=_created_at(1000),
                updated_at=_created_at(1000),
                message="Older feedback",
                sentiment="neutral",
            )
        )
        session.add(
            FeedbackEntity(
                external_id="new",
                created_at=_created_at(2000),
                updated_at=_created_at(2000),
                message="Newer feedback",
                sentiment="like",
                source_url="https://customizeyourlingua.com/learn",
                persona_data={"age": 29, "profession": "humanist"},
            )
        )
        session.commit()

    response = client.get("/api/feedback?limit=10")

    assert response.status_code == 200
    body = response.json()
    assert [item["id"] for item in body["items"]] == ["new", "old"]
    assert body["items"][0]["persona"] == {"age": 29, "profession": "humanist"}
    assert body["items"][0]["source_url"] == "https://customizeyourlingua.com/learn"


def test_list_feedback_caps_limit_for_database_rows(monkeypatch, tmp_path):
    monkeypatch.setenv("ENV", "dev")
    engine = _make_engine(tmp_path)
    monkeypatch.setattr(feedback_service, "_db_engine", lambda: engine, raising=False)
    with Session(engine) as session:
        for i in range(150):
            session.add(
                FeedbackEntity(
                    external_id=f"fb-{i}",
                    created_at=_created_at(i),
                    updated_at=_created_at(i),
                    message=f"message {i}",
                )
            )
        session.commit()

    response = client.get("/api/feedback?limit=999")

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 100
    assert items[0]["id"] == "fb-149"
    assert items[-1]["id"] == "fb-50"


def test_list_feedback_falls_back_to_local_dev_history_when_database_fails(monkeypatch, tmp_path):
    local_path = tmp_path / "feedback.jsonl"
    local_path.write_text(
        json.dumps(
            {
                "id": "local-feedback",
                "created_at": 2000,
                "created_at_iso": "2026-01-01T00:00:02+00:00",
                "message": "Local fallback history",
                "sentiment": "neutral",
                "persona": {"nickname": "local", "profession": ""},
            }
        )
        + "\nnot-json\n"
        + json.dumps({"id": "missing-message", "created_at": 1000})
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("ENV", "dev")
    monkeypatch.setenv("FEEDBACK_LOCAL_DIR", str(tmp_path))
    monkeypatch.setattr(
        feedback_service,
        "_db_engine",
        lambda: (_ for _ in ()).throw(RuntimeError("no local database")),
        raising=False,
    )

    response = client.get("/api/feedback?limit=10")

    assert response.status_code == 200
    assert response.json()["items"] == [
        {
            "id": "local-feedback",
            "created_at": 2000,
            "created_at_iso": "2026-01-01T00:00:02+00:00",
            "message": "Local fallback history",
            "sentiment": "neutral",
            "persona": {"nickname": "local"},
        }
    ]


def test_save_feedback_falls_back_to_local_in_dev_when_database_fails(monkeypatch, tmp_path):
    monkeypatch.setenv("ENV", "dev")
    monkeypatch.setenv("FEEDBACK_LOCAL_DIR", str(tmp_path))
    monkeypatch.setattr(
        feedback_service,
        "_db_engine",
        lambda: (_ for _ in ()).throw(RuntimeError("no local database")),
        raising=False,
    )

    item = feedback_service.save_feedback(message="Local dev feedback")

    assert item["storage"] == "local"
    rows = (tmp_path / "feedback.jsonl").read_text(encoding="utf-8").splitlines()
    assert json.loads(rows[0])["message"] == "Local dev feedback"


def test_save_feedback_requires_database_in_prod(monkeypatch, tmp_path):
    monkeypatch.setenv("ENV", "prod")
    monkeypatch.delenv("FEEDBACK_LOCAL_DIR", raising=False)
    monkeypatch.setattr(
        feedback_service,
        "_db_engine",
        lambda: (_ for _ in ()).throw(RuntimeError("database denied")),
        raising=False,
    )
    monkeypatch.setattr(feedback_service.os, "makedirs", lambda *_args, **_kwargs: (_ for _ in ()).throw(
        OSError(30, "Read-only file system", "/app")
    ))

    response = client.post("/api/feedback", json={"message": "Prod feedback"})

    assert response.status_code == 502
    assert "database" in response.json()["detail"]
    assert "Read-only file system" not in response.json()["detail"]
