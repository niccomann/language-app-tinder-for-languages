# Tinder for Languages - Infrastructure

> Last updated: 2026-03-15 17:30

> **Deployment AWS EKS Multi-Region** - Serverless Fargate, pay-per-use

---

## 🌐 LINK IMPORTANTI

| Regione | App URL | Status |
|---------|---------|--------|
| 🇪🇺 **EU (Frankfurt)** | http://tinder-frontend-nlb-60cb3490ce637976.elb.eu-central-1.amazonaws.com | ✅ Attivo |
| 🇦🇷 **SA (São Paulo)** | TBD | ⏳ Pronto |

| Risorsa | URL |
|---------|-----|
| **📊 Dashboard Controllo** | http://localhost:8888 (avvia con `python3 scripts/dashboard-server.py`) |
| **☁️ AWS Console EU** | https://eu-central-1.console.aws.amazon.com/eks |
| **☁️ AWS Console SA** | https://sa-east-1.console.aws.amazon.com/eks |

---

## 📋 STATO ATTUALE (27 Dicembre 2025)

| Componente | Stato | Dettagli |
|------------|-------|----------|
| EKS Cluster | ✅ Active | Fargate (serverless) |
| Backend | ✅ 2/2 Running | FastAPI + SQLite |
| Frontend | ✅ 2/2 Running | React + Nginx |
| NLB | ✅ Active | IP target type |
| HTTP Status | ✅ 200 OK | App funzionante |

---

## 📁 Struttura Cartelle

```
infrastructure/
├── README.md                 # 📖 Questo file
├── DEPLOYMENT_GUIDE.md       # 📚 Guida deployment dettagliata
├── ARCHITECTURE.md           # 🏗️ Architettura sistema
│
├── scripts/                  # 🚀 SCRIPT PRINCIPALI
│   ├── dashboard-server.py   # ⭐ Dashboard web interattivo (localhost:8888)
│   ├── deploy.sh             # Deploy unificato (EU/SA) - SCRIPT PRINCIPALE
│   ├── destroy.sh            # Distruggi risorse AWS
│   └── setup-secrets.sh      # Carica secrets
│
├── k8s/                      # ☸️ Kubernetes Manifests
│   ├── namespace.yaml        # Namespace: tinder-languages
│   ├── backend-deployment.yaml   # Backend + Service
│   ├── frontend-deployment.yaml  # Frontend + Service
│   ├── secrets.yaml          # Secrets (gitignored)
│   └── secrets.yaml.example  # Template secrets
│
├── terraform/                # 🏗️ Infrastructure as Code
│   ├── main.tf               # EKS, VPC, Fargate profiles
│   ├── variables.tf          # Variabili
│   └── outputs.tf            # Output (cluster endpoint, etc.)
│
├── secrets/                  # 🔐 Secrets (gitignored)
│   ├── .env.example          # Template
│   └── .env                  # I tuoi secrets
│
└── dashboard/                # 📊 Dashboard HTML
    └── live-status.html      # Status auto-refresh
```

---

## 🚀 QUICK START

### Per il tuo collega: come iniziare

```bash
# 1. Vai nella cartella infrastructure
cd infrastructure

# 2. Avvia la dashboard di controllo
python3 scripts/dashboard-server.py

# 3. Apri nel browser
open http://localhost:8888
```

La dashboard permette di:
- ✅ Vedere lo stato di tutti i componenti
- ✅ Eseguire comandi kubectl
- ✅ Gestire il Load Balancer
- ✅ Scalare i pod
- ✅ Vedere i log
- ✅ Riavviare i deployment

---

## 🔧 COMANDI UTILI

### Controllo Stato

```bash
# Stato pods
kubectl get pods -n tinder-languages

# Stato servizi
kubectl get svc -n tinder-languages

# Stato NLB e targets
./scripts/nlb-manage.sh status   # ⚠️ Script non ancora implementato, vedi nota sotto

# HTTP check
curl -I http://tinder-frontend-nlb-60cb3490ce637976.elb.eu-central-1.amazonaws.com
```

### Gestione Pod

```bash
# Log backend
kubectl logs -l app=backend -n tinder-languages --tail=50

# Log frontend
kubectl logs -l app=frontend -n tinder-languages --tail=50

# Restart backend
kubectl rollout restart deployment/backend -n tinder-languages

# Restart frontend
kubectl rollout restart deployment/frontend -n tinder-languages

# Scale (0 = spegni, 2 = normale, 3 = più capacità)
kubectl scale deployment/backend -n tinder-languages --replicas=2
kubectl scale deployment/frontend -n tinder-languages --replicas=2
```

### Gestione NLB (Load Balancer)

```bash
# Stato NLB
./scripts/nlb-manage.sh status   # ⚠️ Script non ancora implementato, vedi nota sotto

# Aggiorna target IPs (dopo restart/scale)
./scripts/nlb-manage.sh update   # ⚠️ Script non ancora implementato, vedi nota sotto
```

---

## 🏗️ ARCHITETTURA

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  AWS Network Load Balancer (NLB)                                │
│  tinder-frontend-nlb-60cb3490ce637976.elb.eu-central-1.amazonaws.com │
│  Port 80 → Target Group (IP type)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  EKS Cluster: tinder-languages-cluster                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Namespace: tinder-languages                                ││
│  │  ┌─────────────────────┐    ┌─────────────────────┐        ││
│  │  │  Frontend (2 pods)  │───▶│  Backend (2 pods)   │        ││
│  │  │  - React app        │    │  - FastAPI          │        ││
│  │  │  - Nginx proxy      │    │  - SQLite DB        │        ││
│  │  │  - Port 80          │    │  - Port 8500        │        ││
│  │  └─────────────────────┘    └─────────────────────┘        ││
│  └─────────────────────────────────────────────────────────────┘│
│  Fargate (Serverless - no EC2 instances)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ IMPORTANTE: Fargate + Load Balancer

