#!/usr/bin/env bash
# Single-node EC2 deploy for tinder-for-languages.
# Pattern: tarball-based Docker deploy via SSH/scp (NOT EKS, NOT ECR).
# Prerequisites: aws CLI authenticated, Docker daemon running, SSH key at ~/.ssh/language-app-key-20260507132327.pem
# Usage: scripts/deploy_to_ec2.sh [--skip-build] [--skip-db] [--skip-frontend] [--dry-run]

set -euo pipefail

# ─── Constants ───────────────────────────────────────────────────────────────
EC2_IP="3.64.236.66"
EC2_USER="ec2-user"
SSH_KEY="${HOME}/.ssh/language-app-key-20260507132327.pem"
SG_ID="sg-032f76424400a35a7"
AWS_REGION="eu-central-1"
DEPLOY_DIR="/home/ec2-user/language-deploy/current"
INCOMING_DIR="/home/ec2-user/deploy-incoming"
FRONTEND_IMAGE="language-app-frontend:cloud"
FRONTEND_TAR="/tmp/deploy-frontend.tar.gz"
LOCAL_DB_BACKUP="/tmp/deploy-app.db"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

# ─── Flags ───────────────────────────────────────────────────────────────────
SKIP_BUILD=false
SKIP_DB=false
SKIP_FRONTEND=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --skip-build)    SKIP_BUILD=true ;;
    --skip-db)       SKIP_DB=true ;;
    --skip-frontend) SKIP_FRONTEND=true ;;
    --dry-run)       DRY_RUN=true ;;
    *)
      echo "Unknown flag: $arg" >&2
      echo "Usage: $0 [--skip-build] [--skip-db] [--skip-frontend] [--dry-run]" >&2
      exit 1
      ;;
  esac
done

