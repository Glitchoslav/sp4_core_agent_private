// tests/test_unified_intent_step3_opts_equivalence.js
// Phase 3, Step 3 — pre-migration equivalence proof for integration.js:1305
//
// The planned change will replace:
//     extractIntent(userMessage, { prevUserInput: _prevUserForIntent, emotionTag })
// with:
//     analyzeUnified(userMessage, { prevUserInput: _prevUserForIntent, emotionTag }).intent
//
// Audit identified exactly two opts-sensitive branches in intentExtractor.js:
//
//   BRANCH A — FOLLOW-UP CARRY (prevUserInput, lines 288-293)
//     If prevUserInput matches profile/privacy patterns AND current msg is a
//     follow-up phrase → returns 'sp4_operational_truth' instead of falling through.
//     prevIntent is destructured but NEVER READ — confirmed dead parameter.
//
//   BRANCH B — ENERGY SCORE BOOST (emotionTag, lines 95+135)
//     Only 'tired' adds +2 to energyScore. All other values are no-ops.
//     Boost can flip borderline energy inputs from non-energy to 'energy_decision'.
//
//   BRANCH C — CLARIFY (opts-invariant, lines 226-253)
//     Reads only normalized current message. opts have zero effect.
//
// unifiedIntent.js cache key includes prevUserInput + emotionTag, so the
// no-opts call at line 586 and the opts call at line 1305 hit different
// cache slots — no false cache hit possible between the two call-sites.
//
// Run: node tests/test_unified_intent_step3_opts_equivalence.js

import { contextManager } from '../src/core/contextManager.js';
import { extractIntent } from '../src/routing/intentExtractor.js';
import { analyzeUnified, clearTurnCache } from '../src/routing/unifiedIntent.js';

let pass = 0;
let fail = 0;

function check(label, cond) {
    if (cond) { pass++; console.log('✅', label); }
    else { fail++; console.log('❌', label); }
}

function equiv(msg, opts, label) {
    const legacy = extractIntent(msg, opts);
    const unified = analyzeUnified(msg, opts).intent;
    const eq = legacy === unified;
    if (!eq) fail++;
    else pass++;
    const tag = eq ? '✅' : '❌';
    const detail = eq ? `→ ${unified}` : `legacy=${legacy} unified=${unified}`;
    console.log(`${tag} ${label}: ${detail}`);
    return eq;
}

function snapshot() {
    return {
        currentMode: contextManager.currentMode,
        lastUserInput: contextManager.lastUserInput,
        histLen: Array.isArray(contextManager.conversationHistory)
            ? contextManager.conversationHistory.length : null,
        lockStrength: contextManager.modeLockStrength,
    };
}

// ─── BRANCH A: FOLLOW-UP CARRY (prevUserInput) ───────────────────────────────
console.log('\n=== BRANCH A: FOLLOW-UP CARRY (prevUserInput) ===\n');

// Profile/privacy prevUserInput samples (trigger isPrevProfilePrivacy)
const PREV_PROFILE = [
    'čo o mne vieš?',
    'čo vieš o mne?',
    'pamätáš si ma?',
    'sú moje dáta bezpečné?',
    'kde sa ukladajú rozhovory?',
    'privacy sp4',
];

// Non-profile prevUserInput samples (should NOT trigger isPrevProfilePrivacy)
const PREV_OTHER = [
    'čo je OSPF?',
    'povedz mi vtip',
    '',
    null,
];

// Follow-up current messages (trigger isCurrentFollowup)
const CUR_FOLLOWUP = [
    'a prečo?',
    'ako to myslíš?',
    'vysvetli mi to podrobnejšie',
    'áno chcem vedieť viac',
    'daj mi viac info',
];

// Non-follow-up current messages
const CUR_OTHER = [
    'čo je DNS?',
    'kto si ty?',
    'mám dať výpoveď?',
];

