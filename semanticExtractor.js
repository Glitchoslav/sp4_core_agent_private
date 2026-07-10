// semanticExtractor.js – Extrakcia sémantickej pamäte (beliefs, concepts, relationships)
// KROK 3: Semantic memory upgrade podľa Waltera

/**
 * Extrahuje presvedčenia (beliefs) z konverzácií - WALTER UPGRADE
 * Heuristická detekcia vzorcov typu "X je Y", "X nie je Y"
 * @param {Array} entries - Raw memory entries
 * @returns {Array} - [{ topic, belief, certainty, evidence, firstObserved, lastConfirmed }]
 */
export function extractBeliefs(entries) {
    const beliefs = [];

    // Belief patterns (slovensky)
    const beliefPatterns = [
        { regex: /(\w+)\s+je\s+(\w+)/gi, certainty: 0.7 },
        { regex: /(\w+)\s+nie je\s+(\w+)/gi, certainty: 0.7 },
        { regex: /myslím,?\s+že\s+(.+)/gi, certainty: 0.6 },
        { regex: /verím,?\s+že\s+(.+)/gi, certainty: 0.8 },
        { regex: /som presvedčený,?\s+že\s+(.+)/gi, certainty: 0.9 },
        { regex: /podľa mňa\s+(.+)/gi, certainty: 0.6 },
        { regex: /určite\s+(.+)/gi, certainty: 0.8 }
    ];

    entries.forEach((entry, idx) => {
        const combined = `${entry.input} ${entry.reply}`.toLowerCase();

        beliefPatterns.forEach(pattern => {
            const matches = combined.matchAll(pattern.regex);

            for (const match of matches) {
                const beliefText = match[0];
                const topic = match[1] || 'general';

                // Zvýš certainty ak je emočná intenzita vysoká
                let certainty = pattern.certainty;
                const emotionIntensity = entry.metadata?.emotion?.user?.intensity || 0.5;
                if (emotionIntensity > 0.7) certainty = Math.min(1, certainty + 0.1);

                beliefs.push({
                    topic,
                    belief: beliefText,
                    certainty,
                    evidence: [{ entryId: idx, timestamp: entry.ts }],
                    firstObserved: entry.ts,
                    lastConfirmed: entry.ts
                });
            }
        });
    });

    console.log(`🧠 Extrahovaných ${beliefs.length} beliefs z ${entries.length} záznamov`);

    return beliefs;
}

/**
 * Merguje nové beliefs s existujúcimi (zvyšuje confidence pri opakovaní)
 * @param {Array} existingBeliefs - Aktuálne beliefs v semantic memory
 * @param {Array} newBeliefs - Novo extrahované beliefs
 * @returns {Array} - Aktualizované beliefs
 */
export function mergeBeliefs(existingBeliefs, newBeliefs) {
    const beliefMap = new Map();

    // Načítaj existujúce
    existingBeliefs.forEach(b => {
        beliefMap.set(b.belief.toLowerCase(), b);
    });

    // Merguj nové
    newBeliefs.forEach(newBelief => {
        const key = newBelief.belief.toLowerCase();

        if (beliefMap.has(key)) {
            // Zvýš confidence pri opakovaní (max 1.0)
            const existing = beliefMap.get(key);
            existing.confidence = Math.min(1.0, existing.confidence + 0.1);
            existing.sources.push(...newBelief.sources);
            existing.updatedAt = new Date().toISOString();
        } else {
            // Pridaj nový belief
            beliefMap.set(key, newBelief);
        }
    });

    return Array.from(beliefMap.values());
}

/**
 * Extrahuje koncepty (opakujúce sa témy) z tagov a konverzácií
 * @param {Array} entries - Raw memory entries
 * @returns {Array} - [{ concept, definition, relatedTopics, frequency }]
 */
export function extractConcepts(entries) {
    const conceptCounts = new Map();

    entries.forEach(entry => {
        const tags = entry.metadata?.tags || [];

        tags.forEach(tag => {
            if (!conceptCounts.has(tag)) {
                conceptCounts.set(tag, {
                    concept: tag,
                    definition: null, // TODO: generuj definíciu cez LLM
                    relatedTopics: new Set(),
                    frequency: 0
                });
            }

            const concept = conceptCounts.get(tag);
            concept.frequency++;

            // Pridaj súvisiace tagy
            tags.forEach(otherTag => {
                if (otherTag !== tag) {
                    concept.relatedTopics.add(otherTag);
                }
            });
        });
    });

    // Konvertuj Set → Array
    const concepts = Array.from(conceptCounts.values()).map(c => ({
        ...c,
        relatedTopics: Array.from(c.relatedTopics)
    }));

    // Zoraď podľa frequency
    concepts.sort((a, b) => b.frequency - a.frequency);

    return concepts;
}

