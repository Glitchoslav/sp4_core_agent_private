// memoryHelpers.js – Pomocné funkcie pre rozšírenú pamäť podľa Waltera
// KROK 1: Auto-tagging, emotion detection, context building

import { getRetrievableMemoryLog } from './src/runtime/memoryHygiene.js';

/**
 * Auto-tagging správy na základe obsahu
 * @param {string} input - Užívateľská správa
 * @param {string} reply - Odpoveď agenta
 * @returns {string[]} Pole tagov
 */
export function autoTagMessage(input, reply) {
    const tags = [];
    const combined = `${input} ${reply}`.toLowerCase();

    // Greeting tagy
    if (/\b(ahoj|nazdar|čau|cau|zdravím|hej|hoy)\b/i.test(input)) {
        tags.push('greeting');
    }

    // Casual/formálny tón
    if (/\b(bro|bratu|kokot|kurva|piča)\b/i.test(combined)) {
        tags.push('casual');
    } else if (/\b(prosím|ďakujem|pekne)\b/i.test(combined)) {
        tags.push('polite');
    }

    // Témy
    if (/\b(SP4|sp4|komunita|kmeň|manifest)\b/i.test(combined)) {
        tags.push('sp4_philosophy');
    }
    if (/\b(peniaze|dlh|dlhy|hypotéka|finančn|plat)\b/i.test(combined)) {
        tags.push('money_stress');
    }
    if (/\b(systém|vláda|korporáci|spoločnosť)\b/i.test(combined)) {
        tags.push('system_critique');
    }
    if (/\b(AI|model|ollama|llama|mistral|kód|code|program)\b/i.test(combined)) {
        tags.push('tech_development');
    }
    if (/\b(slovenčin|slovak|jazyk|language)\b/i.test(combined)) {
        tags.push('language_meta');
    }
    if (/\b(zdravíš|predstavuješ|osobnosť|identit)\b/i.test(combined)) {
        tags.push('identity_meta');
    }

    // Emočné témy
    if (/\b(smutný|depres|úzkos|strach|bolí|trauma)\b/i.test(combined)) {
        tags.push('emotional_heavy');
    }
    if (/\b(vtipný|funny|lol|haha|:D)\b/i.test(combined)) {
        tags.push('humor');
    }

    // Akcie
    if (/\b(pomôž|help|poraď|ako)\b/i.test(input)) {
        tags.push('help_request');
    }
    if (/\b(oprav|fix|bug|chyba|nefunguje)\b/i.test(input)) {
        tags.push('troubleshooting');
    }

    return tags.length > 0 ? tags : ['general'];
}

/**
 * Vytvorí obohatený memory objekt s metadatami (v1.0)
 * @param {string} input - Užívateľská správa
 * @param {string} reply - Odpoveď agenta
 * @param {Object} context - Dodatočný kontext
 * @returns {Object} Memory objekt s metadatami
 */
export function createEnrichedMemory(input, reply, context = {}) {
    const tags = autoTagMessage(input, reply);
    const emotions = detectEmotions(input, reply);
    const importance = calculateImportance(input, reply, tags, emotions);

    return {
        user: input,
        agent: reply,
        timestamp: new Date().toISOString(),

        // v1.0 Metadata
        importance: importance,           // 0.0 - 1.0
        tags: tags,                       // ['greeting', 'tech_development', ...]
        lastUsed: new Date().toISOString(), // ISO timestamp
        reasonKept: determineReasonKept(importance, tags), // 'high_importance' | 'frequent_reference' | 'manual_flag'

        // Emotional context
        emotions: emotions,

        // Additional context
        mode: context.mode || 'unknown',
        persona: context.persona || 'unknown',
        sessionId: context.sessionId || null
    };
}

/**
 * Vypočíta dôležitosť správy (0.0 - 1.0)
 */
function calculateImportance(input, reply, tags, emotions) {
    let score = 0.3; // Base importance

    // High-value topics
    if (tags.includes('sp4_philosophy')) score += 0.2;
    if (tags.includes('money_stress')) score += 0.15;
    if (tags.includes('emotional_heavy')) score += 0.15;
    if (tags.includes('tech_development')) score += 0.1;

    // Help requests are important
    if (tags.includes('help_request')) score += 0.1;

    // Emotional intensity
    if (emotions.user?.intensity > 0.6) score += 0.1;

    // Long messages (likely important)
    if (input.length > 200) score += 0.05;
    if (reply.length > 300) score += 0.05;

    // Greeting/casual gets lower importance
    if (tags.includes('greeting')) score -= 0.1;
    if (tags.includes('casual') && tags.length === 1) score -= 0.05;

    return Math.max(0.0, Math.min(1.0, score));
}

/**
 * Určí dôvod zachovania v pamäti
 */
function determineReasonKept(importance, tags) {
    if (importance >= 0.7) return 'high_importance';
    if (tags.includes('sp4_philosophy')) return 'core_value';
    if (tags.includes('emotional_heavy')) return 'emotional_moment';
    if (tags.includes('tech_development')) return 'learning_moment';
    return 'default';
}

