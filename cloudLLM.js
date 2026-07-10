// cloudLLM.js - Cloud LLM fallback for production (when Ollama unavailable)
// Supports: GROQ, OpenAI, Anthropic, etc.

// Note: Railway injects env vars directly, no dotenv needed
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_TOKENS = parseInt(process.env.GROQ_MAX_TOKENS || '150'); // ULTRA short
const TEMPERATURE = parseFloat(process.env.GROQ_TEMPERATURE || '0.4'); // Less creative bypassing

/**
 * Call GROQ API (OpenAI-compatible endpoint)
 * Ultra-fast inference with Llama 3.1
 */
export async function askGroqLLM(userMessage, systemPrompt = '', options = {}) {
    if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY not configured');
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
