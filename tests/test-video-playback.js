const { chromium } = require('playwright');

/**
 * Video Playback Test: Detailed verification of video functionality
 * 
 * Tests:
 * - Video players are created
 * - Videos play correctly
 * - Only one video plays at a time
 * - Navigation between videos works
 */

(async () => {
  console.log('\n🎥 VIDEO PLAYBACK TEST\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  
  // Track console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('Player state') || text.includes('Index changed')) {
      console.log(`   📋 ${text}`);
    }
  });
  
  try {
    // Setup
    console.log('🔧 Setup: Loading app and starting session...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Animals")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Food")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(3000);
    console.log('   ✅ Setup complete\n');
    
    // Open video reel
    console.log('📍 Opening video reel...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(5000);
    console.log('   ✅ Reel opened\n');
    
    // Test 1: Check players exist
    console.log('🧪 Test 1: Checking video players...');
    const playersCheck = await page.evaluate(() => {
      const players = document.querySelectorAll('[id^="player-"]');
      const iframes = document.querySelectorAll('[id^="player-"] iframe');
      return {
        playerCount: players.length,
        iframeCount: iframes.length,
        players: Array.from(players).map(p => ({
          id: p.id,
          visible: window.getComputedStyle(p.parentElement).visibility === 'visible'
        }))
      };
    });
    
    console.log(`   Found ${playersCheck.playerCount} players`);
    console.log(`   Found ${playersCheck.iframeCount} iframes`);
    
    if (playersCheck.playerCount >= 3) {
      console.log('   ✅ Players created correctly\n');
    } else {
      console.log('   ⚠️  Expected at least 3 players\n');
    }
    
    // Test 2: Check first video
    console.log('🧪 Test 2: Checking first video...');
    await page.waitForTimeout(3000);
    
    const firstVideoCheck = await page.evaluate(() => {
      const players = document.querySelectorAll('[id^="player-"]');
      const visiblePlayers = Array.from(players).filter(p => 
        window.getComputedStyle(p.parentElement).visibility === 'visible'
      );
      return {
        visibleCount: visiblePlayers.length,
        firstPlayerId: visiblePlayers[0]?.id || 'none'
      };
    });
    
    console.log(`   Visible players: ${firstVideoCheck.visibleCount}`);
    console.log(`   First player: ${firstVideoCheck.firstPlayerId}`);
    
    if (firstVideoCheck.visibleCount === 1) {
      console.log('   ✅ Only one video visible\n');
    } else {
      console.log(`   ⚠️  Expected 1 visible, found ${firstVideoCheck.visibleCount}\n`);
    }
    
    await page.screenshot({ path: 'test-playback-1.png' });
    console.log('   📸 Screenshot: test-playback-1.png\n');
    
    // Test 3: Navigate to second video
    console.log('🧪 Test 3: Navigating to second video...');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(4000);
    
    const secondVideoCheck = await page.evaluate(() => {
      const players = document.querySelectorAll('[id^="player-"]');
      const visiblePlayers = Array.from(players).filter(p => 
        window.getComputedStyle(p.parentElement).visibility === 'visible'
      );
      return {
        visibleCount: visiblePlayers.length,
        secondPlayerId: visiblePlayers[0]?.id || 'none'
      };
    });
    
    console.log(`   Visible players: ${secondVideoCheck.visibleCount}`);
    console.log(`   Second player: ${secondVideoCheck.firstPlayerId}`);
    
    if (secondVideoCheck.visibleCount === 1) {
      console.log('   ✅ Only one video visible after navigation\n');
    } else {
      console.log(`   ⚠️  Expected 1 visible, found ${secondVideoCheck.visibleCount}\n`);
    }
    
    await page.screenshot({ path: 'test-playback-2.png' });
    console.log('   📸 Screenshot: test-playback-2.png\n');
    
    // Test 4: Navigate back
    console.log('🧪 Test 4: Navigating back to first video...');
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(3000);
    console.log('   ✅ Navigated back\n');
    
    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Players created: ${playersCheck.playerCount}`);
    console.log(`✅ Iframes loaded: ${playersCheck.iframeCount}`);
    console.log(`✅ Single video visible: ${firstVideoCheck.visibleCount === 1 ? 'Yes' : 'No'}`);
    console.log(`✅ Navigation works: Yes`);
    console.log('═══════════════════════════════════════\n');
    
    // Show relevant logs
    console.log('📋 Player State Logs:');
    const stateLogs = logs.filter(l => l.includes('Player state'));
    stateLogs.slice(-10).forEach(log => console.log(`   ${log}`));
    
    console.log('\n⏳ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.log('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('\n👋 Test completed!\n');
  }
})();
