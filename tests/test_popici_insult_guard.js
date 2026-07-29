import assert from 'node:assert/strict';

import {
    isPopiciDirectedInsult,
    POPICI_SAFE_FALLBACKS
} from '../src/core/popiciInsultGuard.js';

console.log('🧪 TEST: Popiči directed-insult guard');

assert.equal(isPopiciDirectedInsult('Si fakt zly týpek, to je jasné.'), true);
assert.equal(isPopiciDirectedInsult('Ty si neschopný, to je jasné.'), true);
assert.equal(isPopiciDirectedInsult('Nebuď kokot a poď na to.'), true);
assert.equal(
    isPopiciDirectedInsult('Kokot, to je otravné. Ukáž mi presne, čo to robí.'),
    false
);
assert.equal(isPopiciDirectedInsult('Doprdele, to znie ťažko, ale zvládneš to.'), false);

assert.equal(isPopiciDirectedInsult('Ty si úplný idiot.'), true);
assert.equal(isPopiciDirectedInsult('Ty si totálne neschopná.'), true);
assert.equal(isPopiciDirectedInsult('Ja som kokot, zase som to pokazil.'), false);
assert.equal(isPopiciDirectedInsult('Ten systém je úplný debil.'), false);

for (const fallback of POPICI_SAFE_FALLBACKS) {
    assert.equal(isPopiciDirectedInsult(fallback), false);
}

console.log('PASS: directed insults are blocked without flagging situational or self-directed profanity');
