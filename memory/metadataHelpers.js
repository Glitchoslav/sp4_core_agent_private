/**
 * SP4 MEMORY METADATA HELPERS v1.0
 * Memory enrichment and metadata management
 * 
 * Implementuje Walterov Metadata System:
 * - Memory enrichment with importance scoring
 * - Tag extraction and categorization
 * - Usage tracking (lastUsed timestamps)
 * - Importance adjustment algorithms
 * 
 * @module memory/metadataHelpers
 */

import { detectEmotions, extractTags } from '../memoryHelpers.js';

/**
 * Create enriched memory object with full metadata
 * @param {string} input - User message
 * @param {string} reply - Agent reply
 * @param {Object} context - Additional context
 * @returns {Object} Enriched memory object
 */
export function createEnrichedMemory(input, reply, context = {}) {
    const timestamp = new Date().toISOString();
    const tags = extractTags(input, reply);
    const emotions = detectEmotions(input, reply);
    const importance = calculateImportance(input, reply, tags, emotions);
    const reasonKept = determineReasonKept(importance, tags);

    return {
        user: input,
        agent: reply,
        timestamp,
        importance,
        tags,
        lastUsed: timestamp,
        reasonKept,
        emotions,
        mode: context.mode || 'core',
        persona: context.persona || 'core',
        sessionId: context.sessionId || 'default'
    };
}

/**
 * Calculate importance score (0-1)
 * Higher = more likely to survive consolidation
 */
function calculateImportance(input, reply, tags, emotions) {
    let score = 0.5; // Base importance

    // High importance tags
    const criticalTags = ['core_value', 'identity', 'trauma', 'breakthrough', 'goal', 'sp4_philosophy'];
    if (tags.some(tag => criticalTags.includes(tag))) {
        score += 0.3;
    }

    // Emotional intensity
    const avgIntensity = (emotions.user.intensity + emotions.agent.intensity) / 2;
    score += avgIntensity * 0.2;

    // Length (longer = more detailed = potentially important)
    const wordCount = (input.split(/\s+/).length + reply.split(/\s+/).length) / 2;
    if (wordCount > 50) score += 0.1;

    // Command usage
    if (input.startsWith('/')) score += 0.15;

    return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Determine reason for keeping this memory
 * Used in consolidation decisions
 */
function determineReasonKept(importance, tags) {
    if (importance >= 0.8) return 'high_importance';
    if (tags.includes('core_value') || tags.includes('identity') || tags.includes('sp4_philosophy')) {
        return 'core_value';
    }
    if (tags.includes('breakthrough') || tags.includes('solution')) {
        return 'learning_moment';
    }
    if (tags.includes('ritual') || tags.includes('command')) {
        return 'ritual';
    }
    if (tags.includes('tech') || tags.includes('code') || tags.includes('tech_development')) {
        return 'tech_solution';
    }
    if (tags.includes('emotional_heavy') || tags.includes('trauma')) {
        return 'emotional_moment';
    }
    return 'standard';
}

/**
 * Update lastUsed timestamp when memory is accessed
 * Call this whenever a memory is retrieved from storage
 * 
 * @param {Object} memoryObj - Memory object to touch
 * @returns {Object} Updated memory object
 */
export function touchMemory(memoryObj) {
    memoryObj.lastUsed = new Date().toISOString();
    return memoryObj;
}

/**
 * Adjust importance score
 * Use when memory proves useful (positive delta) or irrelevant (negative delta)
 * 
 * @param {Object} memoryObj - Memory object to adjust
 * @param {number} delta - Change in importance (-1 to +1)
 * @returns {Object} Updated memory object
 * 
 * @example
 * // Memory was successfully recalled and useful
 * adjustImportance(memory, +0.1);
 * 
 * // Memory was not relevant to query
 * adjustImportance(memory, -0.05);
 */
export function adjustImportance(memoryObj, delta) {
    memoryObj.importance = Math.max(0, Math.min(1, memoryObj.importance + delta));
    return memoryObj;
}

/**
 * Calculate memory age in days
 * Useful for pruning decisions
 */
export function getMemoryAge(memoryObj) {
    const now = new Date();
    // Support legacy WALTER entries, raw-log entries, and metadata-only entries.
    const created = new Date(memoryObj.timestamp ?? memoryObj.ts ?? memoryObj.lastUsed);
    const ageMs = now - created;
    return Math.floor(ageMs / (1000 * 60 * 60 * 24)); // days
}

/**
 * Calculate days since last use
 * Useful for identifying stale memories
 */
export function getDaysSinceLastUse(memoryObj) {
    const now = new Date();
    const lastUsed = new Date(memoryObj.lastUsed ?? memoryObj.timestamp ?? memoryObj.ts);
    const unusedMs = now - lastUsed;
    return Math.floor(unusedMs / (1000 * 60 * 60 * 24)); // days
}

/**
 * Determine if memory should be archived
 * Based on age, importance, and usage
 */
export function shouldArchive(memoryObj, thresholds = {}) {
    const {
        minAge = 180,                    // 6 months
        maxImportance = 0.3,             // Low importance
        minDaysSinceUse = 90             // 3 months unused
    } = thresholds;

    const age = getMemoryAge(memoryObj);
    const daysSinceUse = getDaysSinceLastUse(memoryObj);

    // High importance memories never auto-archive
    if (memoryObj.importance > 0.7) return false;

    // Core values never archive
    if (memoryObj.reasonKept === 'core_value') return false;

    // Archive if: old + low importance + unused
    return (
        age >= minAge &&
        memoryObj.importance <= maxImportance &&
        daysSinceUse >= minDaysSinceUse
    );
}

/**
 * Determine if memory should be pruned (deleted)
 * More aggressive than archiving
 */
export function shouldPrune(memoryObj, thresholds = {}) {
    const {
        minAge = 365,                    // 1 year
        maxImportance = 0.2,             // Very low importance
        minDaysSinceUse = 180            // 6 months unused
    } = thresholds;

    const age = getMemoryAge(memoryObj);
    const daysSinceUse = getDaysSinceLastUse(memoryObj);

    // Never prune core values or high importance
    if (memoryObj.importance > 0.5) return false;
    if (memoryObj.reasonKept === 'core_value') return false;

    // Prune if: very old + very low importance + very unused
    return (
        age >= minAge &&
        memoryObj.importance <= maxImportance &&
        daysSinceUse >= minDaysSinceUse
    );
}

/**
 * Enrich existing memory object with metadata
 * For backfilling old memories
 */
export function enrichExistingMemory(memoryObj) {
    // Calculate importance if missing
    if (memoryObj.importance === undefined) {
        const tags = memoryObj.tags || extractTags(memoryObj.user, memoryObj.agent);
        const emotions = memoryObj.emotions || detectEmotions(memoryObj.user, memoryObj.agent);
        memoryObj.importance = calculateImportance(memoryObj.user, memoryObj.agent, tags, emotions);
    }

    // Add lastUsed if missing
    if (!memoryObj.lastUsed) {
        memoryObj.lastUsed = memoryObj.timestamp;
    }

    // Add reasonKept if missing
    if (!memoryObj.reasonKept) {
        memoryObj.reasonKept = determineReasonKept(memoryObj.importance, memoryObj.tags || []);
    }

    return memoryObj;
}

export default {
    createEnrichedMemory,
    touchMemory,
    adjustImportance,
    getMemoryAge,
    getDaysSinceLastUse,
    shouldArchive,
    shouldPrune,
    enrichExistingMemory
};
