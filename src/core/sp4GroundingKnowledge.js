// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: sp4GroundingKnowledge     │
// │  Layer: Core / Knowledge Base             │
// │  Role: Factual grounding for SP4 queries  │
// │  API: getSP4KnowledgeBlock(query)         │
// └─────────────────────────────────────────────┘

/**
 * 🔥 SP4 GROUNDING KNOWLEDGE v1.0
 * 
 * Prevents LLM hallucinations about SP4 internals by injecting
 * factual knowledge blocks directly into system prompt.
 * 
 * @module sp4GroundingKnowledge
 */

import {
    SP4_AGENT_RELATION,
    SP4_COMMUNITY_FACT,
    SP4_DEFINITION,
    SP4_EXTERNAL_EXPLANATION,
    SP4_FOUNDER,
    SP4_FUTURE_DIRECTION_FACT,
    SP4_LAUNCHER_FACT,
    SP4_LOCAL_FIRST_NATURE,
    SP4_MEANING_FACT,
    SP4_ORIGIN_FACT,
    SP4_PERSONA_ROSTER_FACT,
    SP4_SYSTEM_ROLE,
    SP4_VALUES
} from './sp4Facts.js';
import { FAST_PATH_MODEL, PRIMARY_MODEL } from '../../sp4os/llmLocal.js';

