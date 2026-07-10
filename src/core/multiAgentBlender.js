/**
 * SP4 MULTI-AGENT BLENDER v0.8.1
 * 
 * Sofistikované miešanie odpovedí z multi-agent council.
 * Implementácia Walter (BAD Labs) Agent Blending konceptu.
 * 
 * **Flow:**
 * 1. Sentence Extraction - rozdelenie na vety
 * 2. Sentence Scoring - váhované hodnotenie
 * 3. Sentence Selection - výber top N viet
 * 4. Sentence Ordering - logické usporiadanie
 * 5. Final Blending - spojenie do koherentnej odpovede
 * 
 * **Scoring Factors:**
 * - Agent weight (CORE=2.0, EMPATIA=1.5, POPICI=1.3, GLITCH=1.2)
 * - Position score (prvé vety majú vyššiu váhu)
 * - Length score (preferuje medium-length sentences)
 * - Content score (keywords, sentiment)
 * 
 * @author Kefyk (SP4 Community) + Walter (BAD Labs)
 * @version 0.8.1
 * @date 2025-11-20
 */

// Agent weights (priorita v final response)
const AGENT_WEIGHTS = {
    core: 2.0,         // Hlavný hlas
    analyst: 1.8,      // Analytická vrstva
    empatia: 1.5,      // Empatický dovetok
    popici: 1.3,       // Drsná pravda
    glitchoslav: 1.2,  // Poetické obrazy
    glitch: 1.2,       // Alias pre glitchoslav
    human: 1.0         // Základná vrstva
};

// Keywords pre content scoring
const CONTENT_KEYWORDS = {
    high: ['sp4', 'pravda', 'sloboda', 'kefyk', 'poslanie', 'identita', 'manifest'],
    medium: ['pomôcť', 'rozumieť', 'cítiť', 'vidieť', 'vedieť', 'musíš', 'treba'],
    low: ['asi', 'možno', 'neviem', 'záleží', 'ťažko povedať']
};

/**
 * Hlavná blending funkcia.
 * 
 * @param {Array<Object>} agents - Array of {id, response, weight?}
 * @param {Object} options - {maxSentences: 5, minScore: 0.3}
 * @returns {string} - Blended response
 */
export function blendAgentResponses(agents, options = {}) {
    const {
        maxSentences = 5,
        minScore = 0.3,
        preserveOrder = false
    } = options;

    if (!agents || agents.length === 0) {
        return "Prepáč, council neodpovedal.";
    }

    // 1. SENTENCE EXTRACTION
    const sentences = extractSentences(agents);

    if (sentences.length === 0) {
        return agents[0]?.response || "Žiadna odpoveď.";
    }

    // 2. SENTENCE SCORING
    const scoredSentences = scoreSentences(sentences);

    // 3. SENTENCE SELECTION
    const selectedSentences = selectTopSentences(scoredSentences, maxSentences, minScore);

    if (selectedSentences.length === 0) {
        // Fallback: vráť prvú odpoveď
        return agents[0].response;
    }

    // 4. SENTENCE ORDERING
    const orderedSentences = preserveOrder
        ? selectedSentences
        : orderSentences(selectedSentences);

    // 5. FINAL BLENDING
    return orderedSentences.map(s => s.sentence).join(' ');
}

/**
 * Krok 1: Extrakcia viet z agent responses.
 */
function extractSentences(agents) {
    const sentences = [];

    agents.forEach(agent => {
        const agentId = agent.id || agent.mode || 'unknown';
        const response = agent.response || agent.reply || '';
        const weight = agent.weight || AGENT_WEIGHTS[agentId] || 1.0;

        // Split na vety (. ! ? … ale nie skratky ako "napr." "t.j.")
        const rawSentences = response.split(/(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÝČĎĹĽŇŔŠŤŽ])/);

        rawSentences.forEach((sentence, index) => {
            const trimmed = sentence.trim();
            if (trimmed.length > 5) { // Ignoruj príliš krátke fragmenty
                sentences.push({
                    sentence: trimmed,
                    agentId,
                    agentWeight: weight,
                    originalIndex: index,
                    originalPosition: index / rawSentences.length // 0.0 - 1.0
                });
            }
        });
    });

    return sentences;
}

