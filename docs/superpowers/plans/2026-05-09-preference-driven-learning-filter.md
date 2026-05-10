# Preference-Driven Learning Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make onboarding preferences actively shape vocabulary scan, adaptive deck, and sentence exercises without hiding existing features.

**Architecture:** Normalize raw questionnaire answers into a frontend `LearningPreferenceProfile`, send it to backend learning endpoints, and let backend apply a soft scoring mix: preferred domains first, functional grammar preserved, and fallback content kept available. Existing category filters remain valid and combine with the profile.

**Tech Stack:** React/Vite/TypeScript frontend, FastAPI/Pydantic/SQLModel backend, SQLite data store, pytest static and API tests.

---

### Task 1: Frontend Preference Profile

**Files:**
- Create: `frontend/src/learning/preferenceProfile.ts`
- Modify: `frontend/src/types/index.ts`
- Test: `backend/tests/test_frontend_learning_flow.py`

- [ ] **Step 1: Write failing static tests**

Add tests proving the frontend has a central `LearningPreferenceProfile`, normalizes raw question ids into semantic fields, and reads stored onboarding preferences before adaptive card loading.

- [ ] **Step 2: Verify red**

Run: `pytest backend/tests/test_frontend_learning_flow.py -q -k preference_profile`

Expected: FAIL because `frontend/src/learning/preferenceProfile.ts` does not exist yet.

- [ ] **Step 3: Implement profile module**

Create a pure TypeScript module that maps `question-1..question-10` answers to fields such as `domains`, `tones`, `wordStyles`, `preferredPartsOfSpeech`, `difficultyMode`, and `exerciseBias`.

- [ ] **Step 4: Verify green**

Run: `pytest backend/tests/test_frontend_learning_flow.py -q -k preference_profile`

Expected: PASS.

### Task 2: Backend Adaptive Query Contract

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/app/routes/cards.py`
- Test: `backend/tests/test_adaptive_learning.py`

- [ ] **Step 1: Write failing API tests**

Add tests for `POST /api/cards/adaptive/query` verifying technology profile cards are prioritized and functional grammar words remain available.

- [ ] **Step 2: Verify red**

Run: `pytest backend/tests/test_adaptive_learning.py -q -k preference_profile`

Expected: FAIL with 404 or missing contract.

- [ ] **Step 3: Implement query models and soft selection**

Add Pydantic request models and a helper that scores preferred domain/category/register/frequency/CEFR matches while reserving functional words and fallback candidates.

- [ ] **Step 4: Verify green**

Run: `pytest backend/tests/test_adaptive_learning.py -q -k preference_profile`

Expected: PASS.

### Task 3: Wire Learning Deck And Sentence Endpoints

**Files:**
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/hooks/useLearningSession.ts`
- Modify: `frontend/src/components/CardStack.tsx`
- Modify: `backend/app/routes/grammar.py`
- Test: `backend/tests/test_frontend_learning_flow.py`
- Test: `backend/tests/test_grammar_available_nodes.py`

- [ ] **Step 1: Write failing static/integration tests**

Prove `api.getAdaptiveFlashcards` uses `POST /api/cards/adaptive/query` when a profile exists, `useLearningSession` reads saved preferences, and grammar available nodes accepts profile parameters.

- [ ] **Step 2: Verify red**

Run frontend flow and grammar tests with matching `-k` filters.

- [ ] **Step 3: Implement wiring**

Send the normalized profile from the deck loader to the adaptive query endpoint. Add optional profile filters to grammar nodes/challenges while preserving default behavior.

- [ ] **Step 4: Verify green**

Run the targeted tests.

### Task 4: Final Verification

**Files:**
- All touched files.

- [ ] **Step 1: Run backend tests**

Run: `pytest backend/tests/test_adaptive_learning.py backend/tests/test_grammar_available_nodes.py backend/tests/test_frontend_learning_flow.py -q`

- [ ] **Step 2: Run frontend quality gates**

Run: `npm run lint -- --max-warnings=0`

Run: `npm run build:strict`

- [ ] **Step 3: Review diff**

Run: `git diff --stat` and inspect changed files for accidental unrelated edits.
