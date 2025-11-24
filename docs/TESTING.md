# Testing Guide

## Automated Testing

### Playwright Test Suites

#### 1. Original Video Modal Test

**File**: `playwright-test.js`

This test verifies the single video modal (legacy feature):

1. ✅ App loads correctly
2. ✅ Category selection works
3. ✅ Learning session starts
4. ✅ Flashcards display properly
5. ✅ Swipe left triggers YouTube video search
6. ✅ YouTube video modal appears and plays
7. ✅ Video can be closed

#### 2. Video Reel Test ⭐ NEW

**File**: `playwright-reel-test.js`

This test verifies the vertical scroll reel feature:

1. ✅ App loads correctly
2. ✅ Category selection works
3. ✅ Swipe left triggers reel feed
4. ✅ Reel feed opens with multiple videos
5. ✅ Video counter displays correctly
6. ✅ Arrow Down scrolls to next video
7. ✅ Arrow Up scrolls to previous video
8. ✅ Multiple consecutive scrolls work
9. ✅ ESC closes reel and returns to flashcard

### Running the Tests

```bash
# Make sure backend and frontend are running first
# Backend: http://localhost:8000
# Frontend: http://localhost:5173

# Run original test (single video modal)
node playwright-test.js

# Run reel test (vertical scroll)
node playwright-reel-test.js
```

### Test Output

The test will:
- Open a browser window (visible, not headless)
- Automatically navigate through the app
- Take screenshots at key steps
- Display detailed console output
- Show success/failure status

### Expected Results

**Original Test**:
```
✅ App loads correctly
✅ Category selection works
✅ Learning session starts
✅ Flashcards display
✅ Keyboard controls work (ArrowLeft)
✅ YouTube integration WORKING!

🎉 ALL TESTS PASSED!
```

**Reel Test**:
```
✅ App loads correctly
✅ Reel feed OPENS!
✅ Vertical scroll navigation WORKING!
✅ Multiple videos loaded
✅ ESC key closes reel

🎉 ALL REEL TESTS PASSED!
```

## Manual Testing

### Prerequisites

1. **Database running**:
   ```bash
   docker-compose up -d
   ```

2. **Backend running**:
   ```bash
   cd backend
   source .venv/bin/activate
   python3 -m app.main
   ```

3. **Frontend running**:
   ```bash
   cd frontend
   npm run dev
   ```

### Test Checklist

#### Basic Functionality
- [ ] App loads at http://localhost:5173
- [ ] Category selector displays 15 categories
- [ ] Can select/deselect categories
- [ ] "Start Learning" button appears when categories selected
- [ ] Flashcard displays with image and word
- [ ] Progress bar shows correct statistics

#### Swipe Functionality
- [ ] Click red ✕ button (swipe left)
- [ ] Click green ✓ button (swipe right)
- [ ] Arrow Left key works (swipe left)
- [ ] Arrow Right key works (swipe right)
- [ ] Progress updates after each swipe

#### Video Reel Integration ⭐ NEW
- [ ] Swipe left on a card
- [ ] Reel feed opens with loading animation
- [ ] Multiple videos load (up to 8)
- [ ] Video counter displays (e.g., "1 / 8")
- [ ] Arrow Down navigates to next video
- [ ] Arrow Up navigates to previous video
- [ ] Scroll is smooth with snap behavior
- [ ] Video info displays (title, channel, duration)
- [ ] Can close reel with ESC key
- [ ] Can close reel by clicking X button
- [ ] Next card appears after closing reel
- [ ] Touch gestures work (swipe up/down)

#### Edge Cases
- [ ] Complete all cards in session
- [ ] Completion screen shows statistics
- [ ] Can start new session
- [ ] Can change categories
- [ ] Progress persists across sessions

## API Testing

### Test YouTube Endpoints

#### Single Video (Legacy)

```bash
curl -X POST http://localhost:8000/videos/search \
  -H "Content-Type: application/json" \
  -d '{"word": "Hund", "translation": "dog", "language": "de"}'
```

Expected response:
```json
{
  "video_id": "...",
  "title": "...",
  "thumbnail": "...",
  "duration": 45,
  "channel": "...",
  "embed_url": "https://www.youtube.com/embed/..."
}
```

#### Multiple Videos (Reel) ⭐ NEW

```bash
curl -X POST http://localhost:8000/videos/search-multiple \
  -H "Content-Type: application/json" \
  -d '{"word": "Hund", "translation": "dog", "language": "de", "limit": 8}'
```

Expected response:
```json
{
  "videos": [
    {
      "video_id": "...",
      "title": "...",
      "thumbnail": "...",
      "duration": 45,
      "channel": "...",
      "embed_url": "https://www.youtube.com/embed/..."
    },
    // ... 7 more videos
  ],
  "count": 8
}
```

### Test Flashcards Endpoint

```bash
curl http://localhost:8000/api/cards?language=de&category=animals
```

### Test Progress Endpoint

```bash
curl -X POST http://localhost:8000/api/progress \
  -H "Content-Type: application/json" \
  -d '{"card_id": "1", "known": false}'
```

## Troubleshooting

### YouTube Video Not Appearing

1. Check backend logs for errors
2. Verify `YOUTUBE_API_KEY` in `backend/.env`
3. Test API directly with curl command above
4. Check browser console for network errors
5. Verify backend is running on port 8000

### Database Issues

```bash
# Check if database is running
docker ps

# Restart database
docker-compose down
docker-compose up -d

# Check backend logs
cd backend
python3 -m app.main
```

### Frontend Issues

```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Performance Testing

### Load Testing

The app should handle:
- 100+ flashcards without lag
- Multiple rapid swipes
- Video loading within 5 seconds
- Smooth animations at 60fps

### Browser Compatibility

Tested on:
- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

