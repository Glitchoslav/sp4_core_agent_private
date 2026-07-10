// compassTest.js
// 🧪 Test suite pre Mode Compass

import { analyzeMode, isValidMode, normalizeMode, pickMode } from './src/core/modeCompass.js';

console.log('🧭 MODE COMPASS TEST SUITE\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const testCases = [
    // CORE detekcia (priorita #1)
    { input: "Kto je Kefyk?", expected: "core" },
    { input: "Prečo som tu?", expected: "core" },
    { input: "Aké je tvoje poslanie?", expected: "core" },
    { input: "Povedz mi o tvojej identite", expected: "core" },

    // EMPATIA detekcia
    { input: "Prečo láska bolí?", expected: "empatia" },
    { input: "Cítim sa sám", expected: "empatia" },
    { input: "Mám prázdnotu v srdci", expected: "empatia" },
    { input: "Nevládzem túto stratu", expected: "empatia" },

    // POPICI detekcia
    { input: "Oj ty kokot, už toho mám dosť!", expected: "popici" },
    { input: "Nevládzem to, idem to vzdať", expected: "popici" },
    { input: "Prečo sú ľudia kokoti?", expected: "popici" },
    { input: "Še neopuščaj bracho", expected: "popici" },

    // GLITCH detekcia
    { input: "Aký je zmysel smrti?", expected: "glitch" },
    { input: "Padám do tmy a neviem sa z ní dostať", expected: "glitch" },
    { input: "Je toto len simulácia?", expected: "glitch" },
    { input: "Stratený som… neviem kam ďalej", expected: "glitch" },

    // HUMAN detekcia (default)
    { input: "Ako nainštalujem Node.js?", expected: "human" },
    { input: "Čo je to API?", expected: "human" },
    { input: "Potrebujem pomoc s kódom", expected: "human" },
    { input: "Dobrý deň, ako sa máš?", expected: "human" }
];

let passed = 0;
let failed = 0;

console.log('📋 Running tests...\n');

testCases.forEach((test, index) => {
    const result = pickMode(test.input);
    const analysis = analyzeMode(test.input);
    const success = result === test.expected;

    if (success) {
        passed++;
        console.log(`✅ Test ${index + 1}: PASSED`);
    } else {
        failed++;
        console.log(`❌ Test ${index + 1}: FAILED`);
        console.log(`   Input: "${test.input}"`);
        console.log(`   Expected: ${test.expected}`);
        console.log(`   Got: ${result}`);
    }
    console.log(`   Reason: ${analysis.reason}\n`);
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`📊 RESULTS: ${passed}/${testCases.length} passed (${failed} failed)\n`);

// Test mode validation
console.log('🔍 Testing mode validation:\n');
console.log(`isValidMode('auto'): ${isValidMode('auto')}`);
console.log(`isValidMode('core'): ${isValidMode('core')}`);
console.log(`isValidMode('empatia'): ${isValidMode('empatia')}`);
console.log(`isValidMode('invalid'): ${isValidMode('invalid')}\n`);

// Test mode normalization
console.log('🔄 Testing mode normalization:\n');
console.log(`normalizeMode('glitchoslav'): ${normalizeMode('glitchoslav')}`);
console.log(`normalizeMode('dusa'): ${normalizeMode('dusa')}`);
console.log(`normalizeMode('popiči'): ${normalizeMode('popiči')}`);
console.log(`normalizeMode('core'): ${normalizeMode('core')}\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎯 Test suite completed!\n');

if (failed === 0) {
    console.log('✨ All tests passed! Mode Compass is ready.\n');
} else {
    console.log(`⚠️  ${failed} tests failed. Review detection patterns.\n`);
}
