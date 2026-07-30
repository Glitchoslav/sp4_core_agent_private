// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: llmRouter                  │
// │  Layer: Core / LLM Engine                  │
// │  Role: Smart routing: Ollama → Cloud       │
// │  Mission: OLLAMA_TIMEOUT_FIX_v1            │
// │  API: sp4LlmCall(options)                  │
// └─────────────────────────────────────────────┘

/**
 * 🔥 LLM ROUTER v1.0 - MISSION: OLLAMA_TIMEOUT_FIX_v1
 * 
 * Smart routing system with fallback logic:
 * 1. Try Ollama (local-first)
 * 2. If Ollama fails → Cloud LLM (GROQ)
 * 3. If Cloud unavailable → Error
 * 
 * Supported preferences:
 * - local-first (default) - Try Ollama, fallback to cloud
 * - local-only - Only Ollama, fail if unavailable
 * - cloud-only - Skip Ollama, use cloud directly
 * 
 * @module llmRouter
 */

import * as cloudLLM from '../../cloudLLM.js';
import { recordEpoch } from '../core/epochKeeper.js';
import { runtimeLog, runtimeWarn } from '../core/runtimeLogging.js';
import { callOllama, getOllamaHealthStatus } from './ollamaClient.js';

const USE_CLOUD_FALLBACK = process.env.USE_CLOUD_FALLBACK === 'true'; // Default: false

/**
 * Poradný consult SP4 AI Firewallu pred cloud fallbackom.
 * Nikdy neblokuje ani nehádže — len zaloguje odporúčaný model/cenu.
 * SP4KULT v cloude používa len GROQ, takže odporúčanie sa zatiaľ NEVYNUCUJE.
 */
async function logFirewallAdvice(prompt, priority = 'normal') {
    try {
        const advice = await cloudLLM.consultFirewall(prompt, { priority });
        if (advice) {
            runtimeLog(`🛡️ Firewall odporúča ${advice.provider}/${advice.model} (~$${advice.estimatedCost}, ${advice.decision})`);
        }
    } catch (_) {
        // advisory only
    }
}

/**
 * 🎯 SMART LLM CALL - Main entry point
 * 
 * Routes LLM requests based on preference and availability.
 * Handles fallback logic automatically.
 * 
 * @param {Object} options - LLM request options
 * @param {string} options.preference - Routing preference (local-first | local-only | cloud-only)
 * @param {string} options.model - Model name (for Ollama)
 * @param {string} options.prompt - User prompt
 * @param {string} options.system - System prompt
 * @param {number} options.temperature - Temperature
 * @param {number} options.num_predict - Max tokens
 * @param {string[]} options.stop - Stop sequences
 * 
 * @returns {Promise<Object>} Result:
 *   - ok: boolean
 *   - text: string - Response text
 *   - engine: string - Which engine was used (ollama | cloud-fallback | cloud-only)
 *   - durationMs: number
 *   - localError: string (if fallback occurred)
 */
