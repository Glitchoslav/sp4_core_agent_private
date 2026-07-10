/**
 * 🧪 TEST: /remind Command (v0.11.7)
 * 
 * Tests SCHEDULE_REMINDER action via /remind shortcut
 */

import { processResponseActions } from '../src/core/actionRouter.js';

async function testRemindCommand() {
    console.log('\n🧪 TEST: /remind Command\n');

    // Test relative time (2 hours)
    const when = '2h';
    const reminderText = 'Skontrolovať server';

    const actionPayload = {
        type: "SCHEDULE_REMINDER",
        payload: {
            when: when,
            payload: reminderText
        }
    };

    const actionJSON = JSON.stringify(actionPayload, null, 2);

    console.log('📋 Action Payload:');
    console.log(actionJSON);
    console.log('');

    // Simulate /remind command behavior
    const result = await processResponseActions(`\`\`\`json\n${JSON.stringify(actionPayload)}\n\`\`\``, {
        persona: 'glitchoslav',
        userMessage: '/remind ' + when + ' ' + reminderText
    });

    console.log('\n📊 Result:');
    console.log(`   Actions found: ${result.actionsFound}`);
    console.log(`   Executed: ${result.executed}`);
    console.log(`   Success: ${result.executed > 0 ? '✅' : '❌'}`);

    if (result.results && result.results.length > 0) {
        console.log('\n📝 Action Result:');
        console.log(JSON.stringify(result.results[0], null, 2));
    }

    console.log('');
}

testRemindCommand().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
