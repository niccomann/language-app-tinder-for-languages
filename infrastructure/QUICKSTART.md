# 🚀 QUICKSTART - Tinder for Languages

## L'app è già online!

| Regione | URL |
|---------|-----|
| 🇪🇺 **EU** | http://tinder-frontend-nlb-60cb3490ce637976.elb.eu-central-1.amazonaws.com |
| 🇦🇷 **SA** | http://tinder-frontend-nlb-sa-1bb81066a2e9e387.elb.sa-east-1.amazonaws.com |

---

## Comandi Principali

```bash
# Vedere lo stato
./scripts/deploy.sh status          # EU (default)
./scripts/deploy.sh sa status       # South America

# Deploy completo
./scripts/deploy.sh eu all          # Deploy EU
./scripts/deploy.sh sa all          # Deploy South America

# Solo build immagini
./scripts/deploy.sh build           # Build per EU
./scripts/deploy.sh sa build        # Build per SA

# Aggiornare NLB dopo restart pods
./scripts/deploy.sh nlb             # EU
./scripts/deploy.sh sa nlb          # SA

# Dashboard web
python3 scripts/dashboard-server.py
# Apri http://localhost:8888
```

---

## Test E2E

```bash
./tests/run_tests_local.sh      # Test su localhost
./tests/run_tests_cloud_eu.sh   # Test su EU (Frankfurt)
./tests/run_tests_cloud_sa.sh   # Test su SA (São Paulo)
```

---

## Problemi?

1. **kubectl non funziona** → `./scripts/deploy.sh kubectl`
2. **App non risponde** → `./scripts/deploy.sh nlb`
3. **Leggi la documentazione** → `README.md`

---

## File Importanti

| File | Descrizione |
|------|-------------|
| `scripts/deploy.sh` | Script deploy unificato (EU/SA) |
| `scripts/dashboard-server.py` | Dashboard web |
| `k8s/*.yaml` | Kubernetes manifests |
| `terraform/` | Infrastruttura EU |
| `terraform/regions/sa-east-1/` | Infrastruttura SA |
