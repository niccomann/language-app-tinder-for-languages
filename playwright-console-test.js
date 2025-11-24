const { chromium } = require('playwright');

(async () => {
  console.log('\n🔍 CONSOLE LOG TEST - Checking YouTube API Loading\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  
  // Capture ALL console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log(`🖥️  ${text}`);
  });
  
  // Capture errors
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
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
    
    // Swipe left to open reel
    console.log('\n📍 Opening reel...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(5000);
    
    // Check if YouTube API is loaded
    const ytApiStatus = await page.evaluate(() => {
      return {
        hasYT: typeof window.YT !== 'undefined',
        hasPlayer: typeof window.YT?.Player !== 'undefined',
        ytReady: window.YT?.loaded === 1,
      };
    });
    
    console.log('\n📊 YouTube API Status:');
    console.log('   hasYT:', ytApiStatus.hasYT);
    console.log('   hasPlayer:', ytApiStatus.hasPlayer);
    console.log('   ytReady:', ytApiStatus.ytReady);
    
    // Check players
    const playersInfo = await page.evaluate(() => {
      const players = document.querySelectorAll('[id^="player-"]');
      const results = [];
      
      players.forEach((player) => {
        const iframe = player.querySelector('iframe');
        results.push({
          id: player.id,
          exists: true,
          hasIframe: iframe !== null,
          iframeSrc: iframe ? iframe.src : 'N/A',
          innerHTML: player.innerHTML.substring(0, 100),
        });
      });
      
      return results;
    });
    
    console.log('\n📊 Players Info:');
    playersInfo.forEach((info, i) => {
      console.log(`\n   Player ${i + 1}: ${info.id}`);
      console.log(`      hasIframe: ${info.hasIframe}`);
      console.log(`      iframeSrc: ${info.iframeSrc}`);
      console.log(`      innerHTML: ${info.innerHTML}`);
    });
    
    // Filter relevant logs
    console.log('\n📋 Relevant Console Logs:');
    const relevantLogs = logs.filter(l => 
      l.includes('YouTube') || 
      l.includes('Creating') || 
      l.includes('Player') ||
      l.includes('🎥') ||
      l.includes('✅') ||
      l.includes('❌')
    );
    relevantLogs.forEach(log => console.log(`   ${log}`));
    
    await page.screenshot({ path: 'console-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved: console-test.png');
    
    console.log('\n⏳ Keeping browser open for 20 seconds to inspect...');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('\n👋 Done!\n');
  }
})();
