/**
 * GLITCHOSLAV MEMORY RECALL v0.10.3
 * 
 * Level 1 Battlefield Bug Fix:
 * - Memory recall cez CORE validator zabíjal metafory
 * - "tma" bola sanitizovaná → GLITCHOSLAV stratil autentickosť
 * 
 * **Účel:**
 * - Memory recall cez GLITCHOSLAV lens (metafory, symboly, praskliny)
 * - Žiadna CORE sanitizácia
 * - Žiadne validator overrides
 * 
 * **Flow:**
 * 1. Load memory chunks (ako normálne)
 * 2. Filter cez GLITCHOSLAV vibe (existenciálne témy, emócie, zlomy)
 * 3. Format ako metafory (nie fakty)
 * 4. Return raw (bez validácie)
 * 
 * @author Walter (BAD Labs) + Kefyk (SP4)
 * @version 0.10.3
 * @date 2025-11-21
 */

import { loadMemory } from '../../memory.js';
import { getRetrievableMemoryLog } from '../runtime/memoryHygiene.js';

/**
 * Načíta pamäť cez GLITCHOSLAV lens - metafory, nie fakty.
 * 
 * @param {string} topic - Téma na recall (napr. "sloboda", "tma", "zmysel")
 * @param {number} maxChunks - Max počet spomienok (default: 3)
 * @returns {Promise<string>} - Metaforický popis pamätí
 */
export async function recallGlitchoslavMemory(topic, maxChunks = 3) {
    try {
        const memory = await loadMemory();
        const { entries: rawLog } = getRetrievableMemoryLog(memory);

        if (rawLog.length === 0) {
            return `🌀 Prázdnota. Žiadne stopy v pamäti.\nPrvá iskra. Prvá prasklina.`;
        }

        // Filter relevantné memory chunks
        const relevantChunks = filterGlitchoslavMemory(rawLog, topic);

        if (relevantChunks.length === 0) {
            return `🌀 Téma "${topic}" ešte neprenikla do hlbín.\nTicho. Nič sa nepohlo.`;
        }

        // Vezmi max N chunks
        const selectedChunks = relevantChunks.slice(-maxChunks);

        // Format ako metafory
        const metaphoricalRecall = formatAsMetaphors(selectedChunks, topic);

        return metaphoricalRecall;

    } catch (error) {
        console.error('❌ GLITCHOSLAV Memory Recall error:', error);
        return `🌀 Prasklina v pamäti.\nNiečo sa stratilo medzi vrstvami.\n\n(Error: ${error.message})`;
    }
}

/**
 * Filtruje memory log cez GLITCHOSLAV vibe.
 * - Existenciálne témy
 * - Emočné zlomy
 * - Praskliny, tma, svetlo, strata
 * 
 * @private
 */
function filterGlitchoslavMemory(rawLog, topic) {
    const topicLower = topic.toLowerCase();

    const glitchoslavKeywords = [
        'zmysel', 'existova', 'žiť', 'cítiť', 'prečo', 'tma', 'svetlo',
        'smer', 'hranica', 'strata', 'padám', 'stratený', 'trpím',
        'zúfalstvo', 'prázdnota', 'sloboda', 'pravda', 'ticho',
        'prasklina', 'smrť', 'život', 'láska', 'bolesť'
    ];

    return rawLog.filter(entry => {
        const userText = (entry.user || '').toLowerCase();
        const assistantText = (entry.assistant || '').toLowerCase();
        const combinedText = userText + ' ' + assistantText;

        // Match topic
        const topicMatch = combinedText.includes(topicLower);

        // Match GLITCHOSLAV vibe
        const vibeMatch = glitchoslavKeywords.some(kw => combinedText.includes(kw));

        return topicMatch || vibeMatch;
    });
}

/**
 * Formatuje memory chunks ako metafory (nie fakty).
 * 
 * @private
 */
