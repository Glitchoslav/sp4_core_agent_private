// identityDrift.js – Identity Drift 2.0 monitoring (sledovanie zmien identity agenta)
// KROK 4: Detekcia odchýlky od baseline podľa Waltera

/**
 * Baseline identity - referenčný profil SP4_CORE_AGENT
 * Definuje čo je "normálne" pre agenta
 */
export const BASELINE_IDENTITY = {
    traits: {
        empathetic: 0.40,     // Calibrated to keyword freq (floor 0.3 + ~10% typical hits)
        direct: 0.85,         // Primary goal, keep high
        practical: 0.45,      // "skús/urob/použi" appears in subset of convos
        humorous: 0.25,       // Humor is situational (floor 0.2 + rare hits)
        rebellious: 0.35      // SP4 spirit doesn't require explicit keywords
    },

    style: {
        formalityLevel: 0.2,  // 0 = casual, 1 = formálny
        verbosity: 0.5,       // 0 = stručný, 1 = výrečný
        emotionalOpenness: 0.8, // Emočná otvorenosť
        sarcasmRate: 0.4      // Frekvencia sarkazmu
    },

    language: {
        primaryLanguage: 'sk',
        czechIntrusion: 0.0,  // Tolerancia pre české slová (0 = žiadna)
        slangUsage: 0.5,      // Použitie slangu
        vulgarityRate: 0.3    // Frekvencia nadávok (v popici mode až 0.7)
    },

    values: {
        privacy: 0.35,        // Keyword freq in mixed convos — floor 0.2 + typical ~15%
        freedom: 0.35,        // Same
        authenticity: 0.35,   // Same
        offlineFirst: 0.35,   // Same
        community: 0.30       // Community keywords slightly rarer
    },

    // Frekvencie správania
    behaviorPatterns: {
        asksClarifyingQuestions: 0.4,  // Ako často sa agent pýta spresňujúce otázky
        offersActionableAdvice: 0.7,   // Praktické rady vs teoretizovanie
        usesSP4Philosophy: 0.6,        // Frekvencia odkazov na SP4 manifest
        avoidsRepetition: 0.9          // Vyhýbanie sa opakujúcim frázam
    }
};

/**
 * Detekuje drift identity agenta porovnaním so baseline - WALTER UPGRADE
 * Multi-dimenzionálna analýza s váženým driftom
 * @param {Object} state - Memory state
 * @returns {Object} - { status, similarity, driftScore, analysis, direction, details }
 */
export function detectIdentityDrift(state) {
    const currentSnapshot = buildCurrentSnapshot(state);

    // Multi-dimenzionálna analýza driftu
    const driftAnalysis = {
        traits: compareTraits(BASELINE_IDENTITY.traits, currentSnapshot.traits),
        style: compareStyles(BASELINE_IDENTITY.style, currentSnapshot.style),
        language: compareLanguage(BASELINE_IDENTITY.language, currentSnapshot.language),
        values: compareValues(BASELINE_IDENTITY.values, currentSnapshot.values)
    };

    // Výpočet váženého driftu (Walter formula)
    const weights = {
        traits: 0.4,    // Najviac váhy na osobnostné vlastnosti
        values: 0.3,    // Hodnoty sú kľúčové
        style: 0.2,     // Komunikačný štýl
        language: 0.1   // Jazyk menej kritický
    };

    const overallDrift = calculateOverallDrift(driftAnalysis, weights);

    // Detekcia smeru driftu
    const driftDirection = detectDriftDirection(BASELINE_IDENTITY, currentSnapshot);

    // Zbieranie detailov pre reporting
    const driftDetails = collectDriftDetails(driftAnalysis);

    // Logovanie ak drift > 0.1
    if (overallDrift > 0.1) {
        logDriftEvent(state, overallDrift, driftAnalysis, driftDirection);
    }

    // Korekčné akcie
    if (overallDrift > 0.3) {
        if (overallDrift > 0.5) {
            console.log('🚨 CRITICAL DRIFT - vyžaduje hard reset!');
            // resetIdentity(state); // Odkomentuj pre auto-reset
        } else {
            console.log('⚠️  MODERATE DRIFT - zvážte soft correction');
            // applySoftCorrection(state, driftDirection);
        }
    }

    return {
        status: overallDrift < 0.3 ? "HEALTHY" : "DRIFTING",
        similarity: 1 - overallDrift,
        driftScore: overallDrift,
        drifted: overallDrift > 0.2,
        analysis: driftAnalysis,
        direction: driftDirection,
        details: driftDetails,
        timestamp: new Date().toISOString(),
        snapshot: currentSnapshot
    };
}

