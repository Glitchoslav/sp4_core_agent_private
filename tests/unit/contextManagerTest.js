/**
 * TEST SUITE: SP4 Context Manager (Agent Locking)
 * v0.7.0 - BAD Labs Integration
 */

import { SP4ContextManager } from './src/core/contextManager.js';

console.log('🧪 CONTEXT MANAGER TEST SUITE\n');
console.log('============================================================\n');

// Test scenario: konverzácia s mode switching
const manager = new SP4ContextManager({
    initialLockStrength: 0.7,
    minLockStrength: 0.2,
    lockDecayRate: 0.08,
    changeThresholdMultiplier: 1.3
});

console.log('📋 TEST 1: First Message (No Lock)\n');
let result = manager.shouldChangeMode('empatia', 0.8, 'Som smutný...');
console.log(`Result: ${JSON.stringify(result, null, 2)}\n`);
console.assert(result.shouldChange === true, '❌ Should change on first message');
console.assert(result.finalMode === 'empatia', '❌ Should set EMPATIA mode');
console.assert(result.lockStrength === 0.7, '❌ Should set full lock strength');
console.log('✅ Test 1 PASS\n');

console.log('📋 TEST 2: Weak Signal (Lock Holds)\n');
result = manager.shouldChangeMode('human', 0.5, 'Ako sa máš?');
console.log(`Result: ${JSON.stringify(result, null, 2)}\n`);
console.assert(result.shouldChange === false, '❌ Should NOT change (weak signal)');
console.assert(result.finalMode === 'empatia', '❌ Should keep EMPATIA');
console.assert(result.isLocked === true, '❌ Should be locked');
console.log('✅ Test 2 PASS\n');

console.log('📋 TEST 3: Same Mode (Lock Refresh)\n');
result = manager.shouldChangeMode('empatia', 0.85, 'Ešte stále som smutný');
console.log(`Result: ${JSON.stringify(result, null, 2)}\n`);
console.assert(result.shouldChange === false, '❌ Should not change (same mode)');
console.assert(result.finalMode === 'empatia', '❌ Should keep EMPATIA');
console.assert(result.lockStrength === 0.7, '❌ Should refresh lock to 0.7');
console.log('✅ Test 3 PASS\n');

console.log('📋 TEST 4: Strong Signal (Unlock & Change)\n');
result = manager.shouldChangeMode('popici', 0.95, 'Popiči kokot, dosť!');
console.log(`Result: ${JSON.stringify(result, null, 2)}\n`);
console.assert(result.shouldChange === true, '❌ Should change (strong signal)');
console.assert(result.finalMode === 'popici', '❌ Should switch to POPICI');
console.assert(result.previousMode === 'empatia', '❌ Should track previous mode');
console.log(`   🔓 Unlocked: 0.95 > ${(0.7 * 1.3).toFixed(2)} threshold\n`);
console.log('✅ Test 4 PASS\n');

console.log('📋 TEST 5: Lock Decay Over Multiple Messages\n');
for (let i = 1; i <= 5; i++) {
    result = manager.shouldChangeMode('human', 0.6, `Message ${i}`);
    console.log(`   Msg ${i}: Lock ${result.lockStrength.toFixed(2)}, Change: ${result.shouldChange}`);
}
console.log();
console.assert(result.lockStrength < 0.7, '❌ Lock should decay over time');
console.assert(result.lockStrength >= 0.2, '❌ Lock should not go below minimum');
console.log('✅ Test 5 PASS\n');

console.log('📋 TEST 6: Force Unlock (Manual Override)\n');
const forceResult = manager.forceUnlock('glitch', 'USER_COMMAND');
console.log(`Result: ${JSON.stringify(forceResult, null, 2)}\n`);
console.assert(forceResult.success === true, '❌ Force unlock should succeed');
console.assert(forceResult.newMode === 'glitch', '❌ Should set GLITCH mode');
const state = manager.getState();
console.assert(state.lockStrength === 0.7, '❌ Should reset lock to full strength');
console.log('✅ Test 6 PASS\n');

console.log('📋 TEST 7: History Tracking\n');
const history = manager.getHistory(5);
console.log(`History size: ${history.length}`);
console.log(`Last entry: ${JSON.stringify(history[history.length - 1], null, 2)}\n`);
console.assert(history.length > 0, '❌ History should not be empty');
console.assert(history[history.length - 1].mode === 'glitch', '❌ Last mode should be GLITCH');
console.log('✅ Test 7 PASS\n');

console.log('📋 TEST 8: State Export/Import\n');
const exported = manager.export();
console.log(`Exported keys: ${Object.keys(exported).join(', ')}`);

const newManager = new SP4ContextManager();
newManager.import(exported);
const importedState = newManager.getState();

console.assert(importedState.currentMode === exported.state.currentMode, '❌ Mode should match');
console.assert(importedState.lockStrength === exported.state.lockStrength, '❌ Lock should match');
console.log('✅ Test 8 PASS\n');

console.log('📋 TEST 9: Reset\n');
manager.reset();
const resetState = manager.getState();
console.log(`State after reset: ${JSON.stringify(resetState, null, 2)}\n`);
console.assert(resetState.currentMode === null, '❌ Mode should be null after reset');
console.assert(resetState.lockStrength === 0, '❌ Lock should be 0 after reset');
console.assert(resetState.historySize === 0, '❌ History should be empty');
console.log('✅ Test 9 PASS\n');

console.log('============================================================\n');
console.log('📊 FINAL STATS:\n');

const finalExport = manager.export();
console.log(JSON.stringify(finalExport.config, null, 2));
console.log('\n✅ All Context Manager tests completed!');
