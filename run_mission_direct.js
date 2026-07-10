#!/usr/bin/env node
/**
 * 🔥 SP4 DIRECT MISSION RUNNER
 * Bypass CLI/HTTP - spustí mission priamo
 */

import { SP4IntegratedAgent } from './integration.js';

const goal = process.argv[2] || 'Vytvor jednoduchý Python skript na hello world';

console.log('\n🚀 SP4 DIRECT MISSION RUNNER\n');
console.log(`📋 Goal: ${goal}\n`);

const agent = new SP4IntegratedAgent();
await agent.initialize();

const result = await agent.processMessage(`/mission ${goal}`);

console.log('\n' + '='.repeat(60));
console.log(result.response);
console.log('='.repeat(60));

if (result.meta?.missionId) {
    console.log('\n✅ MISSION COMPLETE!');
    console.log(`   ID: ${result.meta.missionId}`);
    console.log(`   Tasks: ${result.meta.tasksCompleted || 0}`);
    console.log(`   Cost: $${(result.meta.totalCost || 0).toFixed(6)}`);
    console.log(`   Time: ${((result.meta.totalTime || 0) / 60000).toFixed(1)} min\n`);
}
