// corePrompt.js – LEGACY WRAPPER
// Pozor: Tento modul je ponechaný kvôli starému index.js.
// Nový master prompt composer je v multiVoice.js a identitna autorita v src/identity/IDENTITY_KERNEL.js.

import { AGENT_DEFINITIONS } from './agents.js';
import { buildSystemPrompt } from './multiVoice.js';

export function buildCoreSystemPrompt(profileSummary, mode = 'core', memoryContext = '') {
    // Legacy kompatibilita: profil a pamäť prilepíme k systému
    const state = { meta: { profileSummary } };
    const sys = buildSystemPrompt(mode, state);
    const mem = memoryContext ? `\n\n🧠 RELEVANTNÉ SPOMIENKY:\n${memoryContext}` : '';
    return `${sys}${mem}`;
}

export const AGENTS = Object.fromEntries(
    Object.entries(AGENT_DEFINITIONS).map(([k, v]) => [k, { name: v.name, description: v.description, emoji: v.emoji }])
);
