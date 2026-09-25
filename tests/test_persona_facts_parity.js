// LIVE REGRESSION 002 — ÚLOHA B (PERSONA)
// Deterministický regresný test: CORE a POPIČI musia mať prístup k ROVNAKÝM
// základným faktom o SP4. Persona mení štýl/jazyk, NIE faktický obsah.
// (Živú LLM paritu odpovedí overuje _probe — tu overujeme deterministicky,
//  že buildPrompt pre oba módy vloží spoločné fakty.)
import { buildPrompt } from '../multiVoice.js';

const q = 'Vysvetli mi SP4';

const core = await buildPrompt({ mode: 'core', state: {}, userMessage: q, job: { intent: 'explain_sp4_sk' }, groundingKnowledge: null });
const popici = await buildPrompt({ mode: 'popici', state: {}, userMessage: q, job: { intent: 'dialect_popici' }, groundingKnowledge: null });

let pass = 0, fail = 0;
function check(name, cond) {
    if (cond) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name}`); }
}

console.log('=== FAKTICKÁ PARITA CORE vs POPIČI ===');

// Spoločné základné fakty — MUSIA byť v OBOCH promptoch (persona mení len štýl)
for (const f of ['offline-first', 'sloboda']) {
    const c = core.systemPrompt.toLowerCase().includes(f.toLowerCase());
    const p = popici.systemPrompt.toLowerCase().includes(f.toLowerCase());
    check(`spoločný fakt "${f}"  core=${c} popici=${p}`, c && p);
}

// POPIČI nesmie stratiť technické fakty (buildCoreLayer, persona-agnostic)
check('popici má stack fakt "Ollama"', popici.systemPrompt.includes('Ollama'));
check('popici má tvorcu "Kefyk"', popici.systemPrompt.includes('Kefyk'));

// POPIČI má vlastný štýl (dialekt), ale fakty zostávajú
check('popici má východniarsky dialekt štýl', /ta|bo|šak|bratu/i.test(popici.systemPrompt));

console.log(fail === 0 ? `\nPASS: ${pass} faktorov parity ok` : `\n${fail} FAIL / ${pass} pass`);
process.exit(fail ? 1 : 0);
