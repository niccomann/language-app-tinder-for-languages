# Tinder for Languages 🌍

> Learn German vocabulary with a Tinder-style swipe interface + YouTube videos

## 🚀 Quick Start

### Prerequisites
- Docker (PostgreSQL)
- Python 3.13+ with venv
- Node.js 18+
- YouTube API Key ([get it here](https://console.cloud.google.com/)) - for YouTube videos
- OpenAI API Key ([get it here](https://platform.openai.com/)) - for AI-generated videos (optional)

### Setup

1. **Configure API Keys** - Create `backend/.env`:
   ```bash
   # For YouTube videos (required)
   YOUTUBE_API_KEY=your_youtube_api_key_here
   
   # For AI-generated videos (optional)
   OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **Start Services**:
   ```bash
   # Database
   docker-compose up -d
   
   # Backend
   cd backend && ./setup.sh && ./start.sh
   
   # Frontend (new terminal)
   cd frontend && npm install && npm run dev
   ```

3. **Open** http://localhost:5173 🎉

> Backend auto-creates database and seeds 100 German flashcards on first startup.

## 🎯 Features

- **Category Selection** - Choose topics to learn (animals, food, etc.)
- **Swipe Interface** - Left (don't know) / Right (know)
- **Video Source Choice** ⭐ NEW - Choose between YouTube or AI-generated videos
- **YouTube Video Reel** - TikTok-style vertical scroll with 8 educational videos
- **AI Video Reel** 🤖 NEW - Personalized AI-generated videos using OpenAI Sora
- **Progress Tracking** - Real-time statistics
- **Keyboard Support** - Arrow keys navigation
- **Responsive Design** - Mobile-first

## 🛠️ Tech Stack

**Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Framer Motion  
**Backend**: Python 3.13 + FastAPI + Uvicorn + Pydantic + SQLModel  
**Database**: PostgreSQL 15 (Docker)

## 📁 Project Structure

```
backend/app/
├── main.py                     # FastAPI app, CORS, startup
├── models.py                   # Pydantic response models
├── core/
│   └── config.py              # Configuration with Pydantic Settings
├── database/
│   ├── __init__.py            # Session dependency
│   ├── connection.py          # Database connection manager
│   ├── models.py              # SQLModel entities
│   └── seed.py                # Database seeding script
├── routes/
│   └── cards.py               # API endpoints (with DB queries)
└── data/
    └── mock_cards.py          # 100 German words for seeding

frontend/src/
├── components/
│   ├── CategorySelector.tsx   # Category selection screen
│   ├── CardStack.tsx          # Main controller
│   ├── Card.tsx               # Swipeable card
│   ├── ProgressBar.tsx        # Progress display
│   └── SwipeButtons.tsx       # Action buttons
├── hooks/
│   ├── useCategories.ts       # Category logic
│   └── useLearningSession.ts  # Session state
├── services/
│   └── api.ts                 # HTTP client
└── types/
    └── index.ts               # TypeScript interfaces

docker-compose.yml              # PostgreSQL container
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cards?language=de&category=animals` | GET | Get flashcards |
| `/api/progress` | POST | Record swipe: `{card_id, known}` |
| `/api/progress` | GET | Get statistics |
| `/api/progress/reset` | POST | Reset progress |
| `/videos/search` | POST | Search single YouTube video |
| `/videos/search-multiple` | POST | Search multiple YouTube videos (8 videos) |
| `/api/sora/generate` | POST | Generate single AI video |
| `/api/sora/generate-multiple` 🤖 NEW | POST | Generate multiple AI videos (3 videos) |
| `/api/sora/status/{job_id}` | GET | Check AI video generation status |

## 🎮 How to Use

1. **Select categories** - Choose topics you want to learn
2. **Swipe cards** - Right (know) or Left (don't know)
3. **Choose video source** - When you swipe left, select YouTube or AI-generated videos
4. **Watch videos** - Scroll through educational content in reel format
5. **Use keyboard** - Arrow keys for navigation
6. **Track progress** - See real-time statistics

## 🎬 Video Learning System ⭐ NEW

When you swipe **left** (don't know a word), you can choose between two video sources:

### 🎥 YouTube Videos (Fast & Free)
- **8 educational videos** from real teachers and creators
- **Instant loading** - no waiting
- **Diverse content** - multiple teaching styles
- **Free** - uses YouTube API quota

### 🤖 AI-Generated Videos (Personalized)
- **3 custom videos** generated specifically for the word
- **High quality** - consistent, professional content
- **Personalized** - tailored to the exact word and context
- **Powered by OpenAI Sora** - cutting-edge AI video generation

### Common Features (Both Options)
- **Vertical scroll** navigation (like TikTok/Instagram Reels)
- **Keyboard controls**: Arrow Up/Down to navigate
- **Touch gestures**: Swipe up/down on mobile
- **Video counter**: Shows current position (e.g., "3 / 8")
- **Easy exit**: ESC to return to flashcards

### How It Works
1. Swipe left on a flashcard
2. **Choose your video source**: YouTube or AI
3. Reel feed opens (with loading for AI videos)
4. Scroll vertically to explore videos
5. Press ESC to continue learning

**Setup**: 
- YouTube: Add `YOUTUBE_API_KEY` to `backend/.env`
- AI Videos: Add `OPENAI_API_KEY` to `backend/.env`

**Documentation**: 
- `docs/VIDEO_REEL_FEATURE.md` - YouTube integration details
- `docs/AI_VIDEO_FEATURE.md` ⭐ NEW - AI video generation guide

## 🏗️ Architecture

### Custom Hooks Pattern
```typescript
// CardStack.tsx - Main controller
const categories = useCategories();      // Category management
const session = useLearningSession();    // Learning session state
```

### Component Hierarchy
```
App.tsx
└── CardStack.tsx (Main Controller)
    ├── useCategories() hook → Category logic
    ├── useLearningSession() hook → Session logic
    ├── CategorySelector → Initial screen
    ├── Card → Swipeable flashcard
    ├── ProgressBar → Statistics
    └── SwipeButtons → Actions
```

### Data Flow
```
1. Load categories → useCategories() → GET /api/cards
2. User selects categories → CategorySelector
3. Start learning → useLearningSession().loadFlashcards()
4. User swipes → handleSwipe() → POST /api/progress
5. Update progress → ProgressBar
6. Next card → Repeat
```

## 🔧 Development

### Backend
```bash
cd backend
source .venv/bin/activate
python -m app.main  # Auto-reload enabled
```

### Frontend
```bash
cd frontend
npm run dev         # Hot module replacement
npm run build       # Production build
```

### API Documentation
Open **http://localhost:8000/docs** for interactive API documentation

## 📝 Key Implementation Details

- **State Management**: Custom hooks separate business logic from UI
- **Storage**: PostgreSQL database with persistent data
- **Categories**: 15+ categories (animals, food, objects, actions, nature, colors, body, weather, clothing, transportation, family, time, music, sports, places)
- **Vocabulary**: 100 German words with Unsplash images
- **Animation**: Framer Motion for swipe gestures
- **ORM**: SQLModel (combines SQLAlchemy + Pydantic)
- **Database Pattern**: Based on rage-backend architecture

## 🧪 Testing

The video reel feature has been thoroughly tested with:
- ✅ Playwright automated tests (multiple video playback, scroll navigation)
- ✅ Manual testing (all features verified working)
- ✅ No video overlaps or black screen issues

**Run tests:**
```bash
# Quick check (15 seconds)
node tests/test-quick-check.js

# Full E2E test (40 seconds)
node tests/test-video-reel-e2e.js

# Detailed playback test (35 seconds)
node tests/test-video-playback.js

# Or run all tests at once
./tests/run-all-tests.sh
```

See `tests/README.md` for complete testing guide.

## 🐛 Troubleshooting

**Database connection failed**: Check if PostgreSQL is running with `docker ps`  
**Backend won't start**: Check if port 8000 is free and database is accessible  
**Frontend can't connect**: Ensure backend is running at localhost:8000  
**VPN issues**: Setup script includes retry logic for pip install  
**No flashcards**: Backend will auto-seed on first startup, check logs  
**YouTube video not appearing**: Verify `YOUTUBE_API_KEY` in `backend/.env`  
**AI videos not generating**: Check `OPENAI_API_KEY` in `backend/.env` and ensure Sora API access

## 📚 Documentation

See `docs/` folder:
- `QUICKSTART.md` - 5-minute setup guide
- `STATUS.md` - Current project status
- `TESTING.md` - Testing guide
- `VIDEO_REEL_FEATURE.md` - YouTube video reel implementation
- `AI_VIDEO_FEATURE.md` 🤖 NEW - AI video generation guide
- `ROADMAP.md` - Future enhancements
- `RECOMMENDATION_SYSTEM.md` - Video recommendation system (proposed)
- `NEURAL_RECOMMENDATION_PYTORCH.md` - Neural network implementation with PyTorch
- `YOUTUBE_API_SETUP.md` - YouTube setup details

---

**Built with ❤️ for language learners**
