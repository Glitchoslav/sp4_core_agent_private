// 🔥 SP4_CORE_AGENT v0.6.2 - Lokálny RAG (Sentence Transformers)
// Walter's upgrade: Retrieval-Augmented Generation with semantic embeddings

import { pipeline } from '@xenova/transformers';
import { runtimeLog } from '../src/core/runtimeLogging.js';
import { getRetrievableMemoryLog } from '../src/runtime/memoryHygiene.js';

// ============================================================
// CONFIGURATION
// ============================================================

export const RAG_CONFIG = {
    embeddingMethod: 'sentence-transformers',  // v0.6.2: Real semantic embeddings
    model: 'Xenova/all-MiniLM-L6-v2',         // Lightweight 80MB model
    topK: 5,                                   // Return top 5 most relevant memories
    minSimilarity: 0.3,                        // Minimum cosine similarity threshold
    cacheEmbeddings: true,                     // Cache computed embeddings
};

// Global extractor instance (lazy-loaded)
let featureExtractor = null;

// ============================================================
// SENTENCE TRANSFORMER EMBEDDINGS
// ============================================================

/**
 * Initialize the sentence transformer model (lazy-loaded)
 */
async function initializeExtractor() {
    if (!featureExtractor) {
        runtimeLog('🧠 Loading sentence transformer model...');
        featureExtractor = await pipeline('feature-extraction', RAG_CONFIG.model);
        runtimeLog('   ✅ Model loaded: all-MiniLM-L6-v2');
    }
    return featureExtractor;
}

/**
 * Generate semantic embedding using sentence-transformers
 * @param {string} text - Input text
 * @returns {Array<number>} - 384-dimensional embedding vector
 */
export async function generateLocalEmbedding(text) {
    if (!text || text.trim().length === 0) {
        return new Array(384).fill(0);
    }

    const extractor = await initializeExtractor();

    // Generate embedding
    const output = await extractor(text, { pooling: 'mean', normalize: true });

    // Convert to plain array
    const embedding = Array.from(output.data);

    return embedding;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) {
        return 0;
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        magnitude1 += vec1[i] * vec1[i];
        magnitude2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(magnitude1) * Math.sqrt(magnitude2);

    if (magnitude === 0) {
        return 0;
    }

    return dotProduct / magnitude;
}

// ============================================================
// EMBEDDING MANAGEMENT
// ============================================================

/**
 * Compute and cache embeddings for all memories
 */
export async function computeMemoryEmbeddings(state) {
    const { entries: memories } = getRetrievableMemoryLog(state);
    let computedCount = 0;

    for (const entry of memories) {
        // Skip invalid entries (safety check)
        if (typeof entry !== 'object' || entry === null) {
            console.warn('⚠️  Skipping invalid memory entry (not an object)');
            continue;
        }

        // Skip if already has embedding and caching is enabled
        if (RAG_CONFIG.cacheEmbeddings && entry.metadata?.embedding) {
            continue;
        }

        // Combine user + agent text for embedding
        // Support both old format (input/reply) and new (user/agent)
        const userText = entry.user || entry.input || '';
        const agentText = entry.agent || entry.reply || '';

        // Safety check: ensure text is string
        const safeUserText = typeof userText === 'string' ? userText : '';
        const safeAgentText = typeof agentText === 'string' ? agentText : '';
        const combinedText = `${safeUserText} ${safeAgentText}`;

        const embedding = await generateLocalEmbedding(combinedText);

        // Validate metadata before assignment
        if (entry.metadata && typeof entry.metadata !== 'object') {
            console.warn(`⚠️  Skipping entry with non-object metadata (type: ${typeof entry.metadata})`);
            continue;
        }

        // Store embedding in metadata
        if (!entry.metadata) entry.metadata = {};
        entry.metadata.embedding = embedding;

        computedCount++;
    }

    runtimeLog(`📊 Computed ${computedCount} embeddings (${memories.length - computedCount} cached)`);

    return computedCount;
}

