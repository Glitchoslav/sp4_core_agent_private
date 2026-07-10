/**
 * 🧪 ACTION LAYER BASIC TEST
 * 
 * Tests:
 * 1. Action extraction from LLM response
 * 2. Permission validation
 * 3. Action execution (SAVE_SNIPPET, NOTE_MEMORY, DEBUG_LOG)
 * 
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-22
 */

import { ACTION_TYPES } from '../src/core/actionRegistry.js';
import { executeAction, extractActionsFromResponse, processResponseActions, validateAction } from '../src/core/actionRouter.js';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 SP4 ACTION LAYER BASIC TEST');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Action extraction
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎯 Test 1: Action Extraction from LLM Response');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const mockResponse1 = `
Toto je zaujímavý nápad, zapíšem si to.

{"action":"SAVE_SNIPPET","title":"SP4 idea","content":"Lokálny AI agent pre offline použitie"}

Hotovo, uložené!
`;

const mockResponse2 = `
Dôležité: zapíšem si túto poznámku.

\`\`\`json
{"type":"NOTE_MEMORY","content":"Kefyk chce pridať action layer","importance":8}
\`\`\`
`;

console.log('   Mock response 1 (inline JSON):');
console.log(`   ${mockResponse1.substring(0, 100)}...`);

const extracted1 = extractActionsFromResponse(mockResponse1);
console.log(`\n   ✅ Extracted ${extracted1.length} action(s):`);
extracted1.forEach((action, i) => {
    console.log(`      ${i + 1}. ${action.type} - ${Object.keys(action.payload).join(', ')}`);
});

console.log('\n   Mock response 2 (code fence):');
console.log(`   ${mockResponse2.substring(0, 100)}...`);

const extracted2 = extractActionsFromResponse(mockResponse2);
console.log(`\n   ✅ Extracted ${extracted2.length} action(s):`);
extracted2.forEach((action, i) => {
    console.log(`      ${i + 1}. ${action.type} - ${Object.keys(action.payload).join(', ')}`);
});

// Test 2: Permission validation
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔒 Test 2: Permission Validation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const testCases = [
    {
        action: { type: ACTION_TYPES.SAVE_SNIPPET, payload: { title: 'Test', content: 'Test content' } },
        persona: 'core',
        expectedValid: true,
        description: 'CORE can save snippets'
    },
    {
        action: { type: ACTION_TYPES.OPEN_URL, payload: { url: 'https://example.com' } },
        persona: 'popici',
        expectedValid: false,
        description: 'POPIČI cannot open URLs'
    },
    {
        action: { type: ACTION_TYPES.NOTE_MEMORY, payload: { content: 'Important note' } },
        persona: 'glitchoslav',
        expectedValid: true,
        description: 'GLITCHOSLAV can add memory notes'
    },
    {
        action: { type: ACTION_TYPES.DEBUG_LOG, payload: { message: 'Debug info' } },
        persona: 'validator',
        expectedValid: false,
        description: 'VALIDATOR cannot execute actions'
    }
];

testCases.forEach((test, i) => {
    const validation = validateAction(test.action, test.persona);
    const passed = validation.valid === test.expectedValid;
    const emoji = passed ? '✅' : '❌';

    console.log(`\n   ${emoji} Test ${i + 1}: ${test.description}`);
    console.log(`      Action: ${test.action.type}`);
    console.log(`      Persona: ${test.persona.toUpperCase()}`);
    console.log(`      Expected: ${test.expectedValid ? 'ALLOWED' : 'DENIED'}`);
    console.log(`      Result: ${validation.valid ? 'ALLOWED' : `DENIED (${validation.error})`}`);
});

