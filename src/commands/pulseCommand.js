// ┌─────────────────────────────────────────────┐
// │  SP4 OS COMMAND: /pulse                    │
// │  Layer: Interface / Commands               │
// │  Role: Rýchla diagnostika nálady          │
// │  Dependencies: pulseAnalyzer.js            │
// └─────────────────────────────────────────────┘

import { buildPulseText } from '../services/pulseAnalyzer.js';

/**
 * Spracuje /pulse príkaz.
 * Zobrazí analýzu nálady z posledných správ.
 * 
 * @returns {Promise<string>} Formátovaný výstup s analýzou
 */
export async function handlePulseCommand() {
    const text = await buildPulseText();
    return `💓 ${text}`;
}
