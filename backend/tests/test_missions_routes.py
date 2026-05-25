import uuid

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def _uid() -> str:
    return str(uuid.uuid4())


def test_path_missions_initializes_four_hundred_gated_levels():
    uid = _uid()

    response = client.get("/api/missions/path?language=de", headers={"X-User-Id": uid})

    assert response.status_code == 200
    body = response.json()
    assert body["total_levels"] == 400
    assert body["completed_count"] == 0
    assert body["current_level"] == 1
    assert body["current_mission_id"] == "de-path-level-001"
    assert len(body["missions"]) == 400
    assert [phase["code"] for phase in body["phases"]] == ["A1", "A2", "B1", "B2"]

    first, second = body["missions"][0], body["missions"][1]
    assert first["status"] == "available"
    assert first["cefr_phase"] == "A1"
    assert first["phase_label"] == "A1 · Levels 1-100"
    assert second["status"] == "locked"
    assert body["missions"][99]["cefr_phase"] == "A1"
    assert body["missions"][100]["cefr_phase"] == "A2"
    assert body["missions"][200]["cefr_phase"] == "B1"
    assert body["missions"][300]["cefr_phase"] == "B2"


def test_completing_available_mission_registers_completion_and_unlocks_next_level():
    uid = _uid()

    response = client.post(
        "/api/missions/path/de-path-level-001/complete?language=de",
        headers={"X-User-Id": uid},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["completed_count"] == 1
    assert body["current_level"] == 2
    assert body["current_mission_id"] == "de-path-level-002"
    assert body["missions"][0]["status"] == "completed"
    assert body["missions"][0]["completed_at"] is not None
    assert body["missions"][1]["status"] == "available"
    assert body["missions"][2]["status"] == "locked"

    persisted = client.get("/api/missions/path?language=de", headers={"X-User-Id": uid}).json()
    assert persisted["missions"][0]["status"] == "completed"
    assert persisted["missions"][1]["status"] == "available"


def test_locked_path_missions_cannot_be_completed_out_of_order():
    uid = _uid()

    response = client.post(
        "/api/missions/path/de-path-level-002/complete?language=de",
        headers={"X-User-Id": uid},
    )

    assert response.status_code == 409
    assert "Complete the current mission first" in response.json()["detail"]

