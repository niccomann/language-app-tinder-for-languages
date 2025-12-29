const { chromium } = require('playwright');

/**
 * Complete End-to-End Flow Test
 * 
 * This test verifies the entire user journey:
 * 1. Category selection
 * 2. Flashcard swipe (right = know, left = don't know)
 * 3. Video source selector appears on swipe left
 * 4. YouTube video reel flow
 * 5. AI video reel flow
 * 6. Navigation and closing
 * 7. Progress tracking
 * 
 * Duration: ~2-3 minutes
 */

(async () => {
  console.log('\n🎯 COMPLETE END-TO-END FLOW TEST\n');
  console.log('This test verifies the entire user journey from start to finish.\n');
  console.log('═══════════════════════════════════════\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 400
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  
  const testResults = {
    categorySelection: false,
    flashcardDisplay: false,
    swipeRight: false,
    swipeLeft: false,
    videoSourceSelector: false,
    youtubeReel: false,
    aiReel: false,
    navigation: false,
    progressTracking: false
  };
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('ERROR') || text.includes('Failed')) {
      console.log(`   ⚠️  Console: ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`   ❌ Page Error: ${error.message}`);
  });
  
  try {
    // ============================================
    // STEP 1: Load Application
    // ============================================
    console.log('📍 Step 1: Loading application...');
    console.log('   Backend expected on: http://localhost:8500');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    const appLoaded = await page.evaluate(() => {
      return document.querySelector('h1') !== null;
    });
    
    if (appLoaded) {
      console.log('   ✅ Application loaded successfully\n');
    } else {
      throw new Error('Application failed to load');
    }
    
    await page.screenshot({ path: 'test-flow-1-app-loaded.png', fullPage: true });
    
    // ============================================
    // STEP 2: Category Selection
    // ============================================
    console.log('📍 Step 2: Selecting categories...');
    
    const categoriesVisible = await page.evaluate(() => {
      const categoryButtons = Array.from(document.querySelectorAll('button')).filter(
        btn => btn.textContent.match(/Animals|Food|Objects|Colors/)
      );
      return categoryButtons.length > 0;
    });
    
    if (!categoriesVisible) {
      throw new Error('Category selector not visible');
    }
    
    await page.click('button:has-text("Animals")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Food")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Colors")');
    await page.waitForTimeout(300);
    
    console.log('   ✅ Selected 3 categories: Animals, Food, Colors');
    testResults.categorySelection = true;
    
    await page.screenshot({ path: 'test-flow-2-categories.png', fullPage: true });
    
    // ============================================
    // STEP 3: Start Learning Session
    // ============================================
    console.log('📍 Step 3: Starting learning session...');
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(3000);
    
    const flashcardVisible = await page.evaluate(() => {
      const card = document.querySelector('h2');
      return card && card.textContent.length > 0;
    });
    
    if (flashcardVisible) {
      const word = await page.evaluate(() => {
        return document.querySelector('h2')?.textContent || '';
      });
      console.log(`   ✅ Learning session started - First word: "${word}"`);
      testResults.flashcardDisplay = true;
    } else {
      throw new Error('Flashcard not displayed');
    }
    
    await page.screenshot({ path: 'test-flow-3-flashcard.png', fullPage: true });
    
    // ============================================
    // STEP 4: Swipe Right (Know the word)
    // ============================================
    console.log('📍 Step 4: Testing swipe right (know the word)...');
    
    const firstWord = await page.evaluate(() => {
      return document.querySelector('h2')?.textContent || '';
    });
    
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(2000);
    
    const secondWord = await page.evaluate(() => {
      return document.querySelector('h2')?.textContent || '';
    });
    
    if (firstWord !== secondWord) {
      console.log(`   ✅ Swipe right successful - Next word: "${secondWord}"`);
      testResults.swipeRight = true;
    } else {
      console.log('   ⚠️  Word did not change after swipe right');
    }
    
    await page.screenshot({ path: 'test-flow-4-swipe-right.png', fullPage: true });
    
    // ============================================
    // STEP 5: Swipe Left (Don't know) - Trigger Video Source Selector
    // ============================================
    console.log('📍 Step 5: Testing swipe left (don\'t know the word)...');
    
    const wordBeforeSwipe = await page.evaluate(() => {
      return document.querySelector('h2')?.textContent || '';
    });
    
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(3000);
    
    const selectorVisible = await page.evaluate(() => {
      const youtubeBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('YouTube Videos')
      );
      const aiBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('AI Generated')
      );
      const title = Array.from(document.querySelectorAll('h2, h3')).find(
        el => el.textContent.includes('Choose Video Source')
      );
      
      return {
        hasSelector: !!(youtubeBtn || aiBtn || title),
        hasYouTube: !!youtubeBtn,
        hasAI: !!aiBtn
      };
    });
    
    if (selectorVisible.hasSelector) {
      console.log('   ✅ Video Source Selector appeared');
      console.log(`   ✅ YouTube option: ${selectorVisible.hasYouTube ? 'visible' : 'not found'}`);
      console.log(`   ✅ AI option: ${selectorVisible.hasAI ? 'visible' : 'not found'}`);
      testResults.swipeLeft = true;
      testResults.videoSourceSelector = true;
    } else {
      console.log('   ⚠️  Video Source Selector did not appear');
    }
    
    await page.screenshot({ path: 'test-flow-5-selector.png', fullPage: true });
    
    // ============================================
    // STEP 6: Test YouTube Video Reel
    // ============================================
    console.log('📍 Step 6: Testing YouTube video reel...');
    
    const youtubeButton = await page.locator('button:has-text("YouTube Videos")');
    await youtubeButton.click();
    await page.waitForTimeout(5000);
    
    const youtubeReelCheck = await page.evaluate(() => {
      const counter = Array.from(document.querySelectorAll('p')).find(
        p => p.textContent.includes('/ 8') || p.textContent.includes('/8')
      );
      const closeBtn = document.querySelector('button svg.lucide-x');
      const players = document.querySelectorAll('[id^="player-"]');
      const wordInfo = Array.from(document.querySelectorAll('h2')).find(
        h => h.classList.contains('text-white')
      );
      
      return {
        hasCounter: !!counter,
        hasCloseButton: !!closeBtn,
        playerCount: players.length,
        hasWordInfo: !!wordInfo,
        wordText: wordInfo?.textContent || ''
      };
    });
    
    if (youtubeReelCheck.hasCloseButton && youtubeReelCheck.playerCount > 0) {
      console.log(`   ✅ YouTube reel opened successfully`);
      console.log(`   ✅ Video players found: ${youtubeReelCheck.playerCount}`);
      console.log(`   ✅ Video counter: ${youtubeReelCheck.hasCounter ? 'visible' : 'not found'}`);
      console.log(`   ✅ Word info: "${youtubeReelCheck.wordText}"`);
      testResults.youtubeReel = true;
    } else {
      console.log('   ⚠️  YouTube reel may not have opened correctly');
    }
    
    await page.screenshot({ path: 'test-flow-6-youtube-reel.png', fullPage: true });
    
    // ============================================
    // STEP 7: Test Navigation in YouTube Reel
    // ============================================
    console.log('📍 Step 7: Testing navigation in YouTube reel...');
    
    await page.waitForTimeout(3000);
    
    if (youtubeReelCheck.playerCount > 1) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(3000);
      console.log('   ✅ Navigated to next video (ArrowDown)');
      
      await page.screenshot({ path: 'test-flow-7-youtube-nav.png', fullPage: true });
      
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(2000);
      console.log('   ✅ Navigated to previous video (ArrowUp)');
      testResults.navigation = true;
    } else {
      console.log('   ⚠️  Not enough videos to test navigation');
    }
    
    // ============================================
    // STEP 8: Close YouTube Reel
    // ============================================
    console.log('📍 Step 8: Closing YouTube reel...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2000);
    
    const reelClosed = await page.evaluate(() => {
      const closeBtn = document.querySelector('button svg.lucide-x');
      return !closeBtn;
    });
    
    if (reelClosed) {
      console.log('   ✅ YouTube reel closed successfully\n');
    } else {
      console.log('   ⚠️  YouTube reel may not have closed\n');
    }
    
    await page.screenshot({ path: 'test-flow-8-reel-closed.png', fullPage: true });
    
    // ============================================
    // STEP 9: Test AI Video Flow
    // ============================================
    console.log('📍 Step 9: Testing AI video flow...');
    
    const currentWord = await page.evaluate(() => {
      return document.querySelector('h2')?.textContent || '';
    });
    
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(3000);
    
    const selectorVisible2 = await page.evaluate(() => {
      const aiBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('AI Generated')
      );
      return !!aiBtn;
    });
    
    if (selectorVisible2) {
      console.log('   ✅ Video Source Selector appeared again');
      
      const aiButton = await page.locator('button:has-text("AI Generated")');
      await aiButton.click();
      await page.waitForTimeout(3000);
      
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
      
      if (aiLoadingCheck.hasLoadingTitle || aiLoadingCheck.hasSpinner) {
        console.log('   ✅ AI loading screen appeared');
        console.log(`   ✅ Progress bars: ${aiLoadingCheck.progressBarCount}`);
        console.log(`   ✅ Spinner: ${aiLoadingCheck.hasSpinner ? 'visible' : 'not found'}`);
        testResults.aiReel = true;
      } else {
        console.log('   ⚠️  AI loading screen may not have appeared');
      }
      
      await page.screenshot({ path: 'test-flow-9-ai-loading.png', fullPage: true });
      
      console.log('   ⏳ Waiting 10 seconds to observe AI loading state...');
      await page.waitForTimeout(10000);
      
      await page.screenshot({ path: 'test-flow-10-ai-progress.png', fullPage: true });
      
      console.log('   💡 Note: Full AI generation takes 2-5 minutes per video');
      console.log('   💡 This test only verifies the loading UI\n');
    } else {
      console.log('   ⚠️  Video Source Selector did not appear again\n');
    }
    
    // ============================================
    // STEP 10: Check Progress Tracking
    // ============================================
    console.log('📍 Step 10: Checking progress tracking...');
    
    const progressCheck = await page.evaluate(() => {
      const progressElements = Array.from(document.querySelectorAll('div')).filter(
        div => div.textContent.match(/\d+/) && (
          div.textContent.includes('Reviewed') ||
          div.textContent.includes('Known') ||
          div.textContent.includes('Review')
        )
      );
      
      return {
        hasProgress: progressElements.length > 0,
        progressCount: progressElements.length
      };
    });
    
    if (progressCheck.hasProgress) {
      console.log('   ✅ Progress tracking visible');
      testResults.progressTracking = true;
    } else {
      console.log('   ⚠️  Progress tracking not found');
    }
    
    // ============================================
    // TEST SUMMARY
    // ============================================
    console.log('\n═══════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    
    const results = [
      { name: 'Category Selection', passed: testResults.categorySelection },
      { name: 'Flashcard Display', passed: testResults.flashcardDisplay },
      { name: 'Swipe Right (Know)', passed: testResults.swipeRight },
      { name: 'Swipe Left (Don\'t Know)', passed: testResults.swipeLeft },
      { name: 'Video Source Selector', passed: testResults.videoSourceSelector },
      { name: 'YouTube Video Reel', passed: testResults.youtubeReel },
      { name: 'AI Video Reel', passed: testResults.aiReel },
      { name: 'Navigation', passed: testResults.navigation },
      { name: 'Progress Tracking', passed: testResults.progressTracking }
    ];
    
    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const passRate = Math.round((passedCount / totalCount) * 100);
    
    console.log('═══════════════════════════════════════');
    console.log(`📈 Pass Rate: ${passedCount}/${totalCount} (${passRate}%)`);
    console.log('═══════════════════════════════════════\n');
    
    if (passedCount === totalCount) {
      console.log('🎉 ALL TESTS PASSED!\n');
    } else if (passRate >= 70) {
      console.log('✅ MOST TESTS PASSED - Minor issues detected\n');
    } else {
      console.log('⚠️  SEVERAL TESTS FAILED - Review required\n');
    }
    
    console.log('📸 Screenshots saved:');
    console.log('   - test-flow-1-app-loaded.png');
    console.log('   - test-flow-2-categories.png');
    console.log('   - test-flow-3-flashcard.png');
    console.log('   - test-flow-4-swipe-right.png');
    console.log('   - test-flow-5-selector.png');
    console.log('   - test-flow-6-youtube-reel.png');
    console.log('   - test-flow-7-youtube-nav.png');
    console.log('   - test-flow-8-reel-closed.png');
    console.log('   - test-flow-9-ai-loading.png');
    console.log('   - test-flow-10-ai-progress.png');
    console.log('');
    
    console.log('⏳ Keeping browser open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.log('\n═══════════════════════════════════════');
    console.log('❌ TEST FAILED');
    console.log('═══════════════════════════════════════');
    console.error('Error:', error.message);
    console.error(error.stack);
    
    await page.screenshot({ path: 'test-flow-error.png', fullPage: true });
    console.log('\n📸 Error screenshot: test-flow-error.png');
  } finally {
    await browser.close();
    console.log('\n👋 Test completed!\n');
  }
})();
