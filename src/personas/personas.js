// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: personas.js                │
// │  Layer: Core / Identity                    │
// │  Role: Persona enum & normalization        │
// │  Version: v1.4.1 (PHASE 2.1)               │
// └─────────────────────────────────────────────┘

/**
 * @module personas
 * @description
 * Centrálny zdroj pravdy pre SP4 persóny:
 * - Enum povolených hodnôt
 * - Normalizačná funkcia (oprava typov)
 * - Validácia
 * 
 * **PROBLEM SOLVED**: "glitch" vs "glitchoslav" chaos
 */

/**
 * SP4 Persona Enum (CANONICAL)
 * 
 * THESE ARE THE ONLY VALID PERSONA VALUES.
 * Any other value is a bug or typo.
 */
export const SP4_PERSONAS = {
    CORE: 'core',
    GLITCHOSLAV: 'glitchoslav',
    POPICI: 'popici',
    VALIDATOR: 'validator' // Reserved inactive diagnostics slot
};

/**
 * Array of valid persona keys (for iteration)
 */
export const VALID_PERSONAS = Object.values(SP4_PERSONAS);

/**
 * Normalize persona string (fix typos and legacy names)
 * 
 * @param {string} rawPersona - Raw persona string (possibly typo)
 * @returns {string} Normalized persona (one of SP4_PERSONAS)
 * 
 * @example
 * normalizePersona('glitch') → 'glitchoslav'
 * normalizePersona('CORE') → 'core'
 * normalizePersona('popiči') → 'popici'
 * normalizePersona('unknown') → 'core' (fallback)
 */
export function normalizePersona(rawPersona) {
    if (!rawPersona || typeof rawPersona !== 'string') {
        console.warn('[SP4_PERSONAS] Invalid persona input:', rawPersona, '→ fallback: core');
        return SP4_PERSONAS.CORE;
    }

    const normalized = rawPersona.trim().toLowerCase();

    // Direct match (fast path)
    if (VALID_PERSONAS.includes(normalized)) {
        return normalized;
    }

    // Common typos and legacy names
    const aliases = {
        'glitch': SP4_PERSONAS.GLITCHOSLAV,
        'glitchoslaw': SP4_PERSONAS.GLITCHOSLAV,
        'glitcho': SP4_PERSONAS.GLITCHOSLAV,
        'glit': SP4_PERSONAS.GLITCHOSLAV,
        'popič': SP4_PERSONAS.POPICI,
        'popiči': SP4_PERSONAS.POPICI,
        'popico': SP4_PERSONAS.POPICI,
        'popi': SP4_PERSONAS.POPICI,
        'eastern': SP4_PERSONAS.POPICI,
        'sp4_core': SP4_PERSONAS.CORE,
        'technical': SP4_PERSONAS.CORE,
        'tech': SP4_PERSONAS.CORE
    };

    if (aliases[normalized]) {
        console.log(`[SP4_PERSONAS] Normalized: "${rawPersona}" → "${aliases[normalized]}"`);
        return aliases[normalized];
    }

    // Unknown persona → fallback to CORE
    console.warn(`[SP4_PERSONAS] Unknown persona: "${rawPersona}" → fallback: core`);
    return SP4_PERSONAS.CORE;
}

/**
 * Validate persona string (strict check)
 * 
 * @param {string} persona - Persona to validate
 * @returns {boolean} True if valid
 */
export function isValidPersona(persona) {
    return VALID_PERSONAS.includes(persona);
}

/**
 * Get persona display name (human-readable)
 * 
 * @param {string} persona - Persona key
 * @returns {string} Display name
 */
export function getPersonaDisplayName(persona) {
    const displayNames = {
        [SP4_PERSONAS.CORE]: 'SP4_CORE',
        [SP4_PERSONAS.GLITCHOSLAV]: 'Glitchoslav',
        [SP4_PERSONAS.POPICI]: 'Popiči',
        [SP4_PERSONAS.VALIDATOR]: 'Validator (inactive)'
    };

    return displayNames[persona] || 'Unknown';
}

/**
 * Get persona description (one-liner)
 * 
 * @param {string} persona - Persona key
 * @returns {string} Description
 */
export function getPersonaDescription(persona) {
    const descriptions = {
        [SP4_PERSONAS.CORE]: 'Technický sprievodca, architekt, debugger',
        [SP4_PERSONAS.GLITCHOSLAV]: 'Mystický orchestrátor, boss, gatekeeper pamäte',
        [SP4_PERSONAS.POPICI]: 'Východniarsky brat z krčmy, facky realitou',
        [SP4_PERSONAS.VALIDATOR]: 'Interná diagnostics vrstva, nie hlavná runtime persona'
    };

    return descriptions[persona] || 'Unknown persona';
}

// ========== EXPORTS ==========
export default {
    SP4_PERSONAS,
    VALID_PERSONAS,
    normalizePersona,
    isValidPersona,
    getPersonaDisplayName,
    getPersonaDescription
};
