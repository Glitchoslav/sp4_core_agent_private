// test_personas_v084.js
// Automated test for persona quality v0.8.4

import { processMessage } from './integration.js';

const TESTS = [
    {
        id: 1,
        mode: 'core',
        input: 'SP4_CORE → vysvetli blockchain',
        expectedConstraints: ['no metaphors', 'technical', 'slovak']
    },
    {
        id: 2,
        mode: 'core',
        input: 'SP4_CORE → čo je token?',
        expectedConstraints: ['no emotions', 'factual', 'no kefyk']
    },
    {
        id: 3,
        mode: 'glitch',
        input: 'Glitchoslav → čo je hranica medzi človekom a strojom?',
        expectedConstraints: ['2-5 sentences', 'symbolic', 'no meta-leak']
    },
    {
        id: 4,
        mode: 'glitch',
        input: 'Glitchoslav → čo je smrť?',
        expectedConstraints: ['poetic', 'metaphorical', 'no technical']
    },
    {
        id: 5,
        mode: 'popici',
        input: 'Popiči → čo si myslíš o developer milestone-och?',
        expectedConstraints: ['eastern slovak slang', 'humor', 'no corporate']
    }
];

async function runTests() {
    console.log('🧪 PERSONA QUALITY TEST v0.8.4\n');
    console.log('═'.repeat(60));

    for (const test of TESTS) {
        console.log(`\n📋 TEST ${test.id}: ${test.mode.toUpperCase()}`);
        console.log(`Query: "${test.input}"`);
        console.log(`Expected: ${test.expectedConstraints.join(', ')}`);
        console.log('─'.repeat(60));

        try {
            const response = await processMessage(test.input, test.mode);

            console.log(`\n✅ RESPONSE:\n${response}\n`);
            console.log('─'.repeat(60));

            // Manual validation prompt
            console.log('❓ Does this response meet constraints? (check logs above)');

        } catch (error) {
            console.error(`❌ TEST ${test.id} FAILED:`, error.message);
        }

        console.log('═'.repeat(60));

        // Wait 2 seconds between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n✨ All tests completed. Check validator logs above.\n');
    process.exit(0);
}

runTests().catch(console.error);
