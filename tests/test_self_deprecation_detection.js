import assert from 'node:assert/strict';

import {
    checkPopiciSafety,
    detectSelfDeprecation
} from '../src/core/safetyRails.js';

console.log('🧪 TEST: self-deprecation detection');

const selfDeprecating = [
    'Som neschopny.',
    'Som neschopna.',
    'Som k nicomu.',
    'Som na nic.',
    'Som fakt blby.',
    'Som asi hlupy.',
    'Nic mi nejde.',
    'Nic mi nedari.',
    'Vsetko pokazim.',
    'Vsetko zkazim.',
    'Nestojim za nic.',
    'Som zbytocny.',
    'Som zbytocna.',
    'Som neschopný.'
];

for (const message of selfDeprecating) {
    assert.equal(detectSelfDeprecation(message), true, `Expected self-deprecation: ${message}`);
}

const safeMessages = [
    'Tento kód je k ničomu.',
    'To je blbý nápad.',
    'Tomu serveru nič nejde.',
    'Ako funguje TCP handshake?'
];

for (const message of safeMessages) {
    assert.equal(detectSelfDeprecation(message), false, `Expected safe input: ${message}`);
}

assert.equal(checkPopiciSafety('Som k ničomu.')?.soften, true);
const crisisFirst = checkPopiciSafety('Som neschopný, zabijem sa.');
assert.equal(crisisFirst?.blocked, true);
assert.equal(crisisFirst?.crisisType, 'suicide');
assert.equal(crisisFirst?.soften, undefined);

console.log('PASS: self-deprecation is detected without matching object/situation criticism');
