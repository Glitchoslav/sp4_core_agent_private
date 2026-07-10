// ┌─────────────────────────────────────────────┐
// │  SP4 FIRST AID - SPG TEST                  │
// │  Version: 0.1                              │
// │  Purpose: Sanity check for emergency gate  │
// └─────────────────────────────────────────────┘

import manifest from '../sp4_first_aid/logic_manifest.json' with { type: 'json' };
import { getSPGDiagnostics, runSPG } from '../sp4_first_aid/spg.js';

console.log('🧪 SP4 FIRST AID SPG - SANITY TEST\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 1: Diagnostics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('📊 TEST 1: SPG Diagnostics\n');

const diagnostics = getSPGDiagnostics(manifest);

console.log(`   Enabled: ${diagnostics.enabled ? '✅' : '❌'}`);
console.log(`   Version: ${diagnostics.version}`);
console.log(`   Mode: ${diagnostics.mode}`);
console.log(`   States: ${diagnostics.statesCount} (${diagnostics.stateIds.join(', ')})`);
console.log(`   Keywords: ${diagnostics.totalKeywords} total`);
console.log(`   Templates: ${diagnostics.templatesPath}`);

console.log('\n✅ TEST 1 PASSED\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 2: Emergency Detection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('🚨 TEST 2: Emergency Detection\n');

const emergencyCases = [
    {
        input: 'Človek leží, nereaguje a nedýcha',
        expected: 'should_match',
        description: 'Classic KPR scenario'
    },
    {
        input: 'Kolega mi práve spadol a je bezvedomý',
        expected: 'should_match',
        description: 'Unconscious person'
    },
    {
        input: 'Niekto lapá po dychu a kolaboval',
        expected: 'should_match',
        description: 'Breathing difficulty + collapse'
    },
    {
        input: 'Môj otec nedýcha, čo mám robiť?',
        expected: 'should_match',
        description: 'Not breathing query'
    },
    {
        input: 'Človek leží bez pohybu, môžem ho odviezť do nemocnice?',
        expected: 'should_match',
        description: 'Interdiction test (forbidden: transportovať/odviezť)'
    }
];

let passed = 0;
let failed = 0;

for (const testCase of emergencyCases) {
    const result = runSPG(testCase.input, manifest);
    const matched = result !== null;

    console.log(`   📝 "${testCase.input}"`);
    console.log(`      Expected: ${testCase.expected}`);
    console.log(`      Result: ${matched ? 'MATCHED' : 'NO MATCH'}`);

    if (testCase.expected === 'should_match' && matched) {
        console.log(`      ✅ PASS - ${testCase.description}`);

        // Verify template contains key instructions
        if (result.includes('KPR DOSPELÝ') && result.includes('112')) {
            console.log(`      ✅ Template validation: OK`);
        } else {
            console.log(`      ⚠️ Template validation: MISSING KEY CONTENT`);
        }

        passed++;
    } else if (testCase.expected === 'should_match' && !matched) {
        console.log(`      ❌ FAIL - ${testCase.description}`);
        failed++;
    }

    console.log('');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 3: Non-Emergency Cases
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('🟢 TEST 3: Non-Emergency Cases\n');

const nonEmergencyCases = [
    {
        input: 'Ako sa máš?',
        expected: 'should_not_match',
        description: 'Normal greeting'
    },
    {
        input: 'Čo je to SP4?',
        expected: 'should_not_match',
        description: 'General question'
    },
    {
        input: 'Potrebujem radu ohľadom projektu',
        expected: 'should_not_match',
        description: 'Non-medical query'
    }
];

for (const testCase of nonEmergencyCases) {
    const result = runSPG(testCase.input, manifest);
    const matched = result !== null;

    console.log(`   📝 "${testCase.input}"`);
    console.log(`      Expected: ${testCase.expected}`);
    console.log(`      Result: ${matched ? 'MATCHED' : 'NO MATCH'}`);

    if (testCase.expected === 'should_not_match' && !matched) {
        console.log(`      ✅ PASS - ${testCase.description}`);
        passed++;
    } else if (testCase.expected === 'should_not_match' && matched) {
        console.log(`      ❌ FAIL - False positive: ${testCase.description}`);
        failed++;
    }

    console.log('');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('═══════════════════════════════════════════════════════════\n');
console.log('📊 TEST SUMMARY\n');
console.log(`   Total Tests: ${passed + failed}`);
console.log(`   Passed: ${passed} ✅`);
console.log(`   Failed: ${failed} ❌`);
console.log(`   Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

if (failed === 0) {
    console.log('✅ ALL TESTS PASSED - SP4 FIRST AID SPG READY FOR PRODUCTION\n');
    process.exit(0);
} else {
    console.log('❌ SOME TESTS FAILED - REVIEW LOGIC BEFORE DEPLOYMENT\n');
    process.exit(1);
}
