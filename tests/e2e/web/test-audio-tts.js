const { chromium } = require('playwright');
const { DEFAULT_FRONTEND_URL: FRONTEND_URL } = require('../../helpers/testUrls');

/**
 * Audio TTS E2E Test
 * 
 * Tests the Text-to-Speech functionality:
 * 1. AudioButton visibility in Card (swipe screen)
 * 2. AudioButton visibility in Words Library
 * 3. AudioButton click triggers audio playback
 * 4. Audio saved to database (cached on second call)
 */

(async () => {
  console.log('\n🔊 AUDIO TTS E2E TEST\n');
  console.log('This test verifies the Text-to-Speech functionality.\n');
  console.log('═══════════════════════════════════════\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 }
  });
  
  const testResults = {
    audioButtonInCard: false,
    audioButtonInLibrary: false,
    audioButtonClick: false,
    audioApiCall: false,
    audioCached: false
  };
  
  let audioApiCalled = false;
  let audioCachedResponse = false;
  
  page.on('response', async (response) => {
    if (response.url().includes('/api/tts/speak')) {
      audioApiCalled = true;
      try {
        const json = await response.json();
        if (json.cached === true) {
          audioCachedResponse = true;
        }
      } catch (e) {}
    }
  });
  
  try {
    // Step 1: Navigate to app and start learning
    console.log('📍 Step 1: Opening the application...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('   ✅ Application loaded\n');
    
    // Step 2: Select categories and start learning
    console.log('📍 Step 2: Starting learning session...');
    const selectAllButton = page.getByRole('button', { name: 'Select All' }).first();
    await selectAllButton.click();
    await page.waitForTimeout(500);
    
    const startButton = page.locator('button:has-text("Start Learning")');
    await startButton.click();
    await page.waitForTimeout(2000);
    console.log('   ✅ Learning session started\n');
    
    // Step 3: Check for AudioButton in Card
    console.log('📍 Step 3: Checking AudioButton in Card...');
    const audioButtonInCard = page.locator('.rounded-3xl button:has(svg)').first();
    if (await audioButtonInCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      testResults.audioButtonInCard = true;
      console.log('   ✅ AudioButton found in Card\n');
    } else {
      console.log('   ⚠️  AudioButton not visible in Card\n');
    }
    
    // Step 4: Click AudioButton to trigger TTS
    console.log('📍 Step 4: Testing AudioButton click...');
    if (testResults.audioButtonInCard) {
      await audioButtonInCard.click();
      await page.waitForTimeout(3000);
      
      if (audioApiCalled) {
        testResults.audioButtonClick = true;
        testResults.audioApiCall = true;
        console.log('   ✅ AudioButton click triggered TTS API call\n');
      } else {
        console.log('   ⚠️  TTS API not called\n');
      }
    }
    
    // Step 5: Click again to test caching
    console.log('📍 Step 5: Testing audio caching...');
    audioApiCalled = false;
    if (testResults.audioButtonInCard) {
      await audioButtonInCard.click();
      await page.waitForTimeout(3000);
      
      if (audioCachedResponse) {
        testResults.audioCached = true;
        console.log('   ✅ Audio returned from cache (cached: true)\n');
      } else {
        console.log('   ⚠️  Audio not cached or cache not detected\n');
      }
    }
    
    // Step 6: Navigate to Words Library
    console.log('📍 Step 6: Checking AudioButton in Words Library...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const libraryButton = page.locator('button:has-text("View Library")').first();
    await libraryButton.click();
    await page.waitForTimeout(2000);
    
    const audioButtonInLibrary = page.locator('button:has(svg[class*="lucide-volume"])').first();
    if (await audioButtonInLibrary.isVisible({ timeout: 5000 }).catch(() => false)) {
      testResults.audioButtonInLibrary = true;
      console.log('   ✅ AudioButton found in Words Library\n');
    } else {
      // Try alternative selector
      const altAudioButton = page.locator('.rounded-full:has(svg)').first();
      if (await altAudioButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        testResults.audioButtonInLibrary = true;
        console.log('   ✅ AudioButton found in Words Library\n');
      } else {
        console.log('   ⚠️  AudioButton not visible in Words Library\n');
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-audio-tts.png' });
    console.log('📸 Screenshot: test-audio-tts.png\n');
    
  } catch (error) {
    console.log(`\n❌ Test failed with error: ${error.message}\n`);
  }
  
  // Print results
  console.log('\n═══════════════════════════════════════');
  console.log('📊 TEST RESULTS SUMMARY\n');
  
  const results = Object.entries(testResults);
  let passed = 0;
  
  for (const [test, result] of results) {
    const status = result ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`   ${status} ${testName}`);
    if (result) passed++;
  }
  
  console.log(`\n   Total: ${passed}/${results.length} tests passed`);
  console.log('═══════════════════════════════════════\n');
  
  console.log('🔍 Browser will close in 5 seconds...');
  await page.waitForTimeout(5000);
  await browser.close();
  
  process.exit(passed === results.length ? 0 : 1);
})();
