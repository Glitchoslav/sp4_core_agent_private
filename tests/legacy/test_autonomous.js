// test_autonomous.js
/**
 * 🧠 AUTONOMOUS CONTROLLER TEST SUITE
 * 
 * Tests the autonomous decision-making layer
 */

import { SP4IntegratedAgent } from './integration.js';

const agent = new SP4IntegratedAgent();

console.log('🧠 === AUTONOMOUS CONTROLLER TEST SUITE === 🧠\n');

async function runTests() {
    console.log('📦 Initializing SP4 Agent...\n');
    await agent.initialize();

    const tests = [
        {
            name: 'TEST 1: Simple Question (should use LOCAL)',
            message: 'Ahoj, ako sa máš?',
            expectedBrain: 'local',
            expectedComplexity: 'simple'
        },
        {
            name: 'TEST 2: Complex Code Task (should use CLOUD - GROQ)',
            message: 'Napíš mi kompletný REST API server v Node.js s Express, ktorý bude mať autentifikáciu cez JWT, databázové pripojenie na PostgreSQL, validáciu dát pomocou Joi, rate limiting, CORS middleware, error handling middleware, a dokumentáciu v Swagger. Implementuj CRUD operácie pre entitu "users" a "posts" s relačným prepojením.',
            expectedBrain: 'cloud',
            expectedComplexity: 'expert'
        },
        {
            name: 'TEST 3: Medium Analysis Task (depends on budget)',
            message: 'Analyzuj výhody a nevýhody mikroservisovej architektúry oproti monolitickej aplikácii. Zamestaj sa na škálovateľnosť, údržbu, deployment, debugging a team organization.',
            expectedComplexity: 'medium'
        },
        {
            name: 'TEST 4: Code Generation (should use CLOUD)',
            message: 'Vytvor Python funkciu na detekciu anomálií v časových radoch pomocou isolation forest algoritmu.',
            expectedBrain: 'cloud',
            expectedComplexity: 'complex'
        },
        {
            name: 'TEST 5: Learning Test - Repeated Task Type',
            message: 'Explain machine learning in simple terms.',
            note: 'After this, autonomous controller should learn pattern'
        }
    ];

    const stats = {
        total: 0,
        cloudDecisions: 0,
        localDecisions: 0,
        correctComplexity: 0
    };

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        console.log(`\n${'='.repeat(70)}`);
        console.log(`${test.name}`);
        console.log(`${'='.repeat(70)}\n`);

        console.log(`📝 Message: "${test.message.substring(0, 100)}${test.message.length > 100 ? '...' : ''}"`);
        console.log();

        try {
            // Get autonomous decision WITHOUT executing
            const strategy = await agent.autonomousController.decide(test.message, {
                emotion: 'neutral',
                mode: 'core',
                taskType: agent.autonomousController.detectTaskType(test.message),
                priority: 'normal'
            });

            console.log('\n🎯 AUTONOMOUS DECISION:');
            console.log(`   Brain: ${strategy.brain.toUpperCase()}`);
            if (strategy.brain === 'cloud') {
                console.log(`   Provider: ${strategy.provider}`);
                console.log(`   Model: ${strategy.model}`);
            }
            console.log(`   Response Style: ${strategy.responseStyle}`);
            console.log(`   Max Tokens: ${strategy.maxTokens}`);
            console.log(`   Temperature: ${strategy.temperature}`);
            console.log(`   Memory Depth: ${strategy.memoryDepth}`);
            console.log(`\n   📊 Reasoning:\n   ${strategy.finalReasoning}\n`);

            stats.total++;
            if (strategy.brain === 'cloud') stats.cloudDecisions++;
            if (strategy.brain === 'local') stats.localDecisions++;

            // Verify expected outcomes
            if (test.expectedBrain && strategy.brain === test.expectedBrain) {
                console.log(`   ✅ CORRECT: Expected ${test.expectedBrain.toUpperCase()}, got ${strategy.brain.toUpperCase()}`);
            } else if (test.expectedBrain) {
                console.log(`   ⚠️  UNEXPECTED: Expected ${test.expectedBrain.toUpperCase()}, got ${strategy.brain.toUpperCase()}`);
            }

            // Check complexity estimation
            const actualComplexity = agent.autonomousController.analyzeComplexity(test.message);
            if (test.expectedComplexity && actualComplexity === test.expectedComplexity) {
                console.log(`   ✅ COMPLEXITY: Expected ${test.expectedComplexity}, got ${actualComplexity}`);
                stats.correctComplexity++;
            } else if (test.expectedComplexity) {
                console.log(`   ⚠️  COMPLEXITY: Expected ${test.expectedComplexity}, got ${actualComplexity}`);
            } else {
                console.log(`   📊 Detected complexity: ${actualComplexity}`);
            }

            if (test.note) {
                console.log(`   💡 Note: ${test.note}`);
            }

        } catch (error) {
            console.error(`   ❌ TEST FAILED: ${error.message}`);
        }
    }

    // Final statistics
    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 FINAL STATISTICS');
    console.log(`${'='.repeat(70)}\n`);

    const controllerStats = agent.autonomousController.getStats();

    console.log(`Total Decisions: ${stats.total}`);
    console.log(`Cloud Decisions: ${stats.cloudDecisions} (${((stats.cloudDecisions / stats.total) * 100).toFixed(1)}%)`);
    console.log(`Local Decisions: ${stats.localDecisions} (${((stats.localDecisions / stats.total) * 100).toFixed(1)}%)`);
    console.log(`Correct Complexity: ${stats.correctComplexity}/${tests.filter(t => t.expectedComplexity).length}`);

    console.log('\n🧠 Autonomous Controller Internal Stats:');
    console.log(`   Total logged decisions: ${controllerStats.totalDecisions}`);
    console.log(`   Cloud usage: ${controllerStats.cloudUsage} (${controllerStats.cloudPercentage}%)`);
    console.log(`   Local usage: ${controllerStats.localUsage}`);

    if (Object.keys(controllerStats.learningData).length > 0) {
        console.log('\n📚 Learning Data:');
        Object.entries(controllerStats.learningData).forEach(([taskType, data]) => {
            const successRate = (data.success / data.total) * 100;
            console.log(`   ${taskType}: ${data.success}/${data.total} success (${successRate.toFixed(0)}%) → ${data.brain}/${data.provider || 'local'}`);
        });
    }

    console.log('\n✅ All tests completed!\n');
}

runTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
});
