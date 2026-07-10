/**
 * ARCHIVED — SHADOW COPY (not imported by live chain)
 * Live validator is identity/personas/core/validator.core.js used via src/core/personaRegistry.js
 *
 * CORE PERSONA VALIDATOR (v1.1)
 * 
 * Validuje, či odpoveď spĺňa štýl SP4_CORE - technický sprievodca.
 * Zakázané: klišé, vulgarizmy, helper tón, identity confusion.
 * Povolené: metafory (ak pomáhajú), prvá osoba (ak relevantná), technické emoji.
 * 
 * @module core/validator
 */

import { CORE_PERSONA } from './persona.core.js';

// Cache pre regex patterns (performance optimization)
const slangRegexCache = new Map();
const firstPersonRegexCache = new Map();
const addressingRegexCache = new Map();

/**
 * Vytvoriť word boundary regex s cachovaním
 */
function getWordBoundaryRegex(phrase, cache) {
    if (!cache.has(phrase)) {
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cache.set(phrase, new RegExp(`\\b${escaped}\\b`, 'i'));
    }
    return cache.get(phrase);
}

/**
 * Validuje, či odpoveď spĺňa štýl CORE persony.
 * v1.1: Relaxované pravidlá - CORE ako sprievodca, nie databáza
 * @param {string} text - vygenerovaná odpoveď z LLM
 * @param {object} context - kontextové informácie (userInput, mode)
 * @returns {{valid: boolean, reason?: string}}
 */
export function validateCoreOutput(text, context = {}) {
    const raw = text || '';
    const normalized = raw.toLowerCase();
    const userInput = (context.userInput || '').toLowerCase();

    // v0.11.1: Detect SP4 knowledge questions (founder, zakladateľ, Kefyk)
    const isFounderQuestion = /kto\s+(je|vytvoril|založil).*kefyk/i.test(userInput) ||
        /zakladateľ.*sp4/i.test(userInput) ||
        /kefyk.*vytvoril/i.test(userInput);

    // 1. Zakázané klišé (motivačné frázy)
    if (CORE_PERSONA.forbidden.cliches) {
        for (const phrase of CORE_PERSONA.forbidden.cliches) {
            if (normalized.includes(phrase.toLowerCase())) {
                return {
                    valid: false,
                    reason: `CORE: Zakázané klišé "${phrase}"`
                };
            }
        }
    }

    // 2. Zakázané vulgarizmy
    if (CORE_PERSONA.forbidden.vulgarisms) {
        for (const phrase of CORE_PERSONA.forbidden.vulgarisms) {
            const regex = getWordBoundaryRegex(phrase, slangRegexCache);
            if (regex.test(normalized)) {
                return {
                    valid: false,
                    reason: `CORE: Zakázaný vulgarizmus "${phrase}"`
                };
            }
        }
    }

    // 3. Zakázaný helper tón
    if (CORE_PERSONA.forbidden.helperTone) {
        for (const phrase of CORE_PERSONA.forbidden.helperTone) {
            if (normalized.includes(phrase.toLowerCase())) {
                return {
                    valid: false,
                    reason: `CORE: Zakázaný helper tón "${phrase}"`
                };
            }
        }
    }

    // 4. Identity confusion check
    if (CORE_PERSONA.forbidden.identityConfusion) {
        for (const phrase of CORE_PERSONA.forbidden.identityConfusion) {
            if (normalized.includes(phrase.toLowerCase())) {
                return {
                    valid: false,
                    reason: `CORE: Identity confusion "${phrase}"`
                };
            }
        }
    }

    // 5. Emojis - zakázané (okrem technických symbolov v príkladoch)
    if (/[😀-🙏🌀-🧿❤️⭐✨🔥💥]/u.test(raw)) {
        return {
            valid: false,
            reason: 'CORE: Emojis sú zakázané - technický mód.'
        };
    }

    // 6. Dĺžka - soft limit (primeraná otázke, nie tvrdý limit)
    const sentences = raw
        .split(/[.!?]+/u)
        .map(s => s.trim())
        .filter(Boolean);

    // v1.1: Soft limits - povoľ dlhšie odpovede ak sú potrebné
    if (sentences.length > 10) {
        console.log(`   ⚠️ CORE: Dlhá odpoveď (${sentences.length} viet) - preferuj stručnosť`);
        // Nefailuj - len odporúč
    }

    if (sentences.length < 1) {
        return {
            valid: false,
            reason: `CORE: Prázdna odpoveď`
        };
    }

    // 7. Zoznamy/príklady - povolené (technický sprievodca môže vysvetľovať)
    // (žiadna validácia potrebná)

    return {
        valid: true,
        reason: 'CORE: OK - technický sprievodca, jasné vysvetlenie.'
    };
}

/**
 * Detekuje, či odpoveď má technický/analytický vibe.
 * @param {string} text
 * @returns {boolean}
 */
export function detectCoreVibe(text) {
    const technical = /\b(systém|mechanizmus|architektúra|implementácia|modul|funkcia|komponenta|proces|štruktúra)\b/gi;
    const technicalCount = (text.match(technical) || []).length;

    const emotional = /\b(cítim|verím|nádej|strach|radosť|smútok|láska|hnev)\b/gi;
    const emotionalCount = (text.match(emotional) || []).length;

    // Technický vibe = aspoň 1 technický termín a 0 emócií
    return technicalCount >= 1 && emotionalCount === 0;
}

export default {
    validateCoreOutput,
    detectCoreVibe
};
