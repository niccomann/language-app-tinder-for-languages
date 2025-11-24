/**
 * Simple Playwright Demo - Just open browser and wait
 * You can manually test the flow
 */

const { chromium } = require('@playwright/test');

async function simpleDemo() {
  console.log('🎬 Opening browser for manual testing...\n');
  console.log('Instructions:');
  console.log('1. The browser will open at http://localhost:5173');
  console.log('2. Manually test the flow:');
  console.log('   - Select categories (or use existing session)');
  console.log('   - Swipe LEFT on a flashcard (or press ← key)');
  console.log('   - You should see the Video Source Selector modal');
  console.log('   - Click "YouTube Videos" or "AI Generated"');
  console.log('3. Browser will stay open for 10 minutes');
  console.log('4. Press Ctrl+C to close\n');
  console.log('=' .repeat(60) + '\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null,
  });

  const page = await context.newPage();

  // Enable console logging from the page
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`🔴 Browser Error: ${text}`);
    } else if (type === 'warning') {
      console.log(`⚠️  Browser Warning: ${text}`);
    } else if (text.includes('video') || text.includes('swipe') || text.includes('selector')) {
      console.log(`📝 Browser Log: ${text}`);
    }
  });

  try {
    console.log('📍 Loading app...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log('✅ App loaded at http://localhost:5173\n');
    console.log('👉 You can now manually test the feature');
    console.log('👉 Watch the console for any errors\n');

    // Keep browser open for 10 minutes
    console.log('⏱️  Browser will stay open for 10 minutes...\n');
    await new Promise(resolve => setTimeout(resolve, 600000));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    console.log('\n🔚 Closing browser...');
    await browser.close();
    console.log('✅ Done\n');
  }
}

simpleDemo().catch(console.error);
