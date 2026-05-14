#!/usr/bin/env bash
# Backend-only deploy for tinder-for-languages.
# Builds an ARM64 image from backend/Dockerfile, scps the tarball, recreates the
# language-backend container preserving network, env, mounts, and restart policy.
# Usage: scripts/deploy_backend_to_ec2.sh [--skip-build]

set -euo pipefail

source "$(dirname "$0")/_ec2_deploy_lib.sh"

CONTAINER="language-backend"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
IMAGE="language-app-backend:cloud-${TIMESTAMP}"
TAR="/tmp/deploy-backend.tar.gz"

SKIP_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    *) echo "Unknown flag: $arg" >&2; exit 1 ;;
  esac
done

trap 'close_ssh_sg' EXIT

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 1. Build
if ! "$SKIP_BUILD"; then
  blue "==> Building $IMAGE (ARM64)"
  (cd "$REPO_ROOT/backend" && docker buildx build --platform linux/arm64 --load -t "$IMAGE" .)
  green "Backend image built"

  blue "==> Saving image to $TAR"
  docker save "$IMAGE" | gzip > "$TAR"
  green "Tarball: $TAR ($(du -sh "$TAR" | cut -f1))"
else
  if [[ ! -f "$TAR" ]]; then
    red "$TAR missing and --skip-build was passed."
    exit 1
  fi
  # Resolve image tag from the saved tar so the remote `docker run` uses the
  # tag that's actually inside the tarball, not a fresh timestamp.
  IMAGE="$(gzip -dc "$TAR" | tar -O -xf - manifest.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['RepoTags'][0])" 2>/dev/null || echo "$IMAGE")"
  blue "==> Skipping build, using $IMAGE from $TAR"
fi

# 2. Open SSH SG
open_ssh_sg

# 3. scp tarball
blue "==> scp tarball to EC2"
ssh_cmd "mkdir -p $INCOMING_DIR"
scp_cmd "$TAR" "${EC2_USER}@${EC2_IP}:${INCOMING_DIR}/deploy-backend.tar.gz"

# 4. Remote deploy (preserve mounts/env via inspect)
blue "==> Remote deploy: inspect old config, replace container"
ssh_cmd bash <<ENDSSH
set -euo pipefail

INCOMING_DIR="$INCOMING_DIR"
CONTAINER="$CONTAINER"
NETWORK="$NETWORK"
NEW_IMAGE="$IMAGE"
ENV_FILE="/home/ec2-user/language-deploy/backend.prod.env"

echo "==> [remote] Inspecting old $CONTAINER for config"
if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "ERROR: container $CONTAINER not found on EC2. Manual setup needed." >&2
  exit 1
fi

# Env comes from a persistent file on the EC2, NOT from inspecting the old
# container. Inspecting + re-quoting (printf %q) compounds across deploys:
# each run re-quotes already-quoted vars, eventually mangling DB_HOST etc. into
# literal-quoted garbage so the backend silently falls back to localhost.
if [[ ! -f "\$ENV_FILE" ]]; then
  echo "ERROR: \$ENV_FILE missing on EC2 — backend env unknown." >&2
  echo "Create it (chmod 600) with USE_SQLITE=false, DB_HOST=language-postgres, DB_* and API keys." >&2
  exit 1
fi

# Mounts and restart policy ARE safe to carry over from inspect (no quoting).
MOUNT_ARGS="\$(docker inspect "$CONTAINER" --format '{{range .Mounts}}-v {{.Source}}:{{.Destination}} {{end}}')"
PORT_ARGS="\$(docker inspect "$CONTAINER" --format '{{range \$p, \$conf := .HostConfig.PortBindings}}{{range \$conf}}-p {{.HostPort}}:{{\$p}} {{end}}{{end}}' | sed 's|/tcp||g')"
RESTART="\$(docker inspect "$CONTAINER" --format '{{.HostConfig.RestartPolicy.Name}}')"
[[ -z "\$RESTART" || "\$RESTART" == "no" ]] && RESTART="unless-stopped"

echo "  Mounts: \$MOUNT_ARGS"
echo "  Env file: \$ENV_FILE (\$(wc -l < "\$ENV_FILE") vars)"
echo "  Ports: \$PORT_ARGS"
echo "  Restart: \$RESTART"

echo "==> [remote] Loading new image"
docker load -i "\${INCOMING_DIR}/deploy-backend.tar.gz"

echo "==> [remote] Stopping & removing old container"
docker stop "$CONTAINER" 2>/dev/null || true
docker rm "$CONTAINER" 2>/dev/null || true

echo "==> [remote] Starting new container with image \$NEW_IMAGE"
# shellcheck disable=SC2086
docker run -d \\
  --name "$CONTAINER" \\
  --network "$NETWORK" \\
  --restart "\$RESTART" \\
  \$MOUNT_ARGS \\
  --env-file "\$ENV_FILE" \\
  \$PORT_ARGS \\
  "\$NEW_IMAGE"

# Recreating the backend can change its Docker-network IP; nginx caches the old
# one and returns 502 until restarted. Restart the frontend so it re-resolves.
echo "==> [remote] Restarting language-frontend (nginx) to re-resolve backend IP"
docker restart language-frontend >/dev/null 2>&1 || true

echo "==> [remote] Wait for backend health (up to 60s)"
for i in \$(seq 1 30); do
  if curl -fsS --max-time 5 'http://localhost/api/cards/adaptive?language=de&limit=1' >/dev/null 2>&1; then
    echo "Backend healthy after \$((i*2))s"
    break
  fi
  if [[ "\$i" -eq 30 ]]; then
    echo "ERROR: backend did not become healthy in 60s" >&2
    docker ps -a --format 'table {{.Names}}\t{{.Status}}'
    docker logs "$CONTAINER" --tail 50
    exit 1
  fi
  sleep 2
done

echo "==> [remote] Test /api/users endpoint"
# POST /api/users should return 4xx for missing payload, NOT 404
USERS_STATUS=\$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost/api/users -H "Content-Type: application/json" -d '{}')
echo "POST /api/users -> HTTP \$USERS_STATUS"
if [[ "\$USERS_STATUS" == "404" ]]; then
  echo "ERROR: /api/users still returns 404" >&2
  exit 1
fi

echo "==> [remote] Cleanup incoming"
rm -f "\${INCOMING_DIR}/deploy-backend.tar.gz"

echo "==> [remote] Running containers:"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
ENDSSH

# 5. External smoke
blue "==> External smoke test"
HTTP_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://$EC2_IP/api/cards?language=de&limit=1")
[[ "$HTTP_STATUS" == "200" ]] && green "External /api/cards => 200 OK" || { red "External /api/cards => $HTTP_STATUS"; exit 1; }

USERS_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -X POST "http://$EC2_IP/api/users" -H "Content-Type: application/json" -d '{}')
green "External POST /api/users => $USERS_STATUS (anything except 404 = endpoint exists)"

blue "==> Deploy summary"
echo "  Image:    $IMAGE"
echo "  EC2:      http://$EC2_IP"
echo "  When:     $TIMESTAMP"
green "==> DONE"
