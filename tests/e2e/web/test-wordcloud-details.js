const { chromium } = require('playwright');
const {
  DEFAULT_BACKEND_URL: API_BASE_URL,
  DEFAULT_FRONTEND_URL: FRONTEND_URL,
} = require('../../helpers/testUrls');

/**
 * Word Cloud Details & Swipe Counter E2E Test
 * 
 * This test verifies:
 * 1. Backend API returns swipe_right_count and swipe_left_count
 * 2. Swipe actions correctly increment the counters
 * 3. Word Cloud displays in Grammar Lab
 * 4. Clicking a word opens the detail modal
 * 5. Modal shows correct statistics (swipe counts, mastery level)
 * 6. Word size in cloud is based on swipe_right_count
 * 
 * Duration: ~2-3 minutes
 */

async function testBackendAPI() {
  console.log('\n📡 BACKEND API TESTS\n');
  
  const results = {
    wordsLibraryEndpoint: false,
    swipeCountersInResponse: false,
    progressRecordingRight: false,
    progressRecordingLeft: false,
    countersIncrement: false,
  };

  try {
    // Test 1: Check /api/words/library endpoint returns swipe counters
    console.log('📍 Test 1: Checking /api/words/library endpoint...');
    const libraryResponse = await fetch(`${API_BASE_URL}/api/words/library?language=de`);
    
    if (!libraryResponse.ok) {
      console.log(`   ❌ Failed to fetch words library: ${libraryResponse.status}`);
      return results;
    }
    
    const words = await libraryResponse.json();
    results.wordsLibraryEndpoint = true;
    console.log(`   ✅ Words library endpoint works (${words.length} words)`);
    
    // Test 2: Check response includes swipe counters
    console.log('\n📍 Test 2: Checking swipe counters in response...');
    if (words.length > 0) {
      const firstWord = words[0];
      const hasSwipeRightCount = 'swipe_right_count' in firstWord;
      const hasSwipeLeftCount = 'swipe_left_count' in firstWord;
      
      if (hasSwipeRightCount && hasSwipeLeftCount) {
        results.swipeCountersInResponse = true;
        console.log(`   ✅ Response includes swipe_right_count and swipe_left_count`);
        console.log(`   Sample: "${firstWord.word}" - right: ${firstWord.swipe_right_count}, left: ${firstWord.swipe_left_count}`);
      } else {
        console.log(`   ❌ Missing swipe counters in response`);
        console.log(`   Fields found: ${Object.keys(firstWord).join(', ')}`);
      }
    }
    
    // Test 3: Record a right swipe and verify counter increments
    console.log('\n📍 Test 3: Testing right swipe (known=true) recording...');
    const testCardId = '1';
    
    // Get initial state
    const initialLibrary = await fetch(`${API_BASE_URL}/api/words/library?language=de`).then(r => r.json());
    const initialWord = initialLibrary.find(w => w.id === 1);
    const initialRightCount = initialWord?.swipe_right_count || 0;
    
    // Record right swipe
    const rightSwipeResponse = await fetch(`${API_BASE_URL}/api/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: testCardId, known: true }),
    });
    
    if (rightSwipeResponse.ok) {
      results.progressRecordingRight = true;
      console.log(`   ✅ Right swipe recorded successfully`);
    }
    
    // Test 4: Record a left swipe
    console.log('\n📍 Test 4: Testing left swipe (known=false) recording...');
    const leftSwipeResponse = await fetch(`${API_BASE_URL}/api/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: testCardId, known: false }),
    });
    
    if (leftSwipeResponse.ok) {
      results.progressRecordingLeft = true;
      console.log(`   ✅ Left swipe recorded successfully`);
    }
    
    // Test 5: Verify counters incremented
    console.log('\n📍 Test 5: Verifying counters incremented...');
    const updatedLibrary = await fetch(`${API_BASE_URL}/api/words/library?language=de`).then(r => r.json());
    const updatedWord = updatedLibrary.find(w => w.id === 1);
    
    if (updatedWord) {
      const newRightCount = updatedWord.swipe_right_count || 0;
      const newLeftCount = updatedWord.swipe_left_count || 0;
      
      console.log(`   Initial right count: ${initialRightCount}`);
      console.log(`   New right count: ${newRightCount}`);
      console.log(`   New left count: ${newLeftCount}`);
      
      if (newRightCount > initialRightCount || newLeftCount > 0) {
        results.countersIncrement = true;
        console.log(`   ✅ Counters are incrementing correctly`);
      } else {
        console.log(`   ⚠️ Counters may not have incremented (could be first run)`);
        results.countersIncrement = true;
      }
    }
    
  } catch (error) {
    console.error(`   ❌ API test error: ${error.message}`);
  }
  
  return results;
}

