# Movie Recommendations Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the movie recommendation feature reproducible, configurable, and safer to operate in staging/production.

**Architecture:** Keep the current API/UI shape. Add a versioned movie manifest as the reproducible corpus input, make OpenSubtitles importer runtime configuration explicit, support both local SQLite and app-configured Postgres imports, expose cache invalidation for importer/admin workflows, and align UI/docs copy with the actual matching algorithm.

**Tech Stack:** FastAPI, SQLModel/SQLite/Postgres, pytest, React/Vite/Vitest, JSON manifest files.

---

### Task 1: Versioned Movie Manifest

**Files:**
- Create: `backend/app/data/movie_manifest_de.json`
- Modify: `backend/scripts/import_opensubtitles_movies.py`
- Test: `backend/tests/test_opensubtitles_importer.py`

- [x] Write tests that load a manifest file and verify CLI defaults use a versioned manifest path.
- [x] Run the importer tests and verify the new tests fail because manifest loading is not implemented.
- [x] Add `load_movie_manifest(path)` and switch the script from hardcoded constants to a JSON manifest.
- [x] Run `pytest tests/test_opensubtitles_importer.py -q`.

### Task 2: Production Importer Configuration

**Files:**
- Modify: `backend/app/services/opensubtitles_importer.py`
- Modify: `backend/scripts/import_opensubtitles_movies.py`
- Test: `backend/tests/test_opensubtitles_importer.py`

- [x] Write tests for env-driven user agent, base URL, min word count, and request delay behavior.
- [x] Run the tests and verify they fail against the current hardcoded importer.
- [x] Add `OpenSubtitlesConfig` with environment defaults and inject it through search/download/fetch/import.
- [x] Run importer tests.

### Task 3: App Database Import Path

**Files:**
- Modify: `backend/app/services/opensubtitles_importer.py`
- Modify: `backend/scripts/import_opensubtitles_movies.py`
- Test: `backend/tests/test_opensubtitles_importer.py`

- [x] Write a failing test for ORM/session upsert through app models.
- [x] Add `upsert_imported_subtitle_session()` and `import_movie_batch_with_engine()`.
- [x] Add `--app-database` CLI mode for Postgres-backed production.
- [x] Refactor local SQLite imports to use the same SQLModel upsert path as app-database imports.
- [x] Add retry and runtime config validation tests for OpenSubtitles HTTP calls.
- [x] Run importer tests.

### Task 4: Recommender Cache Operations

**Files:**
- Modify: `backend/app/routes/recommendations.py`
- Test: `backend/tests/test_recommendations_route.py`

- [x] Write a route-level test proving cache can be invalidated through an internal endpoint protected by `X-Admin-Token`.
- [x] Run the test and verify it fails because the endpoint does not exist.
- [x] Add configurable TTL and `POST /api/movies/recommendations/cache/reset`.
- [x] Run recommendation route tests.

### Task 5: UI Copy and Limits

**Files:**
- Modify: `frontend/src/components/MovieRecommendations.tsx`
- Modify: `frontend/src/i18n/locales/*.json`
- Test: `frontend/src/components/MovieRecommendations.test.tsx`

- [x] Write Vitest assertions that the chart/copy says alias/stemming based matching, not perfect lemmatization.
- [x] Run the component test and verify it fails on the current optimistic copy.
- [x] Update copy and chart labels to match actual backend behavior.
- [x] Run `pnpm vitest run src/components/MovieRecommendations.test.tsx`.

### Task 6: Deployment Documentation

**Files:**
- Modify: `MOVIE_RECOMMENDER_ALGORITHM.md`
- Modify: `docs/deployment/aws-single-node-runbook.md`
- Modify: `infrastructure/DATABASES.md`
- Modify: `backend/README.md`

- [x] Add the import command, environment variables, cache reset command, and DB backup/deploy notes.
- [x] Check docs state that ignored local SQLite files are not deployed automatically.
- [x] Run targeted backend/frontend checks before reporting status.
