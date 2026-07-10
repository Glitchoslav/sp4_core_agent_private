// test_live_mission.js - Direct test bez servera

import { SP4IntegratedAgent } from './integration.js';

console.log('\n🧪 === LIVE MISSION TEST === 🧪\n');

async function testLiveMission() {
    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    const missions = [
        'Vytvor mi jednoduchý Python calculator',
        'Potrebujem 2 LinkedIn posty o remote work',
    ];

    for (const [i, mission] of missions.entries()) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`TEST ${i + 1}: ${mission}`);
        console.log(`${'='.repeat(80)}\n`);

        try {
            const startTime = Date.now();
            const result = await agent.processMessage(`/mission ${mission}`, 'core');
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);

            if (result.success) {
                console.log('\n✅ MISSION SUCCESS!\n');
                console.log(`Duration: ${duration}s`);

                if (result.meta) {
                    console.log(`Mission ID: ${result.meta.missionId}`);
                    console.log(`Tasks: ${result.meta.tasksCompleted}`);
                    console.log(`Cost: $${result.meta.totalCost?.toFixed(3) || '0.000'}`);
                    console.log(`Time: ${result.meta.totalTime?.toFixed(1) || '0'} min`);
                }

                console.log(`\nResponse preview:`);
                console.log(result.response.substring(0, 500) + '...\n');
            } else {
                console.log('\n❌ MISSION FAILED!\n');
                console.log(result.response);
            }

        } catch (error) {
            console.error(`\n❌ ERROR: ${error.message}`);
            console.error(error.stack);
        }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ LIVE TEST COMPLETE');
    console.log(`${'='.repeat(80)}\n`);
}

testLiveMission().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
