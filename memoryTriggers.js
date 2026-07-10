// 🔥 SP4_CORE_AGENT v0.5 - Memory Triggers 2.0
// Walter's upgrade: Contextual memory activation

import { detectEmotions } from './memoryHelpers.js';

// ============================================================
// CONTEXT FEATURES EXTRACTION
// ============================================================

/**
 * Extracts multi-dimensional context features from current input
 * @param {Object} currentContext - { input, timeOfDay, recentTopics, relationshipStage }
 * @returns {Object} - Extracted features
 */
export function extractContextFeatures(currentContext) {
    const { input, timeOfDay, recentTopics = [], relationshipStage = 'stranger' } = currentContext;

    // Emotional features
    const emotionResult = detectEmotions(input, '');  // Pass empty string for reply
    const emotions = emotionResult.user || { neutral: 1.0 };
    const dominantEmotion = Object.entries(emotions).reduce((a, b) =>
        emotions[a[0]] > emotions[b[0]] ? a : b
    )[0];
    const emotionalIntensity = Object.values(emotions).reduce((sum, val) => sum + val, 0) / Object.keys(emotions).length;

    // Topical features (simple keyword extraction)
    const topics = extractTopics(input);

    // Entity extraction (capitalized words as proxy)
    const entities = extractEntities(input);

    return {
        // Emotional dimension
        emotion: dominantEmotion,
        emotions: emotions,
        intensity: emotionalIntensity,

        // Topical dimension
        topics: topics,
        entities: entities,

        // Situational dimension
        timeOfDay: timeOfDay || getCurrentTimeOfDay(),
        recentTopics: recentTopics,

        // Relational dimension
        relationshipStage: relationshipStage
    };
}

/**
 * Extract topics from text (simple keyword-based approach)
 */
function extractTopics(text) {
    const topicKeywords = {
        work: ['práca', 'projekt', 'firma', 'šéf', 'kolegovia', 'deadline', 'meeting'],
        family: ['rodina', 'mama', 'otec', 'brat', 'sestra', 'deti', 'manželka'],
        health: ['zdravie', 'choroba', 'bolesť', 'lieky', 'doktor', 'nemocnica'],
        finance: ['peniaze', 'dlh', 'hypotéka', 'plat', 'účet', 'investícia'],
        relationships: ['vzťah', 'priateľ', 'priateľka', 'láska', 'rozchod', 'partner'],
        emotions: ['cítim', 'emócie', 'strach', 'radosť', 'smútok', 'hnev', 'úzkosť'],
        creativity: ['tvorba', 'nápad', 'projekt', 'inšpirácia', 'umenie', 'hudba'],
        nature: ['príroda', 'les', 'hora', 'rieka', 'zvieratá', 'stromy', 'voda']
    };

    const lowerText = text.toLowerCase();
    const detectedTopics = [];

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            detectedTopics.push(topic);
        }
    });

    return detectedTopics;
}

/**
 * Extract entities (names, places - capitalized words)
 */
function extractEntities(text) {
    const words = text.split(/\s+/);
    const entities = words.filter(word =>
        /^[A-ZÁÄČĎÉÍĽŇÓŔŠŤÚÝŽ][a-záäčďéíľňóôŕšťúýž]+/.test(word) &&
        word.length > 2
    );
    return [...new Set(entities)];  // Unique
}

/**
 * Get current time of day
 */
function getCurrentTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

// ============================================================
// CONTEXTUAL SIMILARITY CALCULATION
// ============================================================

/**
 * Calculate contextual similarity between memory and current context
 * Weighted sum: emotional (30%) + topical (40%) + situational (20%) + relational (10%)
 */
export function calculateContextualSimilarity(memory, contextFeatures) {
    const emotionalSim = calculateEmotionalSimilarity(memory, contextFeatures) * 0.3;
    const topicalSim = calculateTopicalSimilarity(memory, contextFeatures) * 0.4;
    const situationalSim = calculateSituationalSimilarity(memory, contextFeatures) * 0.2;
    const relationalSim = calculateRelationshipSimilarity(memory, contextFeatures) * 0.1;

    return emotionalSim + topicalSim + situationalSim + relationalSim;
}

/**
 * Emotional similarity (compare dominant emotion + intensity)
 */
function calculateEmotionalSimilarity(memory, contextFeatures) {
    if (!memory.metadata?.emotion) return 0;

    const memoryEmotion = memory.metadata.emotion.dominant || 'neutral';
    const currentEmotion = contextFeatures.emotion;

    // Exact match = 1.0, related emotions = 0.5, different = 0.0
    const emotionGroups = {
        negative: ['anger', 'sadness', 'fear', 'disgust', 'negative'],
        positive: ['joy', 'love', 'surprise', 'positive'],
        neutral: ['neutral']
    };

    let emotionMatch = 0;
    if (memoryEmotion === currentEmotion) {
        emotionMatch = 1.0;
    } else {
        // Check if in same emotion group
        const memoryGroup = Object.keys(emotionGroups).find(group =>
            emotionGroups[group].includes(memoryEmotion)
        );
        const currentGroup = Object.keys(emotionGroups).find(group =>
            emotionGroups[group].includes(currentEmotion)
        );
        if (memoryGroup === currentGroup) emotionMatch = 0.5;
    }

    // Intensity similarity (distance between intensities)
    const memoryIntensity = memory.metadata.emotion.averageIntensity || 0.5;
    const currentIntensity = contextFeatures.intensity || 0.5;
    const intensityMatch = 1 - Math.abs(memoryIntensity - currentIntensity);

    return (emotionMatch * 0.7 + intensityMatch * 0.3);
}