# ─── Helpers ─────────────────────────────────────────────────────────────────
red()   { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
blue()  { printf '\033[0;34m%s\033[0m\n' "$*"; }

step_with_log() {
  local label="$1"; shift
  blue "==> $label"
  if ! "$@"; then
    red "FAILED: $* (exit $?)"
    exit 1
  fi
}

dry_run_echo() {
  if "$DRY_RUN"; then
    blue "[dry-run] $*"
  fi
}

# ─── SG rule tracking ────────────────────────────────────────────────────────
SG_RULE_ID=""

close_sg_rule() {
  if [[ -z "$SG_RULE_ID" ]] || [[ "$SG_RULE_ID" == "dry-run-rule-id" ]]; then
    return 0
  fi
  blue "==> Revoking SSH SG rule $SG_RULE_ID"
  aws ec2 revoke-security-group-ingress \
    --region "$AWS_REGION" \
    --group-id "$SG_ID" \
    --security-group-rule-ids "$SG_RULE_ID" \
    2>/dev/null && green "SSH SG rule revoked." || true
  SG_RULE_ID=""
}

cleanup_on_exit() {
  close_sg_rule
}

trap 'cleanup_on_exit' EXIT

# ─── 1. Preflight ────────────────────────────────────────────────────────────
blue "==> Preflight checks"

for cmd in aws docker ssh scp npm sqlite3; do
  if ! command -v "$cmd" &>/dev/null; then
    red "Missing required command: $cmd"
    exit 1
  fi
done

if "$DRY_RUN"; then
  if ! docker info > /dev/null 2>&1; then
    blue "[dry-run] Docker daemon not running — skipping Docker steps in dry-run"
    _DOCKER_AVAILABLE=false
  else
    _DOCKER_AVAILABLE=true
  fi
else
  step_with_log "Docker daemon check" docker info > /dev/null
  _DOCKER_AVAILABLE=true
fi

if "$DRY_RUN"; then
  if ! aws sts get-caller-identity > /dev/null 2>&1; then
    blue "[dry-run] AWS credentials not available — SG open/close will be skipped"
    _AWS_AVAILABLE=false
  else
    _AWS_AVAILABLE=true
  fi
else
  step_with_log "AWS caller identity" aws sts get-caller-identity > /dev/null
  _AWS_AVAILABLE=true
fi

if [[ ! -f "$SSH_KEY" ]]; then
  if "$DRY_RUN"; then
    blue "[dry-run] SSH key not found at $SSH_KEY — would fail in real deploy"
  else
    red "SSH key not found: $SSH_KEY"
    exit 1
  fi
else
  chmod 600 "$SSH_KEY"
fi

green "Preflight OK"

# ─── 2. Detect current public IP ─────────────────────────────────────────────
blue "==> Detecting local public IP"
MY_IP="$(curl -s https://api.ipify.org || true)"
if [[ -z "$MY_IP" ]]; then
  if "$DRY_RUN"; then
    MY_IP="0.0.0.0"
    blue "[dry-run] Could not detect public IP — using placeholder $MY_IP"
  else
    red "Could not detect public IP from https://api.ipify.org — check network/VPN."
    exit 1
  fi
else
  green "My public IP: $MY_IP"
fi

# ─── 3. Open SSH SG temporarily ──────────────────────────────────────────────
blue "==> Opening port 22 on SG $SG_ID for $MY_IP/32"
if "$DRY_RUN"; then
  dry_run_echo "aws ec2 authorize-security-group-ingress --region $AWS_REGION --group-id $SG_ID --protocol tcp --port 22 --cidr $MY_IP/32"
  SG_RULE_ID="dry-run-rule-id"
elif [[ "${_AWS_AVAILABLE}" == "true" ]]; then
  SG_RULE_JSON="$(aws ec2 authorize-security-group-ingress \
    --region "$AWS_REGION" \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 22 \
    --cidr "$MY_IP/32" \
    --output json)"
  SG_RULE_ID="$(echo "$SG_RULE_JSON" | python3 -c "import sys,json; rules=json.load(sys.stdin).get('SecurityGroupRules',[]); print(rules[0]['SecurityGroupRuleId'] if rules else '')" 2>/dev/null || true)"
  if [[ -z "$SG_RULE_ID" ]]; then
    red "Could not parse SG rule ID from authorize response — cannot guarantee cleanup. Aborting."
    exit 1
  fi
  green "SG rule opened: $SG_RULE_ID"
fi

# SSH helper (respects dry-run for writes, not reads)
ssh_cmd() {
  ssh -i "$SSH_KEY" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=15 \
    "${EC2_USER}@${EC2_IP}" "$@"
}

scp_cmd() {
  scp -i "$SSH_KEY" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=15 \
    "$@"
}

# ─── 4. Build frontend dist ───────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! "$SKIP_FRONTEND"; then
  if "$SKIP_BUILD"; then
    blue "==> Skipping npm build (--skip-build)"
    if [[ ! -f "$REPO_ROOT/frontend/dist/index.html" ]]; then
      red "dist/index.html not found and --skip-build was set. Run npm run build first."
      exit 1
    fi
  else
    blue "==> Building frontend dist"
    if "$DRY_RUN"; then
      dry_run_echo "cd $REPO_ROOT/frontend && npm run build"
    else
      (cd "$REPO_ROOT/frontend" && npm run build)
    fi
    if [[ ! -f "$REPO_ROOT/frontend/dist/index.html" ]] && ! "$DRY_RUN"; then
      red "Build succeeded but dist/index.html is missing. Check build output."
      exit 1
    fi
    green "Frontend build OK"
  fi

  # ─── 5. Build ARM64 Docker image for frontend ─────────────────────────────
  blue "==> Building ARM64 frontend Docker image"
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"; cleanup_on_exit' EXIT

  if "$DRY_RUN"; then
    dry_run_echo "cp -R $REPO_ROOT/frontend/dist $tmpdir/dist"
    dry_run_echo "cp $REPO_ROOT/frontend/nginx.conf $tmpdir/nginx.conf"
    dry_run_echo "Write Dockerfile to $tmpdir/Dockerfile"
    dry_run_echo "docker build --platform linux/arm64 -t $FRONTEND_IMAGE $tmpdir"
  else
    cp -R "$REPO_ROOT/frontend/dist" "$tmpdir/dist"
    cp "$REPO_ROOT/frontend/nginx.conf" "$tmpdir/nginx.conf"
    cat > "$tmpdir/Dockerfile" <<'DOCKEREOF'
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
DOCKEREOF
    step_with_log "docker build ARM64 frontend" \
      docker build --platform linux/arm64 -t "$FRONTEND_IMAGE" "$tmpdir"
    green "Frontend image built: $FRONTEND_IMAGE"
  fi

  # ─── 7. docker save frontend image ───────────────────────────────────────
  blue "==> Saving frontend image to $FRONTEND_TAR"
  if "$DRY_RUN"; then
    dry_run_echo "docker save $FRONTEND_IMAGE | gzip > $FRONTEND_TAR"
  else
    step_with_log "docker save frontend" \
      bash -c "docker save '$FRONTEND_IMAGE' | gzip > '$FRONTEND_TAR'"
    green "Frontend tarball: $FRONTEND_TAR ($(du -sh "$FRONTEND_TAR" | cut -f1))"
  fi
fi

# ─── 6. SQLite online backup ─────────────────────────────────────────────────
if ! "$SKIP_DB"; then
  LOCAL_DB_SRC="$REPO_ROOT/backend/app.db"
  if [[ ! -f "$LOCAL_DB_SRC" ]]; then
    red "backend/app.db not found at $LOCAL_DB_SRC"
    exit 1
  fi

  blue "==> SQLite online backup: $LOCAL_DB_SRC -> $LOCAL_DB_BACKUP"
  if "$DRY_RUN"; then
    dry_run_echo "sqlite3 $LOCAL_DB_SRC \".backup '$LOCAL_DB_BACKUP'\""
    dry_run_echo "sqlite3 $LOCAL_DB_BACKUP 'PRAGMA integrity_check;'"
  else
    rm -f "$LOCAL_DB_BACKUP"
    step_with_log "sqlite3 .backup" \
      sqlite3 "$LOCAL_DB_SRC" ".backup '$LOCAL_DB_BACKUP'"

    blue "==> Verifying backup integrity"
    IC_RESULT="$(sqlite3 "$LOCAL_DB_BACKUP" 'PRAGMA integrity_check;')"
    if [[ "$IC_RESULT" != "ok" ]]; then
      red "Integrity check failed: $IC_RESULT"
      exit 1
    fi
    green "SQLite backup OK: $LOCAL_DB_BACKUP ($(du -sh "$LOCAL_DB_BACKUP" | cut -f1))"
  fi
fi

# ─── 8. scp to EC2 ───────────────────────────────────────────────────────────
blue "==> Preparing remote incoming directory"
if "$DRY_RUN"; then
  dry_run_echo "ssh $EC2_USER@$EC2_IP mkdir -p $INCOMING_DIR"
else
  ssh_cmd "mkdir -p $INCOMING_DIR"
fi

if ! "$SKIP_FRONTEND"; then
  blue "==> scp frontend tarball to EC2"
  if "$DRY_RUN"; then
    dry_run_echo "scp $FRONTEND_TAR $EC2_USER@$EC2_IP:$INCOMING_DIR/"
  else
    step_with_log "scp frontend tarball" \
      scp_cmd "$FRONTEND_TAR" "${EC2_USER}@${EC2_IP}:${INCOMING_DIR}/"
  fi
fi

if ! "$SKIP_DB"; then
  blue "==> scp app.db to EC2"
  if "$DRY_RUN"; then
    dry_run_echo "scp $LOCAL_DB_BACKUP $EC2_USER@$EC2_IP:$INCOMING_DIR/app.db"
  else
    step_with_log "scp app.db" \
      scp_cmd "$LOCAL_DB_BACKUP" "${EC2_USER}@${EC2_IP}:${INCOMING_DIR}/app.db"
  fi
fi

# ─── 9. Remote deploy via SSH heredoc ────────────────────────────────────────
blue "==> Running remote deploy on EC2"

if "$DRY_RUN"; then
  dry_run_echo "--- would execute remote SSH heredoc: ---"
  dry_run_echo "  Backup current app.db to app.db.before-deploy-$TIMESTAMP"
  if ! "$SKIP_DB"; then
    dry_run_echo "  docker stop language-backend"
    dry_run_echo "  cp $INCOMING_DIR/app.db $DEPLOY_DIR/backend/app.db"
    dry_run_echo "  docker start language-backend"
  fi
  if ! "$SKIP_FRONTEND"; then
    dry_run_echo "  docker load -i $INCOMING_DIR/deploy-frontend.tar.gz"
    dry_run_echo "  docker rm -f language-frontend"
    dry_run_echo "  docker run -d --name language-frontend --network language-app -p 80:80 --restart unless-stopped $FRONTEND_IMAGE"
  fi
  dry_run_echo "  Wait 60s for /api/cards/adaptive?language=de to return 200"
  dry_run_echo "  Smoke test /api/cards?language=de&limit=1"
  dry_run_echo "  rm -rf $INCOMING_DIR/*"
else
  ssh_cmd bash <<ENDSSH
set -euo pipefail

DEPLOY_DIR="$DEPLOY_DIR"
INCOMING_DIR="$INCOMING_DIR"
TIMESTAMP="$TIMESTAMP"
SKIP_DB="$SKIP_DB"
SKIP_FRONTEND="$SKIP_FRONTEND"
FRONTEND_IMAGE="$FRONTEND_IMAGE"

echo "==> [remote] Backing up current app.db"
if [[ -f "\${DEPLOY_DIR}/backend/app.db" ]]; then
  cp "\${DEPLOY_DIR}/backend/app.db" "\${DEPLOY_DIR}/backend/app.db.before-deploy-\${TIMESTAMP}"
  echo "Backup: \${DEPLOY_DIR}/backend/app.db.before-deploy-\${TIMESTAMP}"
else
  echo "No existing app.db to back up (first deploy?)"
fi

if [[ "\${SKIP_DB}" == "false" ]]; then
  echo "==> [remote] Stopping backend container before swapping app.db (WAL safety)"
  docker stop language-backend 2>/dev/null || true

  echo "==> [remote] Swapping app.db"
  mkdir -p "\${DEPLOY_DIR}/backend"
  cp "\${INCOMING_DIR}/app.db" "\${DEPLOY_DIR}/backend/app.db"

  echo "==> [remote] Starting backend container"
  docker start language-backend
fi

if [[ "\${SKIP_FRONTEND}" == "false" ]]; then
  echo "==> [remote] Loading frontend Docker image"
  docker load -i "\${INCOMING_DIR}/deploy-frontend.tar.gz"

  echo "==> [remote] Recreating language-frontend container"
  docker rm -f language-frontend 2>/dev/null || true
  docker run -d \
    --name language-frontend \
    --network language-app \
    -p 80:80 \
    --restart unless-stopped \
    "\${FRONTEND_IMAGE}"
fi

echo "==> [remote] Waiting for backend health (up to 60s)"
for i in \$(seq 1 30); do
  if curl -fsS --max-time 5 'http://localhost/api/cards/adaptive?language=de&limit=1' >/dev/null 2>&1; then
    echo "Backend healthy after \$((i*2))s"
    break
  fi
  if [[ "\$i" -eq 30 ]]; then
    echo "ERROR: backend did not become healthy in 60s" >&2
    docker ps
    docker logs language-backend --tail 30
    exit 1
  fi
  sleep 2
done

echo "==> [remote] Smoke test: /api/cards?language=de&limit=1"
SMOKE="\$(curl -fsS --max-time 10 'http://localhost/api/cards?language=de&limit=1')"
if echo "\${SMOKE}" | python3 -c "import sys, json; d=json.load(sys.stdin); assert isinstance(d,list) and len(d)>0 and 'image_base64' in d[0], 'smoke failed'" 2>&1; then
  echo "Smoke test PASSED"
else
  echo "Smoke test FAILED: \${SMOKE}" >&2
  exit 1
fi

echo "==> [remote] Cleanup incoming"
rm -rf "\${INCOMING_DIR:?}/*"

echo "==> [remote] Running containers:"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
ENDSSH
fi

# ─── 10. External smoke test ─────────────────────────────────────────────────
blue "==> External smoke test from local"
if "$DRY_RUN"; then
  dry_run_echo "curl -fsS --max-time 15 http://$EC2_IP/ => 200"
  dry_run_echo "curl -fsS --max-time 15 http://$EC2_IP/api/cards?language=de&limit=1 => valid JSON with image_base64"
else
  HTTP_STATUS="$(curl -o /dev/null -s -w '%{http_code}' --max-time 15 "http://$EC2_IP/")"
  if [[ "$HTTP_STATUS" != "200" ]]; then
    red "External smoke: http://$EC2_IP/ returned $HTTP_STATUS (expected 200)"
    exit 1
  fi
  green "External smoke: http://$EC2_IP/ => $HTTP_STATUS OK"

  CARDS="$(curl -fsS --max-time 15 "http://$EC2_IP/api/cards?language=de&limit=1")"
  if echo "$CARDS" | python3 -c "import sys, json; d=json.load(sys.stdin); assert isinstance(d,list) and len(d)>0 and 'image_base64' in d[0]" 2>&1; then
    green "External smoke: /api/cards?language=de&limit=1 OK"
  else
    red "External smoke: /api/cards?language=de&limit=1 returned unexpected response"
    echo "$CARDS" | head -c 500
    exit 1
  fi
fi

# ─── 11. Close SSH SG ────────────────────────────────────────────────────────
# (trap will also call this on EXIT, but we call it explicitly here so the summary prints after)
if ! "$DRY_RUN"; then
  close_sg_rule
fi

# ─── 12. Summary ─────────────────────────────────────────────────────────────
blue "==> Deploy summary"
echo "  Image:        $FRONTEND_IMAGE"
echo "  EC2:          http://$EC2_IP"
echo "  Timestamp:    $TIMESTAMP"

if ! "$SKIP_DB" && ! "$DRY_RUN"; then
  echo "  DB backup:    $DEPLOY_DIR/backend/app.db.before-deploy-$TIMESTAMP (on EC2)"
  echo "  Local backup: $LOCAL_DB_BACKUP"

  blue "  Row counts via API:"
  for lang in de fr it; do
    COUNT="$(curl -fsS --max-time 10 "http://$EC2_IP/api/cards?language=$lang&limit=9999" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo 'n/a')"
    echo "    $lang: $COUNT cards"
  done
fi

if "$DRY_RUN"; then
  blue "  [dry-run] no actual deploy performed"
fi

green "==> DONE"
