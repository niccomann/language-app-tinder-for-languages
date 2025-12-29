# Test Suite - Tinder for Languages

## 📁 Directory Structure

```
tests/
├── e2e/                    # End-to-End tests
│   ├── android/            # Android emulator tests
│   │   └── test-android-e2e.js
│   ├── ios/                # iOS simulator tests
│   │   └── test-ios-e2e.js
│   ├── web/                # Web browser tests (Playwright)
│   │   ├── test-quick-check.js
│   │   ├── test-flashcard-flow.js
│   │   ├── test-grammar-lab.js
│   │   ├── test-video-reel-e2e.js
│   │   ├── test-video-playback.js
│   │   ├── test-words-library.js
│   │   ├── test-new-categories.js
│   │   ├── test-ai-video-selector.js
│   │   ├── test-ai-video-generation.js
│   │   ├── test-wordcloud-behavior.js
│   │   ├── test-wordcloud-details.js
│   │   └── test-complete-flow.js
│   └── test-mobile-e2e.js  # Runs both Android & iOS
├── unit/                   # Unit/Integration tests
│   ├── test-native-build.js
│   ├── test-backend-integration.js
│   └── test-manual-ai.js
├── screenshots/            # Test screenshots
└── README.md
```

---

## 🚀 Quick Start

```bash
# Run all mobile tests (Android + iOS)
node tests/e2e/test-mobile-e2e.js

# Run Android only
node tests/e2e/android/test-android-e2e.js

# Run iOS only
node tests/e2e/ios/test-ios-e2e.js

# Run web tests
node tests/e2e/web/test-quick-check.js

# Run unit tests
node tests/unit/test-native-build.js
```

---

## 📱 Mobile E2E Tests

### Android E2E Test
**File**: `tests/e2e/android/test-android-e2e.js`  
**Duration**: ~30 seconds

```bash
node tests/e2e/android/test-android-e2e.js
```

**Prerequisites:**
- Android emulator running
- Backend on localhost:8500
- App installed (`npx cap run android`)

**What it tests:**
- ✅ Emulator connected
- ✅ ADB reverse configured
- ✅ App installed and launches
- ✅ No console errors
- ✅ Screenshots captured

---

### iOS E2E Test
**File**: `tests/e2e/ios/test-ios-e2e.js`  
**Duration**: ~30 seconds

```bash
node tests/e2e/ios/test-ios-e2e.js
```

**Prerequisites:**
- iOS Simulator running
- Backend on localhost:8500
- App installed (`npx cap run ios`)

**What it tests:**
- ✅ Simulator running
- ✅ App installed and launches
- ✅ App terminates and relaunches
- ✅ Screenshots captured

---

### Mobile Suite (Both Platforms)
**File**: `tests/e2e/test-mobile-e2e.js`  
**Duration**: ~60 seconds

```bash
node tests/e2e/test-mobile-e2e.js           # Both
node tests/e2e/test-mobile-e2e.js android   # Android only
node tests/e2e/test-mobile-e2e.js ios       # iOS only
```

---

## 🌐 Web E2E Tests (Playwright)

### Quick Check Test ⚡
**File**: `tests/e2e/web/test-quick-check.js`  
**Duration**: ~15 seconds

```bash
node tests/e2e/web/test-quick-check.js
```

**What it tests:**
- ✅ App loads correctly
- ✅ Category selection works
- ✅ Session starts
- ✅ Video reel opens

**Use when**: Quick sanity check after changes.

---

### 2. Video Reel E2E Test 🎬
**File**: `tests/test-video-reel-e2e.js`  
**Duration**: ~40 seconds  
**Purpose**: Complete end-to-end flow testing

```bash
node tests/test-video-reel-e2e.js
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
**File**: `tests/test-video-playback.js`  
**Duration**: ~35 seconds  
**Purpose**: Detailed video functionality verification

```bash
node tests/test-video-playback.js
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

### 4. AI Video Selector Test 🤖
**File**: `tests/test-ai-video-selector.js`  
**Duration**: ~40 seconds  
**Purpose**: Test the new AI video feature UI flow

