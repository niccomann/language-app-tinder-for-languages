> Last updated: 2026-05-14 02:15

# Deploy playbook (EC2, single-node Docker)

Lean checklist per un deploy veloce a http://3.64.236.66/. Tutti i comandi vanno lanciati dal repo root `tinder-for-languages/`.

## TL;DR — deploy frontend (UI-only)

```bash
scripts/deploy_to_ec2.sh --skip-db
```

## TL;DR — deploy backend (richiesto quando aggiungi/modifichi route Python)

```bash
scripts/deploy_backend_to_ec2.sh
```

Tempo realistico: **frontend 3-5 min**, **backend 5-7 min** (build ARM64 + scp 185MB). Lo script backend fa `docker inspect` del container vecchio e preserva mounts/env/network/restart policy.

⚠️ **`deploy_to_ec2.sh` NON tocca il backend.** Se aggiungi un endpoint Python o modifichi `requirements.txt`, devi lanciare `deploy_backend_to_ec2.sh` separatamente.

## Prerequisites (controlla in ordine)

| Check | Comando rapido | Note |
|---|---|---|
| Docker Desktop locale UP | `docker info > /dev/null && echo OK` | Va avviato a mano (Launchpad → Docker). Plan ~30-60s. **Lo script NON lo lancia per te.** |
| AWS auth | `aws sts get-caller-identity` | Deve mostrare account `664111151564`, region `eu-central-1`. |
| SSH key | `ls ~/.ssh/language-app-key-20260507132327.pem` | Permessi `600`. |
| Frontend buildato? | `ls frontend/dist/index.html` | Se manca o è vecchio, lo script lo rifa (a meno di `--skip-build`). |

## Flag dello script

- `--skip-db` — **default sicuro per UI-only**. Non sovrascrive `app.db` su EC2 con quello locale. Usa sempre questo a meno di aver consapevolmente modificato il DB locale.
- `--skip-build` — salta `npm run build`, ma l'immagine Docker viene comunque ricostruita (include nginx.conf + dist/ già presenti). Utile per redeploy veloci dopo un fix di config.
- `--skip-frontend` — salta tutto il blocco frontend. Usato di rado.
- `--dry-run` — simula senza modificare nulla. Buono per validare il flow.

## Quello che lo script fa (in ordine)

1. Preflight: docker, aws, ssh, scp, npm, sqlite3
2. Rileva il tuo IP pubblico via `api.ipify.org`
3. Apre **temporaneamente** porta 22 sul SG `sg-032f76424400a35a7` per il tuo IP/32
4. Build `frontend/dist/` con `npm run build`
5. Build immagine Docker `language-app-frontend:cloud` ARM64 (nginx + dist + nginx.conf)
6. `docker save` → tarball `/tmp/deploy-frontend.tar.gz`
7. (Se non `--skip-db`) backup SQLite locale + integrity check
8. `scp` tarball (+ eventuale `app.db`) su EC2
9. SSH heredoc: load image, recreate container `language-frontend`
10. Health check: `curl http://localhost/api/cards/adaptive?language=de` da EC2 fino a 60s
11. Smoke test esterno: `http://EC2_IP/` e `/api/cards?language=de&limit=1`
12. Revoca SG SSH (trap su EXIT, anche su failure)

## Costanti hardcoded

```
EC2_IP        = 3.64.236.66
EC2_USER      = ec2-user
SSH_KEY       = ~/.ssh/language-app-key-20260507132327.pem
SG_ID         = sg-032f76424400a35a7
AWS_REGION    = eu-central-1
DEPLOY_DIR    = /home/ec2-user/language-deploy/current   (su EC2)
INCOMING_DIR  = /home/ec2-user/deploy-incoming            (su EC2)
NETWORK       = language-app
CONTAINER_FE  = language-frontend
CONTAINER_BE  = language-backend
```

## Lezioni dalla sessione 2026-05-13/14

### Cosa è andato bene
- **`docker inspect` runtime** per recuperare la config del container vecchio funziona bene: preserva mounts (`/home/ec2-user/language-deploy/current/backend/app.db:/app/app.db` e volume `language-tracking-data:/app/data`), env (40 vars inclusa `OPENAI_API_KEY`), network (`language-app`), restart policy.
- **Smoke test esterno** alla fine ha catturato il primo deploy rotto (nginx in restart loop).
- **`--skip-db` di default** ha salvato il DB di produzione durante 3 redeploy del frontend.
- **AWS creds + SSH key** già configurate; nessuna sorpresa.
- **`scripts/deploy_backend_to_ec2.sh`** (nuovo, in questo repo) replica il pattern del deploy frontend.

