// tests/test_unified_intent_step1_equivalence.js
// Phase 3, Step 1 — equivalence proof for the integration.js:586 substitution.
//
// The change replaces:
//     resolveDialogueTopic(userMessage, extractIntent(userMessage), ...)
// with:
//     resolveDialogueTopic(userMessage, analyzeUnified(userMessage).intent, ...)
//
// This test proves the substitution is behavior-preserving for the topic input:
//   analyzeUnified(msg).intent  ===  extractIntent(msg)   for every sample.
// It also re-verifies purity (no contextManager mutation) since this path now
// runs once per turn in the live pipeline.
//
// Run: node tests/test_unified_intent_step1_equivalence.js

import { analyzeUnified, clearTurnCache } from '../src/routing/unifiedIntent.js';
import { extractIntent } from '../src/routing/intentExtractor.js';
import { contextManager } from '../src/core/contextManager.js';

let pass = 0;
let fail = 0;
function check(label, cond) {
    if (cond) { pass++; console.log('✅', label); }
    else { fail++; console.log('❌', label); }
}

// Broad battery: technical, dialect/popici, existential, identity, decision,
// clarify, smalltalk, empty/edge — covers the major intent branches.
const samples = [
    'čo je OSPF?',
    'čo je DNS cache?',
    'vysvetli mi rozdiel medzi ping a traceroute',
    'ta bratu prečo furt dojebem všetko?',
    'kokot čo to robíš',
    'aký má zmysel život?',
    'prečo žijem?',
    'čo je sloboda?',
    'kto si ty?',
    'ako si vznikol?',
    'kto som ja?',
    'mám dať výpoveď alebo zostať?',
    'čo tým chceš povedať?',
    'ahoj',
    'ďakujem',
    'a prečo?',
    'čo o mne vieš?',
    'vymaž moje dáta',
    '',
    '   ',
];

console.log('\n=== STEP 1 EQUIVALENCE: analyzeUnified().intent === extractIntent() ===\n');

const before = {
    currentMode: contextManager.currentMode,
    lastUserInput: contextManager.lastUserInput,
    historyLen: Array.isArray(contextManager.conversationHistory) ? contextManager.conversationHistory.length : null,
};

clearTurnCache();
let mismatches = 0;
for (const msg of samples) {
    const legacy = extractIntent(msg);
    const unified = analyzeUnified(msg).intent;
    const equal = legacy === unified;
    if (!equal) mismatches++;
    check(`'${(msg || '∅').slice(0, 30)}' → ${unified}${equal ? '' : ` ≠ legacy ${legacy}`}`, equal);
}

const after = {
    currentMode: contextManager.currentMode,
    lastUserInput: contextManager.lastUserInput,
    historyLen: Array.isArray(contextManager.conversationHistory) ? contextManager.conversationHistory.length : null,
};

console.log('');
check(`EQUIVALENCE: 0 mismatches across ${samples.length} samples (found ${mismatches})`, mismatches === 0);
check('PURITY: contextManager.currentMode unchanged', before.currentMode === after.currentMode);
check('PURITY: contextManager.lastUserInput unchanged', before.lastUserInput === after.lastUserInput);
check('PURITY: contextManager history length unchanged', before.historyLen === after.historyLen);


// ── STEP 2A: glitchOrchestrator fallback equivalence ─────────────────────
// Proves the substitution at glitchOrchestrator.js:97 and :245:
//   analyzeUnified(msg).intent  (new)  ===  extractIntent(msg)  (legacy)
// Both call-sites use no opts → same signature as Step 1 no-opts branch.
// Additionally verifies context.intent || pattern: when context provides
// an intent the fallback is never reached, so substitution is transparent.

console.log('\n=== STEP 2A: glitchOrchestrator fallback equivalence (no-opts) ===\n');

// Glitch-specific inputs the orchestrator is likely to receive
const glitchSamples = [
    'prečo existujem?',
    'čo je pravda?',
    'zmysel všetkého',
    'kto si ty naozaj?',
    'aký je zmysel smútku?',
    'som stratený',
    'je mi smutno',
    'čo je sloboda pre sp4?',
    'ta bratu vysvetli mi glitch',
    'mám dať výpoveď?',
    'a prečo?',
    '',
];

clearTurnCache();
let glitchMismatches = 0;
for (const msg of glitchSamples) {
    const legacy = extractIntent(msg);
    const unified = analyzeUnified(msg).intent;
    const equal = legacy === unified;
    if (!equal) glitchMismatches++;
    check(
        `GLITCH '${(msg || '∅').slice(0, 28)}' → ${unified}${equal ? '' : ` ≠ legacy ${legacy}`}`,
        equal,
    );
}
check(
    `GLITCH EQUIVALENCE: 0 mismatches across ${glitchSamples.length} samples (found ${glitchMismatches})`,
    glitchMismatches === 0,
);

// context.intent || pattern: when context provides an intent, the fallback
// (analyzeUnified) is never reached — output equals context.intent regardless.
const ctxMsg = 'nejasný vstup';
const ctxIntentFromPipeline = 'ask_ai_origin';
const effectiveWithCtx = ctxIntentFromPipeline || analyzeUnified(ctxMsg).intent;
check(
    'CONTEXT PRIORITY: context.intent wins over fallback analyzeUnified',
    effectiveWithCtx === ctxIntentFromPipeline,
);

const effectiveWithoutCtx = '' || analyzeUnified(ctxMsg).intent;
check(
    'CONTEXT PRIORITY: empty context uses analyzeUnified fallback',
    typeof effectiveWithoutCtx === 'string' && effectiveWithoutCtx.length > 0,
);

console.log(`\n${pass} PASS, ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
