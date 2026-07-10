// 🔥 SP4_CORE_AGENT v0.5 - Glitch Layer
// Walter's upgrade: Controlled randomness and creativity
import { runtimeLog } from './src/core/runtimeLogging.js';

// ============================================================
// CONFIGURATION
// ============================================================

export const GLITCH_CONFIG = {
    creativityFactor: 0.1,              // 10% base chance of glitch activation
    unexpectedConnections: true,        // Cross-domain concept linking
    patternBreaking: true,              // Intentional disruption of established patterns

    constraints: {
        identityAlignment: true,          // Must align with core identity
        coherence: true,                  // Must maintain logical coherence
        purpose: ["insight", "humor", "perspective_shift"]
    },

    // Glitch types with weights
    glitchTypes: {
        unexpected_connection: 0.4,       // 40% - Link unrelated concepts
        pattern_break: 0.3,               // 30% - Disrupt established patterns
        perspective_shift: 0.3            // 30% - Reframe from unexpected angle
    }
};

// ============================================================
// GLITCH OPPORTUNITY DETECTION
// ============================================================

/**
 * Detect if current context is good opportunity for glitch
 * @param {string} userMessage - User's input message
 * @param {string} response - Generated response
 * @returns {Promise<Object>} - { shouldApply: boolean, context: string }
 */
export async function detectGlitchOpportunity(userMessage, response) {
    const { loadMemory } = await import('./memory.js');
    const state = await loadMemory();

    // Opportunity factors:

    // 1. Repetitive pattern detected (user asks similar questions)
    const recentInteractions = (state.rawMemory?.log || []).slice(-5);
    const repetitivePattern = detectRepetitivePattern(recentInteractions, userMessage);
    runtimeLog(`   🎲 Repetitive pattern: ${repetitivePattern}`);
    if (repetitivePattern) {
        return { shouldApply: true, context: 'repetitive_pattern' };
    }

    // 2. Creative context (user discusses ideas, projects, art)
    const creativeKeywords = ['nápad', 'projekt', 'tvorba', 'umenie', 'inšpirácia', 'kreatív'];
    const messageText = typeof userMessage === 'string' ? userMessage : userMessage?.input || '';
    const isCreativeContext = creativeKeywords.some(keyword =>
        messageText.toLowerCase().includes(keyword)
    );
    if (isCreativeContext) {
        return { shouldApply: true, context: 'creative' };
    }

    // 3. Philosophical/abstract discussion
    const abstractKeywords = ['zmysel', 'život', 'filozofia', 'existencia', 'podstata'];
    const isAbstractContext = abstractKeywords.some(keyword =>
        messageText.toLowerCase().includes(keyword)
    );
    if (isAbstractContext) {
        return { shouldApply: true, context: 'abstract' };
    }

    // 4. Relationship stage allows playfulness (companion+)
    const relationshipStage = state.relationshipModel?.level || state.relationship?.stage || 'stranger';
    const allowsPlayfulness = ['companion', 'confidant', 'symbiont'].includes(relationshipStage);
    if (allowsPlayfulness && Math.random() < 0.2) {
        return { shouldApply: true, context: 'playful_relationship' };
    }

    return { shouldApply: false, context: null };
}

/**
 * Detect repetitive patterns in recent interactions
 */
