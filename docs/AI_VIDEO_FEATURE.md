# AI Video Generation Feature 🤖✨

**Last Updated**: 2025-11-24

## Overview

This feature allows users to choose between **YouTube videos** or **AI-generated videos** when they don't know a word. When a user swipes left (don't know), they are presented with a choice modal to select their preferred video source.

## User Flow

```
User swipes LEFT (don't know word)
    ↓
Video Source Selector Modal appears
    ↓
User chooses:
    ├─→ YouTube Videos → Opens YouTube Video Reel (8 videos)
    └─→ AI Generated → Opens AI Video Reel (3 videos)
```

## Components

### 1. VideoSourceSelector
**Location**: `frontend/src/components/VideoSourceSelector.tsx`

Beautiful modal that presents two options:
- **YouTube Videos**: Fast, 8 educational videos from real creators
- **AI Generated**: Personalized, high-quality AI videos

**Features**:
- Animated gradient backgrounds
- Hover effects with scale transforms
- Clear visual distinction between options
- ESC key to close

### 2. AIVideoReel
**Location**: `frontend/src/components/AIVideoReel.tsx`

TikTok-style vertical reel for AI-generated videos.

**Features**:
- Generates 3 AI videos simultaneously
- Real-time generation progress bars for each video
- Vertical scroll navigation (like TikTok/Instagram Reels)
- Auto-play/pause based on active video
- Keyboard controls (↑↓ arrows, ESC)
- Video counter (e.g., "2 / 3")
- Beautiful loading states with progress indicators

**Technical Details**:
- Uses OpenAI Sora API for video generation
- Polls job status every 5 seconds
- Shows individual progress for each video
- Handles failures gracefully (continues with successful videos)
- Maximum 5 videos per request (configurable)

## Backend API

### New Endpoint: `/api/sora/generate-multiple`

Generates multiple AI videos for reel-style viewing.

**Request**:
```json
POST /api/sora/generate-multiple?count=3
{
  "word": "Hund",
  "translation": "dog",
  "language": "de",
  "category": "animals",
  "model": "sora-2",
  "duration": 5,
  "resolution": "1280x720"
}
```

**Response**:
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
    {
      "job_id": "job_def456",
      "status": "pending",
      "index": 1
    },
    {
      "job_id": "job_ghi789",
      "status": "pending",
      "index": 2
    }
  ],
  "message": "Started generation of 3 videos. Poll each job_id for status."
}
```

**Parameters**:
- `count`: Number of videos to generate (default: 3, max: 5)

**Polling**: Use existing `/api/sora/status/{job_id}` endpoint to check each video's status.

## Frontend Hook Updates

### useLearningSession Hook
**Location**: `frontend/src/hooks/useLearningSession.ts`

**New State**:
- `showVideoSourceSelector`: Controls selector modal visibility
- `showAIReelFeed`: Controls AI video reel visibility

**New Functions**:
- `selectYouTubeVideos()`: Opens YouTube reel
- `selectAIVideos()`: Opens AI video reel
- `closeVideoSourceSelector()`: Closes selector and moves to next card
- `closeAIReelFeed()`: Closes AI reel and moves to next card

**Modified Behavior**:
- `handleSwipe('left')` now opens `VideoSourceSelector` instead of directly opening YouTube reel

## Configuration

### Required Environment Variables

**Backend** (`backend/.env`):
```bash
# Required for AI video generation
OPENAI_API_KEY=sk-...

