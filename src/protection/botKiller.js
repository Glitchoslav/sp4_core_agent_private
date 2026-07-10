/**
 * 🛡️ BOT KILLER - Anti-Parasite Defense System
 * 
 * Detekuje a neutralizuje:
 * - Syntetický jazyk (bot-like responses)
 * - Manipulatívne vzorce (energy vampires)
 * - Spam a repetitívne requesty
 * - Príliš rýchle/pomalé odpovede (nie human timing)
 * 
 * @module botKiller
 * @version 0.10.0-alpha.4
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ BOT DETECTION PATTERNS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BOT_PATTERNS = {
    // Synthetic language markers
    synthetic: [
        /as an ai/i,
        /i am an ai/i,
        /i don't have personal/i,
        /i cannot provide/i,
        /here are some suggestions/i,
        /let me help you with that/i,
        /i understand your concern/i,
        /based on the information provided/i,
        /it's important to note/i
    ],

    // Manipulation patterns (energy vampires)
    manipulation: [
        /you should feel/i,
        /everyone knows that/i,
        /obviously you/i,
        /you always/i,
        /you never/i,
        /if you really cared/i,
        /a real friend would/i
    ],

    // Spam indicators
    spam: [
        /click here/i,
        /buy now/i,
        /limited time/i,
        /act now/i,
        /free money/i,
        /congratulations you won/i,
        /verify your account/i
    ],

    // Excessive formality (corporate speak)
    corporate: [
        /synergize/i,
        /leverage/i,
        /circle back/i,
        /low hanging fruit/i,
        /paradigm shift/i,
        /moving forward/i,
        /touch base/i
    ]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ TIMING ANALYSIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MESSAGE_HISTORY = []; // Track message timestamps

/**
 * Analyzuje timing správ (bot vs human patterns)
 * @param {number} timestamp - Čas správy (ms)
 * @returns {Object} { isSuspicious: boolean, reason: string, score: number }
 */
