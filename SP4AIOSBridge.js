/**
 * SP4AIOS Bridge - Most medzi lokálnym SP4 a online AI modelmi
 * Podporuje: OpenAI, Anthropic, Google AI, Mistral AI
 */

import fs from 'fs/promises';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SP4AIOSBridge {
    constructor(config = {}) {
        this.config = {
            // Default timeouts
            timeout: config.timeout || 60000,
            maxRetries: config.maxRetries || 3,

            // Cost tracking
            enableCostTracking: config.enableCostTracking !== false,
            costLogPath: config.costLogPath || path.join(__dirname, 'logs', 'aios_costs.jsonl'),

            // Caching
            enableCache: config.enableCache !== false,
            cacheTTL: config.cacheTTL || 3600000, // 1 hour

            // Fallback strategy
            fallbackToLocal: config.fallbackToLocal !== false,
            localLLMPath: config.localLLMPath || './sp4os/llmLocal.js',

            ...config
        };

        this.providers = {
            openai: new OpenAIProvider(this.config),
            anthropic: new AnthropicProvider(this.config),
            google: new GoogleAIProvider(this.config),
            mistral: new MistralAIProvider(this.config)
        };

        this.cache = new Map();
        this.costs = [];
        this.stats = {
            totalRequests: 0,
            cachedResponses: 0,
            failedRequests: 0,
            totalCost: 0
        };

        this.initializeLogger();
    }

    async initializeLogger() {
        if (this.config.enableCostTracking) {
            const logDir = path.dirname(this.config.costLogPath);
            try {
                await fs.mkdir(logDir, { recursive: true });
            } catch (err) {
                console.error('Failed to create logs directory:', err);
            }
        }
    }

    /**
     * Hlavná metóda pre volanie online AI modelov
     */
    async ask(prompt, options = {}) {
        this.stats.totalRequests++;

        const {
            provider = 'openai',
            model = null,
            temperature = 0.7,
            maxTokens = 2000,
            useCache = this.config.enableCache,
            systemPrompt = null,
            stream = false,
            persona = null
        } = options;

        // Check cache
        if (useCache) {
            const cached = this.getCached(prompt, provider, model);
            if (cached) {
                this.stats.cachedResponses++;
                return cached;
            }
        }

        try {
            const providerInstance = this.providers[provider];
            if (!providerInstance) {
                throw new Error(`Unknown provider: ${provider}`);
            }

            const startTime = Date.now();
            const response = await providerInstance.complete({
                prompt,
                model,
                temperature,
                maxTokens,
                systemPrompt,
                stream,
                persona
            });

            const latency = Date.now() - startTime;

            // Track costs
            if (this.config.enableCostTracking) {
                await this.logCost({
                    provider,
                    model:             response.model || model,
                    promptTokens:      response.usage?.promptTokens      || 0,
                    completionTokens:  response.usage?.completionTokens  || 0,
                    cacheReadTokens:   response.usage?.cacheReadTokens   || 0,
                    cacheWriteTokens:  response.usage?.cacheWriteTokens  || 0,
                    cost:              response.cost || 0,
                    latency,
                    timestamp:         new Date().toISOString()
                });
            }

            // Cache response
            if (useCache) {
                this.setCache(prompt, provider, model, response);
            }

            return {
                text: response.text,
                provider,
                model: response.model,
                usage: response.usage,
                cost: response.cost,
                latency,
                cached: false
            };

        } catch (error) {
            this.stats.failedRequests++;
            console.error(`[SP4AIOS] Error with ${provider}:`, error.message);

            // Fallback to local LLM
            if (this.config.fallbackToLocal) {
                console.log('[SP4AIOS] Falling back to local LLM...');
                try {
                    const { askLocalLLM } = await import(this.config.localLLMPath);
                    const localResponse = await askLocalLLM(prompt, {
                        temperature,
                        max_tokens: maxTokens
                    });
                    return {
                        text: localResponse,
                        provider: 'local',
                        model: 'ollama/mistral:7b',
                        fallback: true
                    };
                } catch (localError) {
                    console.error('[SP4AIOS] Local fallback also failed:', localError.message);
                    throw error;
                }
            }

            throw error;
        }
    }

    /**
     * Inteligentný routing - rozhoduje kedy použiť cloud vs local
     */
    async intelligentRoute(prompt, options = {}) {
        const {
            complexity = 'medium',
            priority = 'normal',
            maxCost = null,
            requiresLatest = false
        } = options;

        // Heuristics pre routing
        const promptLength = prompt.length;

        // Používaj local pre jednoduché a krátke queries
        if (complexity === 'low' && promptLength < 500) {
            options.provider = 'local';
            return this.askLocal(prompt, options);
        }

        // Opus iba pre explicitne ťažké úlohy — drahý fallback
        if (complexity === 'hard') {
            options.provider = options.provider || 'anthropic';
            options.model = options.model || 'claude-opus-4-7';
            return this.ask(prompt, options);
        }

        // Sonnet pre vysokú prioritu a komplexné queries
        if (priority === 'high' || requiresLatest) {
            options.provider = options.provider || 'anthropic';
            options.model = options.model || 'claude-sonnet-4-6';
            return this.ask(prompt, options);
        }

        // Default: OpenAI GPT-4o mini (cost-effective)
        options.provider = options.provider || 'openai';
        options.model = options.model || 'gpt-4o-mini';
        return this.ask(prompt, options);
    }

    async askLocal(prompt, options = {}) {
        try {
            const { askLocalLLM } = await import(this.config.localLLMPath);
            const response = await askLocalLLM(prompt, {
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 2000
            });
            return {
                text: response,
                provider: 'local',
                model: 'ollama/mistral:7b',
                cost: 0,
                cached: false
            };
        } catch (error) {
            console.error('[SP4AIOS] Local LLM error:', error.message);
            throw error;
        }
    }

    getCached(prompt, provider, model) {
        const key = this.getCacheKey(prompt, provider, model);
        const cached = this.cache.get(key);

        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > this.config.cacheTTL) {
            this.cache.delete(key);
            return null;
        }

        return { ...cached.response, cached: true };
    }

    setCache(prompt, provider, model, response) {
        const key = this.getCacheKey(prompt, provider, model);
        this.cache.set(key, {
            response,
            timestamp: Date.now()
        });
    }

    getCacheKey(prompt, provider, model) {
        return `${provider}:${model}:${prompt.substring(0, 100)}`;
    }

    async logCost(entry) {
        this.costs.push(entry);
        this.stats.totalCost += entry.cost || 0;

        try {
            await fs.appendFile(
                this.config.costLogPath,
                JSON.stringify(entry) + '\n'
            );
        } catch (err) {
            console.error('[SP4AIOS] Failed to log cost:', err);
        }
    }

    /**
     * Získaj štatistiky použitia
     */
    getStats() {
        return {
            ...this.stats,
            cacheHitRate: this.stats.totalRequests > 0
                ? (this.stats.cachedResponses / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%',
            failureRate: this.stats.totalRequests > 0
                ? (this.stats.failedRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Vyčisti cache
     */
    clearCache() {
        this.cache.clear();
    }
}

/**
 * OpenAI Provider
 */
class OpenAIProvider {
    constructor(config) {
        this.apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
        this.baseURL = config.openaiBaseURL || 'https://api.openai.com/v1';
        this.timeout = config.timeout || 60000;

        // Pricing per 1M tokens (as of Nov 2024)
        this.pricing = {
            'gpt-4o': { input: 2.5, output: 10.0 },
            'gpt-4o-mini': { input: 0.15, output: 0.6 },
            'gpt-4-turbo': { input: 10.0, output: 30.0 },
            'gpt-3.5-turbo': { input: 0.5, output: 1.5 }
        };
    }

    async complete(options) {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const model = options.model || 'gpt-4o-mini';

        const messages = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: options.prompt });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: options.temperature,
                    max_tokens: options.maxTokens,
                    stream: options.stream || false
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const usage = data.usage || {};

            return {
                text: data.choices[0]?.message?.content || '',
                model: data.model,
                usage: {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens
                },
                cost: this.calculateCost(model, usage.prompt_tokens, usage.completion_tokens)
            };

        } finally {
            clearTimeout(timeoutId);
        }
    }

    calculateCost(model, promptTokens, completionTokens) {
        const pricing = this.pricing[model] || this.pricing['gpt-4o-mini'];
        return (
            (promptTokens / 1000000) * pricing.input +
            (completionTokens / 1000000) * pricing.output
        );
    }
}

