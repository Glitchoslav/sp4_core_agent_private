// cloudLLM.js - Cloud LLM fallback for production (when Ollama unavailable)
// Supports: GROQ, OpenAI, Anthropic, etc.

// Import-order fix: this file used to assume dotenv had already run (true on
// Railway, where env vars are injected directly — false in local/dev, where
// dotenv only ran because src/llm/ollamaClient.js happened to import
// 'dotenv/config' and llmRouter.js happened to import ollamaClient.js AFTER
// this file. That made GROQ_API_KEY below silently capture '' on local runs,
// depending entirely on import order elsewhere. dotenv/config is idempotent
// and never overrides an already-set var, so this is safe on Railway too.
import 'dotenv/config';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_TOKENS = parseInt(process.env.GROQ_MAX_TOKENS || '150'); // ULTRA short
const TEMPERATURE = parseFloat(process.env.GROQ_TEMPERATURE || '0.4'); // Less creative bypassing

// Constitution v1 binding B (DEC-001, DEC-004) — see C:\SP4\plans\constitution-v1-plan.md
import { mayEgress, ConstitutionalBlockError } from './src/constitution/loader.js';
import { askLiteLLM } from './src/llm/litellmClient.js';

/**
 * Call GROQ API (OpenAI-compatible endpoint)
 * Ultra-fast inference with Llama 3.1
 *
 * @param {string} userMessage
 * @param {string} systemPrompt
 * @param {object} options
 * @param {object} [options.policy] - resolvePolicy() result; options.policy.allowCloud
 *   must be exactly true or this call is Constitutionally blocked (DEC-001). Missing
 *   options.policy entirely is treated as "not provided" and also blocks, fail-closed.
 * @param {string} [options.actorType] - interactive-human|automation|agent|subprocess
 *   (DEC-004). Defaults to "automation" when not supplied by the caller.
 */
export async function askGroqLLM(userMessage, systemPrompt = '', options = {}) {
    if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY not configured');
    }

    // Constitution v1 gate — must run before any message assembly or fetch().
    // Two independent layers must both allow: runtime policy.allowCloud (via
    // options.policy, threaded from sp4LlmCall) AND the static manifest
    // egress_policies row for (conversation_text, groq_api).
    const policyProvided = options.policy !== undefined && options.policy !== null;
    const policyAllowCloud = policyProvided ? options.policy.allowCloud === true : undefined;
    const egressCheck = mayEgress('conversation_text', 'groq_api', {
        actorType: options.actorType || 'automation',
        policyAllowCloud,
        requestId: options.requestId,
        callerFile: 'cloudLLM.js:askGroqLLM'
    });
    if (egressCheck.decision !== 'ALLOW') {
        throw new ConstitutionalBlockError(egressCheck.reason, {
            category: 'conversation_text',
            sink: 'groq_api'
        });
    }

    const messages = [];

    if (systemPrompt) {
        messages.push({
            role: 'system',
            content: systemPrompt
        });
    }

    messages.push({
        role: 'user',
        content: userMessage
    });
    
    // Use num_predict from options if provided (for consistency with Ollama)
    const maxTokens = options.num_predict || MAX_TOKENS;
    const temperature = options.temperature !== undefined ? options.temperature : TEMPERATURE;
    const stopSequences = options.stop || [
        'Thank you for your prompt',
        'Dobrý deň',
        'Vážený',
        'I apologize',
        'As an AI assistant'
    ];

    try {
        const response = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: messages,
                max_tokens: maxTokens,
                temperature: temperature,
                top_p: 0.9,
                stop: stopSequences
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`GROQ API error: ${response.status} - ${error}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid GROQ response format');
        }

        return data.choices[0].message.content.trim();

    } catch (error) {
        console.error('❌ GROQ API call failed:', error.message);
        throw error;
    }
}

/**
 * Check if cloud LLM is available
 */
export function isCloudLLMAvailable() {
    // LiteLLM gateway bezi lokalne (localhost:4000) — vzdy dostupny ako cloud entry
    return true;
}

/**
 * Get cloud LLM info
 */
export function getCloudLLMInfo() {
    return {
        provider: 'LiteLLM',
        model: 'gateway (local/budget/fast/free/quality)',
        available: isCloudLLMAvailable(),
        endpoint: 'http://127.0.0.1:4000/v1/chat/completions'
    };
}

/**
 * Cloud LLM cez LiteLLM gateway (nahradza priamy GROQ — AI_ROUTING_v1).
 * Constitution gate: conversation_text -> litellm_gateway (DEC-001 fail-closed).
 */
export async function askCloudLLM(userMessage, systemPrompt = '', options = {}) {
    const policyProvided = options.policy !== undefined && options.policy !== null;
    const policyAllowCloud = policyProvided ? options.policy.allowCloud === true : undefined;
    const egressCheck = mayEgress('conversation_text', 'litellm_gateway', {
        actorType: options.actorType || 'automation',
        policyAllowCloud,
        requestId: options.requestId,
        callerFile: 'cloudLLM.js:askCloudLLM'
    });
    if (egressCheck.decision !== 'ALLOW') {
        throw new ConstitutionalBlockError(egressCheck.reason, {
            category: 'conversation_text',
            sink: 'litellm_gateway'
        });
    }
    const result = await askLiteLLM(userMessage, systemPrompt, {
        tier: options.tier || 'budget',
        num_predict: options.num_predict || 300,
        temperature: options.temperature,
    });
    return result.text;
}

// ── SP4 AI Firewall (poradný model-routing consult) ───────
// Pred cloud volaním sa môžeme opýtať firewallu (:3003) na odporúčaný provider/model
// a odhad ceny. SP4KULT v cloud režime používa len GROQ, takže odporúčanie sa
// NEVYNUCUJE — slúži na logovanie a budúce smerovanie. Kým firewall beží v DRY_RUN,
// jeho BLOCK ignorujeme a vždy pokračujeme vlastnou logikou.
const FIREWALL_DECIDE_URL = process.env.SP4_FIREWALL_URL || 'http://localhost:3003/api/decide';
const FIREWALL_TIMEOUT_MS = parseInt(process.env.SP4_FIREWALL_TIMEOUT_MS || '2000');

/**
 * Opýta sa SP4 AI Firewallu na odporúčaný model. Poradné — pri chybe/offline
 * vráti null a volajúci pokračuje pôvodnou logikou.
 * @returns {Promise<{model,provider,estimatedCost,decision}|null>}
 */
export async function consultFirewall(prompt, options = {}) {
    try {
        const priority = options.priority || 'normal';
        const response = await fetch(FIREWALL_DECIDE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: String(prompt || '').slice(0, 4000), priority }),
            signal: AbortSignal.timeout(FIREWALL_TIMEOUT_MS)
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        // firewall offline/timeout/chyba -> ticho späť na pôvodnú logiku
        return null;
    }
}
