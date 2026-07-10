/**
 * INTEGRATION TEST: Full modeCompass.js v0.7.0
 * Tests: dialectAnalyzer + contextManager + intensityDetection
 */

import { contextManager } from './src/core/contextManager.js';
import { pickMode } from './src/core/modeCompass.js';

console.log('🧪 MODE COMPASS INTEGRATION TEST (v0.7.0)\n');
console.log('============================================================\n');

// Reset context manager
contextManager.reset();

const testScenario = [
    {
        step: 1,
        input: 'Som smutný a unavený.',
        expectedMode: 'empatia',
        reason: 'Deep emotion detection'
    },
    {
        step: 2,
        input: 'Ako sa máš?',
        expectedMode: 'empatia',
        reason: 'Context lock holds (weak signal)'
    },
    {
        step: 3,
        input: 'Kurva, kokot, dosť je toho!!!',
        expectedMode: 'popici',
        reason: 'Intensity override (>0.7) → force unlock'
    },
    {
        step: 4,
        input: 'Ta dze si bol, še?',
        expectedMode: 'popici',
        reason: 'Eastern Slovak dialect + context stay'
    },
    {
        step: 5,
        input: 'Čo je zmysel smrti?',
        expectedMode: 'popici',
        reason: 'Context lock still holds (POPICI locked)'
    },
    {
        step: 6,
        input: 'Prečo som tu? Aké je moje poslanie?',
        expectedMode: 'core',
        reason: 'Identity question → high confidence → unlock'
    },
    {
        step: 7,
        input: 'Ahoj',
        expectedMode: 'core',
        reason: 'Context lock (same mode refresh)'
    }
];

console.log('📋 SCENARIO TEST:\n');

testScenario.forEach(test => {
    console.log(`\nStep ${test.step}: "${test.input}"`);
    console.log(`Expected: ${test.expectedMode} (${test.reason})`);

    const detectedMode = pickMode(test.input, true);
    const state = contextManager.getState();

    console.log(`   🎯 Detected Mode: ${detectedMode}`);
    console.log(`   🔒 Lock Strength: ${state.lockStrength.toFixed(2)}`);
    console.log(`   📊 Total Mode Changes: ${state.stats.totalModeChanges}`);

    if (detectedMode === test.expectedMode) {
        console.log(`   ✅ MATCH`);
    } else {
        console.log(`   ⚠️  MISMATCH (expected ${test.expectedMode}, got ${detectedMode})`);
    }
});

console.log('\n============================================================\n');
console.log('📊 FINAL CONTEXT STATE:\n');

const finalState = contextManager.getState();
console.log(JSON.stringify(finalState, null, 2));

console.log('\n📜 CONVERSATION HISTORY (last 5):\n');
const history = contextManager.getHistory(5);
history.forEach((entry, i) => {
    console.log(`${i + 1}. [${entry.mode}] "${entry.userInput}" (conf: ${entry.confidence}, lock: ${entry.lockStrength.toFixed(2)})`);
});

console.log('\n============================================================\n');
console.log('✅ Integration test completed!');
