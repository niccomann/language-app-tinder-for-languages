# Public Feedback History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public global history of tester feedback inside the existing feedback modal.

**Architecture:** Backend keeps the existing append-only feedback write path and adds a normalized read path across the application database and a development-only JSONL fallback. Frontend adds typed API access and renders a compact history tab/area in `FeedbackButton` without blocking feedback submission if history loading fails.

**Tech Stack:** FastAPI, Pydantic v2, SQLModel, React 19, TypeScript, Vitest, Testing Library.

---

## File Structure

- Modify `backend/app/services/feedback_service.py`: add database/local storage readers, normalization, dedupe, sorting, and limit capping.
- Modify `backend/app/routes/feedback.py`: add public `GET /api/feedback` response models and route.
- Create `backend/tests/test_feedback_routes.py`: cover POST persona preservation and public history behavior.
- Modify `frontend/src/services/api.ts`: add `FeedbackHistoryItem`, `FeedbackPersona`, and `api.listFeedback()`.
- Modify `frontend/src/components/FeedbackButton.tsx`: add public history UI and persona hint copy usage.
- Create `frontend/src/components/FeedbackButton.test.tsx`: cover history success, empty, error, and submission.
- Modify locale JSON files under `frontend/src/i18n/locales/*.json`: add history labels and explicit public persona hint.

---

### Task 1: Backend Public Feedback History

**Files:**
- Modify: `backend/app/services/feedback_service.py`
- Modify: `backend/app/routes/feedback.py`
- Create: `backend/tests/test_feedback_routes.py`

- [ ] **Step 1: Write failing backend route/service tests**

Create `backend/tests/test_feedback_routes.py` with tests that monkeypatch storage:

```python
from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.main import app
from app.services import feedback_service


client = TestClient(app)


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


def test_list_feedback_returns_local_and_s3_items_newest_first(monkeypatch, tmp_path):
    local_path = tmp_path / "feedback.jsonl"
    local_path.write_text(
        json.dumps({
            "id": "local-old",
            "created_at": 1000,
            "created_at_iso": "2026-01-01T00:00:00+00:00",
            "message": "Older local",
            "sentiment": "neutral",
        })
        + "\nnot-json\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("FEEDBACK_LOCAL_DIR", str(tmp_path))

    s3_payload = {
        "id": "s3-new",
        "created_at": 2000,
        "created_at_iso": "2026-01-02T00:00:00+00:00",
        "message": "Newer s3",
        "sentiment": "like",
        "source_url": "https://customizeyourlingua.com/learn",
        "persona": {"age": 29, "profession": "humanist"},
    }

    class FakeBody:
        def read(self):
            return json.dumps(s3_payload).encode("utf-8")

    class FakePaginator:
        def paginate(self, Bucket, Prefix):
            return [{"Contents": [{"Key": "feedback/2026/01/02/s3-new.json"}]}]

    class FakeS3:
        def get_paginator(self, name):
            assert name == "list_objects_v2"
            return FakePaginator()

        def get_object(self, Bucket, Key):
            return {"Body": FakeBody()}

    monkeypatch.setattr(feedback_service, "_s3_client", lambda: FakeS3())

    response = client.get("/api/feedback?limit=10")

    assert response.status_code == 200
    body = response.json()
    assert [item["id"] for item in body["items"]] == ["s3-new", "local-old"]
    assert body["items"][0]["persona"] == {"age": 29, "profession": "humanist"}
    assert body["items"][0]["source_url"] == "https://customizeyourlingua.com/learn"


def test_list_feedback_caps_limit_and_ignores_malformed(monkeypatch, tmp_path):
    local_path = tmp_path / "feedback.jsonl"
    rows = [
        {"id": f"fb-{i}", "created_at": i, "message": f"message {i}"}
        for i in range(150)
    ]
    local_path.write_text(
        "\n".join(json.dumps(row) for row in rows) + "\n" + json.dumps({"id": "bad"}),
        encoding="utf-8",
    )
    monkeypatch.setenv("FEEDBACK_LOCAL_DIR", str(tmp_path))

    class EmptyPaginator:
        def paginate(self, Bucket, Prefix):
            return []

    class EmptyS3:
        def get_paginator(self, name):
            return EmptyPaginator()

    monkeypatch.setattr(feedback_service, "_s3_client", lambda: EmptyS3())

    response = client.get("/api/feedback?limit=999")

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 100
    assert items[0]["id"] == "fb-149"
    assert items[-1]["id"] == "fb-50"
```