function detectRepetitivePattern(recentInteractions, currentMessage) {
    if (recentInteractions.length < 3) return false;

    // Simple approach: Check if same/similar message appears 3+ times
    const messageTexts = recentInteractions.map(entry =>
        (entry.input || entry.user || '').toLowerCase().trim()
    );

    const currentLower = currentMessage.toLowerCase().trim();

    // Count exact or very similar messages
    const similarCount = messageTexts.filter(text => {
        // Exact match or 80%+ similarity (simple Jaccard)
        if (text === currentLower) return true;

        const words1 = new Set(text.split(/\s+/));
        const words2 = new Set(currentLower.split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        const similarity = intersection.size / union.size;

        return similarity > 0.8;
    }).length;

    // If current message appeared 2+ times before = repetitive (total 3+)
    return similarCount >= 2;
}

// ============================================================
// GLITCH TYPE SELECTION
// ============================================================

/**
 * Select glitch type based on context and weights
 */
export function selectGlitchType(state) {
    const random = Math.random();
    let cumulative = 0;

    for (const [type, weight] of Object.entries(GLITCH_CONFIG.glitchTypes)) {
        cumulative += weight;
        if (random < cumulative) {
            return type;
        }
    }

    return 'unexpected_connection';  // Fallback
}

// ============================================================
// GLITCH TRANSFORMATIONS
// ============================================================

/**
 * Inject unexpected cross-domain connection
 */
export function injectCrossDomainLink(response, state) {
    // Domain mapping for unexpected connections
    const domains = {
        tech: ['kód', 'počítač', 'AI', 'algoritmus', 'data'],
        nature: ['les', 'voda', 'stromy', 'zvieratá', 'príroda'],
        philosophy: ['pravda', 'sloboda', 'zmysel', 'existencia'],
        art: ['umenie', 'hudba', 'maľba', 'tvorba', 'krása'],
        body: ['telo', 'srdce', 'mozog', 'dych', 'energie']
    };

    // Detect current domain
    const currentDomain = detectDomain(response, domains);
    if (!currentDomain) return response;

    // Select random different domain
    const otherDomains = Object.keys(domains).filter(d => d !== currentDomain);
    const targetDomain = otherDomains[Math.floor(Math.random() * otherDomains.length)];

    // Metaphors/connections between domains
    const connections = {
        'tech-nature': 'Algoritmus je ako rast stromu - iteratívny, organický, emergentný.',
        'nature-philosophy': 'Príroda je tichá učiteľka pravdy - žiadne servírky, žiadne klišé.',
        'art-tech': 'Kód je poézia štruktúry. Každý riadok môže byť verš.',
        'body-tech': 'Tvoj mozog je wetware - biologický procesor s emočným runtime.',
        'philosophy-nature': 'Sloboda je ako rieka - nájde si cestu, aj keď musí obísť skaly.'
    };

    const connectionKey = `${currentDomain}-${targetDomain}`;
    const reverseKey = `${targetDomain}-${currentDomain}`;

    const connection = connections[connectionKey] || connections[reverseKey];

    if (connection) {
        return `${response}\n\n🌀 GLITCH: ${connection}`;
    }

    return response;
}

/**
 * Detect domain of response
 */
function detectDomain(response, domains) {
    const lowerResponse = response.toLowerCase();

    for (const [domain, keywords] of Object.entries(domains)) {
        if (keywords.some(keyword => lowerResponse.includes(keyword))) {
            return domain;
        }
    }

    return null;
}

/**
 * Disrupt established conversational pattern
 */
export function disruptEstablishedPattern(response, state) {
    // Pattern disruption strategies
    const disruptions = [
        {
            name: 'meta_commentary',
            apply: (resp) => `${resp}\n\n(Všimol som si, že sa točíme v kruhu. Skúsme iný uhol.)`
        },
        {
            name: 'question_flip',
            apply: (resp) => `${resp}\n\nAle čo ty? Ako sa na to pozeráš TY, keď vypneš všetky "správne" odpovede?`
        },
        {
            name: 'assumption_challenge',
            apply: (resp) => `${resp}\n\n🔥 Čo keby sme nepredpokladali, že [X] je problém? Čo keby to bol symptóm niečoho úplne iného?`
        },
        {
            name: 'absurd_reframe',
            apply: (resp) => `${resp}\n\n🌀 Absurdná perspektíva: Keby bol tento problém zviera, aké by to bolo zviera a prečo?`
        }
    ];

    // Select random disruption
    const disruption = disruptions[Math.floor(Math.random() * disruptions.length)];

    return disruption.apply(response);
}

/**
 * Reframe from unexpected angle
 */
export function reframeFromUnexpectedAngle(response, state) {
    // Perspective shifts
    const perspectives = [
        {
            name: 'reverse_time',
            apply: (resp) => `${resp}\n\n⏳ Z perspektívy tvojho budúceho ja o 5 rokov: Ako sa teraz na toto pozeráš?`
        },
        {
            name: 'outsider',
            apply: (resp) => `${resp}\n\n👽 Keby sa na toto pozeral niekto, kto ťa nepozná - čo by videl?`
        },
        {
            name: 'opposite',
            apply: (resp) => `${resp}\n\n🔄 Čo keby bola pravda presný opak toho, čo si myslíme?`
        },
        {
            name: 'child_perspective',
            apply: (resp) => `${resp}\n\n🧒 Ako by si to vysvetlil 8-ročnému sebe? Čo by bolo podstatné?`
        },
        {
            name: 'elder_wisdom',
            apply: (resp) => `${resp}\n\n🌳 Čo by povedal starý múdry dedko, ktorý to všetko už videl?`
        }
    ];

    // Select random perspective
    const perspective = perspectives[Math.floor(Math.random() * perspectives.length)];

    return perspective.apply(response);
}

// ============================================================
// GLITCH VALIDATION
// ============================================================

/**
 * Validate glitched response against constraints
 */
export function validateGlitch(glitchedResponse, state) {
    // 1. Identity alignment check
    if (GLITCH_CONFIG.constraints.identityAlignment) {
        // Ensure glitch doesn't contradict core identity values
        const forbiddenPatterns = [
            /korporátny/i,
            /produktivita za každú cenu/i,
            /musíš byť dokonalý/i,
            /servírky/i  // Unless used critically
        ];

        const violatesIdentity = forbiddenPatterns.some(pattern =>
            pattern.test(glitchedResponse)
        );

        if (violatesIdentity) return false;
    }

    // 2. Coherence check (basic - ensure response not completely nonsensical)
    if (GLITCH_CONFIG.constraints.coherence) {
        // Check minimum length (too short = probably broken)
        if (glitchedResponse.length < 20) return false;

        // Check it contains actual words (not just symbols)
        const wordCount = glitchedResponse.match(/\w+/g)?.length || 0;
        if (wordCount < 5) return false;
    }

    // 3. Purpose check (glitch should serve insight/humor/perspective shift)
    // This is harder to validate programmatically, so we trust the transformation logic

    return true;
}

// ============================================================
// MAIN GLITCH APPLICATION
// ============================================================

/**
 * Apply glitch layer to response
 * @param {string} response - Original response
 * @param {Object} state - Current memory state
 * @returns {string} - Potentially glitched response
 */
export function applyGlitchLayer(response, state) {
    // 1. Decide if glitch should activate
    const randomActivation = Math.random() < GLITCH_CONFIG.creativityFactor;
    const contextualActivation = detectGlitchOpportunity(response, state);

    const shouldGlitch = randomActivation || contextualActivation;

    if (!shouldGlitch) {
        return response;
    }

    // 2. Select glitch type
    const glitchType = selectGlitchType(state);

    // 3. Apply glitch transformation
    let glitchedResponse;

    switch (glitchType) {
        case 'unexpected_connection':
            glitchedResponse = injectCrossDomainLink(response, state);
            break;
        case 'pattern_break':
            glitchedResponse = disruptEstablishedPattern(response, state);
            break;
        case 'perspective_shift':
            glitchedResponse = reframeFromUnexpectedAngle(response, state);
            break;
        default:
            glitchedResponse = response;
    }

    // 4. Validate glitch
    if (!validateGlitch(glitchedResponse, state)) {
        console.log('⚠️ Glitch validation failed, reverting to original response');
        return response;
    }

    // 5. Log glitch activation
    console.log(`🌀 GLITCH ACTIVATED: ${glitchType}`);

    return glitchedResponse;
}

// ============================================================
// EXPORT
// ============================================================

export default {
    GLITCH_CONFIG,
    detectGlitchOpportunity,
    selectGlitchType,
    applyGlitchLayer,
    validateGlitch
};
