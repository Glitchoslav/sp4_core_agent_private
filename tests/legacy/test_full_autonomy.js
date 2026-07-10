// test_full_autonomy.js
/**
 * 🧪 FULL AUTONOMY v2.0 TEST
 * 
 * End-to-end test: Planning → Execution
 */

import { AutonomousPlanner } from './autonomousPlanner.js';
import { ExecutionOrchestrator } from './executionOrchestrator.js';
import { SP4IntegratedAgent } from './integration.js';

console.log('🧪 === FULL AUTONOMY v2.0 TEST === 🧪\n');

async function fullTest() {
    // Initialize
    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    const planner = new AutonomousPlanner();
    const orchestrator = new ExecutionOrchestrator(agent);

    const testMissions = [
        {
            name: 'TEST 1: Simple Code Mission',
            goal: 'Vytvor mi Python funkciu na výpočet faktoriálu',
            expectedType: 'code'
        }
    ];

    for (const test of testMissions) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(test.name);
        console.log(`${'='.repeat(80)}\n`);

        try {
            // PHASE 1: Planning
            console.log('📋 PHASE 1: PLANNING\n');
            const plan = await planner.createMissionPlan(test.goal, {
                urgency: 'normal',
                budget: 'balanced'
            });

            console.log(`\n   ✅ Plan created: ${plan.plan.tasks.length} tasks, $${plan.plan.estimatedCost.toFixed(2)}`);

            // PHASE 2: Approval
            console.log(`\n📊 PHASE 2: APPROVAL\n`);
            console.log(`   Mission: ${plan.mission.goal}`);
            console.log(`   Tasks: ${plan.plan.tasks.length}`);
            console.log(`   Est. Cost: $${plan.plan.estimatedCost.toFixed(2)}`);
            console.log(`   Est. Time: ${plan.plan.estimatedTime} min`);
            console.log(`\n   ✅ Auto-approved (test mode)`);

            // PHASE 3: Execution
            console.log(`\n⚙️ PHASE 3: EXECUTION\n`);
            const result = await orchestrator.executeMission(plan);

            if (result.success) {
                console.log(`\n✅ TEST PASSED`);
                console.log(`   Actual cost: $${result.totalCost.toFixed(3)}`);
                console.log(`   Actual time: ${result.totalTime.toFixed(1)} min`);
                console.log(`   Tasks completed: ${result.results.length}`);

                // Display results
                console.log(`\n   📤 RESULTS:\n`);
                result.results.forEach((r, i) => {
                    console.log(`   Task ${i + 1} (${r.taskId}):`);
                    const preview = r.output.substring(0, 200);
                    console.log(`   ${preview}${r.output.length > 200 ? '...' : ''}\n`);
                });
            } else {
                console.log(`\n❌ TEST FAILED: ${result.error}`);
            }

        } catch (error) {
            console.error(`\n❌ TEST ERROR: ${error.message}`);
            console.error(error.stack);
        }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ FULL AUTONOMY TEST COMPLETE');
    console.log(`${'='.repeat(80)}\n`);
}

fullTest().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
