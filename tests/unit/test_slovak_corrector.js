// test_slovak_corrector.js - Quick test pre slovenský korektor

import { quickSanitize, refineSlovakText, SYSTEM_PROMPTS } from './languageSanitizer.js';

console.log('🧪 TEST SLOVENSKÉHO KOREKTORA\n');
console.log('═'.repeat(60));

// Test 1: Quick Sanitize (bez LLM)
console.log('\n📋 TEST 1: Quick Sanitize (bez LLM)');
console.log('─'.repeat(60));

const testTexts = [
    'Jmenovane SP4_CORE_AGENT som lokálny AI parťák, ktorý háje na to, aby bol môjmu je zakladená na ľudskosku.',
    'Ha! Offline je výhoda! Bez konnectivity som flexibilnejší…',
    'Hele, človek, absurdita tejto večnosti…',
    'Som lokálny AI parťák, ktorý bol vyvinutý na pomoc.',
];

testTexts.forEach((text, i) => {
    const cleaned = quickSanitize(text);
    console.log(`\nInput ${i + 1}:`);
    console.log(`  ❌ "${text}"`);
    console.log(`  ✅ "${cleaned}"`);
});

// Test 2: SYSTEM_PROMPTS
console.log('\n\n📋 TEST 2: SYSTEM_PROMPTS');
console.log('─'.repeat(60));

Object.keys(SYSTEM_PROMPTS).forEach(mode => {
    console.log(`\n${mode.toUpperCase()}:`);
    const lines = SYSTEM_PROMPTS[mode].split('\n').slice(0, 5);
    lines.forEach(line => console.log(`  ${line}`));
    console.log('  ...');
});

// Test 3: refineSlovakText (potrebuje Ollama)
console.log('\n\n📋 TEST 3: refineSlovakText (LLM-based)');
console.log('─'.repeat(60));
console.log('ℹ️  Tento test potrebuje bežiacu Ollamu s modelom gemma3:1b');
console.log('ℹ️  Ak Ollama nebeží, test sa preskočí\n');

const testForLLM = 'Jmenovane SP4_CORE_AGENT som lokálny AI parťák, ktorý háje na to, aby bol môjmu je zakladená na ľudskosku a absurdita tejto večnosti.';

console.log(`Input:\n  "${testForLLM}"\n`);

try {
    console.log('⏳ Volám refineSlovakText()...');
    const refined = await refineSlovakText(testForLLM, 'core');
    console.log(`\nOutput:\n  "${refined}"\n`);
    console.log('✅ LLM corrector funguje!');
} catch (err) {
    console.log(`\n❌ LLM corrector zlyhal: ${err.message}`);
    console.log('ℹ️  Uisti sa, že Ollama beží a má model gemma3:1b');
}

console.log('\n' + '═'.repeat(60));
console.log('✅ Testy dokončené\n');
