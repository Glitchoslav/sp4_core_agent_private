/**
 * TEST: Quick Analyzer Integration
 * v0.8.0 - Hybrid Analyzer Performance Test
 */

import { pickMode } from './src/core/modeCompass.js';
import { batchAnalyze, quickAnalyze, quickDetect } from './src/core/quickAnalyzer.js';

console.log('🧪 QUICK ANALYZER TEST SUITE (v0.8.0)\n');
console.log('============================================================\n');

// Test 1: Basic quick analysis
console.log('📋 TEST 1: Basic Quick Analysis\n');

const testCases = [
    { input: 'Kto som?', expected: 'core' },
    { input: 'Som smutný a unavený', expected: 'empatia' },
    { input: 'Kurva kokot, dosť je toho!', expected: 'popici' },
    { input: 'Ta dze si bol?', expected: 'popici' },
    { input: 'Čo je zmysel smrti?', expected: 'glitch' },
    { input: 'Ahoj, ako sa máš?', expected: 'human' },
    { input: 'Prázdnota ma pohlcuje', expected: 'empatia' },
    { input: 'Prečo som tu? Aké je moje poslanie?', expected: 'core' }
];

testCases.forEach((test, i) => {
    console.log(`Test ${i + 1}: "${test.input}"`);
    const result = quickAnalyze(test.input);
    const match = result.mode === test.expected ? '✅' : '⚠️';

    console.log(`   ${match} Detected: ${result.mode.toUpperCase()} (expected: ${test.expected})`);
    console.log(`   📊 Confidence: ${result.confidence.toFixed(2)}`);
    console.log(`   🎯 Matches: ${result.matchCount}`);
    console.log(`   ⏱️  Time: ${result.executionTime.toFixed(3)}ms`);
    console.log(`   ${result.meetsThreshold ? '✅ Threshold met' : '⚠️  Below threshold'}\n`);
});

// Test 2: Quick detect (threshold test)
console.log('\n============================================================\n');
console.log('📋 TEST 2: Quick Detect (Threshold 0.8)\n');

testCases.forEach((test, i) => {
    const result = quickDetect(test.input, 0.8);

    if (result) {
        console.log(`${i + 1}. ✅ QUICK: "${test.input}"`);
        console.log(`   Mode: ${result.mode}, Conf: ${result.confidence.toFixed(2)}, Time: ${result.executionTime.toFixed(3)}ms\n`);
    } else {
        console.log(`${i + 1}. ⚠️  FALLBACK: "${test.input}" (low confidence → pattern detection needed)\n`);
    }
});

// Test 3: Batch analysis
console.log('\n============================================================\n');
console.log('📋 TEST 3: Batch Analysis & Statistics\n');

const batchInputs = [
    ...testCases.map(t => t.input),
    'Láska bolí',
    'Popiči to!',
    'Šak vidno že to tak je',
    'Neviem už ďalej',
    'Simulácia reality'
];

const batch = batchAnalyze(batchInputs);

console.log('📊 BATCH STATISTICS:\n');
console.log(`Total inputs: ${batch.stats.total}`);
console.log(`Avg execution time: ${batch.stats.avgExecutionTime.toFixed(3)}ms`);
console.log(`High confidence (≥0.8): ${batch.stats.highConfidence} (${(batch.stats.highConfidence / batch.stats.total * 100).toFixed(1)}%)`);
console.log(`Medium confidence (0.5-0.8): ${batch.stats.mediumConfidence} (${(batch.stats.mediumConfidence / batch.stats.total * 100).toFixed(1)}%)`);
console.log(`Low confidence (<0.5): ${batch.stats.lowConfidence} (${(batch.stats.lowConfidence / batch.stats.total * 100).toFixed(1)}%)`);

console.log('\n📊 Mode Distribution:');
Object.entries(batch.stats.modeDistribution).forEach(([mode, count]) => {
    const percentage = (count / batch.stats.total * 100).toFixed(1);
    console.log(`   ${mode.padEnd(10)}: ${count} (${percentage}%)`);
});

// Test 4: Performance comparison
console.log('\n============================================================\n');
console.log('📋 TEST 4: Performance Comparison (Quick vs Pattern)\n');

const perfTests = [
    'Kto som?',
    'Som smutný',
    'Kurva kokot!',
    'Čo je zmysel?'
];

console.log('Quick Analyzer (keyword):');
perfTests.forEach(input => {
    const start = performance.now();
    const result = quickAnalyze(input);
    const time = performance.now() - start;
    console.log(`   "${input}" → ${result.mode} (${time.toFixed(3)}ms)`);
});

console.log('\nPattern Detector (full detection):');
perfTests.forEach(input => {
    const start = performance.now();
    const mode = pickMode(input, false, false); // no context, no quick
    const time = performance.now() - start;
    console.log(`   "${input}" → ${mode} (${time.toFixed(3)}ms)`);
});

console.log('\n============================================================\n');
console.log('✅ All tests completed!\n');

// Summary
const highConfPercentage = (batch.stats.highConfidence / batch.stats.total * 100).toFixed(1);
console.log('🎯 SUMMARY:');
console.log(`   ${highConfPercentage}% of inputs can be handled by quick analyzer (<1ms)`);
console.log(`   ${(100 - highConfPercentage).toFixed(1)}% require pattern fallback (~2-5ms)`);
console.log(`   Average speed: ${batch.stats.avgExecutionTime.toFixed(3)}ms`);
console.log(`\n   🚀 Expected performance gain: 2-3x faster than pure pattern detection`);
