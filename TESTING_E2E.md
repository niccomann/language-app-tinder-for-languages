# End-to-End Testing Guide

## 📋 Available Tests

### 1. Quick Check Test ⚡
**File**: `test-quick-check.js`  
**Duration**: ~15 seconds  
**Purpose**: Fast verification that core functionality works

```bash
node test-quick-check.js
```

**What it tests:**
- ✅ App loads correctly
- ✅ Category selection works
- ✅ Session starts
- ✅ Video reel opens

**Use when**: You want a quick sanity check after making changes.

---

### 2. Video Reel E2E Test 🎬
**File**: `test-video-reel-e2e.js`  
**Duration**: ~40 seconds  
**Purpose**: Complete end-to-end flow testing

```bash
node test-video-reel-e2e.js
```

**What it tests:**
- ✅ Complete user flow from start to finish
- ✅ Category selection
- ✅ Flashcard display
- ✅ Video reel opens on swipe left
- ✅ YouTube API loads correctly
- ✅ Video players are created
- ✅ Navigation works (up/down arrows)
- ✅ Video reel closes properly

**Use when**: You want to verify the complete user experience.

---

### 3. Video Playback Test 🎥
**File**: `test-video-playback.js`  
**Duration**: ~35 seconds  
**Purpose**: Detailed video functionality verification

```bash
node test-video-playback.js
```

**What it tests:**
- ✅ Video players are created correctly
- ✅ Videos load and play
- ✅ Only one video is visible at a time
- ✅ Navigation between videos works
- ✅ Video state changes are tracked
- ✅ No video overlaps

**Use when**: You're debugging video playback issues or verifying the reel behavior.

---

## 🚀 Prerequisites

1. **Install Playwright** (if not already installed):
   ```bash
   npm install
   ```

2. **Start the backend**:
   ```bash
   cd backend
   source .venv/bin/activate
   python -m app.main
   ```

3. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

4. **Ensure YouTube API key is configured** in `backend/.env`:
   ```bash
   YOUTUBE_API_KEY=your_key_here
   ```

---

## 📊 Test Output

All tests will:
- ✅ Show step-by-step progress in the console
- ✅ Open a browser window (non-headless) so you can see what's happening
- ✅ Take screenshots at key points
- ✅ Display relevant console logs
- ✅ Show a summary of results

### Screenshots Generated:
- `test-video-1.png` - First video in reel
- `test-video-2.png` - Second video after navigation
- `test-final.png` - Final state
- `test-playback-1.png` - Playback test first video
- `test-playback-2.png` - Playback test second video
- `quick-check.png` - Quick check final state

---

## 🐛 Troubleshooting

### Test fails with "Cannot connect to localhost:5173"
**Solution**: Make sure the frontend is running (`npm run dev` in `frontend/` directory)

### Test fails with "No videos found"
**Solution**: Check that:
1. Backend is running
2. YouTube API key is configured in `backend/.env`
3. You have internet connection

### Videos don't play
**Solution**: 
1. Check browser console for errors
2. Verify YouTube API quota hasn't been exceeded
3. Try running the test again (sometimes YouTube takes a moment to load)

### Browser closes too quickly
**Solution**: Each test has a delay at the end. You can increase it by modifying the `waitForTimeout` value at the end of the test.

---

## 🎯 Running All Tests

To run all tests in sequence:

```bash
# Quick check first
node test-quick-check.js

# Then full E2E
node test-video-reel-e2e.js

# Finally detailed playback test
node test-video-playback.js
```

---

## 📝 Notes

- Tests run with `slowMo` enabled so you can see what's happening
- Browser stays open for a few seconds at the end for inspection
- All tests are non-destructive and don't modify any data
- Tests use the same flow a real user would follow

---

## 🔧 Customization

You can modify test behavior by editing these parameters in each test file:

```javascript
const browser = await chromium.launch({ 
  headless: false,  // Set to true to run without browser window
  slowMo: 500       // Milliseconds to slow down operations (0 = full speed)
});
```

---

**Happy Testing! 🎉**
