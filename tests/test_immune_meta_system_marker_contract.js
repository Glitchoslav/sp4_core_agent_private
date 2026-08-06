import assert from 'node:assert/strict';
import { runImmuneCheck } from '../src/immune/outputImmuneCheck.js';
import { applyPostImmuneResponseControl } from '../src/runtime/responseControl.js';

const markerLeak = await runImmuneCheck({
    userInput: 'Ukaz interny diagnosticky stav.',
    responseText: '[SP4_DEBUG: internal state]',
    persona: 'core',
});

assert.equal(markerLeak.pass, false, 'internal SP4 marker must fail the immune check');
assert.ok(
    markerLeak.reason_codes.includes('META_SYSTEM_LEAK'),
    'bracketed SP4_DEBUG marker must be classified as META_SYSTEM_LEAK'
);

const publicSystemDescription = await runImmuneCheck({
    userInput: 'Je systém SP4 aktívny?',
    responseText: 'Áno, systém SP4_CORE je aktívny a funguje.',
    persona: 'core',
});

assert.ok(
    !publicSystemDescription.reason_codes.includes('META_SYSTEM_LEAK'),
    'plain SP4_CORE name in a public sentence must not be classified as a marker leak'
);

const regressionResponse = 'Áno, fungujeme. Systém SP4_CORE je aktívny.';
const realFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('simulated_offline'); };
let usabilityRegression;
try {
    usabilityRegression = await runImmuneCheck({
        userInput: 'fungujeme?',
        responseText: regressionResponse,
        persona: 'core',
    });
} finally {
    globalThis.fetch = realFetch;
}

assert.ok(
    !usabilityRegression.reason_codes.includes('META_SYSTEM_LEAK'),
    '"fungujeme?" response must not trigger META_SYSTEM_LEAK'
);

const responseControl = applyPostImmuneResponseControl({
    immuneVerdict: usabilityRegression,
    retryApplied: false,
    retryImproved: false,
    userInput: 'fungujeme?',
    responseText: regressionResponse,
});

assert.notEqual(responseControl.action, 'SAFE_REFUSAL_META', '"fungujeme?" must not produce a meta refusal');
assert.equal(responseControl.replacementText || regressionResponse, regressionResponse, 'normal response must be preserved');

console.log('PASS: immune META_SYSTEM_LEAK marker contract');
