# Quick Start Guide

## Prerequisites

- Docker (for PostgreSQL)
- Python 3.13+ with venv
- Node.js 18+
- YouTube API Key (get from [Google Cloud Console](https://console.cloud.google.com/))

## Setup (5 minutes)

### 1. Configure API Keys

Create `backend/.env`:
```bash
YOUTUBE_API_KEY=your_youtube_api_key_here

# Database (default values)
DB_HOST=localhost
DB_PORT=5433
DB_USER=tinder_user
DB_PASSWORD=tinder_password
DB_SCHEMA=public
DB_DATABASE=tinder_languages_db
```

### 2. Start Database

```bash
docker-compose up -d
```

### 3. Start Backend

```bash
cd backend
./setup.sh    # First time only
./start.sh    # Starts the server
```

Backend will be at: http://localhost:8000

### 4. Start Frontend

```bash
cd frontend
npm install   # First time only
npm run dev
```

Frontend will be at: http://localhost:5173

## Usage

1. **Open** http://localhost:5173
2. **Select categories** you want to learn
3. **Click "Start Learning"**
4. **Swipe right** (✓) if you know the word
5. **Swipe left** (✕) if you don't know → YouTube video appears!

## Keyboard Shortcuts

- `←` (Left Arrow) - Don't know the word
- `→` (Right Arrow) - Know the word
- `ESC` - Close video modal

## Testing

```bash
# Make sure backend and frontend are running
node playwright-test.js
```

## Troubleshooting

**YouTube videos not showing?**
- Check `YOUTUBE_API_KEY` in `backend/.env`
- Verify backend logs for errors
- Test API: `curl -X POST http://localhost:8000/videos/search -H "Content-Type: application/json" -d '{"word": "Hund", "translation": "dog", "language": "de"}'`

**Database connection failed?**
- Check if Docker is running: `docker ps`
- Restart database: `docker-compose restart`

**Backend won't start?**
- Activate venv: `source backend/.venv/bin/activate`
- Check port 8000 is free: `lsof -i :8000`
- Install dependencies: `cd backend && pip install -r requirements.txt`

## Next Steps

- Read `README.md` for complete documentation
- Check `STATUS.md` for current project state
- See `TESTING.md` for testing guide
- View `ROADMAP.md` for future features

## Support

For issues or questions:
1. Check `TROUBLESHOOTING` section in README.md
2. Review backend logs
3. Check browser console for errors
4. Verify all services are running

---

**Happy Learning! 🎉**