function normalizeGroundingQuery(query = '') {
    return String(query || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function detectMemorySubtopic(query = '') {
    const normalizedQuery = normalizeGroundingQuery(query);

    const hasRawLog = /\braw log\b/.test(normalizedQuery);
    const hasChapters = /\bchapters?\b|\bkapitol/.test(normalizedQuery);

    if (Number(hasRawLog) + Number(hasChapters) !== 1) {
        return null;
    }

    if (hasRawLog) {
        return 'raw_log';
    }

    if (hasChapters) {
        return 'chapters';
    }

    return null;
}

function detectArchitectureSubtopic(query = '') {
    const normalizedQuery = normalizeGroundingQuery(query);
    const mentionsLauncher = /\b(sp4\.js|server\.js|server:legacy|launcher|entrypoint|legacy|default)\b/.test(normalizedQuery);
    const mentionsStart = /\b(start|startuje|spusta|spustenie|spustat|boot)\b/.test(normalizedQuery);

    if (mentionsLauncher && mentionsStart) {
        return 'launcher';
    }

    if (/\bserver\.js\b/.test(normalizedQuery) && /\bdefault\b/.test(normalizedQuery)) {
        return 'launcher';
    }

    return null;
}

function isSP4MeaningQuery(query = '') {
    const normalizedQuery = normalizeGroundingQuery(query);

    return (
        /\b(co|c)\s+je\s+zmysel\s+((systemu|system)\s+)?sp4\b/.test(normalizedQuery)
        || /\baky\s+ma\s+zmysel\s+((system|systemu)\s+)?sp4\b/.test(normalizedQuery)
        || /\b(aka|aky)\s+je\s+pointa\s+((systemu|system)\s+)?sp4\b/.test(normalizedQuery)
        || /\bpointa\s+((systemu|system)\s+)?sp4\b/.test(normalizedQuery)
        || /\bpreco\s+(existuje|vznikol)\s+sp4\b/.test(normalizedQuery)
    );
}

function detectIdentitySubtopics(query = '') {
    const normalizedQuery = normalizeGroundingQuery(query);

    const founder = [
        'kto je kefyk',
        'kefyk',
        'zakladatel sp4',
        'tvorca sp4',
        'kto vytvoril sp4',
    ].some((needle) => normalizedQuery.includes(needle));

    const origin = [
        'kde vzniklo sp4',
        'kde vznikol sp4',
        'povod sp4',
        'z akej krajiny je sp4',
        'odkial je sp4',
        'kde sa zrodilo sp4',
    ].some((needle) => normalizedQuery.includes(needle));

    const community = [
        'kto tvori komunitu',
        'kto tvori kmen',
        'kto tvori kmen sp4',
        'kto je v komunite sp4',
        'kto je v kmeni sp4',
    ].some((needle) => normalizedQuery.includes(needle));

    const direction = [
        'vyvija sa spravnym smerom',
        'vyvija sa to spravnym smerom',
        'vyvija sa sp4 spravnym smerom',
        'ide to spravnym smerom',
        'ide sp4 spravnym smerom',
        'kam sa to posuva',
        'kam sa sp4 posuva',
        'kam sa tento projekt posuva',
    ].some((needle) => normalizedQuery.includes(needle));

    return {
        founder,
        origin,
        community,
        direction,
    };
}

const SP4_IDENTITY_FACTS = `
🧭 SP4 IDENTITA A PÔVOD (FAKTICKÉ ÚDAJE):

- ${SP4_FOUNDER}
- ${SP4_ORIGIN_FACT}
- ${SP4_COMMUNITY_FACT}
- ${SP4_FUTURE_DIRECTION_FACT}
`.trim();

// 🧠 SP4 MEMORY SYSTEM - FACTUAL KNOWLEDGE
const SP4_MEMORY_FACTS = `
🧠 SP4 MEMORY SYSTEM (FAKTICKÉ ÚDAJE):

**3 VRSTVY:**
1. **Raw Log** - surové konverzácie (posledných 50 správ)
2. **Compressed Summaries** - AI zhrnutia longer conversations
3. **Seeds** - kľúčové momenty, turning points

**NIE JE TO AMD/Intel cache systém!** SP4 používa:
- Local JSON files (data/memory.json)
- Embedding vectors (Sentence Transformers)
- Semantic search (RAG - Retrieval Augmented Generation)

**KOMPONENTY:**
- memory.js - raw CRUD operations
- memoryLayers.js - hierarchical structure (raw → summaries → seeds)
- memoryHelpers.js - embedding + search
- consolidationEngine.js - automatic compression

**PREČO:**
- Offline-first (žiadne cloudové databázy)
- Privacy (všetko lokálne)
- Context pre AI (pamätá si minulé konverzácie)

**PRÍKLAD:**
User: "Spomeň si na posledný týždeň"
→ System načíta seeds + summaries z memoryLayers
→ Pripojí do system prompt
→ LLM má kontext
`;

const SP4_POLICY_FACTS = `
⚖️ SP4 POLICY SYSTEM (FAKTICKÉ ÚDAJE):

**ÚČEL:**
Rozhoduje, či požiadavka smie ísť na cloud. Default je lokálne (Ollama), cloud je výnimka.

**JEDINÝ CLOUD KANÁL:**
- LiteLLM gateway (lokálny proxy). Iný cloud kanál neexistuje.

**KEDY SMIE POŽIADAVKA NA CLOUD (musí platiť všetko naraz):**
1. Operátor zapol cloud na stroji: SP4_ALLOW_CLOUD=true v .env (default vypnuté).
2. Požiadavka má výslovný súhlas (policy.allowCloud=true od volajúceho).
3. Obsah je označený ako verejný (sensitivity 'public'). Chýbajúca alebo neznáma citlivosť = súkromné.
4. Constitution egress brána to povolí.

**SÚKROMNÉ NIKDY NEJDE NA CLOUD:**
Pamäť, história konverzácie, identita, dáta člena a misie idú vždy lokálne — ani ako fallback.

**ČO POUŽÍVATEĽ V CHATE NEVIE:**
V chate neexistuje žiadny príkaz na zapnutie cloudu. Nevymýšľaj prepínače, príkazy ani nastavenia.
Ak sa pýta, ako zapnúť cloud: je to rozhodnutie operátora stroja (.env), nie príkaz v chate.

**PREČO:**
- Súkromie (pamäť ostáva na stroji)
- Kontrola (cloud je vedomé rozhodnutie operátora, nie automatika)
- Náklady (cloud nie je zadarmo)
`;

const SP4_INTEGRATION_FACTS = `
🔄 SP4 INTEGRATION LAYER (FAKTICKÉ ÚDAJE):

**SÚBOR:** integration.js (~2400 lines)

**ZODPOVEDNOSŤ:**
- Orchestration (routing medzi personami)
- Safety rails (crisis detection)
- Validation pipeline (persona output checks)
- Memory integration (pripojenie kontextu)
- Cloud policy enforcement
- Language enforcement (Slovak output)

**PIPELINE:**
1. User message → modeCompass (detect persona)
2. Memory lookup (semantic search)
3. Policy check (cloud allowed?)
4. Prompt building (multiVoice)
5. LLM call (local/cloud)
6. Validation (persona validators)
7. Language enforcement (Slovak filter)
8. Response packaging (metadata)

**KEY MODULES:**
- modeCompass.js - auto-detect persona from input
- multiVoice.js - build system prompts
- safetyRails.js - crisis/self-harm detection (aktívny od 2026-06-25)
- languageEnforcer.js - enforce Slovak output
- consolidationEngine.js - memory compression

**NIE JE TO:**
- REST API controller (to je server.js)
- CLI interface (to je index_v07.js)
- Pure LLM wrapper (to je llmLocal.js)

**JE TO:**
- Orchestration hub (connect all pieces)
- Business logic layer
- Safety + validation gateway
`;

const SP4_ARCHITECTURE_FACTS = `
🏗️ SP4 ARCHITECTURE (FAKTICKÉ ÚDAJE):

**FAKTICKÉ JADRO SP4:**
- ${SP4_DEFINITION}
- ${SP4_FOUNDER}
- ${SP4_VALUES}
- ${SP4_LOCAL_FIRST_NATURE}
- ${SP4_AGENT_RELATION}
- ${SP4_SYSTEM_ROLE}

**RUNTIME ŠTART:**
- ${SP4_LAUNCHER_FACT}
- Legacy server flow sa spúšťa len explicitne cez script server:legacy

**5 VRSTIEV:**
1. **Data Layer** - JSON files, logs, memory (data/)
2. **Core Engine Layer** - memory, actions, scheduler (src/core/)
3. **Orchestration Layer** - integration, routing, council (src/orchestration/)
4. **Interface Layer** - CLI, HTTP server, commands (index_v07.js, server.js)
5. **Protection Layer** - validators, tests, safety (src/validators/, tests/)

**PERSONAS / RUNTIME ROLY:**
- **CORE** - technický sprievodca, architekt, debugger
- **GLITCHOSLAV** - filozofický boss, meta-awareness, poetic
- **POPIČI** - východniarsky rebel, brutal truth, slang
- **VALIDATOR** - interný diagnostics slot, nie hlavná routovateľná persona

**OFFLINE-FIRST:**
- Primary: Ollama (localhost:11434)
- Routing models: Primary: ${PRIMARY_MODEL}, Fast-path: ${FAST_PATH_MODEL}
- Cloud: voliteľne len cez LiteLLM, ak ho operátor zapol (SP4_ALLOW_CLOUD) a obsah nie je súkromný

**PREČO OFFLINE:**
- Privacy (žiadne cloudové loggovanie)
- Ownership (tvoj model, tvoja data)
- Freedom (nie si závislý od API provider)
- Speed (local LLM faster than API roundtrip)
`;

/**
 * Detect if query is about SP4 internals
 * @param {string} query - User query
 * @returns {string|null} Topic detected or null
 */
export function detectSP4Query(query) {
    const normalizedQuery = normalizeGroundingQuery(query);
    const identitySubtopics = detectIdentitySubtopics(query);

    if (isSP4MeaningQuery(query)) {
        return 'meaning';
    }

    if (identitySubtopics.founder || identitySubtopics.origin || identitySubtopics.community || identitySubtopics.direction) {
        return 'identity';
    }

    // Personas / agents keywords (must be before general SP4 architecture check)
    if (normalizedQuery.match(/\b(persony|persona|person|agent|agenti|glitchoslav|popici|validator|kolko.*agent|kolko.*person)\b/)) {
        return 'personas';
    }

    // Memory system keywords
    if (normalizedQuery.match(/\b(memory|pamat\w*|spominam|spominas|seed|log|chapters?|kapitol|konsolidacia|consolidation)\b/)) {
        return 'memory';
    }

    // Policy system keywords
    if (normalizedQuery.match(/\b(policy|politika|pravidl|cloud|local|force|offline|groq|google|api)\b/)) {
        return 'policy';
    }

    // Integration/architecture keywords
    if (normalizedQuery.match(/\b(integration|integracia|architect|pipeline|orchestr|routing|layer|vrstva)\b/)) {
        return 'integration';
    }

    // General SP4 architecture — must reference sp4 explicitly or be about SP4 architecture.
    // CRITICAL: Do NOT match generic "čo je X" or "vysvetli" without SP4 context —
    // that causes wrong-domain fallback (e.g. "čo je kvantová fyzika?" → SP4 facts).
    if (normalizedQuery.match(/\bsp4\b/) || normalizedQuery.match(/\b(architektura|struktura)\b/)) {
        return 'architecture';
    }

    return null;
}

/**
 * Get factual knowledge block for SP4 query
 * @param {string} query - User query
 * @returns {string|null} Knowledge block or null
 */
export function getSP4KnowledgeBlock(query) {
    const topic = detectSP4Query(query);
    const architectureSubtopic = topic === 'architecture' ? detectArchitectureSubtopic(query) : null;

    if (!topic) return null;

    if (topic === 'architecture' && architectureSubtopic === 'launcher') {
        return `
🚀 SP4 RUNTIME LAUNCHER (FAKTICKÉ ÚDAJE):

- ${SP4_LAUNCHER_FACT}
- Default štart = node sp4.js start
- server.js je legacy HTTP flow, nie default runtime entrypoint
- Legacy server path sa spúšťa len explicitne cez script server:legacy

${SP4_ARCHITECTURE_FACTS}
`.trim();
    }

    const knowledgeMap = {
        'identity': SP4_IDENTITY_FACTS,
        'memory': SP4_MEMORY_FACTS,
        'policy': SP4_POLICY_FACTS,
        'integration': SP4_INTEGRATION_FACTS,
        'architecture': SP4_ARCHITECTURE_FACTS,
        'meaning': `🎯 SP4 MEANING (FAKTICKÉ ÚDAJE):\n\n${SP4_MEANING_FACT}`
    };

    const baseBlock = knowledgeMap[topic] || '';

    // Always include general architecture for context
    if (topic !== 'architecture') {
        return `${baseBlock}\n\n${SP4_ARCHITECTURE_FACTS}`;
    }

    return baseBlock;
}

/**
 * Build grounding instruction for LLM
 * @param {string} knowledgeBlock - Factual knowledge block
 * @returns {string} System prompt instruction
 */
export function buildGroundingInstruction(knowledgeBlock) {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 FAKTICKÝ ZDROJ (GROUND TRUTH):

${knowledgeBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 KRITICKÉ:
- Odpovedaj PRESNE podľa týchto faktov
- NEZAVÁDZAJ vlastné výmysly (AMD cache, Intel pool, atď.)
- Ak niečo nevieš, povedz "Nemám túto informáciu"
- Nedomýšľaj - drž sa faktov
- Ak ti chýba detail, nehalucinuj - priznaj to

🎯 ÚLOHA:
Odpovedz na otázku používateľa s použitím FAKTOV zo zdroja vyššie.
Buď presný, jasný, bez spekulácií.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

/**
 * Main API - check if grounding needed and return instruction block
 * @param {string} userMessage - User query
 * @returns {string|null} Full grounding instruction or null
 */
export function getGroundingPrompt(userMessage) {
    const knowledgeBlock = getSP4KnowledgeBlock(userMessage);

    if (!knowledgeBlock) return null;

    return buildGroundingInstruction(knowledgeBlock);
}

/**
 * Safe factual fallback when LLM times out or returns empty output.
 * Keeps answer short and grounded instead of hallucinating.
 *
 * @param {string} userMessage - User query
 * @returns {string|null} Concise grounded fallback answer
 */
export function getGroundedFallbackAnswer(userMessage) {
    const topic = detectSP4Query(userMessage);
    if (!topic) return null;

    const identitySubtopics = topic === 'identity' ? detectIdentitySubtopics(userMessage) : null;
    const memorySubtopic = topic === 'memory' ? detectMemorySubtopic(userMessage) : null;
    const architectureSubtopic = topic === 'architecture' ? detectArchitectureSubtopic(userMessage) : null;

    if (identitySubtopics) {
        const answerParts = [];

        if (identitySubtopics.founder) {
            answerParts.push(SP4_FOUNDER);
        }

        if (identitySubtopics.origin) {
            answerParts.push(SP4_ORIGIN_FACT);
        }

        if (identitySubtopics.community) {
            answerParts.push(SP4_COMMUNITY_FACT);
        }

        if (identitySubtopics.direction) {
            answerParts.push(SP4_FUTURE_DIRECTION_FACT);
        }

        if (answerParts.length > 0) {
            return answerParts.join(' ');
        }
    }

    if (memorySubtopic === 'raw_log') {
        return 'Raw Log je surova vrstva SP4 pamate: drzi povodne user a assistant zaznamy pred zhrnutim. Z Raw Logu potom vznikaju zhrnutia a Seeds, aby sa kontext vracal rychlejsie nez zo suroveho logu.';
    }

    if (memorySubtopic === 'chapters') {
        return 'Chapters su stredna vrstva SP4 pamate medzi Raw Logom a Seeds. Su to tematicke zhrnutia dlhsich rozhovorov, aby sa kontext tahal rychlejsie nez priamo zo suroveho logu.';
    }

    if (architectureSubtopic === 'launcher') {
        return 'SP4 sa defaultne štartuje cez `node sp4.js start`, pretože to je kanonický entrypoint runtime. `server.js` je legacy HTTP flow a zostáva len za explicitným scriptom `server:legacy`, nie ako default. Pointa je držať default štart čistý a oddelený od legacy server cesty.';
    }

    const fallbackMap = {
        identity: `${SP4_FOUNDER} ${SP4_ORIGIN_FACT}`,
        architecture: SP4_EXTERNAL_EXPLANATION,
        meaning: SP4_MEANING_FACT,
        personas: SP4_PERSONA_ROSTER_FACT,
        memory: 'SP4 pamäť je lokálna a vrstvená: Raw Log, zhrnutia a Seeds. Používa JSON súbory, embeddingy a semantické vyhľadávanie, nie hardvérovú cache metaforu.',
        policy: 'SP4 policy vrstva rozhoduje, či sa smie použiť cloud. Default je local-first, cloud je opt-in a má byť transparentne oddelený od reálneho execution stavu.',
        integration: 'SP4 integration vrstva je orchestration hub. Spája routing, prompt build, memory, validáciu, language enforcement a policy rozhodovanie do jedného runtime flow.'
    };

    // Téma bez vlastného faktu → null (volajúci ostane pri vlastnej ceste), nikdy nie
    // architecture: otázka o persóne nesmie dostať odpoveď o SP4 architektúre.
    return fallbackMap[topic] || null;
}
