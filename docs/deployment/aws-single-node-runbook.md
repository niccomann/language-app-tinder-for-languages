# AWS Single-Node Deploy Runbook

This runbook recreates the current low-cost AWS deploy for the language app.

## Target Shape

- One EC2 `t4g.small` instance in `eu-central-1`.
- One Elastic IP.
- Docker containers on the instance:
  - `language-frontend`: Nginx static frontend, public port `80`.
  - `language-backend`: FastAPI, private Docker network only.
  - `language-postgres`: PostgreSQL 15, private Docker network only.
- No EKS, NAT Gateway, SageMaker, Bedrock, GPU, or cloud AI inference.
- No OpenAI/Gemini/HF/BFL/AWS secret environment variables inside app containers.

## Current Production

- URL: `http://3.64.236.66`
- EC2 instance: `i-04fb87478e0a30ee0`
- Instance type: `t4g.small`
- Cost tag: `CostGuardrail=no-ai-single-node`

## Local Preflight

From `tinder-for-languages`:

```bash
git status --short
backend/.venv/bin/python scripts/data_quality_report.py --min-german-words 500
cd backend && .venv/bin/python -m pytest tests/test_cloud_ai_disabled.py tests/test_library_routes.py -q
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
docker build --platform linux/arm64 -t language-app-backend:cloud backend

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

mkdir -p /tmp/language-app-cloud
docker exec tinder-languages-postgres pg_dump \
  -U tinder_user \
  -d tinder_languages_db \
  --format custom \
  --no-owner > /tmp/language-app-cloud/language-db.dump

docker save language-app-backend:cloud language-app-frontend:cloud \
  | gzip > /tmp/language-app-cloud/language-app-images.tar.gz
```

Use `docker exec ... pg_dump` so the dump client matches the Postgres 15 server.

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
- SSH `22` restricted to your current IP
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
scp -i "$SSH_KEY_PATH" \
  /tmp/language-app-cloud/language-app-images.tar.gz \
  /tmp/language-app-cloud/language-db.dump \
  ec2-user@"$PUBLIC_IP":/home/ec2-user/
```

Start containers:

```bash
DB_PASSWORD="$(openssl rand -hex 24)"

ssh -i "$SSH_KEY_PATH" ec2-user@"$PUBLIC_IP" "DB_PASSWORD='$DB_PASSWORD' bash -s" <<'EOS'
set -euo pipefail

sudo docker load -i /home/ec2-user/language-app-images.tar.gz
sudo docker network create language-app >/dev/null 2>&1 || true
sudo docker volume create language-postgres-data >/dev/null
sudo docker volume create language-tracking-data >/dev/null
sudo docker rm -f language-frontend language-backend language-postgres >/dev/null 2>&1 || true

sudo docker run -d --name language-postgres \
  --network language-app \
  -e POSTGRES_DB=tinder_languages_db \
  -e POSTGRES_USER=tinder_user \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -v language-postgres-data:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:15 >/dev/null

for i in $(seq 1 60); do
  sudo docker exec language-postgres pg_isready -U tinder_user -d tinder_languages_db >/dev/null 2>&1 && break
  sleep 2
done

sudo docker exec -i language-postgres pg_restore \
  -U tinder_user \
  -d tinder_languages_db \
  --clean \
  --if-exists \
  --no-owner < /home/ec2-user/language-db.dump

sudo docker run -d --name language-backend \
  --network language-app \
  --network-alias backend \
  -e DB_HOST=language-postgres \
  -e DB_PORT=5432 \
  -e DB_USER=tinder_user \
  -e DB_PASSWORD="$DB_PASSWORD" \
  -e DB_DATABASE=tinder_languages_db \
  -e DB_SCHEMA=public \
  -e ENV=prod \
  -e LOG_LEVEL=INFO \
  -e RECREATE_DB=False \
  -e TRACKING_DB_PATH=/app/data/tracking.db \
  -v language-tracking-data:/app/data \
  --restart unless-stopped \
  language-app-backend:cloud >/dev/null

for i in $(seq 1 60); do
  sudo docker run --rm --network language-app curlimages/curl:8.10.1 -fsS http://backend:8500/health >/dev/null 2>&1 && break
  sleep 2
done

sudo docker run -d --name language-frontend \
  --network language-app \
  -p 80:80 \
  --restart unless-stopped \
  language-app-frontend:cloud >/dev/null

sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
EOS
```

The `--network-alias backend` is required because `frontend/nginx.conf` proxies `/api` to `http://backend:8500`.

## Smoke Test

From local machine:

```bash
BASE="http://$PUBLIC_IP"
curl -I --max-time 10 "$BASE/"
curl -fsS --max-time 20 "$BASE/api/library/stats?language=de" \
  | jq '{total_words, words_with_examples, words_with_etymology}'
curl -fsS --max-time 20 "$BASE/api/library/words?language=de&limit=5" | jq 'length'
curl -fsS --max-time 20 "$BASE/api/library/words/103/db-row" \
  | jq '.related.verb_conjugations | length'
```

Expected:

- frontend returns `HTTP/1.1 200 OK`
- stats show `total_words: 650`
- word sample length is `5`
- word `103` has at least `6` conjugations; current deploy has `24`

## No-AI Verification

```bash
ssh -i "$SSH_KEY_PATH" ec2-user@"$PUBLIC_IP" '
for c in language-backend language-frontend language-postgres; do
  echo "## $c"
  sudo docker inspect "$c" --format "{{range .Config.Env}}{{println .}}{{end}}" \
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

## Cleanup

Do not delete unrelated S3 buckets.

For this deploy only, delete:

- EC2 instance
- Elastic IP allocation
- security group
- key pair

Use the IDs captured during provisioning. Release the Elastic IP after terminating the instance, otherwise AWS can charge for an unattached address.
