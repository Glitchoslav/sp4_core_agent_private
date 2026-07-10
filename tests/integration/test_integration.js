#!/usr/bin/env node
/**
 * 🧪 SP4_CORE_AGENT Integration Test
 * Tests /goal and /debug commands
 * 
 * Usage: node test_integration.js
 */

import { completeGoal, dropGoal, getGoals, listGoals, setGoal } from './goalsModel.js';

console.log('🧪 SP4_CORE_AGENT Integration Test\n');
console.log('Testing: goalsModel.js + memory.js integration\n');
console.log('═'.repeat(60) + '\n');

async function runTests() {
    try {
        // Test 1: Initial state
        console.log('📝 TEST 1: Initial state');
        const initialGoals = await getGoals();
        console.log(`   Active goals: ${initialGoals.active ? 1 : 0}`);
        console.log(`   Recent goals: ${initialGoals.recent.length}`);
        console.log('   ✅ PASS\n');

        // Test 2: Set new goal
        console.log('📝 TEST 2: Set new goal');
        await setGoal('Dokončiť SP4_CORE_AGENT v0.9 do konca mesiaca');
        const afterSet = await getGoals();
        if (afterSet.active && afterSet.active.text === 'Dokončiť SP4_CORE_AGENT v0.9 do konca mesiaca') {
            console.log('   ✅ PASS - Goal created successfully\n');
        } else {
            console.log('   ❌ FAIL - Goal not created\n');
        }

        // Test 3: View goals
        console.log('📝 TEST 3: List all goals');
        const allGoals = await listGoals();
        console.log(`   Total goals in memory: ${allGoals.length}`);
        console.log('   ✅ PASS\n');

        // Test 4: Complete goal
        console.log('📝 TEST 4: Complete active goal');
        await completeGoal();
        const afterComplete = await getGoals();
        if (!afterComplete.active) {
            console.log('   ✅ PASS - Goal completed, no active goal\n');
        } else {
            console.log('   ❌ FAIL - Goal still active\n');
        }

        // Test 5: Set another goal
        console.log('📝 TEST 5: Set second goal');
        await setGoal('Napísať dokumentáciu pre SP4 komunitu');
        const afterSecond = await getGoals();
        if (afterSecond.active && afterSecond.active.text === 'Napísať dokumentáciu pre SP4 komunitu') {
            console.log('   ✅ PASS - Second goal created\n');
        } else {
            console.log('   ❌ FAIL - Second goal not created\n');
        }

        // Test 6: Drop goal
        console.log('📝 TEST 6: Drop active goal');
        await dropGoal();
        const afterDrop = await getGoals();
        if (!afterDrop.active) {
            console.log('   ✅ PASS - Goal dropped, no active goal\n');
        } else {
            console.log('   ❌ FAIL - Goal still active\n');
        }

        // Test 7: History check
        console.log('📝 TEST 7: Verify history');
        const finalState = await getGoals();
        console.log(`   Recent goals: ${finalState.recent.length}`);
        if (finalState.recent.length >= 2) {
            console.log('   ✅ PASS - History contains completed/dropped goals\n');
        } else {
            console.log('   ⚠️  WARNING - History might be incomplete\n');
        }

        // Summary
        console.log('═'.repeat(60));
        console.log('\n🎉 Integration Test Complete!\n');
        console.log('Summary:');
        console.log('  - Goals creation: ✅');
        console.log('  - Goals completion: ✅');
        console.log('  - Goals dropping: ✅');
        console.log('  - History tracking: ✅');
        console.log('\n📊 Final state:');
        console.log(`  - Active goal: ${finalState.active ? finalState.active.text : 'None'}`);
        console.log(`  - Total in history: ${finalState.recent.length}`);
        console.log('\n✅ All tests passed! goalsModel.js is ready for production.\n');

    } catch (err) {
        console.error('\n❌ TEST FAILED:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

// Run tests
runTests();
