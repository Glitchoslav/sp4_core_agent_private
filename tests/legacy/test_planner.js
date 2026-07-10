// test_planner.js
/**
 * 🧪 AUTONOMOUS PLANNER TEST
 * 
 * Tests mission detection and plan generation
 */

import { AutonomousPlanner } from './autonomousPlanner.js';

console.log('🧪 === AUTONOMOUS PLANNER TEST === 🧪\n');

const planner = new AutonomousPlanner();

const testGoals = [
    {
        name: 'TEST 1: Web Mission',
        goal: 'Sprav mi web pre kaviareň s objednávkovým systémom',
        expectedType: 'web'
    },
    {
        name: 'TEST 2: Campaign Mission',
        goal: 'Potrebujem marketing kampaň: 3 IG posty a landing page',
        expectedType: 'campaign'
    },
    {
        name: 'TEST 3: Code Mission',
        goal: 'Vytvor mi Python script na analýzu CSV súborov',
        expectedType: 'code'
    },
    {
        name: 'TEST 4: Custom Mission',
        goal: 'Vysvetli mi blockchain technológiu jednoducho',
        expectedType: 'custom'
    }
];

async function runTests() {
    for (const test of testGoals) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(test.name);
        console.log(`${'='.repeat(80)}`);

        try {
            const plan = await planner.createMissionPlan(test.goal, {
                urgency: 'normal',
                budget: 'balanced'
            });

            // Verify mission type
            if (plan.mission.type === test.expectedType) {
                console.log(`   ✅ Correct mission type detected: ${test.expectedType.toUpperCase()}`);
            } else {
                console.log(`   ❌ Wrong type: expected ${test.expectedType}, got ${plan.mission.type}`);
            }

            // Verify plan structure
            if (plan.plan.tasks && plan.plan.tasks.length > 0) {
                console.log(`   ✅ Plan has ${plan.plan.tasks.length} tasks`);
            } else {
                console.log(`   ❌ Plan has no tasks!`);
            }

            // Verify cost estimates
            if (plan.plan.estimatedCost > 0) {
                console.log(`   ✅ Cost estimate: $${plan.plan.estimatedCost.toFixed(2)}`);
            }

            // Verify time estimates
            if (plan.plan.estimatedTime > 0) {
                console.log(`   ✅ Time estimate: ${plan.plan.estimatedTime} min`);
            }

        } catch (error) {
            console.error(`   ❌ TEST FAILED: ${error.message}`);
            console.error(error.stack);
        }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ ALL TESTS COMPLETED');
    console.log(`${'='.repeat(80)}\n`);
}

runTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
});
