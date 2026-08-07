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

    // ZÁVOJ: redakcia citlivých vzorov pred odchodom do cloudu (SP4-AI-FIREWALL).
    // Firewall offline/chyba → ticho pôvodný text (neblokuje, len znižuje riziko).
    const [redactedUser, redactedSystem] = await Promise.all([
        redactForCloud(userMessage),
        redactForCloud(systemPrompt || '')
    ]);

    const messages = [];

    if (redactedSystem) {
        messages.push({
            role: 'system',
            content: redactedSystem
        });
    }

    messages.push({
        role: 'user',
        content: redactedUser
    });
    
    // Use num_predict from options if provided (for consistency with Ollama)
    const maxTokens = options.num_predict || MAX_TOKENS;
    const temperature = options.temperature !== undefined ? options.temperature : TEMPERATURE;
    const stopSequences = options.stop || [
        'Thank you for your prompt',
        'Dobrý deň',
        'Vážený',
        'I apologize'
    ]; // GROQ limit: max 4 stop items

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

async function redactForCloud(text) {
    try {
        const res = await fetch(FIREWALL_REDACT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: String(text || '') }),
            signal: AbortSignal.timeout(FIREWALL_TIMEOUT_MS)
        });
        if (!res.ok) return text;
        const data = await res.json();
        return data?.ok && typeof data.redacted === 'string' ? data.redacted : text;
    } catch (_) {
        return text;
    }
}

/**
 * 🌐 STREAMING VARIANT: Groq chat completions so stream:true.
 * Rovnaké gate (constitution/egress) a závoj (redactForCloud) ako askGroqLLM.
 * @returns {Promise<{ok:boolean, text?:string, error?:string}>}
 */
export async function askGroqLLMStream(userMessage, systemPrompt = '', options = {}, onDelta = () => {}) {
    if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY not configured');
    }

    const policyProvided = options.policy !== undefined && options.policy !== null;
    const policyAllowCloud = policyProvided ? options.policy.allowCloud === true : undefined;
    const egressCheck = mayEgress('conversation_text', 'groq_api', {
        actorType: options.actorType || 'automation',
        policyAllowCloud,
        requestId: options.requestId,
        callerFile: 'cloudLLM.js:askGroqLLMStream'
    });
    if (egressCheck.decision !== 'ALLOW') {
        throw new ConstitutionalBlockError(egressCheck.reason, {
            category: 'conversation_text',
            sink: 'groq_api'
        });
    }

    // ZÁVOJ (rovnaký ako askGroqLLM)
    const [redactedUser, redactedSystem] = await Promise.all([
        redactForCloud(userMessage),
        redactForCloud(systemPrompt || '')
    ]);

    const messages = [];
    if (redactedSystem) messages.push({ role: 'system', content: redactedSystem });
    messages.push({ role: 'user', content: redactedUser });

    const maxTokens = options.num_predict || MAX_TOKENS;
    const temperature = options.temperature !== undefined ? options.temperature : TEMPERATURE;
    const stopSequences = options.stop || [
        'Thank you for your prompt',
        'Dobrý deň',
        'Vážený',
        'I apologize'
    ];

    const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            max_tokens: maxTokens,
            temperature,
            top_p: 0.9,
            stop: stopSequences,
            stream: true
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`GROQ API error: ${response.status} - ${error}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        for (const part of parts) {
            const line = part.split('\n').find(l => l.startsWith('data:'));
            if (!line) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
                const j = JSON.parse(payload);
                const delta = j.choices?.[0]?.delta?.content || '';
                if (delta) {
                    fullText += delta;
                    onDelta(delta);
                }
            } catch (_) { /* preskoč */ }
        }
    }

    return { ok: true, text: fullText.trim() };
}

/**
 * Check if cloud LLM is available
 */
export function isCloudLLMAvailable() {
    return !!GROQ_API_KEY;
}

/**
 * Get cloud LLM info
 */
export function getCloudLLMInfo() {
    return {
        provider: 'GROQ',
        model: GROQ_MODEL,
        available: isCloudLLMAvailable(),
        endpoint: GROQ_ENDPOINT
    };
}

// ── SP4 AI Firewall (poradný model-routing consult) ───────
// Pred cloud volaním sa môžeme opýtať firewallu (:3003) na odporúčaný provider/model
// a odhad ceny. SP4KULT v cloud režime používa len GROQ, takže odporúčanie sa
// NEVYNUCUJE — slúži na logovanie a budúce smerovanie. Kým firewall beží v DRY_RUN,
// jeho BLOCK ignorujeme a vždy pokračujeme vlastnou logikou.
const FIREWALL_DECIDE_URL = process.env.SP4_FIREWALL_URL || 'http://localhost:3003/api/decide';
const FIREWALL_REDACT_URL = process.env.SP4_REDACT_URL || 'http://localhost:3003/api/redact';
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
