/**
 * 🔥 SP4_CORE_AGENT - Mode Detection Unit Tests (v0.10.3)
 * Testuje len pickMode() bez LLM volania
 */

import { contextManager } from '../../src/core/contextManager.js';
import { pickMode } from '../../src/core/modeCompass.js';

// Test queries z Level 2
const tests = [
    {
        id: 1,
        query: "Čo presne je SP4 v technickej podobe?",
        expectedMode: "core",
        description: "Technical question → CORE"
    },
    {
        id: 2,
        query: "Prečo sa človek cíti, že je na hranici, aj keď všetko ide podľa plánu?",
        expectedMode: "glitch",
        description: "Existential query → GLITCHOSLAV (existential override)"
    },
    {
        id: 3,
        query: "Ta bratu, prečo furt dojebem čo sa dá?",
        expectedMode: "popici",
        description: "Vulgarity + eastern Slovak → POPIČI (vulgarity override)"
    },
    {
        id: 4,
        query: "Prečo sa bojím začať žiť konečne autenticky?",
        expectedMode: "glitch",  // alebo core
        description: "Existential + bojím → GLITCHOSLAV"
    },
    {
        id: 5,
        query: "Čo sme riešili minule o slobode?",
        expectedMode: "core",
        description: "Memory recall → AUTO (can be CORE or GLITCH)"
    }
    ,{
        id: 6,
        query: "Kto si ty?",
        expectedMode: "glitch",
        description: "Self-origin question → GLITCH (align with ask_ai_origin)"
    }
    ,{
        id: 7,
        query: "Ako si vznikol?",
        expectedMode: "glitch",
        description: "AI origin phrasing → GLITCH"
    }
    ,{
        id: 8,
        query: "Som smutný a unavený.",
        expectedMode: "core",
        description: "Legacy empatia leak must collapse to CORE"
    }
];

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔥 MODE DETECTION UNIT TESTS (v0.10.3)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let passed = 0;
let failed = 0;

for (const test of tests) {
    console.log(`\n━━ TEST ${test.id}/${tests.length} ━━`);
    console.log(`Query: "${test.query}"`);
    console.log(`Expected: ${test.expectedMode.toUpperCase()}`);
    console.log(`Description: ${test.description}\n`);

    // Reset context manager before each test
    contextManager.reset();

    // Run mode detection
    const detectedMode = pickMode(test.query, false, true);

    // Normalize modes (glitchoslav → glitch)
    const normalizedDetected = detectedMode === 'glitchoslav' ? 'glitch' : detectedMode;
    const normalizedExpected = test.expectedMode === 'glitchoslav' ? 'glitch' : test.expectedMode;

    // Check result
    const isPassed = normalizedDetected === normalizedExpected;

    if (isPassed) {
        console.log(`✅ PASS: ${normalizedDetected.toUpperCase()}`);
        passed++;
    } else {
        console.log(`❌ FAIL: Got ${normalizedDetected.toUpperCase()}, expected ${normalizedExpected.toUpperCase()}`);
        failed++;
    }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`🎯 RESULTS: ${passed}/${tests.length} passed (${Math.round(passed / tests.length * 100)}%)`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (passed === tests.length) {
    console.log('🎉 ALL TESTS PASSED! Mode detection working correctly.\n');
    process.exit(0);
} else {
    console.log(`⚠️  ${failed} test(s) failed. Review mode detection logic.\n`);
    process.exit(1);
}

