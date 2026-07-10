/**
 * 🔥 SP4 ORCHESTRATOR - COMPLETE SYSTEM TEST
 * Tests all 3 personas with new OpenEuroLLM-Slovak model for POPICI
 */

import { orchestrate } from './orchestration/glitchOrchestrator.js';

const tests = [
    {
        query: 'čo je zmysel života?',
        expected: 'glitchoslav',
        description: 'Existential question'
    },
    {
        query: 'ako funguje orchestrácia agentov?',
        expected: 'core',
        description: 'Technical question'
    },
    {
        query: 'piča nevládzem v tejto práci!',
        expected: 'popici',
        description: 'Vulgar frustration'
    }
];

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔥 SP4 ORCHESTRATOR - FULL SYSTEM TEST');
console.log('   Testing OpenEuroLLM-Slovak for POPICI');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

for (const test of tests) {
    const result = await orchestrate(test.query, {
        emotionalState: { dominantEmotion: 'neutral' }
    });

    const routingOK = result.persona === test.expected ? '✅' : '❌';

    console.log(`\n📝 ${test.description}`);
    console.log(`   Query: "${test.query}"`);
    console.log(`   ${routingOK} Routing: ${result.action} → ${result.persona?.toUpperCase()}`);
    console.log(`   ✅ Model: ${result.model}`);
    console.log(`   ✅ Expected: ${test.expected.toUpperCase()}`);
    console.log(`   📜 Response (first 200 chars):`);
    console.log(`      ${result.response.substring(0, 200).replace(/\n/g, '\n      ')}...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

console.log('\n✅ Test complete!\n');
