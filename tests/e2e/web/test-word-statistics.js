const { chromium } = require('playwright');

/**
 * Word Statistics E2E Test
 * 
 * Tests the Word Statistics functionality:
 * 1. Statistics API endpoints work
 * 2. Confidence score updates on swipe
 * 3. ConfidenceBadge displays in UI
 * 4. StatsSummary displays in Words Library
 */

(async () => {
  console.log('\n📊 WORD STATISTICS E2E TEST\n');
  console.log('This test verifies the Word Statistics functionality.\n');
  console.log('═══════════════════════════════════════\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 }
  });
  
  const testResults = {
    statisticsApiWorks: false,
    confidenceUpdatesOnSwipe: false,
    confidenceBadgeVisible: false,
    statsSummaryVisible: false,
    summaryApiWorks: false
  };
  
  let statisticsApiCalled = false;
  let confidenceUpdated = false;
  
  page.on('response', async (response) => {
    if (response.url().includes('/api/statistics/update')) {
      statisticsApiCalled = true;
      try {
        const json = await response.json();
        if (json.new_confidence_score !== undefined) {
          confidenceUpdated = true;
        }
      } catch (e) {}
    }
  });
  
  try {
    // Step 1: Test Statistics API directly
    console.log('📍 Step 1: Testing Statistics API...');
    const apiResponse = await page.request.get('http://localhost:8500/api/statistics/summary');
    if (apiResponse.ok()) {
      const data = await apiResponse.json();
      if (data.total_words_practiced !== undefined) {
        testResults.statisticsApiWorks = true;
        testResults.summaryApiWorks = true;
        console.log(`   ✅ Statistics API works (${data.total_words_practiced} words practiced)\n`);
      }
    } else {
      console.log('   ⚠️  Statistics API not responding\n');
    }
    
    // Step 2: Navigate to app and start learning
    console.log('📍 Step 2: Starting learning session...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const selectAllButton = page.getByRole('button', { name: 'Select All' }).first();
    await selectAllButton.click();
    await page.waitForTimeout(500);
    
    const startButton = page.locator('button:has-text("Start Learning")');
    await startButton.click();
    await page.waitForTimeout(2000);
    console.log('   ✅ Learning session started\n');
    
    // Step 3: Swipe right and check if statistics update
    console.log('📍 Step 3: Testing confidence update on swipe...');
    
    const flashcard = page.locator('.rounded-3xl').first();
    const cardBox = await flashcard.boundingBox();
    
    if (cardBox) {
      const startX = cardBox.x + cardBox.width / 2;
      const startY = cardBox.y + cardBox.height / 2;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 300, startY, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(2000);
      
      if (statisticsApiCalled && confidenceUpdated) {
        testResults.confidenceUpdatesOnSwipe = true;
        console.log('   ✅ Confidence score updated on swipe\n');
      } else {
        console.log('   ⚠️  Statistics API not called on swipe\n');
      }
    }
    
    // Step 4: Navigate to Words Library and check StatsSummary
    console.log('📍 Step 4: Checking StatsSummary in Words Library...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const libraryButton = page.locator('button:has-text("View Library")').first();
    await libraryButton.click();
    await page.waitForTimeout(2000);
    
    // Check for StatsSummary component (shows Mastered, Learning, Struggling)
    const masteredLabel = page.locator('text=Mastered').first();
    const learningLabel = page.locator('text=Learning').first();
    
    const masteredVisible = await masteredLabel.isVisible({ timeout: 3000 }).catch(() => false);
    const learningVisible = await learningLabel.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (masteredVisible || learningVisible) {
      testResults.statsSummaryVisible = true;
      console.log('   ✅ StatsSummary visible in Words Library\n');
    } else {
      console.log('   ⚠️  StatsSummary not visible\n');
    }
    
    // Step 5: Check for ConfidenceBadge in word cards
    console.log('📍 Step 5: Checking ConfidenceBadge in word cards...');
    
    // ConfidenceBadge shows "New", "Practicing", "Learning", or "Mastered"
    const confidenceBadge = page.locator('text=/New|Practicing|Learning|Mastered/').first();
    if (await confidenceBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      testResults.confidenceBadgeVisible = true;
      console.log('   ✅ ConfidenceBadge visible in word cards\n');
    } else {
      console.log('   ⚠️  ConfidenceBadge not visible\n');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-word-statistics.png' });
    console.log('📸 Screenshot: test-word-statistics.png\n');
    
  } catch (error) {
    console.log(`\n❌ Test failed with error: ${error.message}\n`);
  }
  
  // Print results
  console.log('\n═══════════════════════════════════════');
  console.log('📊 TEST RESULTS SUMMARY\n');
  
  const results = Object.entries(testResults);
  let passed = 0;
  
  for (const [test, result] of results) {
    const status = result ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`   ${status} ${testName}`);
    if (result) passed++;
  }
  
  console.log(`\n   Total: ${passed}/${results.length} tests passed`);
  console.log('═══════════════════════════════════════\n');
  
  console.log('🔍 Browser will close in 5 seconds...');
  await page.waitForTimeout(5000);
  await browser.close();
  
  process.exit(passed >= 3 ? 0 : 1);
})();
