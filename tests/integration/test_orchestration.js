// test_orchestration.js
// Test GLITCHOSLAV orchestration system

import { orchestrate } from './orchestration/glitchOrchestrator.js';

const testCases = [
    {
        name: "Technical Query → CORE",
        message: "ako funguje SP4 token?",
        context: { emotionalState: 'neutral' }
    },
    {
        name: "Frustration → POPICI",
        message: "kurva prečo mi to nefunguje?!",
        context: { emotionalState: 'frustrated' }
    },
    {
        name: "Existential → GLITCHOSLAV",
        message: "čo je zmysel tohto všetkého?",
        context: { emotionalState: 'neutral' }
    },
    {
        name: "Simple Question → CORE",
        message: "čo je sp4?",
        context: { emotionalState: 'neutral' }
    },
    {
        name: "Complex Analysis → GLITCHOSLAV",
        message: "porovnaj SP4 s existujúcimi tokenomics modelmi a navrhni stratégiu",
        context: { emotionalState: 'neutral' }
    }
];

console.log('🌀 GLITCHOSLAV ORCHESTRATION TEST\n');

for (const test of testCases) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Input: "${test.message}"`);

    try {
        const result = await orchestrate(test.message, test.context);

        // result = { response, handledBy, reasoning, meta }
        console.log(`   ✅ Decision: ${result.handledBy?.toUpperCase() || 'UNKNOWN'}`);
        console.log(`   💭 Reasoning: ${result.reasoning}`);

        // Validate decision
        if (test.name.includes("CORE") && result.handledBy !== 'core') {
            console.log(`   ⚠️  UNEXPECTED: Expected CORE, got ${result.handledBy}`);
        }
        if (test.name.includes("POPICI") && result.handledBy !== 'popici') {
            console.log(`   ⚠️  UNEXPECTED: Expected POPICI, got ${result.handledBy}`);
        }
        if (test.name.includes("GLITCHOSLAV") && result.handledBy !== 'glitchoslav') {
            console.log(`   ⚠️  UNEXPECTED: Expected GLITCHOSLAV, got ${result.handledBy}`);
        }

    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
    }
}

console.log('\n\n✅ Test completed');
