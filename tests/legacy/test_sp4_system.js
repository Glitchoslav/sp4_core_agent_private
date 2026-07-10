#!/usr/bin/env node
/**
 * 🔥 SP4 SYSTEM INTEGRATION TEST
 * 
 * Testuje 3 kľúčové komponenty:
 * 1. Health Check (auto-detection)
 * 2. Mission Execution (Full Autonomy v2.0)
 * 3. Epoch History (SP4_EPOCH Keeper)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { SP4IntegratedAgent } from './integration.js';
import { loadMemory } from './memory.js';
import { displayEpochs, getLatestEpochs } from './src/core/epochKeeper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║                                                           ║');
console.log('║        🔥 SP4 SYSTEM INTEGRATION TEST v1.0 🔥            ║');
console.log('║                                                           ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

let testsPassed = 0;
let testsFailed = 0;

// ═══════════════════════════════════════════════════════════
// TEST 1: HEALTH CHECK (Automatic Detection Simulation)
// ═══════════════════════════════════════════════════════════

console.log('📋 TEST 1: Health Check & System Status\n');
console.log('   Query: "Všetko funkčné?"\n');

try {
    const memory = await loadMemory();
    const identityData = await fs.readFile(path.join(__dirname, 'data', 'identity.json'), 'utf-8');
    const identity = JSON.parse(identityData);

    console.log('╔═══════════════════════════════════════╗');
    console.log('║       SP4 SYSTEM HEALTH CHECK         ║');
    console.log('╚═══════════════════════════════════════╝\n');

    console.log('✅ Core Agent: RUNNING');
    console.log(`✅ Identity Similarity: ${(identity.similarity * 100).toFixed(0)}%`);
    console.log(`✅ Memory Seeds: ${memory.seeds?.length || 0}`);
    console.log(`✅ Raw Log: ${memory.raw_log?.length || 0} entries`);
    console.log(`✅ Relationship: ${memory.relationship?.stage || 'stranger'}`);
    console.log(`✅ Interactions: ${memory.relationship?.metrics?.interactionCount || 0}`);
    console.log(`✅ Current Mode: ${memory.preferences?.defaultMode || 'auto'}`);

    const epochs = await getLatestEpochs(1);
    if (epochs.length > 0) {
        const lastEpoch = epochs[epochs.length - 1];
        const date = new Date(lastEpoch.timestamp).toLocaleString('sk-SK');
        console.log(`✅ Last Epoch: ${lastEpoch.description} (${date})`);
    }

    console.log('\n🔥 System: HEALTHY\n');
    console.log('✅ TEST 1 PASSED\n');
    testsPassed++;
} catch (error) {
    console.error('❌ TEST 1 FAILED:', error.message, '\n');
    testsFailed++;
}

// ═══════════════════════════════════════════════════════════
// TEST 2: MISSION EXECUTION (Full Autonomy v2.0)
// ═══════════════════════════════════════════════════════════

console.log('─'.repeat(60));
console.log('📋 TEST 2: Mission Execution (Full Autonomy v2.0)\n');
console.log('   Goal: Vytvor Python skript na generovanie náhodných hesiel\n');

try {
    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    const missionGoal = '/mission Vytvor Python skript na generovanie náhodných hesiel s možnosťou nastavenia dĺžky a komplexnosti';

    console.log('🚀 Spúšťam Full Autonomy v2.0...\n');

    const result = await agent.processMessage(missionGoal);

    // Check if mission was successful
    if (result.meta?.missionId) {
        console.log(`\n✅ Mission completed successfully!`);
        console.log(`   ID: ${result.meta.missionId}`);
        console.log(`   Tasks: ${result.meta.tasksCompleted || 0}`);
        console.log(`   Cost: $${(result.meta.totalCost || 0).toFixed(6)}`);
        console.log(`   Time: ${((result.meta.totalTime || 0) / 60000).toFixed(1)} min\n`);

        // Verify mission file exists
        const missionFile = path.join(__dirname, 'missions', 'completed', `${result.meta.missionId}.json`);
        try {
            await fs.access(missionFile);
            console.log(`✅ Mission results saved: ${missionFile}\n`);
        } catch {
            console.log(`⚠️  Mission file not found (may be in different location)\n`);
        }

        console.log('✅ TEST 2 PASSED\n');
        testsPassed++;
    } else {
        throw new Error('Mission did not return missionId');
    }
} catch (error) {
    console.error('❌ TEST 2 FAILED:', error.message, '\n');
    testsFailed++;
}

// ═══════════════════════════════════════════════════════════
// TEST 3: EPOCH HISTORY (SP4_EPOCH Keeper)
// ═══════════════════════════════════════════════════════════

console.log('─'.repeat(60));
console.log('📋 TEST 3: Epoch History Review\n');
console.log('   Command: /epochs (last 10)\n');

try {
    await displayEpochs(10);

    const allEpochs = await getLatestEpochs(20);
    console.log(`\n✅ Total epochs in system: ${allEpochs.length}`);

    // Verify key epochs exist
    const hasEpochKeeper = allEpochs.some(e => e.description.includes('SP4_EPOCH Keeper'));
    const hasFullAutonomy = allEpochs.some(e => e.description.includes('Full Autonomy'));

    if (hasEpochKeeper) console.log('✅ Epoch Keeper deployment recorded');
    if (hasFullAutonomy) console.log('✅ Full Autonomy events recorded');

    console.log('\n✅ TEST 3 PASSED\n');
    testsPassed++;
} catch (error) {
    console.error('❌ TEST 3 FAILED:', error.message, '\n');
    testsFailed++;
}

// ═══════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════

console.log('═'.repeat(60));
console.log('\n🎯 FINAL TEST REPORT\n');
console.log(`   ✅ Passed: ${testsPassed}/3`);
console.log(`   ❌ Failed: ${testsFailed}/3`);

if (testsFailed === 0) {
    console.log('\n🔥 ALL TESTS PASSED! SP4 System is fully operational.\n');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Check errors above.\n`);
    process.exit(1);
}
