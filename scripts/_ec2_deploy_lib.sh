#!/usr/bin/env bash
# Shared infrastructure for EC2 single-node Docker deploys.
# Source this from deploy scripts: `source "$(dirname "$0")/_ec2_deploy_lib.sh"`
#
# NOTE: deploy_backend_to_ec2.sh uses this lib. deploy_to_ec2.sh still inlines
# its own copies (it predates the lib and has --dry-run branching woven through
# the SG logic) — migrate it here when it next gets touched.

# ─── Constants ───────────────────────────────────────────────────────────────
EC2_IP="3.64.236.66"
EC2_USER="ec2-user"
SSH_KEY="${HOME}/.ssh/language-app-key-20260507132327.pem"
SG_ID="sg-032f76424400a35a7"
AWS_REGION="eu-central-1"
DEPLOY_DIR="/home/ec2-user/language-deploy/current"
INCOMING_DIR="/home/ec2-user/deploy-incoming"
NETWORK="language-app"

# ─── Color helpers ───────────────────────────────────────────────────────────
red()   { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
blue()  { printf '\033[0;34m%s\033[0m\n' "$*"; }

# ─── Temporary SSH security-group rule ───────────────────────────────────────
SG_RULE_ID=""

open_ssh_sg() {
  local my_ip
  my_ip="$(curl -s https://api.ipify.org || true)"
  [[ -z "$my_ip" ]] && { red "Could not detect public IP — check network/VPN."; return 1; }
  blue "==> Opening port 22 on SG $SG_ID for $my_ip/32"
  local json
  json="$(aws ec2 authorize-security-group-ingress \
    --region "$AWS_REGION" --group-id "$SG_ID" \
    --protocol tcp --port 22 --cidr "$my_ip/32" --output json)"
  SG_RULE_ID="$(echo "$json" | python3 -c "import sys,json; r=json.load(sys.stdin).get('SecurityGroupRules',[]); print(r[0]['SecurityGroupRuleId'] if r else '')" 2>/dev/null || true)"
  [[ -z "$SG_RULE_ID" ]] && { red "Could not parse SG rule ID — aborting."; return 1; }
  green "SG rule opened: $SG_RULE_ID"
}

close_ssh_sg() {
  [[ -z "$SG_RULE_ID" ]] && return 0
  blue "==> Revoking SSH SG rule $SG_RULE_ID"
  aws ec2 revoke-security-group-ingress \
    --region "$AWS_REGION" --group-id "$SG_ID" \
    --security-group-rule-ids "$SG_RULE_ID" \
    2>/dev/null && green "SSH SG rule revoked." || true
  SG_RULE_ID=""
}

# ─── SSH / SCP helpers (target the EC2 host) ─────────────────────────────────
ssh_cmd() {
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=15 \
    "${EC2_USER}@${EC2_IP}" "$@"
}

scp_cmd() {
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$@"
}
