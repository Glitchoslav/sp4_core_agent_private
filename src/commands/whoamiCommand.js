// ┌─────────────────────────────────────────────┐
// │  SP4 OS COMMAND: /whoami                   │
// │  Layer: Interface / Commands               │
// │  Role: Zobrazenie identity z user seedu    │
// │  Dependencies: personalProfile.js          │
// └─────────────────────────────────────────────┘

import { buildWhoAmIText } from '../services/personalProfile.js';

/**
 * Spracuje /whoami príkaz.
 * Zobrazí základnú identitu z user_seed.json.
 * 
 * @returns {Promise<string>} Formátovaný výstup s identitou
 */
export async function handleWhoAmICommand() {
    const text = await buildWhoAmIText();
    return `🧬 WHOAMI:\n\n${text}`;
}
