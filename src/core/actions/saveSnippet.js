/**
 * 💾 SAVE_SNIPPET Action Handler
 * 
 * Saves code/text snippet to data/snippets/ directory.
 * 
 * @module actions/saveSnippet
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-22
 */

import fs from 'fs/promises';
import path from 'path';
import { SNIPPETS_DIR } from '../../../config/paths.js';

/**
 * Ensure snippets directory exists
 */
async function ensureSnippetsDir() {
    try {
        await fs.access(SNIPPETS_DIR);
    } catch {
        await fs.mkdir(SNIPPETS_DIR, { recursive: true });
        console.log(`📁 Created snippets directory: ${SNIPPETS_DIR}`);
    }
}

/**
 * Generate safe filename from title
 * 
 * @param {string} title - Snippet title
 * @returns {string} Safe filename
 */
function generateFilename(title) {
    const safe = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 50);

    const timestamp = Date.now();
    return `${safe}_${timestamp}.txt`;
}

/**
 * Execute SAVE_SNIPPET action
 * 
 * @param {Object} payload - { title: string, content: string, tags?: string[], category?: string }
 * @param {Object} context - { persona: string, userMessage: string }
 * @returns {Promise<Object>} { success: boolean, result?: any, error?: string }
 */
export async function executeSaveSnippet(payload, context = {}) {
    const { title, content, tags = [], category = 'general' } = payload;
    const { persona = 'unknown' } = context;

    try {
        await ensureSnippetsDir();

        const filename = generateFilename(title);
        const filepath = path.join(SNIPPETS_DIR, filename);

        // Create snippet metadata
        const metadata = {
            title,
            category,
            tags,
            persona,
            created: new Date().toISOString(),
            filename
        };

        // Format snippet file
        const snippetContent = `# ${title}

**Category:** ${category}
**Tags:** ${tags.join(', ') || 'none'}
**Created by:** ${persona.toUpperCase()}
**Date:** ${metadata.created}

---

${content}
`;

        await fs.writeFile(filepath, snippetContent, 'utf8');

        console.log(`💾 [${persona.toUpperCase()}] Saved snippet: ${title}`);
        console.log(`   📁 Path: ${filepath}`);

        // Also save to index file (for easy browsing)
        const indexPath = path.join(SNIPPETS_DIR, '_index.json');
        let index = [];
        try {
            const indexData = await fs.readFile(indexPath, 'utf8');
            index = JSON.parse(indexData);
        } catch {
            // Index doesn't exist yet, start fresh
        }

        index.push(metadata);
        await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');

        return {
            success: true,
            result: {
                filepath,
                filename,
                metadata
            }
        };
    } catch (error) {
        console.error(`❌ [SAVE_SNIPPET] Failed to save: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

export default executeSaveSnippet;
