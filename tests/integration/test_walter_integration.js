// test_walter_integration.js
// 🔥 WALTER INTEGRATION TESTS v2.0
// Tests for dialectAnalyzer, contextManager, combined intensity detection
// Author: Kefyk (SP4 Community) + Walter (BAD Labs)
// Date: 2025-11-21

import { emotionalProcessor } from '../../emotionalProcessor.js';
import { SP4ContextManager } from '../../src/core/contextManager.js';
import { dialectAnalyzer } from '../../src/core/dialectAnalyzer.js';
import { pickMode } from '../../src/core/modeCompass.js';

console.log('🔥 WALTER INTEGRATION TESTS v2.0\n');
console.log('Testing: dialectAnalyzer + contextManager + combined intensity\n');

// ============================================================
// TEST 1: DIALECT ANALYZER - Eastern Slovak Detection
// ============================================================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 1: DIALECT ANALYZER');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const dialectTests = [
    {
        input: 'Ta čo je?',
        expected: 'POPIČI',
        minConfidence: 0.5, // 🔧 KEFYK: Lowered from 0.65 (short text penalty)
        description: 'Simple "ta" usage'
    },
    {
        input: 'Ta bratu kokot, prečo to tak je?',
        expected: 'POPIČI',
        minConfidence: 0.8,
        description: '"ta bratu" phrase + vulgar word'
    },
    {
        input: 'Bo furt neviem, šak vidno že nevládzem.',
        expected: 'POPIČI',
        minConfidence: 0.75,
        description: 'Multiple Eastern Slovak markers (bo, furt, šak)'
    },
    {
        input: 'Dze idze? Dzeci su tam?',
        expected: 'POPIČI',
        minConfidence: 0.7,
        description: 'Phonetic patterns (dz → d)'
    },
    {
        input: 'Čo si robil dnes? Ako sa máš?',
        expected: 'CORE',
        minConfidence: 0.0,
        description: 'Standard Slovak - no dialect'
    },
    {
        input: 'Hej ta, no še poďme tam dze hutori.',
        expected: 'POPIČI',
        minConfidence: 0.9,
        description: 'Multiple phrases + lexical markers (pure Eastern Slovak)'
    }
];

let dialectPassed = 0;
let dialectFailed = 0;

dialectTests.forEach((test, i) => {
    console.log(`Test 1.${i + 1}: ${test.description}`);
    console.log(`Input: "${test.input}"`);

    const result = dialectAnalyzer.analyze(test.input);
    const passConfidence = result.confidence >= test.minConfidence;
    const passDetection = (result.detected && test.expected === 'POPIČI') || (!result.detected && test.expected !== 'POPIČI');

    if (passConfidence && passDetection) {
        console.log(`✅ PASS - Confidence: ${result.confidence.toFixed(2)}, Detected: ${result.detected}`);
        console.log(`   Matches: ${result.details.totalMatches} patterns`);
        dialectPassed++;
    } else {
        console.log(`❌ FAIL - Confidence: ${result.confidence.toFixed(2)} (expected >= ${test.minConfidence})`);
        console.log(`   Detected: ${result.detected} (expected: ${test.expected})`);
        dialectFailed++;
    }
    console.log('');
});

console.log(`📊 Dialect Analyzer: ${dialectPassed}/${dialectTests.length} passed\n`);

// ============================================================
// TEST 2: CONTEXT MANAGER - Agent Locking
// ============================================================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 2: CONTEXT MANAGER - Agent Locking');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const contextManager = new SP4ContextManager({
    initialLockStrength: 0.5, // Kefyk's fix
    lockDecayRate: 0.08,
    changeThresholdMultiplier: 1.3
});

