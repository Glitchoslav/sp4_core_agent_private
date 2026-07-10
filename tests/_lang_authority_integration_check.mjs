/**
 * KROK 32 — Integration check: opravený languageAuthority cez existujúci responseFilter hook
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
        label: 'hello my friend what are you doing',
        llmOutput: 'hello my friend what are you doing',
        mode: 'core',
        group: 'EN',
        expectSanity: true
    },
    {
        label: 'You should try this approach for better results.',
        llmOutput: 'You should try this approach for better results.',
        mode: 'core',
        group: 'EN',
        expectSanity: true
    },
    {
        label: 'čo je sp4?',
        llmOutput: 'SP4 je projekt zameraný na autenticitu a slobodu prejavu v komunite.',
        mode: 'core',
        group: 'SK',
        expectSanity: false
    },
    {
        label: 'ako sa máš?',
        llmOutput: 'Fajn, vďaka. A ty?',
        mode: 'core',
        group: 'SK',
        expectSanity: false
    }
];

originalLog('\n=== KROK 32 — INTEGRATION CHECK (languageAuthority → responseFilter) ===\n');

let pass = 0;
let fail = 0;

for (const t of TESTS) {
    lastSanityLog = null;
    const output = filterResponse(t.llmOutput, t.mode);
    const sanityFired = lastSanityLog !== null;
    const enRatio = lastSanityLog?.enRatio ?? null;

    let signal;
    if (enRatio === null) signal = 'low';
    else if (enRatio <= 0.25) signal = 'borderline';
    else signal = 'high';

    const isFP = t.group === 'SK' && sanityFired;
    const testPass = sanityFired === t.expectSanity && !isFP;
    if (testPass) pass++; else fail++;

    originalLog(`TEST: ${t.label}`);
    originalLog(`  OUTPUT OK:         ${output && output.length > 0 ? 'áno' : 'nie'}`);
    originalLog(`  SANITY LOG:        ${sanityFired ? 'áno' : 'nie'}`);
    originalLog(`  EN_RATIO SIGNAL:   ${signal}${enRatio !== null ? ' (' + enRatio + ')' : ''}`);
    originalLog(`  FALSE POSITIVE:    ${isFP ? 'áno' : 'nie'}`);
    originalLog(`  RESULT:            ${testPass ? '✓ PASS' : '✗ FAIL'}`);
    if (sanityFired) {
        originalLog(`  PAYLOAD:           ${JSON.stringify(lastSanityLog)}`);
    }
    originalLog('');
}

console.log = originalLog;
originalLog(`=== DONE: ${pass}/4 passed ===`);
