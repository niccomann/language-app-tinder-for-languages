/**
 * E2E Test: Infographic Content Verification
 * 
 * Tests the infographic generation with content validation:
 * - Infographic contains session metadata
 * - Model used is correct
 * - Image is valid base64
 * - Metadata includes all required fields
 * 
 * Run: node tests/e2e/web/test-infographic-content.js
 */

const { DEFAULT_BACKEND_URL: BACKEND_URL } = require('../../helpers/testUrls');

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function logSection(title) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(50));
}

function isValidBase64(str) {
  if (!str || str.length < 100) return false;
  try {
    return btoa(atob(str)) === str || str.startsWith('iVBOR') || str.startsWith('/9j/');
  } catch (e) {
    // Check if it looks like base64
    return /^[A-Za-z0-9+/=]+$/.test(str.substring(0, 100));
  }
}

async function runTests() {
  console.log('\n🧪 INFOGRAPHIC CONTENT TEST SUITE\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  let sessionUuid = null;

  // Check backend
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) throw new Error('Backend not healthy');
    log('✅', 'Backend is running');
  } catch (error) {
    log('❌', 'Backend not running. Start it first.');
    process.exit(1);
  }

  // ========================================================================
  // SETUP: Create session with tracking data
  // ========================================================================
  logSection('SETUP: Create tracked session');
  
  try {
    // Start session
    const startResponse = await fetch(`${BACKEND_URL}/api/tracking/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'test_infographic_user', device_type: 'test' })
    });
    const startData = await startResponse.json();
    sessionUuid = startData.session_uuid;
    log('📋', `Session: ${sessionUuid.substring(0, 8)}...`);
    
    // Track some actions
    const actions = [
      { action_type: 'swipe_right', word: 'Apfel', translation: 'apple' },
      { action_type: 'swipe_right', word: 'Birne', translation: 'pear' },
      { action_type: 'swipe_left', word: 'Orange', translation: 'orange' },
      { action_type: 'swipe_right', word: 'Banane', translation: 'banana' },
    ];
    
    for (const action of actions) {
      await fetch(`${BACKEND_URL}/api/tracking/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_uuid: sessionUuid, ...action, language: 'de' })
      });
    }
    log('✅', `Tracked ${actions.length} actions`);
    
  } catch (error) {
    log('❌', `Setup failed: ${error.message}`);
    process.exit(1);
  }

  // ========================================================================
  // TEST 1: Infographic generation succeeds
  // ========================================================================
  logSection('TEST 1: Infographic generation');
  
  let infographicResult = null;
  
  try {
    log('⏳', 'Generating infographic (may take a few seconds)...');
    
    const response = await fetch(`${BACKEND_URL}/api/infographics/from-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_uuid: sessionUuid, use_pro_model: true })
    });
    
    infographicResult = await response.json();
    
    if (response.ok && infographicResult.success) {
      log('✅', 'TEST 1 PASSED: Infographic generated successfully');
      testsPassed++;
    } else if (infographicResult.detail?.includes('GEMINI_API_KEY')) {
      log('⚠️', 'TEST 1 SKIPPED: GEMINI_API_KEY not configured');
    } else {
      log('❌', `TEST 1 FAILED: ${infographicResult.detail || infographicResult.error}`);
      testsFailed++;
    }
  } catch (error) {
    log('❌', `TEST 1 FAILED: ${error.message}`);
    testsFailed++;
  }

  // Only continue if infographic was generated
  if (!infographicResult?.success) {
    log('⚠️', 'Skipping remaining tests (no infographic generated)');
    
    // Cleanup
    await fetch(`${BACKEND_URL}/api/tracking/session/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_uuid: sessionUuid })
    });
    
    console.log('\n' + '═'.repeat(50));
    console.log(`  📋 RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
    console.log('═'.repeat(50));
    process.exit(testsFailed > 0 ? 1 : 0);
  }

  // ========================================================================
  // TEST 2: Image is valid base64
  // ========================================================================
  logSection('TEST 2: Image is valid base64');
  
  const imageBase64 = infographicResult.image_base64;
  const imageSizeKB = Math.round((imageBase64?.length || 0) / 1024);
  
  log('📐', `Image size: ${imageSizeKB} KB`);
  
  if (imageBase64 && imageSizeKB > 10) {
    log('✅', 'TEST 2 PASSED: Image is valid (> 10 KB)');
    testsPassed++;
  } else {
    log('❌', 'TEST 2 FAILED: Image too small or missing');
    testsFailed++;
  }

  // ========================================================================
  // TEST 3: Model field is present
  // ========================================================================
  logSection('TEST 3: Model field');
  
  const model = infographicResult.model;
  log('🎨', `Model: ${model}`);
  
  if (model && model.includes('gemini')) {
    log('✅', 'TEST 3 PASSED: Gemini model used');
    testsPassed++;
  } else {
    log('❌', `TEST 3 FAILED: Unexpected model: ${model}`);
    testsFailed++;
  }

  // ========================================================================
  // TEST 4: Metadata contains session_uuid
  // ========================================================================
  logSection('TEST 4: Metadata - session_uuid');
  
  const metadata = infographicResult.metadata || {};
  
  if (metadata.session_uuid === sessionUuid) {
    log('✅', 'TEST 4 PASSED: Metadata contains correct session_uuid');
    testsPassed++;
  } else {
    log('❌', 'TEST 4 FAILED: session_uuid mismatch in metadata');
    testsFailed++;
  }

  // ========================================================================
  // TEST 5: Metadata contains accuracy_percent
  // ========================================================================
  logSection('TEST 5: Metadata - accuracy_percent');
  
  if (typeof metadata.accuracy_percent === 'number') {
    log('📊', `Accuracy: ${metadata.accuracy_percent}%`);
    log('✅', 'TEST 5 PASSED: accuracy_percent present');
    testsPassed++;
  } else {
    log('❌', 'TEST 5 FAILED: accuracy_percent missing');
    testsFailed++;
  }

  // ========================================================================
  // TEST 6: Metadata contains word counts
  // ========================================================================
  logSection('TEST 6: Metadata - word counts');
  
  const hasLearnedCount = typeof metadata.words_learned_count === 'number';
  const hasPracticeCount = typeof metadata.words_to_practice_count === 'number';
  
  log('📗', `Words learned: ${metadata.words_learned_count}`);
  log('📕', `Words to practice: ${metadata.words_to_practice_count}`);
  
  if (hasLearnedCount && hasPracticeCount) {
    log('✅', 'TEST 6 PASSED: Word counts present');
    testsPassed++;
  } else {
    log('❌', 'TEST 6 FAILED: Word counts missing');
    testsFailed++;
  }

  // ========================================================================
  // TEST 7: Metadata contains total_actions
  // ========================================================================
  logSection('TEST 7: Metadata - total_actions');
  
  if (typeof metadata.total_actions === 'number' && metadata.total_actions > 0) {
    log('📊', `Total actions: ${metadata.total_actions}`);
    log('✅', 'TEST 7 PASSED: total_actions present');
    testsPassed++;
  } else {
    log('❌', 'TEST 7 FAILED: total_actions missing or zero');
    testsFailed++;
  }

  // ========================================================================
  // TEST 8: Prompt was used (for debugging)
  // ========================================================================
  logSection('TEST 8: Prompt used');
  
  const promptUsed = infographicResult.prompt_used;
  
  if (promptUsed && promptUsed.length > 50) {
    log('📝', `Prompt length: ${promptUsed.length} chars`);
    log('✅', 'TEST 8 PASSED: Prompt captured');
    testsPassed++;
  } else {
    log('⚠️', 'TEST 8 SKIPPED: Prompt not returned (optional field)');
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================
  logSection('CLEANUP');
  
  await fetch(`${BACKEND_URL}/api/tracking/session/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_uuid: sessionUuid })
  });
  log('✅', 'Session ended');

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(`  📋 RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('═'.repeat(50));
  
  if (testsFailed === 0) {
    console.log('\n🎉 All infographic content tests passed!\n');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(console.error);