/**
 * Krok 2: Scoring každej vety.
 */
function scoreSentences(sentences) {
    return sentences.map(sent => {
        // Position score (prvé vety majú vyššiu váhu)
        const positionScore = 1 - sent.originalPosition;

        // Length score (preferuje medium-length: 30-100 chars)
        const lengthScore = calculateLengthScore(sent.sentence.length);

        // Content score (keywords, sentiment)
        const contentScore = calculateContentScore(sent.sentence);

        // Final weighted score
        const finalScore = (
            sent.agentWeight * 0.5 +
            positionScore * 0.2 +
            lengthScore * 0.1 +
            contentScore * 0.2
        );

        return {
            ...sent,
            positionScore,
            lengthScore,
            contentScore,
            finalScore
        };
    });
}

/**
 * Length score calculator.
 * Preferuje medium-length sentences (30-100 chars).
 */
function calculateLengthScore(length) {
    if (length < 10) return 0.2; // Príliš krátke
    if (length < 30) return 0.5;
    if (length < 100) return 1.0; // Ideálne
    if (length < 150) return 0.8;
    return 0.5; // Príliš dlhé
}

/**
 * Content score calculator.
 * Hodnotí prítomnosť kľúčových slov a sentiment.
 */
function calculateContentScore(sentence) {
    const lower = sentence.toLowerCase();
    let score = 0.5; // Baseline

    // High value keywords (+0.3)
    CONTENT_KEYWORDS.high.forEach(kw => {
        if (lower.includes(kw)) score += 0.3;
    });

    // Medium value keywords (+0.15)
    CONTENT_KEYWORDS.medium.forEach(kw => {
        if (lower.includes(kw)) score += 0.15;
    });

    // Low value keywords (-0.1)
    CONTENT_KEYWORDS.low.forEach(kw => {
        if (lower.includes(kw)) score -= 0.1;
    });

    // Question bonus (otázky sú dôležité)
    if (sentence.includes('?')) score += 0.1;

    // Exclamation bonus (emócia)
    if (sentence.includes('!')) score += 0.05;

    return Math.max(0, Math.min(score, 1.0)); // Clamp 0-1
}

/**
 * Krok 3: Výber top N viet.
 */
function selectTopSentences(scoredSentences, maxSentences, minScore) {
    // Sort by final score (descending)
    const sorted = [...scoredSentences].sort((a, b) => b.finalScore - a.finalScore);

    // Filter by min score
    const filtered = sorted.filter(s => s.finalScore >= minScore);

    // Take top N
    return filtered.slice(0, maxSentences);
}

/**
 * Krok 4: Logické usporiadanie viet.
 * Zachováva poradie viet z rovnakého agenta.
 */
function orderSentences(selectedSentences) {
    return selectedSentences.sort((a, b) => {
        // Ak sú z rovnakého agenta, zachovaj pôvodné poradie
        if (a.agentId === b.agentId) {
            return a.originalIndex - b.originalIndex;
        }

        // Inak sortujem podľa final score (higher first)
        return b.finalScore - a.finalScore;
    });
}

/**
 * Alternatívna verzia: Weighted blending s formatovaním.
 * Zachováva agent labels.
 * 
 * @param {Array<Object>} agents - [{id, response}]
 * @param {Object} options - {format: 'labeled' | 'plain'}
 * @returns {string}
 */