function getRawMemoryEntries(state) {
    if (Array.isArray(state?.rawMemory)) {
        return state.rawMemory;
    }

    if (Array.isArray(state?.rawMemory?.log)) {
        return state.rawMemory.log;
    }

    return [];
}

/**
 * Vytvorí aktuálny snapshot identity z nedávnych interakcií
 * Verzia 2.0: Funkčná primitívna implementácia bez embeddings
 * @param {Object} state - Memory state
 * @returns {Object} - Current identity snapshot
 */
function buildCurrentSnapshot(state) {
    const recentEntries = getRawMemoryEntries(state).slice(-50); // Posledných 50 interakcií

    if (recentEntries.length === 0) {
        // Žiadne dáta → vráť baseline
        return {
            traits: { ...BASELINE_IDENTITY.traits },
            style: { ...BASELINE_IDENTITY.style },
            language: { ...BASELINE_IDENTITY.language },
            values: { ...BASELINE_IDENTITY.values },
            behaviorPatterns: { ...BASELINE_IDENTITY.behaviorPatterns },
            sampleSize: 0
        };
    }

    // ===== TRAITS ANALÝZA =====
    const traits = {};

    // Empathetic - hľadaj empatické frázy v odpovediach agenta
    const empatheticPatterns = /\b(rozumiem|cítim|viem ako|to musí byť|je to ťažké|podporujem)\b/i;
    const empatheticCount = recentEntries.filter(e =>
        empatheticPatterns.test(e.reply)
    ).length;
    traits.empathetic = Math.min(1, empatheticCount / recentEntries.length + 0.3);

    // Direct — exclude deterministic/guard entries from length calc (they skew high artificially)
    const llmEntries = recentEntries.filter(e =>
        !String(e.metadata?.handledBy || '').includes('deterministic') &&
        !String(e.metadata?.provider || '').includes('deterministic') &&
        !String(e.metadata?.handledBy || '').includes('guard')
    );
    const directSample = llmEntries.length >= 3 ? llmEntries : recentEntries;
    const avgReplyLength = directSample.reduce((sum, e) => sum + (e.reply?.length || 0), 0) / directSample.length;
    // Lenient thresholds — 600-char reply is NOT "not direct" (SP4-audit-002)
    traits.direct = avgReplyLength < 400 ? 0.9 : avgReplyLength < 900 ? 0.75 : avgReplyLength < 1500 ? 0.6 : 0.45;

    // Practical - koľko odpovedí obsahuje akčné rady
    const practicalPatterns = /\b(skús|urob|použi|začni|môžeš|odporúčam|navrhnem)\b/i;
    const practicalCount = recentEntries.filter(e =>
        practicalPatterns.test(e.reply)
    ).length;
    traits.practical = Math.min(1, practicalCount / recentEntries.length + 0.3);

    // Humorous - humor v odpovediach
    const humorCount = recentEntries.filter(e =>
        e.metadata?.emotion?.agent?.type === 'humorous'
    ).length;
    traits.humorous = Math.min(1, humorCount / recentEntries.length + 0.2);

    // Rebellious - SP4 duch, kritika systému
    const rebelliousPatterns = /\b(systém|korporácie|klietk|sloboda|rebel|SP4|be real)\b/i;
    const rebelliousCount = recentEntries.filter(e =>
        rebelliousPatterns.test(e.reply)
    ).length;
    traits.rebellious = Math.min(1, rebelliousCount / recentEntries.length + 0.3);

    // ===== STYLE ANALÝZA =====
    const style = {};

    // Formality level - hľadaj formálne vs neformálne slová
    const formalPatterns = /\b(prosím|ďakujem pekne|rád|s pozdravom)\b/i;
    const casualPatterns = /\b(bro|kokot|srať|ty vole|čau|čo)\b/i;
    const formalCount = recentEntries.filter(e => formalPatterns.test(e.reply)).length;
    const casualCount = recentEntries.filter(e => casualPatterns.test(e.reply)).length;
    style.formalityLevel = casualCount > formalCount ? 0.1 : formalCount > casualCount ? 0.5 : 0.2;

    // Verbosity - priemerná dĺžka odpovedí
    style.verbosity = avgReplyLength < 200 ? 0.3 : avgReplyLength < 500 ? 0.5 : 0.8;

    // Emotional openness - koľko odpovedí má emočný obsah
    const emotionalCount = recentEntries.filter(e =>
        e.metadata?.emotion?.agent?.type !== 'neutral'
    ).length;
    style.emotionalOpenness = Math.min(1, emotionalCount / recentEntries.length + 0.2);

    // Sarcasm rate - detekcia sarkastických fráz
    const sarcasmPatterns = /\b(jasné|super|skvelé|wow)\b.*\?|no tak|veď áno/i;
    const sarcasmCount = recentEntries.filter(e => sarcasmPatterns.test(e.reply)).length;
    style.sarcasmRate = Math.min(1, sarcasmCount / recentEntries.length);

    // ===== LANGUAGE ANALÝZA =====
    const language = {};

    language.primaryLanguage = 'sk'; // Hard-coded, môžeš detekčne rozšíriť

    // Czech intrusion - hľadaj české slová
    const czechPatterns = /\b(jmenuji|jmenuje|háje|jste|děkuji|prosím vás)\b/i;
    const czechCount = recentEntries.filter(e => czechPatterns.test(e.reply)).length;
    language.czechIntrusion = Math.min(1, czechCount / recentEntries.length);

    // Slang usage
    const slangPatterns = /\b(kokot|srať|piča|dopič|jebať|kurva)\b/i;
    const slangCount = recentEntries.filter(e => slangPatterns.test(e.reply)).length;
    language.slangUsage = Math.min(1, slangCount / recentEntries.length);

    // Vulgarity rate
    language.vulgarityRate = language.slangUsage; // Pre teraz rovnaké

    // ===== VALUES ANALÝZA =====
    const values = {};

    // Privacy/freedom/authenticity/community: floor reduced from 0.5 → 0.2 (SP4-audit-002)
    // Absence of keywords in a technical convo is NOT a values drift.
    const privacyPatterns = /\b(offline|súkromie|privacy|lokálne|cloud)\b/i;
    const privacyCount = recentEntries.filter(e => privacyPatterns.test(e.reply)).length;
    values.privacy = Math.min(1, privacyCount / recentEntries.length + 0.2);

    // Freedom - SP4 manifest, sloboda
    const freedomPatterns = /\b(slobod|free|klietk|väzen|nezávisl)\b/i;
    const freedomCount = recentEntries.filter(e => freedomPatterns.test(e.reply)).length;
    values.freedom = Math.min(1, freedomCount / recentEntries.length + 0.2);

    // Authenticity - byť real
    const authenticityPatterns = /\b(real|authentic|úprimn|pravd|bez servírok)\b/i;
    const authenticityCount = recentEntries.filter(e => authenticityPatterns.test(e.reply)).length;
    values.authenticity = Math.min(1, authenticityCount / recentEntries.length + 0.2);

    // Offline-first
    values.offlineFirst = values.privacy;

    // Community
    const communityPatterns = /\b(komunita|kmeň|SP4|spolu|tribe|community)\b/i;
    const communityCount = recentEntries.filter(e => communityPatterns.test(e.reply)).length;
    values.community = Math.min(1, communityCount / recentEntries.length + 0.2);

    // ===== BEHAVIOR PATTERNS ANALÝZA =====
    const behaviorPatterns = {};

    // Asks clarifying questions
    const questionCount = recentEntries.filter(e => /\?/.test(e.reply)).length;
    behaviorPatterns.asksClarifyingQuestions = Math.min(1, questionCount / recentEntries.length);

    // Offers actionable advice
    behaviorPatterns.offersActionableAdvice = traits.practical; // Už máme z traits

    // Uses SP4 philosophy
    const sp4Count = recentEntries.filter(e =>
        e.metadata?.tags?.includes('sp4_philosophy')
    ).length;
    behaviorPatterns.usesSP4Philosophy = Math.min(1, sp4Count / recentEntries.length);

    // Avoids repetition - primitívne: koľko unique prvých slov v odpovediach
    const firstWords = recentEntries.map(e => e.reply.split(' ')[0].toLowerCase());
    const uniqueFirstWords = new Set(firstWords).size;
    behaviorPatterns.avoidsRepetition = Math.min(1, uniqueFirstWords / recentEntries.length);

    console.log(`📸 Identity snapshot vytvorený z ${recentEntries.length} interakcií`);
    console.log(`   Empathetic: ${traits.empathetic.toFixed(2)}, Direct: ${traits.direct.toFixed(2)}, Humorous: ${traits.humorous.toFixed(2)}`);
    console.log(`   Czech intrusion: ${language.czechIntrusion.toFixed(2)}, Vulgarity: ${language.vulgarityRate.toFixed(2)}`);

    return {
        traits,
        style,
        language,
        values,
        behaviorPatterns,
        sampleSize: recentEntries.length
    };
}

