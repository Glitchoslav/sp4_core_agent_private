// coreFallbacks.js
// 🛡️ CORE MODE - Pure technical fallbacks
// v0.8.5.3 - Used when validators fail to sanitize output

import {
    SP4_FOUNDER_FACT,
    SP4_MOTTO_FACT,
    SP4_SHORT_DEFINITION,
    SP4_VALUES_FACT
} from './sp4Facts.js';

/**
 * Clean technical definitions for common queries
 * No first-person, no user addressing, pure Slovak technical text
 */
export const CORE_FALLBACKS = {
    blockchain: 'Blockchain je distribuovaná kryptograficky zabezpečená dátová štruktúra (reťaz blokov), v ktorej každý blok obsahuje sadu transakcií, hash predchádzajúceho bloku a časovú pečiatku. Vďaka kryptografickému prepojeniu blokov a konsenzu medzi uzlami siete je veľmi náročné spätne meniť uložené dáta bez toho, aby si to ostatné uzly všimli.',

    token: 'Token je digitálna jednotka hodnoty reprezentovaná na blockchaine. Rozlišujeme utility tokeny (prístup k službe), security tokeny (investičný nástroj podliehajúci regulácii) a NFT (nezameniteľné tokeny reprezentujúce unikátny asset).',

    ai: 'Umelá inteligencia (AI) je disciplína informatiky zameraná na vytváranie systémov schopných vykonávať úlohy, ktoré tradične vyžadujú ľudskú inteligenciu. Zahŕňa podoblasti ako strojové učenie, spracovanie prirodzeného jazyka, počítačové videnie a rozhodovanie.',

    sp4: SP4_SHORT_DEFINITION,

    // v0.11.1: SP4 Knowledge fallbacks (founder, values, motto)
    sp4_founder: SP4_FOUNDER_FACT,

    sp4_values: SP4_VALUES_FACT,

    sp4_motto: SP4_MOTTO_FACT,
};

/**
 * Get fallback text for a query
 * Uses fuzzy matching to find relevant fallback
 * 
 * @param {string} query - User query
 * @returns {string|null} Fallback text or null if no match
 */
export function getCoreFallback(query) {
    const lowerQuery = query.toLowerCase();

    // v0.11.1: SP4 Knowledge - PRIORITY (before generic sp4)
    if (/kto\s+(je|vytvoril|zalo\u017eil).*kefyk|zakladate\u013e.*sp4|kefyk.*vytvoril/i.test(lowerQuery)) {
        return CORE_FALLBACKS.sp4_founder;
    }
    if (/hodnot.*sp4|sp4.*hodnot/i.test(lowerQuery)) {
        return CORE_FALLBACKS.sp4_values;
    }
    if (/be\s+real.*be\s+free|be\s+free.*be\s+real|motto.*sp4|sp4.*motto|znamená.*be\s+(real|free)/i.test(lowerQuery)) {
        return CORE_FALLBACKS.sp4_motto;
    }

    // Direct keyword matching
    if (/blockchain/i.test(lowerQuery)) return CORE_FALLBACKS.blockchain;
    if (/token/i.test(lowerQuery)) return CORE_FALLBACKS.token;
    if (/\\b(ai|umel\u00e1 inteligencia)\\b/i.test(lowerQuery)) return CORE_FALLBACKS.ai;
    if (/sp4/i.test(lowerQuery)) return CORE_FALLBACKS.sp4;

    return null;
}

/**
 * Sanitize CORE output - remove identity/helper tone patterns
 * 
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeCoreOutput(text) {
    let sanitized = text
        // Remove direct addressing
        .replace(/\bKefyk[^\.\n]*/gi, '')
        .replace(/\b(môj cieľ je|som tu aby|chcem ti pomôcť|chcem vám pomôcť)[^\.!\n]*/gi, '')
        .replace(/\b(Pomáham ti|Pomáham vám|Ďakujem za otázku)[^\.!\n]*/gi, '')
        .replace(/\b(tvoj|tvoja|tvoje|teba|ti|vy|vám|vás)\b/gi, '')
        // Remove first-person (expanded)
        .replace(/\b(ja|som|môj|moja|moje|ma|mi)\b/gi, '')
        .replace(/\bsna(ž|z)(í|i)m\s+sa\b/gi, '')  // "snažím sa"
        .replace(/\bpok(ú|u)(š|s)am\s+sa\b/gi, '')  // "pokúsam sa"
        .replace(/\b(buď|byť)\s+(jasný|praktický|stručný)\b/gi, '')  // "byť jasný"
        // Remove AI self-references
        .replace(/\b(ako AI|som asistent|digitálny partner)\b/gi, '')
        // Remove meaningless fragments after sanitization
        .replace(/^\s*\.\s*/g, '')  // Leading dots
        .replace(/\s*\.\s*$/g, '.')  // Trailing dots
        // Clean up whitespace
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,!?])/g, '$1')
        .trim();

    // If result is too fragmented or nonsensical → return empty
    if (sanitized.length < 20 || /^(Identita je\.|Je\.|To je\.)/.test(sanitized)) {
        return '';
    }

    return sanitized;
}
