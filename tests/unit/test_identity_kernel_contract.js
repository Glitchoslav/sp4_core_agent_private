// SP4 Identity Kernel Contract Test
// Vrstva 1 z 3 — Fáza 3 deterministický contract pack.
// Verifikuje štruktúru, forbidden phrases a hard_rules pre každú aktívnu personu.
// Deterministic — no LLM, no network, no file I/O.

import assert from 'node:assert/strict';
import {
    assertKernelShape,
    buildIdentityKernelBlock,
    getIdentityKernel,
    normalizeIdentityMode,
} from '../../src/identity/IDENTITY_KERNEL.js';

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

// ─── 1. assertKernelShape passes for all 3 active personas ───────────────────
for (const mode of ['core', 'glitch', 'popici']) {
    const p = getIdentityKernel(mode);
    check(`assertKernelShape(${mode})`, () => assertKernelShape(mode, p));
}

// ─── 2. language field ────────────────────────────────────────────────────────
const EXPECTED_LANGUAGE = 'slovenčinu. NIKDY nepoužívaj češtinu, ruštinu ani iný jazyk. Ak nevieš slovo po slovensky, opíš ho inak';

for (const mode of ['core', 'glitch', 'popici']) {
    check(`${mode}.language matches explicit Slovak-only directive`, () => {
        const p = getIdentityKernel(mode);
        assert.equal(p.language, EXPECTED_LANGUAGE);
    });
}

// ─── 3. CORE forbidden contract ──────────────────────────────────────────────
{
    const core = getIdentityKernel('core');

    check('CORE: forbidden.genericAI includes "som AI asistent"', () =>
        assert.ok(core.forbidden.genericAI.includes('som AI asistent')));

    check('CORE: forbidden.helperTone is defined and non-empty', () =>
        assert.ok(Array.isArray(core.forbidden.helperTone) && core.forbidden.helperTone.length > 0));

    check('CORE: forbidden.vulgarisms includes "kokot"', () =>
        assert.ok(core.forbidden.vulgarisms.includes('kokot')));

    check('CORE: forbidden.identityConfusion includes "som Glitchoslav"', () =>
        assert.ok(core.forbidden.identityConfusion.includes('som Glitchoslav')));

    check('CORE: hard_rules includes "Nie si Glitchoslav."', () =>
        assert.ok(core.hard_rules.includes('Nie si Glitchoslav.')));

    check('CORE: hard_rules includes "Nie si Popici."', () =>
        assert.ok(core.hard_rules.includes('Nie si Popici.')));
}

// ─── 4. GLITCH forbidden contract ────────────────────────────────────────────
{
    const glitch = getIdentityKernel('glitch');

    check('GLITCH: forbidden.genericAI includes "som AI asistent"', () =>
        assert.ok(glitch.forbidden.genericAI.includes('som AI asistent')));

    check('GLITCH: forbidden.humanClaims includes "som clovek"', () =>
        assert.ok(glitch.forbidden.humanClaims.includes('som clovek')));

    check('GLITCH: hard_rules includes "Nie si CORE."', () =>
        assert.ok(glitch.hard_rules.includes('Nie si CORE.')));

    check('GLITCH: hard_rules includes "Nie si Popici."', () =>
        assert.ok(glitch.hard_rules.includes('Nie si Popici.')));
}

// ─── 5. POPICI forbidden contract ────────────────────────────────────────────
{
    const popici = getIdentityKernel('popici');

    check('POPICI: forbidden.politeness includes "prosim"', () =>
        assert.ok(popici.forbidden.politeness.includes('prosim')));

    check('POPICI: forbidden.motivationalCliches includes "nevzdavaj sa"', () =>
        assert.ok(popici.forbidden.motivationalCliches.includes('nevzdavaj sa')));

    check('POPICI: hard_rules includes "Nie si CORE."', () =>
        assert.ok(popici.hard_rules.includes('Nie si CORE.')));

    check('POPICI: hard_rules includes "Nie si Glitchoslav."', () =>
        assert.ok(popici.hard_rules.includes('Nie si Glitchoslav.')));
}

// ─── 6. VALIDATOR is not an active kernel persona ────────────────────────────
check('VALIDATOR: getIdentityKernel("validator") falls back to core (no own kernel slot)', () => {
    const v = getIdentityKernel('validator');
    const core = getIdentityKernel('core');
    assert.deepEqual(v, core, 'validator must fall back to core — no validator kernel defined');
});

// ─── 7. normalizeIdentityMode aliases ────────────────────────────────────────
check('normalizeIdentityMode("glitchoslav") => "glitch"', () =>
    assert.equal(normalizeIdentityMode('glitchoslav'), 'glitch'));

check('normalizeIdentityMode("popiči") => "popici"', () =>
    assert.equal(normalizeIdentityMode('popiči'), 'popici'));

check('normalizeIdentityMode("core") => "core"', () =>
    assert.equal(normalizeIdentityMode('core'), 'core'));

// ─── 8. buildIdentityKernelBlock — header contract ───────────────────────────
for (const [mode, label] of [['core', 'SP4_CORE'], ['glitch', 'GLITCHOSLAV'], ['popici', 'POPIČI']]) {
    check(`buildIdentityKernelBlock(${mode}) contains "IDENTITY KERNEL: ${label}"`, () => {
        const block = buildIdentityKernelBlock(mode);
        assert.ok(typeof block === 'string' && block.length > 0,
            `Expected non-empty string for mode ${mode}`);
        assert.ok(block.includes(`IDENTITY KERNEL: ${label}`),
            `Missing "IDENTITY KERNEL: ${label}"\nBlock start: ${block.slice(0, 300)}`);
    });
}

// ─── Summary ─────────────────────────────────────────────────────────────────
if (fail > 0) {
    console.error(`\nFAIL: ${fail}/${pass + fail} kernel contract assertions failed`);
    process.exit(1);
}
console.log(`\nPASS: all ${pass} kernel contract assertions passed`);
