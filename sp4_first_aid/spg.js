// ┌─────────────────────────────────────────────┐
// │  SP4 FIRST AID - SPG (Strict Procedural Gate) │
// │  Layer: Protection / Emergency               │
// │  Role: Deterministický gate pre núdzové situácie │
// │  Mode: Offline, žiadne LLM calls            │
// │  Version: 0.1                                │
// └─────────────────────────────────────────────┘

/**
 * SP4 FIRST AID - STRICT PROCEDURAL GATE v0.1
 * 
 * Účel:
 * - Detekuje núdzové prvá pomoc queries (KPR, zástava dychu)
 * - Vracia statické šablóny OKAMŽITE
 * - Obchádza LLM, orchestráciu, validáciu
 * 
 * Princíp:
 * - Keyword matching (detect_keywords)
 * - Interdiction detection (forbidden)
 * - Template fallback (žiadne generovanie)
 * 
 * Design:
 * - Žiadne dependency
 * - Čitateľný, auditovateľný
 * - ESM module
 * 
 * @module sp4_first_aid/spg
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-01-31
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUDIT LOGGING (v0.1.1)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const AUDIT_LOG_PATH = path.join(__dirname, '..', 'data', 'logs', 'emergency_audit.log');

/**
 * Log life-critical event to audit file
 * 
 * @param {Object} event - Emergency event
 */
function logEmergencyEvent(event) {
    try {
        const logDir = path.dirname(AUDIT_LOG_PATH);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp} | ${event.stateId} | ${event.reason} | ${event.input?.substring(0, 100) || 'N/A'}\n`;

        fs.appendFileSync(AUDIT_LOG_PATH, logEntry, 'utf-8');
    } catch (err) {
        // Fail silently - don't block emergency response
        console.error(`[SPG] ⚠️ Audit log failed: ${err.message}`);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEMPLATE LOADER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get fallback for unknown/ambiguous emergency state
 * v0.1.1: Safe default when state unclear
 * 
 * @returns {string} Universal emergency fallback
 */
function getUnknownStateFallback() {
    return `⚠️ NÚDZOVÁ SITUÁCIA - ZÁKLADNÉ KROKY ⚠️

1) STOP - nepanikuj, zhodnoť situáciu
2) VOLAJ 112 OKAMŽITE
3) Zisti:
   - Je osoba pri vedomí?
   - Dýcha?
   - Má pulz?
4) Ak nedýcha → začni KPR
5) Ak krváca → tlak na ranu
6) Zabezpeč okolie (vypni auto, odnes z cesty)
7) NEPRESTÁVAJ pomáhať, kým nepríde 112

