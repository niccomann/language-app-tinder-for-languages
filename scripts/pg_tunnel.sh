#!/usr/bin/env bash
# Open an SSH tunnel from localhost to the EC2 Postgres container.
# Keep this running while doing local development — backend/.env points the
# local backend at localhost:<port> which this tunnel forwards to the EC2
# language-postgres container.
#
# Usage: scripts/pg_tunnel.sh [local_port]   (default 5434)
# Ctrl-C to close the tunnel (also revokes the temporary SSH SG rule).

set -euo pipefail
source "$(dirname "$0")/_ec2_deploy_lib.sh"

LOCAL_PORT="${1:-5434}"

trap 'close_ssh_sg' EXIT
open_ssh_sg

green "Tunnel up: localhost:${LOCAL_PORT} -> EC2 -> language-postgres:5432"
green "Keep this terminal open while developing locally. Ctrl-C to close."
# -N: no remote command, just forward. Exits on Ctrl-C -> trap closes the SG.
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ServerAliveInterval=30 \
  -N -L "${LOCAL_PORT}:localhost:5432" "${EC2_USER}@${EC2_IP}"
