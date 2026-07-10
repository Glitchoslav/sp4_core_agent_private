// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: userSeed                   │
// │  Layer: Startup / Interface                │
// │  Role: User identity from onboarding       │
// │  API: loadUserSeed(), getUsername()        │
// │  Dependencies: fs                          │
// └─────────────────────────────────────────────┘

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_SEED_PATH = path.join(__dirname, '..', '..', 'data', 'user_seed.json');

/**
 * Loads user seed from data/user_seed.json
 * Returns null if file does not exist or is invalid.
 * 
 * @returns {Promise<object|null>}
 */
export async function loadUserSeed() {
    try {
        const content = await fs.readFile(USER_SEED_PATH, 'utf-8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

/**
 * Returns safe username string.
 * If no seed or missing username, returns "Unknown".
 * 
 * @returns {Promise<string>}
 */
export async function getUsername() {
    const seed = await loadUserSeed();
    return seed?.username || 'Unknown';
}

/**
 * Updates existing user seed with partial fields.
 * Merges new values with existing seed and adds updated_at timestamp.
 * 
 * @param {object} partial - Partial seed object { username?, intent?, fear? }
 * @returns {Promise<void>}
 */
export async function updateUserSeed(partial) {
    // Load existing seed (or create empty object)
    const existingSeed = await loadUserSeed() || {};

    // Merge with new values
    const updatedSeed = {
        ...existingSeed,
        ...partial,
        updated_at: new Date().toISOString()
    };

    // If this is first update and no created_at, add it
    if (!updatedSeed.created_at) {
        updatedSeed.created_at = new Date().toISOString();
    }

    // Write back to file
    await fs.writeFile(USER_SEED_PATH, JSON.stringify(updatedSeed, null, 2), 'utf-8');
}
