from fastapi.testclient import TestClient
from app.main import app


def test_list_languages():
    with TestClient(app) as client:
        response = client.get("/api/languages")
        assert response.status_code == 200
        body = response.json()
        codes = {item["code"] for item in body}
        assert "de" in codes
        assert "fr" in codes
