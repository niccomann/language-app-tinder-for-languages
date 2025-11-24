const { chromium } = require('playwright');

(async () => {
  console.log('\n🔍 VIDEO REEL DEBUG TEST - Capturing Console Logs\n');
  console.log('='.repeat(70));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 }
  });
  
  const page = await context.newPage();
  
  // Capture all console logs from the browser
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log(`🖥️  BROWSER: ${text}`);
  });
  
  try {
    // Load app
    console.log('\n📍 STEP 1: Loading application');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('   ✓ App loaded');
    
    // Select categories
    console.log('\n📍 STEP 2: Selecting categories');
    await page.click('button:has-text("Animals")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Food")');
    await page.waitForTimeout(300);
    console.log('   ✓ Categories selected');
    
    // Start learning
    console.log('\n📍 STEP 3: Starting learning session');
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(3000);
    console.log('   ✓ Session started');
    
    // Get word
    const word = await page.locator('.text-4xl.font-bold').first().textContent();
    console.log(`   ✓ Word: "${word}"`);
    
    // Swipe left
    console.log('\n📍 STEP 4: Swiping LEFT to open reel');
    await page.keyboard.press('ArrowLeft');
    console.log('   ✓ Swipe executed');
    
    // Wait for reel
    console.log('\n📍 STEP 5: Waiting for reel to load...');
    await page.waitForTimeout(8000);
    
    // Check if reel is open
    const reelOpen = await page.locator('.fixed.inset-0.z-50.bg-black').count() > 0;
    console.log(`   ${reelOpen ? '✅' : '❌'} Reel open: ${reelOpen}`);
    
    // Get initial counter
    const initialCounter = await page.locator('text=/\\d+ \\/ \\d+/').textContent().catch(() => 'N/A');
    console.log(`   📊 Initial counter: ${initialCounter}`);
    
    await page.screenshot({ path: 'debug-1-initial.png' });
    
    // Clear console logs
    consoleLogs.length = 0;
    
    // Test Arrow Down
    console.log('\n📍 STEP 6: Pressing Arrow DOWN');
    console.log('   ⬇️  Sending ArrowDown key...');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(2000);
    
    const afterDownCounter = await page.locator('text=/\\d+ \\/ \\d+/').textContent().catch(() => 'N/A');
    console.log(`   📊 Counter after down: ${afterDownCounter}`);
    console.log(`   ${initialCounter !== afterDownCounter ? '✅' : '❌'} Counter changed: ${initialCounter} → ${afterDownCounter}`);
    
    await page.screenshot({ path: 'debug-2-after-down.png' });
    
    // Show relevant console logs
    console.log('\n📋 RELEVANT CONSOLE LOGS:');
    const relevantLogs = consoleLogs.filter(log => 
      log.includes('Scroll') || 
      log.includes('Index') || 
      log.includes('Video') ||
      log.includes('goTo') ||
      log.includes('currentIndex')
    );
    
    if (relevantLogs.length > 0) {
      relevantLogs.forEach(log => console.log(`   ${log}`));
    } else {
      console.log('   ⚠️  No relevant logs found!');
    }
    
    // Clear logs again
    consoleLogs.length = 0;
    
    // Test Arrow Up
    console.log('\n📍 STEP 7: Pressing Arrow UP');
    console.log('   ⬆️  Sending ArrowUp key...');
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(2000);
    
    const afterUpCounter = await page.locator('text=/\\d+ \\/ \\d+/').textContent().catch(() => 'N/A');
    console.log(`   📊 Counter after up: ${afterUpCounter}`);
    console.log(`   ${afterDownCounter !== afterUpCounter ? '✅' : '❌'} Counter changed: ${afterDownCounter} → ${afterUpCounter}`);
    
    await page.screenshot({ path: 'debug-3-after-up.png' });
    
    // Show relevant console logs
    console.log('\n📋 RELEVANT CONSOLE LOGS:');
    const relevantLogs2 = consoleLogs.filter(log => 
      log.includes('Scroll') || 
      log.includes('Index') || 
      log.includes('Video') ||
      log.includes('goTo') ||
      log.includes('currentIndex')
    );
    
    if (relevantLogs2.length > 0) {
      relevantLogs2.forEach(log => console.log(`   ${log}`));
    } else {
      console.log('   ⚠️  No relevant logs found!');
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 DEBUG SUMMARY');
    console.log('='.repeat(70));
    console.log(`Initial counter: ${initialCounter}`);
    console.log(`After Arrow Down: ${afterDownCounter}`);
    console.log(`After Arrow Up: ${afterUpCounter}`);
    console.log(`\nCounter changes working: ${initialCounter !== afterDownCounter ? '✅ YES' : '❌ NO'}`);
    console.log('='.repeat(70));
    
    console.log('\n⏳ Browser stays open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: 'debug-error.png' });
  } finally {
    await browser.close();
    console.log('\n👋 Test complete! Browser closed.\n');
  }
})();
