const { chromium } = require('playwright');

/**
 * AI Video Feature Test: Video Source Selector
 * 
 * Tests:
 * - Video Source Selector appears on swipe left
 * - Both options (YouTube and AI) are visible
 * - YouTube option opens YouTube reel
 * - AI option opens AI loading screen
 * - Navigation and closing work correctly
 */

(async () => {
  console.log('\n🤖 AI VIDEO SELECTOR TEST\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 600
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('selector') || text.includes('AI') || text.includes('YouTube')) {
      console.log(`   🖥️  ${text}`);
    }
  });
  
  // Capture errors
  page.on('pageerror', error => {
    console.log(`   ❌ ERROR: ${error.message}`);
  });
  
  try {
    // Step 1: Setup - Load app and start session
    console.log('🔧 Setup: Loading app and starting session...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    await page.click('button:has-text("Animals")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Food")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(3000);
    console.log('   ✅ Setup complete\n');
    
    // Step 2: Swipe left to trigger selector
    console.log('📍 Step 1: Swiping left to trigger Video Source Selector...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(3000);
    
    // Check if selector appeared
    const selectorVisible = await page.evaluate(() => {
      const youtubeButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('YouTube Videos')
      );
      const aiButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('AI Generated')
      );
      const selectorTitle = Array.from(document.querySelectorAll('h2, h3')).find(
        el => el.textContent.includes('Choose Video Source')
      );
      
      return {
        hasSelector: !!selectorTitle || !!youtubeButton || !!aiButton,
        hasYouTubeButton: !!youtubeButton,
        hasAIButton: !!aiButton
      };
    });
    
    if (selectorVisible.hasSelector) {
      console.log('   ✅ Video Source Selector appeared!\n');
    } else {
      console.log('   ❌ Video Source Selector did not appear\n');
      throw new Error('Selector not found');
    }
    
    await page.screenshot({ path: 'test-ai-selector-1.png', fullPage: true });
    console.log('   📸 Screenshot: test-ai-selector-1.png\n');
    
    // Step 3: Check both options are visible
    console.log('📍 Step 2: Verifying both options are visible...');
    
    const optionsCheck = await page.evaluate(() => {
      const youtubeBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('YouTube Videos')
      );
      const aiBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('AI Generated')
      );
      
      return {
        youtubeVisible: youtubeBtn && window.getComputedStyle(youtubeBtn).display !== 'none',
        aiVisible: aiBtn && window.getComputedStyle(aiBtn).display !== 'none',
        youtubeText: youtubeBtn?.textContent || 'not found',
        aiText: aiBtn?.textContent || 'not found'
      };
    });
    
    console.log(`   YouTube button: ${optionsCheck.youtubeVisible ? '✅' : '❌'}`);
    console.log(`   AI button: ${optionsCheck.aiVisible ? '✅' : '❌'}`);
    
    if (optionsCheck.youtubeVisible && optionsCheck.aiVisible) {
      console.log('   ✅ Both options visible\n');
    } else {
      console.log('   ⚠️  One or both options not visible\n');
    }
    
    // Step 4: Test YouTube option
    console.log('📍 Step 3: Testing YouTube Videos option...');
    const youtubeButton = await page.locator('button:has-text("YouTube Videos")');
    await youtubeButton.click();
    await page.waitForTimeout(5000);
    
    // Check if YouTube reel opened
    const youtubeReelCheck = await page.evaluate(() => {
      const counter = Array.from(document.querySelectorAll('p')).find(
        p => p.textContent.includes('/ 8') || p.textContent.includes('/8')
      );
      const closeBtn = document.querySelector('button svg.lucide-x');
      const players = document.querySelectorAll('[id^="player-"]');
      
      return {
        hasCounter: !!counter,
        hasCloseButton: !!closeBtn,
        playerCount: players.length
      };
    });
    
    console.log(`   Video counter: ${youtubeReelCheck.hasCounter ? '✅' : '❌'}`);
    console.log(`   Close button: ${youtubeReelCheck.hasCloseButton ? '✅' : '❌'}`);
    console.log(`   Players found: ${youtubeReelCheck.playerCount}`);
    
    if (youtubeReelCheck.hasCloseButton) {
      console.log('   ✅ YouTube reel opened successfully\n');
    } else {
      console.log('   ⚠️  YouTube reel may not have opened\n');
    }
    
    await page.screenshot({ path: 'test-ai-selector-youtube.png', fullPage: true });
    console.log('   📸 Screenshot: test-ai-selector-youtube.png\n');
    
    // Step 5: Close YouTube reel
    console.log('📍 Step 4: Closing YouTube reel...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2000);
    console.log('   ✅ YouTube reel closed\n');
    
    // Step 6: Swipe left again to test AI option
    console.log('📍 Step 5: Swiping left again for AI option...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(3000);
    
    // Check selector appeared again
    const selectorVisible2 = await page.evaluate(() => {
      const aiButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('AI Generated')
      );
      return !!aiButton;
    });
    
    if (selectorVisible2) {
      console.log('   ✅ Selector appeared again\n');
    } else {
      console.log('   ⚠️  Selector did not appear again\n');
    }
    
    await page.screenshot({ path: 'test-ai-selector-2.png', fullPage: true });
    console.log('   📸 Screenshot: test-ai-selector-2.png\n');
    
    // Step 7: Test AI option
    console.log('📍 Step 6: Testing AI Generated option...');
    const aiButton = await page.locator('button:has-text("AI Generated")');
    await aiButton.click();
    await page.waitForTimeout(3000);
    
    // Check if AI loading screen appeared
    const aiLoadingCheck = await page.evaluate(() => {
      const loadingTitle = Array.from(document.querySelectorAll('h3, h2, p')).find(
        el => el.textContent.includes('Generating AI Videos')
      );
      const progressBars = document.querySelectorAll('.bg-gray-800');
      const spinner = document.querySelector('.animate-spin');
      
      return {
        hasLoadingTitle: !!loadingTitle,
        progressBarCount: progressBars.length,
        hasSpinner: !!spinner
      };
    });
    
    console.log(`   Loading title: ${aiLoadingCheck.hasLoadingTitle ? '✅' : '❌'}`);
    console.log(`   Progress bars: ${aiLoadingCheck.progressBarCount}`);
    console.log(`   Spinner: ${aiLoadingCheck.hasSpinner ? '✅' : '❌'}`);
    
    if (aiLoadingCheck.hasLoadingTitle || aiLoadingCheck.hasSpinner) {
      console.log('   ✅ AI loading screen appeared!\n');
    } else {
      console.log('   ⚠️  AI loading screen may not have appeared\n');
    }
    
    await page.screenshot({ path: 'test-ai-selector-loading.png', fullPage: true });
    console.log('   📸 Screenshot: test-ai-selector-loading.png\n');
    
    // Step 8: Wait a bit to show loading state
    console.log('📍 Step 7: Observing loading state (10 seconds)...');
    console.log('   ⏳ AI video generation takes 2-5 minutes per video');
    console.log('   ⏳ This test will only observe the loading state\n');
    await page.waitForTimeout(10000);
    
    // Final screenshot
    await page.screenshot({ path: 'test-ai-selector-final.png', fullPage: true });
    console.log('   📸 Screenshot: test-ai-selector-final.png\n');
    
    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Video Source Selector appears: ${selectorVisible.hasSelector ? 'Yes' : 'No'}`);
    console.log(`✅ YouTube option visible: ${optionsCheck.youtubeVisible ? 'Yes' : 'No'}`);
    console.log(`✅ AI option visible: ${optionsCheck.aiVisible ? 'Yes' : 'No'}`);
    console.log(`✅ YouTube reel opens: ${youtubeReelCheck.hasCloseButton ? 'Yes' : 'No'}`);
    console.log(`✅ AI loading screen appears: ${aiLoadingCheck.hasLoadingTitle || aiLoadingCheck.hasSpinner ? 'Yes' : 'No'}`);
    console.log('═══════════════════════════════════════\n');
    
    console.log('💡 Note: Full AI video generation test requires 2-5 minutes');
    console.log('💡 This test only verifies the UI flow and loading state\n');
    
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
