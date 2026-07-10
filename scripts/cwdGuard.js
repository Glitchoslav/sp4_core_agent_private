// ┌─────────────────────────────────────────────┐
// │  SP4 OS v1.4.2 - CWD GUARD                 │
// │  Auto-detects correct project root         │
// │  Fixes: "cd sp4_core_agent; node test.js"  │
// └─────────────────────────────────────────────┘

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find SP4 project root by traversing up the directory tree
 * Looks for package.json with name='sp4_core_agent'
 * 
 * @param {string} startDir - Directory to start search from
 * @returns {string|null} Absolute path to project root, or null if not found
 */
export function findProjectRoot(startDir = process.cwd()) {
    let dir = path.resolve(startDir);

    // Traverse up max 6 levels (prevent infinite loop)
    for (let i = 0; i < 6; i++) {
        const pkgPath = path.join(dir, 'package.json');

        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

                // Verify it's SP4 project (multiple possible names)
                const validNames = ['sp4_core_agent', 'SP4_CORE_AGENT', 'sp4-os', 'SP4-OS', 'sp4os'];
                if (validNames.includes(pkg.name)) {
                    return dir;
                }
            } catch (err) {
                // Invalid JSON, continue search
            }
        }

        const parent = path.dirname(dir);
        if (parent === dir) break; // Reached filesystem root
        dir = parent;
    }

    return null;
}

/**
 * Ensure we're in the project root (where package.json is)
 * Auto-corrects if user ran from parent or child directory
 * 
 * @returns {string} Absolute path to project root
 * 
 * @example
 * // At start of any test/script:
 * import { ensureProjectRoot } from './scripts/cwdGuard.js';
 * ensureProjectRoot();
 */
export function ensureProjectRoot() {
    const startCwd = process.cwd();
    const root = findProjectRoot(startCwd);

    if (!root) {
        // Only show warning in debug mode or if explicitly needed
        if (process.env.SP4_DEBUG === 'true') {
            console.warn('⚠️ Cannot find SP4 project root!');
            console.warn(`   Current: ${startCwd}`);
            console.warn('   Please run from folder containing package.json with name="sp4_core_agent"');
        }
        return startCwd; // Don't crash, continue with current dir
    }

    // If not in root, change to it
    if (path.resolve(startCwd) !== path.resolve(root)) {
        process.chdir(root);
        if (process.env.SP4_DEBUG === 'true') {
            console.log(`⚠️ Auto-corrected CWD: ${startCwd} → ${root}`);
        }
    }

    return root;
}

/**
 * Get relative path from project root
 * Useful for logging/debugging
 * 
 * @param {string} absolutePath - Absolute path to convert
 * @returns {string} Relative path from project root
 */
export function getRelativePath(absolutePath) {
    const root = ensureProjectRoot();
    return path.relative(root, absolutePath);
}

/**
 * Resolve path relative to project root
 * Safe alternative to process.cwd() + relative paths
 * 
 * @param {string} relativePath - Path relative to project root
 * @returns {string} Absolute path
 * 
 * @example
 * const dataPath = resolveFromRoot('data/memory.json');
 */
export function resolveFromRoot(relativePath) {
    const root = ensureProjectRoot();
    return path.join(root, relativePath);
}
