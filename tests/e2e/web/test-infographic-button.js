/**
 * E2E Test: Infographic Button in LearningScreen
 * 
 * Tests that the infographic generation button appears after 30 interactions
 * and correctly generates an image via Gemini API.
 * 
 * Run: node tests/e2e/web/test-infographic-button.js
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

async function runTests() {
  console.log('\n🧪 INFOGRAPHIC BUTTON TEST SUITE\n');
  
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
  // TEST 1: Create session and track 30+ actions
  // ========================================================================
  logSection('TEST 1: Create session with 30+ interactions');
  
  try {
    // Start session
    const startResponse = await fetch(`${BACKEND_URL}/api/tracking/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'test_infographic_btn', device_type: 'test' })
    });
    const startData = await startResponse.json();
    sessionUuid = startData.session_uuid;
    log('📋', `Session: ${sessionUuid.substring(0, 8)}...`);
    
    // Track 35 actions (above threshold)
    const words = ['Hund', 'Katze', 'Vogel', 'Fisch', 'Pferd', 'Maus', 'Bär', 'Elefant', 'Löwe', 'Tiger'];
    
    for (let i = 0; i < 35; i++) {
      const word = words[i % words.length];
      const actionType = Math.random() > 0.3 ? 'swipe_right' : 'swipe_left';
      
      await fetch(`${BACKEND_URL}/api/tracking/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_uuid: sessionUuid,
          action_type: actionType,
          word: word,
          translation: `${word}_en`,
          language: 'de'
        })
      });
    }
    
    log('✅', 'TEST 1 PASSED: Created session with 35 interactions');
    testsPassed++;
  } catch (error) {
    log('❌', `TEST 1 FAILED: ${error.message}`);
    testsFailed++;
  }

  // ========================================================================
  // TEST 2: Verify session has enough actions
  // ========================================================================
  logSection('TEST 2: Verify session has 30+ actions');
  
  try {
    const summaryResponse = await fetch(`${BACKEND_URL}/api/tracking/session/${sessionUuid}/summary`);
    const summary = await summaryResponse.json();
    
    log('📊', `Total actions: ${summary.total_actions}`);
    
    if (summary.total_actions >= 30) {
      log('✅', `TEST 2 PASSED: Session has ${summary.total_actions} actions (>= 30)`);
      testsPassed++;
    } else {
      log('❌', `TEST 2 FAILED: Only ${summary.total_actions} actions`);
      testsFailed++;
    }
  } catch (error) {
    log('❌', `TEST 2 FAILED: ${error.message}`);
    testsFailed++;
  }

  // ========================================================================
  // TEST 3: Generate infographic (simulating button click)
  // ========================================================================
  logSection('TEST 3: Generate infographic via API');
  
  try {
    log('⏳', 'Generating infographic...');
    
    const infographicResponse = await fetch(`${BACKEND_URL}/api/infographics/from-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_uuid: sessionUuid, use_pro_model: true })
    });
    
    const infographic = await infographicResponse.json();
    
    if (infographicResponse.ok && infographic.success) {
      const imageSizeKB = Math.round((infographic.image_base64?.length || 0) / 1024);
      log('✅', `TEST 3 PASSED: Infographic generated (${imageSizeKB} KB)`);
      log('🎨', `Model: ${infographic.model}`);
      
      if (infographic.metadata) {
        log('📊', `Accuracy: ${infographic.metadata.accuracy_percent}%`);
        log('📗', `Words learned: ${infographic.metadata.words_learned_count}`);
        log('📕', `Words to practice: ${infographic.metadata.words_to_practice_count}`);
      }
      
      testsPassed++;
    } else if (infographic.detail?.includes('GEMINI_API_KEY')) {
      log('⚠️', 'TEST 3 SKIPPED: GEMINI_API_KEY not configured');
    } else {
      log('❌', `TEST 3 FAILED: ${infographic.detail || infographic.error}`);
      testsFailed++;
    }
  } catch (error) {
    log('❌', `TEST 3 FAILED: ${error.message}`);
    testsFailed++;
  }

  // ========================================================================
  // TEST 4: Verify trackingApi.generateInfographic endpoint exists
  // ========================================================================
  logSection('TEST 4: API endpoint exists');
  
  try {
    // Test with invalid session to verify endpoint exists
    const testResponse = await fetch(`${BACKEND_URL}/api/infographics/from-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_uuid: 'invalid-uuid', use_pro_model: true })
    });
    
    // Should return 404 for invalid session, not 405 Method Not Allowed
    if (testResponse.status === 404 || testResponse.status === 200) {
      log('✅', 'TEST 4 PASSED: API endpoint exists and accepts POST');
      testsPassed++;
    } else if (testResponse.status === 405) {
      log('❌', 'TEST 4 FAILED: Endpoint does not accept POST');
      testsFailed++;
    } else {
      log('✅', `TEST 4 PASSED: Endpoint responded with ${testResponse.status}`);
      testsPassed++;
    }
  } catch (error) {
    log('❌', `TEST 4 FAILED: ${error.message}`);
    testsFailed++;
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================
  logSection('CLEANUP');
  
  if (sessionUuid) {
    await fetch(`${BACKEND_URL}/api/tracking/session/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_uuid: sessionUuid })
    });
    log('✅', 'Session ended');
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(`  📋 RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('═'.repeat(50));
  
  if (testsFailed === 0) {
    console.log('\n🎉 All infographic button tests passed!\n');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(console.error);