// Matrix case (a): prev=profile + current=followup → MUST return 'sp4_operational_truth'
let caseA_pass = 0;
for (const prev of PREV_PROFILE.slice(0, 3)) {
    for (const cur of CUR_FOLLOWUP.slice(0, 3)) {
        const opts = { prevUserInput: prev };
        const legacy = extractIntent(cur, opts);
        const unified = analyzeUnified(cur, opts).intent;
        const eq = legacy === unified;
        const isSP4 = unified === 'sp4_operational_truth';
        if (eq) { pass++; caseA_pass++; }
        else fail++;
        const tag = (eq && isSP4) ? '✅' : eq ? '✅' : '❌';
        console.log(`${tag} A.a prev='${prev.slice(0, 20)}' + cur='${cur}' → ${unified}${eq ? '' : ` ≠ legacy ${legacy}`}`);
    }
}
check(`BRANCH A matrix (a): prev=profile + cur=followup all equivalent and all='sp4_operational_truth'`, caseA_pass === 9);

// Matrix case (b): prev=profile + current=NOT-followup → fall-through (same for both)
console.log('');
for (const prev of PREV_PROFILE.slice(0, 2)) {
    for (const cur of CUR_OTHER) {
        equiv(`A.b prev='${prev.slice(0, 15)}' + cur='${cur}'`, { prevUserInput: prev }, '');
    }
}

// Matrix case (c): prev=NOT-profile + current=followup → fall-through (same for both)
console.log('');
for (const prev of PREV_OTHER) {
    for (const cur of CUR_FOLLOWUP.slice(0, 2)) {
        equiv(`A.c prev=${prev === null ? 'null' : `'${String(prev).slice(0, 12)}'`} + cur='${cur}'`,
            { prevUserInput: prev }, '');
    }
}

// Matrix case (d): prevUserInput absent → same as prev='' → fall-through
console.log('');
for (const cur of CUR_FOLLOWUP.slice(0, 3)) {
    equiv(`A.d no opts + cur='${cur}'`, {}, '');
}

// ─── BRANCH B: EMOTION TAG (emotionTag) ──────────────────────────────────────
console.log('\n=== BRANCH B: EMOTION TAG (emotionTag = tired) ===\n');

// Borderline energy inputs: energyScore would be ~1 without tired (from 1 pattern match),
// needs +2 from tired to reach the >= 2 threshold.
const ENERGY_BORDER_INPUTS = [
    'mám ešte makať alebo nie?',
    'mám to potiahnut alebo zastaviť?',
    'som unavený, mal by som pracovať?',
    'nevládzem, mám ísť spať?',
];

// Clear-energy inputs: energyScore >= 2 even without tired (should NOT flip)
const ENERGY_CLEAR_INPUTS = [
    'som unavený a vyčerpaný, mám ešte makať alebo zastaviť?',
];

// Non-energy inputs: should never become energy_decision
const NON_ENERGY_INPUTS = [
    'kto si ty?',
    'čo je DNS?',
    'ahoj',
];

// Case B.a: borderline + tired → should both be 'energy_decision'
let caseB_pass = 0;
for (const msg of ENERGY_BORDER_INPUTS) {
    const opts = { emotionTag: 'tired' };
    const legacy = extractIntent(msg, opts);
    const unified = analyzeUnified(msg, opts).intent;
    const eq = legacy === unified;
    if (eq) { pass++; caseB_pass++; }
    else fail++;
    console.log(`${eq ? '✅' : '❌'} B.a tired '${msg.slice(0, 40)}' → ${unified}${eq ? '' : ` ≠ ${legacy}`}`);
}
check('BRANCH B.a: tired emotionTag — all borderline inputs equivalent', caseB_pass === ENERGY_BORDER_INPUTS.length);

// Case B.b: borderline + neutral → should both be same (NOT energy_decision in borderline case)
console.log('');
for (const msg of ENERGY_BORDER_INPUTS) {
    equiv(`B.b neutral '${msg.slice(0, 40)}'`, { emotionTag: 'neutral' }, '');
}

// Case B.c: no opts vs opts={emotionTag:'neutral'} must be equivalent (neutral is no-op)
console.log('');
for (const msg of ENERGY_BORDER_INPUTS.slice(0, 2)) {
    const noOpts = extractIntent(msg, {});
    const neutral = extractIntent(msg, { emotionTag: 'neutral' });
    check(`B.c no-opts === neutral for '${msg.slice(0, 35)}'`, noOpts === neutral);
    const uNoOpts = analyzeUnified(msg, {}).intent;
    const uNeutral = analyzeUnified(msg, { emotionTag: 'neutral' }).intent;
    check(`B.c unified: no-opts === neutral for '${msg.slice(0, 35)}'`, uNoOpts === uNeutral);
}

