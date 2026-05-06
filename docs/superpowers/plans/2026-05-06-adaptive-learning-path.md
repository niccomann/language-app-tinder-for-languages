# Adaptive Learning Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first screen feel like a Duolingo-style learning journey with visible knowledge levels, trend feedback, and a return-after-inactivity prompt.

**Architecture:** Keep the adaptive learning rules in the backend service layer, expose a compact summary endpoint, and render the path from frontend components that reuse the existing UI system. The learning session remains the swipe deck; the path becomes the primary entry view and links into the deck, library, and grammar lab.

**Tech Stack:** FastAPI, SQLModel, pytest, React, TypeScript, Vite, Tailwind, Playwright.

---

### Task 1: Backend Adaptive Summary

**Files:**
- Modify: `backend/app/services/adaptive_learning.py`
- Modify: `backend/app/routes/statistics.py`
- Test: `backend/tests/test_adaptive_learning.py`

- [ ] Add pure summary helpers for average confidence, average knowledge level, struggling/learning/mastered counts, inactivity days, and trend status.
- [ ] Add `GET /api/statistics/adaptive-summary` with `language` and `user_id`.
- [ ] Verify with focused pytest tests.

### Task 2: Frontend API Contract

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/api.ts`
- Test: `backend/tests/test_frontend_learning_flow.py`

- [ ] Add `AdaptiveLearningSummary`, `LearningPathStep`, and feedback types.
- [ ] Add `api.getAdaptiveLearningSummary()`.
- [ ] Verify the static frontend contract tests catch missing API usage and type fields.

### Task 3: Learning Path Home

**Files:**
- Create: `frontend/src/components/LearningPathHome.tsx`
- Modify: `frontend/src/components/CardStack.tsx`
- Modify: `frontend/src/components/LearningScreen.tsx`
- Test: `backend/tests/test_frontend_ui_system.py`

- [ ] Add a path view with vertical steps, progress state, daily snapshot metrics, and re-engagement copy.
- [ ] Make `/` show the path first, with a clear action to start the swipe session.
- [ ] Preserve navigation to Library and Grammar.

### Task 4: Level Feedback In Session

**Files:**
- Create: `frontend/src/components/LearningLevelBadge.tsx`
- Create: `frontend/src/components/LearningFeedbackBanner.tsx`
- Modify: `frontend/src/components/Card.tsx`
- Modify: `frontend/src/hooks/useLearningSession.ts`
- Test: `backend/tests/test_frontend_learning_flow.py`

- [ ] Show level/status/confidence on every adaptive card.
- [ ] After a swipe, show a compact level-up or progress message when the updated level improves.
- [ ] Refresh summary data after each statistics update.

### Task 5: Verification

**Files:**
- Modify: `scripts/pipeline.sh`

- [ ] Add an API smoke check for `/api/statistics/adaptive-summary`.
- [ ] Run focused backend tests.
- [ ] Run frontend lint/build.
- [ ] Run `bash scripts/pipeline.sh`.
- [ ] Commit the implementation after fresh verification.
