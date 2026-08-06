import assert from 'node:assert/strict';
import { runImmuneCheck } from '../src/immune/outputImmuneCheck.js';

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

const usabilityRegression = await runImmuneCheck({
    userInput: 'fungujeme?',
    responseText: 'Ano, fungujeme. System SP4_CORE je aktivny.',
    persona: 'core',
});

assert.equal(usabilityRegression.pass, true, '"fungujeme?" response must pass the immune check');
assert.ok(
    !usabilityRegression.reason_codes.includes('META_SYSTEM_LEAK'),
    '"fungujeme?" response must not trigger META_SYSTEM_LEAK'
);

console.log('PASS: immune META_SYSTEM_LEAK marker contract');
