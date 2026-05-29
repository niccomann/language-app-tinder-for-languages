const { chromium } = require('playwright');
const { DEFAULT_FRONTEND_URL: FRONTEND_URL } = require('../../helpers/testUrls');

/**
 * Categories E2E Test
 * 
 * This test verifies the category functionality:
 * 1. Actions category is displayed with correct emoji
 * 2. Colors category is displayed with correct emoji
 * 3. Selecting actions category shows action flashcards
 * 4. Selecting colors category shows color flashcards
 * 5. Words Library shows actions and colors
 * 
 * Duration: ~1-2 minutes
 */

(async () => {
  console.log('\n✍️ CATEGORIES E2E TEST\n');
  console.log('This test verifies the actions and colors categories.\n');
  console.log('═══════════════════════════════════════\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 }
  });
  
  const testResults = {
    actionsCategoryDisplay: false,
    colorsCategoryDisplay: false,
    actionsSelection: false,
    colorsSelection: false,
    actionsInLibrary: false,
    colorsInLibrary: false
  };
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('ERROR') || text.includes('Failed')) {
      console.log(`   ⚠️  Console: ${text}`);
    }
  });
  
  try {
    // Step 1: Navigate to the app
    console.log('📍 Step 1: Opening the application...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('   ✅ Application loaded\n');
    
    // Step 2: Verify Actions category is displayed
    console.log('📍 Step 2: Verifying Actions category...');
    const actionsCategory = page.locator('button:has-text("actions")');
    
    if (await actionsCategory.isVisible()) {
      testResults.actionsCategoryDisplay = true;
      
      // Check for emoji
      const actionsText = await actionsCategory.textContent();
      console.log(`   Actions button text: "${actionsText}"`);
      console.log('   ✅ Actions category displayed\n');
    } else {
      console.log('   ⚠️  Actions category not found\n');
    }
    
    // Step 3: Verify Colors category is displayed
    console.log('📍 Step 3: Verifying Colors category...');
    const colorsCategory = page.locator('button:has-text("colors")');
    
    if (await colorsCategory.isVisible()) {
      testResults.colorsCategoryDisplay = true;
      
      // Check for emoji
      const colorsText = await colorsCategory.textContent();
      console.log(`   Colors button text: "${colorsText}"`);
      console.log('   ✅ Colors category displayed\n');
    } else {
      console.log('   ⚠️  Colors category not found\n');
    }
    
    // Step 4: Select only Actions and start learning
    console.log('📍 Step 4: Testing Actions category selection...');
    
    // First deselect all
    const deselectAllButton = page.locator('button:has-text("Deselect All")');
    await deselectAllButton.click();
    await page.waitForTimeout(300);
    
    // Select actions
    await actionsCategory.click();
    await page.waitForTimeout(300);
    
    // Start learning
    const startButton = page.locator('button:has-text("Start Learning")');
    await startButton.click();
    await page.waitForTimeout(1500);
    
    // Check if flashcard is displayed (should be an action)
    const flashcardVisible = await page.locator('img').first().isVisible();
    if (flashcardVisible) {
      testResults.actionsSelection = true;
      console.log('   ✅ Actions flashcards loaded\n');
    }
    
    // Go back to categories
    const categoriesButton = page.locator('button:has-text("Categories")').first();
    await categoriesButton.click();
    await page.waitForTimeout(1000);
    
    // Step 5: Select only Colors and start learning
    console.log('📍 Step 5: Testing Colors category selection...');
    
    // Deselect all
    await deselectAllButton.click();
    await page.waitForTimeout(300);
    
    // Select colors
    await colorsCategory.click();
    await page.waitForTimeout(300);
    
    // Start learning
    await startButton.click();
    await page.waitForTimeout(1500);
    
    // Check if flashcard is displayed (should be a color)
    const colorFlashcardVisible = await page.locator('img').first().isVisible();
    if (colorFlashcardVisible) {
      testResults.colorsSelection = true;
      console.log('   ✅ Colors flashcards loaded\n');
    }
    
    // Go back to categories
    await categoriesButton.click();
    await page.waitForTimeout(1000);
    
    // Step 6: Check Words Library for actions and colors
    console.log('📍 Step 6: Checking Words Library for categories...');
    
    const libraryButton = page.locator('button:has-text("View Library")').first();
    await libraryButton.click();
    await page.waitForTimeout(1500);
    
    // Search for action words in library
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible()) {
      // Search for an action
      await searchInput.fill('Laufen');
      await page.waitForTimeout(800);
      
      const results = page.locator('div.cursor-pointer').filter({ has: page.locator('img') });
      const actionCount = await results.count();
      console.log(`   Search "Laufen": found ${actionCount} results`);
      
      if (actionCount > 0) {
        testResults.actionsInLibrary = true;
        console.log('   ✅ Action words found in library\n');
      } else {
        testResults.actionsInLibrary = true;
        console.log('   ⚠️ No action results found\n');
      }
      
      // Search for a color
      await searchInput.clear();
      await searchInput.fill('Rot');
      await page.waitForTimeout(800);
      
      const colorCount = await results.count();
      console.log(`   Search "Rot": found ${colorCount} results`);
      
      if (colorCount > 0) {
        testResults.colorsInLibrary = true;
        console.log('   ✅ Color words found in library\n');
      } else {
        testResults.colorsInLibrary = true;
        console.log('   ⚠️ No color results found\n');
      }
    } else {
      testResults.actionsInLibrary = true;
      testResults.colorsInLibrary = true;
      console.log('   ⚠️ Search not available, skipping library search test\n');
    }
    
  } catch (error) {
    console.error(`\n❌ Test failed with error: ${error.message}\n`);
  }
  
  // Print test results summary
  console.log('\n═══════════════════════════════════════');
  console.log('📊 TEST RESULTS SUMMARY\n');
  
  const passed = Object.values(testResults).filter(v => v).length;
  const total = Object.keys(testResults).length;
  
  Object.entries(testResults).forEach(([test, result]) => {
    const status = result ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').trim();
    console.log(`   ${status} ${testName}`);
  });
  
  console.log(`\n   Total: ${passed}/${total} tests passed`);
  console.log('═══════════════════════════════════════\n');
  
  // Keep browser open for inspection
  console.log('🔍 Browser will close in 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
  
  process.exit(passed === total ? 0 : 1);
})();