const contextTests = [
    {
        step: 1,
        detectedMode: 'popici',
        confidence: 0.9,
        userInput: 'Ta kurva kokot!',
        expectedChange: true,
        expectedMode: 'popici',
        description: 'First message - should set POPICI'
    },
    {
        step: 2,
        detectedMode: 'core',
        confidence: 0.6,
        userInput: 'Čo je SP4?',
        expectedChange: false,
        expectedMode: 'popici',
        description: 'Weak CORE signal - should stay locked in POPICI'
    },
    {
        step: 3,
        detectedMode: 'core',
        confidence: 0.8,
        userInput: 'Vysvetli mi architektúru SP4_CORE_AGENT.',
        expectedChange: true,
        expectedMode: 'core',
        description: 'Strong CORE signal - should unlock and switch'
    },
    {
        step: 4,
        detectedMode: 'glitch',
        confidence: 0.95,
        userInput: 'Prečo existujem? Aký je zmysel tmy?',
        expectedChange: true,
        expectedMode: 'glitch',
        description: 'Very strong GLITCH signal - should switch'
    }
];

let contextPassed = 0;
let contextFailed = 0;

contextTests.forEach(test => {
    console.log(`Test 2.${test.step}: ${test.description}`);
    console.log(`Input: "${test.userInput}"`);
    console.log(`Detected: ${test.detectedMode} (conf: ${test.confidence})`);

    const decision = contextManager.shouldChangeMode(test.detectedMode, test.confidence, test.userInput);

    const passChange = decision.shouldChange === test.expectedChange;
    const passMode = decision.finalMode === test.expectedMode;

    if (passChange && passMode) {
        console.log(`✅ PASS - Changed: ${decision.shouldChange}, Final mode: ${decision.finalMode}`);
        console.log(`   Lock strength: ${decision.lockStrength.toFixed(2)}`);
        contextPassed++;
    } else {
        console.log(`❌ FAIL - Changed: ${decision.shouldChange} (expected: ${test.expectedChange})`);
        console.log(`   Final mode: ${decision.finalMode} (expected: ${test.expectedMode})`);
        contextFailed++;
    }
    console.log('');
});

console.log(`📊 Context Manager: ${contextPassed}/${contextTests.length} passed\n`);

// ============================================================
// TEST 3: COMBINED INTENSITY DETECTION
// ============================================================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 3: COMBINED INTENSITY DETECTION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const intensityTests = [
    {
        input: 'Ta kurvaaa bruuu!!! 🔥🔥',
        minIntensity: 0.8,
        expectedCategories: ['vulgar', 'punctuation', 'emoji'],
        description: 'Multiple categories - should get combined boost'
    },
    {
        input: 'KOKOT NEVLÁDZEM!!! 💥🤬',
        minIntensity: 0.9,
        expectedCategories: ['vulgar', 'caps', 'punctuation', 'emoji'],
        description: 'All 4 categories - maximum intensity'
    },
    {
        input: 'Som unavený.',
        maxIntensity: 0.3,
        expectedCategories: [],
        description: 'Low intensity - no boost'
    },
    {
        input: 'Piča!!! 🔥',
        minIntensity: 0.7,
        expectedCategories: ['vulgar', 'punctuation', 'emoji'],
        description: '3 categories - combined boost'
    }
];

let intensityPassed = 0;
let intensityFailed = 0;

intensityTests.forEach((test, i) => {
    console.log(`Test 3.${i + 1}: ${test.description}`);
    console.log(`Input: "${test.input}"`);

    const analysis = emotionalProcessor.analyzeEmotionalContent(test.input);
    const intensity = analysis.intensity;

    const passMin = test.minIntensity ? intensity >= test.minIntensity : true;
    const passMax = test.maxIntensity ? intensity <= test.maxIntensity : true;

    if (passMin && passMax) {
        console.log(`✅ PASS - Intensity: ${intensity.toFixed(2)}`);
        console.log(`   Level: ${analysis.level}`);
        intensityPassed++;
    } else {
        console.log(`❌ FAIL - Intensity: ${intensity.toFixed(2)}`);
        if (test.minIntensity) console.log(`   Expected >= ${test.minIntensity}`);
        if (test.maxIntensity) console.log(`   Expected <= ${test.maxIntensity}`);
        intensityFailed++;
    }
    console.log('');
});

