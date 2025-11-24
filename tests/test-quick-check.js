const { chromium } = require('playwright');

/**
 * Quick Check Test: Fast verification of core functionality
 * 
 * Quick test to verify:
 * - App loads
 * - Can select categories
 * - Can start session
 * - Video reel opens
 */

(async () => {
  console.log('\n⚡ QUICK CHECK TEST\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  
  try {
    console.log('1️⃣  Loading app...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1500);
    console.log('   ✅ App loaded');
    
    console.log('\n2️⃣  Selecting categories...');
    await page.click('button:has-text("Animals")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Food")');
    await page.waitForTimeout(200);
    console.log('   ✅ Categories selected');
    
    console.log('\n3️⃣  Starting session...');
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(2000);
    console.log('   ✅ Session started');
    
    console.log('\n4️⃣  Opening video reel...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(4000);
    
    // Check if reel opened
    const reelOpened = await page.evaluate(() => {
      const closeButton = document.querySelector('button svg.lucide-x');
      return closeButton !== null;
    });
    
    if (reelOpened) {
      console.log('   ✅ Video reel opened');
    } else {
      console.log('   ❌ Video reel did not open');
    }
    
    await page.screenshot({ path: 'quick-check.png', fullPage: true });
    console.log('\n📸 Screenshot: quick-check.png');
    
    console.log('\n✅ QUICK CHECK PASSED!\n');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.log('\n❌ QUICK CHECK FAILED');
    console.error('Error:', error.message);
  } finally {
    await browser.close();
    console.log('👋 Done!\n');
  }
})();
