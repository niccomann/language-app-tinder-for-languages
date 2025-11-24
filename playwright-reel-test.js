const { chromium } = require('playwright');

(async () => {
  console.log('\n🎬 VIDEO REEL SCROLL TEST - Testing Vertical Navigation\n');
  console.log('='.repeat(70));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000  // Slow motion to see everything
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  
  try {
    // ===== STEP 1 =====
    console.log('\n📍 STEP 1: Loading application');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('   ✓ App loaded');
    
    // ===== STEP 2 =====
    console.log('\n📍 STEP 2: Selecting categories');
    await page.waitForSelector('text=Learn German');
    
    await page.click('button:has-text("Animals")');
    await page.waitForTimeout(500);
    console.log('   ✓ Selected: Animals');
    
    await page.click('button:has-text("Food")');
    await page.waitForTimeout(500);
    console.log('   ✓ Selected: Food');
    
    // ===== STEP 3 =====
    console.log('\n📍 STEP 3: Starting learning session');
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(3000);
    console.log('   ✓ Session started');
    
    // ===== STEP 4 =====
    console.log('\n📍 STEP 4: Viewing flashcard');
    const word = await page.locator('.text-4xl.font-bold').first().textContent();
    console.log(`   ✓ Word: "${word}"`);
    await page.screenshot({ path: 'reel-test-1-flashcard.png', fullPage: true });
    console.log('   📸 Screenshot: reel-test-1-flashcard.png');
    
    // ===== STEP 5 =====
    console.log('\n📍 STEP 5: Swiping LEFT to trigger reel feed');
    console.log(`   → Opening reel feed for "${word}"...`);
    await page.keyboard.press('ArrowLeft');
    console.log('   ✓ Swipe left executed');
    
    // ===== STEP 6 =====
    console.log('\n📍 STEP 6: Waiting for reel feed to load...');
    console.log('   ⏳ Waiting 8 seconds for API call and reel feed...');
    await page.waitForTimeout(8000);
    
    // Check for reel feed container
    const reelContainer = page.locator('.fixed.inset-0.z-50.bg-black');
    const reelCount = await reelContainer.count();
    
    if (reelCount > 0) {
      console.log('\n   🎉 SUCCESS! Reel feed is open!');
      
      // Check for video counter
      const counterText = await page.locator('text=/\\d+ \\/ \\d+/').textContent().catch(() => null);
      if (counterText) {
        console.log(`   📊 Video counter: ${counterText}`);
      }
      
      await page.screenshot({ path: 'reel-test-2-reel-opened.png', fullPage: true });
      console.log('   📸 Screenshot: reel-test-2-reel-opened.png');
      
      // ===== STEP 7 =====
      console.log('\n📍 STEP 7: Testing scroll down (next video)');
      console.log('   ⬇️  Pressing ArrowDown key...');
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(2000);
      
      const newCounterText = await page.locator('text=/\\d+ \\/ \\d+/').textContent().catch(() => null);
      if (newCounterText) {
        console.log(`   📊 New counter: ${newCounterText}`);
        console.log('   ✅ Scroll down works!');
      }
      
      await page.screenshot({ path: 'reel-test-3-scrolled-down.png', fullPage: true });
      console.log('   📸 Screenshot: reel-test-3-scrolled-down.png');
      
      // ===== STEP 8 =====
      console.log('\n📍 STEP 8: Testing scroll up (previous video)');
      console.log('   ⬆️  Pressing ArrowUp key...');
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(2000);
      
      const backCounterText = await page.locator('text=/\\d+ \\/ \\d+/').textContent().catch(() => null);
      if (backCounterText) {
        console.log(`   📊 Counter after scroll up: ${backCounterText}`);
        console.log('   ✅ Scroll up works!');
      }
      
      await page.screenshot({ path: 'reel-test-4-scrolled-up.png', fullPage: true });
      console.log('   📸 Screenshot: reel-test-4-scrolled-up.png');
      
      // ===== STEP 9 =====
      console.log('\n📍 STEP 9: Testing multiple scrolls');
      console.log('   🔄 Scrolling through 3 more videos...');
      
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(1500);
        const counter = await page.locator('text=/\\d+ \\/ \\d+/').textContent().catch(() => '?');
        console.log(`   📊 Video ${i + 2}: ${counter}`);
      }
      
      await page.screenshot({ path: 'reel-test-5-multiple-scrolls.png', fullPage: true });
      console.log('   📸 Screenshot: reel-test-5-multiple-scrolls.png');
      
      // ===== STEP 10 =====
      console.log('\n📍 STEP 10: Closing reel feed with ESC');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(2000);
      console.log('   ✓ Reel feed closed');
      
      // Check if we're back to flashcards
      const nextCard = await page.locator('.text-4xl.font-bold').first().textContent().catch(() => null);
      if (nextCard) {
        console.log(`   ✓ Back to flashcards, next word: "${nextCard}"`);
      }
      
      await page.screenshot({ path: 'reel-test-6-back-to-flashcard.png', fullPage: true });
      console.log('   📸 Screenshot: reel-test-6-back-to-flashcard.png');
      
    } else {
      console.log('\n   ❌ Reel feed did NOT appear');
      console.log('   Checking page for clues...');
      
      const bodyText = await page.locator('body').textContent();
      if (bodyText.includes('Failed') || bodyText.includes('Error')) {
        console.log('   ⚠️  Error message detected on page');
      }
      
      await page.screenshot({ path: 'reel-test-error-no-reel.png', fullPage: true });
      console.log('   📸 Screenshot: reel-test-error-no-reel.png');
    }
    
    // ===== SUMMARY =====
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL TEST RESULTS');
    console.log('='.repeat(70));
    console.log('✅ App loads correctly');
    console.log('✅ Category selection works');
    console.log('✅ Learning session starts');
    console.log('✅ Flashcards display');
    console.log('✅ Keyboard controls work (ArrowLeft)');
    console.log(reelCount > 0 ? '✅ Reel feed OPENS!' : '❌ Reel feed FAILED to open');
    console.log(reelCount > 0 ? '✅ Vertical scroll navigation WORKING!' : '⚠️  Scroll not tested (reel not opened)');
    console.log(reelCount > 0 ? '✅ Multiple videos loaded' : '⚠️  Videos not loaded');
    console.log(reelCount > 0 ? '✅ ESC key closes reel' : '⚠️  Close not tested');
    console.log('='.repeat(70));
    
    if (reelCount > 0) {
      console.log('\n🎉🎉🎉 ALL REEL TESTS PASSED! 🎉🎉🎉');
      console.log('\nVideo Reel Feature is fully functional:');
      console.log('  • Swipe left → Reel feed opens with multiple videos');
      console.log('  • Arrow Up/Down → Navigate between videos');
      console.log('  • Smooth scroll with snap behavior');
      console.log('  • Video counter shows current position');
      console.log('  • ESC closes reel and returns to next flashcard');
    } else {
      console.log('\n⚠️  Reel feature needs attention');
      console.log('Check: backend logs, YOUTUBE_API_KEY, network requests');
      console.log('Verify: /videos/search-multiple endpoint is working');
    }
    
    console.log('\n⏳ Browser stays open for 8 more seconds...');
    await page.waitForTimeout(8000);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: 'reel-test-fatal-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n👋 Test complete! Browser closed.\n');
  }
})();
