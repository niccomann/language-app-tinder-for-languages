# Tinder for Languages 🌍

Learn German vocabulary with a Tinder-style swipe interface.

## 🚀 Quick Start

```bash
# 1. Start database
docker-compose up -d

# 2. Start backend
cd backend && source .venv/bin/activate && python -m app.main

# 3. Start frontend
cd frontend && npm install && npm run dev

# 4. Open http://localhost:5173
```

## 🎯 Features

- **Swipe Learning** - Right (know) / Left (don't know)
- **Audio TTS** 🔊 - Listen to word pronunciation
- **Word Statistics** 📊 - Track your confidence per word
- **Grammar Lab** 🧪 - Interactive sentence building
- **Video Learning** 🎬 - YouTube & AI-generated videos
- **Session Tracking** 📝 - Track all user interactions
- **Infographics** 🎨 - AI-generated lesson summaries (Gemini Nano Banana Pro)

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Python + FastAPI + SQLModel
- **Database**: PostgreSQL (main) + SQLite (tracking)
- **AI**: Google Gemini (image generation), OpenAI (grammar)
- **Mobile**: Capacitor (iOS/Android)

## 📁 Project Structure

```
backend/app/
├── main.py              # FastAPI app
├── routes/              # API endpoints
│   ├── cards.py         # Flashcard endpoints
│   ├── tracking.py      # Session tracking
│   └── infographics.py  # AI image generation
├── database/
│   ├── models.py        # Main DB models
│   ├── tracking_models.py  # Tracking DB models (separate)
│   └── connection.py    # DB connections
└── services/
    ├── gemini_image.py  # Nano Banana Pro image gen
    └── tracking_service.py  # Session tracking logic

frontend/src/
├── components/          # React components
├── config/              # App mode & feature flags
└── services/            # API client
```

## 🔌 API Endpoints

### Flashcards
| Endpoint | Description |
|----------|-------------|
| `GET /api/cards` | Get flashcards |
| `POST /api/progress` | Record swipe |
| `POST /api/tts/speak` | Generate TTS audio |
| `GET /api/statistics/summary` | Get learning stats |

### Session Tracking
| Endpoint | Description |
|----------|-------------|
| `POST /api/tracking/session/start` | Start tracking session |
| `POST /api/tracking/session/end` | End session |
| `POST /api/tracking/action` | Track user action |
| `GET /api/tracking/session/{uuid}/summary` | Get session data |

### Infographics (Gemini AI)
| Endpoint | Description |
|----------|-------------|
| `POST /api/infographics/from-session` | Generate from tracked session |
| `POST /api/infographics/lesson-summary` | Generate from manual data |
| `POST /api/infographics/custom` | Custom image from prompt |

## 📱 Mobile Deploy

```bash
# Android (with local backend)
./scripts/deploy_android_online.sh --run

# iOS
./scripts/package_native.sh ios --run
```

See `docs/DEPLOY_GUIDE.md` for AWS and offline deployment.

## 🐛 Troubleshooting

- **Database error**: `docker ps` to check PostgreSQL
- **Backend error**: Check port 8500 is free
- **Android connection**: Run `adb reverse tcp:8500 tcp:8500`

---

**Built with ❤️ for language learners**
