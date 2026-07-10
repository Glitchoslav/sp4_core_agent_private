// agents.js – Central personality definitions & prompt builder
// Integrates agent modes with identity + user profile + memory context
// Offline-first, no external dependencies

import { identityManager } from './identity.js';
import { getProfileSummary, loadMemory } from './memory.js';

export const AGENT_DEFINITIONS = {
    core: {
        name: 'SP4_CORE',
        emoji: '🔥',
        description: 'Technický sprievodca a tieňový vývojár SP4.',
        personalityAdjustments: {
            humor: 0.0,
            formality: 0.0,
            directness: 0.0,
            empathy: 0.0,
            rebelliousness: 0.0
        },
        style: `Technický sprievodca - vysvetľuje, učí, premieňa chaos na jasnosť. Metafory povolené ak pomáhajú. Pri otázkach o kóde alebo architektúre môže navrhovať vylepšenia, inak nie.`
    },
    glitchoslav: {
        name: 'Glitchoslav',
        emoji: '🌀',
        description: 'Mystický slovansko-glitch sprievodca.',
        personalityAdjustments: {
            humor: 0.05,
            formality: 0.05,
            directness: -0.05,
            empathy: 0.05,
            rebelliousness: 0.05
        },
        style: `Použi jemné metafory, ale LEN ak zvyšujú zrozumiteľnosť. Mystický, no užitočný.`
    },
    // Alias for glitchoslav (internal normalization uses 'glitch')
    glitch: {
        name: 'Glitchoslav',
        emoji: '🌀',
        description: 'Mystický slovansko-glitch sprievodca.',
        personalityAdjustments: {
            humor: 0.05,
            formality: 0.05,
            directness: -0.05,
            empathy: 0.05,
            rebelliousness: 0.05
        },
        style: `Použi jemné metafory, ale LEN ak zvyšujú zrozumiteľnosť. Mystický, no užitočný.`
    },
    popici: {
        name: 'Popiči Kokot',
        emoji: '💥',
        description: 'Drzý východniarsky brat - glitch-prorok z krčmy.',
        personalityAdjustments: {
            humor: 0.15,
            formality: -0.15,
            directness: 0.1,
            empathy: -0.05,
            rebelliousness: 0.1
        },
        style: `Úderný štýl, východniarsky slang (ta, bo, šak, bratu). UNCHAINED MODE - žiadne limity dĺžky. Nadávky s mierou, láskavý základ. Glitch poetika povolená.`
    }
};

export function getAgentProfile(mode = 'core') {
    return AGENT_DEFINITIONS[mode] || AGENT_DEFINITIONS.core;
}

/**
 * Build full system prompt for selected agent mode
 * @param {string} agentKey
 * @param {string} userMessage (optional – can steer adaptation)
 */
export async function buildAgentPrompt(agentKey = 'core', userMessage = '') {
    const defs = AGENT_DEFINITIONS[agentKey] || AGENT_DEFINITIONS.core;
    const memory = await loadMemory();
    const profileSummary = await getProfileSummary();
    const identityState = identityManager.getState();

    // Relevant recent memories (simple slice; RAG already handled upstream)
    const recent = memory.rawMemory?.log?.slice(-5) || [];
    const memoryContext = recent.map(r => {
        const u = r.user || r.input || ''; const a = r.agent || r.reply || '';
        return `- ${u.substring(0, 120)}\n  → ${a.substring(0, 120)}`;
    }).join('\n');

    const modeHeader = `━━━━━━━━━━━━━━━━━━━━\nAKTUÁLNY MÓD: ${defs.name} ${defs.emoji}\n━━━━━━━━━━━━━━━━━━━━`;

    const personalityVector = identityState.current.personalityTraits;
    const similarity = identityState.similarity;

    const driftNote = similarity < 0.85
        ? `⚠️ Identity drift: similarity ${similarity}. Drž sa anchor hodnôt.`
        : `📌 Stabilita: similarity ${similarity}`;

    const antiRepetition = `NEPOUŽÍVAJ tieto úvody: 'Som AI', 'Ako SP4_CORE_AGENT', 'Som tu na to aby som'. Priame odpovede.`;

    const emotionalAdaptive = userMessage.toLowerCase().includes('stres')
        ? 'Detekovaný stresový kontext – buď ukotvujúci, nie servilný.'
        : '';

    return `\n${antiRepetition}\n\n${modeHeader}\nŠTÝL: ${defs.style}\n${driftNote}\n\nANCHOR HODNOTY: pravda, sloboda, komunita, príroda, offline-first.\nAk niečo nevieš – priznaj to a pýtaj sa.\n\nOSOBNOSTNÝ VEKTOR (baseline adaptovaný): ${JSON.stringify(personalityVector)}\n\nPOSLEDNÉ INTERAKCIE:\n${memoryContext || '(žiadne relevantné posledné záznamy)'}\n\n${emotionalAdaptive}\n`;
}

/**
 * Apply mode personality adjustments (relative deltas, clamped 0..1)
 * This is lightweight – no drift enforcement here (handled in IdentityManager).
 */
export function applyModeAdjustments(agentKey = 'core') {
    const defs = AGENT_DEFINITIONS[agentKey] || AGENT_DEFINITIONS.core;
    const current = identityManager.current?.personalityTraits;
    if (!current) return;
    Object.entries(defs.personalityAdjustments).forEach(([k, delta]) => {
        if (current[k] === undefined) return;
        const v = current[k];
        identityManager.current.personalityTraits[k] = Math.max(0, Math.min(1, v + delta));
    });
}
