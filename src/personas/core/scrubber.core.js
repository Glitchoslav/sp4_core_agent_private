/**
 * CORE PERSONA - RESPONSE SCRUBBER (v0.10.3)
 * 
 * Post-processing na odstránenie korporátnej slušnosti a politeness z CORE odpovedí.
 * Používa sa ako posledná záchrana ak LLM stále generuje "prosím, upresnite" tón.
 * 
 * @module scrubber.core
 */

import { preserveCodeSegments } from '../../pipeline/codeSegments.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧹 CORE SCRUBBER - ANTI-CORPORATE POLITENESS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Scrubuje (čistí) CORE odpovede od korporátnej slušnosti.
 * 
 * @param {string} text - Odpoveď na scrubnutie
 * @returns {string} - Vyčistená odpoveď
 */
export function scrubCorePoliteness(text) {
    // Kód sa nescrubuje — zhlukovanie medzier by rozbilo odsadenie.
    return preserveCodeSegments(text, scrubCorePolitenessProse);
}

function scrubCorePolitenessProse(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    let cleaned = text;

    // Pattern 1: "Môžete, prosím, upresniť..." → Direct replacement
    cleaned = cleaned.replace(
        /Môžete,?\s+prosím,?\s+(upresniť|spresniť)[^.?!]*[.?!]/gi,
        'Potrebujem viac detailov, inak ti môžem len hádať.'
    );

    // Pattern 2: "Prosím, upresnite..." → Direct replacement
    cleaned = cleaned.replace(
        /Prosím,?\s+(upresnite|spresnite|uveďte)[^.?!]*[.?!]/gi,
        'Potrebujem viac detailov o tom.'
    );

    // Pattern 3: "Vážený..." → Remove salutation
    cleaned = cleaned.replace(/Vážený\s+\w+,?\s*/gi, '');

    // Pattern 4: "S pozdravom..." → Remove closing
    cleaned = cleaned.replace(/S\s+pozdravom[^.]*\./gi, '');

    // Pattern 5: "Rád vám pomôžem..." → Remove helper tone
    cleaned = cleaned.replace(/Rád (vám|ti) pomôžem[^.?!]*[.?!]/gi, '');

    // Cleanup: Remove excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines
    cleaned = cleaned.replace(/\s{2,}/g, ' '); // Max 1 space
    cleaned = cleaned.trim();

    return cleaned;
}

/**
 * Detekuje, či text obsahuje korporátnu politeness.
 * 
 * @param {string} text - Text na analýzu
 * @returns {Object} - { hasPoliteness: boolean, matches: array }
 */
export function detectCorporatePoliteness(text) {
    if (!text || typeof text !== 'string') {
        return { hasPoliteness: false, matches: [] };
    }

    const patterns = [
        /Môžete,?\s+prosím/gi,
        /Prosím,?\s+(upresnite|spresnite)/gi,
        /Vážený/gi,
        /S\s+pozdravom/gi,
        /Rád (vám|ti) pomôžem/gi
    ];

    const matches = [];

    for (const pattern of patterns) {
        const found = text.match(pattern);
        if (found) {
            matches.push(...found);
        }
    }

    return {
        hasPoliteness: matches.length > 0,
        matches
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default {
    scrubCorePoliteness,
    detectCorporatePoliteness
};
