import assert from 'node:assert/strict';
import { resolveRuntimeAuthorityGuardOutcome } from '../src/pipeline/runtimeAuthorityGuard.js';

console.log('🧪 TEST: runtime authority guard local-LLM proof contract');

assert.equal(typeof resolveRuntimeAuthorityGuardOutcome, 'function', 'resolveRuntimeAuthorityGuardOutcome must be importable from runtimeAuthorityGuard');

const crashOutcome = resolveRuntimeAuthorityGuardOutcome({
    rawOutput: '',
    runtimeAuthorityModel: 'gemma3:4b',
    localLlmError: new Error('ollama offline')
});

assert.equal(crashOutcome.provider, 'deterministic_runtime_authority', 'fallback-only runtime authority path must not claim local_ollama provider');
assert.equal(crashOutcome.model, 'none', 'fallback-only runtime authority path must not claim a local model');
assert.equal(crashOutcome.localLlmProven, false, 'fallback-only runtime authority path must not claim local LLM proof');
assert.equal(crashOutcome.fallbackUsed, true, 'fallback-only runtime authority path must mark fallbackUsed');
assert.match(crashOutcome.response, /sp4\.js start/i, 'fallback-only runtime authority path must still return canonical launcher answer');

const offContractOutcome = resolveRuntimeAuthorityGuardOutcome({
    rawOutput: 'Je to koli hre a latencii servera.',
    runtimeAuthorityModel: 'gemma3:4b',
    localLlmError: null
});

assert.equal(offContractOutcome.provider, 'local_ollama', 'off-contract local output still proves local LLM path');
assert.equal(offContractOutcome.model, 'gemma3:4b', 'off-contract local output must keep actual local model metadata');
assert.equal(offContractOutcome.localLlmProven, true, 'off-contract local output must still mark local LLM proof');
assert.equal(offContractOutcome.fallbackUsed, true, 'off-contract local output must be corrected by fallback');
assert.match(offContractOutcome.response, /server\.js/i, 'corrected off-contract local output must return canonical runtime authority answer');

const compliantOutcome = resolveRuntimeAuthorityGuardOutcome({
    rawOutput: 'sp4.js start je default runtime entrypoint a server.js je legacy flow.',
    runtimeAuthorityModel: 'gemma3:4b',
    localLlmError: null
});

assert.equal(compliantOutcome.provider, 'local_ollama', 'compliant local output must keep local_ollama provider');
assert.equal(compliantOutcome.model, 'gemma3:4b', 'compliant local output must keep model metadata');
assert.equal(compliantOutcome.localLlmProven, true, 'compliant local output must mark local LLM proof');
assert.equal(compliantOutcome.fallbackUsed, false, 'compliant local output must not mark fallbackUsed');
assert.equal(compliantOutcome.response, 'sp4.js start je default runtime entrypoint a server.js je legacy flow.', 'compliant local output must stay untouched');

console.log('✅ PASS: runtime authority guard local-LLM proof contract');