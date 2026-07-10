// dialectAnalyzerTest.js
// Test suite for BAD Labs Dialect Analyzer
// SP4_CORE_AGENT v0.7.0

import { DialectAnalyzer, detectEasternSlovak } from './src/core/dialectAnalyzer.js';

console.log('🧪 DIALECT ANALYZER TEST SUITE\n');
console.log('='.repeat(60));

// Test cases
const testCases = [
    {
        name: 'Pure Eastern Slovak',
        text: 'Šak ta vidiš, bo to furt tak je. Hutori dzeci popiči.',
        expected: { dialect: 'strong', confidence: '> 0.7' }
    },
    {
        name: 'Mixed Eastern Slovak',
        text: 'No še, ta jak to má byť? Bo ja neviem.',
        expected: { dialect: 'moderate', confidence: '> 0.5' }
    },
    {
        name: 'Mild Eastern Slovak',
        text: 'Ta dze si bol? Popiči to bolo!',
        expected: { dialect: 'mild', confidence: '> 0.3' }
    },
    {
        name: 'Standard Slovak',
        text: 'Kde si bol? To bolo super!',
        expected: { dialect: 'none', confidence: '< 0.3' }
    },
    {
        name: 'Phrase Patterns',
        text: 'Hej ta, bo furt to isté. No še.',
        expected: { dialect: 'strong', confidence: '> 0.6' }
    },
    {
        name: 'Phonetic Patterns',
        text: 'Dzeci idze do školy, dzevča ňe.',
        expected: { dialect: 'moderate', confidence: '> 0.4' }
    },
    {
        name: 'Lexical Only',
        text: 'Šicko je furt to isté, jak to má byť?',
        expected: { dialect: 'moderate', confidence: '> 0.4' }
    },
    {
        name: 'Empty String',
        text: '',
        expected: { dialect: 'none', confidence: '0' }
    }
];

// Run tests
console.log('\n📊 TEST RESULTS:\n');

testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`Input: "${testCase.text}"`);

    const result = detectEasternSlovak(testCase.text);

    console.log(`Result:`);
    console.log(`  ✓ Detected: ${result.isEasternSlovak ? 'YES' : 'NO'}`);
    console.log(`  ✓ Score: ${result.score.toFixed(3)}`);
    console.log(`  ✓ Confidence: ${result.confidence.toFixed(3)}`);
    console.log(`  ✓ Dialect Level: ${result.dialectLevel}`);
    console.log(`  ✓ Matched Patterns: ${result.matchedPatterns.length}`);

    if (result.matchedPatterns.length > 0) {
        console.log(`  ✓ Top Patterns:`);
        result.matchedPatterns.slice(0, 3).forEach(p => {
            console.log(`    - ${p.type}: "${p.pattern}" (${p.count}x, weight: ${p.weight.toFixed(2)})`);
        });
    }

    console.log('');
});

console.log('='.repeat(60));

// Test pattern learning
console.log('\n🎓 PATTERN LEARNING TEST:\n');

const analyzer = new DialectAnalyzer();

console.log('Before learning:');
console.log(analyzer.getStats());

// Analyze multiple texts to trigger learning
const learningTexts = [
    'Šak ta vidiš, bo to furt tak je.',
    'No še, ta jak to má byť?',
    'Hutori dzeci popiči tam dze.',
    'Bo furt to isté, šicko ako vždy.'
];

learningTexts.forEach(text => {
    analyzer.analyze(text);
});

console.log('\nAfter learning:');
console.log(analyzer.getStats());

console.log('\n✅ All tests completed!');
