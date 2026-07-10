// Quick test for RAG debug logging
import { retrieveRelevantMemories } from '../../sp4os/ragLocal.js';
import { loadMemory } from './memory.js';

async function test() {
    console.log('🧪 Quick RAG Test');

    const state = await loadMemory();
    console.log(`📊 Memory loaded: ${state.rawMemory?.log?.length || 0} entries`);

    console.log('\n🔍 Testing retrieveRelevantMemories with simple query...');
    const results = await retrieveRelevantMemories('cieľ', state, 3);

    console.log(`\n✅ Got ${results.length} results`);
    results.forEach((r, i) => {
        console.log(`  [${i}] Score: ${r.score.toFixed(3)} - ${r.entry.input?.substring(0, 50) || 'N/A'}`);
    });
}

test().catch(console.error);