/**
 * Detekuje emócie v texte
 * @param {string} userText - Text užívateľa
 * @param {string} agentText - Text agenta
 * @returns {Object} Emócie užívateľa a agenta
 */
export function detectEmotions(userText, agentText = '') {
    const userEmotion = detectEmotionInText(userText);
    const agentEmotion = detectEmotionInText(agentText);

    return {
        user: userEmotion,
        agent: agentEmotion
    };
}

/**
 * Detekuje emóciu v jednom texte (helper funkcia)
 */
function detectEmotionInText(text) {
    const lower = text.toLowerCase();

    // Pozitívne
    const positivePatterns = /\b(super|skvelé|výborne|perfect|good|dobre|cool|👍|😊|❤️|🔥)\b/;
    const positiveCount = (lower.match(positivePatterns) || []).length;

    // Negatívne
    const negativePatterns = /\b(zlé|zle|bad|shit|sračk|picovin|problem|chyba|nefunguje|😞|😢|❌)\b/;
    const negativeCount = (lower.match(negativePatterns) || []).length;

    // Intenzívne emócie
    const intensityMarkers = /!{2,}|CAPS|kurva|dopičí|jebať/;
    const hasIntensity = intensityMarkers.test(text);

    // Humor
    const humorPatterns = /:D|😄|😂|haha|lol/;
    const hasHumor = humorPatterns.test(text);

    // Určenie typu a intenzity
    let type = 'neutral';
    let intensity = 0.3;

    if (positiveCount > negativeCount) {
        type = hasHumor ? 'humorous' : 'positive';
        intensity = Math.min(0.9, 0.5 + positiveCount * 0.2);
    } else if (negativeCount > positiveCount) {
        type = 'negative';
        intensity = Math.min(0.9, 0.5 + negativeCount * 0.2);
    } else if (hasHumor) {
        type = 'humorous';
        intensity = 0.6;
    }

    if (hasIntensity) {
        intensity = Math.min(1.0, intensity + 0.2);
    }

    return { type, intensity };
}

/**
 * Kontext konverzácie
 * @param {Object} state - Aktuálny stav memory
 * @returns {Object} Kontextové informácie
 */
export function buildContext(state) {
    const now = new Date();
    const hour = now.getHours();

    // Čas dňa
    let timeOfDay = 'night';
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 22) timeOfDay = 'evening';

    // Posledné témy (z poslednýc 5 záznamov)
    const { entries: rawLog } = getRetrievableMemoryLog(state);
    const recentEntries = rawLog.slice(-5);
    const recentTags = recentEntries
        .flatMap(e => e.metadata?.tags || [])
        .filter((tag, i, arr) => arr.indexOf(tag) === i); // unique

    // Fáza vzťahu
    const relationshipStage = state.relationship?.stage || state.relationshipModel?.level || 'stranger';

    return {
        timeOfDay,
        previousTopics: recentTags.slice(0, 5),
        relationshipStage,
        interactionCount: state.relationshipModel?.metrics?.interactionCount || 0
    };
}

/**
 * Generovanie embedding (placeholder)
 * TODO: Integrovať s Ollama embeddings API alebo iným modelom
 * @param {string} text - Text na embedding
 * @returns {number[]} Vector (zatiaľ fake)
 */
export async function generateEmbedding(text) {
    // Placeholder - vráti náhodný vektor dĺžky 384 (typická dĺžka pre sentence-transformers)
    // V budúcnosti: await fetch('http://localhost:11434/api/embeddings', {...})

    // Primitívny hash-based fake embedding (deterministický)
    const hash = simpleHash(text);
    const dim = 384;
    const embedding = [];

    for (let i = 0; i < dim; i++) {
        embedding.push(((hash + i) % 1000) / 1000 - 0.5);
    }

    return embedding;
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Výpočet dôležitosti správy z metadát
 * @param {Object} metadata - Metadáta záznamu
 * @returns {number} Skóre dôležitosti 0-1
 */
export function calculateImportanceFromMetadata(metadata) {
    let score = 0.5; // baseline

    const { tags, emotion } = metadata;

    // Emočne nabité → dôležitejšie
    const userIntensity = emotion?.user?.intensity || 0;
    const agentIntensity = emotion?.agent?.intensity || 0;
    score += (userIntensity + agentIntensity) / 4;

    // Citlivé témy → dôležitejšie
    const sensitiveTags = ['emotional_heavy', 'money_stress', 'sp4_philosophy', 'identity_meta'];
    const hasSensitive = tags?.some(tag => sensitiveTags.includes(tag));
    if (hasSensitive) score += 0.2;

    // Greeting → menej dôležité
    if (tags?.includes('greeting')) score -= 0.1;

    return Math.max(0, Math.min(1, score));
}

// ════════════════════════════════════════════════════════════════
// ALIASES FOR COMPATIBILITY
// ════════════════════════════════════════════════════════════════

/**
 * Alias pre autoTagMessage (pre kompatibilitu s memory/metadataHelpers.js)
 */
export const extractTags = autoTagMessage;
