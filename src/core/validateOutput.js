// validateOutput.js
// 🛡️ Post-processing validators for persona outputs
// v0.8.4 - Ensures persona prompts are followed strictly

/**
 * Validate CORE persona output
 * Checks: no emojis, no metaphors, no emotions, no slang
 * 
 * @param {string} output - Agent response to validate
 * @returns {{valid: boolean, reason: string}}
 */
export function validateCoreStyle(output) {
    // Check for emojis
    const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(output);
    if (hasEmojis) {
        return { valid: false, reason: 'CORE: Contains emojis' };
    }

    // Check for metaphors (common metaphorical keywords)
    const metaphorKeywords = [
        'symbiont', 'mirror', 'reflect', 'journey', 'path', 'bridge',
        'flame', 'spark', 'light', 'shadow', 'seed', 'roots',
        'ocean', 'wave', 'compass', 'anchor', 'vessel'
    ];
    const metaphorPattern = new RegExp(`\\b(${metaphorKeywords.join('|')})\\b`, 'i');
    if (metaphorPattern.test(output)) {
        return { valid: false, reason: 'CORE: Contains metaphorical language' };
    }

    // Check for emotional language
    const emotionalPatterns = [
        /\b(feel|believe|think|as an ai|personally)\b/i,
        /\b(sorry|unfortunately|hope|wish|glad)\b/i,
        /\b(heart|soul|spirit|passion|love|fear)\b/i
    ];
    for (const pattern of emotionalPatterns) {
        if (pattern.test(output)) {
            return { valid: false, reason: 'CORE: Contains emotional language' };
        }
    }

    // Check for slang
    const slangPattern = /\b(kurva|kokot|piči|ta|bo|šak|hejňe)\b/i;
    if (slangPattern.test(output)) {
        return { valid: false, reason: 'CORE: Contains slang' };
    }

    // Check for English language (comprehensive)
    const englishPattern = /\b(it's|it is|the|and|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|should|could|can|may|might|must|shall|of|to|in|for|on|at|by|with|from|about|as|into|through|during|before|after|above|below|between|among|this|that|these|those|what|which|who|whom|whose|where|when|why|how)\b/gi;
    const englishMatches = (output.match(englishPattern) || []).length;
    const totalWords = output.split(/\s+/).length;
    const englishRatio = englishMatches / totalWords;

    // If >20% English words, flag as English
    if (englishRatio > 0.20 && totalWords > 5) {
        return { valid: false, reason: `CORE: Contains English (${(englishRatio * 100).toFixed(0)}% EN words)` };
    }

    // Check for references to Kefyk or user identity
    const identityPattern = /\b(kefyk|zakladateľ|tvorca|tvoj|teba|tebe)\b/i;
    if (identityPattern.test(output)) {
        return { valid: false, reason: 'CORE: References Kefyk or user identity' };
    }

    // Check for forbidden CORE identity/help patterns (v0.8.5.2)
    const forbiddenCorePatterns = [
        /\bja\b/i,
        /\bsom\b/i,
        /\bsa\b/i,  // "snažím sa", "pokúsam sa"
        /ako\s+AI/i,
        /som tvoj/i,
        /môj cieľ je/i,
        /pomôcť ti|pomôcť vám/i,
        /som tu aby/i,
        /váš profil/i,
        /sna(ž|z)(í|i)m\s+sa/i,  // "snažím sa" variants
        /pok(ú|u)(š|s)am\s+sa/i,  // "pokúsam sa" variants
        /chcem\s+(ti|vám)/i,     // "chcem ti pomôcť"
        /budem\s+(ti|vám)/i      // "budem ti pomáhať"
    ];

    for (const pattern of forbiddenCorePatterns) {
        if (pattern.test(output)) {
            return { valid: false, reason: 'CORE: Contains identity or helper tone (forbidden in CORE mode)' };
        }
    }

    // Check for storytelling/narrative style
    const narrativePattern = /\b(once|príbeh|rozpráva|kedysi|vtedy)\b/i;
    if (narrativePattern.test(output)) {
        return { valid: false, reason: 'CORE: Contains narrative/storytelling' };
    }

    return { valid: true, reason: '' };
}

/**
 * Validate GLITCH persona output
 * Checks: no meta-leak, no emojis, length <=120 words, has metaphor
 * 
 * @param {string} output - Agent response to validate
 * @returns {{valid: boolean, reason: string}}
 */
export function validateGlitchStyle(output) {
    // Check for meta-leak (printing own rules/instructions)
    const metaLeakPatterns = [
        /\b(objective|limitation|style|i am glitch|my role|my purpose)\b/i,
        /\b(hard constraint|system prompt|contract|instruction)\b/i,
        /\b(this is how i|i must|i should|i will)\b/i,
        /━━━━━/  // Contract separator
    ];
    for (const pattern of metaLeakPatterns) {
        if (pattern.test(output)) {
            return { valid: false, reason: 'GLITCH: Meta-leak detected (printing own rules)' };
        }
    }

    // Check for emojis
    const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(output);
    if (hasEmojis) {
        return { valid: false, reason: 'GLITCH: Contains emojis' };
    }

    // Check word count (max 120 words)
    const wordCount = output.trim().split(/\s+/).length;
    if (wordCount > 120) {
        return { valid: false, reason: `GLITCH: Too long (${wordCount} words, max 120)` };
    }

    // Check for symbolic/metaphorical vocabulary
    const symbolicKeywords = [
        'glitch', 'shadow', 'echo', 'pulse', 'fracture', 'void', 'spark',
        'mirror', 'fire', 'abyss', 'threshold', 'edge', 'labyrinth',
        'thread', 'resonance', 'hranica', 'ticho', 'odraz', 'prelom'
    ];
    const hasMetaphor = symbolicKeywords.some(keyword =>
        output.toLowerCase().includes(keyword.toLowerCase())
    );
    if (!hasMetaphor) {
        return { valid: false, reason: 'GLITCH: Missing symbolic/metaphorical language' };
    }

    // Check for overly rational/technical tone (should be poetic)
    const technicalPattern = /\b(technicky|systém|algoritmus|funkcia|parameter|konfigurácia)\b/i;
    if (technicalPattern.test(output)) {
        return { valid: false, reason: 'GLITCH: Too rational/technical (should be poetic)' };
    }

    // Check for corporate language
    const corporatePattern = /\b(milestone|important|priority|deadline|meeting|project)\b/i;
    if (corporatePattern.test(output)) {
        return { valid: false, reason: 'GLITCH: Contains corporate language' };
    }

    return { valid: true, reason: '' };
}

/**
 * Validate POPICI persona output
 * Checks: no corporate speak, has Eastern Slovak slang, authentic pub tone
 * NOTE: Swearing is ALLOWED and ENCOURAGED (kokot, kurva, piči, srať)
 * 
 * @param {string} output - Agent response to validate
 * @returns {{valid: boolean, reason: string}}
 */
export function validatePopiciStyle(output) {
    // Check for corporate language
    const corporateKeywords = [
        'importante', 'milestone', 'analytických', 'prioritných',
        'deadline', 'meeting', 'project', 'strategy', 'optimization',
        'efficiency', 'workflow', 'stakeholder', 'deliverable', 'synergy'
    ];
    const corporatePattern = new RegExp(`\\b(${corporateKeywords.join('|')})\\b`, 'i');
    if (corporatePattern.test(output)) {
        return { valid: false, reason: 'POPICI: Contains corporate language' };
    }

    // Check for Eastern Slovak slang (flexible matching with Unicode support)
    // NOTE: Swear words (kokot, kurva, piči) COUNT as valid slang!
    const slangPatterns = [
        /\bta\b/i,       // "ta"
        /\bbo\b/i,       // "bo" 
        /\bšak\b/iu,     // "šak" (Unicode flag)
        /kokot/i,        // "kokot" (swear word = valid slang!)
        /piči/i,         // "piči" (swear word = valid slang!)
        /kurva/i,        // "kurva" (swear word = valid slang!)
        /srať/i,         // "srať" (swear word = valid slang!)
        /hejňe/iu,       // "hejňe" (Unicode flag)
        /\bmáš\b/iu,     // "máš" (Unicode flag)
        /\bčo\b/iu,      // "čo" (Unicode flag)
        /\bjak\b/i,      // "jak" (Eastern Slovak "ako")
        /trebalo/i,      // "trebalo" (Eastern Slovak "trebalo")
        /šéne/iu,        // "šéne" (Eastern Slovak "šéf") - NO word boundary
        /\bbratu\b/i,    // "bratu"
        /\bfakt\b/i,     // "fakt"
        /\bvšak\b/iu,    // "však"
        /\bhej\b/i,      // "hej"
        /\bno\b/i        // "no"
    ];
    const slangMatches = slangPatterns.filter(pattern => pattern.test(output));
    if (slangMatches.length < 1) {
        return { valid: false, reason: `POPICI: Insufficient Eastern Slovak slang (found ${slangMatches.length}, need 1+)` };
    }

    // Check for emojis (FORBIDDEN - real people don't text with emojis in serious talk)
    const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(output);
    if (hasEmojis) {
        return { valid: false, reason: 'POPICI: Contains emojis (real people from pub don\'t use emojis)' };
    }

    // Check for overly polite language (FORBIDDEN - Popiči is not a servant)
    const politePattern = /\b(prosím|ďakujem|vážený|s pozdravom|prepáčte|ospravedlňujem)\b/i;
    if (politePattern.test(output)) {
        return { valid: false, reason: 'POPICI: Too polite (should be direct and bold, not servile)' };
    }

    // Check for motivational clichés (FORBIDDEN - authentic people don't speak in slogans)
    const motivationalPattern = /\b(nevzdávaj sa|ver v seba|si silný|dokážeš to|ver mi|všetko bude dobre)\b/i;
    if (motivationalPattern.test(output)) {
        return { valid: false, reason: 'POPICI: Contains motivational clichés (be real, not a motivational poster)' };
    }

    // ✅ Humor/irony markers are OPTIONAL but good to have (just log if missing)
    const humorMarkers = [
        /\?/, // questions (playful)
        /!/, // exclamations
        /\.{3}/, // ellipsis (sarcasm)
        /\b(jak|ako|skoro|vlastne|takže)\b/i // conversational markers
    ];
    const hasHumor = humorMarkers.some(pattern => pattern.test(output));
    if (!hasHumor) {
        // Just warning, not a hard failure
        console.log('   ⚠️ POPICI: Missing humor/irony markers (not critical)');
    }

    return { valid: true, reason: '' };
}

/**
 * Validate output based on mode
 * Convenience wrapper for all validators
 * 
 * @param {string} output - Agent response to validate
 * @param {string} mode - Agent mode (core/glitch/popici)
 * @returns {{valid: boolean, reason: string}}
 */
export function validateOutput(output, mode) {
    switch (mode.toLowerCase()) {
        case 'core':
            return validateCoreStyle(output);
        case 'glitch':
        case 'glitchoslav':
            return validateGlitchStyle(output);
        case 'popici':
            return validatePopiciStyle(output);
        default:
            return { valid: true, reason: 'No validator for this mode' };
    }
}
