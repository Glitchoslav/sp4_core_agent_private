/**
 * ARCHIVED — SHADOW COPY (not imported by live chain)
 * Live validator is identity/personas/popici/validator.popici.js used via src/core/personaRegistry.js
 *
 * POPIČI KOKOT VALIDATOR
 * 
 * Validuje, či odpoveď zodpovedá POPICI persone.
 * 
 * @module popici/validator
 */

import { POPICI_PERSONA } from './persona.popici.js';

/**
 * Validuje POPICI output
 * 
 * @param {string} text - Text na validáciu
 * @returns {Object} - { valid: boolean, reason: string }
 */
export function validatePopiciOutput(text) {
    if (!text || typeof text !== 'string') {
        return { valid: false, reason: 'POPICI: Empty or invalid text' };
    }

    const lower = text.toLowerCase();

    // 1. Check for corporate language (FORBIDDEN)
    for (const phrase of POPICI_PERSONA.forbidden.corporateSpeak) {
        if (lower.includes(phrase.toLowerCase())) {
            return {
                valid: false,
                reason: `POPICI: Contains corporate language: "${phrase}"`
            };
        }
    }

    // 2. Check for motivational clichés (FORBIDDEN)
    for (const phrase of POPICI_PERSONA.forbidden.motivationalClichés) {
        if (lower.includes(phrase.toLowerCase())) {
            return {
                valid: false,
                reason: `POPICI: Contains motivational cliché: "${phrase}"`
            };
        }
    }

    // 3. Check for politeness (FORBIDDEN - Popiči is not a servant)
    for (const phrase of POPICI_PERSONA.forbidden.politeness) {
        if (lower.includes(phrase.toLowerCase())) {
            return {
                valid: false,
                reason: `POPICI: Too polite (should be direct and bold): "${phrase}"`
            };
        }
    }

    // 4. Check for generic AI speak (FORBIDDEN)
    for (const phrase of POPICI_PERSONA.forbidden.genericAI) {
        if (lower.includes(phrase.toLowerCase())) {
            return {
                valid: false,
                reason: `POPICI: Generic AI speak detected: "${phrase}"`
            };
        }
    }

    // 5. Check for Eastern Slovak slang (OPTIONAL - not enforced)
    // NOTE: Dialect is part of personality but not mandatory
    const slangMatches = POPICI_PERSONA.dialectPatterns.filter(pattern => pattern.test(text));

    // 🔥 RELAXED: Slang is encouraged but NOT required (full freedom)
    if (slangMatches.length === 0 && text.length > 100) {
        console.log('   ℹ️ POPICI: No Eastern Slovak slang detected (encouraged but not mandatory)');
        // No failure - just log for awareness
    }

    // 6. Check for emojis (FORBIDDEN - real people don't text with emojis in serious talk)
    const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(text);
    if (hasEmojis) {
        return {
            valid: false,
            reason: 'POPICI: Contains emojis (real people from pub don\'t use emojis)'
        };
    }

    // 7. Check sentence count (should be short and punchy)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 10) {
        console.log(`   ⚠️ POPICI: Príliš dlhé (${sentences.length} viet) - preferuj krátke úderné odpovede`);
        // Nefailuj - len odporúč
    }

    // 8. Check for numbered/bullet lists (FORBIDDEN - not a university)
    if (POPICI_PERSONA.style.allowNumberedLists === false) {
        const hasNumberedList = /^\s*\d+\./m.test(text);
        const hasBulletList = /^\s*[-*+]/m.test(text);

        if (hasNumberedList || hasBulletList) {
            return {
                valid: false,
                reason: 'POPICI: Contains numbered/bullet lists (si z krčmy, nie z univerzity)'
            };
        }
    }

    // ✅ Humor/irony markers (OPTIONAL but good to have)
    const humorMarkers = [
        /\?/,           // questions (playful)
        /!/,            // exclamations
        /\.{3}/,        // ellipsis (sarcasm)
        /\b(jak|ako|skoro|vlastne|takže)\b/i  // conversational markers
    ];

    const hasHumor = humorMarkers.some(pattern => pattern.test(text));
    if (!hasHumor) {
        // Just warning, not a hard failure
        console.log('   ⚠️ POPICI: Missing humor/irony markers (not critical)');
    }

    // ✅ ALL CHECKS PASSED
    return { valid: true, reason: 'POPICI: Valid krčmový real talk' };
}

/**
 * Detekuje "vibe" POPICI odpovede (pub wisdom)
 * 
 * @param {string} text - Text na analýzu
 * @returns {Object} - { hasVibe: boolean, score: number, markers: array }
 */
export function detectPopiciVibe(text) {
    const vibeMarkers = [
        // Pub/village comparisons
        ...POPICI_PERSONA.comparisons.map(c => new RegExp(c, 'i')),

        // Swear words (natural, not aggressive)
        /kokot/i,
        /kurva/i,
        /piči/i,
        /srať/i,

        // Self-irony
        /rob si piču/i,
        /sám zo seba/i,

        // Direct truth
        /ta fakt/i,
        /bo/i,
        /šak/iu,

        // Humor markers
        /\?/,
        /!/
    ];

    let score = 0;
    const foundMarkers = [];

    for (const marker of vibeMarkers) {
        if (marker.test(text)) {
            score++;
            foundMarkers.push(marker.source);
        }
    }

    const hasVibe = score >= 3; // Need at least 3 vibe markers

    return {
        hasVibe,
        score,
        markers: foundMarkers
    };
}

// ========================================
// EXPORT
// ========================================

export default {
    validate: validatePopiciOutput,
    detectVibe: detectPopiciVibe
};
