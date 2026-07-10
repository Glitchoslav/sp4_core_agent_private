// tests/test_unified_intent_shadow.js
// SHADOW smoke test for src/routing/unifiedIntent.js (Phase 3, Step 0).
//
// Proves the Step 0 safety claims WITHOUT touching the runtime pipeline:
//   1. PURITY  — analyzeUnified() does NOT mutate contextManager state.
//   2. CACHE   — repeat call for the same turn returns a stable reference.
//   3. SHADOW  — shadowCompare() is null on match, reports a diff on mismatch.
//   4. CONTRAST — resolveMode() (authority passthrough) DOES mutate state,
//                 confirming the analyze/resolve split is real.
//
// Run: node tests/test_unified_intent_shadow.js

import {
    analyzeUnified,
    resolveMode,
    shadowCompare,
    clearTurnCache,
} from '../src/routing/unifiedIntent.js';
import { contextManager } from '../src/core/contextManager.js';
import { extractIntent } from '../src/routing/intentExtractor.js';

let pass = 0;
let fail = 0;
function check(label, cond) {
    if (cond) { pass++; console.log('✅', label); }
    else { fail++; console.log('❌', label); }
}

function snapshot() {
    return {
        currentMode: contextManager.currentMode,
        lastUserInput: contextManager.lastUserInput,
        historyLen: Array.isArray(contextManager.conversationHistory)
            ? contextManager.conversationHistory.length
            : null,
        lockStrength: contextManager.modeLockStrength,
    };
}

const samples = [
    'čo je OSPF?',
    'ta bratu prečo furt dojebem všetko?',
    'aký má zmysel život?',
    'kto si ty?',
    'mám dat výpoveď alebo zostať?',
];

console.log('\n=== UNIFIED INTENT SHADOW SMOKE TEST (Phase 3, Step 0) ===\n');

// ── 1. PURITY ────────────────────────────────────────────────────────────
const before = snapshot();
const results = [];
for (const s of samples) {
    const r = analyzeUnified(s);
    results.push(r);
    check(
        `analyzeUnified('${s.slice(0, 28)}…') → intent=${r.intent}, modeHint=${r.modeHint}, topic=${r.topic}`,
        typeof r.intent === 'string' && typeof r.modeHint === 'string'
    );
}
const after = snapshot();

check(`PURITY: currentMode unchanged (${String(before.currentMode)} === ${String(after.currentMode)})`,
    before.currentMode === after.currentMode);
check(`PURITY: lastUserInput unchanged (${String(before.lastUserInput)} === ${String(after.lastUserInput)})`,
    before.lastUserInput === after.lastUserInput);
check(`PURITY: conversationHistory length unchanged (${String(before.historyLen)} === ${String(after.historyLen)})`,
    before.historyLen === after.historyLen);
check(`PURITY: modeLockStrength unchanged (${String(before.lockStrength)} === ${String(after.lockStrength)})`,
    before.lockStrength === after.lockStrength);

// ── 2. CACHE ─────────────────────────────────────────────────────────────
clearTurnCache();
const a = analyzeUnified('čo je DNS cache?');
const b = analyzeUnified('čo je DNS cache?');
check('CACHE: same reference returned on repeat call', a === b);

// ── 3. SHADOW COMPARE ────────────────────────────────────────────────────
const msg = 'čo je TCP?';
const legacyIntent = extractIntent(msg);
const legacyHint = analyzeUnified(msg).modeHint;
const noDiff = shadowCompare(msg, {}, legacyIntent, legacyHint);
check('SHADOW: null when legacy intent + modeHint match', noDiff === null);

const withDiff = shadowCompare(msg, {}, 'totally_wrong_intent');
check('SHADOW: diff reported when legacy intent differs', !!withDiff && !!withDiff.intent);

// ── 4. CONTRAST: resolveMode DOES mutate (proves split is real) ──────────
const beforeResolve = snapshot();
resolveMode('ta bratu kokot čo je?', true, true); // authority path, side-effects ON
const afterResolve = snapshot();
const stateChanged =
    beforeResolve.currentMode !== afterResolve.currentMode ||
    beforeResolve.lastUserInput !== afterResolve.lastUserInput ||
    beforeResolve.historyLen !== afterResolve.historyLen;
check('CONTRAST: resolveMode() DID mutate contextManager (authority path has side-effects)', stateChanged);

console.log(`\n${pass} PASS, ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
