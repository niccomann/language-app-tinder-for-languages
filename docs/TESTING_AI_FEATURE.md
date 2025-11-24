# Testing AI Video Feature 🧪

Quick guide to test the new AI video generation feature.

## Prerequisites

1. **OpenAI API Key** with Sora access
2. **Backend running** on port 8000
3. **Frontend running** on port 5173
4. **Database running** (PostgreSQL)

## Setup

Add to `backend/.env`:
```bash
OPENAI_API_KEY=sk-your-key-here
YOUTUBE_API_KEY=your-youtube-key  # Optional, for YouTube videos
```

Restart backend after adding the key.

## Test Checklist

### ✅ Basic Flow

1. **Start the app**
   - Open http://localhost:5173
   - Select a category (e.g., "Animals")
   - Click "Start Learning"

2. **Trigger video selector**
   - Swipe LEFT on a flashcard (or press ← arrow key)
   - ✅ Video Source Selector modal should appear

3. **Test YouTube option**
   - Click "YouTube Videos" button
   - ✅ YouTube Video Reel should open with 8 videos
   - ✅ Videos should load and play
   - Press ESC to close
   - ✅ Next flashcard should appear

4. **Test AI option**
   - Swipe LEFT again
   - Click "AI Generated" button
   - ✅ Loading screen should appear with "Generating AI Videos"
   - ✅ Progress bars should show for 3 videos (0-100%)
   - ⏱️ Wait 2-5 minutes for generation
   - ✅ AI Video Reel should open when ready
   - ✅ Videos should be playable
   - ✅ "AI Generated" badge should be visible
   - Press ESC to close

### ✅ UI/UX Tests

**Video Source Selector**:
- [ ] Modal has gradient background
- [ ] Both options have hover effects
- [ ] Close button (X) works
- [ ] ESC key closes modal
- [ ] Animations are smooth

**AI Video Reel**:
- [ ] Loading screen shows progress bars
- [ ] Each video has individual progress (Video 1, Video 2, Video 3)
- [ ] Video counter shows "1 / 3", "2 / 3", "3 / 3"
- [ ] Vertical scroll works
- [ ] Arrow keys (↑↓) work
- [ ] Videos auto-play when scrolled to
- [ ] Purple "AI Generated" badge visible
- [ ] Word and translation displayed
- [ ] Close button works

### ✅ Error Handling

**No API Key**:
```bash
# Remove OPENAI_API_KEY from .env
# Restart backend
# Try to generate AI video
```
- [ ] Should show error message
- [ ] Should allow closing and continuing

**API Failure**:
- [ ] If generation fails, error message appears
- [ ] Can close and continue learning

**Partial Success**:
- [ ] If only 1-2 videos succeed, reel shows available videos
- [ ] No crash or blank screen

## API Testing

### Test Backend Endpoints

**1. Health Check**:
```bash
curl http://localhost:8000/api/sora/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "sora",
  "api_key_configured": true
}
```

**2. Generate Multiple Videos**:
```bash
curl -X POST "http://localhost:8000/api/sora/generate-multiple?count=3" \
  -H "Content-Type: application/json" \
  -d '{
    "word": "Hund",
    "translation": "dog",
    "language": "de",
    "duration": 5,
    "model": "sora-2"
  }'
```

Expected response:
```json
{
  "word": "Hund",
  "translation": "dog",
  "count": 3,
  "jobs": [
    {
      "job_id": "job_abc123",
      "status": "pending",
      "index": 0
    },
    ...
  ],
  "message": "Started generation of 3 videos..."
}
```

**3. Check Job Status**:
```bash
curl http://localhost:8000/api/sora/status/job_abc123
```

Expected response (when completed):
```json
{
  "job_id": "job_abc123",
  "status": "completed",
  "video_url": "https://...",
  "duration": 5,
  "resolution": "1280x720"
}
```

## Performance Testing

### Timing Expectations

- **YouTube Videos**: < 2 seconds to load
- **AI Video Generation**: 2-5 minutes per video
- **Total AI Flow**: 3-8 minutes for 3 videos

### Resource Usage

Monitor during AI generation:
- **Network**: Polling every 5 seconds
- **Memory**: Should remain stable
- **CPU**: Minimal (just polling)

## Known Limitations

1. **Cost**: Each AI video costs ~$0.10-0.50
2. **Time**: 2-5 minutes per video
3. **Concurrency**: All 3 videos generate in parallel
4. **Max Videos**: Limited to 5 per request
5. **API Access**: Requires OpenAI Sora API access

## Troubleshooting

### Videos not generating

**Check backend logs**:
```bash
cd backend
tail -f logs/app.log  # or check console output
```

Look for:
- `✓ Video generation job created: job_xxx`
- `✓ Video generation completed for job job_xxx`
- `✗ Error creating video job: ...`

**Common errors**:
- `OPENAI_API_KEY not found`: Add key to `.env`
- `Sora API access required`: Contact OpenAI for access
- `Rate limit exceeded`: Wait and try again
- `Invalid API key`: Check key is correct

### Frontend errors

**Open browser console** (F12):
- Check for network errors
- Look for failed API calls
- Check component errors

**Common issues**:
- CORS errors: Backend not running
- 404 errors: Wrong API endpoint
- Timeout: Videos taking too long

### Videos won't play

- Check video URL is accessible
- Try opening video URL directly in browser
- Check browser console for errors
- Verify video format is supported

## Success Criteria

Feature is working correctly if:

✅ Video Source Selector appears on swipe left  
✅ Both YouTube and AI options work  
✅ AI videos generate successfully  
✅ Progress bars update correctly  
✅ Videos play in reel format  
✅ Navigation works (scroll, arrows, ESC)  
✅ No crashes or errors  
✅ Can continue learning after videos  

## Reporting Issues

If you find bugs, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser console errors
5. Backend logs
6. Screenshots/video

## Next Steps After Testing

- [ ] Test with different words
- [ ] Test with different categories
- [ ] Test error scenarios
- [ ] Test on mobile devices
- [ ] Test with slow network
- [ ] Verify cost tracking
- [ ] Document any issues

---

Happy Testing! 🎉
