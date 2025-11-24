const { chromium } = require('playwright');

(async () => {
  console.log('\n🎥 VIDEO REEL TEST - Verifying Video Playback\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  
  // Capture console
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('🎬') || text.includes('▶️') || text.includes('⏸️') || text.includes('🔄')) {
      console.log(`🖥️  ${text}`);
    }
  });
  
  try {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Select categories
    console.log('\n📍 Selecting categories...');
    await page.click('button:has-text("Animals")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Food")');
    await page.waitForTimeout(300);
    
    // Start
    console.log('📍 Starting session...');
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(3000);
    
    // Swipe left
    console.log('\n📍 Opening reel...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(8000);
    
    // Check first video
    console.log('\n📍 Checking first video...');
    const firstVideoInfo = await page.evaluate(() => {
      const players = document.querySelectorAll('[id^="player-"]');
      const results = [];
      
      players.forEach((player, index) => {
        const style = window.getComputedStyle(player);
        const rect = player.getBoundingClientRect();
        const iframe = player.querySelector('iframe');
        results.push({
          id: player.id,
          display: style.display,
          zIndex: style.zIndex,
          width: rect.width,
          height: rect.height,
          hasIframe: iframe !== null,
          iframeVisible: iframe ? window.getComputedStyle(iframe).display !== 'none' : false,
          iframeSrc: iframe ? iframe.src.substring(0, 50) : 'N/A',
        });
      });
      
      return results;
    });
    
    console.log('\n📊 First Video State:');
    firstVideoInfo.forEach((info, i) => {
      console.log(`   Player ${i + 1}: ${info.id}`);
      console.log(`      display: ${info.display}`);
      console.log(`      zIndex: ${info.zIndex}`);
      console.log(`      size: ${info.width}x${info.height}`);
      console.log(`      hasIframe: ${info.hasIframe}`);
      console.log(`      iframeVisible: ${info.iframeVisible}`);
      console.log(`      iframeSrc: ${info.iframeSrc}`);
    });
    
    // Count visible players
    const visibleCount = firstVideoInfo.filter(p => p.visibility === 'visible').length;
    console.log(`\n   ✅ Visible players: ${visibleCount}`);
    if (visibleCount === 1) {
      console.log('   ✅ PASS: Only 1 video visible');
    } else {
      console.log(`   ❌ FAIL: ${visibleCount} videos visible (should be 1)`);
    }
    
    await page.screenshot({ path: 'video-test-1-first.png', fullPage: true });
    
    // Scroll to second video
    console.log('\n📍 Scrolling to second video...');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(3000);
    
    // Check second video
    const secondVideoInfo = await page.evaluate(() => {
      const players = document.querySelectorAll('[id^="player-"]');
      const results = [];
      
      players.forEach((player, index) => {
        const style = window.getComputedStyle(player);
        results.push({
          id: player.id,
          visibility: style.visibility,
          zIndex: style.zIndex,
        });
      });
      
      return results;
    });
    
    console.log('\n📊 Second Video State:');
    secondVideoInfo.forEach((info, i) => {
      console.log(`   Player ${i + 1}: visibility=${info.visibility}, zIndex=${info.zIndex}`);
    });
    
    const visibleCount2 = secondVideoInfo.filter(p => p.visibility === 'visible').length;
    console.log(`\n   ✅ Visible players: ${visibleCount2}`);
    if (visibleCount2 === 1) {
      console.log('   ✅ PASS: Only 1 video visible after scroll');
    } else {
      console.log(`   ❌ FAIL: ${visibleCount2} videos visible (should be 1)`);
    }
    
    await page.screenshot({ path: 'video-test-2-second.png', fullPage: true });
    
    // Check for playing state in logs
    console.log('\n📊 Checking console logs for playback...');
    const playLogs = logs.filter(l => l.includes('Player state changed') && l.includes('playing'));
    console.log(`   Found ${playLogs.length} "playing" state changes`);
    playLogs.slice(0, 5).forEach(log => console.log(`   ${log}`));
    
    console.log('\n⏳ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await browser.close();
    console.log('\n👋 Done!\n');
  }
})();
