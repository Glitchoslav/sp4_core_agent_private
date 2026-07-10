/**
 * 🔥 GPU Agent Test Suite
 * Tests Slovak language quality and SP4 knowledge
 */

import { SP4IntegratedAgent } from './integration.js';

const TEST_QUERIES = [
    // Slovak language tests
    {
        query: "Čo je to umelá inteligencia?",
        expectedMode: "core",
        checkFor: ["slovenčina", "AI", "inteligenci"],
        description: "Slovak language - technical question"
    },
    {
        query: "Prečo ľudia strácajú zmysel v modernom svete?",
        expectedMode: "glitchoslav",
        checkFor: ["existenciál", "zmysel", "svet"],
        description: "Slovak language - existential question"
    },
    {
        query: "Ta bratu, ako mám začať s programovaním?",
        expectedMode: "popici",
        checkFor: ["programova", "začať", "kód"],
        description: "Slovak language - eastern dialect"
    },

    // SP4 knowledge tests
    {
        query: "Čo je SP4? Vysvetli detailne čo to znamená.",
        expectedMode: "core",
        checkFor: ["SP4", "komunita", "AI", "projekt"],
        description: "SP4 knowledge - basic"
    },
    {
        query: "Kto je Kefyk a prečo vytvoril SP4?",
        expectedMode: "core",
        checkFor: ["SP4", "vytvoril", "zakladateľ"],
        description: "SP4 knowledge - founder"
    },
    {
        query: "Aké sú hodnoty SP4 komunity?",
        expectedMode: "core",
        checkFor: ["pravda", "sloboda", "komunita", "hodnot"],
        description: "SP4 knowledge - values"
    },
    {
        query: "Čo znamená 'be real, be free'?",
        expectedMode: "core",
        checkFor: ["skutočn", "slobod", "pravd"],
        description: "SP4 knowledge - motto"
    },

    // Complex reasoning (70B trigger test)
    {
        query: "Vysvetli mi detailne architektúru SP4 agenta, ako presne funguje pamäťový systém, hierarchia modulov, persona routing a ako sa to všetko integruje. Potrebujem hlboké technické pochopenie každého komponentu krok za krokom.",
        expectedMode: "overload",
        checkFor: ["architektúr", "pamäť", "modul", "persona"],
        description: "Overload test - complex architecture question (should trigger 70B)"
    }
];

async function runTests() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔥 SP4 GPU AGENT - TEST SUITE');
    console.log('Testing: Slovak language quality + SP4 knowledge');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    let passCount = 0;
    let failCount = 0;

    for (let i = 0; i < TEST_QUERIES.length; i++) {
        const test = TEST_QUERIES[i];
        console.log(`\n━━ TEST ${i + 1}/${TEST_QUERIES.length} ━━`);
        console.log(`Query: "${test.query}"`);
        console.log(`Expected mode: ${test.expectedMode}`);
        console.log(`Description: ${test.description}\n`);

        try {
            const response = await agent.ask(test.query);

            console.log(`\n📝 Response (${response.length} chars):`);
            console.log(response);
            console.log('\n');

            // Check Slovak language
            const hasSlovakChars = /[áäčďéíĺľňóôŕšťúýž]/i.test(response);
            const hasEnglishLeak = /\b(the|and|of|to|in|is|that|with|for|as|on|be|are)\b/gi;
            const englishMatches = (response.match(hasEnglishLeak) || []).length;
            const wordCount = response.split(/\s+/).length;
            const englishRatio = englishMatches / wordCount;

            console.log(`📊 Quality metrics:`);
            console.log(`   Slovak diacritics: ${hasSlovakChars ? '✅' : '❌'}`);
            console.log(`   English leak: ${englishRatio > 0.3 ? '❌' : '✅'} (${(englishRatio * 100).toFixed(1)}% EN words)`);
            console.log(`   Length: ${response.length} chars, ${wordCount} words`);

            // Check keywords
            const keywordMatches = test.checkFor.filter(keyword =>
                new RegExp(keyword, 'i').test(response)
            );
            console.log(`   Keywords found: ${keywordMatches.length}/${test.checkFor.length} (${keywordMatches.join(', ')})`);

            // Pass/fail
            const isPassed = hasSlovakChars && englishRatio < 0.3 && keywordMatches.length >= Math.ceil(test.checkFor.length / 2);

            if (isPassed) {
                console.log(`\n✅ PASS`);
                passCount++;
            } else {
                console.log(`\n❌ FAIL`);
                failCount++;
            }

        } catch (error) {
            console.log(`\n❌ ERROR: ${error.message}`);
            failCount++;
        }

        // Pause between tests
        if (i < TEST_QUERIES.length - 1) {
            console.log('\n⏸️  Pause 2s...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎯 RESULTS: ${passCount}/${TEST_QUERIES.length} passed (${Math.round(passCount / TEST_QUERIES.length * 100)}%)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (passCount === TEST_QUERIES.length) {
        console.log('🎉 ALL TESTS PASSED! GPU agent working perfectly.\n');
        process.exit(0);
    } else {
        console.log(`⚠️  ${failCount} test(s) failed. Review Slovak quality and SP4 knowledge.\n`);
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('❌ Test suite crashed:', error);
    process.exit(1);
});
