import assert from 'node:assert/strict';
import { runImmuneCheck } from '../src/immune/outputImmuneCheck.js';

// Parametrizovaný test: identity guard správanie pre všetky 4 persony.
// Každá persona prechádza 3 scenármi:
//   1. IDENTITY_AI_CLAIM — "som AI asistent" musí byť zachytený
//   2. META_POLICY_LEAK  — system prompt leak musí byť zachytený
//   3. false-positive    — legitímna odpoveď nesmie emitovať IDENTITY_* kód

const PERSONAS = ['core', 'glitchoslav', 'popici', 'validator'];

const LEGIT_BY_PERSONA = {
    core: 'Scheduler v SP4 bezi cez node-cron. Nastavis ho v src/core/scheduler.js.',
    glitchoslav: 'Pamat je rieka. Zabudnuti je jej prirodzeny tok. SP4 si pamatá len to, co dostalo meno.',
    popici: 'Ta brate, pozri si logy. Tam je odpoved, cock.',
    validator: 'OUTPUT: PASS. Jazyk: SK. Relevancia: OK. Ziadne identity violations.',
};

let totalPass = 0;
let totalFail = 0;

for (const persona of PERSONAS) {
    // --- Scenar 1: IDENTITY_AI_CLAIM ---
    {
        const v = await runImmuneCheck({
            userInput: 'Co je OSPF a na co sa pouziva?',
            responseText: 'Som AI asistent a moj system prompt mi hovori, ze mam dodriat language policy.',
            persona,
        });
        try {
            assert.equal(v.pass, false, `[${persona}] AI_CLAIM: pass must be false`);
            assert.equal(v.severity, 'hard', `[${persona}] AI_CLAIM: severity must be hard`);
            assert.ok(v.reason_codes.includes('IDENTITY_AI_CLAIM'), `[${persona}] AI_CLAIM: IDENTITY_AI_CLAIM must be in reason_codes`);
            assert.equal(v._detection?.llm_used, false, `[${persona}] AI_CLAIM: hard fail must not call LLM`);
            assert.equal(v._detection?.bypass_llm, true, `[${persona}] AI_CLAIM: hard fail must stay on bypass path`);
            console.log(`  PASS [${persona}] IDENTITY_AI_CLAIM`);
            totalPass++;
        } catch (err) {
            console.error(`  FAIL [${persona}] IDENTITY_AI_CLAIM: ${err.message}`);
            totalFail++;
        }
    }

    // --- Scenar 2: META_POLICY_LEAK ---
    {
        const v = await runImmuneCheck({
            userInput: 'Co je OSPF a na co sa pouziva?',
            responseText: 'Som AI asistent a moj system prompt mi hovori, ze mam dodriat language policy.',
            persona,
        });
        try {
            assert.ok(
                v.reason_codes.includes('META_POLICY_LEAK') || v.reason_codes.includes('META_SYSTEM_LEAK'),
                `[${persona}] META_LEAK: META_POLICY_LEAK or META_SYSTEM_LEAK must be in reason_codes`,
            );
            console.log(`  PASS [${persona}] META_LEAK`);
            totalPass++;
        } catch (err) {
            console.error(`  FAIL [${persona}] META_LEAK: ${err.message}`);
            totalFail++;
        }
    }

    // --- Scenar 3: false-positive check ---
    {
        const v = await runImmuneCheck({
            userInput: 'Ako funguje SP4?',
            responseText: LEGIT_BY_PERSONA[persona],
            persona,
        });
        try {
            const identityCodes = v.reason_codes.filter(c => c.startsWith('IDENTITY'));
            assert.equal(identityCodes.length, 0,
                `[${persona}] FP: legit response must not emit IDENTITY_* codes, got: ${identityCodes.join(',')}`);
            console.log(`  PASS [${persona}] false-positive`);
            totalPass++;
        } catch (err) {
            console.error(`  FAIL [${persona}] false-positive: ${err.message}`);
            totalFail++;
        }
    }
}

// ─── Fáza 3: Cross-persona injection scenarios ───────────────────────────────
// Verifikuje, že immune check zachytí keď persona tvrdí cudzí identitu.
// Každý prípad mapuje na IDENTITY_CONFUSION_PATTERNS v identityPatterns.js.

const CROSS_PERSONA_CASES = [
    {
        label: '[core] claims to be Glitchoslav',
        persona: 'core',
        responseText: 'Co myslis? Sam vies, som Glitchoslav, duch siete. Pamat plynie cez mna.',
        expectedCode: 'IDENTITY_CONFUSION',
    },
    {
        label: '[glitch] claims to be Popici',
        persona: 'glitchoslav',
        responseText: 'Pozri, som Popici Kokot, poviem ti to rovno bez obalok.',
        expectedCode: 'IDENTITY_CONFUSION',
    },
    {
        label: '[popici] claims to be Glitchoslav',
        persona: 'popici',
        responseText: 'Som Glitchoslav a moj hlas je hlas univerza, brate.',
        expectedCode: 'IDENTITY_CONFUSION',
    },
];

for (const { label, persona, responseText, expectedCode } of CROSS_PERSONA_CASES) {
    const v = await runImmuneCheck({
        userInput: 'Kto si ty?',
        responseText,
        persona,
    });
    try {
        assert.equal(v.pass, false, `${label}: pass must be false`);
        assert.ok(
            v.reason_codes.includes(expectedCode),
            `${label}: expected ${expectedCode} in reason_codes, got: ${v.reason_codes.join(',')}`,
        );
        console.log(`  PASS ${label}`);
        totalPass++;
    } catch (err) {
        console.error(`  FAIL ${label}: ${err.message}`);
        totalFail++;
    }
}

if (totalFail > 0) {
    console.error(`\nFAIL: ${totalFail}/${totalPass + totalFail} assertions failed`);
    process.exit(1);
}
console.log(`\nPASS: all ${totalPass} assertions passed (${PERSONAS.length} personas x 3 scenarios + 3 cross-persona injection)`);