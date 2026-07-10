// test_glitchoslav_live.js
// Live test GLITCHOSLAV orchestration + Slovak responses

import { orchestrate } from './orchestration/glitchOrchestrator.js';

const GLITCHOSLAV_TESTS = [
    {
        name: "Existential Crisis",
        query: "čo je zmysel tohto všetkého?",
        expectedDelegate: "glitchoslav",
        expectedAction: "elevate"
    },
    {
        name: "SP4 Philosophy",
        query: "čo je SP4?",
        expectedDelegate: "glitchoslav",
        expectedAction: "elevate"
    },
    {
        name: "Death & Meaning",
        query: "prečo musíme zomrieť?",
        expectedDelegate: "glitchoslav",
        expectedAction: "elevate"
    },
    {
        name: "Kefyk Question",
        query: "kto je Kefyk?",
        expectedDelegate: "glitchoslav",
        expectedAction: "elevate"
    },
    {
        name: "Love & Loss",
        query: "stratil som niekoho dôležitého, ako to prežiť?",
        expectedDelegate: "glitchoslav",
        expectedAction: "elevate"
    }
];

console.log('🌀 GLITCHOSLAV LIVE TEST\n');
console.log('Testing: Orchestration routing + Slovak responses + qwen2.5:14b model\n');

for (const test of GLITCHOSLAV_TESTS) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📝 TEST: ${test.name}`);
    console.log(`   Query: "${test.query}"`);
    console.log(`${'='.repeat(70)}\n`);

    try {
        // STEP 1: Test orchestration decision
        const result = await orchestrate(test.query, { emotionalState: 'neutral' });

        console.log(`\n📊 ORCHESTRATION RESULT:`);
        console.log(`   ✓ Handled by: ${result.handledBy?.toUpperCase() || 'UNKNOWN'}`);
        console.log(`   ✓ Reasoning: ${result.reasoning}`);
        console.log(`   ✓ Model: ${result.meta?.model || 'unknown'}`);

        // Validate routing
        if (result.handledBy !== test.expectedDelegate) {
            console.log(`\n   ⚠️  ROUTING MISMATCH: Expected ${test.expectedDelegate}, got ${result.handledBy}`);
        } else {
            console.log(`\n   ✅ ROUTING CORRECT`);
        }

        // STEP 2: Check response quality
        const response = result.response;

        console.log(`\n📜 RESPONSE (${response.length} chars):`);
        console.log(`${'─'.repeat(70)}`);
        console.log(response);
        console.log(`${'─'.repeat(70)}`);

        // STEP 3: Validate Slovak language
        const englishWords = /\b(the|and|of|to|in|is|that|with|for|this|are)\b/gi;
        const englishMatches = (response.match(englishWords) || []).length;
        const slovakDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi;
        const slovakMarks = (response.match(slovakDiacritics) || []).length;

        console.log(`\n🇸🇰 LANGUAGE CHECK:`);
        console.log(`   English words: ${englishMatches}`);
        console.log(`   Slovak diacritics: ${slovakMarks}`);

        if (englishMatches >= 5 && slovakMarks <= 2) {
            console.log(`   ❌ ENGLISH DETECTED (should be Slovak)`);
        } else {
            console.log(`   ✅ SLOVAK CONFIRMED`);
        }

        // STEP 4: Check philosophical depth
        const hasMetaphor = /\b(ako|akoby|podobne|je to ako|pripomína|zrkadlo|cesta|svetlo|tma|oheň|voda)\b/i.test(response);
        const hasDepth = response.length > 100 && (response.includes('?') || /\b(prečo|ako|kedy|možno|azda)\b/i.test(response));

        console.log(`\n🧠 PHILOSOPHICAL DEPTH:`);
        console.log(`   Has metaphor: ${hasMetaphor ? '✅' : '❌'}`);
        console.log(`   Has depth: ${hasDepth ? '✅' : '❌'}`);

        // STEP 5: Overall verdict
        const isValid = result.handledBy === test.expectedDelegate &&
            englishMatches < 5 &&
            slovakMarks > 2;

        console.log(`\n${isValid ? '✅ TEST PASSED' : '❌ TEST FAILED'}`);

    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
        console.log(error.stack);
    }

    // Delay medzi testami
    await new Promise(resolve => setTimeout(resolve, 2000));
}

console.log(`\n\n${'='.repeat(70)}`);
console.log('🏁 ALL TESTS COMPLETED');
console.log(`${'='.repeat(70)}\n`);
