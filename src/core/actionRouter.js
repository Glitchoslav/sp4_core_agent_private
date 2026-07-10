/**
 * 🎯 SP4 ACTION ROUTER
 * 
 * Central action dispatcher - validates and executes actions from agent responses.
 * 
 * Pipeline:
 * 1. Detect action JSON in LLM response
 * 2. Validate action type and payload
 * 3. Check persona permissions
 * 4. Execute action handler
 * 5. Log result
 * 
 * @module actionRouter
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-22
 * @version 0.11.6-alpha
 */

import {
    ACTION_TYPES,
    isActionAllowed,
    validateActionPayload
} from './actionRegistry.js';

import { executeNoteMemory } from './actions/noteMemory.js';
import { executeOpenUrl } from './actions/openUrl.js';
import { executeSaveSnippet } from './actions/saveSnippet.js';
import { executeScheduleReminder } from './actions/scheduleReminder.js';

/**
 * Action handler registry
 */
const ACTION_HANDLERS = {
    [ACTION_TYPES.OPEN_URL]: executeOpenUrl,
    [ACTION_TYPES.SAVE_SNIPPET]: executeSaveSnippet,
    [ACTION_TYPES.NOTE_MEMORY]: executeNoteMemory,
    [ACTION_TYPES.SCHEDULE_REMINDER]: executeScheduleReminder,
    [ACTION_TYPES.DEBUG_LOG]: async (payload) => {
        console.log(`🐛 [DEBUG_LOG] ${payload.message}`);
        return { success: true, result: { logged: true } };
    }
};

/**
 * Extract action JSON from LLM response
 * 
 * Looks for patterns like:
 * - {"action":"SAVE_SNIPPET",...}
 * - ```json\n{"action":...}\n```
 * - Action: {"type":"OPEN_URL",...}
 * 
 * @param {string} responseText - Full LLM response
 * @returns {Array<Object>} Array of detected actions
 */
export function extractActionsFromResponse(responseText) {
    const actions = [];

    // Pattern 1: Direct JSON object with "action" or "type" key
    const jsonPattern = /\{[^}]*"(?:action|type)"\s*:\s*"([A-Z_]+)"[^}]*\}/g;
    let match;

    while ((match = jsonPattern.exec(responseText)) !== null) {
        try {
            const jsonStr = match[0];
            const parsed = JSON.parse(jsonStr);

            // Normalize: support both "action" and "type" keys
            const actionType = parsed.action || parsed.type;
            // Use nested payload if exists, otherwise copy all fields except action/type
            const payload = parsed.payload || (() => {
                const p = { ...parsed };
                delete p.action;
                delete p.type;
                return p;
            })();

            actions.push({
                type: actionType,
                payload,
                raw: jsonStr
            });
        } catch (e) {
            // Invalid JSON, skip
        }
    }

    // Pattern 2: Code fence with json
    const codeFencePattern = /```json\s*(\{[\s\S]*?\})\s*```/g;
    while ((match = codeFencePattern.exec(responseText)) !== null) {
        try {
            const parsed = JSON.parse(match[1]);
            const actionType = parsed.action || parsed.type;
            if (actionType) {
                // Use nested payload if exists, otherwise copy all fields except action/type
                const payload = parsed.payload || (() => {
                    const p = { ...parsed };
                    delete p.action;
                    delete p.type;
                    return p;
                })();

                actions.push({
                    type: actionType,
                    payload,
                    raw: match[1]
                });
            }
        } catch (e) {
            // Invalid JSON, skip
        }
    }

    return actions;
}

/**
 * Validate action against persona permissions and schema
 * 
 * @param {Object} action - { type: string, payload: Object }
 * @param {string} persona - Persona key
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateAction(action, persona) {
    const { type, payload } = action;

    // Check if action type exists
    if (!ACTION_TYPES[type]) {
        return {
            valid: false,
            error: `Unknown action type: ${type}`
        };
    }

    // Check persona permissions
    if (!isActionAllowed(type, persona)) {
        return {
            valid: false,
            error: `Action ${type} not allowed for persona ${persona.toUpperCase()}`
        };
    }

    // Validate payload schema
    const schemaValidation = validateActionPayload(type, payload);
    if (!schemaValidation.valid) {
        return {
            valid: false,
            error: `Schema validation failed: ${schemaValidation.error}`
        };
    }

    return { valid: true };
}

/**
 * Execute validated action
 * 
 * @param {Object} action - { type: string, payload: Object }
 * @param {Object} context - { persona: string, userMessage: string }
 * @returns {Promise<Object>} { success: boolean, result?: any, error?: string }
 */
export async function executeAction(action, context = {}) {
    const { type, payload } = action;
    const handler = ACTION_HANDLERS[type];

    if (!handler) {
        console.warn(`⚠️  No handler implemented for action: ${type}`);
        return {
            success: false,
            error: `Action ${type} not implemented yet`
        };
    }

    try {
        const result = await handler(payload, context);
        return result;
    } catch (error) {
        console.error(`❌ Action execution failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Process all actions from LLM response
 * 
 * Main pipeline entry point.
 * 
 * @param {string} responseText - Full LLM response
 * @param {Object} context - { persona: string, userMessage: string }
 * @returns {Promise<Object>} { actionsFound: number, executed: number, results: Array }
 */
export async function processResponseActions(responseText, context = {}) {
    const { persona = 'unknown' } = context;

    // Step 1: Extract actions from response
    const detectedActions = extractActionsFromResponse(responseText);

    if (detectedActions.length === 0) {
        // No actions found, normal response
        return {
            actionsFound: 0,
            executed: 0,
            results: []
        };
    }

    console.log(`🎯 [ACTION ROUTER] Detected ${detectedActions.length} action(s) from ${persona.toUpperCase()}`);

    const results = [];

    // Step 2: Validate and execute each action
    for (const action of detectedActions) {
        console.log(`   🔍 Validating: ${action.type}`);

        // Validate
        const validation = validateAction(action, persona);
        if (!validation.valid) {
            console.warn(`   ❌ Validation failed: ${validation.error}`);
            results.push({
                action: action.type,
                success: false,
                error: validation.error
            });
            continue;
        }

        // Execute
        console.log(`   ✅ Executing: ${action.type}`);
        const executionResult = await executeAction(action, context);

        results.push({
            action: action.type,
            success: executionResult.success,
            result: executionResult.result,
            error: executionResult.error
        });

        if (executionResult.success) {
            console.log(`   ✅ Success: ${action.type}`);
        } else {
            console.warn(`   ❌ Failed: ${action.type} - ${executionResult.error}`);
        }
    }

    const executedCount = results.filter(r => r.success).length;

    return {
        actionsFound: detectedActions.length,
        executed: executedCount,
        results
    };
}

export default {
    extractActionsFromResponse,
    validateAction,
    executeAction,
    processResponseActions
};
