from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.testclient import TestClient

from app.core.user_middleware import attach_user_id_middleware, require_user_id


def _make_app():
    app = FastAPI()
    app.middleware("http")(attach_user_id_middleware)

    probe = APIRouter()

    @probe.get("/echo")
    def echo(request: Request):
        return {"user_id": getattr(request.state, "user_id", None)}

    @probe.get("/protected")
    def protected(user_id: str = Depends(require_user_id)):
        return {"user_id": user_id}

    app.include_router(probe)
    return app


def test_middleware_attaches_header():
    client = TestClient(_make_app())
    r = client.get("/echo", headers={"X-User-Id": "abc"})
    assert r.status_code == 200
    assert r.json()["user_id"] == "abc"


def test_middleware_absent_header_is_none():
    client = TestClient(_make_app())
    r = client.get("/echo")
    assert r.status_code == 200
    assert r.json()["user_id"] is None


def test_require_user_id_400_when_missing():
    client = TestClient(_make_app())
    r = client.get("/protected")
    assert r.status_code == 400


def test_require_user_id_passes_when_present():
    client = TestClient(_make_app())
    r = client.get("/protected", headers={"X-User-Id": "abc"})
    assert r.status_code == 200
    assert r.json()["user_id"] == "abc"