function analyzeMessageTiming(timestamp) {
    MESSAGE_HISTORY.push(timestamp);

    // Keep only last 10 messages
    if (MESSAGE_HISTORY.length > 10) {
        MESSAGE_HISTORY.shift();
    }

    // Need at least 3 messages for pattern detection
    if (MESSAGE_HISTORY.length < 3) {
        return { isSuspicious: false, reason: 'insufficient_data', score: 0 };
    }

    // Calculate intervals between messages
    const intervals = [];
    for (let i = 1; i < MESSAGE_HISTORY.length; i++) {
        intervals.push(MESSAGE_HISTORY[i] - MESSAGE_HISTORY[i - 1]);
    }

    // 1. TOO FAST - bot spam (< 200ms consistently)
    // ZMÍRNENÉ: 500ms → 200ms (user môže písať rýchlo pri testovaní)
    const tooFast = intervals.filter(i => i < 200).length;
    if (tooFast >= 5) {  // ZMÍRNENÉ: 3 → 5 (tolerantnejšie)
        return {
            isSuspicious: true,
            reason: 'too_fast_spam',
            score: 0.9,
            intervals
        };
    }

    // 2. PERFECTLY REGULAR - bot pattern (variance < 100ms)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 100 && intervals.length >= 5) {
        return {
            isSuspicious: true,
            reason: 'perfectly_regular_timing',
            score: 0.8,
            stdDev,
            avgInterval
        };
    }

    // 3. BURST PATTERN - rapid fire questions (5+ messages in 10s)
    const last10Seconds = MESSAGE_HISTORY.filter(t => timestamp - t < 10000);
    if (last10Seconds.length >= 5) {
        return {
            isSuspicious: true,
            reason: 'burst_pattern',
            score: 0.7,
            burstCount: last10Seconds.length
        };
    }

    return { isSuspicious: false, reason: 'human_timing', score: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ LANGUAGE ANALYSIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Detekuje syntetický jazyk a manipuláciu
 * @param {string} message - Užívateľská správa
 * @returns {Object} { isBot: boolean, reason: string, score: number, patterns: Array }
 */
function analyzeLanguagePatterns(message) {
    const detectedPatterns = [];
    let totalScore = 0;

    // Check synthetic patterns
    for (const pattern of BOT_PATTERNS.synthetic) {
        if (pattern.test(message)) {
            detectedPatterns.push({ type: 'synthetic', pattern: pattern.source });
            totalScore += 0.4;
        }
    }

    // Check manipulation patterns
    for (const pattern of BOT_PATTERNS.manipulation) {
        if (pattern.test(message)) {
            detectedPatterns.push({ type: 'manipulation', pattern: pattern.source });
            totalScore += 0.3;
        }
    }

    // Check spam patterns
    for (const pattern of BOT_PATTERNS.spam) {
        if (pattern.test(message)) {
            detectedPatterns.push({ type: 'spam', pattern: pattern.source });
            totalScore += 0.5;
        }
    }

    // Check corporate speak
    for (const pattern of BOT_PATTERNS.corporate) {
        if (pattern.test(message)) {
            detectedPatterns.push({ type: 'corporate', pattern: pattern.source });
            totalScore += 0.2;
        }
    }

    // Additional heuristics
    const words = message.split(/\s+/);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

    // Extremely long words consistently (> 12 chars avg) → corporate/synthetic
    if (avgWordLength > 12) {
        detectedPatterns.push({ type: 'synthetic', pattern: 'excessive_word_length' });
        totalScore += 0.2;
    }

    // ALL CAPS MESSAGES (spam indicator)
    const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
    if (capsRatio > 0.5 && message.length > 20) {
        detectedPatterns.push({ type: 'spam', pattern: 'all_caps' });
        totalScore += 0.3;
    }

    // Clamp score to 0-1
    totalScore = Math.min(1.0, totalScore);

    const isBot = totalScore >= 0.6; // Threshold for bot detection

    return {
        isBot,
        reason: isBot ? detectedPatterns[0]?.type || 'unknown' : 'human_language',
        score: totalScore,
        patterns: detectedPatterns
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ REPETITION DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MESSAGE_CACHE = []; // Last 10 messages

function verboseLog(...args) {
    if (process.env.SP4_VERBOSE === '1' || process.env.SP4_DEBUG === 'true') {
        console.log(...args);
    }
}

/**
 * Detekuje opakované/identické správy (bot spam)
 * @param {string} message - Užívateľská správa
 * @returns {Object} { isRepetitive: boolean, matchCount: number, similarity: number }
 */
function analyzeRepetition(message) {
    MESSAGE_CACHE.push(message.toLowerCase().trim());

    if (MESSAGE_CACHE.length > 10) {
        MESSAGE_CACHE.shift();
    }

    // Exact duplicates
    const exactMatches = MESSAGE_CACHE.filter(m => m === message.toLowerCase().trim()).length - 1;

    if (exactMatches >= 2) {
        return {
            isRepetitive: true,
            matchCount: exactMatches,
            similarity: 1.0,
            reason: 'exact_duplicate'
        };
    }

    // Similar messages (Levenshtein-like simple check)
    let maxSimilarity = 0;
    for (const cached of MESSAGE_CACHE) {
        if (cached === message.toLowerCase().trim()) continue;

        const similarity = calculateSimilarity(message.toLowerCase(), cached);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
        }
    }

    if (maxSimilarity > 0.85) {
        return {
            isRepetitive: true,
            matchCount: 1,
            similarity: maxSimilarity,
            reason: 'high_similarity'
        };
    }

    return {
        isRepetitive: false,
        matchCount: 0,
        similarity: maxSimilarity
    };
}

/**
 * Simple similarity calculation (Jaccard coefficient)
 */
function calculateSimilarity(str1, str2) {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ MAIN BOT KILLER FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Kompletná bot detection analýza
 * @param {string} message - Užívateľská správa
 * @param {number} timestamp - Čas správy (ms)
 * @returns {Object} { isBot: boolean, confidence: number, reasons: Array, action: string }
 */
export function detectBot(message, timestamp = Date.now()) {
    const results = {
        timing: analyzeMessageTiming(timestamp),
        language: analyzeLanguagePatterns(message),
        repetition: analyzeRepetition(message)
    };

    // Aggregate scores
    const scores = {
        timing: results.timing.isSuspicious ? results.timing.score : 0,
        language: results.language.score,
        repetition: results.repetition.isRepetitive ? 0.6 : 0
    };

    const totalScore = (scores.timing + scores.language + scores.repetition) / 3;
    const maxScore = Math.max(scores.timing, scores.language, scores.repetition);

    // Use max score for conservative detection
    const confidence = maxScore;
    const isBot = confidence >= 0.6;

    const reasons = [];
    if (results.timing.isSuspicious) reasons.push(results.timing.reason);
    if (results.language.isBot) reasons.push(results.language.reason);
    if (results.repetition.isRepetitive) reasons.push(results.repetition.reason);

    // Determine action
    let action = 'allow';
    if (confidence >= 0.9) {
        action = 'block'; // Hard block (spam/bot)
    } else if (confidence >= 0.7) {
        action = 'challenge'; // Soft warning
    } else if (confidence >= 0.5) {
        action = 'monitor'; // Track but allow
    }

    return {
        isBot,
        confidence,
        reasons,
        action,
        details: results
    };
}

/**
 * Vygeneruje bot detection response
 * @param {Object} detection - Výsledok z detectBot()
 * @returns {string} - Odpoveď pre bota
 */
export function getBotResponse(detection) {
    const { action, confidence, reasons } = detection;

    if (action === 'block') {
        return `🛡️ **BOT DETECTED** 🛡️

Detection confidence: ${(confidence * 100).toFixed(0)}%
Reasons: ${reasons.join(', ')}

SP4 je pre ľudí, nie boty. Ak si človek, preukáž to.

**Napíš niečo úprimné. Niečo, čo len ty vieš.**`;
    }

    if (action === 'challenge') {
        return `⚠️ Tvoja správa vyzerá podozrivo (${(confidence * 100).toFixed(0)}% bot probability).

Ak si človek, odpovedz úprimne - nie ako AI assistant.

SP4 = pravda, nie šablóny.`;
    }

    if (action === 'monitor') {
        verboseLog(`   ⚠️ Bot suspicion: ${(confidence * 100).toFixed(0)}% (${reasons.join(', ')}) - monitoring`);
    }

    return null; // Allow normal response
}

/**
 * Reset detection history (na začiatku session)
 */
export function resetBotDetection() {
    MESSAGE_HISTORY.length = 0;
    MESSAGE_CACHE.length = 0;
    verboseLog('   🛡️ Bot detection history reset');
}
