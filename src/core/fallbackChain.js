// fallbackChain.js
// 🔥 WALTER'S FALLBACK CHAIN SYSTEM v1.0
// 3-layer protection: Primary → Fallback → Emergency Default
// Copyright (c) 2025 BAD Labs (thearch.ai) + SP4 Community
// 
// Purpose: Prevents crashes when LLM fails, ensures robustness

import { askLocalLLM, MODEL_REGISTRY, pickModelForTask } from '../../sp4os/llmLocal.js';

/**
 * 🔥 FALLBACK CHAIN - Execute request with automatic fallback
 * 
 * Flow:
 * 1. Try primary model (persona-based or task-based)
 * 2. If fails → try fallback model (from MODEL_REGISTRY)
 * 3. If fails → try emergency model (llama3:8b)
 * 4. If fails → generate safe default response
 * 
 * @param {Object} options - Request options
 * @param {string} options.userInput - User's message
 * @param {string} options.systemPrompt - System prompt
 * @param {string} options.persona - Persona mode (core, glitchoslav, popici)
 * @param {string} options.task - Legacy task type (optional)
 * @param {number} options.timeout - Request timeout in ms (default: 30000)
 * @param {Object} options.modelOptions - Ollama model options (num_predict, temperature, stop)
 * @returns {Promise<Object>} Response with metadata
 */
export async function executeWithFallback(options) {
    const {
        userInput,
        systemPrompt,
        persona,
        task,
        timeout = 30000,
        modelOptions = {} // NEW: accept model options
    } = options;

    const startTime = Date.now();
    const attempts = [];

    // 🎯 LAYER 1: PRIMARY MODEL
    const primaryModel = pickModelForTask({ persona, userInput, task });

    try {
        console.log(`🎯 LAYER 1: Trying primary model (${primaryModel})...`);

        const response = await withTimeout(
            askLocalLLM(userInput, systemPrompt, primaryModel, modelOptions),
            timeout
        );

        if (isValidResponse(response)) {
            const totalTime = Date.now() - startTime;
            console.log(`✅ PRIMARY SUCCESS: ${primaryModel} (${totalTime}ms)`);

            return {
                success: true,
                response,
                model: primaryModel,
                layer: 'primary',
                attempts: 1,
                totalTime,
                metadata: {
                    primaryModel,
                    failedAttempts: []
                }
            };
        }

        // Invalid response → mark as failed
        console.warn(`⚠️  PRIMARY INVALID: ${primaryModel} (response failed validation)`);
        attempts.push({
            model: primaryModel,
            layer: 'primary',
            reason: 'invalid_response',
            response: response?.substring(0, 100) || 'null'
        });

    } catch (error) {
        console.error(`❌ PRIMARY FAILED: ${primaryModel} - ${error.message}`);
        attempts.push({
            model: primaryModel,
            layer: 'primary',
            reason: error.message,
            error: error.toString()
        });
    }

    // 🛡️ LAYER 2: FALLBACK MODEL
    const fallbackModel = getFallbackModel(persona, task);

    if (fallbackModel && fallbackModel !== primaryModel) {
        try {
            console.log(`🛡️  LAYER 2: Trying fallback model (${fallbackModel})...`);

            const response = await withTimeout(
                askLocalLLM(userInput, systemPrompt, fallbackModel, modelOptions),
                timeout * 0.8 // Shorter timeout for fallback
            );

            if (isValidResponse(response)) {
                const totalTime = Date.now() - startTime;
                console.log(`✅ FALLBACK SUCCESS: ${fallbackModel} (${totalTime}ms)`);

                return {
                    success: true,
                    response,
                    model: fallbackModel,
                    layer: 'fallback',
                    attempts: attempts.length + 1,
                    totalTime,
                    metadata: {
                        primaryModel,
                        fallbackModel,
                        failedAttempts: attempts
                    }
                };
            }

            console.warn(`⚠️  FALLBACK INVALID: ${fallbackModel}`);
            attempts.push({
                model: fallbackModel,
                layer: 'fallback',
                reason: 'invalid_response',
                response: response?.substring(0, 100) || 'null'
            });

        } catch (error) {
            console.error(`❌ FALLBACK FAILED: ${fallbackModel} - ${error.message}`);
            attempts.push({
                model: fallbackModel,
                layer: 'fallback',
                reason: error.message,
                error: error.toString()
            });
        }
    }

    // 🚨 LAYER 3: EMERGENCY MODEL (llama3:8b - most stable)
    const emergencyModel = 'llama3:8b';

    if (emergencyModel !== primaryModel && emergencyModel !== fallbackModel) {
        try {
            console.log(`🚨 LAYER 3: Trying emergency model (${emergencyModel})...`);

            const response = await withTimeout(
                askLocalLLM(userInput, systemPrompt, emergencyModel, modelOptions),
                timeout * 0.6 // Even shorter timeout
            );

            if (isValidResponse(response)) {
                const totalTime = Date.now() - startTime;
                console.log(`✅ EMERGENCY SUCCESS: ${emergencyModel} (${totalTime}ms)`);

                return {
                    success: true,
                    response,
                    model: emergencyModel,
                    layer: 'emergency',
                    attempts: attempts.length + 1,
                    totalTime,
                    metadata: {
                        primaryModel,
                        fallbackModel,
                        emergencyModel,
                        failedAttempts: attempts
                    }
                };
            }

            console.warn(`⚠️  EMERGENCY INVALID: ${emergencyModel}`);
            attempts.push({
                model: emergencyModel,
                layer: 'emergency',
                reason: 'invalid_response',
                response: response?.substring(0, 100) || 'null'
            });

        } catch (error) {
            console.error(`❌ EMERGENCY FAILED: ${emergencyModel} - ${error.message}`);
            attempts.push({
                model: emergencyModel,
                layer: 'emergency',
                reason: error.message,
                error: error.toString()
            });
        }
    }

    // 💀 LAYER 4: SAFE DEFAULT RESPONSE (last resort)
    console.error('💀 ALL MODELS FAILED - Generating safe default response');

    const defaultResponse = generateDefaultResponse(userInput, persona);
    const totalTime = Date.now() - startTime;

    return {
        success: false,
        response: defaultResponse,
        model: 'default',
        layer: 'default',
        attempts: attempts.length,
        totalTime,
        metadata: {
            primaryModel,
            fallbackModel,
            emergencyModel,
            failedAttempts: attempts,
            allModelsFailed: true
        }
    };
}

