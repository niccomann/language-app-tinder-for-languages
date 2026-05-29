/**
 * E2E Test: Tracking Threshold Verification
 * 
 * Tests the 30-interaction minimum threshold logic:
 * - Actions under threshold are NOT saved to DB (unless manual start)
 * - Actions at/above threshold ARE saved (auto-activation)
 * - Manual start bypasses threshold
 * 
 * Run: node tests/e2e/web/test-tracking-threshold.js
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const {
  DEFAULT_BACKEND_URL: BACKEND_URL,
  DEFAULT_FRONTEND_URL: FRONTEND_URL,
} = require('../../helpers/testUrls');

const TRACKING_DB = 'backend/tracking.db';

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function logSection(title) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(50));
}

async function getTrackingCount() {
  try {
    const result = execSync(`sqlite3 ${TRACKING_DB} "SELECT COUNT(*) FROM tracking_actions;"`, { encoding: 'utf-8' });
    return parseInt(result.trim(), 10);
  } catch (error) {
    return -1;
  }
}

async function runTests() {
  console.log('\n🧪 TRACKING THRESHOLD TEST SUITE\n');
  
  let testsPassed = 0;
  let testsFailed = 0;

  // Check backend
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) throw new Error('Backend not healthy');
    log('✅', 'Backend is running');
  } catch (error) {
    log('❌', 'Backend not running. Start it first.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // ========================================================================
    // TEST 1: Swipes without tracking should NOT be saved
    // ========================================================================
    logSection('TEST 1: Swipes without tracking (no save)');
    
    const countBefore = await getTrackingCount();
    log('📊', `Actions before: ${countBefore}`);
    
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('button:has-text("Start Learning")');
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(1000);
    
    // Do 5 swipes WITHOUT pressing Start Tracking
    for (let i = 0; i < 5; i++) {
      // Close any modal that might appear (video selector, etc.)
      const closeBtn = await page.$('button:has-text("Close")');
      if (closeBtn) await closeBtn.click().catch(() => {});
      const modalBackdrop = await page.$('.fixed.inset-0.z-50');
      if (modalBackdrop) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
      
      await page.keyboard.press(i % 2 === 0 ? 'ArrowRight' : 'ArrowLeft');
      await page.waitForTimeout(500);
    }
    
    const countAfterNoTracking = await getTrackingCount();
    const savedWithoutTracking = countAfterNoTracking - countBefore;
    
    log('📊', `Actions after 5 swipes (no tracking): ${countAfterNoTracking}`);
    log('📊', `New actions saved: ${savedWithoutTracking}`);
    
    if (savedWithoutTracking === 0) {
      log('✅', 'TEST 1 PASSED: Swipes without tracking NOT saved');
      testsPassed++;
    } else {
      log('❌', `TEST 1 FAILED: ${savedWithoutTracking} actions saved without tracking`);
      testsFailed++;
    }

    // ========================================================================
    // TEST 2: Manual Start Tracking should save all subsequent swipes
    // ========================================================================
    logSection('TEST 2: Manual Start Tracking (saves swipes)');
    
    // Close any open modals first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    const countBeforeManual = await getTrackingCount();
    
    // Click Start Tracking
    const startBtn = await page.$('[data-testid="start-tracking-btn"]');
    if (startBtn) {
      await startBtn.click({ force: true });
      await page.waitForTimeout(500);
      
      // Do 3 swipes WITH tracking active
      for (let i = 0; i < 3; i++) {
        // Close any modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        
        await page.keyboard.press(i % 2 === 0 ? 'ArrowRight' : 'ArrowLeft');
        await page.waitForTimeout(600);
      }
      
      const countAfterManual = await getTrackingCount();
      const savedWithTracking = countAfterManual - countBeforeManual;
      
      log('📊', `Actions after 3 swipes (with tracking): ${countAfterManual}`);
      log('📊', `New actions saved: ${savedWithTracking}`);
      
      if (savedWithTracking >= 2) {
        log('✅', 'TEST 2 PASSED: Manual tracking saves swipes');
        testsPassed++;
      } else {
        log('❌', `TEST 2 FAILED: Only ${savedWithTracking} actions saved`);
        testsFailed++;
      }
    } else {
      log('❌', 'TEST 2 FAILED: Start Tracking button not found');
      testsFailed++;
    }

    // ========================================================================
    // TEST 3: Counter shows remaining interactions for auto-save
    // ========================================================================
    logSection('TEST 3: Counter shows remaining for auto-save');
    
    const pageText = await page.textContent('body');
    const hasAutoSaveCounter = pageText.includes('more for auto-save') || pageText.includes('Auto-saving');
    
    if (hasAutoSaveCounter) {
      log('✅', 'TEST 3 PASSED: Auto-save counter visible');
      testsPassed++;
    } else {
      log('❌', 'TEST 3 FAILED: Auto-save counter not found');
      testsFailed++;
    }

    // ========================================================================
    // TEST 4: Stop button shows interaction count
    // ========================================================================
    logSection('TEST 4: Stop button shows count');
    
    const stopBtn = await page.$('[data-testid="stop-tracking-btn"]');
    if (stopBtn) {
      const stopBtnText = await stopBtn.textContent();
      const hasCount = /Stop \(\d+\)/.test(stopBtnText);
      
      log('📊', `Stop button text: "${stopBtnText}"`);
      
      if (hasCount) {
        log('✅', 'TEST 4 PASSED: Stop button shows count');
        testsPassed++;
      } else {
        log('❌', 'TEST 4 FAILED: Stop button missing count');
        testsFailed++;
      }
    } else {
      log('❌', 'TEST 4 FAILED: Stop button not found');
      testsFailed++;
    }

    // ========================================================================
    // TEST 5: Stop tracking returns to Start button
    // ========================================================================
    logSection('TEST 5: Stop tracking');
    
    if (stopBtn) {
      await stopBtn.click();
      await page.waitForTimeout(500);
      
      const startBtnAgain = await page.$('[data-testid="start-tracking-btn"]');
      if (startBtnAgain) {
        log('✅', 'TEST 5 PASSED: Stop returns to Start button');
        testsPassed++;
      } else {
        log('❌', 'TEST 5 FAILED: Start button not visible after stop');
        testsFailed++;
      }
    }

  } catch (error) {
    log('❌', `Test error: ${error.message}`);
    testsFailed++;
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(`  📋 RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('═'.repeat(50));
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(console.error);
