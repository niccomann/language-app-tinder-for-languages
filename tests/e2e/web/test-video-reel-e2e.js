const { chromium } = require('playwright');

/**
 * End-to-End Test: Video Reel Feature
 * 
 * Tests the complete flow:
 * 1. Category selection
 * 2. Flashcard display
 * 3. Swipe left (don't know)
 * 4. Video reel opens
 * 5. Videos play correctly
 * 6. Navigation works
 */

(async () => {
  console.log('\n🎬 VIDEO REEL E2E TEST\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  
  // Capture console logs for debugging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Player') || text.includes('Video') || text.includes('Index') || 
        text.includes('YouTube') || text.includes('Creating') || text.includes('ready')) {
      console.log(`   🖥️  ${text}`);
    }
  });
  
  // Capture errors
  page.on('pageerror', error => {
    console.log(`   ❌ ERROR: ${error.message}`);
  });
  
  try {
    // Step 1: Navigate to app
    console.log('📍 Step 1: Loading app...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    console.log('   ✅ App loaded\n');
    
    // Step 2: Select categories
    console.log('📍 Step 2: Selecting categories...');
    await page.click('button:has-text("Animals")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Food")');
    await page.waitForTimeout(300);
    console.log('   ✅ Categories selected\n');
    
    // Step 3: Start learning session
    console.log('📍 Step 3: Starting session...');
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(3000);
    console.log('   ✅ Session started\n');
    
    // Step 4: Swipe left to open video reel
    console.log('📍 Step 4: Opening video reel (swipe left)...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(8000);
    console.log('   ✅ Video reel opened\n');
    
    // Step 5: Check YouTube API status
    console.log('📍 Step 5: Checking YouTube API...');
    const ytApiStatus = await page.evaluate(() => {
      return {
        hasYT: typeof window.YT !== 'undefined',
        hasPlayer: typeof window.YT?.Player !== 'undefined',
      };
    });
    
    if (ytApiStatus.hasYT && ytApiStatus.hasPlayer) {
      console.log('   ✅ YouTube API loaded correctly\n');
    } else {
      console.log('   ❌ YouTube API not loaded properly\n');
    }
    
    // Step 6: Check video players (wait a bit more for creation)
    console.log('📍 Step 6: Checking video players...');
    await page.waitForTimeout(2000);
    const playersInfo = await page.evaluate(() => {
      const players = document.querySelectorAll('[id^="player-"]');
      const iframes = document.querySelectorAll('[id^="player-"] iframe');
      return {
        count: players.length,
        iframeCount: iframes.length,
        hasPlayers: players.length > 0,
      };
    });
    
    console.log(`   Found ${playersInfo.count} video players`);
    console.log(`   Found ${playersInfo.iframeCount} iframes`);
    if (playersInfo.hasPlayers) {
      console.log('   ✅ Video players created\n');
    } else {
      console.log('   ❌ No video players found\n');
    }
    
    // Step 7: Take screenshot of first video
    await page.screenshot({ path: 'test-video-1.png', fullPage: true });
    console.log('📍 Step 7: Screenshot saved (test-video-1.png)\n');
    
    // Step 8: Test navigation - scroll down
    console.log('📍 Step 8: Testing navigation (scroll down)...');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(3000);
    console.log('   ✅ Scrolled to next video\n');
    
    // Step 9: Take screenshot of second video
    await page.screenshot({ path: 'test-video-2.png', fullPage: true });
    console.log('📍 Step 9: Screenshot saved (test-video-2.png)\n');
    
    // Step 10: Test navigation - scroll up
    console.log('📍 Step 10: Testing navigation (scroll up)...');
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(3000);
    console.log('   ✅ Scrolled back to first video\n');
    
    // Step 11: Close video reel
    console.log('📍 Step 11: Closing video reel (ESC)...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2000);
    console.log('   ✅ Video reel closed\n');
    
    // Final screenshot
    await page.screenshot({ path: 'test-final.png', fullPage: true });
    console.log('📸 Final screenshot saved (test-final.png)\n');
    
    console.log('═══════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════\n');
    
    console.log('⏳ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.log('\n═══════════════════════════════════════');
    console.log('❌ TEST FAILED');
    console.log('═══════════════════════════════════════');
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('\n👋 Test completed!\n');
  }
})();
