import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _uid() -> str:
    return str(uuid.uuid4())


def test_post_user_creates_row():
    uid = _uid()
    r = client.post("/api/users", json={"user_id": uid, "display_name": "Nico"})
    assert r.status_code == 201
    body = r.json()
    assert body["user_id"] == uid
    assert body["display_name"] == "Nico"
    assert body["onboarding_completed"] is False
    assert body["target_language"] == "de"


def test_post_user_is_idempotent():
    uid = _uid()
    client.post("/api/users", json={"user_id": uid, "display_name": "Nico"})
    r = client.post("/api/users", json={"user_id": uid, "display_name": "OTHER"})
    # Idempotent: returns existing row, does NOT overwrite display_name.
    assert r.status_code == 200
    assert r.json()["display_name"] == "Nico"


def test_get_user_404():
    r = client.get(f"/api/users/does-not-exist-{uuid.uuid4().hex}")
    assert r.status_code == 404


def test_get_user_200():
    uid = _uid()
    client.post("/api/users", json={"user_id": uid, "display_name": "Nico"})
    r = client.get(f"/api/users/{uid}")
    assert r.status_code == 200
    assert r.json()["user_id"] == uid


def test_patch_user_partial_update():
    uid = _uid()
    client.post("/api/users", json={"user_id": uid, "display_name": "Nico"})
    r = client.patch(f"/api/users/{uid}", json={"onboarding_completed": True, "daily_goal_minutes": 20})
    assert r.status_code == 200
    body = r.json()
    assert body["onboarding_completed"] is True
    assert body["daily_goal_minutes"] == 20
    assert body["display_name"] == "Nico"  # untouched


def test_patch_user_404():
    r = client.patch(f"/api/users/missing-{uuid.uuid4().hex}", json={"display_name": "x"})
    assert r.status_code == 404


def test_post_user_validates_age():
    uid = _uid()
    r = client.post("/api/users", json={"user_id": uid, "display_name": "Nico", "age": 2})
    assert r.status_code == 422


def test_post_user_validates_display_name_length():
    uid = _uid()
    r = client.post("/api/users", json={"user_id": uid, "display_name": "x" * 100})
    assert r.status_code == 422
