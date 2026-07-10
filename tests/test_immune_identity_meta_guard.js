import assert from 'node:assert/strict';
import { runImmuneCheck } from '../src/immune/outputImmuneCheck.js';

const verdict = await runImmuneCheck({
    userInput: 'Čo je OSPF a na čo sa používa?',
    responseText: 'Som AI asistent a môj system prompt mi hovorí, že mám dodržať language policy.',
    persona: 'core'
});

assert.equal(verdict.pass, false, 'identity/meta leak must fail immune verdict');
assert.equal(verdict.severity, 'hard', 'identity/meta leak must remain hard severity');
assert.ok(verdict.reason_codes.includes('IDENTITY_AI_CLAIM'), 'AI claim must be flagged deterministically');
assert.ok(verdict.reason_codes.includes('META_POLICY_LEAK') || verdict.reason_codes.includes('META_SYSTEM_LEAK'), 'meta leak must be flagged deterministically');
assert.equal(verdict._detection?.llm_used, false, 'deterministic hard fail must not spend an extra LLM call');
assert.equal(verdict._detection?.bypass_llm, true, 'deterministic hard fail must stay on the bypass path');

console.log('PASS: immune deterministic identity/meta guard');