/**
 * Anthropic (Claude) Provider
 *
 * Modely:
 *   claude-sonnet-4-6  — default, bežná práca
 *   claude-opus-4-7    — iba ťažké úlohy (complexity: 'hard'), drahší
 *
 * Funkcie:
 *   - Prompt caching: system prompt sa automaticky cachuje (API ignoruje príliš krátke)
 *   - In-flight dedup: rovnaký prompt + model → jeden HTTP request
 *   - CLAUDE_API_ENABLED=false → vypne volania bez pádu zvyšku bridgeu
 *   - Loguje tokeny vrátane cache hit/write
 */
class AnthropicProvider {
    constructor(config) {
        this.enabled = process.env.CLAUDE_API_ENABLED !== 'false';
        this.apiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
        this.baseURL = config.anthropicBaseURL || 'https://api.anthropic.com/v1';
        this.timeout = config.timeout || 60000;
        this._inflight = new Map(); // in-flight dedup map

        // ceny v USD / 1M tokenov: input / output / cacheRead / cacheWrite
        this.pricing = {
            'claude-sonnet-4-6':          { input: 3.0,  output: 15.0, cacheRead: 0.30, cacheWrite: 3.75 },
            'claude-opus-4-7':            { input: 5.0,  output: 25.0, cacheRead: 0.50, cacheWrite: 6.25 },
            'claude-haiku-4-5':           { input: 1.0,  output: 5.0,  cacheRead: 0.10, cacheWrite: 1.25 },
            // legacy aliasy pre spätnu kompatibilitu
            'claude-3-5-sonnet-20241022': { input: 3.0,  output: 15.0, cacheRead: 0.30, cacheWrite: 3.75 },
            'claude-3-5-haiku-20241022':  { input: 0.8,  output: 4.0,  cacheRead: 0.08, cacheWrite: 1.00 },
            'claude-3-opus-20240229':     { input: 15.0, output: 75.0, cacheRead: 1.50, cacheWrite: 18.75 }
        };
    }