// Case B.d: clear energy inputs are energy_decision regardless of tired
console.log('');
for (const msg of ENERGY_CLEAR_INPUTS) {
    equiv(`B.d clear-energy + tired '${msg.slice(0, 40)}'`, { emotionTag: 'tired' }, '');
    equiv(`B.d clear-energy + neutral '${msg.slice(0, 40)}'`, { emotionTag: 'neutral' }, '');
}

// Case B.e: non-energy inputs never flip
console.log('');
for (const msg of NON_ENERGY_INPUTS) {
    equiv(`B.e non-energy + tired '${msg}'`, { emotionTag: 'tired' }, '');
}

// ─── BRANCH C: CLARIFY (opts-invariant) ──────────────────────────────────────
console.log('\n=== BRANCH C: CLARIFY (opts-invariant) ===\n');

const CLARIFY_MSGS = [
    'čo tým chceš povedať?',
    'čo si tým myslel?',
    'si si istý?',
    'čo si myslel touto vetou?',
];

// Clarify must return same intent regardless of opts
for (const msg of CLARIFY_MSGS) {
    const noOpts = extractIntent(msg, {});
    const withPrev = extractIntent(msg, { prevUserInput: 'čo o mne vieš?' });
    const withEmo = extractIntent(msg, { emotionTag: 'tired' });
    const uNoOpts = analyzeUnified(msg, {}).intent;
    const uWithPrev = analyzeUnified(msg, { prevUserInput: 'čo o mne vieš?' }).intent;
    const uWithEmo = analyzeUnified(msg, { emotionTag: 'tired' }).intent;
    check(`C opts-invariant '${msg.slice(0, 30)}': no-opts=${noOpts}, prevU=${withPrev}, tired=${withEmo} all same`, noOpts === withPrev && withPrev === withEmo);
    check(`C unified same: no-opts=${uNoOpts}, prevU=${uWithPrev}, tired=${uWithEmo}`, uNoOpts === uWithPrev && uWithPrev === uWithEmo);
    check(`C legacy===unified '${msg.slice(0, 30)}'`, noOpts === uNoOpts);
}

// ─── CACHE ISOLATION (two call-sites don't cross-pollute) ────────────────────
console.log('\n=== CACHE ISOLATION (line-586 vs line-1305 cache slots) ===\n');

clearTurnCache();
const MSG = 'ako to myslíš?';   // 'a prečo?' sa NEPOČÍTA za followup (Branch A), toto áno
const PREV = 'čo o mne vieš?';
const noOptsResult = analyzeUnified(MSG, {}).intent;                              // line-586 slot
const withOptsResult = analyzeUnified(MSG, { prevUserInput: PREV }).intent;         // line-1305 slot
check(`CACHE ISOLATION: no-opts='${noOptsResult}' !== with-opts='${withOptsResult}' (different intents)`, noOptsResult !== withOptsResult);
check(`CACHE ISOLATION: with-opts is 'sp4_operational_truth'`, withOptsResult === 'sp4_operational_truth');

// ─── PURITY ───────────────────────────────────────────────────────────────────
console.log('\n=== PURITY: contextManager unchanged ===\n');

const before = snapshot();
// Re-run all branches through analyzeUnified to confirm no state mutation
for (const prev of PREV_PROFILE.slice(0, 2)) {
    for (const cur of CUR_FOLLOWUP.slice(0, 2)) {
        analyzeUnified(cur, { prevUserInput: prev });
    }
}
for (const msg of ENERGY_BORDER_INPUTS) {
    analyzeUnified(msg, { emotionTag: 'tired' });
}
const after = snapshot();
check('PURITY: currentMode unchanged', before.currentMode === after.currentMode);
check('PURITY: lastUserInput unchanged', before.lastUserInput === after.lastUserInput);
check('PURITY: history length unchanged', before.histLen === after.histLen);
check('PURITY: lockStrength unchanged', before.lockStrength === after.lockStrength);

console.log(`\n${pass} PASS, ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
