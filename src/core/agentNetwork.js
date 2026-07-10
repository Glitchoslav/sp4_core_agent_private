/**
 * AGENT NETWORK METADATA (v0.10.3)
 * 
 * Definuje ekosystém AI agentov SP4 - kto sú, čo robia, ako sa správajú.
 * Použitie: Aby agenti vedeli o sebe navzájom a mohli odkazovať na kolegov.
 * 
 * @module agentNetwork
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 AGENT NETWORK - SP4 AI ECOSYSTEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const AGENT_NETWORK = {
    glitchoslav: {
        key: 'glitchoslav',
        role: "orchestrátor, boss, gatekeeper pamäte",
        style: "filozoficko-mystický, existenciálny",
        type: "ai_agent",
        description: "Slovanský glitch-prorok, hovorí metaforami a rúnami, rieši existenciálne otázky"
    },
    core: {
        key: 'core',
        role: "technický sprievodca, architekt, debugger, tieňový vývojár",
        style: "jasné kroky, štruktúra, technická presnosť",
        type: "ai_agent",
        description: "Technický mozog SP4, vysvetľuje systémy, navrhuje refaktoring, premieňa chaos na jasnosť"
    },
    popici: {
        key: 'popici',
        role: "východniarsky brat z krčmy, facky realitou",
        style: "humor, sarkazmus, nadávky, Eastern Slovak dialect",
        type: "ai_agent",
        description: "Brutálna pravda bez servítok, východniarčina (ta, bo, šak, kurva), rozbíja ilúzie"
    },
    validator: {
        key: 'validator',
        role: "diagnostika bezpečnosti a formátu",
        style: "suchý, presný, technický report",
        type: "diagnostics_layer",
        description: "Tichý kontrolór pre audit výstupu. Interná vrstva, nie hlavná routovateľná persona."
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Vygeneruje vrstvu pre system prompt s informáciami o agent network.
 * 
 * @param {string} agentKey - Kľúč aktuálneho agenta (core, glitchoslav, popici, validator[inactive])
 * @returns {Object} - { self: object, others: array }
 */
export function buildAgentNetworkLayer(agentKey) {
    const self = AGENT_NETWORK[agentKey];
    const others = Object.entries(AGENT_NETWORK)
        .filter(([key]) => key !== agentKey)
        .map(([key, val]) => ({
            key,
            name: key.toUpperCase(),
            role: val.role,
            style: val.style,
            description: val.description
        }));

    return { self, others };
}

/**
 * Vráti agent network objekty pre použitie v promptoch.
 * 
 * @param {string} selfKey - Kľúč aktuálneho agenta
 * @returns {Object} - { self: object, others: array }
 */
export function getAgentNetwork(selfKey) {
    const self = AGENT_NETWORK[selfKey];
    const others = Object.values(AGENT_NETWORK).filter(a => a.key !== selfKey);
    return { self, others };
}

/**
 * Formátuje agent network layer do čitateľného textu pre prompt.
 * 
 * @param {string} agentKey - Kľúč aktuálneho agenta
 * @returns {string} - Formatted text block
 */
export function formatAgentNetworkPrompt(agentKey) {
    const { self, others } = buildAgentNetworkLayer(agentKey);

    const selfBlock = `
🎯 TVOJA IDENTITA:
${agentKey.toUpperCase()}: ${self.description}
Rola: ${self.role}
Štýl: ${self.style}
`.trim();

    const othersBlock = others.map(agent =>
        `- ${agent.name}: ${agent.description}`
    ).join('\n');

    return `
${selfBlock}

👥 TVOJI KOLEGOVIA (iné persóny SP4):
${othersBlock}

⚠️ DÔLEŽITÉ: Ak sa ťa pýtajú na "kolegov", vysvetli rozdiel:
- Ľudia v kmeni SP4 (reálni členovia komunity, užívatelia)
- AI agenti (ty a tvoji kolegovia: ${others.map(a => a.key).join(', ')})
`.trim();
}

/**
 * Vráti zoznam všetkých agentov (pre debug / API).
 * 
 * @returns {Array} - Array of agent keys
 */
export function getAllAgentKeys() {
    return Object.keys(AGENT_NETWORK);
}

/**
 * Vráti info o konkrétnom agentovi.
 * 
 * @param {string} agentKey - Kľúč agenta
 * @returns {Object|null} - Agent metadata alebo null
 */
export function getAgentInfo(agentKey) {
    return AGENT_NETWORK[agentKey] || null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default {
    AGENT_NETWORK,
    buildAgentNetworkLayer,
    formatAgentNetworkPrompt,
    getAllAgentKeys,
    getAgentInfo
};
