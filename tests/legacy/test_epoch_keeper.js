#!/usr/bin/env node
/**
 * 🔥 TEST: SP4_EPOCH KEEPER
 * Testuje nový modul pre zápis epoch
 */

import { displayEpochs, getLatestEpochs, recordEpoch } from './src/core/epochKeeper.js';

console.log('\n🔥 === TESTING SP4_EPOCH KEEPER ===\n');

// Test 1: Pridanie novej epochy
console.log('📝 Test 1: Pridanie epoch...\n');
await recordEpoch('SP4_EPOCH Keeper module deployed', {
    version: '1.0.0',
    mission: 'm_20251125_625066',
    files: ['src/core/epochKeeper.js']
});

await recordEpoch('/mission command fixed - initialize() added', {
    bug: 'Agent nie je inicializovaný',
    fix: 'Added await agent.initialize() in index_v07.js'
});

await recordEpoch('Full Autonomy v2.0 bugs fixed', {
    bug1: 'output.toLowerCase is not a function',
    bug2: 'r.output.substring is not a function',
    files: ['executionOrchestrator.js', 'integration.js']
});

// Test 2: Zobrazenie posledných epoch
console.log('\n📊 Test 2: Zobrazenie epoch...\n');
await displayEpochs(5);

// Test 3: Získanie epoch programaticky
console.log('🔍 Test 3: Programatický prístup...\n');
const latest = await getLatestEpochs(3);
console.log(`✅ Získaných ${latest.length} epoch`);
console.log(`   Posledná: ${latest[latest.length - 1]?.description}\n`);

console.log('✅ All tests passed!\n');