/**
 * Topical similarity (Jaccard index of topics + entities)
 */
function calculateTopicalSimilarity(memory, contextFeatures) {
    const memoryTopics = memory.metadata?.tags || [];
    const currentTopics = contextFeatures.topics || [];
    const currentEntities = contextFeatures.entities || [];

    // Combine topics and entities
    const memorySet = new Set(memoryTopics);
    const currentSet = new Set([...currentTopics, ...currentEntities]);

    // Jaccard similarity
    const intersection = [...memorySet].filter(item => currentSet.has(item)).length;
    const union = new Set([...memorySet, ...currentSet]).size;

    return union > 0 ? intersection / union : 0;
}

/**
 * Situational similarity (time of day, recent topics pattern)
 */
function calculateSituationalSimilarity(memory, contextFeatures) {
    let score = 0;

    // Time of day match (bonus if same time)
    const memoryTime = memory.metadata?.timeOfDay;
    const currentTime = contextFeatures.timeOfDay;
    if (memoryTime === currentTime) {
        score += 0.5;
    }

    // Recent topics pattern (check if memory is relevant to recent conversation flow)
    const memoryTopics = memory.metadata?.tags || [];
    const recentTopics = contextFeatures.recentTopics || [];
    const recentTopicMatch = memoryTopics.some(topic => recentTopics.includes(topic));
    if (recentTopicMatch) {
        score += 0.5;
    }

    return score;
}

/**
 * Relationship similarity (how relevant is memory to current relationship stage)
 */
function calculateRelationshipSimilarity(memory, contextFeatures) {
    const memoryStage = memory.metadata?.relationshipStage || 'stranger';
    const currentStage = contextFeatures.relationshipStage || 'stranger';

    // Exact stage match = 1.0
    if (memoryStage === currentStage) return 1.0;

    // Adjacent stages = 0.5
    const stageOrder = ['stranger', 'acquaintance', 'companion', 'confidant', 'symbiont'];
    const memoryIndex = stageOrder.indexOf(memoryStage);
    const currentIndex = stageOrder.indexOf(currentStage);

    if (Math.abs(memoryIndex - currentIndex) === 1) return 0.5;

    return 0;
}

// ============================================================
// MEMORY TRIGGER ACTIVATION
// ============================================================

/**
 * Activate memory triggers based on contextual similarity
 * @param {Object} state - Current memory state
 * @param {Object} currentContext - Current context { input, timeOfDay, recentTopics, relationshipStage }
 * @returns {Array} - Top 3 triggered memories with scores
 */
export function activateMemoryTriggers(state, currentContext) {
    try {
        // 1. Extract context features
        const contextFeatures = extractContextFeatures(currentContext);

        // 2. Calculate similarity for all memories
        const memories = state.rawMemory?.log || [];
        console.log(`   📚 Analyzing ${memories.length} memories...`);

        if (memories.length === 0) {
            console.log(`   ⚠️ No memories in rawMemory to trigger`);
            return [];
        }

        const scoredMemories = memories.map(memory => ({
            memory,
            score: calculateContextualSimilarity(memory, contextFeatures)
        }));

        // Debug: Log top scores BEFORE filtering
        if (scoredMemories.length > 0) {
            const topScores = scoredMemories
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
                .map(({ score }) => score.toFixed(2));
            console.log(`   🔍 Top 5 scores: ${topScores.join(', ')} (threshold: ~0.3)`);
        }

        // 3. Dynamic threshold (important memories have lower threshold)
        const getDynamicThreshold = (memory) => {
            const baseThreshold = 0.3;  // Lowered from 0.5 for more triggers
            const importanceBonus = (memory.metadata?.importance || 0.5) * 0.2;
            return baseThreshold - importanceBonus;  // Lower threshold for important memories
        };

        // 4. Filter by threshold
        const triggeredMemories = scoredMemories.filter(({ memory, score }) =>
            score > getDynamicThreshold(memory)
        );

        console.log(`   ✅ ${triggeredMemories.length} memories passed threshold`);

        // 5. Sort by score and take top 3
        const topTriggered = triggeredMemories
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        return topTriggered;
    } catch (error) {
        console.error(`   ❌ Memory Triggers error:`, error.message);
        return [];
    }
}

/**
 * Format triggered memories for injection into prompt
 */
export function formatTriggeredMemories(triggeredMemories) {
    if (!triggeredMemories || triggeredMemories.length === 0) {
        return '';
    }

    let formatted = '\n\n📌 TRIGGERED MEMORIES (contextually relevant):\n';

    triggeredMemories.forEach(({ memory, score }, index) => {
        formatted += `\n${index + 1}. [Relevance: ${(score * 100).toFixed(0)}%]\n`;
        formatted += `   User: ${memory.user}\n`;
        formatted += `   Agent: ${memory.agent}\n`;
        formatted += `   Context: ${memory.metadata?.tags?.join(', ') || 'N/A'}\n`;
    });

    formatted += '\n(Use these memories to inform your response with contextual awareness)\n';

    return formatted;
}

// ============================================================
// EXPORT
// ============================================================

export default {
    extractContextFeatures,
    calculateContextualSimilarity,
    activateMemoryTriggers,
    formatTriggeredMemories
};
