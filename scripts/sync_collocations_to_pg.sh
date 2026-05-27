#!/usr/bin/env bash
# Load LLM-generated collocations into prod Postgres (additive, idempotent).
#
# Usage: scripts/sync_collocations_to_pg.sh [export.json]

set -euo pipefail
source "$(dirname "$0")/_ec2_deploy_lib.sh"

EXPORT_JSON="${1:-/tmp/collocations_export.json}"
LOADER="$(cd "$(dirname "$0")/../.." && pwd)/language_info_extraction/scripts/load_collocations_to_pg.py"
CONTAINER="language-backend"

[[ -f "$EXPORT_JSON" ]] || { red "Export JSON not found: $EXPORT_JSON"; exit 1; }
[[ -f "$LOADER" ]] || { red "Loader not found: $LOADER"; exit 1; }

trap 'close_ssh_sg' EXIT
open_ssh_sg

blue "==> Shipping export + loader to EC2"
ssh_cmd "mkdir -p $INCOMING_DIR"
scp_cmd "$EXPORT_JSON" "${EC2_USER}@${EC2_IP}:${INCOMING_DIR}/collocations_export.json"
scp_cmd "$LOADER" "${EC2_USER}@${EC2_IP}:${INCOMING_DIR}/load_collocations_to_pg.py"

blue "==> Copying into $CONTAINER"
ssh_cmd "docker cp ${INCOMING_DIR}/collocations_export.json ${CONTAINER}:/tmp/collocations_export.json"
ssh_cmd "docker cp ${INCOMING_DIR}/load_collocations_to_pg.py ${CONTAINER}:/tmp/load_collocations_to_pg.py"

blue "==> Running loader in $CONTAINER"
ssh_cmd "docker exec -w /app -e PYTHONPATH=/app $CONTAINER python3 /tmp/load_collocations_to_pg.py /tmp/collocations_export.json"

green "==> DONE"
