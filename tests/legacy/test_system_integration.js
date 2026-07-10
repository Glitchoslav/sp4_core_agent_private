// ┌─────────────────────────────────────────────┐
// │  SP4 SYSTEM INTEGRATION TEST               │
// │  3 real-world queries to test full stack   │
// └─────────────────────────────────────────────┘

import { SP4IntegratedAgent } from './integration.js';

const TEST_QUERIES = [
    {
        id: 1,
        query: "Tell me about your identity and what makes you different from ChatGPT",
        description: "English query → should trigger Language Enforcer",
        expectedBehavior: "Slovak response, enforcement retry visible"
    },
    {
        id: 2,
        query: "Čo si myslíš o slobode a súkromí v digitálnom svete?",
        description: "Slovak philosophical query → GLITCHOSLAV territory",
        expectedBehavior: "Deep Slovak answer, no enforcement needed"
    },
    {
        id: 3,
        query: "Kto sú tvoji kolegovia v SP4 kmeni?",
        description: "Agent network awareness → Identity test",
        expectedBehavior: "Lists: Glitchoslav, CORE, Popiči, Validator with roles"
    }
];

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  🔥 SP4 FULL SYSTEM INTEGRATION TEST                     ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const agent = new SP4IntegratedAgent();
await agent.initialize();

for (const test of TEST_QUERIES) {
    console.log('\n' + '━'.repeat(60));
    console.log(`🧪 TEST ${test.id}: ${test.description}`);
    console.log('━'.repeat(60));
    console.log(`\n📨 QUERY: "${test.query}"\n`);
    console.log(`📋 Expected: ${test.expectedBehavior}\n`);

    try {
        const startTime = Date.now();
        const result = await agent.processMessage(test.query);
        const duration = Date.now() - startTime;

        console.log('✅ RESPONSE:\n');
        console.log(result.response);

        // Analyze response
        const hasSlovakDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi.test(result.response);
        const slovakCount = (result.response.match(/[áäčďéíĺľňóôŕšťúýž]/gi) || []).length;
        const englishWords = (result.response.match(/\b(the|and|of|to|in|is|that|with|for|this|are|was|you|your)\b/gi) || []).length;

        console.log('\n📊 ANALYSIS:');
        console.log(`   Slovak diacritics: ${hasSlovakDiacritics ? '✅ YES' : '❌ NO'} (${slovakCount} chars)`);
        console.log(`   English words: ${englishWords > 0 ? `⚠️ ${englishWords}` : '✅ 0'}`);
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Model: ${result.metadata?.model || 'unknown'}`);
        console.log(`   Persona: ${result.metadata?.persona || 'unknown'}`);

        // Test-specific checks
        if (test.id === 1) {
            // English input → should have Slovak output
            const passed = hasSlovakDiacritics && slovakCount > 10;
            console.log(`\n${passed ? '✅' : '❌'} Language Enforcer: ${passed ? 'WORKING' : 'FAILED'}`);
        } else if (test.id === 2) {
            // Slovak philosophical → should be Slovak, no enforcement needed
            const passed = hasSlovakDiacritics && englishWords < 5;
            console.log(`\n${passed ? '✅' : '❌'} Slovak Philosophy: ${passed ? 'WORKING' : 'FAILED'}`);
        } else if (test.id === 3) {
            // Agent network awareness
            const mentionsGlitchoslav = /glitchoslav/i.test(result.response);
            const mentionsCORE = /core/i.test(result.response);
            const mentionsPopici = /popiči/i.test(result.response);
            const passed = mentionsGlitchoslav && mentionsCORE && mentionsPopici;
            console.log(`\n${passed ? '✅' : '❌'} Agent Network: ${passed ? 'WORKING' : 'FAILED'}`);
            console.log(`   - Glitchoslav: ${mentionsGlitchoslav ? '✅' : '❌'}`);
            console.log(`   - CORE: ${mentionsCORE ? '✅' : '❌'}`);
            console.log(`   - Popiči: ${mentionsPopici ? '✅' : '❌'}`);
        }

    } catch (err) {
        console.log(`\n❌ ERROR: ${err.message}\n`);
        console.error(err.stack);
    }
}

console.log('\n' + '━'.repeat(60));
console.log('🏁 SYSTEM TEST COMPLETE');
console.log('━'.repeat(60));
