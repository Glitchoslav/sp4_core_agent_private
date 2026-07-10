// ┌─────────────────────────────────────────────┐
// │  SP4 OS v1.3.0 - CONVERSATION MIRROR       │
// │  Layer: Services                           │
// │  Role: Analýza posledných konverzácií     │
// │  Dependencies: memory.json                 │
// └─────────────────────────────────────────────┘

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRetrievableMemoryLog } from '../runtime/memoryHygiene.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMORY_PATH = path.join(__dirname, '..', '..', 'data', 'memory.json');

/**
 * Načíta posledných N user správ z memory.json -> rawMemory.log.
 * 
 * @param {number} limit - Max počet správ
 * @returns {Promise<Array<string>>} Pole user vstupov (od najnovších)
 */
export async function getLastUserMessages(limit = 10) {
    try {
        const memoryData = await fs.readFile(MEMORY_PATH, 'utf-8');
        const memory = JSON.parse(memoryData);

        if (!memory.rawMemory || !memory.rawMemory.log) {
            return [];
        }

        const { entries } = getRetrievableMemoryLog(memory);

        // Zoberieme len user inputy, reversed (od najnovších)
        const messages = entries
            .map(entry => entry.input)
            .filter(input => input && input.trim().length > 0)
            .reverse()
            .slice(0, limit);

        return messages;
    } catch (error) {
        // Ak memory neexistuje alebo je neplatný, vráť prázdne pole
        return [];
    }
}

/**
 * Vyrobí krátke zhrnutie posledných konverzácií.
 * - Extrahuje najčastejšie slová (okrem stop-slov)
 * - 2-3 vety bez korporátneho bullshitu
 * 
 * @param {number} limit - Koľko správ analyzovať
 * @returns {Promise<string>} Slovenský text so zhrnutím
 */
export async function buildMirrorText(limit = 10) {
    const messages = await getLastUserMessages(limit);

    if (messages.length === 0) {
        return `⚠️ Zatiaľ nemám dostatok histórie na zrkadlo.

Keď sa so mnou porozprávame viac, budem vedieť ukázať vzory v tom, čo riešiš.`;
    }

    // Spojíme všetky správy do jedného textu
    const fullText = messages.join(' ').toLowerCase();

    // Slovenské stop-slová (zámená, predložky, spojky, príkazy)
    const stopWords = new Set([
        'je', 'si', 'som', 'sme', 'ste', 'sú', 'a', 'ale', 'alebo', 'ak', 'že',
        'sa', 'na', 'v', 'vo', 'z', 'zo', 'do', 'od', 'po', 'pre', 'pri', 'o',
        'čo', 'ako', 'kto', 'kde', 'prečo', 'keď', 'už', 'ešte', 'to', 'ta', 'ten',
        'tá', 'toto', 'táto', 'ten', 'toho', 'tej', 'tým', 'by', 'mi', 'ma', 'mu',
        'ho', 'ju', 'ti', 'te', 'nám', 'vám', 'im', 'ich', 'môj', 'tvoj', 'jeho',
        'jej', 'náš', 'váš', 'nie', 'áno', 'ano', 'hej', 'či', 'než', 'než',
        'mode', 'status', 'help', 'note', 'profile', 'backup', 'system', 'whoami',
        'mirror', 'pulse', 'seed_refresh', 'chcem', 'mám', 'môžem', 'nemôžem'
    ]);

    // Tokenizácia: rozdelenie na slová, odstránenie interpunkcie
    const words = fullText
        .replace(/[.,!?;:()"\[\]{}\/\\]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3) // Min 4 znaky
        .filter(word => !stopWords.has(word));

    // Počítanie frekvencií
    const wordFreq = {};
    for (const word of words) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    }

    // Zoradenie podľa frekvencie
    const topWords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word, count]) => ({ word, count }));

    if (topWords.length === 0) {
        return `Analyzoval som posledných ${messages.length} správ, ale nenašiel som žiadne výrazné vzory.

Možno boli len príkazy alebo krátke otázky. Skús sa so mnou viac rozprávať o tom, čo ťa trápi alebo zaujíma.`;
    }

    // Zostavenie výstupu
    const lines = [];

    lines.push(`📊 Analyzoval som posledných ${messages.length} správ.`);
    lines.push('');

    const themes = topWords.map(w => w.word).join(', ');
    lines.push(`🔍 Často spomínaš: ${themes}`);
    lines.push('');

    // Heuristická interpretácia (bez AI, len patternové rozpoznávanie)
    const allText = messages.join(' ').toLowerCase();

    if (allText.includes('neviem') || allText.includes('zmätok') || allText.includes('nerozumiem')) {
        lines.push(`💭 Vidím, že hľadáš jasnosť. To je dobrý začiatok - len kto vie, že nevie, môže sa učiť.`);
    } else if (allText.includes('práca') || allText.includes('job') || allText.includes('projekt')) {
        lines.push(`💼 Riešiš hlavne prácu a projekty. Nezabudni oddychovať - vyhorenie príde potichu.`);
    } else if (allText.includes('vzťah') || allText.includes('partner') || allText.includes('rodina')) {
        lines.push(`❤️ Vzťahy sú náročné. Ale to, že o nich premýšľaš, znamená, že ti na nich záleží.`);
    } else {
        lines.push(`🧭 Každý hľadá svoj smer. Buď trpezlivý k sebe.`);
    }

    return lines.join('\n');
}
