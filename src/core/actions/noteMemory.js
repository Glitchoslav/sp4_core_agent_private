/**
 * 📝 NOTE_MEMORY Action Handler
 * 
 * Adds important note directly to memory with high priority.
 * 
 * @module actions/noteMemory
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-22
 */

import { addLogEntry } from '../../../memory.js';

/**
 * Execute NOTE_MEMORY action
 * 
 * @param {Object} payload - { content: string, importance?: number (1-10), category?: string }
 * @param {Object} context - { persona: string, userMessage: string }
 * @returns {Promise<Object>} { success: boolean, result?: any, error?: string }
 */
export async function executeNoteMemory(payload, context = {}) {
    const { content, importance = 5, category = 'general' } = payload;
    const { persona = 'unknown', userMessage = '' } = context;

    try {
        // Create metadata for memory entry
        const metadata = {
            type: 'agent_note',
            importance: parseInt(importance),
            category,
            source: 'action_layer',
            persona,
            timestamp: new Date().toISOString()
        };

        // Add to memory with special marker
        const notePrefix = `[${persona.toUpperCase()} NOTE - Importance: ${importance}/10]`;
        const fullNote = `${notePrefix}\n${content}`;

        await addLogEntry(
            userMessage || '[ACTION: NOTE_MEMORY]',
            fullNote,
            persona,
            metadata
        );

        console.log(`📝 [${persona.toUpperCase()}] Memory note added (importance: ${importance}/10)`);
        console.log(`   📋 Category: ${category}`);
        console.log(`   💬 Content preview: ${content.substring(0, 80)}...`);

        return {
            success: true,
            result: {
                content: fullNote,
                metadata,
                timestamp: metadata.timestamp
            }
        };
    } catch (error) {
        console.error(`❌ [NOTE_MEMORY] Failed to add note: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

export default executeNoteMemory;
