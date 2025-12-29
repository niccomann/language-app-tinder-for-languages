const { chromium } = require('playwright');

/**
 * Manual test - Opens browser and waits for you to test AI videos
 */

(async () => {
  console.log('\n🎬 Opening browser for MANUAL AI video testing\n');
  console.log('Follow these steps:');
  console.log('1. Select a category (e.g., Animals)');
  console.log('2. Click "Start Learning"');
  console.log('3. Press ← (left arrow) to swipe left');
  console.log('4. Click "AI Generated" button');
  console.log('5. Watch the AI videos load and play\n');
  console.log('Browser will stay open for 10 minutes...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    viewport: null
  });
  
  const page = await context.newPage();
  
  // Log everything
  page.on('console', msg => {
    console.log(`   🖥️  ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`   ❌ ${error.message}`);
  });
  
  try {
    await page.goto('http://localhost:5173');
    console.log('✅ App loaded - You can now test manually!\n');
    
    // Keep open for 10 minutes
    await page.waitForTimeout(600000);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed\n');
  }
})();
