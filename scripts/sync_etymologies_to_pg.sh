#!/usr/bin/env bash
# Load LLM-generated etymologies into prod Postgres.
#
# Ships the local export JSON + the loader script to the EC2, copies them into
# the language-backend container, and runs the loader there (so it reuses the
# app's DB engine/credentials). Additive + idempotent — safe to re-run.
#
# Prereqs:
#   - Run export_etymologies.py first (default out: /tmp/etymologies_export.json)
#   - Back up the etymologies table on prod first — DB data is sacred.
#
# Usage: scripts/sync_etymologies_to_pg.sh [export.json]

set -euo pipefail
source "$(dirname "$0")/_ec2_deploy_lib.sh"

EXPORT_JSON="${1:-/tmp/etymologies_export.json}"
LOADER="$(cd "$(dirname "$0")/../.." && pwd)/language_info_extraction/scripts/load_etymologies_to_pg.py"
CONTAINER="language-backend"

[[ -f "$EXPORT_JSON" ]] || { red "Export JSON not found: $EXPORT_JSON"; exit 1; }
[[ -f "$LOADER" ]] || { red "Loader not found: $LOADER"; exit 1; }

trap 'close_ssh_sg' EXIT
open_ssh_sg

blue "==> Shipping export + loader to EC2"
ssh_cmd "mkdir -p $INCOMING_DIR"
scp_cmd "$EXPORT_JSON" "${EC2_USER}@${EC2_IP}:${INCOMING_DIR}/etymologies_export.json"
scp_cmd "$LOADER" "${EC2_USER}@${EC2_IP}:${INCOMING_DIR}/load_etymologies_to_pg.py"

blue "==> Copying into $CONTAINER"
ssh_cmd "docker cp ${INCOMING_DIR}/etymologies_export.json ${CONTAINER}:/tmp/etymologies_export.json"
ssh_cmd "docker cp ${INCOMING_DIR}/load_etymologies_to_pg.py ${CONTAINER}:/tmp/load_etymologies_to_pg.py"

blue "==> Running loader in $CONTAINER"
ssh_cmd "docker exec -w /app -e PYTHONPATH=/app $CONTAINER python3 /tmp/load_etymologies_to_pg.py /tmp/etymologies_export.json"

green "==> DONE"