export async function sp4LlmCall(options) {
    const {
        preference = 'local-first',
        model,
        prompt,
        system = '',
        temperature = 0.7,
        num_predict = 800, // v1.4.3: 800 default (was 4096 → caused 60s timeout on llama3:8b at ~20tok/s)
        stop = [],
        policy = null,
        forceLocal = false,
        actorType = 'automation', // DEC-004: default for non-interactive call sites
        requestId,
        ...rest
    } = options;

    const localOnlyRequired = preference === 'local-only' ||
        forceLocal === true ||
        policy?.forceLocal === true ||
        process.env.SP4_TEST === 'true';
    const effectivePreference = localOnlyRequired ? 'local-only' : preference;

    // 🔍 VALIDATE INPUT
    if (!prompt) {
        return {
            ok: false,
            error: 'Missing prompt',
            engine: 'none'
        };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📍 MODE 1: LOCAL-FIRST (default)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (effectivePreference === 'local-first') {
        // 🛡️ Check if Ollama is marked unhealthy
        const healthStatus = getOllamaHealthStatus();

        if (healthStatus.unhealthy && USE_CLOUD_FALLBACK && cloudLLM.isCloudLLMAvailable()) {
            runtimeWarn(`⚠️ Ollama UNHEALTHY (cooldown: ${Math.round(healthStatus.cooldownMs / 1000)}s) - skipping to cloud`);
            await logFirewallAdvice(prompt);

            try {
                const text = await cloudLLM.askGroqLLM(prompt, system, { temperature, num_predict, stop, policy, actorType, requestId });
                return {
                    ok: true,
                    text,
                    engine: 'cloud-preemptive',
                    durationMs: 0, // Cloud doesn't track duration yet
                    reason: 'ollama_unhealthy'
                };
            } catch (err) {
                return {
                    ok: false,
                    error: `Cloud fallback failed: ${err.message}`,
                    engine: 'cloud-fallback',
                    localError: 'OLLAMA_UNHEALTHY'
                };
            }
        }

        // 🔥 TRY OLLAMA FIRST
        runtimeLog(`🎯 Vybraný model: ${model} (mode: ${effectivePreference})`);
        const ollamaResult = await callOllama({
            model,
            prompt,
            system,
            temperature,
            num_predict,
            stop,
            ...rest
        });

        if (ollamaResult.ok) {
            // ✅ SUCCESS - return Ollama response
            return {
                ...ollamaResult,
                engine: 'ollama'
            };
        }

        // ❌ OLLAMA FAILED - try cloud fallback
        runtimeWarn(`⚠️ Ollama failed (${ollamaResult.error})`);

        if (!USE_CLOUD_FALLBACK) {
            return {
                ok: false,
                error: ollamaResult.error,
                engine: 'ollama',
                localError: ollamaResult.error
            };
        }

        if (!cloudLLM.isCloudLLMAvailable()) {
            console.error('❌ Cloud LLM not configured - no fallback available');
            return {
                ok: false,
                error: 'Ollama failed and cloud not available',
                engine: 'none',
                localError: ollamaResult.error
            };
        }

        // 🌐 CLOUD FALLBACK
        runtimeLog('🌐 Falling back to cloud LLM (GROQ)...');
        await logFirewallAdvice(prompt);

        try {
            const text = await cloudLLM.askGroqLLM(prompt, system, { temperature, num_predict, stop, policy, actorType, requestId });

            // 📊 LOG FALLBACK EVENT
            await recordEpoch('Cloud LLM fallback triggered', {
                model,
                localError: ollamaResult.error,
                retries: ollamaResult.retries,
                timestamp: new Date()
            }).catch(() => { });

            return {
                ok: true,
                text,
                engine: 'cloud-fallback',
                durationMs: 0,
                localError: ollamaResult.error
            };
        } catch (err) {
            console.error(`❌ Cloud fallback failed: ${err.message}`);
            return {
                ok: false,
                error: `Cloud fallback failed: ${err.message}`,
                engine: 'cloud-fallback',
                localError: ollamaResult.error
            };
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📍 MODE 2: LOCAL-ONLY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (effectivePreference === 'local-only') {
        runtimeLog(`🎯 Vybraný model: ${model} (mode: ${preference} - no fallback)`);

        const result = await callOllama({
            model,
            prompt,
            system,
            temperature,
            num_predict,
            stop,
            ...rest
        });

        return {
            ...result,
            engine: 'ollama'
        };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📍 MODE 3: CLOUD-ONLY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (effectivePreference === 'cloud-only') {
        if (!cloudLLM.isCloudLLMAvailable()) {
            return {
                ok: false,
                error: 'Cloud LLM not configured',
                engine: 'none'
            };
        }

        runtimeLog('🌐 Cloud-only mode - skipping Ollama');
        await logFirewallAdvice(prompt, 'high');

        try {
            const text = await cloudLLM.askGroqLLM(prompt, system, { temperature, num_predict, stop, policy, actorType, requestId });
            return {
                ok: true,
                text,
                engine: 'cloud-only',
                durationMs: 0
            };
        } catch (err) {
            return {
                ok: false,
                error: `Cloud LLM failed: ${err.message}`,
                engine: 'cloud-only'
            };
        }
    }

    // ❌ UNKNOWN PREFERENCE
    return {
        ok: false,
        error: `Unknown preference: ${effectivePreference}`,
        engine: 'none'
    };
}

/**
 * 📊 GET ROUTER STATS
 * 
 * Returns current router configuration and status.
 */
export function getRouterStats() {
    const healthStatus = getOllamaHealthStatus();
    const cloudAvailable = cloudLLM.isCloudLLMAvailable();

    return {
        cloudFallback: USE_CLOUD_FALLBACK,
        cloudAvailable,
        ollama: {
            unhealthy: healthStatus.unhealthy,
            consecutiveFailures: healthStatus.consecutiveFailures,
            lastHealthCheck: healthStatus.lastHealthCheck,
            cooldownMs: healthStatus.cooldownMs
        },
        modes: ['local-first', 'local-only', 'cloud-only']
    };
}

export default {
    sp4LlmCall,
    getRouterStats
};