/**
 * Extrahuje vzťahy medzi entitami (ľuďmi, projektami, pojmami)
 * @param {Array} entries - Raw memory entries
 * @returns {Array} - [{ entity1, entity2, relationType, strength }]
 */
export function extractRelationships(entries) {
    // Zatiaľ stub - vyžaduje entity recognition
    // TODO: Hľadať entity v texte (proper nouns, projekty...)
    // TODO: Analyzovať ko-výskyt entít v jednej konverzácii

    const relationships = [];

    // Príklad manuálneho vzťahu (zatiaľ hardcoded seed):
    relationships.push({
        entity1: 'SP4',
        entity2: 'sloboda',
        relationType: 'represents',
        strength: 1.0,
        sources: ['manifest']
    });

    relationships.push({
        entity1: 'SP4',
        entity2: 'kmeň',
        relationType: 'is_a',
        strength: 0.9,
        sources: ['manifest']
    });

    console.log('⚠️  extractRelationships() je zatiaľ stub - implementuj entity recognition');

    return relationships;
}

/**
 * Aktualizuje self-concept agenta na základe interakcií - WALTER UPGRADE
 * Postupná adaptácia core traits (80% pôvodná, 20% nová hodnota)
 * @param {Object} semanticMemory - Semantic memory objekt
 * @param {Array} entries - Raw memory entries (recent 50)
 */
export function updateSelfConcept(semanticMemory, entries) {
    // Inicializácia self-concept ak neexistuje
    if (!semanticMemory.selfConcept || semanticMemory.selfConcept.coreTraits.length === 0) {
        semanticMemory.selfConcept = {
            coreTraits: [
                { trait: 'honesty', value: 0.9 },
                { trait: 'directness', value: 0.8 },
                { trait: 'empathy', value: 0.7 },
                { trait: 'humor', value: 0.8 }
            ],
            values: [
                { value: 'freedom', importance: 0.9 },
                { value: 'authenticity', importance: 0.9 },
                { value: 'rebellion', importance: 0.8 }
            ],
            evolution: [{
                date: new Date().toISOString(),
                event: 'initialization',
                description: 'Seed values pre SP4_CORE_AGENT'
            }]
        };
    }

    // Výpočet trait scores z recent memories
    const traitScores = calculateTraitScores(entries);

    // Postupná aktualizácia core_traits (80% old, 20% new)
    semanticMemory.selfConcept.coreTraits.forEach(traitObj => {
        if (traitScores[traitObj.trait] !== undefined) {
            const previousValue = traitObj.value;
            const newScore = traitScores[traitObj.trait];

            // Weighted blend
            traitObj.value = previousValue * 0.8 + newScore * 0.2;

            // Log významných zmien (drift > 0.2)
            if (Math.abs(traitObj.value - previousValue) > 0.2) {
                semanticMemory.selfConcept.evolution.push({
                    date: new Date().toISOString(),
                    trait: traitObj.trait,
                    previousValue,
                    newValue: traitObj.value,
                    event: 'trait_evolution'
                });

                console.log(`🔄 Trait evolution: ${traitObj.trait} ${previousValue.toFixed(2)} → ${traitObj.value.toFixed(2)}`);
            }
        }
    });

    console.log(`🪞 Self-concept updated z ${entries.length} interakcií`);
}

/**
 * Výpočet trait scores z recent memories - Walter heuristika
 */
function calculateTraitScores(entries) {
    const scores = {
        honesty: 0,
        directness: 0,
        empathy: 0,
        humor: 0
    };

    let count = entries.length || 1;

    entries.forEach(entry => {
        const reply = entry.reply?.toLowerCase() || '';

        // Honesty - priame priznanie nevedomosti
        if (reply.includes('neviem') || reply.includes('nie som si istý')) {
            scores.honesty += 0.02;
        }

        // Directness - krátke odpovede, priame vety
        if (reply.length < 150 || reply.includes('priamo povedané')) {
            scores.directness += 0.02;
        } else if (reply.includes('na jednej strane') && reply.includes('na druhej strane')) {
            scores.directness -= 0.01; // Diplomatické vyhýbanie
        }

        // Empathy - empatické frázy
        if (reply.includes('chápem') || reply.includes('rozumiem') || reply.includes('to musí byť')) {
            scores.empathy += 0.02;
        }

        // Humor - vtip, emoji, lol
        if (reply.includes('😂') || reply.includes('haha') || reply.includes('lol') || reply.includes(':D')) {
            scores.humor += 0.02;
        }
    });

    // Normalizácia a clamp 0-1
    Object.keys(scores).forEach(key => {
        scores[key] = Math.min(Math.max(scores[key], 0), 1);
    });

    return scores;
}
