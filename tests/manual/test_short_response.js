// SP4 CORE AGENT - Manual short-response test
// Purpose: send a minimal message through integration pipeline and log raw response

import { SP4IntegratedAgent } from '../../integration.js';

async function run() {
    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    const userMessage = 'Hej';
    console.log('➡️ USER:', userMessage);

    const result = await agent.processMessage(userMessage, 'core');

    console.log('\n⬅️ RAW RESULT:');
    console.dir(result, { depth: 4 });

    if (typeof result.response === 'string') {
        console.log('\n🔎 FINAL TEXT RESPONSE:\n', result.response);
    }
}

run().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
