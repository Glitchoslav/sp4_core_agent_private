/**
 * TEST SUITE: Intensity Detection (emotionalProcessor.js v0.7.0)
 * BAD Labs Integration - Enhanced detection
 */

import { EmotionalProcessor } from './src/core/emotionalProcessor.js';

console.log('🧪 INTENSITY DETECTION TEST SUITE (v0.7.0)\n');
console.log('============================================================\n');

const processor = new EmotionalProcessor();

const testCases = [
    {
        name: 'Neutral baseline',
        text: 'Dnes je pekný deň.',
        expectedLevel: 'MINIMAL',
        expectedIntensity: '<0.3'
    },
    {
        name: 'Vulgar words (single)',
        text: 'Toto ma sere.',
        expectedLevel: 'LOW-MEDIUM',
        expectedIntensity: '0.2-0.4'
    },
    {
        name: 'Vulgar words (multiple)',
        text: 'Kurva, kokot, piča! Toto je jebnuté!',
        expectedLevel: 'HIGH',
        expectedIntensity: '>0.7'
    },
    {
        name: 'Punctuation repetition',
        text: 'Čo to má byť?!?!?! Prečo!!!',
        expectedLevel: 'MEDIUM-HIGH',
        expectedIntensity: '0.5-0.7'
    },
    {
        name: 'Emoji intensity',
        text: 'To ma wkuruje 🔥💥🤬😡',
        expectedLevel: 'MEDIUM-HIGH',
        expectedIntensity: '0.5-0.8'
    },
    {
        name: 'CAPS shouting',
        text: 'KURVA! DOSŤ JE TOHO!!!',
        expectedLevel: 'HIGH-CRITICAL',
        expectedIntensity: '>0.8'
    },
    {
        name: 'Combined (vulgar + punctuation + emoji)',
        text: 'Do piče!!!!! Kokot jeden!!! 🤬🔥💥',
        expectedLevel: 'CRITICAL',
        expectedIntensity: '>0.9'
    },
    {
        name: 'Deep emotion (trauma)',
        text: 'Mám traumu z detstva, už nevládzem.',
        expectedLevel: 'MEDIUM',
        expectedIntensity: '0.4-0.6',
        expectedTag: 'trauma'
    },
    {
        name: 'Deep emotion (grief)',
        text: 'Zomrel mi otec. Neviem, ako ďalej.',
        expectedLevel: 'MEDIUM',
        expectedIntensity: '0.3-0.5',
        expectedTag: 'grief'
    },
    {
        name: 'Deep emotion (empty)',
        text: 'Cítim sa prázdny. Všetko nemá zmysel.',
        expectedLevel: 'MEDIUM',
        expectedIntensity: '0.3-0.5',
        expectedTag: 'empty'
    },
    {
        name: 'Eastern Slovak + vulgar',
        text: 'Ta dze si, kokot jeden?! Popiči to!',
        expectedLevel: 'HIGH',
        expectedIntensity: '>0.6'
    },
    {
        name: 'Soft expression',
        text: 'Mám strach, ale snažím sa.',
        expectedLevel: 'LOW',
        expectedIntensity: '<0.4'
    }
];

console.log('📊 TEST RESULTS:\n');

testCases.forEach((test, i) => {
    console.log(`Test ${i + 1}: ${test.name}`);
    console.log(`Input: "${test.text}"`);

    const analysis = processor.analyzeEmotionalContent(test.text);

    console.log(`   ⚡ Intensity: ${analysis.intensity.toFixed(3)} (${analysis.level})`);
    console.log(`   🏷️  Emotional Tag: ${analysis.emotionalTag}`);
    console.log(`   🎯 Action: ${analysis.action}`);

    if (analysis.shouldGround) {
        console.log(`   🛑 Grounding recommended`);
    }

    if (test.expectedTag) {
        if (analysis.emotionalTag === test.expectedTag) {
            console.log(`   ✅ Tag match: ${test.expectedTag}`);
        } else {
            console.log(`   ⚠️  Tag mismatch: expected ${test.expectedTag}, got ${analysis.emotionalTag}`);
        }
    }

    console.log(`   Expected: ${test.expectedIntensity} (${test.expectedLevel})\n`);
});

console.log('============================================================\n');
console.log('🔥 INTENSITY THRESHOLD TEST:\n');

const thresholdTests = [
    { text: 'Ahoj', expected: '<0.3 (no mode force)' },
    { text: 'Kokot jeden!', expected: '0.3-0.7 (monitor)' },
    { text: 'Kurva kokot piča!!!', expected: '>0.7 (force POPICI)' }
];

thresholdTests.forEach(test => {
    const analysis = processor.analyzeEmotionalContent(test.text);
    const forceMode = analysis.intensity > 0.7 ? '→ FORCE POPICI' : '→ normal routing';

    console.log(`"${test.text}"`);
    console.log(`   Intensity: ${analysis.intensity.toFixed(3)} ${forceMode}`);
    console.log(`   Expected: ${test.expected}\n`);
});

console.log('============================================================\n');
console.log('📊 FINAL PROCESSOR STATE:\n');
console.log(JSON.stringify(processor.getState(), null, 2));

console.log('\n✅ All intensity detection tests completed!');
