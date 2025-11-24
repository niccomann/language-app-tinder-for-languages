const { chromium } = require('playwright');

(async () => {
  console.log('\n🔍 FULL DEBUG TEST\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  
  // Capture ALL console logs
  page.on('console', msg => {
    console.log(`🖥️  ${msg.text()}`);
  });
  
  // Capture network requests
  page.on('request', request => {
    if (request.url().includes('videos/search-multiple')) {
      console.log(`📡 REQUEST: ${request.method()} ${request.url()}`);
      console.log(`   Body: ${request.postData()}`);
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('videos/search-multiple')) {
      console.log(`📡 RESPONSE: ${response.status()} ${response.url()}`);
      try {
        const body = await response.text();
        console.log(`   Body: ${body.substring(0, 200)}...`);
      } catch (e) {
        console.log(`   Could not read body`);
      }
    }
  });
  
  try {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Select categories
    console.log('\n📍 Selecting categories...');
    await page.click('button:has-text("Animals")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Food")');
    await page.waitForTimeout(300);
    
    // Start
    console.log('📍 Starting session...');
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(3000);
    
    // Swipe left
    console.log('\n📍 Opening reel...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(10000);
    
    // Check what's on screen
    const screenInfo = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText.substring(0, 500),
        hasVideoReel: !!document.querySelector('[class*="VideoReel"]'),
        loadingText: document.body.innerText.includes('Loading'),
        preparingText: document.body.innerText.includes('Preparing'),
        errorText: document.body.innerText.includes('Error'),
      };
    });
    
    console.log('\n📊 Screen Info:');
    console.log('   hasVideoReel:', screenInfo.hasVideoReel);
    console.log('   loadingText:', screenInfo.loadingText);
    console.log('   preparingText:', screenInfo.preparingText);
    console.log('   errorText:', screenInfo.errorText);
    console.log('   bodyText:', screenInfo.bodyText);
    
    await page.screenshot({ path: 'debug-full.png', fullPage: true });
    console.log('\n📸 Screenshot saved: debug-full.png');
    
    console.log('\n⏳ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('\n👋 Done!\n');
  }
})();
