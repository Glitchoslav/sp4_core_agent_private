// Prepočítanie všetkých embeddings na sentence-transformers
// Vymaže staré TF-IDF embeddings a vytvorí nové

import fs from 'fs/promises';
import { loadMemory } from './memory.js';
import { computeMemoryEmbeddings } from './sp4os/ragLocal.js';

console.log('🔄 Prepočítavam embeddings na sentence-transformers...\n');

(async function () {
    try {
        // Load memory
        const state = await loadMemory();
        const memories = state.rawMemory?.log || [];

        console.log(`📊 Našiel som ${memories.length} memories\n`);

        // Vymaž staré embeddings
        console.log('🗑️  Mažem staré TF-IDF embeddings...');
        let deletedCount = 0;
        memories.forEach(entry => {
            if (entry.metadata?.embedding) {
                delete entry.metadata.embedding;
                deletedCount++;
            }
        });
        console.log(`   ✅ Vymazaných ${deletedCount} starých embeddings\n`);

        // Ulož state bez embeddings
        await fs.writeFile('data/memory.json', JSON.stringify(state, null, 2));

        // Prepočítaj embeddings s novým modelom
        console.log('🧠 Prepočítavam embeddings s all-MiniLM-L6-v2...\n');
        const computed = await computeMemoryEmbeddings(state);

        // Ulož state s novými embeddings
        await fs.writeFile('data/memory.json', JSON.stringify(state, null, 2));

        console.log(`\n✅ Hotovo! Prepočítaných ${computed} embeddings.`);
        console.log('💾 Memory.json aktualizovaný.\n');

        // Test similarity
        console.log('🧪 Test similarity scores:');
        const testMemories = memories.slice(0, 5);
        for (let i = 0; i < testMemories.length; i++) {
            const emb = testMemories[i].metadata?.embedding;
            if (emb) {
                const sample = emb.slice(0, 3).map(v => v.toFixed(4)).join(', ');
                console.log(`   Memory ${i + 1}: [${sample}...] (dim: ${emb.length})`);
            }
        }

    } catch (error) {
        console.error('❌ Chyba:', error);
        process.exit(1);
    }
})();
