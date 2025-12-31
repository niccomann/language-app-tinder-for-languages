# Tinder for Languages 🌍

Learn German vocabulary with a Tinder-style swipe interface.

## 🚀 Quick Start

```bash
# 1. Start database
docker-compose up -d

# 2. Start backend
cd backend && ./setup.sh && ./start.sh

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

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Python + FastAPI + SQLModel
- **Database**: PostgreSQL (Docker)

## 📁 Project Structure

```
backend/app/
├── main.py              # FastAPI app
├── routes/              # API endpoints
├── database/            # Models & connection
└── services/            # TTS, OpenAI

frontend/src/
├── components/          # React components
├── hooks/               # Custom hooks
└── services/            # API client
```

## 🔌 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/cards` | Get flashcards |
| `POST /api/progress` | Record swipe |
| `POST /api/tts/speak` | Generate TTS audio |
| `GET /api/statistics/summary` | Get learning stats |

## 🧪 Testing

```bash
# Run all tests
node tests/e2e/web/test-quick-check.js
node tests/e2e/web/test-flashcard-flow.js
node tests/e2e/web/test-grammar-lab.js
node tests/e2e/web/test-new-features.js
```

## 🐛 Troubleshooting

- **Database error**: `docker ps` to check PostgreSQL
- **Backend error**: Check port 8500 is free
- **Frontend error**: Ensure backend is running

---

**Built with ❤️ for language learners**
