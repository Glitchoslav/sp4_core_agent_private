/**
 * SP4 MEMORY BACKFILL UTILITY
 * Obohať existujúce memories o v1.0 metadata
 */

import { loadMemory, saveMemory } from '../memory.js';
import { enrichExistingMemory } from '../memory/metadataHelpers.js';

console.log('🔄 SP4 MEMORY BACKFILL - Enriching existing memories with v1.0 metadata\n');

async function backfillMemories() {
    const state = await loadMemory();

    // Check if rawMemory exists
    if (!state.rawMemory || !state.rawMemory.log) {
        console.log('❌ No rawMemory found. Nothing to backfill.');
        return;
    }

    const memories = state.rawMemory.log;
    console.log(`📊 Found ${memories.length} memories to process\n`);

    let enrichedCount = 0;
    let skippedCount = 0;

    memories.forEach((entry, i) => {
        // Skip if already has v1.0 metadata
        if (entry.metadata?.lastUsed && entry.metadata?.reasonKept) {
            skippedCount++;
            return;
        }

        // Enrich with metadata
        if (!entry.metadata) {
            entry.metadata = {};
        }

        enrichExistingMemory(entry.metadata);
        enrichedCount++;

        if ((i + 1) % 50 === 0) {
            console.log(`   Processed ${i + 1}/${memories.length} memories...`);
        }
    });

    console.log(`\n✅ Backfill complete:`);
    console.log(`   Enriched: ${enrichedCount}`);
    console.log(`   Skipped (already enriched): ${skippedCount}`);
    console.log(`   Total: ${memories.length}`);

    // Save updated memory
    await saveMemory(state);
    console.log('\n💾 Memory saved\n');

    // Show sample
    if (enrichedCount > 0) {
        console.log('📋 Sample enriched memory:');
        const sample = memories.find(m => m.metadata?.lastUsed);
        if (sample) {
            console.log(`   Input: "${sample.input?.substring(0, 60)}..."`);
            console.log(`   Importance: ${sample.metadata.importance?.toFixed(2) || 'N/A'}`);
            console.log(`   Tags: ${sample.metadata.tags?.join(', ') || 'none'}`);
            console.log(`   ReasonKept: ${sample.metadata.reasonKept || 'N/A'}`);
            console.log(`   LastUsed: ${sample.metadata.lastUsed || 'N/A'}`);
        }
    }
}

backfillMemories().catch(err => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
});