/**
 * Update embedding for single memory entry
 */
export async function updateMemoryEmbedding(entry) {
    // Safety check
    if (typeof entry !== 'object' || entry === null) {
        console.warn('⚠️  Invalid entry for embedding update');
        return;
    }

    // Support both old format (input/reply) and new (user/agent)
    const userText = entry.user || entry.input || '';
    const agentText = entry.agent || entry.reply || '';

    // Safety check: ensure text is string
    const safeUserText = typeof userText === 'string' ? userText : '';
    const safeAgentText = typeof agentText === 'string' ? agentText : '';
    const combinedText = `${safeUserText} ${safeAgentText}`;

    const embedding = await generateLocalEmbedding(combinedText);

    if (!entry.metadata) entry.metadata = {};
    entry.metadata.embedding = embedding;

    return entry;
}

// ============================================================
// SEMANTIC SEARCH
// ============================================================

/**
 * Retrieve relevant memories using semantic search
 * @param {string} query - Search query
 * @param {Object} state - Memory state
 * @param {number} topK - Number of results to return
 * @returns {Array} - Array of { entry, score } sorted by relevance
 */
export async function retrieveRelevantMemories(query, state, topK = RAG_CONFIG.topK) {
    // 1. Generate query embedding
    const queryEmbedding = await generateLocalEmbedding(query);

    // 2. Compute embeddings for memories if not cached
    if (RAG_CONFIG.cacheEmbeddings) {
        await computeMemoryEmbeddings(state);
    }

    // 3. Calculate similarity scores
    const { entries: memories } = getRetrievableMemoryLog(state);
    const scoredMemories = [];

    for (const entry of memories) {
        // Support both old format (input/reply) and new (user/agent)
        const userText = entry.user || entry.input || '';
        const agentText = entry.agent || entry.reply || '';
        const combinedText = `${userText} ${agentText}`;

        const memoryEmbedding = entry.metadata?.embedding || await generateLocalEmbedding(combinedText);
        const score = cosineSimilarity(queryEmbedding, memoryEmbedding);

        scoredMemories.push({ entry, score });
    }

    // 4. Filter by minimum similarity
    const relevantMemories = scoredMemories.filter(
        item => item.score >= RAG_CONFIG.minSimilarity
    );

    // 5. Sort by score and take topK
    const topMemories = relevantMemories
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    return topMemories;
}

/**
 * Search memories by semantic meaning
 */
export async function semanticSearch(query, state, options = {}) {
    const {
        topK = RAG_CONFIG.topK,
        minSimilarity = RAG_CONFIG.minSimilarity,
        includeMetadata = true
    } = options;

    const results = await retrieveRelevantMemories(query, state, topK);

    // Filter by custom threshold if provided
    const filtered = results.filter(item => item.score >= minSimilarity);

    // Format results
    return filtered.map(({ entry, score }) => {
        const userText = entry.user || entry.input || '';
        const agentText = entry.agent || entry.reply || '';
        const timestamp = entry.timestamp || entry.ts || '';

        return {
            user: userText,
            agent: agentText,
            timestamp: timestamp,
            score: score,
            ...(includeMetadata && { metadata: entry.metadata })
        };
    });
}

/**
 * Format RAG context for LLM prompt
 */
export async function formatRAGContext(query, state, topK = 3) {
    const relevantMemories = await retrieveRelevantMemories(query, state, topK);

    if (relevantMemories.length === 0) {
        return '';
    }

    let context = '\n\n📚 RELEVANT CONTEXT (Semantic Search):\n';

    relevantMemories.forEach(({ entry, score }, index) => {
        const userText = entry.user || entry.input || '';
        const agentText = entry.agent || entry.reply || '';

        context += `\n${index + 1}. [Similarity: ${(score * 100).toFixed(0)}%]\n`;
        context += `   User: ${userText}\n`;
        context += `   Agent: ${agentText}\n`;
        if (entry.metadata?.tags) {
            context += `   Tags: ${entry.metadata.tags.join(', ')}\n`;
        }
    });

    context += '\n(Use this context to inform your response with semantic understanding)\n';

    return context;
}

