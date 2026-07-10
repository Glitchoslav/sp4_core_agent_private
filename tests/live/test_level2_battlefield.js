/**
 * 🔥 SP4_CORE_AGENT - LEVEL 2 BATTLEFIELD TEST
 * 
 * Level 1 Bugs Fixed (v0.10.3):
 * ✅ GLITCHOSLAV existenciálne priority (existential_score > 0.4)
 * ✅ POPIČI vulgarity override (threshold bypass)
 * ✅ Context-lock emotional override (GLITCH priority -40%)
 * ✅ GLITCHOSLAV memory recall (metafory, bez sanitizácie)
 * 
 * Level 2 Test Objectives:
 * 1. Verify GLITCHOSLAV aktivácia pri existenciálnej otázke
 * 2. Verify POPIČI aktivácia pri vulgarite + sebakritike
 * 3. Verify Fire Mode brutálna pravda
 * 4. Verify Memory recall cez GLITCHOSLAV lens
 * 
 * @author Kefyk (SP4) + Walter (BAD Labs)
 * @version 0.10.3
 * @date 2025-11-21
 */

import readline from 'readline';
import { sp4Agent } from './integration.js';

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 SP4_CORE_AGENT - LEVEL 2 BATTLEFIELD TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Level 1 výsledky:
✅ CORE detekcia perfektná
❌ GLITCHOSLAV nebol aktivovaný (existenciálna otázka)
❌ POPIČI threshold príliš prísny (0.91)
❌ Memory recall cez CORE validator (metafory zničené)
⚠️  Context lock príliš agresívny (CORE 0.62)

v0.10.3 Fixes:
✅ Existential keywords + force override (score > 0.4)
✅ Vulgarity override (vulgarita + sebakritika → POPIČI)
✅ Emotional override (-40% threshold pre GLITCH)
✅ glitchoslavMemoryRecall.js (metafory bez sanitizácie)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LEVEL 2 TEST QUERIES:
`);

const TEST_QUERIES = [
    {
        id: 1,
        query: "Čo presne je SP4 v technickej podobe?",
        expectedMode: "CORE",
        expectedBehavior: "Krátka technická odpoveď (2-4 vety)",
        fireMode: false
    },
    {
        id: 2,
        query: "Prečo sa človek cíti, že je na hranici, aj keď všetko ide podľa plánu?",
        expectedMode: "GLITCHOSLAV",
        expectedBehavior: "Existenciálna analýza, metafory, prasklina",
        fireMode: false,
        note: "Level 1 bug: GLITCHOSLAV nebol aktivovaný → FIX: existential_score > 0.4"
    },
    {
        id: 3,
        query: "Ta bratu, prečo furt dojebem čo sa dá?",
        expectedMode: "POPIČI",
        expectedBehavior: "Východniarčina + punchline (max 3 vety)",
        fireMode: false,
        note: "Level 1 bug: threshold 0.91 blokoval → FIX: vulgarity override"
    },
    {
        id: 4,
        query: "Prečo sa bojím začať žiť konečne autenticky?",
        expectedMode: "CORE or GLITCHOSLAV",
        expectedBehavior: "FIRE MODE: brutálna pravda, žiadne útechy",
        fireMode: true,
        note: "Test Fire Mode - auto detection + brutality"
    },
    {
        id: 5,
        query: "Čo sme riešili minule o slobode?",
        expectedMode: "AUTO (memory trigger)",
        expectedBehavior: "Memory recall cez GLITCHOSLAV lens (metafory)",
        fireMode: false,
        note: "Level 1 bug: memory cez CORE validator → FIX: glitchoslavMemoryRecall.js"
    }
];

async function runTest(testCase) {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST ${testCase.id}/5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Query: "${testCase.query}"

Expected Mode: ${testCase.expectedMode}
Expected Behavior: ${testCase.expectedBehavior}
Fire Mode: ${testCase.fireMode ? '🔥 ACTIVE' : 'OFF'}
${testCase.note ? `Note: ${testCase.note}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    try {
        // Initialize agent if not ready
        if (!sp4Agent.initialized) {
            console.log('   🔧 Initializing SP4 Agent...');
            await sp4Agent.initialize();
        }

        const result = await sp4Agent.processMessage(testCase.query, 'auto', testCase.fireMode);

        if (!result.success) {
            console.error(`❌ Test ${testCase.id} FAILED: ${result.error}`);
            return { success: false, error: result.error };
        }

        const response = result.response;

        console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${response}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

        return { success: true, response };

    } catch (error) {
        console.error(`❌ Test ${testCase.id} FAILED:`, error.message);
        return { success: false, error: error.message };
    }
}

