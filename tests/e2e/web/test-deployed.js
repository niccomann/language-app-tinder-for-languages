/**
 * Deployed Environment E2E Test
 * 
 * Tests the deployed application (EU or SA region)
 * 
 * Usage:
 *   TEST_ENV=eu node tests/e2e/web/test-deployed.js
 *   TEST_ENV=sa node tests/e2e/web/test-deployed.js
 *   TEST_ENV=local node tests/e2e/web/test-deployed.js
 */

const { chromium } = require('playwright');
const { getConfig } = require('../../config');

const config = getConfig();

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log(`🧪 E2E TEST - ${config.env.name}`);
  console.log('='.repeat(60));
  console.log(`URL: ${config.baseUrl}`);
  console.log(`Headless: ${config.browser.headless}`);
  console.log('='.repeat(60) + '\n');

  const browser = await chromium.launch({
    headless: config.browser.headless,
    slowMo: config.browser.slowMo || 300,
  });

  const page = await browser.newPage({
    viewport: config.browser.viewport,
  });

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  function logTest(name, passed, error = null) {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}`);
    results.tests.push({ name, passed, error });
    if (passed) results.passed++;
    else results.failed++;
  }

  try {
    // Test 1: App loads
    console.log('\n📍 Test 1: App loads correctly');
    await page.goto(config.baseUrl, { timeout: config.timeouts.navigation });
    const title = await page.textContent('h1');
    logTest('App loads', title.includes('Learn German'));

    // Test 2: Categories load (check Selected counter shows categories)
    console.log('\n📍 Test 2: Categories load from API');
    await page.waitForTimeout(2000);
    const selectedText = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/Selected:\s*(\d+)\s*\/\s*(\d+)/);
      return match ? parseInt(match[2]) : 0;
    });
    logTest('Categories loaded', selectedText > 0);

    // Test 3: API health check (via /api/cards endpoint)
    console.log('\n📍 Test 3: API health check');
    const healthResponse = await page.evaluate(async (baseUrl) => {
      try {
        const response = await fetch(`${baseUrl}/api/cards?limit=1`);
        return response.ok;
      } catch (error) {
        return false;
      }
    }, config.baseUrl);
    logTest('API healthy', healthResponse);

    // Test 4: Start learning flow
    console.log('\n📍 Test 4: Learning flow works');
    await page.click('button:has-text("Select All")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(2000);
    
    const flashcardVisible = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2 && h2.textContent.length > 0;
    });
    logTest('Flashcard displayed', flashcardVisible);

    // Test 5: Swipe works
    console.log('\n📍 Test 5: Swipe functionality');
    const wordBefore = await page.textContent('h2');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1500);
    const wordAfter = await page.textContent('h2');
    logTest('Swipe changes card', wordBefore !== wordAfter);

    // Test 6: Progress tracking
    console.log('\n📍 Test 6: Progress tracking');
    const progress = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Progress:') && text.includes('Known:');
    });
    logTest('Progress visible', progress);

    // Test 7: Navigation buttons
    console.log('\n📍 Test 7: Navigation');
    const hasNavButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      return Array.from(buttons).some(b => 
        b.textContent.includes('Categories') || 
        b.textContent.includes('Library')
      );
    });
    logTest('Navigation buttons present', hasNavButtons);

    // Test 8: Library page
    console.log('\n📍 Test 8: Library page');
    await page.click('button:has-text("Library")');
    await page.waitForTimeout(2000);
    const libraryLoaded = await page.evaluate(() => {
      return document.body.innerText.includes('Words Library') || 
             document.body.innerText.includes('Library');
    });
    logTest('Library page loads', libraryLoaded);

    // Screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `tests/screenshots/e2e-${config.env.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Screenshot saved: ${screenshotPath}`);

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    results.failed++;
    
    const screenshotPath = `tests/screenshots/e2e-error-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Error screenshot: ${screenshotPath}`);
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Environment: ${config.env.name}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);
  console.log('='.repeat(60));

  if (results.failed > 0) {
    console.log('\n❌ SOME TESTS FAILED\n');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED\n');
    process.exit(0);
  }
}

runTests().catch(console.error);