    async complete(options) {
        if (!this.enabled) {
            throw new Error('[Claude] API vypnuté cez CLAUDE_API_ENABLED=false');
        }
        if (!this.apiKey) {
            throw new Error('Anthropic API key not configured');
        }

        const prompt = (options.prompt || '').trim();
        if (prompt.length < 3) {
            throw new Error('[Claude] Prompt je príliš krátky pre API volanie');
        }

        const model = options.model || 'claude-sonnet-4-6';

        // In-flight dedup: rovnaký model + system + prompt → reuse pending promise
        const dedupKey = `${model}:${options.systemPrompt || ''}:${prompt}`;
        if (this._inflight.has(dedupKey)) {
            return this._inflight.get(dedupKey);
        }

        const promise = this._doRequest(options, model, prompt);
        this._inflight.set(dedupKey, promise);
        try {
            return await promise;
        } finally {
            this._inflight.delete(dedupKey);
        }
    }

    async _doRequest(options, model, prompt) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const body = {
                model,
                max_tokens: options.maxTokens || 2000,
                temperature: options.temperature,
                messages: [{ role: 'user', content: prompt }]
            };

            // Prompt caching: system prompt v array formáte s cache_control.
            // API samo ignoruje príliš krátke prompty (min ~2048 tokenov pre Sonnet).
            if (options.systemPrompt) {
                body.system = [{
                    type: 'text',
                    text: options.systemPrompt,
                    cache_control: { type: 'ephemeral' }
                }];
            }

            const response = await fetch(`${this.baseURL}/messages`, {
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const usage = data.usage || {};
            const cacheReadTokens  = usage.cache_read_input_tokens    || 0;
            const cacheWriteTokens = usage.cache_creation_input_tokens || 0;

            const cost = this.calculateCost(
                model,
                usage.input_tokens,
                usage.output_tokens,
                cacheReadTokens,
                cacheWriteTokens
            );

            // Token + cost log
            console.log(
                `[Claude] ${model} | in=${usage.input_tokens} out=${usage.output_tokens}` +
                (cacheReadTokens  > 0 ? ` cacheRead=${cacheReadTokens}`   : '') +
                (cacheWriteTokens > 0 ? ` cacheWrite=${cacheWriteTokens}` : '') +
                ` | $${cost.toFixed(5)}`
            );
            if (cacheReadTokens > 0) {
                const p = this.pricing[model] || this.pricing['claude-sonnet-4-6'];
                const saved = ((cacheReadTokens / 1e6) * p.input * 0.9).toFixed(5);
                console.log(`[Claude] 💾 Cache hit — ušetrené ~$${saved}`);
            }

            return {
                text: data.content[0]?.text || '',
                model: data.model,
                usage: {
                    promptTokens:     usage.input_tokens    || 0,
                    completionTokens: usage.output_tokens   || 0,
                    totalTokens:      (usage.input_tokens   || 0) + (usage.output_tokens || 0),
                    cacheReadTokens,
                    cacheWriteTokens
                },
                cost
            };

        } finally {
            clearTimeout(timeoutId);
        }
    }

