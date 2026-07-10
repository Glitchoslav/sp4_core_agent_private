// ┌─────────────────────────────────────────────┐
// │  SP4 OS COMMAND: /mirror                   │
// │  Layer: Interface / Commands               │
// │  Role: Zrkadlo posledných konverzácií     │
// │  Dependencies: conversationMirror.js       │
// └─────────────────────────────────────────────┘

import { buildMirrorText } from '../services/conversationMirror.js';

/**
 * Spracuje /mirror príkaz.
 * Zobrazí analýzu posledných 10 správ.
 * 
 * @returns {Promise<string>} Formátovaný výstup s analýzou
 */
export async function handleMirrorCommand() {
    const text = await buildMirrorText(10);
    return `🪞 MIRROR:\n\n${text}`;
}
