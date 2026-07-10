/**
 * SP4AIOS Integration Example
 * Ukazuje ako integrovať SP4AIOSBridge do existujúceho SP4 Core systému
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import SP4AIOSBridge from './SP4AIOSBridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Príklad 1: Základné použitie
 */
async function example1_basicUsage() {
    console.log('\n=== Príklad 1: Základné použitie ===\n');

    const bridge = new SP4AIOSBridge({
        openaiApiKey: process.env.OPENAI_API_KEY,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        googleApiKey: process.env.GOOGLE_API_KEY
    });

    try {
        // OpenAI GPT-4o-mini
        const response1 = await bridge.ask(
            'Vysvetli mi koncept kvantového počítania v jednoduchých slovách.',
            {
                provider: 'openai',
                model: 'gpt-4o-mini',
                temperature: 0.7
            }
        );

        console.log('OpenAI Response:');
        console.log(response1.text.substring(0, 200) + '...');
        console.log(`Cost: $${response1.cost.toFixed(6)}`);
        console.log(`Latency: ${response1.latency}ms`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Príklad 2: Inteligentný routing
 */
async function example2_intelligentRouting() {
    console.log('\n=== Príklad 2: Inteligentný routing ===\n');

    const bridge = new SP4AIOSBridge({
        openaiApiKey: process.env.OPENAI_API_KEY,
        fallbackToLocal: true
    });

    const queries = [
        { text: 'Ahoj', complexity: 'low', priority: 'normal' },
        { text: 'Napíš mi 5-stranový esej o umelej inteligencii', complexity: 'high', priority: 'high' },
        { text: 'Aký je dnes deň?', complexity: 'low', priority: 'normal' }
    ];

    for (const query of queries) {
        try {
            const response = await bridge.intelligentRoute(query.text, {
                complexity: query.complexity,
                priority: query.priority
            });

            console.log(`\nQuery: "${query.text.substring(0, 50)}..."`);
            console.log(`Provider: ${response.provider}`);
            console.log(`Model: ${response.model}`);
            console.log(`Cost: $${response.cost?.toFixed(6) || 0}`);
        } catch (error) {
            console.error('Error:', error.message);
        }
    }
}

/**
 * Príklad 3: Porovnanie providerov
 */
async function example3_compareProviders() {
    console.log('\n=== Príklad 3: Porovnanie providerov ===\n');

    const bridge = new SP4AIOSBridge({
        openaiApiKey: process.env.OPENAI_API_KEY,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        googleApiKey: process.env.GOOGLE_API_KEY
    });

    const prompt = 'Napíš mi krátku báseň o technológii.';

    const providers = [
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
        { provider: 'google', model: 'gemini-1.5-flash' }
    ];

    for (const config of providers) {
        try {
            const response = await bridge.ask(prompt, config);

            console.log(`\n${config.provider.toUpperCase()} (${config.model}):`);
            console.log(response.text);
            console.log(`Cost: $${response.cost.toFixed(6)} | Latency: ${response.latency}ms`);
        } catch (error) {
            console.error(`${config.provider} error:`, error.message);
        }
    }
}

/**
 * Príklad 4: Cache a štatistiky
 */
async function example4_cacheAndStats() {
    console.log('\n=== Príklad 4: Cache a štatistiky ===\n');

    const bridge = new SP4AIOSBridge({
        openaiApiKey: process.env.OPENAI_API_KEY,
        enableCache: true,
        cacheTTL: 3600000 // 1 hour
    });

    const prompt = 'Čo je to machine learning?';

    // Prvé volanie - nie je cached
    console.log('First call (not cached):');
    const response1 = await bridge.ask(prompt, {
        provider: 'openai',
        model: 'gpt-4o-mini'
    });
    console.log(`Cached: ${response1.cached}`);
    console.log(`Latency: ${response1.latency}ms`);

    // Druhé volanie - cached
    console.log('\nSecond call (cached):');
    const response2 = await bridge.ask(prompt, {
        provider: 'openai',
        model: 'gpt-4o-mini'
    });
    console.log(`Cached: ${response2.cached}`);
    console.log(`Latency: ${response2.latency || 0}ms`);

    // Štatistiky
    console.log('\nStats:');
    console.log(bridge.getStats());
}

/**
 * Príklad 5: Integrácia s SP4 Core Agent
 */
async function example5_sp4Integration() {
    console.log('\n=== Príklad 5: SP4 Core Integration ===\n');

    const bridge = new SP4AIOSBridge({
        openaiApiKey: process.env.OPENAI_API_KEY,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        fallbackToLocal: true
    });

    // Simulácia SP4 persona handling
    const personas = {
        glitchoslav: {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            systemPrompt: 'Si Glitchoslav, majster glitch umenia a dekompozície reality.',
            temperature: 0.9
        },
        popici: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            systemPrompt: 'Si POPIČI, priamy a úprimný asistent.',
            temperature: 0.7
        },
        analyst: {
            provider: 'google',
            model: 'gemini-1.5-pro',
            systemPrompt: 'Si analytik, poskytuj presné a faktické odpovede.',
            temperature: 0.3
        }
    };

    const userQuery = 'Aké sú možnosti využitia AI v umení?';

    for (const [personaName, config] of Object.entries(personas)) {
        try {
            console.log(`\n[${personaName.toUpperCase()}]`);

            const response = await bridge.ask(userQuery, {
                provider: config.provider,
                model: config.model,
                systemPrompt: config.systemPrompt,
                temperature: config.temperature
            });

            console.log(response.text.substring(0, 200) + '...');
            console.log(`Provider: ${response.provider} | Cost: $${response.cost.toFixed(6)}`);

        } catch (error) {
            console.error(`${personaName} error:`, error.message);
        }
    }
}

/**
 * Príklad 6: Cost tracking a budgets
 */
async function example6_costTracking() {
    console.log('\n=== Príklad 6: Cost Tracking ===\n');

    const bridge = new SP4AIOSBridge({
        openaiApiKey: process.env.OPENAI_API_KEY,
        enableCostTracking: true,
        costLogPath: path.join(__dirname, 'logs', 'aios_costs.jsonl')
    });

    const queries = [
        'Krátka odpoveď',
        'Stredne dlhá odpoveď o AI',
        'Veľmi dlhá a detailná odpoveď o všetkých aspektoch umelej inteligencie, machine learning, deep learning a ich aplikáciách'
    ];

    for (const query of queries) {
        await bridge.ask(query, {
            provider: 'openai',
            model: 'gpt-4o-mini'
        });
    }

    console.log('\nCumulative Stats:');
    const stats = bridge.getStats();
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Total Cost: $${stats.totalCost.toFixed(6)}`);
    console.log(`Cache Hit Rate: ${stats.cacheHitRate}`);
    console.log(`Failure Rate: ${stats.failureRate}`);

    // Prečítaj cost log
    try {
        const logPath = path.join(__dirname, 'logs', 'aios_costs.jsonl');
        const logContent = await fs.readFile(logPath, 'utf-8');
        const entries = logContent.trim().split('\n').map(line => JSON.parse(line));

        console.log('\nCost Log Entries:');
        entries.forEach(entry => {
            console.log(`${entry.timestamp}: ${entry.provider}/${entry.model} - $${entry.cost.toFixed(6)} (${entry.latency}ms)`);
        });
    } catch (error) {
        console.log('No cost log yet');
    }
}

/**
 * Príklad 7: Multi-model consensus
 */
async function example7_multiModelConsensus() {
    console.log('\n=== Príklad 7: Multi-Model Consensus ===\n');

    const bridge = new SP4AIOSBridge({
        openaiApiKey: process.env.OPENAI_API_KEY,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        googleApiKey: process.env.GOOGLE_API_KEY
    });

    const prompt = 'Je umelá inteligencia hrozba alebo príležitosť? Odpovedz v jednej vete.';

    const models = [
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
        { provider: 'google', model: 'gemini-1.5-flash' }
    ];

    const responses = [];

    for (const config of models) {
        try {
            const response = await bridge.ask(prompt, config);
            responses.push({
                provider: config.provider,
                model: config.model,
                text: response.text,
                cost: response.cost
            });
        } catch (error) {
            console.error(`${config.provider} failed:`, error.message);
        }
    }

    console.log('Responses from different models:\n');
    responses.forEach(r => {
        console.log(`[${r.provider}/${r.model}]`);
        console.log(r.text);
        console.log(`Cost: $${r.cost.toFixed(6)}\n`);
    });

    const totalCost = responses.reduce((sum, r) => sum + r.cost, 0);
    console.log(`Total consensus cost: $${totalCost.toFixed(6)}`);
}

// Spustiť príklady
async function main() {
    console.log('🌉 SP4AIOS Bridge - Examples\n');

    // Skontroluj API keys
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasGoogle = !!process.env.GOOGLE_API_KEY;

    console.log('API Keys configured:');
    console.log(`  OpenAI: ${hasOpenAI ? '✓' : '✗'}`);
    console.log(`  Anthropic: ${hasAnthropic ? '✓' : '✗'}`);
    console.log(`  Google: ${hasGoogle ? '✓' : '✗'}`);

    if (!hasOpenAI && !hasAnthropic && !hasGoogle) {
        console.log('\n⚠️  No API keys configured. Set them as environment variables:');
        console.log('  $env:OPENAI_API_KEY="sk-..."');
        console.log('  $env:ANTHROPIC_API_KEY="sk-ant-..."');
        console.log('  $env:GOOGLE_API_KEY="..."');
        return;
    }

    // Spusti príklady (zakomentuj tie, ktoré nechceš)
    try {
        await example1_basicUsage();
        // await example2_intelligentRouting();
        // await example3_compareProviders();
        // await example4_cacheAndStats();
        // await example5_sp4Integration();
        // await example6_costTracking();
        // await example7_multiModelConsensus();
    } catch (error) {
        console.error('Example failed:', error);
    }
}

// Export pre použitie v iných moduloch
export {
    example1_basicUsage,
    example2_intelligentRouting,
    example3_compareProviders,
    example4_cacheAndStats,
    example5_sp4Integration,
    example6_costTracking,
    example7_multiModelConsensus
};

// Spusti main ak je súbor spustený priamo
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
