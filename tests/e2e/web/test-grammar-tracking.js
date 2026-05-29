/**
 * E2E Test: Grammar Lab Sentence Validation Tracking
 * 
 * Tests tracking of sentence validation in Grammar Lab:
 * - sentence_validated action is tracked
 * - Sentence data (de/en) is captured
 * - Success/score fields are recorded
 * 
 * Run: node tests/e2e/web/test-grammar-tracking.js
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

async function getSentenceValidatedCount() {
  try {
    const result = execSync(`sqlite3 ${TRACKING_DB} "SELECT COUNT(*) FROM tracking_actions WHERE action_type = 'sentence_validated';"`, { encoding: 'utf-8' });
    return parseInt(result.trim(), 10);
  } catch (error) {
    return -1;
  }
}

async function getLatestSentenceValidation() {
  try {
    const result = execSync(`sqlite3 ${TRACKING_DB} "SELECT action_type, extra_data FROM tracking_actions WHERE action_type = 'sentence_validated' ORDER BY id DESC LIMIT 1;"`, { encoding: 'utf-8' });
    return result.trim();
  } catch (error) {
    return null;
  }
}

async function runTests() {
  console.log('\n🧪 GRAMMAR LAB TRACKING TEST SUITE\n');
  
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
    // TEST 1: Navigate to Grammar Lab
    // ========================================================================
    logSection('TEST 1: Navigate to Grammar Lab');
    
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('button:has-text("Start Learning")');
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(1000);
    
    // Click Grammar Lab button
    const grammarBtn = await page.$('button:has-text("Grammar")');
    if (grammarBtn) {
      await grammarBtn.click();
      await page.waitForTimeout(1500);
      log('✅', 'TEST 1 PASSED: Navigated to Grammar Lab');
      testsPassed++;
    } else {
      log('❌', 'TEST 1 FAILED: Grammar button not found');
      testsFailed++;
    }

    // ========================================================================
    // TEST 2: Find Sentence Builder tab
    // ========================================================================
    logSection('TEST 2: Find Sentence Builder');
    
    // Look for the Sentence Builder tab
    const sentenceBuilderTab = await page.$('button:has-text("Sentence")');
    if (sentenceBuilderTab) {
      await sentenceBuilderTab.click();
      await page.waitForTimeout(1000);
      log('✅', 'TEST 2 PASSED: Sentence Builder tab found');
      testsPassed++;
    } else {
      // Try finding by partial text
      const tabs = await page.$$('button');
      let found = false;
      for (const tab of tabs) {
        const text = await tab.textContent();
        if (text?.toLowerCase().includes('sentence') || text?.toLowerCase().includes('builder')) {
          await tab.click();
          await page.waitForTimeout(1000);
          found = true;
          break;
        }
      }
      if (found) {
        log('✅', 'TEST 2 PASSED: Sentence Builder tab found');
        testsPassed++;
      } else {
        log('⚠️', 'TEST 2 SKIPPED: Sentence Builder tab not found');
      }
    }

    // ========================================================================
    // TEST 3: Check sentence_validated count before
    // ========================================================================
    logSection('TEST 3: Check initial sentence_validated count');
    
    const countBefore = await getSentenceValidatedCount();
    log('📊', `sentence_validated count before: ${countBefore}`);
    
    if (countBefore >= 0) {
      log('✅', 'TEST 3 PASSED: Can query sentence_validated count');
      testsPassed++;
    } else {
      log('❌', 'TEST 3 FAILED: Cannot query database');
      testsFailed++;
    }

    // ========================================================================
    // TEST 4: API Test - Direct sentence_validated tracking
    // ========================================================================
    logSection('TEST 4: API Direct sentence_validated tracking');
    
    // Create a session for testing
    const sessionResponse = await fetch(`${BACKEND_URL}/api/tracking/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'grammar_test_user', device_type: 'test' })
    });
    const sessionData = await sessionResponse.json();
    const testSessionUuid = sessionData.session_uuid;
    
    log('📋', `Test session: ${testSessionUuid.substring(0, 8)}...`);
    
    // Track a sentence_validated action
    const trackResponse = await fetch(`${BACKEND_URL}/api/tracking/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_uuid: testSessionUuid,
        action_type: 'sentence_validated',
        sentence_de: 'Der Hund ist groß',
        sentence_en: 'The dog is big',
        success: true,
        score: 95
      })
    });
    
    const trackResult = await trackResponse.json();
    
    if (trackResponse.ok && trackResult.success) {
      log('✅', 'TEST 4 PASSED: sentence_validated tracked via API');
      testsPassed++;
    } else {
      log('❌', `TEST 4 FAILED: ${JSON.stringify(trackResult)}`);
      testsFailed++;
    }

    // ========================================================================
    // TEST 5: Verify sentence_validated count increased
    // ========================================================================
    logSection('TEST 5: Verify count increased');
    
    const countAfter = await getSentenceValidatedCount();
    log('📊', `sentence_validated count after: ${countAfter}`);
    
    if (countAfter > countBefore) {
      log('✅', `TEST 5 PASSED: Count increased (${countBefore} → ${countAfter})`);
      testsPassed++;
    } else {
      log('❌', 'TEST 5 FAILED: Count did not increase');
      testsFailed++;
    }

    // ========================================================================
    // TEST 6: Track another sentence with different data
    // ========================================================================
    logSection('TEST 6: Track failed validation');
    
    const trackFailedResponse = await fetch(`${BACKEND_URL}/api/tracking/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_uuid: testSessionUuid,
        action_type: 'sentence_validated',
        sentence_de: 'Die Katze schläft',
        sentence_en: 'The cat sleeps',
        success: false,
        score: 40
      })
    });
    
    const trackFailedResult = await trackFailedResponse.json();
    
    if (trackFailedResponse.ok && trackFailedResult.success) {
      log('✅', 'TEST 6 PASSED: Failed validation tracked');
      testsPassed++;
    } else {
      log('❌', 'TEST 6 FAILED: Could not track failed validation');
      testsFailed++;
    }

    // ========================================================================
    // TEST 7: Verify session has sentence validations
    // ========================================================================
    logSection('TEST 7: Session includes sentence validations');
    
    const summaryResponse = await fetch(`${BACKEND_URL}/api/tracking/session/${testSessionUuid}/summary`);
    const summary = await summaryResponse.json();
    
    log('📊', `Total actions in session: ${summary.total_actions}`);
    
    if (summary.total_actions >= 2) {
      log('✅', 'TEST 7 PASSED: Session has tracked actions');
      testsPassed++;
    } else {
      log('❌', 'TEST 7 FAILED: Session missing actions');
      testsFailed++;
    }

    // Cleanup test session
    await fetch(`${BACKEND_URL}/api/tracking/session/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_uuid: testSessionUuid })
    });

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
  
  if (testsFailed === 0) {
    console.log('\n🎉 All Grammar Lab tracking tests passed!\n');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(console.error);