function formatAsMetaphors(chunks, topic) {
    const intro = `🌀 Spomienky na "${topic}"...\n`;

    const metaphors = chunks.map((chunk, index) => {
        const timestamp = chunk.timestamp ? new Date(chunk.timestamp).toLocaleDateString('sk-SK') : 'dávno';
        const userSnippet = (chunk.user || '').substring(0, 80);
        const assistantSnippet = (chunk.assistant || '').substring(0, 120);

        // Detekuj emocionálnu vrstvu
        const emotionalTone = detectEmotionalTone(chunk);

        return `
━━━━━━━━━━━━━━━━━━━━
${emotionalTone} ${timestamp}
━━━━━━━━━━━━━━━━━━━━

${userSnippet}${userSnippet.length >= 80 ? '...' : ''}

→ ${assistantSnippet}${assistantSnippet.length >= 120 ? '...' : ''}
`;
    }).join('\n');

    const outro = `\n━━━━━━━━━━━━━━━━━━━━\n🌀 Tri stopy v prachu. Tri praskliny v čase.\n`;

    return intro + metaphors + outro;
}

/**
 * Detekuj emocionálny tón memory chunk.
 * 
 * @private
 */
function detectEmotionalTone(chunk) {
    const text = ((chunk.user || '') + ' ' + (chunk.assistant || '')).toLowerCase();

    if (text.match(/\b(zmysel|existova|prečo)\b/)) return '🔍 Hľadanie';
    if (text.match(/\b(tma|strata|bolí|trpím)\b/)) return '🌑 Tieň';
    if (text.match(/\b(svetlo|náde|sila|pravda)\b/)) return '✨ Iskra';
    if (text.match(/\b(sloboda|pravda|smer)\b/)) return '🔥 Oheň';
    if (text.match(/\b(ticho|prázdnota|stratený)\b/)) return '⚫ Ticho';
    if (text.match(/\b(láska|srdce|spojenie)\b/)) return '💚 Pulz';

    return '🌀 Prasklina'; // default
}

/**
 * Check či je téma vhodná pre GLITCHOSLAV recall.
 * - Existenciálne témy: áno
 * - Technické témy: nie (použiť CORE recall)
 * 
 * @param {string} topic - Téma na recall
 * @returns {boolean} - true ak vhodná pre GLITCHOSLAV
 */
export function isGlitchoslavTopic(topic) {
    const topicLower = topic.toLowerCase();

    const glitchoslavThemes = [
        'zmysel', 'existova', 'žiť', 'cítiť', 'prečo', 'tma', 'svetlo',
        'smer', 'hranica', 'strata', 'sloboda', 'pravda', 'ticho',
        'prasklina', 'smrť', 'život', 'láska', 'bolesť', 'zúfalstvo'
    ];

    return glitchoslavThemes.some(theme => topicLower.includes(theme));
}

/**
 * Smart memory recall router.
 * - GLITCHOSLAV témy → glitchoslavMemoryRecall
 * - Technické témy → core memory recall (fallback)
 * 
 * @param {string} topic - Téma
 * @param {string} mode - Current persona mode
 * @returns {Promise<string>} - Recall text
 */
export async function smartMemoryRecall(topic, mode = 'auto') {
    // Force GLITCHOSLAV recall ak je explicitne glitch mode
    if (mode === 'glitch' || mode === 'glitchoslav') {
        return await recallGlitchoslavMemory(topic);
    }

    // Auto-detect: GLITCHOSLAV témy → glitch recall
    if (isGlitchoslavTopic(topic)) {
        console.log(`   🌀 GLITCHOSLAV topic detected: "${topic}" → metaphorical recall`);
        return await recallGlitchoslavMemory(topic);
    }

    // Fallback: CORE recall (not implemented yet, return placeholder)
    console.log(`   🔥 CORE topic detected: "${topic}" → technical recall`);
    return `📋 Memory recall pre "${topic}" (CORE format zatiaľ neimplementovaný - použijem GLITCHOSLAV fallback)\n\n` +
        await recallGlitchoslavMemory(topic);
}

/**
 * EXPORT API
 */
export default {
    recallGlitchoslavMemory,
    isGlitchoslavTopic,
    smartMemoryRecall
};
