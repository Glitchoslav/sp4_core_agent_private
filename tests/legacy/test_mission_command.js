// test_mission_command.js
/**
 * 🧪 MISSION COMMAND TEST
 * 
 * Tests /mission command in integration.js
 */

import { SP4IntegratedAgent } from './integration.js';

console.log('🧪 === MISSION COMMAND TEST === 🧪\n');

async function testMissionCommand() {
    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    const testCases = [
        {
            name: 'TEST 1: Simple Code Mission',
            command: '/mission Vytvor mi Python funkciu na sčítanie dvoch čísel'
        },
        {
            name: 'TEST 2: Campaign Mission',
            command: '/mission Potrebujem 2 IG posty o AI a budúcnosti práce'
        }
    ];

    for (const test of testCases) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(test.name);
        console.log(`${'='.repeat(80)}\n`);

        try {
            const result = await agent.processMessage(test.command, 'core');

            if (result.success) {
                console.log('\n📤 RESPONSE:\n');
                console.log(result.response);

                if (result.meta) {
                    console.log('\n📊 METADATA:');
                    console.log(`   Mission ID: ${result.meta.missionId}`);
                    console.log(`   Tasks: ${result.meta.tasksCompleted}`);
                    console.log(`   Cost: $${result.meta.totalCost?.toFixed(3) || '0.000'}`);
                    console.log(`   Time: ${result.meta.totalTime?.toFixed(1) || '0'} min`);
                }
            } else {
                console.log('\n❌ FAILED:', result.response);
            }

        } catch (error) {
            console.error(`\n❌ ERROR: ${error.message}`);
            console.error(error.stack);
        }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ MISSION COMMAND TEST COMPLETE');
    console.log(`${'='.repeat(80)}\n`);
}

testMissionCommand().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