AWS Fargate **NON ha EC2 instances**, quindi:

| Tipo LB | Funziona? | Motivo |
|---------|-----------|--------|
| Classic ELB | ❌ NO | Richiede EC2 |
| ALB/NLB (instance target) | ❌ NO | Richiede EC2 |
| **NLB (IP target)** | ✅ SÌ | Usa IP dei pod |

### Soluzione Implementata

1. **NLB con IP target type** - registra direttamente gli IP dei pod Fargate
2. **Cross-zone load balancing** - necessario perché i pod sono in subnet private
3. **Security groups** - aperti per permettere traffico dal NLB ai pod

---

## 📊 AWS RESOURCES

| Risorsa | ID/Nome | Note |
|---------|---------|------|
| **VPC** | vpc-0c84dfdf3ba8a9c85 | 10.0.0.0/16 |
| **EKS Cluster** | tinder-languages-cluster | Fargate |
| **NLB** | tinder-frontend-nlb | Internet-facing |
| **Target Group** | tinder-frontend-tg | IP target type |
| **ECR Backend** | tinder-languages-backend | Docker images |
| **ECR Frontend** | tinder-languages-frontend | Docker images |
| **Security Group (Cluster)** | sg-0d70c608c2ebd59a1 | TCP 80 aperto |
| **Security Group (Node)** | sg-0ed0ca09861d06db0 | TCP 80 da VPC |

---

## 💰 COSTI

| Componente | Costo Stimato |
|------------|---------------|
| EKS Control Plane | ~$72/mese |
| Fargate Pods (4 pod) | ~$15-30/mese |
| NAT Gateway | ~$32/mese |
| NLB | ~$20/mese |
| **TOTALE** | **~$100-150/mese** |

> 💡 Per risparmiare: scala a 0 pod quando non serve (`kubectl scale --replicas=0`)

---

## 🔄 AGGIORNARE L'APP

### 1. Modifica il codice (backend o frontend)

### 2. Rebuild e push immagini

```bash
# Login ECR
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 664111151564.dkr.ecr.eu-central-1.amazonaws.com

# Build backend
cd backend
docker build --platform linux/amd64 -t 664111151564.dkr.ecr.eu-central-1.amazonaws.com/tinder-languages-backend:latest .
docker push 664111151564.dkr.ecr.eu-central-1.amazonaws.com/tinder-languages-backend:latest

# Build frontend
cd ../frontend
docker build --platform linux/amd64 -t 664111151564.dkr.ecr.eu-central-1.amazonaws.com/tinder-languages-frontend:latest .
docker push 664111151564.dkr.ecr.eu-central-1.amazonaws.com/tinder-languages-frontend:latest
```

### 3. Restart deployment

```bash
kubectl rollout restart deployment/backend -n tinder-languages
kubectl rollout restart deployment/frontend -n tinder-languages
```

### 4. Aggiorna NLB targets (i pod hanno nuovi IP)

```bash
./scripts/nlb-manage.sh update   # ⚠️ Script non ancora implementato, vedi nota sotto
```

---

## 🗑️ SPEGNERE TUTTO

### Temporaneamente (mantieni infrastruttura)

```bash
# Scala a 0 pod
kubectl scale deployment/backend -n tinder-languages --replicas=0
kubectl scale deployment/frontend -n tinder-languages --replicas=0
```

### Definitivamente (elimina tutto)

```bash
./scripts/destroy.sh
```

⚠️ **ATTENZIONE**: Questo elimina TUTTO incluso il database!

---

## 🆘 TROUBLESHOOTING

### Pod non partono

```bash
kubectl describe pod <nome-pod> -n tinder-languages
kubectl get events -n tinder-languages --sort-by='.lastTimestamp'
```

### NLB targets unhealthy

```bash
# Verifica che i pod siano running
kubectl get pods -n tinder-languages -o wide

# Aggiorna i target
./scripts/nlb-manage.sh update   # ⚠️ Script non ancora implementato, vedi nota sotto

# Verifica security groups
aws ec2 describe-security-group-rules --filters "Name=group-id,Values=sg-0d70c608c2ebd59a1"
```

### kubectl non funziona

```bash
# Aggiorna kubeconfig
aws eks update-kubeconfig --name tinder-languages-cluster --region eu-central-1
```

---

## 📞 CREDENZIALI AWS

Le credenziali sono in `secrets/.env`:

```bash
AWS_ACCESS_KEY_ID=AKIA_ROTATED_2026_05_18_NEEDS_NEW_KEY
AWS_SECRET_ACCESS_KEY=REDACTED_SECRET
AWS_REGION=eu-central-1
```

Per caricarle:

```bash
source scripts/setup-secrets.sh
```

---

## 📝 NOTE PER SVILUPPATORI FUTURI

1. **Backend usa SQLite** (non PostgreSQL) per semplicità su Fargate
2. **NLB creato manualmente** perché AWS LB Controller aveva problemi con IRSA
3. **Cross-zone load balancing** è ESSENZIALE per Fargate in subnet private
4. **Dopo ogni restart/scale** bisogna aggiornare i target NLB con `nlb-manage.sh update` (⚠️ `scripts/nlb-manage.sh` non ancora implementato - i target vanno aggiornati manualmente via AWS CLI/console)
5. **Dashboard locale** su http://localhost:8888 per gestire tutto da UI

---

*Ultimo aggiornamento: 15 Marzo 2026*
