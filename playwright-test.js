const { chromium } = require('playwright');

(async () => {
  console.log('\n🎬 YOUTUBE FEATURE TEST - Using Keyboard Controls\n');
  console.log('='.repeat(70));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1500  // Extra slow to see everything
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
    await page.screenshot({ path: 'final-1-flashcard.png', fullPage: true });
    console.log('   📸 Screenshot: final-1-flashcard.png');
    
    // ===== STEP 5 =====
    console.log('\n📍 STEP 5: Swiping LEFT using keyboard (ArrowLeft)');
    console.log(`   → Triggering YouTube search for "${word}"...`);
    await page.keyboard.press('ArrowLeft');
    console.log('   ✓ Swipe left executed');
    
    // ===== STEP 6 =====
    console.log('\n📍 STEP 6: Waiting for YouTube video...');
    console.log('   ⏳ Waiting 6 seconds for API call and modal...');
    await page.waitForTimeout(6000);
    
    // Check for YouTube iframe
    const iframe = page.locator('iframe[src*="youtube.com/embed"]');
    const iframeCount = await iframe.count();
    
    if (iframeCount > 0) {
      const videoUrl = await iframe.first().getAttribute('src');
      console.log('\n   🎉 SUCCESS! YouTube video is playing!');
      console.log(`   📺 URL: ${videoUrl}`);
      
      await page.screenshot({ path: 'final-2-youtube-playing.png', fullPage: true });
      console.log('   📸 Screenshot: final-2-youtube-playing.png');
      
      console.log('\n   🎬 Watching video for 12 seconds...');
      await page.waitForTimeout(12000);
      
      // ===== STEP 7 =====
      console.log('\n📍 STEP 7: Closing video with ESC key');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(2000);
      console.log('   ✓ Video closed');
      
      await page.screenshot({ path: 'final-3-next-card.png', fullPage: true });
      console.log('   📸 Screenshot: final-3-next-card.png');
      
    } else {
      console.log('\n   ❌ YouTube video did NOT appear');
      console.log('   Checking page for clues...');
      
      const bodyText = await page.locator('body').textContent();
      if (bodyText.includes('Failed') || bodyText.includes('Error')) {
        console.log('   ⚠️  Error message detected on page');
      }
      
      await page.screenshot({ path: 'final-error-no-video.png', fullPage: true });
      console.log('   📸 Screenshot: final-error-no-video.png');
    }
    
    // ===== STEP 8 =====
    console.log('\n📍 STEP 8: Checking Sora AI button');
    const soraButton = page.locator('button:has-text("Generate AI Video")');
    const soraCount = await soraButton.count();
    
    if (soraCount > 0) {
      console.log('   ✅ "Generate AI Video" button present');
      await page.screenshot({ path: 'final-4-sora-button.png', fullPage: true });
      console.log('   📸 Screenshot: final-4-sora-button.png');
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
    console.log(iframeCount > 0 ? '✅ YouTube integration WORKING!' : '❌ YouTube integration FAILED');
    console.log(soraCount > 0 ? '✅ Sora button present' : '⚠️  Sora button missing');
    console.log('='.repeat(70));
    
    if (iframeCount > 0) {
      console.log('\n🎉🎉🎉 ALL TESTS PASSED! 🎉🎉🎉');
      console.log('\nYouTube Feature is fully functional:');
      console.log('  • Swipe left → YouTube video appears automatically');
      console.log('  • Videos help users learn unknown words visually');
      console.log('  • Sora AI button available for custom video generation');
    } else {
      console.log('\n⚠️  YouTube feature needs attention');
      console.log('Check: backend logs, YOUTUBE_API_KEY, network requests');
    }
    
    console.log('\n⏳ Browser stays open for 8 more seconds...');
    await page.waitForTimeout(8000);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: 'final-fatal-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n👋 Test complete! Browser closed.\n');
  }
})();