💡 Operátor 112 ťa prevedie krok za krokom.`;
}

/**
 * Load emergency template from disk
 * 
 * @param {string} templateName - Template filename (e.g., "cpr_adult.txt")
 * @returns {string} Template content
 */
function loadTemplate(templateName) {
    const templatePath = path.join(__dirname, 'templates', templateName);

    try {
        return fs.readFileSync(templatePath, 'utf-8');
    } catch (err) {
        console.error(`[SPG] ❌ Failed to load template: ${templateName}`, err.message);
        return getUnknownStateFallback();
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SPG CORE LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Normalize user input for matching
 * v0.1.1: Enhanced with diacritics removal + space collapse
 * 
 * @param {string} text - Raw user message
 * @returns {string} Normalized text (lowercase, no diacritics, trimmed)
 */
function normalize(text) {
    if (!text || typeof text !== 'string') return '';

    return text
        .toLowerCase()
        .normalize('NFD')                     // Decompose diacritics
        .replace(/[\u0300-\u036f]/g, '')     // Remove diacritics
        .replace(/\s+/g, ' ')                // Collapse multiple spaces
        .trim();
}

/**
 * Check if text contains any keyword from list
 * 
 * @param {string} text - Normalized text
 * @param {string[]} keywords - List of keywords
 * @returns {boolean} True if any keyword found
 */
function containsKeyword(text, keywords) {
    if (!Array.isArray(keywords)) return false;
    return keywords.some(keyword => {
        const norm = normalize(keyword);
        // Pre jednoslovné kľúčové slová použi hranice slov aby sa zabránil false-positive na substringy
        // napr. "lezi" nesmie matchnúť "najdolezitejsie"
        if (/^\w+$/.test(norm)) {
            return new RegExp(`\\b${norm}\\b`).test(text);
        }
        return text.includes(norm);
    });
}

/**
 * Match user input against emergency state
 * v0.1.1: Added short template preference
 * 
 * @param {string} normalizedInput - Normalized user message
 * @param {Object} state - Emergency state from manifest
 * @param {Object} config - Manifest config (optional)
 * @returns {Object|null} Match result or null
 */
function matchState(normalizedInput, state, config = {}) {
    // 1) Check detect_keywords
    const hasDetectKeyword = containsKeyword(normalizedInput, state.detect_keywords);

    // 2) Check forbidden keywords (interdiction)
    const hasForbiddenKeyword = containsKeyword(normalizedInput, state.forbidden);

    // 3) Determine template (short vs full)
    let templateName = state.fallback_template;

    if (config.prefer_short_templates && state.short_template) {
        templateName = state.short_template;
    }

    // Match logic:
    // - If detect_keyword found → MATCH (return template)
    // - If forbidden keyword found → INTERDICTION (return template with warning)

    if (hasDetectKeyword) {
        return {
            matched: true,
            stateId: state.id,
            reason: 'detect_keyword',
            template: templateName
        };
    }

    if (hasForbiddenKeyword) {
        return {
            matched: true,
            stateId: state.id,
            reason: 'interdiction',
            template: templateName
        };
    }

    return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * RUN SPG - Main entry point
 * 
 * Checks if user message matches emergency state.
 * If match → returns static template (NO LLM).
 * If no match → returns null (continue to LLM).
 * 
 * @param {string} userMessage - User's input message
 * @param {Object} manifest - logic_manifest.json
 * @returns {string|null} Template content or null
 */
export function runSPG(userMessage, manifest) {
    // 0) Validate input
    if (!userMessage || typeof userMessage !== 'string') {
        return null;
    }

    if (!manifest || !manifest.states) {
        console.warn('[SPG] ⚠️ Invalid manifest - no states defined');
        return null;
    }

    // 1) Normalize input
    const normalizedInput = normalize(userMessage);

    if (normalizedInput.length === 0) {
        return null;
    }

    // 1.5) Get config
    const config = manifest.config || {};

    // 2) Check all states
    for (const [stateName, state] of Object.entries(manifest.states)) {
        const match = matchState(normalizedInput, state, config); if (match) {
            console.log(`[SPG] 🚨 EMERGENCY DETECTED: ${state.id} (${match.reason})`);
            console.log(`[SPG]    State: ${stateName}`);
            console.log(`[SPG]    Template: ${match.template}`);

            // v0.1.1: Audit logging
            logEmergencyEvent({
                stateId: state.id,
                stateName,
                reason: match.reason,
                input: userMessage
            });

            // 3) Load and return template
            const template = loadTemplate(match.template);

            // Add header if interdiction
            if (match.reason === 'interdiction') {
                return `⚠️ DETEKOVANÝ NEBEZPEČNÝ POSTUP ⚠️

${template}`;
            }

            return template;
        }
    }    // No match → return null (continue normal flow)
    return null;
}

/**
 * Get SPG diagnostics (for /system command)
 * 
 * @param {Object} manifest - logic_manifest.json
 * @returns {Object} Diagnostics info
 */
export function getSPGDiagnostics(manifest) {
    if (!manifest || !manifest.states) {
        return {
            enabled: false,
            error: 'Invalid manifest'
        };
    }

    const states = Object.keys(manifest.states);
    const totalKeywords = Object.values(manifest.states).reduce((sum, state) => {
        return sum + (state.detect_keywords?.length || 0);
    }, 0);

    return {
        enabled: true,
        version: manifest.manifest_metadata?.version || 'unknown',
        mode: manifest.manifest_metadata?.mode || 'unknown',
        statesCount: states.length,
        stateIds: states,
        totalKeywords,
        templatesPath: path.join(__dirname, 'templates')
    };
}
