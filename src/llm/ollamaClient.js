// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: ollamaClient               │
// │  Layer: Core / LLM Engine                  │
// │  Role: Centrálny wrapper pre Ollama calls  │
// │  Mission: OLLAMA_TIMEOUT_FIX_v1            │
// │  API: callOllama(options)                  │
// └─────────────────────────────────────────────┘

/**
 * 🔥 OLLAMA CLIENT v1.0 - MISSION: OLLAMA_TIMEOUT_FIX_v1
 * 
 * Centrálny wrapper pre všetky Ollama requesty s:
 * - Konfigurovateľný timeout (env: OLLAMA_TIMEOUT_MS)
 * - Auto-retry pri timeoutoch (env: OLLAMA_MAX_RETRIES)
 * - Health tracking (OLLAMA_UNHEALTHY flag)
 * - Epoch Keeper logging
 * - Fallback na cloud engine
 * 
 * @module ollamaClient
 */

import 'dotenv/config';
import { recordEpoch } from '../core/epochKeeper.js';

// 🔧 CONFIGURATION (ENV overrides)
function ensureDefaultPort(value) {
    // Ollama default port (11434), ak URL nema explicitny port —
    // OLLAMA_HOST moze byt len host (napr. "localhost" alebo bind "0.0.0.0").
    const m = /^(https?:\/\/[^/]+)(\/.*)?$/i.exec(value);
    if (m && !/:\d+$/.test(m[1])) {
        return `${m[1]}:11434${m[2] || ''}`;
    }
    return value;
}

function normalizeHost(host) {
    const trimmed = String(host || '').trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    let value = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    // OLLAMA_HOST sa používa aj ako BIND adresa daemona (0.0.0.0 / :: / [::]),
    // napr. `OLLAMA_HOST=0.0.0.0 ollama serve`. Bind adresa nie je connect adresa
    // — pre klienta znamená localhost. Bez tohto by health check a fetch volania
    // išli na http://0.0.0.0:11434 a zlyhali ("Ollama offline" pri bežiacej Ollame).
    value = value.replace(
        /^https?:\/\/(0\.0\.0\.0|\[?::\]?)(?=:|\/|$)/i,
        'http://127.0.0.1'
    );
    return ensureDefaultPort(value);
}

function configuredHosts() {
    const raw = process.env.OLLAMA_HOSTS || process.env.OLLAMA_HOST || 'http://localhost:11434';
    const unique = [];
    for (const value of raw.split(',')) {
        const host = normalizeHost(value);
        if (host && !unique.includes(host)) unique.push(host);
    }
    return unique.length > 0 ? unique : ['http://localhost:11434'];
}

const OLLAMA_HOSTS = Object.freeze(configuredHosts());
const SECONDARY_TIMEOUT_MS = 90000;

function modelForHost(model, hostIndex) {
    if (hostIndex === 0) return model;
    if (model === 'gemma3:4b' || model === 'gemma3:12b') return model;
    if (model === 'qwen2.5:7b' || model === 'qwen2.5-coder:7b') return 'gemma3:4b';
    return 'gemma3:4b';
}

const DEFAULT_TIMEOUT_MS = process.env.OLLAMA_TIMEOUT_MS
    ? Number(process.env.OLLAMA_TIMEOUT_MS)
    : 60000; // v1.3.0: 60s default (first load can be slow)

const MAX_RETRIES = process.env.OLLAMA_MAX_RETRIES
    ? Number(process.env.OLLAMA_MAX_RETRIES)
    : 1; // 1 retry default

const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const UNHEALTHY_COOLDOWN_MS = 3 * 60 * 1000; // 3 min cooldown when unhealthy

// 🛡️ HEALTH STATE
let OLLAMA_UNHEALTHY = false;
let unhealthySince = null;
let lastHealthCheck = null;
let consecutiveFailures = 0;
let lastUsedHost = null;