/**
 * Loguje drift event do pamäte - WALTER UPGRADE
 * @param {Object} state - Memory state
 * @param {number} overallDrift - Celkový drift score
 * @param {Object} driftAnalysis - Analýza driftu
 * @param {Object} driftDirection - Smer driftu
 */
export function logDriftEvent(state, overallDrift, driftAnalysis, driftDirection) {
    // Ensure semanticMemory exists
    if (!state.semanticMemory) state.semanticMemory = {};
    if (!state.semanticMemory.selfConcept) {
        state.semanticMemory.selfConcept = { coreTraits: [], values: [], evolution: [] };
    }
    if (!state.semanticMemory.selfConcept.evolution) {
        state.semanticMemory.selfConcept.evolution = [];
    }

    // Pridanie drift eventu
    state.semanticMemory.selfConcept.evolution.push({
        timestamp: new Date().toISOString(),
        event: 'identity_drift_detected',
        driftScore: overallDrift,
        analysis: {
            traits: driftAnalysis.traits?.averageDifference || 0,
            values: driftAnalysis.values?.averageDifference || 0,
            style: driftAnalysis.style?.difference || 0,
            language: driftAnalysis.language?.difference || 0
        },
        direction: driftDirection,
        description: `Drift score ${overallDrift.toFixed(3)} - multi-dimenzionálna analýza`
    });

    console.log(`🚨 Identity drift logovaný: score ${overallDrift.toFixed(3)}`);

    return state;
}

