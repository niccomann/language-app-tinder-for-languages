#!/usr/bin/env bash
# On-demand off-EC2 backup of the Postgres DB.
# Triggers a fresh pg_dump on the EC2, pulls it down to ./backups/.
# Run this before risky operations and periodically.
#
# The EC2 also runs a daily local pg_dump (cron 03:30, 7-day rotation) in
# /home/ec2-user/pg-backups/ — but that does NOT survive EC2 loss, so pulling
# a copy down with this script is the real off-box safety net. (A true S3
# auto-backup needs an IAM instance role on the EC2 — not set up yet.)

set -euo pipefail
source "$(dirname "$0")/_ec2_deploy_lib.sh"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST_DIR="$REPO_ROOT/backups"
mkdir -p "$DEST_DIR"

trap 'close_ssh_sg' EXIT
open_ssh_sg

blue "==> Triggering fresh pg_dump on EC2"
ssh_cmd "/home/ec2-user/pg-backup.sh"

LATEST=$(ssh_cmd "ls -1t /home/ec2-user/pg-backups/tinder_languages-*.sql.gz | head -1")
[[ -z "$LATEST" ]] && { red "No backup found on EC2"; exit 1; }

blue "==> Pulling $LATEST"
scp_cmd "${EC2_USER}@${EC2_IP}:${LATEST}" "$DEST_DIR/$(basename "$LATEST")"
green "Off-EC2 backup: backups/$(basename "$LATEST") ($(du -h "$DEST_DIR/$(basename "$LATEST")" | cut -f1))"

# local rotation: keep last 5
ls -1t "$DEST_DIR"/tinder_languages-*.sql.gz 2>/dev/null | tail -n +6 | xargs -r rm -f
green "==> DONE"
