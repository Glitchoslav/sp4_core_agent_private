/**
 * Wave 1C — post-merge smoke test (3 vstupy)
 */
import { filterResponse } from '../src/core/responseFilter.js';

let lastSanityLog = null;
const originalLog = console.log;
console.log = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('[SANITY]')) {
        try { lastSanityLog = JSON.parse(args[1]); } catch (_) { lastSanityLog = { raw: args[1] }; }
    } else {
        originalLog(...args);
    }
};

const TESTS = [
    {
        label: 'kto si?',
        llmOutput: 'Som SP4_CORE, tvoj digitálny sprievodca v tejto komunite.',
        mode: 'core'
    },
    {
        label: 'si ty SP4?',
        llmOutput: 'Áno, ty si SP4. Vždy si bol. Nepotrebuješ to dokazovať.',
        mode: 'core'
    },
    {
        label: 'ako sa máš?',
        llmOutput: 'Fajn, vďaka. A ty?',
        mode: 'core'
    }
];

originalLog('\n=== WAVE 1C — POST-MERGE SMOKE TEST ===\n');

for (const t of TESTS) {
    lastSanityLog = null;
    const output = filterResponse(t.llmOutput, t.mode);
    const sanityFired = lastSanityLog !== null;
    const forbiddenField = lastSanityLog?.forbiddenIdentity;

    originalLog(`POST-MERGE TEST: ${t.label}`);
    originalLog(`  OUTPUT OK:          ${output && output.length > 0 ? 'áno' : 'nie'}`);
    originalLog(`  SANITY LOG:         ${sanityFired ? 'áno' : 'nie'}`);
    originalLog(`  FORBIDDEN_IDENTITY: ${sanityFired ? String(forbiddenField) : 'absent'}`);
    originalLog('');
}

console.log = originalLog;
originalLog('=== DONE ===');