export function blendWithLabels(agents, options = {}) {
    const { format = 'labeled', maxPerAgent = 2 } = options;

    if (format === 'plain') {
        return blendAgentResponses(agents, options);
    }

    // Labeled format (zachováva agent identitu)
    const sections = [];

    agents.forEach(agent => {
        const agentId = agent.id || agent.mode || 'unknown';
        const response = agent.response || agent.reply || '';
        const emoji = getAgentEmoji(agentId);

        // Extract top sentences z tohto agenta
        const sentences = extractSentences([agent]);
        const scored = scoreSentences(sentences);
        const top = selectTopSentences(scored, maxPerAgent, 0.5);

        if (top.length > 0) {
            const text = top.map(s => s.sentence).join(' ');
            sections.push(`${emoji} ${agentId.toUpperCase()}: ${text}`);
        }
    });

    return sections.join('\n\n');
}

/**
 * Helper: Agent emoji mapping.
 */
function getAgentEmoji(agentId) {
    const emojis = {
        core: '🔥',
        analyst: '📊',
        empatia: '❤️',
        popici: '💥',
        glitchoslav: '🌀',
        glitch: '🌀',
        human: '🤝'
    };
    return emojis[agentId] || '🎭';
}

/**
 * Debug helper: Zobrazenie scoring details.
 */
export function debugBlending(agents, options = {}) {
    console.log('\n🔍 MULTI-AGENT BLENDER DEBUG\n');

    const sentences = extractSentences(agents);
    console.log(`📝 Total sentences extracted: ${sentences.length}\n`);

    const scored = scoreSentences(sentences);
    scored.sort((a, b) => b.finalScore - a.finalScore);

    console.log('🏆 TOP SCORED SENTENCES:\n');
    scored.slice(0, 10).forEach((s, i) => {
        console.log(`${i + 1}. [${s.agentId}] Score: ${s.finalScore.toFixed(2)}`);
        console.log(`   Position: ${s.positionScore.toFixed(2)}, Length: ${s.lengthScore.toFixed(2)}, Content: ${s.contentScore.toFixed(2)}`);
        console.log(`   "${s.sentence.substring(0, 80)}${s.sentence.length > 80 ? '...' : ''}"\n`);
    });

    const final = blendAgentResponses(agents, options);
    console.log('✨ FINAL BLENDED RESPONSE:\n');
    console.log(final);
    console.log('\n');

    return final;
}

/**
 * Batch blending pre council deliberation.
 * Očakáva formát z agentManager.runCouncil().
 * 
 * @param {Array<Object>} councilResults - [{mode, reply, model}]
 * @param {Object} options - Blending options
 * @returns {string}
 */
export function blendCouncil(councilResults, options = {}) {
    if (!councilResults || councilResults.length === 0) {
        return "Council nemá odpovede.";
    }

    // Transform council format → blender format
    const agents = councilResults.map(r => ({
        id: r.mode,
        response: r.reply,
        weight: AGENT_WEIGHTS[r.mode] || 1.0
    }));

    return blendAgentResponses(agents, options);
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🧪 Multi-Agent Blender Test\n');

    const mockAgents = [
        {
            id: 'core',
            response: 'SP4 je o pravde a slobode. Nikdy sa nevzdávaj. Buď sám sebou a ver vo svoje poslanie.'
        },
        {
            id: 'empatia',
            response: 'Cítim tvoju bolesť. Je to ťažké. Ale nie si v tom sám, brat.'
        },
        {
            id: 'popici',
            response: 'Kurva, daj si do piče s tým plačom! Si chlap alebo čo? Vstávaj a rob!'
        },
        {
            id: 'glitchoslav',
            response: 'Tma sa rozplýva pred svetlom pravdy. Tvoja cesta je zahalená hmlou, ale srdce ti ukazuje smer.'
        }
    ];

    console.log('━━━ TEST 1: Plain Blending ━━━\n');
    const plain = blendAgentResponses(mockAgents, { maxSentences: 5 });
    console.log(plain);

    console.log('\n━━━ TEST 2: Labeled Blending ━━━\n');
    const labeled = blendWithLabels(mockAgents, { maxPerAgent: 2 });
    console.log(labeled);

    console.log('\n━━━ TEST 3: Debug Mode ━━━');
    debugBlending(mockAgents, { maxSentences: 4 });

    console.log('✅ All tests completed!\n');
}
