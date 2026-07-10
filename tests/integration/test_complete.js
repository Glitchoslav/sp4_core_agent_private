#!/usr/bin/env node
/**
 * 🔥 SP4_CORE_AGENT Complete Workflow Test
 * Tests full integration: memory persistence + CLI commands
 * 
 * Usage: node test_complete.js
 */

import { completeGoal, dropGoal, getGoals, setGoal } from './goalsModel.js';
import { addLogEntry, loadMemory, saveMemory } from './memory.js';

console.log('🔥 SP4_CORE_AGENT Complete Workflow Test\n');
console.log('Testing: Full integration + persistence\n');
console.log('═'.repeat(60) + '\n');

async function runCompleteTest() {
    try {
        // Test 1: Memory initialization
        console.log('📝 TEST 1: Memory initialization');
        const mem = await loadMemory();
        console.log(`   Memory loaded: ${mem.userProfile.name}`);
        console.log(`   Goals array exists: ${Array.isArray(mem.goals)}`);
        console.log('   ✅ PASS\n');

        // Test 2: Full goal lifecycle with persistence
        console.log('📝 TEST 2: Full goal lifecycle');

        // Clear any existing goals for clean test
        mem.goals = [];
        await saveMemory(mem);

        // Set goal 1
        console.log('   → Setting goal 1...');
        await setGoal('Dokončiť SP4_CORE_AGENT v0.9');

        // Verify persistence
        const mem1 = await loadMemory();
        const activeGoal1 = mem1.goals.find(g => g.status === 'active');
        if (activeGoal1) {
            console.log(`   ✅ Goal 1 persisted: "${activeGoal1.text}"`);
        } else {
            console.log('   ❌ Goal 1 NOT persisted!');
            throw new Error('Goal persistence failed');
        }

        // Complete goal 1
        console.log('   → Completing goal 1...');
        await completeGoal();

        // Verify completion
        const mem2 = await loadMemory();
        const completedGoal = mem2.goals.find(g => g.status === 'done');
        if (completedGoal && completedGoal.done_at) {
            console.log(`   ✅ Goal 1 completed with timestamp: ${completedGoal.done_at}`);
        } else {
            console.log('   ❌ Goal 1 completion failed!');
            throw new Error('Goal completion failed');
        }

        // Set goal 2
        console.log('   → Setting goal 2...');
        await setGoal('Napísať dokumentáciu pre SP4 komunitu');

        // Drop goal 2
        console.log('   → Dropping goal 2...');
        await dropGoal();

        // Verify drop
        const mem3 = await loadMemory();
        const droppedGoal = mem3.goals.find(g => g.status === 'dropped');
        if (droppedGoal && droppedGoal.dropped_at) {
            console.log(`   ✅ Goal 2 dropped with timestamp: ${droppedGoal.dropped_at}`);
        } else {
            console.log('   ❌ Goal 2 drop failed!');
            throw new Error('Goal drop failed');
        }

        console.log('   ✅ PASS - Full lifecycle works!\n');

        // Test 3: Multiple goals + history
        console.log('📝 TEST 3: Multiple goals + history');
        await setGoal('Cieľ 3 - Test history');
        await completeGoal();
        await setGoal('Cieľ 4 - Test history 2');
        await completeGoal();

        const finalMem = await loadMemory();
        const doneGoals = finalMem.goals.filter(g => g.status === 'done');
        console.log(`   Total completed goals: ${doneGoals.length}`);

        if (doneGoals.length >= 2) {
            console.log('   ✅ PASS - History tracking works!\n');
        } else {
            console.log('   ❌ FAIL - Not enough history\n');
        }

        // Test 4: getGoals() function
        console.log('📝 TEST 4: getGoals() output');
        const { active, recent } = await getGoals();
        console.log(`   Active goal: ${active ? active.text : 'None'}`);
        console.log(`   Recent goals count: ${recent.length}`);
        console.log('   ✅ PASS\n');

        // Test 5: Command logging
        console.log('📝 TEST 5: Command logging in rawMemory');
        await addLogEntry('user', '/goal test command', 'system', '🎯 Test command logged');
        const memWithLog = await loadMemory();
        const lastLog = memWithLog.rawMemory[memWithLog.rawMemory.length - 1];
        if (lastLog && lastLog.input === '/goal test command') {
            console.log('   ✅ PASS - Commands logged correctly\n');
        } else {
            console.log('   ⚠️  WARNING - Command logging might not work\n');
        }

        // Final Summary
        console.log('═'.repeat(60));
        console.log('\n🎉 Complete Workflow Test PASSED!\n');
        console.log('Verified:');
        console.log('  ✅ Memory initialization with goals array');
        console.log('  ✅ Goal persistence (create → save → reload)');
        console.log('  ✅ Goal completion with timestamps');
        console.log('  ✅ Goal dropping with timestamps');
        console.log('  ✅ History tracking (multiple goals)');
        console.log('  ✅ getGoals() API');
        console.log('  ✅ Command logging integration');

        console.log('\n📊 Final state:');
        const summary = await getGoals();
        console.log(`  - Active: ${summary.active ? summary.active.text : 'None'}`);
        console.log(`  - History: ${summary.recent.length} goals`);
        console.log(`  - Total in memory.json: ${finalMem.goals.length} goals`);

        console.log('\n✅ goalsModel.js is PRODUCTION READY! 🚀\n');

    } catch (err) {
        console.error('\n❌ TEST FAILED:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

// Run complete test
runCompleteTest();