// Test 3: Action execution
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('⚡ Test 3: Action Execution (Real Operations)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Test 3.1: SAVE_SNIPPET
console.log('\n   🧪 Test 3.1: SAVE_SNIPPET action');
const snippetAction = {
    type: ACTION_TYPES.SAVE_SNIPPET,
    payload: {
        title: 'Action Layer Test Snippet',
        content: 'This is a test snippet created by the action layer test suite.\n\nTimestamp: ' + new Date().toISOString(),
        tags: ['test', 'action-layer', 'v0.11.6'],
        category: 'testing'
    }
};

const snippetResult = await executeAction(snippetAction, {
    persona: 'core',
    userMessage: 'Test snippet creation'
});

if (snippetResult.success) {
    console.log('   ✅ SAVE_SNIPPET executed successfully');
    console.log(`      File: ${snippetResult.result.filename}`);
    console.log(`      Path: ${snippetResult.result.filepath}`);
} else {
    console.log(`   ❌ SAVE_SNIPPET failed: ${snippetResult.error}`);
}

// Test 3.2: NOTE_MEMORY
console.log('\n   🧪 Test 3.2: NOTE_MEMORY action');
const memoryAction = {
    type: ACTION_TYPES.NOTE_MEMORY,
    payload: {
        content: 'Action layer test - v0.11.6-alpha implementation verified',
        importance: 7,
        category: 'development'
    }
};

const memoryResult = await executeAction(memoryAction, {
    persona: 'glitchoslav',
    userMessage: 'Recording action layer milestone'
});

if (memoryResult.success) {
    console.log('   ✅ NOTE_MEMORY executed successfully');
    console.log(`      Timestamp: ${memoryResult.result.timestamp}`);
    console.log(`      Importance: ${memoryResult.result.metadata.importance}/10`);
} else {
    console.log(`   ❌ NOTE_MEMORY failed: ${memoryResult.error}`);
}

// Test 3.3: DEBUG_LOG
console.log('\n   🧪 Test 3.3: DEBUG_LOG action');
const debugAction = {
    type: ACTION_TYPES.DEBUG_LOG,
    payload: {
        message: 'Action layer test completed - all systems operational'
    }
};

const debugResult = await executeAction(debugAction, {
    persona: 'core',
    userMessage: 'Testing debug logger'
});

if (debugResult.success) {
    console.log('   ✅ DEBUG_LOG executed successfully');
} else {
    console.log(`   ❌ DEBUG_LOG failed: ${debugResult.error}`);
}

// Test 4: Full pipeline
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🌊 Test 4: Full Pipeline (Extract → Validate → Execute)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const fullPipelineResponse = `
To je dobrý nápad! Uložím si to ako snippet.

{"action":"SAVE_SNIPPET","title":"Pipeline Test","content":"Testing full action pipeline"}

A tiež si to zapíšem do pamäte.

{"action":"NOTE_MEMORY","content":"Full pipeline test executed successfully","importance":5}
`;

console.log('   Mock LLM response with 2 actions:');
console.log(`   ${fullPipelineResponse.substring(0, 120)}...`);

const pipelineResult = await processResponseActions(fullPipelineResponse, {
    persona: 'core',
    userMessage: 'Test full pipeline'
});

console.log(`\n   📊 Pipeline Results:`);
console.log(`      Actions found: ${pipelineResult.actionsFound}`);
console.log(`      Actions executed: ${pipelineResult.executed}`);
console.log(`      Success rate: ${pipelineResult.executed}/${pipelineResult.actionsFound} (${(pipelineResult.executed / pipelineResult.actionsFound * 100).toFixed(0)}%)`);

pipelineResult.results.forEach((result, i) => {
    const emoji = result.success ? '✅' : '❌';
    console.log(`\n      ${emoji} Action ${i + 1}: ${result.action}`);
    if (result.success) {
        console.log(`         Result: SUCCESS`);
    } else {
        console.log(`         Error: ${result.error}`);
    }
});

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 TEST SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const allTests = [
    { name: 'Action extraction', passed: extracted1.length > 0 && extracted2.length > 0 },
    { name: 'Permission validation', passed: testCases.every(t => (validateAction(t.action, t.persona).valid === t.expectedValid)) },
    { name: 'SAVE_SNIPPET execution', passed: snippetResult.success },
    { name: 'NOTE_MEMORY execution', passed: memoryResult.success },
    { name: 'DEBUG_LOG execution', passed: debugResult.success },
    { name: 'Full pipeline', passed: pipelineResult.executed === pipelineResult.actionsFound }
];

const passedCount = allTests.filter(t => t.passed).length;
const totalCount = allTests.length;

allTests.forEach(test => {
    const emoji = test.passed ? '✅' : '❌';
    console.log(`   ${emoji} ${test.name}`);
});

console.log(`\n   📈 Pass rate: ${passedCount}/${totalCount} (${(passedCount / totalCount * 100).toFixed(0)}%)`);

if (passedCount === totalCount) {
    console.log('\n   🎉 ALL TESTS PASSED - Action Layer is operational!');
} else {
    console.log('\n   ⚠️  SOME TESTS FAILED - Review errors above');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
