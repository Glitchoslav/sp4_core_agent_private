/**
 * 🧪 TEST: /idea Command (v0.11.7)
 * 
 * Tests SAVE_SNIPPET action via /idea shortcut
 */

import { processResponseActions } from '../src/core/actionRouter.js';

async function testIdeaCommand() {
    console.log('\n🧪 TEST: /idea Command\n');

    const snippetText = 'Skúsiť local-first AI šifrovaný messenger';

    const actionPayload = {
        type: "SAVE_SNIPPET",
        payload: {
            title: snippetText.substring(0, 50) + (snippetText.length > 50 ? '...' : ''),
            content: snippetText,
            category: "idea",
            tags: ["user_command"]
        }
    };

    const actionJSON = JSON.stringify(actionPayload, null, 2);

    console.log('📋 Action Payload:');
    console.log(actionJSON);
    console.log('');

    // Simulate /idea command behavior
    const result = await processResponseActions(`\`\`\`json\n${JSON.stringify(actionPayload)}\n\`\`\``, {
        persona: 'core',
        userMessage: '/idea ' + snippetText
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

testIdeaCommand().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
