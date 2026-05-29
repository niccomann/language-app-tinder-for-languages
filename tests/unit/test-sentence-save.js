/**
 * Test: Save Validated Sentence to Grammar Sentences
 * 
 * Verifies that sentences validated in "Componi Frase" are persisted
 * to the grammar_sentences table and appear in Sentence Graph.
 */

const { DEFAULT_BACKEND_URL: API_BASE } = require('../helpers/testUrls');

async function testSaveSentence() {
  console.log('🧪 TEST: Save Validated Sentence\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Save a sentence
  console.log('📍 Test 1: Save sentence via API...');
  try {
    const saveResponse = await fetch(`${API_BASE}/api/grammar/save-sentence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        german: 'Der Hund frisst den Apfel',
        english: 'The dog eats the apple',
        nodes: [
          { id: 'subj_1', label: 'Der Hund', type: 'subject' },
          { id: 'verb_1', label: 'frisst', type: 'predicate' },
          { id: 'obj_1', label: 'den Apfel', type: 'object' }
        ],
        connections: [
          { from_id: 'subj_1', to_id: 'verb_1' },
          { from_id: 'verb_1', to_id: 'obj_1' }
        ],
        difficulty: 'beginner',
        language: 'de'
      })
    });
    
    const saveResult = await saveResponse.json();
    
    if (saveResult.success && saveResult.sentence_id) {
      console.log(`   ✅ Sentence saved with ID: ${saveResult.sentence_id}`);
      console.log(`   📝 ${saveResult.message}`);
      passed++;
    } else {
      console.log(`   ❌ Save failed: ${JSON.stringify(saveResult)}`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    failed++;
  }

  // Test 2: Retrieve sentences
  console.log('\n📍 Test 2: Retrieve sentences from Sentence Graph...');
  try {
    const getResponse = await fetch(`${API_BASE}/api/grammar/sentences`);
    
    if (!getResponse.ok) {
      throw new Error(`HTTP ${getResponse.status}`);
    }
    
    const sentences = await getResponse.json();
    
    if (Array.isArray(sentences) && sentences.length > 0) {
      console.log(`   ✅ Found ${sentences.length} sentence(s) in Sentence Graph`);
      
      const lastSentence = sentences[sentences.length - 1];
      console.log(`   📝 Last sentence: "${lastSentence.german}" → "${lastSentence.english}"`);
      console.log(`   📊 Nodes: ${lastSentence.nodes?.length || 0}, Edges: ${lastSentence.edges?.length || 0}`);
      passed++;
    } else {
      console.log(`   ⚠️  No sentences found (array empty)`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Error retrieving sentences: ${error.message}`);
    failed++;
  }

  // Test 3: Verify persistence (save another and check count increased)
  console.log('\n📍 Test 3: Verify persistence (save second sentence)...');
  try {
    const countBefore = await fetch(`${API_BASE}/api/grammar/sentences`)
      .then(r => r.json())
      .then(arr => arr.length)
      .catch(() => 0);
    
    await fetch(`${API_BASE}/api/grammar/save-sentence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        german: 'Die Katze trinkt Milch',
        english: 'The cat drinks milk',
        nodes: [
          { id: 'subj_2', label: 'Die Katze', type: 'subject' },
          { id: 'verb_2', label: 'trinkt', type: 'predicate' },
          { id: 'obj_2', label: 'Milch', type: 'object' }
        ],
        connections: [
          { from_id: 'subj_2', to_id: 'verb_2' },
          { from_id: 'verb_2', to_id: 'obj_2' }
        ]
      })
    });
    
    const countAfter = await fetch(`${API_BASE}/api/grammar/sentences`)
      .then(r => r.json())
      .then(arr => arr.length)
      .catch(() => 0);
    
    if (countAfter > countBefore) {
      console.log(`   ✅ Persistence verified: ${countBefore} → ${countAfter} sentences`);
      passed++;
    } else {
      console.log(`   ❌ Count did not increase: ${countBefore} → ${countAfter}`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('═══════════════════════════════════════');
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Sentences are persisted correctly.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check backend logs.\n');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

testSaveSentence();