/**
 * Get fallback model for given persona/task
 * @private
 */
function getFallbackModel(persona, task) {
    if (persona) {
        const personaModels = MODEL_REGISTRY[persona.toLowerCase()];
        if (personaModels?.fallback) {
            return personaModels.fallback;
        }
    }

    if (task) {
        const taskModels = MODEL_REGISTRY[task];
        if (taskModels?.fallback) {
            return taskModels.fallback;
        }
    }

    // Default fallback
    return MODEL_REGISTRY.core?.fallback || 'llama3:8b';
}

/**
 * 🔍 RESPONSE VALIDATION - Check if response is valid
 * 
 * Criteria:
 * - Not null/undefined/empty
 * - Minimum length (10 chars)
 * - No error messages
 * - No JSON parsing errors (if response looks like JSON)
 * 
 * @param {string} response - LLM response to validate
 * @returns {boolean} True if valid
 */
export function isValidResponse(response) {
    // Null/undefined check
    if (!response) {
        return false;
    }

    // String conversion
    const text = typeof response === 'string' ? response : String(response);

    // Empty/whitespace check
    if (text.trim().length === 0) {
        return false;
    }

    // Minimum length check (10 characters)
    if (text.length < 10) {
        return false;
    }

    // Error message detection
    const errorPatterns = [
        /error/i,
        /failed/i,
        /exception/i,
        /timeout/i,
        /connection refused/i,
        /500 internal server/i,
        /502 bad gateway/i,
        /503 service unavailable/i,
        /model not found/i,
        /no response/i
    ];

    if (errorPatterns.some(pattern => pattern.test(text))) {
        return false;
    }

    // JSON format check (if looks like JSON, must be valid)
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
            JSON.parse(text);
        } catch {
            console.warn('⚠️  Response looks like JSON but fails parsing');
            return false;
        }
    }

    // All checks passed
    return true;
}

/**
 * 🚨 GENERATE SAFE DEFAULT RESPONSE
 * Last resort when all models fail
 * 
 * @param {string} userInput - User's message
 * @param {string} persona - Persona mode
 * @returns {string} Safe fallback response
 */
export function generateDefaultResponse(userInput, persona) {
    const input = userInput?.toLowerCase() || '';
    const personaLower = (persona || '').toLowerCase();

    // === PERSONA-FIRST PRIORITY ===
    // Persona-specific defaults take priority over generic question/length checks

    if (personaLower === 'popici' || personaLower === 'popiči') {
        // Popiči-style default (vulgar, dialect)
        return "Bratu, momentálne ma niečo jebe a neviem ti odpovedať. Daj mi chvíľu, šak sa to vyrieši.";
    }

    if (personaLower === 'glitchoslav' || personaLower === 'glitch') {
        // Glitchoslav-style default (mystical)
        return "V tichu počujem len šum... Hlbiny mysle sú dnes nedostupné. Vráť sa neskôr, keď sa vlny ustália.";
    }

    // === GENERIC CONTEXT-AWARE DEFAULTS (for CORE or unknown persona) ===

    if (input.includes('?') || input.includes('prečo') || input.includes('ako')) {
        // Question detected
        return "Momentálne mám technický problém s odpoveďou. Skús to prosím o chvíľu znova, alebo preformuuj otázku jednoduchšie.";
    }

    if (input.length > 200) {
        // Long message
        return "Tvoja správa je dosť komplexná a momentálne nie som v optimálnej forme na odpoveď. Daj mi chvíľu a skús to znova.";
    }

    // Generic safe default (CORE or unknown)
    return "Prepáč, ale momentálne mám problém s generovaním odpovede. Skús to prosím neskôr.";
}

/**
 * Timeout wrapper for promises
 * @private
 */
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
        )
    ]);
}

/**
 * 📊 Get fallback chain statistics
 * @returns {Object} Stats about fallback usage
 */
export function getFallbackStats() {
    // TODO: Implement tracking (store in memory or separate stats file)
    return {
        totalRequests: 0,
        primarySuccesses: 0,
        fallbackSuccesses: 0,
        emergencySuccesses: 0,
        defaults: 0,
        averageAttempts: 0,
        mostFailedModel: null
    };
}

// Export all public functions
export default {
    executeWithFallback,
    isValidResponse,
    generateDefaultResponse,
    getFallbackStats
};
