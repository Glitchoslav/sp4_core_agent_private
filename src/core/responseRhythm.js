// src/core/responseRhythm.js
// 🎵 RESPONSE RHYTHM SYSTEM v0.10.0
// Adaptívne nastavenie dĺžky a štýlu odpovede podľa kontextu
// 
// **Módy:**
// - SHORT (Šepot): max 20 slov - rýchle odpovede
// - MEDIUM (Echo): max 100 slov - normálne odpovede
// - LONG (Príbeh): max 300 slov - hlboké témy
// - RUNE_ONLY (Runa): len sacred rune + krátky kontext
// - SILENCE (Ticho): len prasklina symbol
//
// @author Kefyk (SP4 Community)
// @version 0.10.0
// @date 2025-11-21

import { getPrasklinaSymbol, shouldRespondWithSilence } from './glitchRituals.js';
import { getRandomRune } from './glitchRunes.js';
import { runtimeLog } from './runtimeLogging.js';

export const RHYTHM_MODES = {
    SHORT: {
        name: 'Šepot',
        maxWords: 500,          // 🔥 DISABLED truncation - nech model sám rozhodne
        maxSentences: 25,       // 🔥 DISABLED truncation
        style: 'Krátke vety. Priame. Bez metafor.',
        trigger: ['quick', 'fast', 'short', 'brief', 'krátko', 'stručne', 'rýchlo', 'jednoducho']
    },
    MEDIUM: {
        name: 'Echo',
        maxWords: 800,          // 🔥 DISABLED truncation
        maxSentences: 40,       // 🔥 DISABLED truncation
        style: 'Vyvážené. Mix pravdy a obrazu.',
        trigger: 'default'
    },
    LONG: {
        name: 'Príbeh',
        maxWords: 1500,         // 🔥 DISABLED truncation - nech model dokončí myšlienku
        maxSentences: 60,       // 🔥 DISABLED truncation
        style: 'Rozvinuté. Hlboké. Metaforické.',
        trigger: ['deep', 'existential', 'philosophical', 'crisis', 'hlboké', 'existencia', 'filozofia']
    },
    RUNE_ONLY: {
        name: 'Runa',
        maxWords: 0,
        maxSentences: 0,
        style: 'Len sacred rune symbol + krátky kontext.',
        trigger: ['rune', 'runa', 'symbol', 'sign', 'znamenie']
    },
    SILENCE: {
        name: 'Ticho',
        maxWords: 0,
        maxSentences: 0,
        style: 'Prasklina symbol only. Žiadne slová.',
        trigger: ['unanswerable', 'beyond', 'void', 'prázdnota', 'neodpovedateľné']
    }
};

/**
 * Detekuje vhodný rhythm mód na základe správy a histórie
 * @param {string} message - užívateľská správa
 * @param {Array} conversationHistory - história konverzácie (optional)
 * @returns {Object} - RHYTHM_MODES.X
 */
export function detectRhythm(message, conversationHistory = []) {
    const messageLower = message.toLowerCase();

    // 1. Explicitná požiadavka na konkrétny rhythm
    if (RHYTHM_MODES.SHORT.trigger.some(t => messageLower.includes(t))) {
        runtimeLog('   🎵 Rhythm: ŠEPOT (explicit request)');
        return RHYTHM_MODES.SHORT;
    }

    if (RHYTHM_MODES.RUNE_ONLY.trigger.some(t => messageLower.includes(t))) {
        runtimeLog('   🎵 Rhythm: RUNA (explicit request)');
        return RHYTHM_MODES.RUNE_ONLY;
    }

    // 2. Neodpovedateľná otázka → Ticho (prasklina)
    if (shouldRespondWithSilence(message)) {
        runtimeLog('   🎵 Rhythm: TICHO (unanswerable question)');
        return RHYTHM_MODES.SILENCE;
    }

    // 3. Hlboké existenciálne otázky → Príbeh
    const deepKeywords = [
        'prečo', 'zmysel', 'existuje', 'smrť', 'život', 'utrpenie',
        'láska', 'samota', 'prázdnota', 'tma', 'svetlo', 'pravda',
        'sloboda', 'väzenie', 'osud', 'voľba', 'identita'
    ];
    const deepCount = deepKeywords.filter(kw => messageLower.includes(kw)).length;

    if (deepCount >= 2) {
        runtimeLog(`   🎵 Rhythm: PRÍBEH (${deepCount} deep keywords)`);
        return RHYTHM_MODES.LONG;
    }

    // 4. Jedna hlboká keyword + dlhá správa → Príbeh
    if (deepCount >= 1 && message.split(' ').length > 15) {
        runtimeLog('   🎵 Rhythm: PRÍBEH (deep keyword + long input)');
        return RHYTHM_MODES.LONG;
    }

    // 5. Krátka otázka (< 5 slov) → Šepot
    const wordCount = message.trim().split(/\s+/).length;
    if (wordCount <= 5 && !deepCount) {
        runtimeLog(`   🎵 Rhythm: ŠEPOT (short input: ${wordCount} words)`);
        return RHYTHM_MODES.SHORT;
    }

    // 6. Default → Echo (medium)
    runtimeLog('   🎵 Rhythm: ECHO (default)');
    return RHYTHM_MODES.MEDIUM;
}