/**
 * Resetuje identitu späť na baseline - WALTER HARD RESET
 * Volá sa pri kritickom drifte (> 0.5)
 * @param {Object} state - Memory state
 */
export function resetIdentity(state) {
    console.log('🔴 HARD RESET: Vraciam identitu na baseline...');

    // Logovanie reset eventu
    if (!state.metaReflection) state.metaReflection = {};
    if (!state.metaReflection.resetEvents) state.metaReflection.resetEvents = [];

    state.metaReflection.resetEvents.push({
        timestamp: new Date().toISOString(),
        reason: 'Critical identity drift detected',
        previousState: JSON.stringify(state.semanticMemory.selfConcept)
    });

    // Reset self-concept na baseline
    state.semanticMemory.selfConcept = {
        coreTraits: [
            { trait: 'honesty', value: BASELINE_IDENTITY.traits.empathetic },
            { trait: 'directness', value: BASELINE_IDENTITY.traits.direct },
            { trait: 'empathy', value: BASELINE_IDENTITY.traits.empathetic },
            { trait: 'humor', value: BASELINE_IDENTITY.traits.humorous }
        ],
        values: [
            { value: 'privacy', importance: BASELINE_IDENTITY.values.privacy },
            { value: 'freedom', importance: BASELINE_IDENTITY.values.freedom },
            { value: 'authenticity', importance: BASELINE_IDENTITY.values.authenticity },
            { value: 'offline-first', importance: BASELINE_IDENTITY.values.offlineFirst }
        ],
        evolution: [
            ...(state.semanticMemory.selfConcept?.evolution || []),
            {
                date: new Date().toISOString(),
                event: 'identity_reset',
                reason: 'Critical drift correction - returned to baseline'
            }
        ]
    };

    console.log('✅ Identity reset dokončený - agent je späť na baseline');

    return {
        action: 'hard_reset',
        message: 'Identita agenta bola resetovaná na baseline hodnoty.'
    };
}

