// test_autonomous_live.js
/**
 * 🧠 AUTONOMOUS CONTROLLER LIVE TEST
 * 
 * Full end-to-end test with real LLM calls
 */

import { SP4IntegratedAgent } from './integration.js';

const agent = new SP4IntegratedAgent();

console.log('🧠 === AUTONOMOUS CONTROLLER LIVE TEST === 🧠\n');
console.log('⚠️  This test will make REAL API calls (cloud + local)\n');

async function liveTest() {
    console.log('📦 Initializing SP4 Agent...\n');
    await agent.initialize();

    const tests = [
        {
            name: 'TEST 1: Simple Greeting (should use LOCAL)',
            message: 'Ahoj Glitchoslav, ako sa vôbec voláš?',
            expectLocal: true
        },
        {
            name: 'TEST 2: Medium Slovak Code Task (cloud if budget allows)',
            message: 'Napíš mi jednoduchý Python script, ktorý stiahne dáta z API a uloží ich do CSV súboru.',
            expectCloud: 'maybe'
        },
        {
            name: 'TEST 3: Complex Analysis (should use CLOUD - GROQ)',
            message: 'Urob komplexnú analýzu: Porovnaj výkonnosť React, Vue a Svelte frameworkov z hľadiska bundle size, runtime performance, developer experience a ecosystem maturity. Zameraj sa aj na TypeScript support a state management riešenia.',
            expectCloud: true
        }
    ];

    let totalCost = 0;

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        console.log(`\n${'='.repeat(80)}`);
        console.log(`${test.name}`);
        console.log(`${'='.repeat(80)}\n`);

        console.log(`📝 Message: "${test.message}"`);
        console.log();

        try {
            const startTime = Date.now();
            const result = await agent.processMessage(test.message, 'core');
            const duration = Date.now() - startTime;

            console.log(`\n📤 RESPONSE (${duration}ms):`);
            console.log(`${'─'.repeat(80)}`);

            // Display response (truncate if too long)
            const responsePreview = result.response.length > 500
                ? result.response.substring(0, 500) + '\n\n... [truncated, total length: ' + result.response.length + ' chars]'
                : result.response;

            console.log(responsePreview);
            console.log(`${'─'.repeat(80)}\n`);

            // Check metadata
            if (result.meta) {
                console.log('📊 Metadata:');
                if (result.meta.autonomousDecision) {
                    console.log('   ✅ Autonomous decision was used');
                }
                if (result.meta.cloudProvider) {
                    console.log(`   ☁️  Cloud provider: ${result.meta.cloudProvider}`);
                    console.log(`   🤖 Handled by: ${result.meta.handledBy}`);
                }
                if (result.meta.strategy) {
                    console.log(`   🎯 Strategy: ${result.meta.strategy.responseStyle} style`);
                }
            }

            // Cost tracking
            const currentCost = agent.dailyCloudCost;
            const testCost = currentCost - totalCost;
            totalCost = currentCost;

            if (testCost > 0) {
                console.log(`\n💰 Cost this test: $${testCost.toFixed(6)}`);
            } else {
                console.log(`\n🏠 Local only (FREE)`);
            }

            console.log(`💰 Total cost so far: $${totalCost.toFixed(6)}`);

            // Verification
            if (test.expectLocal && result.meta?.handledBy && !result.meta.handledBy.includes('cloud')) {
                console.log('   ✅ CORRECT: Used LOCAL as expected');
            } else if (test.expectCloud === true && result.meta?.cloudProvider) {
                console.log('   ✅ CORRECT: Used CLOUD as expected');
            } else if (test.expectCloud === 'maybe') {
                console.log('   📊 Cloud decision based on budget/heuristics');
            }

        } catch (error) {
            console.error(`\n❌ TEST FAILED: ${error.message}`);
            console.error(error.stack);
        }
    }

    // Final statistics
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 SESSION SUMMARY');
    console.log(`${'='.repeat(80)}\n`);

    const stats = agent.autonomousController.getStats();

    console.log(`Total autonomous decisions: ${stats.totalDecisions}`);
    console.log(`Cloud usage: ${stats.cloudUsage} decisions (${stats.cloudPercentage}%)`);
    console.log(`Local usage: ${stats.localUsage} decisions`);
    console.log(`Total cloud cost: $${totalCost.toFixed(6)}`);
    console.log(`Budget remaining: $${(agent.maxDailyCloudCost - totalCost).toFixed(2)}`);

    if (Object.keys(stats.learningData).length > 0) {
        console.log('\n📚 Learning Data Collected:');
        Object.entries(stats.learningData).forEach(([taskType, data]) => {
            const successRate = (data.success / data.total) * 100;
            console.log(`   ${taskType}: ${data.success}/${data.total} (${successRate.toFixed(0)}% success) → prefers ${data.brain}`);
        });
    }

    console.log('\n✅ Live test completed!\n');
}

liveTest().catch(error => {
    console.error('❌ Live test failed:', error);
    console.error(error.stack);
    process.exit(1);
});
