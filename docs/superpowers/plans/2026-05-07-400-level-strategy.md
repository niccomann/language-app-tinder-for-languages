# 400 Level Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a 1-400 global learning path strategy while keeping per-word mastery stable and understandable.

**Architecture:** Add XP-derived path progress in `backend/app/services/adaptive_learning.py` and expose it through the existing adaptive summary endpoint. Update the frontend path home to show `path_level`, XP to next level, and milestone chapters, while card badges describe per-word `Mastery` instead of global `Level`.

**Tech Stack:** FastAPI, SQLModel, pytest, React, TypeScript, Vite, Tailwind, Playwright.

---

### Task 1: Backend 400-Level Path Metrics

**Files:**
- Modify: `backend/app/services/adaptive_learning.py`
- Modify: `backend/app/routes/statistics.py`
- Test: `backend/tests/test_adaptive_learning.py`

- [ ] Add constants for `PATH_MAX_LEVEL = 400` and `PATH_XP_PER_LEVEL = 100`.
- [ ] Compute `path_xp` from correct swipes, incorrect swipes, words started, and mastered words.
- [ ] Add `path_level`, `max_path_level`, `xp_to_next_level`, and `path_level_progress` to adaptive summary.

### Task 2: Frontend Contract and Copy

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/components/LearningPathHome.tsx`
- Modify: `frontend/src/components/LearningLevelBadge.tsx`
- Modify: `frontend/src/components/LearningSystemMenu.tsx`
- Test: `backend/tests/test_frontend_learning_flow.py`

- [ ] Add the new path summary fields to TypeScript types.
- [ ] Show global `Level n/400` on the learning path home.
- [ ] Rename per-card display to `Mastery n/10`.
- [ ] Update system copy to explain global path levels and word mastery separately.

### Task 3: Smoke Coverage

**Files:**
- Modify: `scripts/pipeline.sh`
- Modify: `frontend/test-swipe-first.spec.ts`

- [ ] Update API smoke checks to validate `path_level <= 400`.
- [ ] Update Playwright copy checks for the 400-level path.
- [ ] Run backend tests, lint, strict build, and pipeline.
