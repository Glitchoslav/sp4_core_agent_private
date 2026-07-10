/**
 * Shared SP4 identity relation guard helpers.
 * Single source for forbidden/allowed user↔SP4 phrasing checks.
 */

function normalizeIdentityText(text = '') {
    return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

export function isSp4IdentityRelationQuestion(userMessage = '') {
    const q = normalizeIdentityText(userMessage);
    return /\b(tak\s+)?kto\s+je\s+(potom\s+)?sp4\b/.test(q)
        || /\bco\s+je\s+sp4\b/.test(q)
        || /\bkto\s+je\s+sp4\b/.test(q)
        || /\bco\s+sp4\s+nie\s+je\b/.test(q)
        || /\bco\s+sp4\s+neni\b/.test(q)
        || /\bsp4\s+nie\s+je\b/.test(q);
}

export function hasForbiddenIdentityClaim(text = '') {
    const normalized = normalizeIdentityText(text);
    const explicitNegation = /\b(ty\s+)?nie\s+si\s+sp4\b/.test(normalized);
    if (explicitNegation) {
        return false;
    }

    const forbiddenPatterns = [
        /\bty\s+si\s+sp4\b/,
        /\bsi\s+sp4\b/,
        /\bty\s*=\s*sp4\b/,
        /\bty\s+si\s+vlastne\s+sp4\b/,
        /\bsi\s+samotne\s+sp4\b/
    ];

    return forbiddenPatterns.some((pattern) => pattern.test(normalized));
}

export function hasAllowedIdentityRelation(text = '') {
    const normalized = normalizeIdentityText(text);
    const allowedPatterns = [
        /\bsi\s+sucast(?:ou)?\s+sp4\b/,
        /\btvoris\s+sp4\b/,
        /\bsi\s+pouzivatel(?:\s+systemu)?\s+sp4\b/,
        /\bsi\s+clovek\/pouzivatel(?:\s+systemu)?\s+sp4\b/
    ];

    return allowedPatterns.some((pattern) => pattern.test(normalized));
}

export function sanitizeForbiddenIdentityClaims(text = '') {
    return String(text || '')
        .replace(/\b(ty|ja)\s+si\s+sp4\b/gi, 'Si používateľ systému SP4')
        .replace(/\bsi\s+sp4\b/gi, 'si používateľ systému SP4')
        .replace(/\bty\s*=\s*sp4\b/gi, 'Si používateľ systému SP4')
        .replace(/\bty\s+si\s+vlastne\s+sp4\b/gi, 'Si používateľ systému SP4')
        .replace(/\bsi\s+samotne\s+sp4\b/gi, 'si používateľ systému SP4');
}