- [ ] **Step 2: Run backend tests and verify RED**

Run:

```bash
cd backend
USE_SQLITE=true python3 -m pytest tests/test_feedback_routes.py -q
```

Expected: fail because `GET /api/feedback` and service read functions do not exist.

- [ ] **Step 3: Implement backend read path**

Add to `backend/app/services/feedback_service.py`:

```python
MAX_FEEDBACK_HISTORY_LIMIT = 100


def list_feedback(*, limit: int = MAX_FEEDBACK_HISTORY_LIMIT) -> list[dict[str, Any]]:
    safe_limit = max(1, min(int(limit), MAX_FEEDBACK_HISTORY_LIMIT))
    items: dict[str, dict[str, Any]] = {}
    for item in [*_read_database_feedback(limit=safe_limit), *_read_local_feedback()]:
        normalized = _normalize_feedback_item(item)
        if not normalized:
            continue
        items[normalized["id"]] = normalized
    return sorted(items.values(), key=lambda row: row["created_at"], reverse=True)[:safe_limit]
```

Implement `_read_database_feedback()`, `_read_local_feedback()`, and `_normalize_feedback_item()` so malformed local records are skipped and development-only local failures log warnings instead of failing the route.

Add response models and `GET /api/feedback` to `backend/app/routes/feedback.py`.

- [ ] **Step 4: Run backend tests and verify GREEN**

Run:

```bash
cd backend
USE_SQLITE=true python3 -m pytest tests/test_feedback_routes.py -q
```

Expected: pass.

---

### Task 2: Frontend API And Feedback History UI

**Files:**
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/components/FeedbackButton.tsx`
- Create: `frontend/src/components/FeedbackButton.test.tsx`
- Modify: `frontend/src/i18n/locales/en.json`
- Modify: `frontend/src/i18n/locales/it.json`
- Modify: `frontend/src/i18n/locales/de.json`
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/fr.json`
- Modify: `frontend/src/i18n/locales/pt.json`

- [ ] **Step 1: Write failing frontend tests**

Create `frontend/src/components/FeedbackButton.test.tsx` that mocks `api.submitFeedback` and `api.listFeedback`, renders `FeedbackButton`, opens the modal, and verifies:

- the history list renders a feedback message and persona details
- the empty history state renders
- the error state renders and does not hide the form
- submission still posts feedback

- [ ] **Step 2: Run frontend tests and verify RED**

Run:

```bash
cd frontend
pnpm test -- src/components/FeedbackButton.test.tsx
```

Expected: fail because `api.listFeedback()` and the history UI are missing.

- [ ] **Step 3: Implement frontend API and UI**

Add typed `listFeedback(limit = 100)` to `frontend/src/services/api.ts`, calling:

```typescript
`${API_BASE_URL}/api/feedback?limit=${limit}`
```

Update `FeedbackButton.tsx` to:

- load history when the modal opens
- show write/history segmented controls
- keep submission as default view
- render loading, empty, error, and success history states
- show persona context compactly for filled optional fields
- show `persona.sectionHint` above persona fields

Add locale strings for history labels in all locale files.

- [ ] **Step 4: Run frontend tests and verify GREEN**

Run:

```bash
cd frontend
pnpm test -- src/components/FeedbackButton.test.tsx
```

Expected: pass.

---

### Task 3: Full Verification

**Files:**
- All files touched above.

- [ ] **Step 1: Run focused backend tests**

```bash
cd backend
USE_SQLITE=true python3 -m pytest tests/test_feedback_routes.py -q
```

Expected: pass.

- [ ] **Step 2: Run focused frontend tests**

```bash
cd frontend
pnpm test -- src/components/FeedbackButton.test.tsx src/services/api.test.ts
```

Expected: pass.

- [ ] **Step 3: Run frontend type/lint/build checks**

```bash
cd frontend
pnpm tsc --noEmit
pnpm lint
pnpm build:strict
```

Expected: all pass.

- [ ] **Step 4: Run backend regression suite**

```bash
cd backend
USE_SQLITE=true python3 -m pytest -q
```

Expected: pass.

- [ ] **Step 5: Check git diff whitespace**

```bash
git diff --check
```

Expected: no output.
