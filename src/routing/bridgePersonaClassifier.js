// AUTO persona selector pre /api/bridge/ask — vytiahnuté bez zmeny logiky z bridge-server.js
// (T7 strangler Phase 0), aby ho pokryli characterization testy.

// Lowercase + odstránenie diakritiky pre robustné keyword matchovanie (bez \b/diakritika
// pasce — pozri opravu safetyRails.js z 2026-06-25).
export function normalizeForClassify(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

// AUTO persona selector — jednoduché keyword matching (žiadny LLM call).
// Poradie kategórií je zámerné: DHZ-špecifické termíny majú prednosť pred
// všeobecnými (napr. "bezpečnosť výjazdu" by inak mohlo spadnúť pod 'core').
const CLASSIFY_KEYWORDS = {
    hasic: ['dhz', 'hasic', 'zbor', 'alarm', 'zasah', 'clen', 'vyjazd'],
    core: ['bezpecnost', 'heslo', 'hesla', 'firewall', 'sifr', 'ochrana', 'sukromie'],
    glitchoslav: ['glitchoslav', 'glitch', 'preco', 'filozofia', 'zmysel', 'kto si', 'manifest', 'citis', 'dusa'],
    popici: ['jednoduch', 'pomoz', 'neviem', 'ako mam', 'vysvetli jednoducho']
};
const CLASSIFY_ORDER = ['hasic', 'glitchoslav', 'core', 'popici'];

/**
 * Klasifikuje prompt na personu pomocou keyword matchingu (bez LLM).
 * @param {string} text - Užívateľský text.
 * @returns {string} - personaKey ('hasic'|'core'|'glitchoslav'|'popici'), default 'core'.
 */
export function classifyPrompt(text) {
    const normalized = normalizeForClassify(text);
    if (!normalized) return 'core';

    for (const personaKey of CLASSIFY_ORDER) {
        const keywords = CLASSIFY_KEYWORDS[personaKey];
        if (keywords.some((kw) => normalized.includes(kw))) {
            return personaKey;
        }
    }

    return 'core'; // default
}