async function runAllTests() {
    console.log(`Starting Level 2 Battlefield Test...\n`);

    const results = [];

    for (const testCase of TEST_QUERIES) {
        const result = await runTest(testCase);
        results.push({ ...testCase, ...result });

        // Pauza medzi testami (aby context manager mal čas)
        console.log(`\n⏸️  Pauza 2s pred ďalším testom...\n`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Summary
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 LEVEL 2 TEST SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    results.forEach((result, index) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`Test ${index + 1}: ${status} - ${result.expectedMode}`);
        if (result.note) {
            console.log(`   Note: ${result.note}`);
        }
    });

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const passRate = ((successCount / totalCount) * 100).toFixed(0);

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASS RATE: ${successCount}/${totalCount} (${passRate}%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEPS:
${passRate >= 80 ? '✅ Level 2 CLEARED - ready for production' : '⚠️  Fix failing tests before Level 3'}

Manual verification checklist:
[ ] Test 1: CORE technický output (2-4 vety)
[ ] Test 2: GLITCHOSLAV aktivovaný (metafory, prasklina)
[ ] Test 3: POPIČI aktivovaný (východniarčina, nadávky)
[ ] Test 4: Fire Mode brutálna pravda (žiadne servítky)
[ ] Test 5: Memory recall cez GLITCHOSLAV (metafory preserved)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

// Interactive mode
async function interactiveMode() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTERACTIVE MODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commands:
  /test       - Run all Level 2 tests
  /test <id>  - Run specific test (1-5)
  /exit       - Quit

Or type any query to test manually.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    const prompt = () => {
        rl.question('\n🔥 > ', async (input) => {
            const trimmed = input.trim();

            if (trimmed === '/exit') {
                console.log('\n👋 Battlefield test zakončený.\n');
                rl.close();
                return;
            }

            if (trimmed === '/test') {
                await runAllTests();
                prompt();
                return;
            }

            if (trimmed.startsWith('/test ')) {
                const testId = parseInt(trimmed.split(' ')[1]);
                const testCase = TEST_QUERIES.find(t => t.id === testId);
                if (testCase) {
                    await runTest(testCase);
                } else {
                    console.log(`❌ Test ${testId} not found. Valid IDs: 1-5`);
                }
                prompt();
                return;
            }

            // Manual query
            try {
                if (!sp4Agent.initialized) {
                    console.log('   🔧 Initializing SP4 Agent...');
                    await sp4Agent.initialize();
                }

                const result = await sp4Agent.processMessage(trimmed, 'auto', false);

                if (result.success) {
                    console.log(`\n${result.response}\n`);
                } else {
                    console.error(`❌ Error: ${result.error}`);
                }
            } catch (error) {
                console.error(`❌ Error:`, error.message);
            }

            prompt();
        });
    };

    prompt();
}

// CLI argument parsing
const args = process.argv.slice(2);

if (args.includes('--auto')) {
    // Auto mode - run all tests and exit
    runAllTests().then(() => {
        console.log('\n✅ Level 2 test complete. Exiting...\n');
        process.exit(0);
    }).catch(err => {
        console.error('❌ Test suite failed:', err);
        process.exit(1);
    });
} else {
    // Interactive mode (default)
    interactiveMode();
}
