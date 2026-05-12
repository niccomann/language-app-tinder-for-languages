> Last updated: 2026-05-12 17:30

# AWS Single-Node Deploy Runbook

This runbook recreates the current low-cost AWS deploy for the language app.

## Target Shape

- One EC2 `t4g.small` instance in `eu-central-1`.
- One Elastic IP.
- Docker containers on the instance:
  - `language-frontend`: Nginx static frontend, public port `80`.
  - `language-backend`: FastAPI, private Docker network only.
- SQLite database (`app.db`) mounted from host into the backend container.
- No EKS, NAT Gateway, SageMaker, Bedrock, GPU, or cloud AI inference.
- No OpenAI/Gemini/HF/BFL/AWS secret environment variables inside app containers.

## Current Production

- URL: `http://3.64.236.66`
- EC2 instance: `i-04fb87478e0a30ee0`
- Instance type: `t4g.small`
- Cost tag: `CostGuardrail=no-ai-single-node`

## Automated Deploy

**For day-to-day deploys, use the automated script instead of this manual runbook:**

```bash
scripts/deploy_to_ec2.sh [--skip-build] [--skip-db] [--skip-frontend] [--dry-run]
```

The script handles SG rule lifecycle, WAL-safe DB backup, ARM64 image build, scp, remote swap, and smoke tests automatically. See the script's top comment for full usage.

---

## Manual Deploy (step-by-step)

The rest of this document covers the manual steps for reference or when the script needs to be debugged.

## Local Preflight

From `tinder-for-languages`:

```bash
git status --short
backend/.venv/bin/python scripts/data_quality_report.py --min-german-words 500
cd backend && .venv/bin/python -m pytest tests/test_cloud_ai_disabled.py -q
cd ../frontend && npm run build:strict
```

Expected data quality minimums:

- `german_words >= 500`
- `german_words_missing_images = 0`
- `german_verbs_without_conjugations = 0`
- `german_verbs_with_sparse_conjugations = 0`

## Build Artifacts

Use ARM64 images for Graviton:

```bash
# Frontend dist
cd frontend && npm run build && cd ..

# ARM64 frontend Docker image
tmpdir="$(mktemp -d)"
cp -R frontend/dist "$tmpdir/dist"
cp frontend/nginx.conf "$tmpdir/nginx.conf"
cat > "$tmpdir/Dockerfile" <<'EOF'
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
docker build --platform linux/arm64 -t language-app-frontend:cloud "$tmpdir"

# SQLite online backup (WAL-safe — do NOT use cp while backend is running)
sqlite3 backend/app.db ".backup '/tmp/deploy-app.db'"
# Verify integrity before continuing
sqlite3 /tmp/deploy-app.db 'PRAGMA integrity_check;'   # must print: ok

# Save frontend image
docker save language-app-frontend:cloud | gzip > /tmp/language-app-frontend.tar.gz
```

## Provision AWS

Load credentials locally, but do not copy AWS keys to the instance:

```bash
set -a
source infrastructure/secrets/.env
set +a
REGION="${AWS_REGION:-eu-central-1}"
```

Create:

- EC2 `t4g.small`
- 20 GB `gp3` root volume
- security group with public `80`
- SSH `22` restricted to your current IP (open temporarily, close after deploy)
- Elastic IP

Do not create:

- EKS
- NAT Gateway
- RDS
- SageMaker
- Bedrock provisioned throughput
- GPU instances

## Install on the Instance

Transfer artifacts:

```bash
SSH_KEY="$HOME/.ssh/language-app-key-20260507132327.pem"
PUBLIC_IP="3.64.236.66"

scp -i "$SSH_KEY" \
  /tmp/language-app-frontend.tar.gz \
  /tmp/deploy-app.db \
  ec2-user@"$PUBLIC_IP":/home/ec2-user/deploy-incoming/
```

Start containers:

```bash
ssh -i "$SSH_KEY" ec2-user@"$PUBLIC_IP" bash <<'EOS'
set -euo pipefail
DEPLOY_DIR="/home/ec2-user/language-deploy/current"
INCOMING="/home/ec2-user/deploy-incoming"

# Create network if not exists
docker network create language-app 2>/dev/null || true

# Backup existing DB
cp "$DEPLOY_DIR/backend/app.db" "$DEPLOY_DIR/backend/app.db.before-deploy-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

# STOP BACKEND FIRST — avoids WAL contention during file replacement
docker stop language-backend 2>/dev/null || true

# Swap app.db
mkdir -p "$DEPLOY_DIR/backend"
cp "$INCOMING/app.db" "$DEPLOY_DIR/backend/app.db"

# Start backend
docker rm -f language-backend 2>/dev/null || true
docker run -d --name language-backend \
  --network language-app \
  --network-alias backend \
  -e USE_SQLITE=true \
  -e ENV=prod \
  -e LOG_LEVEL=INFO \
  -e RECREATE_DB=False \
  -v "$DEPLOY_DIR/backend/app.db:/app/app.db" \
  --restart unless-stopped \
  language-app-backend:cloud

# Load and start frontend
docker load -i "$INCOMING/language-app-frontend.tar.gz"
docker rm -f language-frontend 2>/dev/null || true
docker run -d --name language-frontend \
  --network language-app \
  -p 80:80 \
  --restart unless-stopped \
  language-app-frontend:cloud

docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
EOS
```