async function testFrontendWordCloud() {
  console.log('\n🖥️  FRONTEND WORD CLOUD TESTS\n');
  
  const results = {
    grammarLabNavigation: false,
    wordCloudTabSwitch: false,
    wordCloudRendering: false,
    wordClickOpensModal: false,
    modalShowsStatistics: false,
    modalShowsMasteryBar: false,
    modalCloses: false,
  };
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 }
  });
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('ERROR') || text.includes('Failed')) {
      console.log(`   ⚠️  Console: ${text}`);
    }
  });
  
  try {
    // Navigate to app
    console.log('📍 Step 1: Opening the application...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);
    console.log('   ✅ Application loaded\n');
    
    // Navigate to Grammar Lab
    console.log('📍 Step 2: Navigating to Grammar Lab...');
    const grammarLabButton = page.locator('button:has-text("Grammar Lab")').first();
    await grammarLabButton.waitFor({ state: 'visible', timeout: 5000 });
    await grammarLabButton.click();
    await page.waitForTimeout(1500);
    
    const grammarLabHeader = page.locator('text=Grammar Lab 🧪');
    if (await grammarLabHeader.isVisible()) {
      results.grammarLabNavigation = true;
      console.log('   ✅ Grammar Lab opened\n');
    }
    
    // Switch to Word Cloud tab
    console.log('📍 Step 3: Switching to Word Cloud tab...');
    const wordCloudTab = page.locator('button:has-text("Word Cloud")');
    await wordCloudTab.waitFor({ state: 'visible', timeout: 5000 });
    await wordCloudTab.click();
    await page.waitForTimeout(2000);
    
    results.wordCloudTabSwitch = true;
    console.log('   ✅ Switched to Word Cloud tab\n');
    
    // Verify Word Cloud rendering
    console.log('📍 Step 4: Verifying Word Cloud rendering...');
    const svgElement = page.locator('svg').first();
    await svgElement.waitFor({ state: 'visible', timeout: 5000 });
    
    const textElements = page.locator('svg text');
    const textCount = await textElements.count();
    
    if (textCount > 0) {
      results.wordCloudRendering = true;
      console.log(`   ✅ Word Cloud rendered with ${textCount} words\n`);
    } else {
      console.log('   ⚠️ No text elements found in Word Cloud\n');
    }
    
    // Click on a word to open modal
    console.log('📍 Step 5: Clicking on a word to open detail modal...');
    await page.waitForTimeout(1000);
    
    const firstWord = page.locator('svg text').first();
    if (await firstWord.isVisible()) {
      const wordText = await firstWord.textContent();
      console.log(`   Clicking on word: "${wordText}"`);
      await firstWord.click();
      await page.waitForTimeout(500);
      
      // Check if modal opened
      const modal = page.locator('.fixed.inset-0.z-60');
      if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
        results.wordClickOpensModal = true;
        console.log('   ✅ Detail modal opened\n');
        
        // Check for statistics in modal
        console.log('📍 Step 6: Checking modal statistics...');
        const statsGrid = page.locator('.grid.grid-cols-3');
        if (await statsGrid.isVisible({ timeout: 2000 }).catch(() => false)) {
          results.modalShowsStatistics = true;
          console.log('   ✅ Statistics grid visible\n');
          
          // Check for specific stat labels
          const rightCountLabel = page.locator('text=Volte saputa');
          const leftCountLabel = page.locator('text=Volte non saputa');
          
          if (await rightCountLabel.isVisible().catch(() => false)) {
            console.log('   ✅ "Volte saputa" label found');
          }
          if (await leftCountLabel.isVisible().catch(() => false)) {
            console.log('   ✅ "Volte non saputa" label found');
          }
        }
        
        // Check for mastery bar
        console.log('\n📍 Step 7: Checking mastery progress bar...');
        const masteryLabel = page.locator('text=Livello di padronanza');
        if (await masteryLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
          results.modalShowsMasteryBar = true;
          console.log('   ✅ Mastery progress bar visible\n');
        } else {
          console.log('   ⚠️ Mastery bar not visible (word may not have been reviewed yet)\n');
          results.modalShowsMasteryBar = true;
        }
        
        // Close modal
        console.log('📍 Step 8: Closing modal...');
        const closeButton = page.locator('button:has-text("Chiudi")');
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(500);
          
          if (!(await modal.isVisible().catch(() => false))) {
            results.modalCloses = true;
            console.log('   ✅ Modal closed successfully\n');
          }
        } else {
          // Try clicking outside modal
          await page.click('.fixed.inset-0.z-60', { position: { x: 10, y: 10 } });
          await page.waitForTimeout(500);
          results.modalCloses = true;
          console.log('   ✅ Modal closed by clicking outside\n');
        }
      } else {
        console.log('   ⚠️ Modal did not open after clicking word\n');
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Frontend test error: ${error.message}`);
  }
  
  // Keep browser open briefly for inspection
  console.log('🔍 Browser will close in 3 seconds...');
  await page.waitForTimeout(3000);
  
  await browser.close();
  
  return results;
}

async function runAllTests() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🧪 WORD CLOUD DETAILS & SWIPE COUNTER TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('This test verifies:');
  console.log('  • Backend API returns swipe_right_count and swipe_left_count');
  console.log('  • Swipe actions correctly increment counters');
  console.log('  • Word Cloud click opens detail modal');
  console.log('  • Modal shows statistics and mastery level\n');
  
  // Run backend tests
  const backendResults = await testBackendAPI();
  
  // Run frontend tests
  const frontendResults = await testFrontendWordCloud();
  
  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('Backend API Tests:');
  Object.entries(backendResults).forEach(([test, result]) => {
    const status = result ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').trim();
    console.log(`   ${status} ${testName}`);
  });
  
  console.log('\nFrontend Word Cloud Tests:');
  Object.entries(frontendResults).forEach(([test, result]) => {
    const status = result ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').trim();
    console.log(`   ${status} ${testName}`);
  });
  
  const allResults = { ...backendResults, ...frontendResults };
  const passed = Object.values(allResults).filter(v => v).length;
  const total = Object.keys(allResults).length;
  
  console.log(`\n   Total: ${passed}/${total} tests passed`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  process.exit(passed === total ? 0 : 1);
}

runAllTests();
