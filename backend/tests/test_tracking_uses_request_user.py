from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _start(headers=None, body=None):
    return client.post("/api/tracking/session/start", json=body or {}, headers=headers or {})


def test_header_wins_when_body_omits_user_id():
    r = _start(headers={"X-User-Id": "abc-from-header"}, body={})
    assert r.status_code == 200
    assert r.json()["user_id"] == "abc-from-header"


def test_body_user_id_wins_for_backwards_compat():
    # Existing clients that send {"user_id": "..."} in the body keep working.
    r = _start(headers={"X-User-Id": "abc-from-header"}, body={"user_id": "bob-from-body"})
    assert r.status_code == 200
    assert r.json()["user_id"] == "bob-from-body"


def test_falls_back_to_default_user_when_nothing_sent():
    r = _start(headers={}, body={})
    assert r.status_code == 200
    assert r.json()["user_id"] == "default_user"
