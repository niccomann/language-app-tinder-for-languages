/**
 * E2E Test: User Tracking Feature
 * 
 * Tests the tracking system that records user interactions:
 * - Manual tracking start/stop via buttons
 * - Interaction counting
 * - Database persistence verification
 * 
 * Run: node tests/e2e/web/test-tracking.js
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8501';
const TRACKING_DB = 'backend/tracking.db';

async function getTrackingCount() {
  try {
    const result = execSync(`sqlite3 ${TRACKING_DB} "SELECT COUNT(*) FROM tracking_actions;"`, { encoding: 'utf-8' });
    return parseInt(result.trim(), 10);
  } catch (error) {
    console.error('Failed to query tracking DB:', error.message);
    return -1;
  }
}

async function getRecentActions(limit = 5) {
  try {
    const result = execSync(`sqlite3 ${TRACKING_DB} "SELECT action_type, word FROM tracking_actions ORDER BY id DESC LIMIT ${limit};"`, { encoding: 'utf-8' });
    return result.trim();
  } catch (error) {
    console.error('Failed to query tracking DB:', error.message);
    return '';
  }
}

async function runTest() {
  console.log('🧪 E2E Test: User Tracking Feature\n');
  
  // Check backend health
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) throw new Error('Backend not healthy');
    console.log('✅ Backend is running');
  } catch (error) {
    console.log('❌ Backend not running. Start it first.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Get initial tracking count
    const initialCount = await getTrackingCount();
    console.log(`\n📊 Initial tracking actions: ${initialCount}`);

    // Test 1: Navigate and start learning
    console.log('\n--- Test 1: Navigate to learning screen ---');
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('button:has-text("Start Learning")');
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(1000);
    
    // Check if tracking button exists
    const startTrackingBtn = await page.$('[data-testid="start-tracking-btn"]');
    if (startTrackingBtn) {
      console.log('✅ Start Tracking button visible');
      testsPassed++;
    } else {
      console.log('❌ Start Tracking button not found');
      testsFailed++;
    }

    // Test 2: Click Start Tracking
    console.log('\n--- Test 2: Manual tracking start ---');
    if (startTrackingBtn) {
      await startTrackingBtn.click();
      await page.waitForTimeout(500);
      
      const stopTrackingBtn = await page.$('[data-testid="stop-tracking-btn"]');
      if (stopTrackingBtn) {
        console.log('✅ Stop Tracking button appeared (tracking active)');
        testsPassed++;
      } else {
        console.log('❌ Stop Tracking button not found');
        testsFailed++;
      }
    }

    // Test 3: Perform swipes and verify they are tracked
    console.log('\n--- Test 3: Swipe actions tracked ---');
    const countBeforeSwipes = await getTrackingCount();
    
    // Do 3 swipes
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    
    const countAfterSwipes = await getTrackingCount();
    const newActions = countAfterSwipes - countBeforeSwipes;
    
    console.log(`   Actions before: ${countBeforeSwipes}`);
    console.log(`   Actions after: ${countAfterSwipes}`);
    console.log(`   New actions: ${newActions}`);
    
    if (newActions >= 2) {
      console.log('✅ Swipe actions were tracked');
      testsPassed++;
    } else {
      console.log('❌ Swipe actions not tracked (expected >= 2)');
      testsFailed++;
    }

    // Test 4: Verify recent actions in DB
    console.log('\n--- Test 4: Verify action types in DB ---');
    const recentActions = await getRecentActions(5);
    console.log('   Recent actions:');
    recentActions.split('\n').forEach(line => console.log(`     ${line}`));
    
    if (recentActions.includes('swipe_right') || recentActions.includes('swipe_left')) {
      console.log('✅ Swipe actions found in database');
      testsPassed++;
    } else {
      console.log('❌ No swipe actions found in database');
      testsFailed++;
    }

    // Test 5: Stop tracking
    console.log('\n--- Test 5: Stop tracking ---');
    const stopBtn = await page.$('[data-testid="stop-tracking-btn"]');
    if (stopBtn) {
      await stopBtn.click();
      await page.waitForTimeout(500);
      
      const startBtnAgain = await page.$('[data-testid="start-tracking-btn"]');
      if (startBtnAgain) {
        console.log('✅ Tracking stopped successfully');
        testsPassed++;
      } else {
        console.log('❌ Could not verify tracking stopped');
        testsFailed++;
      }
    }

    // Test 6: Interaction counter visibility
    console.log('\n--- Test 6: Interaction counter ---');
    const counterText = await page.textContent('body');
    if (counterText.includes('more for auto-save') || counterText.includes('Auto-saving')) {
      console.log('✅ Interaction counter is visible');
      testsPassed++;
    } else {
      console.log('❌ Interaction counter not found');
      testsFailed++;
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    testsFailed++;
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📋 RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('='.repeat(50));
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tracking tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTest().catch(console.error);