```bash
node tests/test-ai-video-selector.js
```

**What it tests:**
- ✅ Video Source Selector appears on swipe left
- ✅ Both YouTube and AI options are visible
- ✅ YouTube option opens YouTube reel
- ✅ AI option opens AI loading screen
- ✅ Loading screen shows progress bars
- ✅ Navigation and closing work correctly

**Use when**: You want to verify the AI video feature UI without waiting for generation.

---

### 5. AI Video Generation Test 🎬🤖
**File**: `tests/test-ai-video-generation.js`  
**Duration**: ~5-10 minutes ⚠️  
**Purpose**: Full AI video generation end-to-end test

```bash
node tests/test-ai-video-generation.js
```

**What it tests:**
- ✅ Complete AI video generation flow
- ✅ Progress bars update correctly
- ✅ Videos appear in reel when ready
- ✅ Video playback works in AI reel
- ✅ Navigation in AI reel works

**Prerequisites:**
- `OPENAI_API_KEY` configured in `backend/.env`
- OpenAI Sora API access
- Sufficient API credits (~$0.30-1.50 per test)

**Use when**: You want to test the complete AI generation pipeline (rarely needed).

**⚠️  WARNING**: This test takes 5-10 minutes and costs money!

---

### 6. Native Build Test 📱
**File**: `tests/test-native-build.js`  
**Duration**: ~30 seconds  
**Purpose**: Verify Capacitor iOS/Android build system

```bash
node tests/test-native-build.js
```

**What it tests:**
- ✅ Capacitor configuration exists
- ✅ iOS project exists and syncs
- ✅ Android project exists and syncs
- ✅ Build script exists
- ✅ Web build works

**Use when**: After modifying Capacitor config or native projects.

---

### 7. Android E2E Test 📱
**File**: `tests/test-android-e2e.js`  
**Duration**: ~30 seconds  
**Purpose**: Test Android app on emulator

```bash
node tests/test-android-e2e.js
```

**What it tests:**
- ✅ Emulator connected
- ✅ ADB reverse configured
- ✅ App installed and launches
- ✅ Main screen loads
- ✅ No console errors
- ✅ Screenshots captured

**Prerequisites**: Android emulator running, backend on localhost:8500

---

### 8. iOS E2E Test 🍎
**File**: `tests/test-ios-e2e.js`  
**Duration**: ~30 seconds  
**Purpose**: Test iOS app on simulator

```bash
node tests/test-ios-e2e.js
```

**What it tests:**
- ✅ Simulator running
- ✅ App installed and launches
- ✅ App terminates and relaunches
- ✅ Screenshots captured

**Prerequisites**: iOS Simulator running, backend on localhost:8500

---

### 9. Mobile E2E Suite 📱🍎
**File**: `tests/test-mobile-e2e.js`  
**Duration**: ~60 seconds  
**Purpose**: Run both Android and iOS tests

```bash
node tests/test-mobile-e2e.js           # Both platforms
node tests/test-mobile-e2e.js android   # Android only
node tests/test-mobile-e2e.js ios       # iOS only
```

**Use when**: After deploying to both platforms.

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

4. **Ensure API keys are configured** in `backend/.env`:
   ```bash
   # Required for YouTube videos
   YOUTUBE_API_KEY=your_key_here
   
   # Required for AI video tests (optional)
   OPENAI_API_KEY=your_key_here
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
- `test-ai-selector-*.png` - AI selector test screenshots
- `test-ai-gen-*.png` - AI generation test screenshots (if run)

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

### Standard Tests (YouTube features)
To run all standard tests in sequence:

```bash
# Quick check first
node tests/test-quick-check.js

# Then full E2E
node tests/test-video-reel-e2e.js

# Finally detailed playback test
node tests/test-video-playback.js

# AI selector test (UI only, fast)
node tests/test-ai-video-selector.js
```

### Full AI Test (Optional, Slow)
⚠️  Only run this when you need to test actual AI generation:

```bash
# Full AI generation test (5-10 minutes, costs money)
node tests/test-ai-video-generation.js
```

### Run All Standard Tests at Once
```bash
./tests/run-all-tests.sh
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