// ============================================================
// EMBEDDING PERSISTENCE
// ============================================================

/**
 * Save embeddings to disk (for faster startup)
 */
export async function saveEmbeddingsToDisk(state, filePath) {
    const embeddings = {};

    state.rawMemory?.log?.forEach((entry, index) => {
        if (entry.metadata?.embedding) {
            embeddings[index] = {
                timestamp: entry.timestamp,
                embedding: entry.metadata.embedding
            };
        }
    });

    const fs = await import('fs/promises');
    await fs.writeFile(filePath, JSON.stringify(embeddings, null, 2));

    console.log(`💾 Saved ${Object.keys(embeddings).length} embeddings to ${filePath}`);
}

/**
 * Load embeddings from disk
 */
export async function loadEmbeddingsFromDisk(state, filePath) {
    try {
        const fs = await import('fs/promises');
        const content = await fs.readFile(filePath, 'utf8');
        const embeddings = JSON.parse(content);

        let loadedCount = 0;

        Object.entries(embeddings).forEach(([index, data]) => {
            const entry = state.rawMemory?.log?.[parseInt(index)];
            if (entry && entry.timestamp === data.timestamp) {
                if (!entry.metadata) entry.metadata = {};
                entry.metadata.embedding = data.embedding;
                loadedCount++;
            }
        });

        console.log(`📂 Loaded ${loadedCount} embeddings from ${filePath}`);
        return loadedCount;

    } catch (error) {
        console.log(`⚠️ Could not load embeddings: ${error.message}`);
        return 0;
    }
}

// ============================================================
// STATISTICS & DIAGNOSTICS
// ============================================================

/**
 * Get RAG statistics
 */
export function getRAGStatistics(state) {
    const memories = state.rawMemory?.log || [];
    const withEmbeddings = memories.filter(e => e.metadata?.embedding).length;

    return {
        totalMemories: memories.length,
        embeddingsComputed: withEmbeddings,
        embeddingCoverage: memories.length > 0 ? (withEmbeddings / memories.length * 100).toFixed(1) : 0,
        method: RAG_CONFIG.embeddingMethod,
        cacheEnabled: RAG_CONFIG.cacheEmbeddings
    };
}

/**
 * Test semantic search
 */
export async function testSemanticSearch(state) {
    console.log('🧪 Testing semantic search...\n');

    const testQueries = [
        'Ako riešim stres?',
        'Mám problémy v práci',
        'Cítim sa unavený',
        'Potrebujem motiváciu'
    ];

    for (const query of testQueries) {
        console.log(`Query: "${query}"`);
        const results = await retrieveRelevantMemories(query, state, 3);

        if (results.length > 0) {
            console.log(`  Found ${results.length} relevant memories:`);
            results.forEach(({ entry, score }, i) => {
                const userText = entry.user || entry.input || '';
                console.log(`  ${i + 1}. [${(score * 100).toFixed(0)}%] ${userText.substring(0, 50)}...`);
            });
        } else {
            console.log(`  No relevant memories found`);
        }
        console.log('');
    }

    const stats = getRAGStatistics(state);
    console.log('📊 RAG Statistics:');
    console.log(`   Total memories: ${stats.totalMemories}`);
    console.log(`   Embeddings computed: ${stats.embeddingsComputed}`);
    console.log(`   Coverage: ${stats.embeddingCoverage}%`);
    console.log(`   Method: ${stats.method}`);
}

// ============================================================
// EXPORT
// ============================================================

export default {
    RAG_CONFIG,
    generateLocalEmbedding,
    cosineSimilarity,
    computeMemoryEmbeddings,
    updateMemoryEmbedding,
    retrieveRelevantMemories,
    semanticSearch,
    formatRAGContext,
    saveEmbeddingsToDisk,
    loadEmbeddingsFromDisk,
    getRAGStatistics,
    testSemanticSearch
};
