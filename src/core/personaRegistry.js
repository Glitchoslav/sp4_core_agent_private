/**
 * PERSONA REGISTRY (v0.10.1)
 * 
 * Centrálna registrácia všetkých SP4 person.
 * Každá persona má:
 *   - meta (definícia, pravidlá, štýl)
 *   - validate (validátor outputu)
 *   - detectVibe (optional - detekcia autenticity)
 * 
 * @module personaRegistry
 */

// Canonical identity source lives in workspace-level identity/.
import { CORE_PERSONA } from '../../../identity/personas/core/persona.core.js';
import { detectCoreVibe, validateCoreOutput } from '../../../identity/personas/core/validator.core.js';
import { detectGlitchoslavVibe, GLITCHOSLAV_PERSONA, validateGlitchoslavOutput } from '../../../identity/personas/glitchoslav/persona.glitchoslav.js';
import { POPICI_PERSONA } from '../../../identity/personas/popici/persona.popici.js';
import { detectPopiciVibe, validatePopiciOutput } from '../../../identity/personas/popici/validator.popici.js';
import { VALIDATOR_PERSONA } from '../../../identity/personas/validator/persona.validator.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERSONA REGISTRY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PERSONA_REGISTRY = {
    // ========================================
    // 🌀 GLITCHOSLAV (v0.9.0 - COMPLETE)
    // ========================================
    glitchoslav: {
        meta: GLITCHOSLAV_PERSONA,
        validate: validateGlitchoslavOutput,
        detectVibe: detectGlitchoslavVibe,
        source: 'identity/personas/glitchoslav/persona.glitchoslav.js',
        // 🔥 v0.10.2: META-LAYER - Behavioral flags
        role: 'oracle',           // oracle, brain, pub_bro, tool
        safeDefault: true,        // Can be used as fallback persona
        supportsFire: true,       // Can handle Fire Mode
        allowsSwearing: true      // Can use profanity/slang
    },

    // ========================================
    // 💥 POPIČI KOKOT (v0.10.1 - MIGRATED)
    // ========================================
    popici: {
        meta: POPICI_PERSONA,
        validate: validatePopiciOutput,
        detectVibe: detectPopiciVibe,
        source: 'identity/personas/popici/persona.popici.js',
        // 🔥 v0.10.2: META-LAYER
        role: 'pub_bro',          // Krčmový brat
        safeDefault: false,       // NOT safe for default fallback (explicit mode only)
        supportsFire: true,       // Best Fire Mode handler
        allowsSwearing: true      // Core feature
    },

    // ========================================
    // 🔥 CORE (v0.10.1 - MIGRATED)
    // ========================================
    core: {
        meta: CORE_PERSONA,
        validate: validateCoreOutput,
        detectVibe: detectCoreVibe,
        source: 'identity/personas/core/persona.core.js',
        // 🔥 v0.10.2: META-LAYER
        role: 'brain',            // Technický mozog
        safeDefault: true,        // Primary fallback
        supportsFire: true,       // Supports Fire Mode (chirurgická pravda)
        allowsSwearing: false     // Strictly professional
    },

    // ========================================
    // 🤖 VALIDATOR (INACTIVE DIAGNOSTICS SLOT)
    // ========================================
    validator: {
        meta: VALIDATOR_PERSONA,
        validate: null,
        detectVibe: null,
        source: 'identity/personas/validator/persona.validator.js',
        status: 'inactive_diagnostics_slot',
        role: 'diagnostics',
        safeDefault: false,
        supportsFire: false,
        allowsSwearing: false,
        routable: false
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Získa personu z registry
 * 
 * @param {string} key - Kľúč persony (glitchoslav, popici, core, ...)
 * @returns {Object|null} - Persona object alebo null ak neexistuje
 */
export function getPersona(key) {
    if (!key) return null;

    const normalizedKey = key.toLowerCase();
    return PERSONA_REGISTRY[normalizedKey] || null;
}

/**
 * Enforcement validator pre danú personu.
 * Táto vrstva sa používa v runtime na sanitizáciu/fallback, nie iba na logging.
 * v0.11.1: Added context parameter for context-aware validation
 * 
 * @param {string} text - Text na validáciu
 * @param {string} personaKey - Kľúč persony
 * @param {object} context - Kontextové informácie (userInput, mode, ...)
 * @returns {Object} - { valid: boolean, reason: string }
 */
export function validatePersonaOutput(text, personaKey, context = {}) {
    const persona = getPersona(personaKey);

    if (!persona) {
        return {
            valid: false,
            reason: `Unknown persona: ${personaKey}`
        };
    }

    if (!persona.validate) {
        return {
            valid: true,
            reason: `No validator for persona: ${personaKey}`
        };
    }

    // v0.11.1: Pass context to validator (for CORE Kefyk exception)
    return persona.validate(text, context);
}

/**
 * Zoznam všetkých dostupných person
 * 
 * @returns {Array<string>} - Array kľúčov person
 */
export function listPersonas() {
    return Object.keys(PERSONA_REGISTRY);
}

/**
 * Zistí, či je persona migrovaná (má vlastný modul)
 * 
 * @param {string} personaKey - Kľúč persony
 * @returns {boolean} - true ak je migrovaná
 */
export function isMigrated(personaKey) {
    const persona = getPersona(personaKey);
    if (!persona) return false;

    return !persona.source.includes('(legacy)');
}

/**
 * Debugging info - zobraz status všetkých person
 */
export function getRegistryStatus() {
    const personas = listPersonas();
    const status = {};

    for (const key of personas) {
        const persona = getPersona(key);
        status[key] = {
            migrated: isMigrated(key),
            hasValidator: !!persona.validate,
            hasVibeDetector: !!persona.detectVibe,
            source: persona.source,
            status: persona.status || 'active',
            routable: persona.routable !== false,
            // v0.10.2: Meta-layer info
            role: persona.role || 'unknown',
            safeDefault: persona.safeDefault || false,
            supportsFire: persona.supportsFire || false,
            allowsSwearing: persona.allowsSwearing || false
        };
    }

    return status;
}

/**
 * 🔥 v0.10.2: Get safe default persona (pre fallback)
 * 
 * @returns {string} - Kľúč safe default persony (usually 'core')
 */
export function getSafeDefaultPersona() {
    const personas = listPersonas();
    for (const key of personas) {
        const persona = getPersona(key);
        if (persona.safeDefault === true) {
            return key;
        }
    }
    return 'core'; // Ultimate fallback
}

/**
 * 🔥 v0.10.2: Get personas that support Fire Mode
 * 
 * @returns {Array<string>} - Array kľúčov person podporujúcich Fire Mode
 */
export function getFireModePersonas() {
    const personas = listPersonas();
    return personas.filter(key => {
        const persona = getPersona(key);
        return persona.supportsFire === true;
    });
}

/**
 * 🔥 v0.10.2: Filter personas podľa role
 * 
 * @param {string} role - oracle, brain, pub_bro, tool
 * @returns {Array<string>} - Array kľúčov matchujúcich person
 */
export function getPersonasByRole(role) {
    const personas = listPersonas();
    return personas.filter(key => {
        const persona = getPersona(key);
        return persona.role === role;
    });
}

/**
 * 🔥 v0.10.2: Check if persona allows swearing
 * 
 * @param {string} personaKey - Kľúč persony
 * @returns {boolean} - true ak dovolené
 */
export function allowsSwearing(personaKey) {
    const persona = getPersona(personaKey);
    return persona?.allowsSwearing === true;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default {
    PERSONA_REGISTRY,
    getPersona,
    validatePersonaOutput,
    listPersonas,
    isMigrated,
    getRegistryStatus,
    // v0.10.2: Meta-layer helpers
    getSafeDefaultPersona,
    getFireModePersonas,
    getPersonasByRole,
    allowsSwearing
};
