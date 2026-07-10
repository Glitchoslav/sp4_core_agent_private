// SP4 Prompt Assembly Identity Contract Test
// Vrstva 2 z 3 — Fáza 3 deterministický contract pack.
// Verifikuje, že buildSystemPrompt vždy injektuje kernel layer PRVÝ
// a že každý mode obsahuje správnu identity hlavičku bez cudzích persón.
// Deterministic — no LLM, no network.

import assert from 'node:assert/strict';
import { buildSystemPrompt } from '../multiVoice.js';

let pass = 0;
let fail = 0;

function check(label, fn) {
    try {
        fn();
        console.log(`  PASS ${label}`);
        pass++;
    } catch (err) {
        console.error(`  FAIL ${label}: ${err.message}`);
        fail++;
    }
}

const MODES = [
    { mode: 'core', expectedLabel: 'SP4_CORE', alienLabels: ['GLITCHOSLAV', 'POPIČI'] },
    { mode: 'glitch', expectedLabel: 'GLITCHOSLAV', alienLabels: ['SP4_CORE', 'POPIČI'] },
    { mode: 'glitchoslav', expectedLabel: 'GLITCHOSLAV', alienLabels: ['SP4_CORE', 'POPIČI'] },
    { mode: 'popici', expectedLabel: 'POPIČI', alienLabels: ['SP4_CORE', 'GLITCHOSLAV'] },
];

for (const { mode, expectedLabel, alienLabels } of MODES) {
    const prompt = buildSystemPrompt(mode, {});

    // 1. Prompt is a non-empty string
    check(`buildSystemPrompt(${mode}) returns non-empty string`, () =>
        assert.ok(typeof prompt === 'string' && prompt.length > 0,
            `Expected non-empty string for mode ${mode}`));

    // 2. Kernel identity header is present
    check(`buildSystemPrompt(${mode}) contains "IDENTITY KERNEL: ${expectedLabel}"`, () =>
        assert.ok(prompt.includes(`IDENTITY KERNEL: ${expectedLabel}`),
            `Missing "IDENTITY KERNEL: ${expectedLabel}"\nPrompt start: ${prompt.slice(0, 300)}`));

    // 3. Kernel layer is FIRST — prompt starts with kernel separator
    check(`buildSystemPrompt(${mode}) starts with kernel separator (━━━)`, () =>
        assert.ok(prompt.trimStart().startsWith('━━━━━━━━━━━━━━━━━━━━'),
            `Prompt for ${mode} does not start with kernel block\nStart: ${prompt.slice(0, 200)}`));

    // 4. No alien persona kernel injected as main voice header
    for (const alien of alienLabels) {
        check(`buildSystemPrompt(${mode}) has no alien kernel "IDENTITY KERNEL: ${alien}"`, () =>
            assert.ok(!prompt.includes(`IDENTITY KERNEL: ${alien}`),
                `Mode ${mode} contains alien kernel header "IDENTITY KERNEL: ${alien}"`));
    }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
if (fail > 0) {
    console.error(`\nFAIL: ${fail}/${pass + fail} prompt assembly assertions failed`);
    process.exit(1);
}
console.log(`\nPASS: all ${pass} prompt assembly assertions passed`);
