/**
 * API Test: Tracking Endpoints (No Browser)
 * 
 * Tests the backend tracking API directly without browser:
 * 1. Start session
 * 2. Track multiple actions
 * 3. Get session summary
 * 4. End session
 * 5. Generate infographic (if Gemini API key configured)
 * 
 * Run: node tests/e2e/web/test-tracking-api.js
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

async function runApiTests() {
  console.log('\n🧪 TRACKING API TEST SUITE\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  let sessionUuid = null;

  // ========================================================================
  // TEST 1: Backend Health
  // ========================================================================
  logSection('TEST 1: Backend Health');
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    
    if (data.status === 'healthy') {
      log('✅', 'Backend is healthy');
      testsPassed++;
    } else {
      log('❌', 'Backend unhealthy');
      testsFailed++;
    }
  } catch (error) {
    log('❌', `Backend not reachable: ${error.message}`);
    console.log(`\n⚠️  Backend not reachable at ${BACKEND_URL}. Start it first or set TEST_BACKEND_URL.\n`);
    process.exit(1);
  }

  // ========================================================================
  // TEST 2: Start Tracking Session
  // ========================================================================
  logSection('TEST 2: Start Tracking Session');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/tracking/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'test_api_user',
        device_type: 'test',
        app_version: '1.0.0-test'
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.session_uuid) {
      sessionUuid = data.session_uuid;
      log('✅', `Session started: ${sessionUuid.substring(0, 8)}...`);
      log('📊', `User: ${data.user_id}`);
      log('📊', `Status: ${data.status}`);
      testsPassed++;
    } else {
      log('❌', `Failed to start session: ${JSON.stringify(data)}`);
      testsFailed++;
    }
  } catch (error) {
    log('❌', `Error: ${error.message}`);
    testsFailed++;
  }

  // ========================================================================
  // TEST 3: Track Multiple Actions
  // ========================================================================
  logSection('TEST 3: Track Multiple Actions');
  
  if (sessionUuid) {
    const actions = [
      { action_type: 'swipe_right', word: 'Hund', translation: 'dog' },
      { action_type: 'swipe_left', word: 'Katze', translation: 'cat' },
      { action_type: 'swipe_right', word: 'Vogel', translation: 'bird' },
      { action_type: 'swipe_right', word: 'Fisch', translation: 'fish' },
      { action_type: 'swipe_left', word: 'Pferd', translation: 'horse' },
      { action_type: 'swipe_right', word: 'Maus', translation: 'mouse' },
    ];
    
    let actionsTracked = 0;
    
    for (const action of actions) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/tracking/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_uuid: sessionUuid,
            action_type: action.action_type,
            word: action.word,
            translation: action.translation,
            language: 'de'
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          actionsTracked++;
          log('📝', `${action.action_type}: ${action.word} → ${action.translation}`);
        }
      } catch (error) {
        log('⚠️', `Failed to track ${action.word}: ${error.message}`);
      }
    }
    
    if (actionsTracked === actions.length) {
      log('✅', `All ${actionsTracked} actions tracked successfully`);
      testsPassed++;
    } else {
      log('❌', `Only ${actionsTracked}/${actions.length} actions tracked`);
      testsFailed++;
    }
  } else {
    log('⚠️', 'Skipped: No session UUID');
  }

  // ========================================================================
  // TEST 4: Get Session Summary
  // ========================================================================
  logSection('TEST 4: Get Session Summary');
  
  if (sessionUuid) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tracking/session/${sessionUuid}/summary`);
      const summary = await response.json();
      
      if (response.ok) {
        log('✅', 'Session summary retrieved:');
        log('📊', `Total swipes: ${summary.total_swipes}`);
        log('📊', `Correct (swipe_right): ${summary.correct_swipes}`);
        log('📊', `Incorrect (swipe_left): ${summary.incorrect_swipes}`);
        log('📊', `Accuracy: ${summary.accuracy_percent}%`);
        log('📊', `Duration: ${summary.duration_minutes} min`);
        log('📊', `Total actions: ${summary.total_actions}`);
        
        if (summary.words_learned?.length > 0) {
          log('📗', `Words learned: ${summary.words_learned.map(w => w.word).join(', ')}`);
        }
        if (summary.words_to_practice?.length > 0) {
          log('📕', `Words to practice: ${summary.words_to_practice.map(w => w.word).join(', ')}`);
        }
        
        testsPassed++;
      } else {
        log('❌', `Failed: ${JSON.stringify(summary)}`);
        testsFailed++;
      }
    } catch (error) {
      log('❌', `Error: ${error.message}`);
      testsFailed++;
    }
  } else {
    log('⚠️', 'Skipped: No session UUID');
  }

  // ========================================================================
  // TEST 5: End Session
  // ========================================================================
  logSection('TEST 5: End Session');
  
  if (sessionUuid) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tracking/session/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_uuid: sessionUuid })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        log('✅', 'Session ended successfully');
        log('📊', `Final status: completed`);
        testsPassed++;
      } else {
        log('❌', `Failed to end session: ${JSON.stringify(data)}`);
        testsFailed++;
      }
    } catch (error) {
      log('❌', `Error: ${error.message}`);
      testsFailed++;
    }
  } else {
    log('⚠️', 'Skipped: No session UUID');
  }

  // ========================================================================
  // TEST 6: Generate Infographic (Gemini Nano Banana Pro)
  // ========================================================================
  logSection('TEST 6: Generate Infographic (Gemini)');
  
  if (sessionUuid) {
    try {
      log('⏳', 'Calling Gemini Nano Banana Pro...');
      
      const response = await fetch(`${BACKEND_URL}/api/infographics/from-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_uuid: sessionUuid,
          use_pro_model: true
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        log('✅', 'Infographic generated successfully!');
        log('🎨', `Model: ${data.model}`);
        log('📐', `Image size: ${Math.round((data.image_base64?.length || 0) / 1024)} KB`);
        log('📊', `Metadata: ${JSON.stringify(data.metadata)}`);
        
        // Show what the infographic contains
        if (data.metadata) {
          log('📈', `Accuracy: ${data.metadata.accuracy_percent}%`);
          log('📗', `Words learned: ${data.metadata.words_learned_count}`);
          log('📕', `Words to practice: ${data.metadata.words_to_practice_count}`);
        }
        
        testsPassed++;
      } else if (data.detail?.includes('GEMINI_API_KEY') || data.error?.includes('GEMINI_API_KEY')) {
        log('⚠️', 'SKIPPED: GEMINI_API_KEY not configured');
        log('💡', 'Set GEMINI_API_KEY environment variable to test infographic generation');
      } else if (data.detail?.includes('no actions')) {
        log('⚠️', 'SKIPPED: Session has no actions');
      } else {
        log('❌', `Failed: ${data.detail || data.error || JSON.stringify(data)}`);
        testsFailed++;
      }
    } catch (error) {
      log('❌', `Error: ${error.message}`);
      testsFailed++;
    }
  } else {
    log('⚠️', 'Skipped: No session UUID');
  }

  // ========================================================================
  // TEST 7: Lesson Summary Infographic (Direct Data)
  // ========================================================================
  logSection('TEST 7: Direct Lesson Summary Infographic');
  
  try {
    log('⏳', 'Generating infographic from direct data...');
    
    const response = await fetch(`${BACKEND_URL}/api/infographics/lesson-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        words_learned: [
          { word: 'Hund', translation: 'dog', confidence: 90 },
          { word: 'Katze', translation: 'cat', confidence: 75 },
          { word: 'Vogel', translation: 'bird', confidence: 85 }
        ],
        sentences_built: ['Der Hund ist groß', 'Die Katze schläft'],
        total_swipes: 10,
        correct_swipes: 8,
        session_duration_minutes: 5,
        language: 'de',
        use_pro_model: true
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅', 'Direct infographic generated!');
      log('🎨', `Model: ${data.model}`);
      log('📐', `Image size: ${Math.round((data.image_base64?.length || 0) / 1024)} KB`);
      testsPassed++;
    } else if (data.detail?.includes('GEMINI_API_KEY')) {
      log('⚠️', 'SKIPPED: GEMINI_API_KEY not configured');
    } else {
      log('❌', `Failed: ${data.detail || JSON.stringify(data)}`);
      testsFailed++;
    }
  } catch (error) {
    log('❌', `Error: ${error.message}`);
    testsFailed++;
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  console.log('\n' + '═'.repeat(50));
  console.log('  📋 TEST RESULTS');
  console.log('═'.repeat(50));
  console.log(`\n  ✅ Passed: ${testsPassed}`);
  console.log(`  ❌ Failed: ${testsFailed}`);
  console.log(`  📊 Total: ${testsPassed + testsFailed}\n`);
  
  if (testsFailed === 0) {
    console.log('🎉 All API tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed.\n');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runApiTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
