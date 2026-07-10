#!/usr/bin/env node
/**
 * 🚀 LIVE MISSION TEST - SP4 Landing Page
 * 
 * Direct test of Full Autonomy v2.0 system
 * Bypasses CLI to execute mission programmatically
 */

import { SP4IntegratedAgent } from './integration.js';

const goal = 'Vytvor mi SP4 webstránku - landing page ktorá oznamuje náš raketový nástup, prečo sme vznikli, čo chceme dosiahnuť, koho hľadáme a ako sa zapojiť';

console.log('\n🔥 === SP4 LANDING PAGE - LIVE MISSION === 🔥\n');
console.log(`📝 GOAL: ${goal}\n`);

// Initialize agent
const agent = new SP4IntegratedAgent();
console.log('⚙️  Initializing agent...\n');

try {
    await agent.initialize();
    console.log('✅ Agent initialized\n');

    // Execute mission (triggers autonomousPlanner + executionOrchestrator)
    console.log('🚀 Executing mission via /mission command...\n');

    const result = await agent.ask(`/mission ${goal}`, {
        mode: 'auto',
        systemPrompt: 'SP4 Full Autonomy v2.0'
    });

    console.log('\n' + '='.repeat(80));
    console.log('📊 MISSION RESULT:');
    console.log('='.repeat(80) + '\n');

    if (result.meta && result.meta.missionMode) {
        console.log(`✅ SUCCESS: ${result.success}`);
        console.log(`🎯 Mission ID: ${result.meta.missionId}`);
        console.log(`📋 Tasks Completed: ${result.meta.tasksCompleted}`);
        console.log(`💰 Total Cost: $${result.meta.totalCost.toFixed(6)}`);
        console.log(`⏱️  Total Time: ${result.meta.totalTime}ms`);
        console.log(`⏱️  Execution Time: ${result.executionTime}ms\n`);
        console.log('📄 Response:\n');
        console.log(result.response);
    } else {
        console.log('❌ Mission mode not triggered');
        console.log('\nResponse:', result.response || result);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔥 MISSION COMPLETE! Check missions/completed/ for full results');
    console.log('='.repeat(80) + '\n');

} catch (error) {
    console.error('\n❌ MISSION FAILED:', error.message);
    console.error('\nStack:', error.stack);
}

process.exit(0);