### Cosa è andato male (in ordine di gravità)
1. **Backend pre-esistente era 19 ore vecchio** rispetto al frontend deployato → `/api/users` 404 in prod (frontend nuovo chiama endpoint che il backend vecchio non conosce). Lo `deploy_to_ec2.sh` non aggiorna il backend. **Lesson:** ogni deploy frontend dopo cambi al backend → lanciare anche `deploy_backend_to_ec2.sh`.
2. **`nginx.conf` con upstream sbagliato**: `proxy_pass http://backend:8500` → `language-backend:8500` (container DNS name). Già fixato nel repo; verifica con `grep proxy_pass frontend/nginx.conf`.
3. **`backend/.dockerignore` incompleto**: copiava ~20 file `app.before-*.db` da ~100-300 MB ciascuno. **Fix nel repo**: il `.dockerignore` ora esclude `app.before-*.db`, `app.db.*`, `app.interrupted-*.db`, `app.wordfreq-*.db`, `tracking.db*`, `asset_cache`, `*.tar.gz`. Build size: 185 MB compressed (Python 3.11-slim + deps).
4. **Disco quasi pieno** (1.6 GiB liberi) ha causato I/O error in `docker build`. **Fix:** `docker system prune -af --volumes` recupera ~12 GiB. Verifica `df -h /` prima del deploy.
5. **Docker Desktop appeso** dopo prune aggressivo: `docker info` non rispondeva, anche se `com.docker.backend` era running. **Fix:** kill di tutti i processi `Docker*` + `open -gj /Applications/Docker.app`. Servono ~30-90s per il daemon API.
6. **EC2 senza IAM role** → `feedback_service.py` riceve `Unable to locate credentials` su `s3.put_object`. **Fix sul backend:** `feedback_service.py` ha ora un fallback locale che scrive su `/app/data/feedback.jsonl` (volume persistente) se S3 fallisce. TODO: assegnare un IAM role all'EC2 con `s3:PutObject` sul bucket `tinder-languages-db-backups-664111151564-eu-central-1` per attivare il path S3.
7. **scp timeout** su tarball 185 MB con connessione instabile. **Fix:** il flag `--skip-build` riusa `/tmp/deploy-backend.tar.gz` se già presente; non rifa la build. Riprovare ssh diretto se SO si stalla.
8. **Build cache `docker-container` driver** rifiutava `docker save` (manca `--load`). **Fix:** lo script `deploy_backend_to_ec2.sh` usa `docker buildx build --load`.
9. **Playwright non installato** ma referenziato in `package.json`. `npm install --legacy-peer-deps` falliva con `Exit handler never called!` (bug npm 11.5.1) e lasciava `node_modules/` corrotto (vite mancante). **Fix:** `rm -rf node_modules && pnpm install` (pnpm più affidabile). Per il binario Chromium: `npx playwright install chromium`.
10. **Storage keys hardcoded nei test**: `languageApp:userId:v1`, `languageApp:targetLanguage:v1`, `languageApp:sourceLocale:v1`, `languageApp:firstVocabularyOnboardingDone:v1`, `languageApp:featureGuideSeen:<guideId>`. Tutti sotto namespace `languageApp:*`. Necessari per bypassare onboarding/wizard nei test E2E.

### Test E2E mirati (post-deploy validation)
Tutto `/tmp/real-user-test.mjs` (13 scenari user critici, contro PROD).
Comandi: `TARGET=http://3.64.236.66/ node /tmp/real-user-test.mjs`.
Copre: home, bottom nav, info chip, primary CTA, filter panel, review/explore/library/grammar hubs, feedback 2-step submit.

### Test Playwright esistenti
21/42 falliscono **per stringhe i18n stale** (test cercano "German Learning Path" → ora è "Learn German" da template `Learn {{language}}`). Non sono regressioni delle modifiche UI recenti; sono test che vanno aggiornati con le stringhe correnti. Da fare separatamente.

## Gotchas già incontrati (e fix)

