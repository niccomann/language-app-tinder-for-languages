const { chromium } = require('playwright');

(async () => {
  console.log('\n🔍 SCROLL TEST - Verifying Arrow Keys\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  
  // Capture console
  page.on('console', msg => {
    console.log(`🖥️  ${msg.text()}`);
  });
  
  try {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Select categories
    await page.click('button:has-text("Animals")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Food")');
    await page.waitForTimeout(300);
    
    // Start
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(3000);
    
    // Swipe left
    console.log('\n📍 Opening reel...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(8000);
    
    // Take screenshot
    await page.screenshot({ path: 'scroll-test-1-opened.png', fullPage: true });
    console.log('📸 Screenshot: scroll-test-1-opened.png');
    
    // Check counter
    const counter1 = await page.locator('text=/\\d+ \\/ \\d+/').textContent().catch(() => null);
    console.log(`\n📊 Counter before: ${counter1}`);
    
    // Press Arrow Down
    console.log('\n⬇️  Pressing Arrow Down...');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'scroll-test-2-after-down.png', fullPage: true });
    console.log('📸 Screenshot: scroll-test-2-after-down.png');
    
    // Check counter again
    const counter2 = await page.locator('text=/\\d+ \\/ \\d+/').textContent().catch(() => null);
    console.log(`📊 Counter after: ${counter2}`);
    
    // Check if counter changed
    if (counter1 && counter2) {
      if (counter1 !== counter2) {
        console.log(`\n✅ SUCCESS! Counter changed: ${counter1} → ${counter2}`);
      } else {
        console.log(`\n❌ FAIL! Counter did NOT change (still ${counter1})`);
      }
    } else {
      console.log(`\n⚠️  Could not find counter element`);
    }
    
    // Check scroll position
    const scrollInfo = await page.evaluate(() => {
      const container = document.querySelector('.overflow-y-auto');
      if (!container) {
        return { found: false, scrollTop: null, className: null };
      }
      return { 
        found: true, 
        scrollTop: container.scrollTop,
        className: container.className,
        childCount: container.children.length
      };
    });
    console.log(`\n📏 Container info:`, scrollInfo);
    
    console.log('\n⏳ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await browser.close();
    console.log('\n👋 Done!\n');
  }
})();
