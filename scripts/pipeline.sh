#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ROOT="$(cd "${REPO_ROOT}/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
FRONTEND_DIR="${REPO_ROOT}/frontend"
PRODUCER_DIR="${APP_ROOT}/language_info_extraction"
LOG_DIR="${TMPDIR:-/tmp}/language-app-logs"
BACKEND_PORT="${BACKEND_PORT:-8501}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
API_BASE_URL="http://127.0.0.1:${BACKEND_PORT}"
FRONTEND_URL="http://127.0.0.1:${FRONTEND_PORT}"

mkdir -p "${LOG_DIR}"

step() {
  printf '\n==> %s\n' "$1"
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-60}"

  for _ in $(seq 1 "${attempts}"); do
    if curl -fsS -m 2 "${url}" >/dev/null 2>&1; then
      printf '%s ready: %s\n' "${label}" "${url}"
      return 0
    fi
    sleep 1
  done

  printf '%s did not become ready: %s\n' "${label}" "${url}" >&2
  return 1
}

step "Start PostgreSQL"
docker compose -f "${REPO_ROOT}/docker-compose.yml" up -d postgres
for _ in $(seq 1 30); do
  if pg_isready -h localhost -p 5433 -U tinder_user -d tinder_languages_db >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
pg_isready -h localhost -p 5433 -U tinder_user -d tinder_languages_db

step "Run producer tests"
(cd "${PRODUCER_DIR}" && .venv/bin/python -m pytest -q)

step "Run backend tests"
(cd "${BACKEND_DIR}" && .venv/bin/python -m pytest -q)

step "Run frontend lint"
(cd "${FRONTEND_DIR}" && npm run lint)

step "Run frontend strict build"
FRONTEND_BUILD_LOG="$(mktemp "${TMPDIR:-/tmp}/language-app-frontend-build.XXXXXX")"
(cd "${FRONTEND_DIR}" && npm run build:strict 2>&1 | tee "${FRONTEND_BUILD_LOG}")
if grep -E "Some chunks are larger than|PydanticDeprecatedSince20|Field name .* shadows" "${FRONTEND_BUILD_LOG}" >/dev/null; then
  printf 'Frontend build emitted warning debt. See %s\n' "${FRONTEND_BUILD_LOG}" >&2
  exit 1
fi

step "Run database data-quality checks"
(cd "${REPO_ROOT}" && "${BACKEND_DIR}/.venv/bin/python" scripts/data_quality_report.py --min-german-words 500)

step "Start backend and frontend in tmux"
tmux kill-session -t language-app-backend 2>/dev/null || true
tmux kill-session -t language-app-frontend 2>/dev/null || true
: > "${LOG_DIR}/backend.log"
: > "${LOG_DIR}/frontend.log"
tmux new-session -d -s language-app-backend "cd '${BACKEND_DIR}' && .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port '${BACKEND_PORT}' 2>&1 | tee -a '${LOG_DIR}/backend.log'"
tmux new-session -d -s language-app-frontend "cd '${FRONTEND_DIR}' && VITE_API_URL='${API_BASE_URL}' npm run dev -- --host 127.0.0.1 --port '${FRONTEND_PORT}' 2>&1 | tee -a '${LOG_DIR}/frontend.log'"
wait_for_http "${API_BASE_URL}/docs" "backend"
wait_for_http "${FRONTEND_URL}/library" "frontend"

step "Run API smoke checks"
curl -fsS "${API_BASE_URL}/api/library/stats?language=de" | jq .
curl -fsS "${API_BASE_URL}/api/library/words?language=de&limit=1000" | jq 'length'
curl -fsS "${API_BASE_URL}/api/cards/adaptive?language=de&limit=5" | jq -e '
  length > 0 and
  all(.[]; (.knowledge_level >= 1 and .knowledge_level <= 10) and
  (.selection_reason | test("^(struggling|new|learning|review)$")))
' >/dev/null
curl -fsS "${API_BASE_URL}/api/library/words/103/db-row" | jq -e '.related.verb_conjugations | length >= 6' >/dev/null

step "Run Playwright smoke tests"
(cd "${FRONTEND_DIR}" && env -u NO_COLOR -u FORCE_COLOR npx playwright test)

step "Pipeline complete"
printf 'Frontend: %s/library\n' "${FRONTEND_URL}"
printf 'Backend:  %s/docs\n' "${API_BASE_URL}"
printf 'Logs:     %s\n' "${LOG_DIR}"