    calculateCost(model, promptTokens, completionTokens, cacheReadTokens = 0, cacheWriteTokens = 0) {
        const p = this.pricing[model] || this.pricing['claude-sonnet-4-6'];
        return (
            ((promptTokens     || 0) / 1e6) * p.input +
            ((completionTokens || 0) / 1e6) * p.output +
            ((cacheReadTokens  || 0) / 1e6) * p.cacheRead +
            ((cacheWriteTokens || 0) / 1e6) * p.cacheWrite
        );
    }
}

/**
 * Google AI Provider
 */
class GoogleAIProvider {
    constructor(config) {
        this.apiKey = config.googleApiKey || process.env.GOOGLE_API_KEY;
        this.baseURL = config.googleBaseURL || 'https://generativelanguage.googleapis.com/v1beta';
        this.timeout = config.timeout || 60000;

        this.pricing = {
            'gemini-1.5-pro': { input: 1.25, output: 5.0 },
            'gemini-1.5-flash': { input: 0.075, output: 0.3 },
            'gemini-2.0-flash-exp': { input: 0.0, output: 0.0 } // Free tier
        };
    }

    async complete(options) {
        if (!this.apiKey) {
            throw new Error('Google API key not configured');
        }

        const model = options.model || 'gemini-1.5-flash';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(
                `${this.baseURL}/models/${model}:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: options.prompt }]
                        }],
                        generationConfig: {
                            temperature: options.temperature,
                            maxOutputTokens: options.maxTokens
                        }
                    }),
                    signal: controller.signal
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Google AI error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const candidate = data.candidates?.[0];
            const usage = data.usageMetadata || {};

            return {
                text: candidate?.content?.parts?.[0]?.text || '',
                model,
                usage: {
                    promptTokens: usage.promptTokenCount || 0,
                    completionTokens: usage.candidatesTokenCount || 0,
                    totalTokens: usage.totalTokenCount || 0
                },
                cost: this.calculateCost(model, usage.promptTokenCount, usage.candidatesTokenCount)
            };

        } finally {
            clearTimeout(timeoutId);
        }
    }

    calculateCost(model, promptTokens, completionTokens) {
        const pricing = this.pricing[model] || this.pricing['gemini-1.5-flash'];
        return (
            (promptTokens / 1000000) * pricing.input +
            (completionTokens / 1000000) * pricing.output
        );
    }
}

/**
 * Mistral AI Provider
 */
class MistralAIProvider {
    constructor(config) {
        this.apiKey = config.mistralApiKey || process.env.MISTRAL_API_KEY;
        this.baseURL = config.mistralBaseURL || 'https://api.mistral.ai/v1';
        this.timeout = config.timeout || 60000;

        this.pricing = {
            'mistral-large-latest': { input: 2.0, output: 6.0 },
            'mistral-small-latest': { input: 0.2, output: 0.6 },
            'open-mistral-7b': { input: 0.25, output: 0.25 }
        };
    }

    async complete(options) {
        if (!this.apiKey) {
            throw new Error('Mistral API key not configured');
        }

        const model = options.model || 'mistral-small-latest';

        const messages = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: options.prompt });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: options.temperature,
                    max_tokens: options.maxTokens
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Mistral API error: ${error.message || response.statusText}`);
            }

            const data = await response.json();
            const usage = data.usage || {};

            return {
                text: data.choices[0]?.message?.content || '',
                model: data.model,
                usage: {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens
                },
                cost: this.calculateCost(model, usage.prompt_tokens, usage.completion_tokens)
            };

        } finally {
            clearTimeout(timeoutId);
        }
    }

    calculateCost(model, promptTokens, completionTokens) {
        const pricing = this.pricing[model] || this.pricing['mistral-small-latest'];
        return (
            (promptTokens / 1000000) * pricing.input +
            (completionTokens / 1000000) * pricing.output
        );
    }
}

export default SP4AIOSBridge;
