/**
 * 🎭 SP4 Agent Manager (refactored)
 * Jediný zdroj promptov = multiVoice.buildPrompt
 * - Single-voice: jeden mód → jedna odpoveď
 * - Council: 4 módy → syntéza (s Walter blending)
 */

import { buildPrompt } from './multiVoice.js';
import { askLocalLLM } from './sp4os/llmLocal.js';
import { chooseModel } from './src/core/modelRouting.js';
import { blendCouncil, blendWithLabels } from './src/core/multiAgentBlender.js';

export const COUNCIL_MODES = ['core', 'popici', 'glitchoslav'];

function mapAgentKeyToMode(key = 'core') {
    const k = (key || '').toString().toLowerCase();
    if (['core', 'popici', 'glitchoslav'].includes(k)) return k;
    if (k.includes('sp4_core')) return 'core';
    if (k.includes('popici')) return 'popici';
    if (k.includes('glitch')) return 'glitchoslav';
    return 'core';
}

export async function quickResponse(userMessage, agentKeyOrMode = 'core', state = {}) {
    const mode = mapAgentKeyToMode(agentKeyOrMode);
    const pkg = await buildPrompt({ mode, state, userMessage });

    // 🧠 Use modelRouting for intelligent model selection
    const selectedModel = chooseModel({ mode, task: 'reasoning' });
    console.log(`🧠 Quick response model: ${selectedModel} (mode: ${mode})`);

    // 🔧 Token limits for complete responses
    const modelOptions = {
        num_predict: 2048,  // Zvýšené pre kompletné odpovede (bolo 300)
        temperature: 0.7,
        stop: ["User:", "Kefyk:", "###", "\n\n---"]  // Bezpečnejšie stop tokens
    };

    const response = await askLocalLLM(pkg.userMessage, pkg.systemPrompt, selectedModel, modelOptions);
    return {
        response,
        meta: { singleAgentMode: true, mode, model: selectedModel }
    };
}

export async function runCouncil(state = {}, userMessage = '', extraDirectives = { role: 'council' }, blendingMode = 'smart') {
    const results = [];
    for (const mode of COUNCIL_MODES) {
        const pkg = await buildPrompt({ mode, state, userMessage, extraDirectives });

        // 🧠 Use modelRouting for each council member
        const selectedModel = chooseModel({ mode, task: 'reasoning' });
        console.log(`   🎭 ${mode} → ${selectedModel}`);

        // 🔧 Token limits for council responses
        const modelOptions = {
            num_predict: 1536,  // Zvýšené pre kompletné odpovede (bolo 250)
            temperature: 0.7,
            stop: ["User:", "Kefyk:", "###", "\n\n---"]
        };

        const reply = await askLocalLLM(pkg.userMessage, pkg.systemPrompt, selectedModel, modelOptions);
        results.push({ mode, reply, model: selectedModel });
    }
    return synthesizeCouncil(results, state, blendingMode);
}

export function synthesizeCouncil(results = [], state = {}, blendingMode = 'smart') {
    // Tri módy syntézy:
    // - 'smart': Walter blending (sentence scoring + top sentences)
    // - 'labeled': Zachováva agent labels s top sentences
    // - 'classic': Pôvodný formát (všetko)

    if (blendingMode === 'smart') {
        // 🔥 WALTER UPGRADE: Intelligent sentence blending
        console.log('   🧠 Using Walter blending (smart mode)');
        return blendCouncil(results, { maxSentences: 5, minScore: 0.4 });
    }

    if (blendingMode === 'labeled') {
        // Zachováva agent identitu, ale len top sentences
        console.log('   🏷️  Using labeled blending');
        const agents = results.map(r => ({ id: r.mode, response: r.reply }));
        return blendWithLabels(agents, { maxPerAgent: 2 });
    }

    // Classic mode (backward compatibility)
    console.log('   📜 Using classic synthesis');
    const byMode = Object.fromEntries(results.map(r => [r.mode, r.reply]));
    return [
        '🔥 SP4_CORE hovorí:',
        byMode.core || '…ticho.',
        '',
        '💥 Popiči Kokot cíti:',
        byMode.popici || '…žiadny vulgarno-srdcový koment.',
        '',
        '🌀 Glitchoslav vidí:',
        byMode.glitchoslav || '…žiadna vízia tentokrát.'
    ].join('\n');
}

function buildStateFromContext(context = {}) {
    return {
        relationshipModel: { level: context.relationshipStage || 'Stranger' },
        emotionalContext: { currentMood: context.emotionalState || 'neutral' },
        // Additional fields can be added by caller when available
    };
}

export async function deliberate(userMessage, context = {}) {
    console.log('\n═══════════════════════════════════════════');
    console.log('🎭 MULTI-AGENT COUNCIL DELIBERATION');
    console.log('═══════════════════════════════════════════\n');
    try {
        const state = buildStateFromContext(context);
        const blendingMode = context.blendingMode || 'smart'; // smart | labeled | classic
        const final = await runCouncil(state, userMessage, { role: 'council' }, blendingMode);
        return {
            response: final,
            meta: { council: true, modes: COUNCIL_MODES, resultsCount: 3, blendingMode }
        };
    } catch (error) {
        console.error('❌ Council failed:', error.message);
        const fallback = await quickResponse(userMessage, 'core', buildStateFromContext(context));
        return { response: fallback.response, meta: { council: false, fallback: true } };
    }
}
