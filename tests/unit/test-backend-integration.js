const { chromium } = require('playwright');

/**
 * Backend Integration Test
 * 
 * Tests backend API endpoints through the UI:
 * 1. Flashcard loading (GET /api/cards)
 * 2. Progress recording (POST /api/progress)
 * 3. Progress retrieval (GET /api/progress)
 * 4. Video search (POST /videos/search-multiple)
 * 
 * Duration: ~1 minute
 */

(async () => {
  console.log('\n🔌 BACKEND INTEGRATION TEST\n');
  console.log('Testing backend API endpoints through UI interactions.\n');
  console.log('═══════════════════════════════════════\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  
  const apiCalls = [];
  const testResults = {
    getCards: false,
    postProgress: false,
    getProgress: false,
    searchVideos: false
  };
  
  // Intercept API calls
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('localhost:8500')) {
      const method = response.request().method();
      const status = response.status();
      const endpoint = url.replace('http://localhost:8500', '');
      
      apiCalls.push({
        method,
        endpoint,
        status,
        ok: response.ok()
      });
      
      console.log(`   📡 ${method} ${endpoint} → ${status} ${response.ok() ? '✅' : '❌'}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`   ❌ Page Error: ${error.message}`);
  });
  
  try {
    // ============================================
    // STEP 1: Test GET /api/cards
    // ============================================
    console.log('📍 Step 1: Testing GET /api/cards...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);
    
    const cardsCall = apiCalls.find(call => call.endpoint.includes('/api/cards'));
    if (cardsCall && cardsCall.ok) {
      console.log('   ✅ GET /api/cards successful\n');
      testResults.getCards = true;
    } else {
      console.log('   ❌ GET /api/cards failed or not called\n');
    }
    
    await page.screenshot({ path: 'test-backend-1-cards.png', fullPage: true });
    
    // ============================================
    // STEP 2: Test POST /api/progress
    // ============================================
    console.log('📍 Step 2: Testing POST /api/progress...');
    await page.click('button:has-text("Animals")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(3000);
    
    const progressCallsBefore = apiCalls.filter(call => 
      call.endpoint.includes('/api/progress') && call.method === 'POST'
    ).length;
    
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(2000);
    
    const progressCallsAfter = apiCalls.filter(call => 
      call.endpoint.includes('/api/progress') && call.method === 'POST'
    ).length;
    
    if (progressCallsAfter > progressCallsBefore) {
      console.log('   ✅ POST /api/progress successful\n');
      testResults.postProgress = true;
    } else {
      console.log('   ❌ POST /api/progress not called\n');
    }
    
    await page.screenshot({ path: 'test-backend-2-progress.png', fullPage: true });
    
    // ============================================
    // STEP 3: Test GET /api/progress
    // ============================================
    console.log('📍 Step 3: Testing GET /api/progress...');
    
    const getProgressCall = apiCalls.find(call => 
      call.endpoint.includes('/api/progress') && call.method === 'GET'
    );
    
    if (getProgressCall && getProgressCall.ok) {
      console.log('   ✅ GET /api/progress successful\n');
      testResults.getProgress = true;
    } else {
      console.log('   ⚠️  GET /api/progress not called yet (may be called later)\n');
    }
    
    // ============================================
    // STEP 4: Test POST /videos/search-multiple
    // ============================================
    console.log('📍 Step 4: Testing POST /videos/search-multiple...');
    
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(3000);
    
    const youtubeButton = await page.locator('button:has-text("YouTube Videos")');
    await youtubeButton.click();
    await page.waitForTimeout(5000);
    
    const videoSearchCall = apiCalls.find(call => 
      call.endpoint.includes('/videos/search-multiple')
    );
    
    if (videoSearchCall && videoSearchCall.ok) {
      console.log('   ✅ POST /videos/search-multiple successful\n');
      testResults.searchVideos = true;
    } else {
      console.log('   ❌ POST /videos/search-multiple failed or not called\n');
    }
    
    await page.screenshot({ path: 'test-backend-3-videos.png', fullPage: true });
    
    // Close reel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2000);
    
    // ============================================
    // SUMMARY
    // ============================================
    console.log('═══════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`✅ GET /api/cards: ${testResults.getCards ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ POST /api/progress: ${testResults.postProgress ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ GET /api/progress: ${testResults.getProgress ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ POST /videos/search-multiple: ${testResults.searchVideos ? 'PASSED' : 'FAILED'}`);
    console.log('═══════════════════════════════════════\n');
    
    console.log('📡 Total API calls intercepted:', apiCalls.length);
    console.log('\nAPI Calls Summary:');
    const callSummary = {};
    apiCalls.forEach(call => {
      const key = `${call.method} ${call.endpoint}`;
      callSummary[key] = (callSummary[key] || 0) + 1;
    });
    Object.entries(callSummary).forEach(([key, count]) => {
      console.log(`   ${key} (${count}x)`);
    });
    console.log('');
    
    const passedCount = Object.values(testResults).filter(r => r).length;
    const totalCount = Object.keys(testResults).length;
    
    if (passedCount === totalCount) {
      console.log('🎉 ALL BACKEND INTEGRATION TESTS PASSED!\n');
    } else {
      console.log(`⚠️  ${passedCount}/${totalCount} tests passed\n`);
    }
    
    console.log('⏳ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.log('\n═══════════════════════════════════════');
    console.log('❌ TEST FAILED');
    console.log('═══════════════════════════════════════');
    console.error('Error:', error.message);
    console.error(error.stack);
    
    await page.screenshot({ path: 'test-backend-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n👋 Test completed!\n');
  }
})();