### 1. `nginx.conf` upstream sbagliato
**Sintomo:** dopo il deploy, `language-frontend` è in restart loop. `docker logs language-frontend`:
```
[emerg] host not found in upstream "backend" in /etc/nginx/conf.d/default.conf
```
**Causa:** `frontend/nginx.conf` aveva `proxy_pass http://backend:8500`, ma il container backend si chiama `language-backend` (l'alias DNS `backend` non esiste sulla rete `language-app`).
**Fix:** in `frontend/nginx.conf` deve essere `proxy_pass http://language-backend:8500;`. Già corretto nel repo. Verifica con `grep proxy_pass frontend/nginx.conf` prima di un deploy se sospetti regressioni.

### 2. Smoke test fuorviante
Il messaggio "backend did not become healthy" si riferisce al check fatto via porta 80 → cioè passa per il nginx del **frontend**. Se il frontend è broken, l'errore parla di backend ma in realtà è il proxy nginx che fallisce. Verifica sempre con `docker ps -a` (lo script lo fa nell'errore).

### 3. Docker Desktop non parte da solo
Il polling automatico aspetta fino a 3 min. Avvialo manualmente prima di lanciare il deploy.

### 4. Default include il DB locale
Senza `--skip-db` lo script copia `backend/app.db` locale su EC2 sostituendo quello in produzione (con backup su `app.db.before-deploy-<timestamp>`). Per UI-only deploys usa **sempre** `--skip-db`.

### 5. VPN aziendale può bloccare SSH/HTTPS
Per memory globale: corporate VPN può bloccare SSH outbound o timeoutare `api.ipify.org`. Se vedi errori di rete inspiegabili, prova senza VPN.

## Recovery cookbook

### Riaprire SSH manualmente (se devi debuggare l'EC2)
```bash
MY_IP=$(curl -s https://api.ipify.org)
aws ec2 authorize-security-group-ingress \
  --region eu-central-1 \
  --group-id sg-032f76424400a35a7 \
  --protocol tcp --port 22 \
  --cidr "$MY_IP/32"
# Restituisce un Rule ID — salvalo per chiuderlo dopo
```

### Chiudere SSH manualmente
```bash
aws ec2 revoke-security-group-ingress \
  --region eu-central-1 \
  --group-id sg-032f76424400a35a7 \
  --security-group-rule-ids sgr-XXXXXXXXXXXX
```

### SSH all'EC2
```bash
ssh -i ~/.ssh/language-app-key-20260507132327.pem -o StrictHostKeyChecking=no ec2-user@3.64.236.66
```

### Comandi utili sull'EC2
```bash
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker logs language-frontend --tail 50
docker logs language-backend --tail 50
docker network inspect language-app --format "{{range .Containers}}{{.Name}} {{end}}"
ls -la /home/ec2-user/language-deploy/current/backend/app.db*   # backup history
```

### Rollback DB
Lo script crea sempre un backup pre-deploy: `app.db.before-deploy-YYYYMMDD-HHMMSS`. Per rollback:
```bash
# Su EC2
docker stop language-backend
cp /home/ec2-user/language-deploy/current/backend/app.db.before-deploy-<TS> \
   /home/ec2-user/language-deploy/current/backend/app.db
docker start language-backend
```

### Rollback container frontend
L'immagine precedente NON viene preservata con tag distinto — il nuovo `docker load` rinomina la vecchia in tag vuoto. Per rollback dovresti rebuildare da un commit precedente e rideplOyare.

## Quando NON usare questo script

- **Cambi a livello di backend Python / dipendenze**: lo script aggiorna SOLO il container `language-frontend`. Per un nuovo backend immagine serve un flusso a parte (non automatizzato qui — costruisci e push manuale).
- **Migrazioni di schema DB**: senza una migrazione esplicita lato Python, copiare un `app.db` con schema diverso può rompere il backend al riavvio.
- **EKS / Kubernetes**: i file in `infrastructure/k8s/` e `infrastructure/terraform/` sono **stale**. La produzione gira su singolo EC2 + Docker, non K8s.

## Una sessione di deploy "happy path" tipica

```bash
# 1. Avvia Docker Desktop (manuale)
# 2. Verifica preflight
docker info > /dev/null && echo "Docker OK"
aws sts get-caller-identity | grep Account

# 3. Lancia deploy
cd /Users/nicco/Desktop/progetti-miei/language-app/tinder-for-languages
scripts/deploy_to_ec2.sh --skip-db

# 4. Verifica
curl -sI http://3.64.236.66/ | head -1
open http://3.64.236.66/
```
