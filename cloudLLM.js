// cloudLLM.js - Canonical cloud LLM egress via LiteLLM gateway (AI_ROUTING_v1).
// Single allowed cloud path: askCloudLLM -> mayEgress('conversation_text','litellm_gateway') -> askLiteLLM.
// (Legacy direct-provider askGroqLLM removed 2026-08-15 — LiteLLM is canonical.)

import 'dotenv/config';

// Constitution v1 binding B (DEC-001, DEC-004)
import { mayEgress, ConstitutionalBlockError } from './src/constitution/loader.js';
import { askLiteLLM } from './src/llm/litellmClient.js';

/**
 * Check if cloud LLM capability is ENABLED/CONFIGURED.
 * NOTE: capability/configuration flag (operator opt-in via SP4_ALLOW_CLOUD) —
 * NOT a health check and NOT consent. Egress still requires request consent
 * (policy.allowCloud === true) AND constitution mayEgress() ALLOW.
 */
export function isCloudLLMConfigured() {
    return process.env.SP4_ALLOW_CLOUD === 'true';
}

/**
 * Get cloud LLM info
 */
export function getCloudLLMInfo() {
    return {
        provider: 'LiteLLM',
        model: 'gateway (local/budget/fast/free/quality)',
        available: isCloudLLMConfigured(),
        endpoint: 'http://127.0.0.1:4000/v1/chat/completions'
    };
}

/**
 * Cloud LLM cez LiteLLM gateway (AI_ROUTING_v1 — canonical).
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
// Pred cloud volaním sa môžeme opýtať firewallu (:3003) na odporúčaný model
// a odhad ceny. Poradné — BLOCK sa nevynucuje; pri chybe/offline pokračuje
// vlastná logika (LiteLLM canonical).
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
