from app.main import backend_reload_enabled


def test_backend_reload_is_disabled_by_default(monkeypatch):
    monkeypatch.delenv("BACKEND_RELOAD", raising=False)

    assert backend_reload_enabled() is False


def test_backend_reload_can_be_enabled_explicitly(monkeypatch):
    monkeypatch.setenv("BACKEND_RELOAD", "true")

    assert backend_reload_enabled() is True
