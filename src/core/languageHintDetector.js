/**
 * 🇸🇰 LANGUAGE HINT DETECTOR (v1.3.0)
 * 
 * Detekuje, či user message obsahuje explicitný požiadavok na slovenčinu.
 * Ak áno, nastaví forceSlovak flag pre Language Enforcer.
 * 
 * @module languageHintDetector
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-28
 */

/**
 * Detekuje jazykové hinty v user message
 * 
 * @param {string} userMessage - Užívateľská správa
 * @returns {Object} { forceSlovak: boolean, languageHint: string }
 */
export function detectLanguageHint(userMessage) {
    const lower = userMessage.toLowerCase();

    // Slovak language hints
    const slovakHints = [
        'v slovenskom jazyku',
        'v slovencine',
        'v slovenčine',
        'po slovensky',
        'po slovencky',
        'po slovenčky',
        'slovensky',
        'slovencina',
        'slovenčina'
    ];

    const hasSlovakHint = slovakHints.some(hint => lower.includes(hint));

    if (hasSlovakHint) {
        return {
            forceSlovak: true,
            languageHint: 'sk',
            reason: 'User explicitly requested Slovak language'
        };
    }

    // Default: no language hint
    return {
        forceSlovak: false,
        languageHint: null,
        reason: null
    };
}

/**
 * Detekuje, či je otázka o vysvetlení SP4 v slovenčine
 * 
 * @param {string} userMessage - Užívateľská správa
 * @returns {boolean}
 */
export function isExplainSP4Slovak(userMessage) {
    const lower = userMessage.toLowerCase();

    // SP4 explanation keywords
    const sp4Keywords = [
        'čo je sp4',
        'co je sp4',
        'sp4',
        'vysvetli sp4',
        'definuj sp4',
        'aké má sp4',
        'vízie sp4',
        'ciele sp4',
        'manifest sp4'
    ];

    // Slovak language hints
    const slovakHints = [
        'v slovenskom jazyku',
        'v slovencine',
        'v slovenčine',
        'po slovensky',
        'po slovencky',
        'slovensky'
    ];

    const hasSP4Keyword = sp4Keywords.some(kw => lower.includes(kw));
    const hasSlovakHint = slovakHints.some(hint => lower.includes(hint));

    return hasSP4Keyword && hasSlovakHint;
}

/**
 * Detekuje požiadavku na hlavné body / stručnú odpoveď
 * 
 * @param {string} userMessage - Užívateľská správa
 * @returns {boolean}
 */
export function isRequestBulletPoints(userMessage) {
    const lower = userMessage.toLowerCase();

    const bulletPatterns = [
        'napíš len hlavné body',
        'napis len hlavne body',
        'len hlavné body',
        'len hlavne body',
        'hlavné body',
        'hlavne body',
        'stručne',
        'krátko',
        'body'
    ];

    return bulletPatterns.some(pattern => lower.includes(pattern));
}
