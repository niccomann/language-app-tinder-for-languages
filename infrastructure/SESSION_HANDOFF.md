> Last updated: 2026-05-15 02:35

# Session handoff — state as of compaction

Snapshot of a long working session so a fresh context can continue cleanly.
Branch: `feat-onboarding-identification`.

## ⚠️ STATUS NOW (post-compaction continuation)

- **Both deploys DONE, prod fully healthy.** `https://customizeyourlingua.com` → 200,
  all API endpoints (cards/adaptive/library/users) → 200 on de/fr/it.
- **Prod E2E: 37/37** (onboarding 8, real-user 13, deep 16) against prod.
- **Fixed a deploy bug along the way**: `deploy_backend_to_ec2.sh` was re-quoting
  env vars on every run (`printf "%q"` compounding), which had finally mangled
  `DB_HOST`/`USE_SQLITE` into garbage → backend fell back to `localhost` → prod
  502. Recreated `language-backend` with a clean `--env-file` on the EC2
  (`/home/ec2-user/language-deploy/backend.prod.env`, chmod 600) and changed the
  script to use that file instead of inspecting env. See DEPLOY_PLAYBOOK gotcha #11.
- **Commits**: branch had 9; this continuation adds the deploy-script fix + doc
  updates. Push status: see task #30.

## Production state

- Live: `https://customizeyourlingua.com` (Cloudflare Full SSL → EC2). Also `http://3.64.236.66/`.
- EC2 `i-04fb87478e0a30ee0`, Docker network `language-app`. Containers:
  `language-frontend` (nginx :80), `language-backend` (uvicorn, `USE_SQLITE=false` → Postgres),
  `language-postgres` (Postgres 16, the canonical DB, volume `language-pgdata`),
  `https-proxy` (nginx TLS termination :443), `language-backend-sqlite-rollback` (stopped, rollback).
- DB: centralized Postgres on the EC2. 8069 flashcards (de 2998 / fr 2515 / it 2556),
  11760 verb_conjugations, 17 tables. Local dev uses SQLite `backend/app.db` (synced copy).
- Full details: `infrastructure/DATABASES.md`, `infrastructure/DEPLOY_PLAYBOOK.md`, `https_deploy/`.

## This session — COMPLETED & COMMITTED

Earlier in the session (already committed before this handoff):
- UI restyle (compact strips, FeedbackButton 2-step, text-splitting, type hierarchy)
- DB centralized SQLite → Postgres on the EC2 (migration, switch, backup cron, tunnel)
- HTTPS Flexible → Full SSL (dedicated `https-proxy` container, self-signed origin cert)
- `pool_pre_ping` on the DB engine; `deploy_backend_to_ec2.sh` restarts nginx after

This autonomous block (commits `b4c0c4f`, `f25e3ea`, `a2cb661`, `9d3423a`):
- **i18n structural fixes**: `learningPathMeta.ts` no longer hardcodes English
  (milestones + trend labels now from `copy.pathHome.milestones/.trend`, added to
  all 6 locales); `useLearningSession` toasts i18n'd (were hardcoded "Your German
  path…"); feedback `germanLevel` → `targetLevel` everywhere (frontend + api.ts +
  backend `feedback.py`), label now generic.
- **Refactoring** from a frontend+backend code sweep: `config.py` `USE_SQLITE`
  defaults `false` now; dropped dead `connect_args`; removed 4 dead exports
  (`hasVocabularyHistory`, `hasImage`, `buildPreferenceProfileSummary`,
  `getTopLevelCategories`).
- **~159 translations per locale** for es/de/pt (was English): featureFlow mission
  cards, featureGuides tutorial overlays, grammarLab/Hub bodies, yourVocabulary,
  cardStack, pathHome explainers, etc. Brand-flavor terms (Topic Deck, XP Bank…)
  intentionally kept English to match it/fr. `{{placeholders}}` preserved.
- **Audits** (read-only, all clean): prod Postgres + local SQLite are complete
  (0 NULLs, 0 orphan FKs, 0 duplicate word+language); all API endpoints healthy
  on de/fr/it. Image coverage 8068/8069.
- **Local E2E: 37/37** (onboarding 8, UI scenarios 13, deep 16) after all changes.

## PENDING (not done)

- **#28 feature-coherence per language** — not started. Deep verification that
  every feature renders coherently on de/it/fr (the i18n *structural* fixes are
  done — `learningPathMeta`, `useLearningSession` toasts — but a full per-language
  sweep of every screen hasn't been done). This is the big remaining item.
- **#29 prod E2E** — ✅ DONE, 37/37 against prod.
- **#30 push + docs** — `git push -u origin feat-onboarding-identification`.

## FLAGGED FINDINGS — real issues, deliberately NOT fixed (too big/risky for autonomous work)

1. **`onboardingWizard/*`** (5 components: Welcome/Language/Level/Goal/Identity Step)
   are **hardcoded in Italian**, zero i18n. This is the actual first-run flow. Needs
   i18n-izing, not just translation.
2. **`onboarding.*` i18n keys** (~130 per locale in es/de/pt) still untranslated —
   used by `OnboardingModal` + `FirstVocabularyOnboarding`. Big batch, flagged.
3. **Backend hardcoded-German** — `german_morphology.py`, `grammar_starter_cards.py`,
   `grammar_conjugations.py`, `seed.py` (`language="de"`), `sentence_validator.py`
   ("grammatica tedesca"), `GrammarSentenceEntity.german` column — the grammar
   pipeline is wired for German only despite de/it/fr support.
4. **`cards.py` perf** — `get_words_library` / adaptive endpoints do `SELECT *` +
   Python-side filter/sort/slice — loads all flashcards per request. This is why
   `/api/cards/adaptive` is ~17s over the SSH tunnel (and slow-ish on prod too).
   Push limit/offset/order into SQL.
5. **Dead backend endpoints** (no `api.ts` callers): `GET /api/words/library`,
   `GET /api/tts/cached/{hash}`, `GET /api/statistics/summary`, `routes/tracking.py`
   (9 endpoints), `routes/users.py` partially, several `infographics.py` ones.
   Confirm no other callers before removing.
6. **1 missing image**: flashcard "Schreiben" (de) has no `image_base64` (8068/8069
   covered). Regenerate via the producer image pipeline.
7. Inconsistent backend error handling (some bare `except Exception` leak
   `str(error)` to clients); raw-SQL vs ORM split in `library_queries.py`.
8. `grammar.dialectsBody` / dialect feature is German-region-specific (Germany/
   Austria/Switzerland) — fine if dialects stays German-only.

## Key facts / gotchas

- Postgres password: `backend/.env` (`DB_PASSWORD`) — gitignored. Also `/tmp/pgpass.txt` locally.
- Restarting `language-backend`/`language-postgres` changes their Docker IP → nginx
  502 until `language-frontend` restarts. `deploy_backend_to_ec2.sh` now handles this.
- Local frontend dev uses **SQLite** (`USE_SQLITE=true` in `.env`) — the SSH tunnel
  to Postgres works but the adaptive endpoint is ~17s over it (too slow for dev).
- Use **pnpm** for the frontend, not npm (npm 11.5.1 is broken on this machine).
- Untracked backup `.db` files in `backend/` are intentionally not committed.
- Test scripts live in `/tmp/`: `onboarding-e2e.mjs`, `real-user-test.mjs`, `deep-test.mjs`.
