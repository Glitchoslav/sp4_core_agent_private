/**
 * AGENT PLAYGROUND - Dev Helper (v0.10.3)
 * 
 * Rýchle testovanie všetkých agentov na rovnakú otázku.
 * Používa bypass mode pre priame volanie bez orchestrátora.
 * 
 * @module agentPlayground
 */

import { orchestrate } from '../orchestration/glitchOrchestrator.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST ALL AGENTS ON SAME INPUT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Testuje všetky persóny na rovnakú otázku (bypass orchestrátor).
 * 
 * @param {string} inputText - Otázka na testovanie
 * @param {Object} sharedContext - Zdieľaný kontext (voliteľný)
 * @returns {Promise<Object>} - { core, popici, glitchoslav }
 */
export async function testAllAgentsOn(inputText, sharedContext = {}) {
    const personas = ['core', 'popici', 'glitchoslav'];
    const results = {};

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 AGENT PLAYGROUND - Testing all personas');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📝 Input: "${inputText}"`);
    console.log('');

    for (const persona of personas) {
        console.log(`\n🎭 Testing: ${persona.toUpperCase()}`);
        console.log('─────────────────────────────────────────────────────────────────────────────────');

        const context = {
            userId: 'DEV_TEST',
            relation: 'dev',
            bypassOrchestrator: true,   // 🔥 ide rovno cez handlePersonaDirect
            forcedPersona: persona,
            ...sharedContext
        };

        try {
            const startTime = Date.now();
            const result = await orchestrate(inputText, context);
            const endTime = Date.now();

            results[persona] = {
                response: result.response,
                handledBy: result.handledBy,
                model: result.meta?.model,
                responseTime: endTime - startTime
            };

            console.log(`✅ Success (${endTime - startTime}ms)`);
            console.log(`   Model: ${result.meta?.model || 'N/A'}`);
            console.log(`   Response: ${result.response.slice(0, 150)}...`);

        } catch (err) {
            console.error(`❌ Error: ${err.message}`);
            results[persona] = {
                error: err.message
            };
        }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const [persona, result] of Object.entries(results)) {
        const status = result.error ? '❌' : '✅';
        const time = result.responseTime ? `${result.responseTime}ms` : 'N/A';
        console.log(`   ${status} ${persona.toUpperCase()}: ${time}`);
    }

    console.log('');

    return results;
}

/**
 * CLI helper - výpis všetkých odpovedí vedľa seba.
 * 
 * @param {string} inputText - Otázka na testovanie
 * @returns {Promise<void>}
 */
export async function compareAgents(inputText) {
    const results = await testAllAgentsOn(inputText);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 FULL RESPONSES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const [persona, result] of Object.entries(results)) {
        console.log('');
        console.log(`🎭 ${persona.toUpperCase()}:`);
        console.log('─────────────────────────────────────────────────────────────────────────────────');
        console.log(result.response || `❌ Error: ${result.error}`);
        console.log('');
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default {
    testAllAgentsOn,
    compareAgents
};
