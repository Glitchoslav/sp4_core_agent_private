/**
 * 🎯 SP4 ACTION REGISTRY
 * 
 * Defines allowed actions per persona and system-wide action types.
 * 
 * @module actionRegistry
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-22
 * @version 0.11.6-alpha
 */

/**
 * Action type definitions
 * @typedef {Object} Sp4Action
 * @property {'OPEN_URL'|'SAVE_SNIPPET'|'SCHEDULE_REMINDER'|'NOTE_MEMORY'|'DEBUG_LOG'} type
 * @property {Object} payload - Action-specific data
 */

/**
 * System-wide action definitions
 */
export const ACTION_TYPES = {
    OPEN_URL: 'OPEN_URL',                   // Open URL in browser
    SAVE_SNIPPET: 'SAVE_SNIPPET',           // Save code/text snippet
    SCHEDULE_REMINDER: 'SCHEDULE_REMINDER', // Schedule future reminder
    NOTE_MEMORY: 'NOTE_MEMORY',             // Add important note to memory
    DEBUG_LOG: 'DEBUG_LOG'                  // Debug output (dev only)
};

/**
 * Per-persona action permissions
 * 
 * Philosophy:
 * - CORE: Technical actions (debug, snippets, reminders)
 * - GLITCHOSLAV: Memory & reflection (notes, deep thoughts)
 * - POPIČI: Minimal (only safe text operations)
 * - VALIDATOR: None (audit only, no execution)
 */
export const PERSONA_PERMISSIONS = {
    core: [
        ACTION_TYPES.DEBUG_LOG,
        ACTION_TYPES.SAVE_SNIPPET,
        ACTION_TYPES.SCHEDULE_REMINDER,
        ACTION_TYPES.NOTE_MEMORY
    ],
    glitchoslav: [
        ACTION_TYPES.NOTE_MEMORY,
        ACTION_TYPES.SCHEDULE_REMINDER,
        ACTION_TYPES.OPEN_URL // For spiritual/metaphysical links
    ],
    popici: [
        ACTION_TYPES.NOTE_MEMORY // Only safe text notes
    ],
    validator: [] // No actions allowed (audit mode)
};

/**
 * Action schema validation rules
 */
export const ACTION_SCHEMAS = {
    OPEN_URL: {
        required: ['url'],
        optional: [],
        validate: (payload) => {
            if (!payload.url || typeof payload.url !== 'string') {
                return { valid: false, error: 'Missing or invalid url' };
            }
            // Basic URL validation
            try {
                new URL(payload.url);
                return { valid: true };
            } catch {
                return { valid: false, error: 'Invalid URL format' };
            }
        }
    },
    SAVE_SNIPPET: {
        required: ['title', 'content'],
        optional: ['tags', 'category'],
        validate: (payload) => {
            if (!payload.title || typeof payload.title !== 'string') {
                return { valid: false, error: 'Missing or invalid title' };
            }
            if (!payload.content || typeof payload.content !== 'string') {
                return { valid: false, error: 'Missing or invalid content' };
            }
            if (payload.title.length > 200) {
                return { valid: false, error: 'Title too long (max 200 chars)' };
            }
            if (payload.content.length > 50000) {
                return { valid: false, error: 'Content too long (max 50k chars)' };
            }
            return { valid: true };
        }
    },
    SCHEDULE_REMINDER: {
        required: ['when', 'payload'],
        optional: ['type'],
        validate: (payload) => {
            if (!payload.when || typeof payload.when !== 'string') {
                return { valid: false, error: 'Missing or invalid when' };
            }
            if (!payload.payload || typeof payload.payload !== 'string') {
                return { valid: false, error: 'Missing or invalid payload' };
            }
            // Basic time validation (accept ISO8601 or relative like "2h", "1d")
            const isISO = /^\d{4}-\d{2}-\d{2}/.test(payload.when);
            const isRelative = /^\d+[smhd]$/.test(payload.when);
            if (!isISO && !isRelative) {
                return { valid: false, error: 'Invalid time format (use ISO8601 or relative like "2h", "1d")' };
            }
            return { valid: true };
        }
    },
    NOTE_MEMORY: {
        required: ['content'],
        optional: ['importance', 'category'],
        validate: (payload) => {
            if (!payload.content || typeof payload.content !== 'string') {
                return { valid: false, error: 'Missing or invalid content' };
            }
            if (payload.importance !== undefined) {
                const imp = parseInt(payload.importance);
                if (isNaN(imp) || imp < 1 || imp > 10) {
                    return { valid: false, error: 'Importance must be 1-10' };
                }
            }
            return { valid: true };
        }
    },
    DEBUG_LOG: {
        required: ['message'],
        optional: ['level'],
        validate: (payload) => {
            if (!payload.message || typeof payload.message !== 'string') {
                return { valid: false, error: 'Missing or invalid message' };
            }
            return { valid: true };
        }
    }
};

/**
 * Check if action is allowed for persona
 * 
 * @param {string} actionType - ACTION_TYPES value
 * @param {string} persona - Persona key (core, glitchoslav, popici, validator)
 * @returns {boolean} True if allowed
 */
export function isActionAllowed(actionType, persona) {
    const normalizedPersona = persona.toLowerCase();
    const allowed = PERSONA_PERMISSIONS[normalizedPersona] || [];
    return allowed.includes(actionType);
}

/**
 * Validate action payload against schema
 * 
 * @param {string} actionType - ACTION_TYPES value
 * @param {Object} payload - Action payload
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateActionPayload(actionType, payload) {
    const schema = ACTION_SCHEMAS[actionType];
    if (!schema) {
        return { valid: false, error: `Unknown action type: ${actionType}` };
    }

    // Check required fields
    for (const field of schema.required) {
        if (!(field in payload)) {
            return { valid: false, error: `Missing required field: ${field}` };
        }
    }

    // Run custom validation
    if (schema.validate) {
        return schema.validate(payload);
    }

    return { valid: true };
}

export default {
    ACTION_TYPES,
    PERSONA_PERMISSIONS,
    ACTION_SCHEMAS,
    isActionAllowed,
    validateActionPayload
};