/**
 * 🔥 CORE FUNCTION: Call Ollama with timeout + retry
 * 
 * @param {Object} options - Ollama request options
 * @param {string} options.model - Model name (e.g., "llama3:8b")
 * @param {string} options.prompt - User prompt
 * @param {string} options.system - System prompt (optional)
 * @param {number} options.temperature - Temperature (default: 0.7)
 * @param {number} options.num_predict - Max tokens (default: 4096)
 * @param {string[]} options.stop - Stop sequences (optional)
 * @param {boolean} options.stream - Stream mode (default: false)
 * @param {number} options.timeoutMs - Per-call timeout override (optional)
 * @param {number} options.maxRetries - Per-call retry override (optional)
 * 
 * @returns {Promise<Object>} Result object:
 *   - ok: boolean - Success flag
 *   - text: string - Response text (if ok=true)
 *   - durationMs: number - Request duration
 *   - raw: Object - Raw Ollama response
 *   - error: string - Error message (if ok=false)
 *   - retries: number - Number of retries performed
 */
export async function callOllama(options) {
    const {
        model,
        prompt,
        system = '',
        temperature = 0.7,
        num_predict = 4096,
        stop = [],
        stream = false,
        top_k = 40,
        top_p = 0.9,
        repeat_penalty = 1.1,
        penalize_newline = false,
        options: ollamaOptions = {},
        timeoutMs: requestedTimeoutMs,
        maxRetries: requestedMaxRetries,
        testMode = false, // 🔥 v1.3.2: TEST MODE flag
        ...rest
    } = options;

    const isTestMode = testMode || process.env.SP4_TEST === 'true';
    const perCallTimeoutMs = Number.isFinite(requestedTimeoutMs) && requestedTimeoutMs > 0
        ? requestedTimeoutMs
        : null;
    const effectiveMaxRetries = Number.isInteger(requestedMaxRetries) && requestedMaxRetries >= 0
        ? requestedMaxRetries
        : MAX_RETRIES;

    // 🧪 v1.3.2: TEST MODE optimizations
    let optimizedNumPredict = num_predict;
    let optimizedTimeout = DEFAULT_TIMEOUT_MS;
    let optimizedTemperature = temperature;

    if (isTestMode) {
        optimizedNumPredict = Math.min(num_predict, 256); // Max 256 tokens in test
        optimizedTimeout = 20000; // 20s timeout in test
        optimizedTemperature = Math.min(temperature, 0.4); // Lower temperature = faster
        console.log(`🧪 TEST MODE: num_predict=${optimizedNumPredict}, timeout=${optimizedTimeout}ms, temp=${optimizedTemperature}`);
    }

    // 🛡️ SANITY: Check if Ollama is marked UNHEALTHY
    if (OLLAMA_UNHEALTHY) {
        const cooldownRemaining = UNHEALTHY_COOLDOWN_MS - (Date.now() - unhealthySince);
        if (cooldownRemaining > 0) {
            console.warn(`⚠️ Ollama marked UNHEALTHY (cooldown: ${Math.round(cooldownRemaining / 1000)}s)`);
            return {
                ok: false,
                error: 'OLLAMA_UNHEALTHY',
                healthStatus: 'unhealthy',
                cooldownMs: cooldownRemaining
            };
        } else {
            // Cooldown expired, reset flag and try again
            console.log('🔄 Ollama cooldown expired, resetting UNHEALTHY flag...');
            OLLAMA_UNHEALTHY = false;
            unhealthySince = null;
            consecutiveFailures = 0;
        }
    }

    // 🔁 FINITE FALLBACK CHAIN: primary with retries, secondary once.
    let lastError = null;
    let totalRetries = 0;

    const hostChain = OLLAMA_HOSTS.slice(0, 2);
    for (let hostIndex = 0; hostIndex < hostChain.length; hostIndex++) {
      const host = hostChain[hostIndex];
      const effectiveModel = modelForHost(model, hostIndex);
      const attemptsForHost = hostIndex === 0 ? effectiveMaxRetries + 1 : 1;

      for (let attempt = 1; attempt <= attemptsForHost; attempt++) {
        const isRetry = hostIndex === 0 && attempt > 1;
        const controller = new AbortController();

        // Primary keeps the configured 60s default; secondary gets 90s for cold model load.
        let timeoutMs = perCallTimeoutMs
            || (isTestMode ? optimizedTimeout : (hostIndex === 0 ? DEFAULT_TIMEOUT_MS : SECONDARY_TIMEOUT_MS));
        if (!isTestMode && !perCallTimeoutMs) {
            if (hostIndex === 0 && (effectiveModel.includes('mistral-sk') || effectiveModel.includes('OpenEuroLLM'))) {
                timeoutMs = 150000; // 2.5 min
            }
        }

        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const started = Date.now();

        try {
            // 🔄 Progress indicator for slow models
            if (effectiveModel.includes('70b') && !isRetry && !isTestMode) {
                console.log(`🐢 Loading ${effectiveModel} (${prompt.length + system.length} chars)... up to 3 min`);
            }

            if (isRetry) {
                console.log(`🔄 Retry ${attempt - 1}/${effectiveMaxRetries} for ${effectiveModel} on ${host}...`);
            } else if (hostIndex > 0) {
                console.log(`🔄 Ollama fallback: ${host} model=${effectiveModel}`);
            }

            const messages = [];

            // 🔥 v1.3.1 FIX: PREPEND enforcement rules (not append)
            // Reasoning: Persona identity should have LAST WORD (recency bias favors end of prompt)
            const enforcementHeader = `🇸🇰 JAZYKOVÁ POLITIKA:
- ODPOVEDAJ VÝHRADNE PO SLOVENSKY
- Technické termíny OK: API, JSON, LLM, HTTP

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

            const enforcementFooter = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ CRITICAL: FOLLOW YOUR PERSONA IDENTITY ABOVE.
Target: 3-5 sentences UNLESS your persona requires longer format (e.g., GLITCHOSLAV philosophy).
`;

            const enforcedSystem = system && typeof system === 'string' && system.trim().length > 0
                ? `${enforcementHeader}${system}${enforcementFooter}`
                : `🇸🇰 RESPOND IN SLOVAK. Be concise (max 3-5 sentences). Follow instructions exactly.`;

            messages.push({
                role: 'system',
                content: enforcedSystem,
            });

            if (prompt && typeof prompt === 'string' && prompt.trim().length > 0) {
                messages.push({
                    role: 'user',
                    content: prompt,
                });
            } else {
                messages.push({
                    role: 'user',
                    content: '',
                });
            }

            // 🔥 v1.4.2: DEBUG LOG - Runtime proof (SP4_DEBUG only)
            if (process.env.SP4_DEBUG === 'true') {
                const promptLen = messages.map(m => m.content?.length || 0).reduce((a, b) => a + b, 0);
                const systemPromptLen = messages.find(m => m.role === 'system')?.content?.length || 0;
                console.log(`📌 OLLAMA_CALL: host=${host} model=${effectiveModel} provider=local_ollama temp=${isTestMode ? optimizedTemperature : (temperature || 0.5)} num_predict=${isTestMode ? optimizedNumPredict : (num_predict || 512)} timeout=${timeoutMs}ms promptLen=${promptLen} systemLen=${systemPromptLen}`);
            }

            const requestBody = {
                model: effectiveModel,
                messages,
                stream,
                keep_alive: isTestMode ? '5m' : '30m',
                options: {
                    temperature: isTestMode ? optimizedTemperature : (temperature || 0.5),
                    num_predict: isTestMode ? optimizedNumPredict : (num_predict || 512),
                    stop,
                    penalize_newline,
                    top_k,
                    top_p,
                    repeat_penalty,
                    ...ollamaOptions,
                },
                ...rest,
            };

            // qwen3 without this may return only thinking tokens and an empty response.
            if (effectiveModel.startsWith('qwen3')) requestBody.think = false;

            const response = await fetch(`${host}/api/chat`, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            clearTimeout(timeoutId);
            const duration = Date.now() - started;

            // ❌ HTTP ERROR
            if (!response.ok) {
                throw new Error(`Ollama HTTP ${response.status}: ${response.statusText}`);
            }

            // ✅ SUCCESS
            const data = await response.json();

            if (process.env.SP4_DEBUG === 'true') {
                console.log('🧪 [DEBUG] raw Ollama response:', (() => {
                    try {
                        return JSON.stringify(data, null, 2);
                    } catch {
                        return '[non-serializable]';
                    }
                })());
            }

            let text = '';

            if (typeof data === 'string') {
                text = data;
            } else if (data && typeof data === 'object') {
                // priame polia
                if (typeof data.response === 'string') {
                    text = data.response;
                } else if (typeof data.text === 'string') {
                    text = data.text;
                } else if (typeof data.message === 'string') {
                    text = data.message;
                }
                // Ollama chat štýl: { message: { content: "..." } }
                else if (data.message && typeof data.message.content === 'string') {
                    text = data.message.content;
                }
                // OpenAI-like choices, keby sa niekedy použili
                else if (Array.isArray(data.choices) && data.choices[0]) {
                    const c = data.choices[0];
                    if (typeof c.text === 'string') {
                        text = c.text;
                    } else if (c.message && typeof c.message.content === 'string') {
                        text = c.message.content;
                    }
                }
            }

            if (!text || typeof text !== 'string') {
                text = '';
            } else {
                text = text.trim();
            }

            // 🔄 Reset failure counter on success
            if (consecutiveFailures > 0) {
                console.log(`✅ Ollama recovered after ${consecutiveFailures} failures`);
                consecutiveFailures = 0;
            }
            OLLAMA_UNHEALTHY = false;
            unhealthySince = null;
            lastUsedHost = host;

            return {
                ok: true,
                text,
                durationMs: duration,
                raw: data,
                retries: totalRetries,
                model: effectiveModel,
                requestedModel: model,
                host,
            };

        } catch (err) {
            clearTimeout(timeoutId);
            const duration = Date.now() - started;
            lastError = err;
            totalRetries++;

            // 🔍 ERROR CLASSIFICATION
            const isTimeout = err.name === 'AbortError';
            const isNetworkError = err.message.includes('fetch') || err.message.includes('ECONNREFUSED');

            const errorType = isTimeout ? 'TIMEOUT' : (isNetworkError ? 'NETWORK' : 'HTTP_ERROR');

            // 📊 EPOCH KEEPER LOG
            const epochData = {
                attempt,
                model: effectiveModel,
                requestedModel: model,
                host,
                error: String(err),
                errorType,
                elapsedMs: duration,
                timeoutMs,
                promptLength: prompt?.length || 0,
                systemLength: system?.length || 0
            };

            console.warn(`[OLLAMA_${errorType}]`, epochData);

            // 🔥 RECORD TO EPOCH KEEPER (only on final failure)
            const isFinalChainAttempt = hostIndex === hostChain.length - 1
                && attempt >= attemptsForHost;
            if (isFinalChainAttempt) {
                await recordEpoch(
                    `Ollama ${errorType}: fallback chain failed for ${model}`,
                    { ...epochData, finalFailure: true }
                ).catch((epochError) => {
                    console.warn(`⚠️ Ollama epoch log failed: ${epochError.message}`);
                    return null;
                });
            }

            // 🔁 RETRY DECISION
            if (attempt < attemptsForHost) {
                // Retry if timeout or network error
                if (isTimeout || isNetworkError) {
                    console.log(`⚠️ ${errorType} - retry in progress...`);
                    continue; // Retry immediately
                } else {
                    // HTTP error, no retry
                    console.error(`❌ ${errorType} - no retry (HTTP error)`);
                    break;
                }
            }
        }
      }
    }

    // ❌ ALL CONFIGURED HOSTS FAILED
    consecutiveFailures++;
    if (!OLLAMA_UNHEALTHY) {
        OLLAMA_UNHEALTHY = true;
        unhealthySince = Date.now();
        console.error(`🔴 Ollama marked UNHEALTHY (all ${hostChain.length} configured hosts failed)`);

        await recordEpoch(
            'Ollama marked UNHEALTHY - all configured hosts failed',
            { consecutiveFailures, unhealthySince, hosts: hostChain }
        ).catch((epochError) => {
            console.warn(`⚠️ Ollama unhealthy epoch log failed: ${epochError.message}`);
            return null;
        });
    }

    return {
        ok: false,
        error: 'OLLAMA_UNHEALTHY',
        cause: lastError ? String(lastError) : 'Unknown Ollama error',
        retries: totalRetries,
        model,
        healthStatus: 'unhealthy'
    };
}

/**
 * 🩺 HEALTH CHECK - Ping Ollama /api/tags
 * 
 * Lightweight check to verify Ollama is responsive.
 * Called periodically by scheduler (jeden krát za 5 min).
 * 
 * @returns {Promise<Object>} Health status:
 *   - healthy: boolean
 *   - models: Array<Object> - Available models (if healthy)
 *   - timestamp: Date
 *   - error: string (if unhealthy)
 */
export async function ollamaHealthCheck() {
    const started = Date.now();
    let lastError = null;

    for (const host of OLLAMA_HOSTS.slice(0, 2)) {
      let timeoutId = null;
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(`${host}/api/tags`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - started;

        if (response.ok) {
            const data = await response.json();
            lastHealthCheck = new Date();
            lastUsedHost = host;

            // 🔄 Reset UNHEALTHY flag if health check passes
            if (OLLAMA_UNHEALTHY) {
                console.log('✅ Ollama RECOVERED - health check passed');
                OLLAMA_UNHEALTHY = false;
                unhealthySince = null;
                consecutiveFailures = 0;

                await recordEpoch('Ollama recovered - health check passed', {
                    durationMs: duration,
                    models: data.models?.length || 0
                }).catch((epochError) => {
                    console.warn(`⚠️ Ollama recovery epoch log failed: ${epochError.message}`);
                    return null;
                });
            }

            return {
                healthy: true,
                models: data.models || [],
                timestamp: lastHealthCheck,
                durationMs: duration,
                host,
            };
        }

        throw new Error(`HTTP ${response.status}`);

      } catch (err) {
        lastError = err;
        console.warn(`⚠️ Ollama health check failed for ${host}: ${err.message}`);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }

    return {
        healthy: false,
        error: lastError ? String(lastError) : 'OLLAMA_UNHEALTHY',
        timestamp: new Date(),
        consecutiveFailures,
        hosts: OLLAMA_HOSTS.slice(0, 2),
    };
}

/**
 * 🔍 GET HEALTH STATUS
 * 
 * Returns current Ollama health state.
 * Used by /health command and diagnostics.
 * 
 * @returns {Object} Health status object
 */
export function getOllamaHealthStatus() {
    return {
        unhealthy: OLLAMA_UNHEALTHY,
        unhealthySince,
        consecutiveFailures,
        lastHealthCheck,
        cooldownMs: OLLAMA_UNHEALTHY ? UNHEALTHY_COOLDOWN_MS - (Date.now() - unhealthySince) : 0
    };
}

/**
 * 🔄 RESET HEALTH STATE (manual override)
 * 
 * Force reset UNHEALTHY flag.
 * Use via CLI: `/reset_ollama_health`
 */
export function resetOllamaHealth() {
    OLLAMA_UNHEALTHY = false;
    unhealthySince = null;
    consecutiveFailures = 0;
    console.log('🔄 Ollama health state manually reset');

    recordEpoch('Ollama health manually reset', {
        resetBy: 'user',
        timestamp: new Date()
    }).catch((epochError) => {
        console.warn(`⚠️ Ollama reset epoch log failed: ${epochError.message}`);
        return null;
    });
}

/**
 * 📊 GET CONFIGURATION
 * 
 * Returns current ollamaClient config (for diagnostics).
 */
export function getOllamaConfig() {
    return {
        host: lastUsedHost || OLLAMA_HOSTS[0],
        hosts: [...OLLAMA_HOSTS],
        primaryHost: OLLAMA_HOSTS[0],
        secondaryHost: OLLAMA_HOSTS[1] || null,
        activeHost: lastUsedHost,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        secondaryTimeoutMs: SECONDARY_TIMEOUT_MS,
        maxRetries: MAX_RETRIES,
        healthCheckIntervalMs: HEALTH_CHECK_INTERVAL_MS,
        unhealthyCooldownMs: UNHEALTHY_COOLDOWN_MS
    };
}

export default {
    callOllama,
    ollamaHealthCheck,
    getOllamaHealthStatus,
    resetOllamaHealth,
    getOllamaConfig
};