# Optional: YouTube API (for YouTube videos)
YOUTUBE_API_KEY=AIza...
```

### Video Generation Settings

Default settings in `AIVideoReel.tsx`:
```typescript
videoCount = 3  // Number of videos to generate
duration = 5    // Video duration in seconds
model = "sora-2" // Sora model
resolution = "1280x720" // Video resolution
```

## Technical Architecture

### Video Generation Flow

1. **Initiation**: User selects "AI Generated" option
2. **Batch Start**: Frontend calls `/api/sora/generate-multiple?count=3`
3. **Job Creation**: Backend creates 3 separate Sora jobs
4. **Parallel Polling**: Frontend polls all jobs simultaneously every 5 seconds
5. **Progress Updates**: Each video shows individual progress bar
6. **Completion**: Videos are added to reel as they complete
7. **Display**: User can scroll through completed videos

### Error Handling

- **Partial Failures**: If some videos fail, successful ones are still shown
- **Complete Failure**: Shows error message with option to go back
- **Timeout**: 5-minute timeout per video (60 polls × 5 seconds)
- **API Errors**: Gracefully handled with user-friendly messages

### Performance Considerations

- **Parallel Generation**: All videos start generating simultaneously
- **Progressive Loading**: Videos appear in reel as they complete
- **Memory Management**: Video refs properly cleaned up on unmount
- **Network Optimization**: Polling interval of 5 seconds balances responsiveness and API load

## User Experience

### Loading States

1. **Initial Loading**: Spinner with "Generating AI Videos" message
2. **Progress Bars**: Individual progress for each video (0-100%)
3. **Video Counter**: Shows "Video 1", "Video 2", etc.
4. **Completion**: Smooth transition to video reel

### Video Reel Experience

- **Vertical Scroll**: Natural TikTok-style navigation
- **Auto-play**: Current video plays automatically
- **Controls**: Standard HTML5 video controls
- **Info Overlay**: Shows word, translation, resolution
- **AI Badge**: Purple "AI Generated" badge on each video
- **Navigation**: Arrow keys (↑↓) or scroll/swipe

## Comparison: YouTube vs AI Videos

| Feature | YouTube Videos | AI Generated Videos |
|---------|---------------|---------------------|
| **Speed** | Instant | 2-5 minutes |
| **Quantity** | 8 videos | 3 videos |
| **Quality** | Varies | Consistent, high |
| **Personalization** | Generic | Tailored to word |
| **Cost** | Free (API quota) | Paid (OpenAI credits) |
| **Availability** | Depends on search | Always available |

## Future Enhancements

### Planned Features
- [ ] Cache generated videos to avoid regeneration
- [ ] Allow user to request more videos
- [ ] Add video quality selector (720p, 1080p)
- [ ] Implement video download option
- [ ] Add video sharing functionality
- [ ] User preference memory (YouTube vs AI)

### Advanced Features
- [ ] Hybrid mode: Show YouTube while AI generates
- [ ] Video rating system
- [ ] Custom prompt editing
- [ ] Multiple AI models support (DALL-E, Runway, etc.)
- [ ] Video editing capabilities

## Testing

### Manual Testing Checklist

- [ ] Swipe left on a flashcard
- [ ] Video source selector appears
- [ ] Click "YouTube Videos" → YouTube reel opens
- [ ] Close reel → Next card appears
- [ ] Swipe left again
- [ ] Click "AI Generated" → Loading screen appears
- [ ] Progress bars update correctly
- [ ] AI videos appear in reel when ready
- [ ] Scroll navigation works
- [ ] Keyboard controls work (↑↓, ESC)
- [ ] Video counter updates correctly
- [ ] Close AI reel → Next card appears

### API Testing

```bash
# Test multiple video generation
curl -X POST http://localhost:8000/api/sora/generate-multiple?count=3 \
  -H "Content-Type: application/json" \
  -d '{
    "word": "Hund",
    "translation": "dog",
    "language": "de",
    "duration": 5,
    "model": "sora-2"
  }'

# Check job status
curl http://localhost:8000/api/sora/status/{job_id}

# Health check
curl http://localhost:8000/api/sora/health
```

## Troubleshooting

### Common Issues

**AI videos not generating**:
- Check `OPENAI_API_KEY` in `backend/.env`
- Verify API key has Sora access
- Check backend logs for errors
- Test health endpoint: `/api/sora/health`

**Videos taking too long**:
- Normal generation time: 2-5 minutes per video
- Check OpenAI API status
- Reduce video count or duration

**Frontend errors**:
- Check browser console for errors
- Verify backend is running
- Check network tab for failed requests

**Video playback issues**:
- Ensure video URLs are accessible
- Check CORS settings
- Verify video format compatibility

## Cost Considerations

### OpenAI Sora Pricing (Estimated)
- **sora-2**: ~$0.10-0.50 per 5-second video
- **3 videos per word**: ~$0.30-1.50 per swipe
- **100 words**: ~$30-150 for full vocabulary

**Recommendation**: Use AI videos sparingly or implement caching.

## Code Examples

### Using AIVideoReel Component

```tsx
import { AIVideoReel } from './components/AIVideoReel';

<AIVideoReel
  word="Hund"
  translation="dog"
  language="de"
  onClose={() => console.log('Closed')}
  videoCount={3}
/>
```

### Calling Backend API

```typescript
const response = await fetch(
  'http://localhost:8000/api/sora/generate-multiple?count=3',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word: 'Hund',
      translation: 'dog',
      language: 'de',
      duration: 5,
      model: 'sora-2'
    })
  }
);

const data = await response.json();
// Poll each job_id for completion
```

## Summary

This feature provides users with a choice between fast, diverse YouTube content and personalized, high-quality AI-generated videos. The implementation follows the existing video reel pattern, ensuring a consistent user experience while adding powerful AI capabilities.

**Key Benefits**:
- ✅ User choice and flexibility
- ✅ Personalized learning content
- ✅ Consistent UX with existing features
- ✅ Graceful error handling
- ✅ Production-ready implementation

---

**Built with ❤️ for enhanced language learning**