/**
 * Aplikuje rhythm constraint na odpoveď
 * @param {string} response - surová odpoveď z LLM
 * @param {Object} rhythmMode - RHYTHM_MODES.X
 * @param {string} mode - persona mode (popici/glitch/core...)
 * @returns {string} - upravená odpoveď
 */
export function applyRhythm(response, rhythmMode, mode = 'core') {
    // 🛡️ v1.3.0: Guard against null/undefined/non-string responses
    if (!response || typeof response !== 'string') {
        runtimeLog('   ⚠️ applyRhythm: invalid response type, skipping');
        return '';
    }

    if (!rhythmMode) return response;

    // SILENCE mód - len prasklina symbol
    if (rhythmMode.name === 'Ticho') {
        const symbol = getPrasklinaSymbol();
        runtimeLog('   🎵 Applied: TICHO (prasklina only)');
        return symbol;
    }

    // RUNE_ONLY mód - len runa + meaning
    if (rhythmMode.name === 'Runa') {
        const rune = getRandomRune();
        runtimeLog(`   🎵 Applied: RUNA ("${rune.text}")`);
        return `✧ "${rune.text}" ✧\n\n${rune.meaning || 'Medituj nad týmto.'}`;
    }

    // ŠEPOT/ECHO/PRÍBEH - word/sentence limiting
    const words = response.split(/\s+/);
    const sentences = response
        .split(/(?<=[\.\?\!])\s+/)
        .map(s => s.trim())
        .filter(Boolean);

    let result = response;
    let applied = false;

    // Truncate by sentences first (ak prekračujeme max)
    if (rhythmMode.maxSentences > 0 && sentences.length > rhythmMode.maxSentences) {
        result = sentences.slice(0, rhythmMode.maxSentences).join(' ');
        applied = true;
        runtimeLog(`   🎵 Applied: ${rhythmMode.name} (truncated to ${rhythmMode.maxSentences} sentences)`);
    }

    // Truncate by words if still too long
    const resultWords = result.split(/\s+/);
    if (rhythmMode.maxWords > 0 && resultWords.length > rhythmMode.maxWords) {
        result = resultWords.slice(0, rhythmMode.maxWords).join(' ');

        // Add ellipsis if truncated mid-sentence
        if (!result.match(/[\.\?\!]$/)) {
            result += '...';
        }

        applied = true;
        runtimeLog(`   🎵 Applied: ${rhythmMode.name} (truncated to ${rhythmMode.maxWords} words)`);
    }

    // Add rhythm indicator footer (subtle)
    if (applied && rhythmMode.name !== 'Echo') {
        result += `\n\n_[${rhythmMode.name}]_`;
    }

    return result;
}

/**
 *Force specific rhythm mode (pre explicit commands like /short, /long)
 * @param {string} modeName - "short" | "medium" | "long" | "rune" | "silence"
 * @returns {Object|null} - RHYTHM_MODES.X or null
 */
export function forceRhythm(modeName) {
    const modeMap = {
        'short': RHYTHM_MODES.SHORT,
        'šepot': RHYTHM_MODES.SHORT,
        'medium': RHYTHM_MODES.MEDIUM,
        'echo': RHYTHM_MODES.MEDIUM,
        'long': RHYTHM_MODES.LONG,
        'príbeh': RHYTHM_MODES.LONG,
        'pribeh': RHYTHM_MODES.LONG,
        'rune': RHYTHM_MODES.RUNE_ONLY,
        'runa': RHYTHM_MODES.RUNE_ONLY,
        'silence': RHYTHM_MODES.SILENCE,
        'ticho': RHYTHM_MODES.SILENCE
    };

    return modeMap[modeName.toLowerCase()] || null;
}

/**
 * Get rhythm stats for debugging
 * @param {string} text - text to analyze
 * @returns {Object} - { wordCount, sentenceCount, estimatedRhythm }
 */
export function analyzeRhythmNeeds(text) {
    const words = text.split(/\s+/);
    const sentences = text.split(/(?<=[\.\?\!])\s+/).filter(Boolean);

    let estimatedRhythm = 'MEDIUM';

    if (words.length <= 20) {
        estimatedRhythm = 'SHORT';
    } else if (words.length > 100) {
        estimatedRhythm = 'LONG';
    }

    return {
        wordCount: words.length,
        sentenceCount: sentences.length,
        estimatedRhythm
    };
}