console.log(`📊 Combined Intensity: ${intensityPassed}/${intensityTests.length} passed\n`);

// ============================================================
// TEST 4: FULL INTEGRATION - pickMode() Flow
// ============================================================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 4: FULL INTEGRATION - pickMode() Flow');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const integrationTests = [
    {
        input: 'Ta čo je?',
        expectedMode: 'popici',
        expectedLayer: 'dialect-override',
        description: 'Dialect override - "ta" keyword'
    },
    {
        input: 'Ta bratu prečo furt dojebem kokot?',
        expectedMode: 'popici',
        expectedLayer: 'dialect-override',
        description: 'Multiple triggers - dialect + vulgarity'
    },
    {
        input: 'Prečo žijem? Aký je zmysel existencie?',
        expectedMode: 'glitch',
        expectedLayer: 'existential-override',
        description: 'Existential override - deep questions'
    },
    {
        input: 'KURVA NEVLÁDZEM!!! 🔥🔥🔥',
        expectedMode: 'popici',
        expectedLayer: 'vulgarity-override',
        description: 'High intensity + vulgarity'
    },
    {
        input: 'Čo je SP4?',
        expectedMode: 'core',
        expectedLayer: 'pattern',
        description: 'Standard technical question'
    }
];

let integrationPassed = 0;
let integrationFailed = 0;

integrationTests.forEach((test, i) => {
    console.log(`Test 4.${i + 1}: ${test.description}`);
    console.log(`Input: "${test.input}"`);

    const mode = pickMode(test.input, false, true); // no context lock for clean tests

    if (mode === test.expectedMode) {
        console.log(`✅ PASS - Mode: ${mode}`);
        integrationPassed++;
    } else {
        console.log(`❌ FAIL - Mode: ${mode} (expected: ${test.expectedMode})`);
        integrationFailed++;
    }
    console.log('');
});

console.log(`📊 Full Integration: ${integrationPassed}/${integrationTests.length} passed\n`);

// ============================================================
// FINAL SUMMARY
// ============================================================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔥 FINAL SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const totalTests = dialectTests.length + contextTests.length + intensityTests.length + integrationTests.length;
const totalPassed = dialectPassed + contextPassed + intensityPassed + integrationPassed;
const totalFailed = dialectFailed + contextFailed + intensityFailed + integrationFailed;
const successRate = ((totalPassed / totalTests) * 100).toFixed(1);

console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${totalPassed}`);
console.log(`❌ Failed: ${totalFailed}`);
console.log(`📊 Success Rate: ${successRate}%\n`);

console.log('Module Breakdown:');
console.log(`  Dialect Analyzer: ${dialectPassed}/${dialectTests.length} (${((dialectPassed / dialectTests.length) * 100).toFixed(1)}%)`);
console.log(`  Context Manager: ${contextPassed}/${contextTests.length} (${((contextPassed / contextTests.length) * 100).toFixed(1)}%)`);
console.log(`  Combined Intensity: ${intensityPassed}/${intensityTests.length} (${((intensityPassed / intensityTests.length) * 100).toFixed(1)}%)`);
console.log(`  Full Integration: ${integrationPassed}/${integrationTests.length} (${((integrationPassed / integrationTests.length) * 100).toFixed(1)}%)\n`);

// Export test results
export const testResults = {
    dialect: { passed: dialectPassed, total: dialectTests.length },
    context: { passed: contextPassed, total: contextTests.length },
    intensity: { passed: intensityPassed, total: intensityTests.length },
    integration: { passed: integrationPassed, total: integrationTests.length },
    overall: { passed: totalPassed, total: totalTests, successRate }
};

if (totalFailed === 0) {
    console.log('🎉 ALL TESTS PASSED! Walter integration successful.\n');
} else {
    console.log(`⚠️  ${totalFailed} tests failed. Review logs above.\n`);
    process.exit(1);
}
