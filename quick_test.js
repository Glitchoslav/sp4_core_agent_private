/**
 * QUICK SP4 SYSTEM TEST
 * Tests all major components
 */

import { IdentityManager } from './identity.js';
import { addLogEntry, loadMemory } from './memory.js';
import { ensureProjectRoot } from './scripts/cwdGuard.js';
import { askLocalLLM } from './sp4os/llmLocal.js';

// 🔥 v1.4.2: Auto-correct working directory
ensureProjectRoot();

console.log('\n🧪 SP4 SYSTEM QUICK TEST\n');
console.log('━'.repeat(60) + '\n');

// Test 1: Identity
console.log('📝 TEST 1: Identity System');
try {
    const identityManager = new IdentityManager();
    await identityManager.initialize();
    const snapshot = identityManager.getFullIdentity();

    if (!snapshot || !snapshot.current) {
        console.log('⚠️ Identity not initialized, skipping deep identity check.');
    } else {
        console.log('✅ Identity loaded');
        console.log(`   Active mode: ${snapshot.activeMode}`);
        console.log(`   Similarity: ${snapshot.similarity}`);
        console.log(`   Core traits:`, snapshot.current.personalityTraits);
    }
} catch (error) {
    console.log(`❌ Identity failed: ${error.message}`);
}

console.log('\n' + '─'.repeat(60) + '\n');

// Test 2: Memory
console.log('📝 TEST 2: Memory System');
try {
    const memory = loadMemory();
    console.log(`✅ Memory loaded: ${memory.entries?.length || 0} entries`);
    console.log(`   Total interactions: ${memory.totalInteractions || 0}`);
    console.log(`   Relationships: ${Object.keys(memory.relationships || {}).length}`);
} catch (error) {
    console.log(`❌ Memory failed: ${error.message}`);
}

console.log('\n' + '─'.repeat(60) + '\n');

// Test 3: LLM Connection
console.log('📝 TEST 3: Ollama LLM');
try {
    console.log('   Sending test query...');
    const response = await askLocalLLM('Odpovedz len "OK" ak funguješ.', {
        model: 'gemma3:1b',
        temperature: 0.3,
        maxTokens: 10
    });
    console.log(`✅ LLM response: "${response.substring(0, 50)}..."`);
} catch (error) {
    console.log(`❌ LLM failed: ${error.message}`);
}

console.log('\n' + '─'.repeat(60) + '\n');

// Test 4: Memory Write
console.log('📝 TEST 4: Memory Write');
try {
    await addLogEntry('Test query', 'Test response', 'test', {
        test: true,
        timestamp: new Date().toISOString()
    });
    console.log(`✅ Memory log entry added`);

    // 🔥 v1.4.2: Reload memory to refresh counters
    const updatedMemory = await loadMemory();

    // 🔥 v1.4.2: Access totalInteractions from rawMemory.stats (canonical location)
    const totalInteractions = updatedMemory.rawMemory?.stats?.totalInteractions || updatedMemory.rawMemory?.log?.length || 0;
    console.log(`   Total interactions after reload: ${totalInteractions}`);
} catch (error) {
    console.log(`❌ Memory write failed: ${error.message}`);
}

console.log('\n' + '━'.repeat(60));
console.log('\n✅ QUICK TEST COMPLETE!\n');
