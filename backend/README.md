# Backend - Tinder for Languages

> Last updated: 2026-03-15 17:30

FastAPI backend for the language learning app.

## Quick Start

```bash
# Setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run
python -m app.main
# Server: http://localhost:8500
```

## Database Architecture

By default the backend uses **SQLite** (no setup needed). PostgreSQL is available as optional alternative via environment variables and `docker-compose`.

The backend uses **two separate databases**:

| Database | File (SQLite default) | Purpose |
|----------|------|---------|
| **Main DB** | `app.db` | Flashcards, progress, grammar, audio cache |
| **Tracking DB** | `tracking.db` | Session tracking for infographics |

## Services

### `gemini_image.py` - Infographic Generation
- **Model**: Gemini Nano Banana Pro (`gemini-3-pro-image-preview`)
- **Purpose**: Generate lesson summary infographics
- **Style**: Handwritten/schoolteacher aesthetic
- **Output**: Base64 encoded PNG

### `tracking_service.py` - Session Tracking
- Track all user interactions (swipes, sentences, audio plays)
- Aggregate word statistics per session
- Generate session summaries for infographics

### `openai_tts.py` - Text-to-Speech
- Generate audio pronunciations
- Cache in main database

### Deprecated YouTube Video Search
- Old YouTube route and service code lives under `app/routes/deprecated/` and `app/services/deprecated/`
- It is not mounted by the active FastAPI app

### Deprecated AI Video Generation
- Old generated-video route and service code lives under `app/routes/deprecated/` and `app/services/deprecated/`
- It is not mounted by the active FastAPI app

## API Routes

### `/api/tracking` - Session Tracking
```
POST /session/start     - Start new session
POST /session/end       - End session
POST /action            - Track user action
GET  /session/{uuid}/summary - Get session data
```

### `/api/infographics` - Image Generation
```
POST /from-session      - Generate from tracked session
POST /lesson-summary    - Generate from manual data
POST /custom            - Custom prompt image
```

### `/api/cards` - Flashcards
```
GET  /                  - Get flashcards
POST /progress          - Record swipe
```

### `/api/tts` - Audio
```
POST /speak             - Generate TTS audio
```

## Environment Variables

```bash
# Required
GEMINI_API_KEY=your_gemini_key

# Optional (for full features)
OPENAI_API_KEY=your_openai_key

# Database (optional - only needed for PostgreSQL instead of default SQLite)
# DB_HOST=localhost
# DB_PORT=5433
```

## Action Types for Tracking

```python
# Flashcard
swipe_right, swipe_left, play_audio

# Grammar Lab
sentence_build_start, sentence_build_complete, sentence_validated

# Library
word_view, word_search, filter_apply

# Video tracking
video_play, video_complete

# Session
session_start, session_end, app_background, app_foreground
```
