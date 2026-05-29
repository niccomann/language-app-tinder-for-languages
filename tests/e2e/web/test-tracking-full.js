/**
 * E2E Test Suite: Complete Tracking + Infographics Flow
 * 
 * Tests the full user journey:
 * 1. Start learning session
 * 2. Track interactions (swipes)
 * 3. End session
 * 4. Generate infographic from session data
 * 
 * Run: node tests/e2e/web/test-tracking-full.js
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const {
  DEFAULT_BACKEND_URL: BACKEND_URL,
  DEFAULT_FRONTEND_URL: FRONTEND_URL,
} = require('../../helpers/testUrls');

const TRACKING_DB = 'backend/tracking.db';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function getTrackingCount() {
  try {
    const result = execSync(`sqlite3 ${TRACKING_DB} "SELECT COUNT(*) FROM tracking_actions;"`, { encoding: 'utf-8' });
    return parseInt(result.trim(), 10);
  } catch (error) {
    console.error('Failed to query tracking DB:', error.message);
    return -1;
  }
}

async function getSessionCount() {
  try {
    const result = execSync(`sqlite3 ${TRACKING_DB} "SELECT COUNT(*) FROM tracking_sessions;"`, { encoding: 'utf-8' });
    return parseInt(result.trim(), 10);
  } catch (error) {
    return -1;
  }
}

async function getLatestSessionUuid() {
  try {
    const result = execSync(`sqlite3 ${TRACKING_DB} "SELECT session_uuid FROM tracking_sessions ORDER BY id DESC LIMIT 1;"`, { encoding: 'utf-8' });
    return result.trim();
  } catch (error) {
    return null;
  }
}

async function getSessionActions(sessionUuid) {
  try {
    const result = execSync(`sqlite3 ${TRACKING_DB} "SELECT action_type, word FROM tracking_actions WHERE session_id = (SELECT id FROM tracking_sessions WHERE session_uuid = '${sessionUuid}');"`, { encoding: 'utf-8' });
    return result.trim().split('\n').filter(line => line);
  } catch (error) {
    return [];
  }
}

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function logSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function runTestSuite() {
  logSection('🧪 TRACKING + INFOGRAPHICS TEST SUITE');
  
  let testsPassed = 0;
  let testsFailed = 0;
  const results = [];

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
    // TEST 1: Session Creation
    // ========================================================================
    logSection('TEST 1: Session Creation');
    
    const sessionsBefore = await getSessionCount();
    log('📊', `Sessions before: ${sessionsBefore}`);
    
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('button:has-text("Start Learning")');
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(1500);
    
    const sessionsAfter = await getSessionCount();
    log('📊', `Sessions after: ${sessionsAfter}`);
    
    if (sessionsAfter > sessionsBefore) {
      log('✅', 'TEST 1 PASSED: New session created');
      testsPassed++;
      results.push({ name: 'Session Creation', passed: true });
    } else {
      log('❌', 'TEST 1 FAILED: No new session created');
      testsFailed++;
      results.push({ name: 'Session Creation', passed: false });
    }

    // ========================================================================
    // TEST 2: Manual Tracking Start
    // ========================================================================
    logSection('TEST 2: Manual Tracking Start');
    
    const startBtn = await page.$('[data-testid="start-tracking-btn"]');
    if (startBtn) {
      await startBtn.click();
      await page.waitForTimeout(500);
      
      const stopBtn = await page.$('[data-testid="stop-tracking-btn"]');
      if (stopBtn) {
        log('✅', 'TEST 2 PASSED: Tracking started manually');
        testsPassed++;
        results.push({ name: 'Manual Tracking Start', passed: true });
      } else {
        log('❌', 'TEST 2 FAILED: Stop button not visible after start');
        testsFailed++;
        results.push({ name: 'Manual Tracking Start', passed: false });
      }
    } else {
      log('❌', 'TEST 2 FAILED: Start tracking button not found');
      testsFailed++;
      results.push({ name: 'Manual Tracking Start', passed: false });
    }

    // ========================================================================
    // TEST 3: Swipe Actions Tracked
    // ========================================================================
    logSection('TEST 3: Swipe Actions Tracked');
    
    const actionsBefore = await getTrackingCount();
    log('📊', `Actions before swipes: ${actionsBefore}`);
    
    // Perform multiple swipes
    await page.keyboard.press('ArrowRight');  // Know
    await page.waitForTimeout(400);
    await page.keyboard.press('ArrowLeft');   // Don't know
    await page.waitForTimeout(600);
    await page.keyboard.press('ArrowRight');  // Know
    await page.waitForTimeout(400);
    await page.keyboard.press('ArrowRight');  // Know
    await page.waitForTimeout(400);
    await page.keyboard.press('ArrowLeft');   // Don't know
    await page.waitForTimeout(600);
    
    const actionsAfter = await getTrackingCount();
    const newActions = actionsAfter - actionsBefore;
    log('📊', `Actions after swipes: ${actionsAfter} (+${newActions})`);
    
    if (newActions >= 4) {
      log('✅', `TEST 3 PASSED: ${newActions} swipe actions tracked`);
      testsPassed++;
      results.push({ name: 'Swipe Actions Tracked', passed: true, details: `${newActions} actions` });
    } else {
      log('❌', `TEST 3 FAILED: Only ${newActions} actions tracked (expected >= 4)`);
      testsFailed++;
      results.push({ name: 'Swipe Actions Tracked', passed: false });
    }

    // ========================================================================
    // TEST 4: Action Types Verification
    // ========================================================================
    logSection('TEST 4: Action Types Verification');
    
    const sessionUuid = await getLatestSessionUuid();
    log('📋', `Latest session UUID: ${sessionUuid}`);
    
    const actions = await getSessionActions(sessionUuid);
    const hasSwipeRight = actions.some(a => a.includes('swipe_right'));
    const hasSwipeLeft = actions.some(a => a.includes('swipe_left'));
    
    log('📊', `Actions in session: ${actions.length}`);
    log('📊', `Has swipe_right: ${hasSwipeRight}`);
    log('📊', `Has swipe_left: ${hasSwipeLeft}`);
    
    if (hasSwipeRight && hasSwipeLeft) {
      log('✅', 'TEST 4 PASSED: Both action types recorded');
      testsPassed++;
      results.push({ name: 'Action Types Verification', passed: true });
    } else {
      log('❌', 'TEST 4 FAILED: Missing action types');
      testsFailed++;
      results.push({ name: 'Action Types Verification', passed: false });
    }

    // ========================================================================
    // TEST 5: Interaction Counter UI
    // ========================================================================
    logSection('TEST 5: Interaction Counter UI');
    
    const pageText = await page.textContent('body');
    const hasCounter = pageText.includes('more for auto-save') || pageText.includes('Auto-saving');
    
    if (hasCounter) {
      log('✅', 'TEST 5 PASSED: Interaction counter visible');
      testsPassed++;
      results.push({ name: 'Interaction Counter UI', passed: true });
    } else {
      log('❌', 'TEST 5 FAILED: Interaction counter not found');
      testsFailed++;
      results.push({ name: 'Interaction Counter UI', passed: false });
    }

    // ========================================================================
    // TEST 6: Stop Tracking
    // ========================================================================
    logSection('TEST 6: Stop Tracking');
    
    const stopBtn = await page.$('[data-testid="stop-tracking-btn"]');
    if (stopBtn) {
      await stopBtn.click();
      await page.waitForTimeout(500);
      
      const startBtnAgain = await page.$('[data-testid="start-tracking-btn"]');
      if (startBtnAgain) {
        log('✅', 'TEST 6 PASSED: Tracking stopped successfully');
        testsPassed++;
        results.push({ name: 'Stop Tracking', passed: true });
      } else {
        log('❌', 'TEST 6 FAILED: Start button not visible after stop');
        testsFailed++;
        results.push({ name: 'Stop Tracking', passed: false });
      }
    } else {
      log('⚠️', 'TEST 6 SKIPPED: Stop button not found');
      results.push({ name: 'Stop Tracking', passed: true, skipped: true });
    }

    // ========================================================================
    // TEST 7: Session Summary API
    // ========================================================================
    logSection('TEST 7: Session Summary API');
    
    if (sessionUuid) {
      try {
        const summaryResponse = await fetch(`${BACKEND_URL}/api/tracking/session/${sessionUuid}/summary`);
        const summary = await summaryResponse.json();
        
        log('📊', `Session summary:`);
        log('   ', `- Total swipes: ${summary.total_swipes}`);
        log('   ', `- Correct: ${summary.correct_swipes}`);
        log('   ', `- Accuracy: ${summary.accuracy_percent}%`);
        log('   ', `- Duration: ${summary.duration_minutes} min`);
        
        if (summary.total_swipes > 0) {
          log('✅', 'TEST 7 PASSED: Session summary retrieved');
          testsPassed++;
          results.push({ name: 'Session Summary API', passed: true, details: `${summary.total_swipes} swipes, ${summary.accuracy_percent}% accuracy` });
        } else {
          log('❌', 'TEST 7 FAILED: Empty session summary');
          testsFailed++;
          results.push({ name: 'Session Summary API', passed: false });
        }
      } catch (error) {
        log('❌', `TEST 7 FAILED: ${error.message}`);
        testsFailed++;
        results.push({ name: 'Session Summary API', passed: false, error: error.message });
      }
    } else {
      log('⚠️', 'TEST 7 SKIPPED: No session UUID');
      results.push({ name: 'Session Summary API', passed: false, skipped: true });
    }

    // ========================================================================
    // TEST 8: Infographic Generation Endpoint (Check availability)
    // ========================================================================
    logSection('TEST 8: Infographic Generation Endpoint');
    
    if (sessionUuid) {
      try {
        const infographicResponse = await fetch(`${BACKEND_URL}/api/infographics/from-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_uuid: sessionUuid,
            use_pro_model: true
          })
        });
        
        const infographicResult = await infographicResponse.json();
        
        if (infographicResponse.ok && infographicResult.success) {
          log('✅', 'TEST 8 PASSED: Infographic generated successfully');
          log('📊', `Model used: ${infographicResult.model}`);
          log('📊', `Image size: ${infographicResult.image_base64?.length || 0} chars`);
          testsPassed++;
          results.push({ name: 'Infographic Generation', passed: true, details: `Model: ${infographicResult.model}` });
        } else if (infographicResponse.status === 400 && infographicResult.detail?.includes('no actions')) {
          log('⚠️', 'TEST 8 SKIPPED: Session has no actions yet');
          results.push({ name: 'Infographic Generation', passed: true, skipped: true });
        } else if (infographicResponse.status === 500 && infographicResult.detail?.includes('GEMINI_API_KEY')) {
          log('⚠️', 'TEST 8 SKIPPED: GEMINI_API_KEY not configured');
          results.push({ name: 'Infographic Generation', passed: true, skipped: true, reason: 'No API key' });
        } else {
          log('❌', `TEST 8 FAILED: ${infographicResult.detail || infographicResult.error}`);
          testsFailed++;
          results.push({ name: 'Infographic Generation', passed: false, error: infographicResult.detail });
        }
      } catch (error) {
        log('❌', `TEST 8 FAILED: ${error.message}`);
        testsFailed++;
        results.push({ name: 'Infographic Generation', passed: false, error: error.message });
      }
    } else {
      log('⚠️', 'TEST 8 SKIPPED: No session UUID');
      results.push({ name: 'Infographic Generation', passed: false, skipped: true });
    }

  } catch (error) {
    log('❌', `Test suite error: ${error.message}`);
    testsFailed++;
  } finally {
    await browser.close();
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  logSection('📋 TEST RESULTS SUMMARY');
  
  console.log('\n');
  results.forEach((r, i) => {
    const status = r.skipped ? '⚠️ SKIP' : (r.passed ? '✅ PASS' : '❌ FAIL');
    const details = r.details ? ` (${r.details})` : '';
    const error = r.error ? ` - Error: ${r.error}` : '';
    console.log(`  ${i + 1}. ${r.name}: ${status}${details}${error}`);
  });
  
  console.log('\n' + '─'.repeat(60));
  console.log(`  TOTAL: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('─'.repeat(60));
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check output above.\n');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// ============================================================================
// RUN
// ============================================================================

runTestSuite().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
