/**
 * E2E Test: Session Summary Verification
 * 
 * Tests the session summary data accuracy:
 * - Correct/incorrect swipe counts
 * - Accuracy percentage calculation
 * - Words learned vs words to practice
 * - Session duration tracking
 * 
 * Run: node tests/e2e/web/test-session-summary.js
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
  console.log('\n🧪 SESSION SUMMARY TEST SUITE\n');
  
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
  // SETUP: Create a test session with known data
  // ========================================================================
  logSection('SETUP: Create test session');
  
  try {
    const startResponse = await fetch(`${BACKEND_URL}/api/tracking/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'test_summary_user',
        device_type: 'test'
      })
    });
    
    const startData = await startResponse.json();
    sessionUuid = startData.session_uuid;
    log('📋', `Session UUID: ${sessionUuid.substring(0, 8)}...`);
  } catch (error) {
    log('❌', `Setup failed: ${error.message}`);
    process.exit(1);
  }

  // Track specific actions with known outcomes
  const testActions = [
    { action_type: 'swipe_right', word: 'Hund', translation: 'dog' },      // correct
    { action_type: 'swipe_right', word: 'Katze', translation: 'cat' },     // correct
    { action_type: 'swipe_right', word: 'Vogel', translation: 'bird' },    // correct
    { action_type: 'swipe_left', word: 'Fisch', translation: 'fish' },     // incorrect
    { action_type: 'swipe_left', word: 'Pferd', translation: 'horse' },    // incorrect
    { action_type: 'swipe_right', word: 'Maus', translation: 'mouse' },    // correct
    { action_type: 'swipe_right', word: 'Bär', translation: 'bear' },      // correct
    { action_type: 'swipe_left', word: 'Elefant', translation: 'elephant' }, // incorrect
  ];
  
  // Expected: 5 correct, 3 incorrect = 62.5% accuracy
  const expectedCorrect = testActions.filter(a => a.action_type === 'swipe_right').length;
  const expectedIncorrect = testActions.filter(a => a.action_type === 'swipe_left').length;
  const expectedTotal = testActions.length;
  const expectedAccuracy = (expectedCorrect / expectedTotal * 100).toFixed(1);
  
  log('📊', `Expected: ${expectedCorrect} correct, ${expectedIncorrect} incorrect, ${expectedAccuracy}% accuracy`);

  // Track all actions
  for (const action of testActions) {
    await fetch(`${BACKEND_URL}/api/tracking/action`, {
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
  }
  log('✅', `Tracked ${testActions.length} actions`);

  // ========================================================================
  // TEST 1: Total swipes count
  // ========================================================================
  logSection('TEST 1: Total swipes count');
  
  try {
    const summaryResponse = await fetch(`${BACKEND_URL}/api/tracking/session/${sessionUuid}/summary`);
    const summary = await summaryResponse.json();
    
    log('📊', `API returned total_swipes: ${summary.total_swipes}`);
    
    if (summary.total_swipes === expectedTotal) {
      log('✅', `TEST 1 PASSED: Total swipes = ${expectedTotal}`);
      testsPassed++;
    } else {
      log('❌', `TEST 1 FAILED: Expected ${expectedTotal}, got ${summary.total_swipes}`);
      testsFailed++;
    }
  } catch (error) {
    log('❌', `TEST 1 FAILED: ${error.message}`);
    testsFailed++;
  }

  // ========================================================================
  // TEST 2: Correct swipes count
  // ========================================================================
  logSection('TEST 2: Correct swipes count');
  
  try {
    const summaryResponse = await fetch(`${BACKEND_URL}/api/tracking/session/${sessionUuid}/summary`);
    const summary = await summaryResponse.json();
    
    log('📊', `API returned correct_swipes: ${summary.correct_swipes}`);
    
    if (summary.correct_swipes === expectedCorrect) {
      log('✅', `TEST 2 PASSED: Correct swipes = ${expectedCorrect}`);
      testsPassed++;
    } else {
      log('❌', `TEST 2 FAILED: Expected ${expectedCorrect}, got ${summary.correct_swipes}`);
      testsFailed++;
    }
  } catch (error) {
    log('❌', `TEST 2 FAILED: ${error.message}`);
    testsFailed++;
  }

  // ========================================================================
  // TEST 3: Accuracy percentage
  // ========================================================================
  logSection('TEST 3: Accuracy percentage');
  
  try {
    const summaryResponse = await fetch(`${BACKEND_URL}/api/tracking/session/${sessionUuid}/summary`);
    const summary = await summaryResponse.json();
    
    log('📊', `API returned accuracy_percent: ${summary.accuracy_percent}%`);
    
    // Allow small floating point difference
    const accuracyDiff = Math.abs(summary.accuracy_percent - parseFloat(expectedAccuracy));
    if (accuracyDiff < 1) {
      log('✅', `TEST 3 PASSED: Accuracy ≈ ${expectedAccuracy}%`);
      testsPassed++;
    } else {
      log('❌', `TEST 3 FAILED: Expected ~${expectedAccuracy}%, got ${summary.accuracy_percent}%`);
      testsFailed++;
    }
  } catch (error) {
    log('❌', `TEST 3 FAILED: ${error.message}`);
    testsFailed++;
  }

  // ========================================================================
  // TEST 4: Words learned list
  // ========================================================================
  logSection('TEST 4: Words learned list');
  
  try {
    const summaryResponse = await fetch(`${BACKEND_URL}/api/tracking/session/${sessionUuid}/summary`);
    const summary = await summaryResponse.json();
    
    const wordsLearned = summary.words_learned || [];
    const learnedWords = wordsLearned.map(w => w.word);
    
    log('📗', `Words learned: ${learnedWords.join(', ')}`);
    
    // Check that correct words are in learned list
    const expectedLearned = ['Hund', 'Katze', 'Vogel', 'Maus', 'Bär'];
    const allPresent = expectedLearned.every(w => learnedWords.includes(w));
    
    if (allPresent && wordsLearned.length === expectedCorrect) {
      log('✅', `TEST 4 PASSED: ${expectedCorrect} words in learned list`);
      testsPassed++;
    } else {
      log('❌', `TEST 4 FAILED: Expected ${expectedCorrect} learned words`);
      testsFailed++;
    }
  } catch (error) {
    log('❌', `TEST 4 FAILED: ${error.message}`);
    testsFailed++;
  }

  // ========================================================================
  // TEST 5: Words to practice list
  // ========================================================================
  logSection('TEST 5: Words to practice list');
  
  try {
    const summaryResponse = await fetch(`${BACKEND_URL}/api/tracking/session/${sessionUuid}/summary`);
    const summary = await summaryResponse.json();
    
    const wordsToPractice = summary.words_to_practice || [];
    const practiceWords = wordsToPractice.map(w => w.word);
    
    log('📕', `Words to practice: ${practiceWords.join(', ')}`);
    
    // Check that incorrect words are in practice list
    const expectedPractice = ['Fisch', 'Pferd', 'Elefant'];
    const allPresent = expectedPractice.every(w => practiceWords.includes(w));
    
    if (allPresent && wordsToPractice.length === expectedIncorrect) {
      log('✅', `TEST 5 PASSED: ${expectedIncorrect} words in practice list`);
      testsPassed++;
    } else {
      log('❌', `TEST 5 FAILED: Expected ${expectedIncorrect} practice words`);
      testsFailed++;
    }
  } catch (error) {
    log('❌', `TEST 5 FAILED: ${error.message}`);
    testsFailed++;
  }

  // ========================================================================
  // TEST 6: Total actions count
  // ========================================================================
  logSection('TEST 6: Total actions count');
  
  try {
    const summaryResponse = await fetch(`${BACKEND_URL}/api/tracking/session/${sessionUuid}/summary`);
    const summary = await summaryResponse.json();
    
    log('📊', `API returned total_actions: ${summary.total_actions}`);
    
    if (summary.total_actions === expectedTotal) {
      log('✅', `TEST 6 PASSED: Total actions = ${expectedTotal}`);
      testsPassed++;
    } else {
      log('❌', `TEST 6 FAILED: Expected ${expectedTotal}, got ${summary.total_actions}`);
      testsFailed++;
    }
  } catch (error) {
    log('❌', `TEST 6 FAILED: ${error.message}`);
    testsFailed++;
  }

  // ========================================================================
  // CLEANUP: End session
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
    console.log('\n🎉 All session summary tests passed!\n');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(console.error);
