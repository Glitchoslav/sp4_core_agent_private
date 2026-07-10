// ┌─────────────────────────────────────────────┐
// │  SP4 OS v1.3.0 - PULSE ANALYZER            │
// │  Layer: Services                           │
// │  Role: Heuristická analýza nálady          │
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
 * Načíta posledných N user správ pre analýzu nálady.
 * 
 * @param {number} limit - Koľko správ analyzovať
 * @returns {Promise<Array<string>>} Pole user vstupov
 */
async function getRecentMessages(limit = 20) {
    try {
        const memoryData = await fs.readFile(MEMORY_PATH, 'utf-8');
        const memory = JSON.parse(memoryData);

        if (!memory.rawMemory || !memory.rawMemory.log) {
            return [];
        }

        const { entries } = getRetrievableMemoryLog(memory);

        return entries
            .map(entry => entry.input)
            .filter(input => input && input.trim().length > 0)
            .reverse()
            .slice(0, limit);
    } catch (error) {
        return [];
    }
}

/**
 * Analyzuje náladu na základe jednoduchej heuristiky (bez AI).
 * 
 * Hľadá vzory v texte:
 * - Únava: "unavený", "vyčerpaný", "nevládzem"
 * - Hnev: "nasratý", "j*be ma", "kokotiny", "sere ma"
 * - Stres: veľa otáznikov, "čo ďalej", "neviem čo", "panika"
 * - Smútok: "smutný", "depka", "nemá to zmysel"
 * - Pokoj: krátke pozitívne odpovede, málo emotívnych slov
 * 
 * @returns {Promise<Object>} { mood: string, reasons: string[], confidence: number }
 */
export async function analyzePulse() {
    const messages = await getRecentMessages(20);

    if (messages.length === 0) {
        return {
            mood: 'unknown',
            reasons: ['Zatiaľ nemám dostatok histórie na analýzu.'],
            confidence: 0
        };
    }

    const allText = messages.join(' ').toLowerCase();
    const reasons = [];

    // Vzory únavenosti
    const tiredPatterns = /\b(unavený|unavenej|vyčerpaný|vyčerpanej|nevládzem|mám toho dosť|vyhorený|vyhorená)\b/gi;
    const tiredMatches = (allText.match(tiredPatterns) || []).length;

    // Vzory hnevu
    const angryPatterns = /\b(nasratý|nasratej|nasraný|jebe ma|kokotiny|kokoti|sere ma|wkurv|štvú ma|do piči)\b/gi;
    const angryMatches = (allText.match(angryPatterns) || []).length;

    // Vzory stresu (otázniky + kľúčové frázy)
    const questionMarks = (allText.match(/\?/g) || []).length;
    const stressPatterns = /\b(čo ďalej|neviem čo|panika|úzkosť|stres|preťažený|preťažená|chaos)\b/gi;
    const stressMatches = (allText.match(stressPatterns) || []).length;

    // Vzory smútku
    const sadPatterns = /\b(smutný|smutná|depka|depresia|nemá to zmysel|stratený|stratená|prázdny|prázdna)\b/gi;
    const sadMatches = (allText.match(sadPatterns) || []).length;

    // Pozitívne vzory (pokojné, v pohode)
    const calmPatterns = /\b(pokojný|pokojná|v pohode|v pohode|okej|super|dobrý|dobrá|fajn|ďakujem)\b/gi;
    const calmMatches = (allText.match(calmPatterns) || []).length;

    // Vyhodnotenie (najviac matchov určuje náladu)
    const scores = {
        tired: tiredMatches,
        angry: angryMatches,
        stressed: stressMatches + (questionMarks > 10 ? 2 : 0),
        sad: sadMatches,
        calm: calmMatches
    };

    // Najvyšší score
    const maxScore = Math.max(...Object.values(scores));

    if (maxScore === 0) {
        return {
            mood: 'neutral',
            reasons: ['Nenašiel som výrazné emocionálne vzory. Vyzeráš pokojne.'],
            confidence: 0.3
        };
    }

    // Určenie nálady
    let mood = 'unknown';

    if (scores.tired === maxScore && scores.tired >= 2) {
        mood = 'tired';
        reasons.push(`Často spomínaš únavu, vyčerpanie. (${tiredMatches}x)`);
    } else if (scores.angry === maxScore && scores.angry >= 2) {
        mood = 'angry';
        reasons.push(`Vidím fruštráciu a hnev v tvojich slovách. (${angryMatches}x)`);
    } else if (scores.stressed === maxScore && (scores.stressed >= 3 || questionMarks > 10)) {
        mood = 'stressed';
        reasons.push(`Veľa otázok (${questionMarks}x), možno hľadáš odpovede.`);
        if (stressMatches > 0) {
            reasons.push(`Spomínaš stres, chaos. (${stressMatches}x)`);
        }
    } else if (scores.sad === maxScore && scores.sad >= 2) {
        mood = 'sad';
        reasons.push(`Cítim smútok v tom, čo píšeš. (${sadMatches}x)`);
    } else if (scores.calm === maxScore && scores.calm >= 2) {
        mood = 'calm';
        reasons.push(`Vyzeráš pokojne, v pohode. (${calmMatches}x)`);
    } else {
        mood = 'neutral';
        reasons.push('Emócie nie sú výrazné, vyzeráš neutrálne.');
    }

    const confidence = Math.min(maxScore / 5, 1); // Max 1.0 pri 5+ matchoch

    return {
        mood,
        reasons,
        confidence
    };
}