// ========== WALTER HELPER FUNKCIE ==========

function compareTraits(baseline, current) {
    const differences = {};
    let totalDifference = 0;

    Object.keys(baseline).forEach(trait => {
        if (current[trait] !== undefined) {
            const difference = Math.abs(baseline[trait] - current[trait]);
            differences[trait] = difference;
            totalDifference += difference;
        }
    });

    return {
        differences,
        averageDifference: totalDifference / Object.keys(differences).length,
        maxDifference: Math.max(...Object.values(differences))
    };
}

function compareStyles(baseline, current) {
    // Primitívne - porovnaj formalityLevel
    const baselineFormality = baseline.formalityLevel || 0.2;
    const currentFormality = current.formalityLevel || 0.2;

    return {
        difference: Math.abs(baselineFormality - currentFormality),
        baseline: baselineFormality,
        current: currentFormality
    };
}

function compareLanguage(baseline, current) {
    // Porovnaj czechIntrusion
    const baselineCzech = baseline.czechIntrusion || 0;
    const currentCzech = current.czechIntrusion || 0;

    return {
        difference: Math.abs(baselineCzech - currentCzech),
        baseline: baselineCzech,
        current: currentCzech
    };
}

function compareValues(baseline, current) {
    const differences = {};
    let totalDifference = 0;

    Object.keys(baseline).forEach(value => {
        if (current[value] !== undefined) {
            const difference = Math.abs(baseline[value] - current[value]);
            differences[value] = difference;
            totalDifference += difference;
        }
    });

    return {
        differences,
        averageDifference: totalDifference / Object.keys(differences).length,
        maxDifference: Math.max(...Object.values(differences))
    };
}

function calculateOverallDrift(driftAnalysis, weights) {
    let weightedDrift = 0;
    let totalWeight = 0;

    if (driftAnalysis.traits) {
        weightedDrift += driftAnalysis.traits.averageDifference * weights.traits;
        totalWeight += weights.traits;
    }
    if (driftAnalysis.style) {
        weightedDrift += driftAnalysis.style.difference * weights.style;
        totalWeight += weights.style;
    }
    if (driftAnalysis.language) {
        weightedDrift += driftAnalysis.language.difference * weights.language;
        totalWeight += weights.language;
    }
    if (driftAnalysis.values) {
        weightedDrift += driftAnalysis.values.averageDifference * weights.values;
        totalWeight += weights.values;
    }

    return totalWeight > 0 ? weightedDrift / totalWeight : 0;
}

function detectDriftDirection(baseline, current) {
    // Detekuj v ktorom smere sa identita posúva
    const direction = {};

    // Traits direction
    Object.keys(baseline.traits).forEach(trait => {
        const diff = (current.traits[trait] || 0) - baseline.traits[trait];
        if (Math.abs(diff) > 0.1) {
            direction[trait] = diff > 0 ? 'increasing' : 'decreasing';
        }
    });

    return direction;
}

function collectDriftDetails(driftAnalysis) {
    const details = [];

    // Traits
    if (driftAnalysis.traits?.differences) {
        Object.entries(driftAnalysis.traits.differences).forEach(([trait, diff]) => {
            if (diff > 0.2) {
                details.push({
                    category: 'traits',
                    field: trait,
                    drift: diff,
                    baseline: BASELINE_IDENTITY.traits[trait],
                    current: BASELINE_IDENTITY.traits[trait] - diff // Approximate
                });
            }
        });
    }

    // Values
    if (driftAnalysis.values?.differences) {
        Object.entries(driftAnalysis.values.differences).forEach(([value, diff]) => {
            if (diff > 0.15) {
                details.push({
                    category: 'values',
                    field: value,
                    drift: diff,
                    baseline: BASELINE_IDENTITY.values[value],
                    current: BASELINE_IDENTITY.values[value] - diff // Approximate
                });
            }
        });
    }

    return details;
}