The `--network-alias backend` is required because `frontend/nginx.conf` proxies `/api` to `http://backend:8500`.

## Smoke Test

From local machine:

```bash
BASE="http://3.64.236.66"
curl -I --max-time 10 "$BASE/"
curl -fsS --max-time 20 "$BASE/api/library/stats?language=de" \
  | python3 -m json.tool
curl -fsS --max-time 20 "$BASE/api/cards?language=de&limit=5" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d), 'cards'); print('image_base64 present:', 'image_base64' in d[0])"
```

Expected:

- frontend returns `HTTP/1.1 200 OK`
- stats show `total_words >= 500`
- cards endpoint returns 5 items, each with `image_base64` field

## No-AI Verification

```bash
SSH_KEY="$HOME/.ssh/language-app-key-20260507132327.pem"
ssh -i "$SSH_KEY" ec2-user@3.64.236.66 '
for c in language-backend language-frontend; do
  echo "## $c"
  docker inspect "$c" --format "{{range .Config.Env}}{{println .}}{{end}}" \
    | grep -E "(OPENAI|GEMINI|HF_TOKEN|BFL|AWS_ACCESS|AWS_SECRET)" \
    || echo "no AI/AWS secret env"
done
'

for region in eu-central-1 us-east-1 us-west-2; do
  aws sagemaker list-endpoints --region "$region" \
    --query 'Endpoints[].[EndpointName,EndpointStatus]' --output text
  aws bedrock list-provisioned-model-throughputs --region "$region" \
    --query 'provisionedModelSummaries[].[provisionedModelName,status]' --output text
done
```

Expected:

- every app container prints `no AI/AWS secret env`
- SageMaker and Bedrock commands print no endpoints/throughputs

## Common Pitfalls

### Always use `sqlite3 .backup`, not `cp`

Copying `app.db` while the backend is running produces a malformed file because of WAL (Write-Ahead Log) contention. The SQLite `.backup` command is the only safe way to snapshot a live database:

```bash
sqlite3 backend/app.db ".backup '/tmp/deploy-app.db'"
sqlite3 /tmp/deploy-app.db 'PRAGMA integrity_check;'   # must return: ok
```

### Always stop the backend container before swapping app.db

Even after a clean `.backup`, replacing `app.db` on disk while the backend has it open will corrupt the WAL state. Always `docker stop language-backend` before the file swap, then `docker start` or `docker run` after. This was the root cause of two separate production incidents.

### Cross-platform SQLite incompatibility

macOS ships sqlite 3.43.2; the Linux ARM64 container runs sqlite 3.46.1. Files written by one version can produce `database disk image is malformed` on the other, especially for large BLOB-heavy tables (the `image_base64` column is the main risk). Mitigation: when you need to update records, prefer running the UPDATE/INSERT directly on the running container:

```bash
docker exec language-backend python3 -c "
import sqlite3; c = sqlite3.connect('/app/app.db')
c.execute(\"UPDATE cards SET ...\")
c.commit(); c.close()
"
```

### Security group — port 22 is NOT permanently open

The security group `sg-032f76424400a35a7` exposes only port 80. Before any SSH or scp operation, open port 22 from your current IP, and revoke the rule immediately after:

```bash
MY_IP="$(curl -s https://api.ipify.org)"
# Open
aws ec2 authorize-security-group-ingress \
  --region eu-central-1 --group-id sg-032f76424400a35a7 \
  --protocol tcp --port 22 --cidr "$MY_IP/32"
# ... do SSH/scp ...
# Close
aws ec2 revoke-security-group-ingress \
  --region eu-central-1 --group-id sg-032f76424400a35a7 \
  --protocol tcp --port 22 --cidr "$MY_IP/32"
```

The automated `scripts/deploy_to_ec2.sh` handles this with a `trap EXIT` so the rule is always cleaned up.

### SSH user is `ec2-user`, not `ubuntu`

The AMI is Amazon Linux 2023 ARM64. The default user is `ec2-user`. Using `ubuntu` will fail silently with a permission denied.

### Architecture is ARM64 — always build with `--platform linux/arm64`

The instance is a `t4g.small` (Graviton3). Building an amd64 image will work via QEMU emulation but runs noticeably slower and wastes memory. Always pass `--platform linux/arm64` to `docker build`.

### `infrastructure/scripts/deploy.sh` is OBSOLETE for prod

The script at `infrastructure/scripts/deploy.sh` targets an EKS cluster that no longer exists. For production deployments use `scripts/deploy_to_ec2.sh`.

## Cleanup

Do not delete unrelated S3 buckets.

For this deploy only, delete:

- EC2 instance
- Elastic IP allocation
- security group
- key pair

Use the IDs captured during provisioning. Release the Elastic IP after terminating the instance, otherwise AWS can charge for an unattached address.
