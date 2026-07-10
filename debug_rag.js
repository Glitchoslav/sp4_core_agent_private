// Debug RAG similarity scoring

import { loadMemory } from './memory.js';
import { computeMemoryEmbeddings, cosineSimilarity, generateLocalEmbedding } from './sp4os/ragLocal.js';

(async function () {
    const state = await loadMemory();

    console.log('🔍 Debugging similarity scores\n');

    // Generate query embedding
    const query = "firefighter work and stress";
    console.log(`Query: "${query}"\n`);

    const queryEmb = await generateLocalEmbedding(query);
    console.log(`Query embedding dimension: ${queryEmb.length}`);
    console.log(`Query embedding sample: [${queryEmb.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);

    // Compute memory embeddings
    await computeMemoryEmbeddings(state);

    // Check first 3 memories
    const memories = state.rawMemory.log.slice(0, 3);

    for (let i = 0; i < memories.length; i++) {
        const mem = memories[i];
        const memEmb = mem.metadata.embedding;

        // Support both old format (input/reply) and new (user/agent)
        const userText = mem.user || mem.input || '';
        const agentText = mem.agent || mem.reply || '';

        console.log(`\nMemory ${i + 1}:`);
        console.log(`  User: ${userText.substring(0, 60)}...`);
        console.log(`  Embedding dimension: ${memEmb.length}`);
        console.log(`  Embedding sample: [${memEmb.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

        const sim = cosineSimilarity(queryEmb, memEmb);
        console.log(`  Similarity: ${sim.toFixed(6)}`);
    }
})();
