#!/usr/bin/env node
// Quick CLI test for SP4 First Aid SPG

import { SP4IntegratedAgent } from './integration.js';

console.log('🚨 SP4 FIRST AID - CLI QUICK TEST\n');

const agent = new SP4IntegratedAgent();
await agent.initialize();

const testQueries = [
    'Človek leží, nereaguje a nedýcha',
    'Ako sa máš?',
    'Kolega kolaboval a lapá po dychu',
    'Čo je SP4?'
];

for (const query of testQueries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`QUERY: "${query}"`);
    console.log('='.repeat(60));

    const result = await agent.ask(query);

    console.log(`\nRESPONSE:\n${result.response}\n`);
    console.log(`Handled by: ${result.meta?.handledBy || result.handledBy || 'unknown'}`);
    console.log(`Emergency: ${result.meta?.emergency || false}`);
    console.log(`Bypass LLM: ${result.meta?.bypassLLM || false}`);
}

console.log('\n✅ CLI TEST COMPLETED\n');
process.exit(0);
