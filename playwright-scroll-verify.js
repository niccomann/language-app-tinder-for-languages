const { chromium } = require('playwright');

(async () => {
  console.log('\n🎬 VIDEO SCROLL TEST - Verifying Both Videos\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Player state') || text.includes('Index changed')) {
      console.log(`🖥️  ${text}`);
    }
  });
  
  try {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Select categories
    console.log('📍 Selecting categories...');
    await page.click('button:has-text("Animals")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Food")');
    await page.waitForTimeout(300);
    
    // Start
    console.log('📍 Starting session...');
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(3000);
    
    // Open reel
    console.log('\n📍 Opening reel...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(5000);
    
    // Take screenshot of first video
    await page.screenshot({ path: 'scroll-test-1-first.png', fullPage: true });
    console.log('📸 Screenshot 1: First video');
    
    // Check first video
    const firstCheck = await page.evaluate(() => {
      const container = document.querySelector('[class*="overflow-y-auto"]');
      if (!container) return { error: 'Container not found' };
      
      const videos = container.querySelectorAll('[class*="snap-start"]');
      const firstVideo = videos[0];
      
      if (!firstVideo) return { error: 'No videos found' };
      
      const thumbnail = firstVideo.querySelector('[style*="backgroundImage"]');
      const player = firstVideo.querySelector('[id^="player-"]');
      
      return {
        videoCount: videos.length,
        hasThumbnail: thumbnail !== null,
        thumbnailVisible: thumbnail ? window.getComputedStyle(thumbnail).display !== 'none' : false,
        playerVisible: player ? window.getComputedStyle(player).visibility === 'visible' : false,
      };
    });
    
    console.log('\n📊 First Video Check:');
    console.log('   Video count:', firstCheck.videoCount);
    console.log('   Has thumbnail:', firstCheck.hasThumbnail);
    console.log('   Thumbnail visible:', firstCheck.thumbnailVisible);
    console.log('   Player visible:', firstCheck.playerVisible);
    
    // Wait for first video to play
    await page.waitForTimeout(3000);
    
    // Scroll to second video
    console.log('\n📍 Scrolling to second video...');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(5000);
    
    // Take screenshot of second video
    await page.screenshot({ path: 'scroll-test-2-second.png', fullPage: true });
    console.log('📸 Screenshot 2: Second video');
    
    // Check second video
    const secondCheck = await page.evaluate(() => {
      const container = document.querySelector('[class*="overflow-y-auto"]');
      const videos = container.querySelectorAll('[class*="snap-start"]');
      const secondVideo = videos[1];
      
      if (!secondVideo) return { error: 'Second video not found' };
      
      const thumbnail = secondVideo.querySelector('[style*="backgroundImage"]');
      const player = secondVideo.querySelector('[id^="player-"]');
      
      // Check what's visible
      const rect = secondVideo.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      return {
        hasThumbnail: thumbnail !== null,
        thumbnailVisible: thumbnail ? window.getComputedStyle(thumbnail).display !== 'none' : false,
        playerVisible: player ? window.getComputedStyle(player).visibility === 'visible' : false,
        isInView: rect.top >= containerRect.top && rect.bottom <= containerRect.bottom,
        backgroundColor: window.getComputedStyle(secondVideo).backgroundColor,
      };
    });
    
    console.log('\n📊 Second Video Check:');
    console.log('   Has thumbnail:', secondCheck.hasThumbnail);
    console.log('   Thumbnail visible:', secondCheck.thumbnailVisible);
    console.log('   Player visible:', secondCheck.playerVisible);
    console.log('   Is in view:', secondCheck.isInView);
    console.log('   Background color:', secondCheck.backgroundColor);
    
    // Determine what user sees
    if (secondCheck.thumbnailVisible) {
      console.log('\n✅ User sees: THUMBNAIL (loading or inactive)');
    } else if (secondCheck.playerVisible) {
      console.log('\n✅ User sees: VIDEO PLAYER');
    } else {
      console.log('\n❌ User sees: BLANK/WHITE SCREEN');
      console.log('   Background:', secondCheck.backgroundColor);
    }
    
    console.log('\n⏳ Keeping browser open for 15 seconds to inspect...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await browser.close();
    console.log('\n👋 Done!\n');
  }
})();