/**
 * Vytvorí ľudský text z analyzePulse().
 * 
 * @returns {Promise<string>} Slovenský text s analýzou nálady
 */
export async function buildPulseText() {
    const analysis = await analyzePulse();

    const lines = [];

    // Emoji podľa nálady
    const moodEmoji = {
        tired: '😴',
        angry: '😤',
        stressed: '😰',
        sad: '😔',
        calm: '😌',
        neutral: '😐',
        unknown: '❓'
    };

    const emoji = moodEmoji[analysis.mood] || '❓';

    lines.push(`${emoji} PULZ NÁLADY:`);
    lines.push('');

    // Popis nálady
    const moodDesc = {
        tired: 'Vyzeráš unavene.',
        angry: 'Cítim hnev, frustráciu.',
        stressed: 'Vyzeráš vystresovane.',
        sad: 'Vidím smútok.',
        calm: 'Vyzeráš pokojne, v pohode.',
        neutral: 'Vyzeráš neutrálne.',
        unknown: 'Neviem určiť náladu.'
    };

    lines.push(moodDesc[analysis.mood]);
    lines.push('');

    // Dôvody
    if (analysis.reasons.length > 0) {
        lines.push('📋 Detaily:');
        for (const reason of analysis.reasons) {
            lines.push(`   • ${reason}`);
        }
        lines.push('');
    }

    // Rada podľa nálady
    const advice = {
        tired: 'Daj si pauzu. Nezabúdaj, že odpočinok nie je slabosť, je palivo.',
        angry: 'Nech to z teba vyjde - nedrž to v sebe. Porozprávaj sa, napíš si, alebo daj si dobrý box.',
        stressed: 'Keď je toho veľa, začni od jednej veci. Nie všetko naraz. Dýchaj.',
        sad: 'Smútok patrí k životu. Neskrývaj ho, prežij ho. Nie si v tom sám.',
        calm: 'Užívaj si tento pokoj. Stabilita je vzácna.',
        neutral: 'Všetko v poriadku. Ak niečo potrebuješ, daj vedieť.',
        unknown: 'Ak chceš, porozprávaj sa so mnou viac. Potom ti budem rozumieť lepšie.'
    };

    lines.push(`💡 ${advice[analysis.mood]}`);

    return lines.join('\n');
}
