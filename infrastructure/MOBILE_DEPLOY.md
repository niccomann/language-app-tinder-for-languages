> Last updated: 2026-03-07

# Deploy Guide - Tinder for Languages

Questa guida descrive come deployare l'app in diverse configurazioni.

## Architettura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DEPLOY OPTIONS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐     ┌─────────────────────────────────────┐│
│  │   OFFLINE MODE      │     │   ONLINE MODE                       ││
│  │   (Embedded Python) │     │   (Remote Backend)                  ││
│  │                     │     │                                     ││
│  │  ✅ Flashcards      │     │  ✅ All features                    ││
│  │  ✅ Progress        │     │                                     ││
│  │  ✅ Library         │     │  Backend options:                   ││
│  │  ✅ Grammar         │     │  - localhost (dev)                  ││
│  │  ❌ Videos          │     │  - AWS (production)                 ││
│  │  ❌ TTS             │     │  - Docker                           ││
│  │  ❌ AI              │     │                                     ││
│  └─────────────────────┘     └─────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Deploy Locale (Sviluppo)

### Backend
```bash
cd backend
source .venv/bin/activate
python -m app.main
# Backend running on http://localhost:8501
```

### Frontend Web
```bash
cd frontend
npm run dev
# Frontend running on http://localhost:5173
```

### Android (con backend locale)
```bash
./scripts/deploy_android_online.sh --run
# Richiede: emulatore Android attivo, backend running
```

### iOS (con backend locale)
```bash
./scripts/package_native.sh ios --run
# Richiede: simulatore iOS, backend running
```

---

## 2. Deploy Offline (Embedded Python)

Per app che funzionano senza connessione internet.

### Android Offline
```bash
./scripts/deploy_android_offline.sh --run
```

**Funzionalità disponibili:**
- ✅ Flashcards (database SQLite locale)
- ✅ Progress tracking
- ✅ Words Library
- ✅ Grammar sentences
- ❌ YouTube videos
- ❌ AI video generation
- ❌ Text-to-speech
- ❌ Grammar validation (LLM)

**Requisiti:**
- Chaquopy configurato in `build.gradle` (vedi sezione Chaquopy)

---

## 3. Deploy AWS (Produzione)

### 3.1 Prerequisiti AWS

1. **Account AWS** con accesso a:
   - EC2 o ECS/Fargate
   - RDS (PostgreSQL) o usare SQLite
   - S3 (per audio TTS cache)
   - API Gateway (opzionale)

2. **API Keys** configurate:
   - `YOUTUBE_API_KEY`
   - `OPENAI_API_KEY`
   - `GOOGLE_API_KEY` (per Gemini)

### 3.2 Deploy Backend su AWS

#### Opzione A: EC2 (Semplice)

```bash
# 1. Crea EC2 instance (Ubuntu 22.04, t3.small)
# 2. SSH nella instance
ssh -i key.pem ubuntu@<EC2_IP>

# 3. Setup
sudo apt update && sudo apt install -y python3.11 python3.11-venv git
git clone <repo_url> app
cd app/backend

# 4. Configura ambiente
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 5. Configura variabili
cat > .env << EOF
YOUTUBE_API_KEY=your_key
OPENAI_API_KEY=your_key
GOOGLE_API_KEY=your_key
DATABASE_URL=sqlite:///./tinder_languages.db
EOF

# 6. Avvia con systemd
sudo tee /etc/systemd/system/tinder-backend.service << EOF
[Unit]
Description=Tinder for Languages Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/app/backend
Environment="PATH=/home/ubuntu/app/backend/.venv/bin"
ExecStart=/home/ubuntu/app/backend/.venv/bin/python -m app.main
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable tinder-backend
sudo systemctl start tinder-backend
```

#### Opzione B: Docker + ECS

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY data/ ./data/

EXPOSE 8501
CMD ["python", "-m", "app.main"]
```

```bash
# Build e push
docker build -t tinder-backend .
docker tag tinder-backend:latest <ECR_URI>:latest
docker push <ECR_URI>:latest

# Deploy su ECS Fargate
aws ecs create-service ...
```

### 3.3 Deploy Frontend per AWS

```bash
# Build con URL AWS
export VITE_API_URL=https://api.tinderforlanguages.com
./scripts/deploy_android_online.sh --aws --run
```

Oppure manualmente:
```bash
cd frontend
VITE_APP_MODE=online VITE_API_URL=https://api.tinderforlanguages.com npm run build
npx cap sync android
npx cap run android
```

### 3.4 Configurazione HTTPS

Per produzione, usa un reverse proxy (nginx/ALB) con certificato SSL:

```nginx
server {
    listen 443 ssl;
    server_name api.tinderforlanguages.com;
    
    ssl_certificate /etc/letsencrypt/live/api.tinderforlanguages.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tinderforlanguages.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8501;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 4. Configurazione Chaquopy (Android Offline)

Per abilitare Python embedded su Android:

### 4.1 Modifica `android/app/build.gradle`

```gradle
plugins {
    id 'com.android.application'
    id 'com.chaquo.python' version '15.0.1'  // Aggiungi questo
}

android {
    // ... existing config ...
    
    defaultConfig {
        // ... existing config ...
        
        python {
            version "3.11"
        }
    }
}

chaquopy {
    defaultConfig {
        pip {
            // Nessuna dipendenza esterna necessaria
        }
    }
    sourceSets {
        main {
            srcDir "src/main/python"
        }
    }
}
```

### 4.2 Modifica `android/build.gradle` (project level)

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
        maven { url "https://chaquo.com/maven" }  // Aggiungi questo
    }
}
```

### 4.3 Copia il backend Python

```bash
mkdir -p frontend/android/app/src/main/python
cp mobile-backend/embedded_backend.py frontend/android/app/src/main/python/
```

---

## 5. Environment Variables

### Frontend (.env)
```bash
VITE_APP_MODE=online|offline
VITE_API_URL=http://localhost:8501
```

### Backend (.env)
```bash
# Required
DATABASE_URL=sqlite:///./tinder_languages.db

# For active AI features
OPENAI_API_KEY=your_key

# For Grammar validation
GOOGLE_API_KEY=your_key
```

---

## 6. Scripts Disponibili

| Script | Descrizione |
|--------|-------------|
| `scripts/package_native.sh ios --run` | Build iOS con backend locale |
| `scripts/package_native.sh android --run` | Build Android con backend locale |
| `scripts/deploy_android_offline.sh --run` | Build Android offline (embedded Python) |
| `scripts/deploy_android_online.sh --run` | Build Android online (localhost) |
| `scripts/deploy_android_online.sh --aws --run` | Build Android per AWS |

---

## 7. Troubleshooting

### Android non si connette al backend
```bash
# Verifica adb reverse
adb reverse tcp:8501 tcp:8501
```

### Build Android fallisce (Java)
```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
```

### iOS simulator non trovato
```bash
xcodebuild -downloadPlatform iOS
```

---

## 8. Costi Stimati AWS

| Servizio | Configurazione | Costo/mese |
|----------|----------------|------------|
| EC2 | t3.small | ~$15 |
| RDS | db.t3.micro | ~$15 |
| S3 | 1GB storage | ~$0.03 |
| **Totale** | | **~$30/mese** |

Per ridurre i costi:
- Usa SQLite invece di RDS
- Usa EC2 Spot instances
- Configura auto-scaling
