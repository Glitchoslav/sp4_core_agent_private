// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: litellmClient              │
// │  Layer: Core / LLM Engine                  │
// │  Role: Klient LiteLLM gateway (5 vrstiev)  │
// │  Mission: AI_ROUTING_v1 — kaskáda + costLog│
// │  API: askLiteLLM(message, system, options) │
// └─────────────────────────────────────────────┘

import 'dotenv/config';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// LiteLLM gateway — beží na tom istom node (linux-pc), lokálne = rýchle + bezpečné
const LITELLM_URL = process.env.SP4_LITELLM_URL || 'http://127.0.0.1:4000/v1/chat/completions';

// Ceny $/M tokenov [in, out] — OpenRouter reálne ceny (2026-08-13)
export const TIER_PRICES = {
    local: [0, 0],
    free: [0, 0],
    budget: [0.27, 0.41],   // DeepSeek v3.2
    fast: [0.10, 0.32],     // llama-3.3-70b (OpenRouter)
    quality: [0.55, 2.19],  // DeepSeek Reasoner (R1)
};

// Kaskáda zlyhania — v poradí od najlepšieho po najlacnejší fallback
export const CASCADE = {
    quality: ['quality', 'budget', 'fast', 'free'],
    budget: ['budget', 'fast', 'free'],
    fast: ['fast', 'free'],
    free: ['free'],
    local: ['local'],
};

const MAX_ATTEMPTS = 2; // max 2 pokusy (tier + 1 fallback)

const COST_LOG_PATH = process.env.SP4_COST_LOG_PATH
    || path.resolve(__dirname, '../../logs/costLog.jsonl');

/**
 * Poradie kaskády pre danú vrstvu.
 */
export function cascadeOrder(tier) {
    return CASCADE[tier] || ['budget', 'fast', 'free'];
}

/**
 * Odhad ceny v USD pre (tier, tokeny).
 */
export function estimateCost(tier, tokensIn, tokensOut) {
    const [pi, po] = TIER_PRICES[tier] || [0, 0];
    return (tokensIn / 1e6) * pi + (tokensOut / 1e6) * po;
}

/**
 * Hrubý odhad tokenov (bez tokenizéra): ~4 znaky = 1 token.
 */
export function estimateTokens(text) {
    return Math.ceil(String(text || '').length / 4);
}

function logCost(tier, tokensIn, tokensOut) {
    try {
        const line = JSON.stringify({
            ts: new Date().toISOString(),
            tier,
            tokensIn,
            tokensOut,
            estCost: Number(estimateCost(tier, tokensIn, tokensOut).toFixed(6)),
        });
        fs.appendFileSync(COST_LOG_PATH, line + '\n', 'utf8');
    } catch (_) {
        // logovanie nákladov nesmie nikdy zabiť odpoveď
    }
}

/**
 * Zavolá LiteLLM gateway (OpenAI-kompatibilný) s kaskádou vrstiev.
 * Max 2 pokusy. Loguje náklady do costLog.jsonl.
 *
 * @param {string} userMessage
 * @param {string} [systemPrompt]
 * @param {object} [options]
 * @param {string} [options.tier] — budget|fast|free|quality (default budget)
 * @param {number} [options.num_predict] — max tokeny odpovede
 * @param {number} [options.temperature]
 * @returns {Promise<{text:string, tier:string, tokensIn:number, tokensOut:number, estCost:number, attempts:number}>}
 */
export async function askLiteLLM(userMessage, systemPrompt = '', options = {}) {
    const tier = options.tier || 'budget';
    const order = cascadeOrder(tier).slice(0, MAX_ATTEMPTS);

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userMessage });

    let lastErr = null;

    for (const model of order) {
        try {
            const response = await fetch(LITELLM_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages,
                    max_tokens: options.num_predict || 300,
                    temperature: options.temperature ?? 0.4,
                }),
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error(`LiteLLM ${model}: HTTP ${response.status} ${body.slice(0, 120)}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (!text) throw new Error(`LiteLLM ${model}: empty response`);

            const usage = data.usage || {};
            const tokensIn = usage.prompt_tokens || estimateTokens(userMessage);
            const tokensOut = usage.completion_tokens || estimateTokens(text);

            logCost(model, tokensIn, tokensOut);

            return {
                text,
                tier: model,
                tokensIn,
                tokensOut,
                estCost: estimateCost(model, tokensIn, tokensOut),
                attempts: order.indexOf(model) + 1,
            };
        } catch (err) {
            lastErr = err;
        }
    }

    throw new Error(`LiteLLM všetky vrstvy zlyhali (${order.join('→')}): ${lastErr?.message || 'unknown'}`);
}

export default askLiteLLM;
