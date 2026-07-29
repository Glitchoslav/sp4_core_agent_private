import assert from 'node:assert/strict';

import { getRelevantKb } from '../src/core/kb-provider.js';

function hasTerm(facts, term) {
    return facts.some((fact) => String(fact.term || '').toLowerCase() === term.toLowerCase());
}

const coreGlitchoslavFacts = getRelevantKb('Glitchoslav?', 'core', 5);
assert.equal(
    hasTerm(coreGlitchoslavFacts, 'GLITCHOSLAV'),
    false,
    'core must not receive the glitchoslav self-identity fact'
);

const glitchoslavSelfFacts = getRelevantKb('Glitchoslav?', 'GLITCHOSLAV', 5);
assert.equal(
    hasTerm(glitchoslavSelfFacts, 'GLITCHOSLAV'),
    true,
    'glitchoslav must be allowed to receive its own self-identity fact'
);

for (const personaKey of [undefined, 'hasic']) {
    const unrelatedPersonaFacts = getRelevantKb('Glitchoslav?', personaKey, 5);
    assert.equal(
        hasTerm(unrelatedPersonaFacts, 'GLITCHOSLAV'),
        false,
        `${String(personaKey)} must not receive the glitchoslav self-identity fact`
    );
}

const neutralPersonaOverviewFacts = getRelevantKb('aky mate persony?', 'core', 5);
assert.equal(
    hasTerm(neutralPersonaOverviewFacts, 'SP4 persony / runtime roly'),
    true,
    'neutral all-persona overview must remain available to core'
);

const glitchoslavPopiciFacts = getRelevantKb('Popici?', 'glitchoslav', 5);
assert.equal(
    hasTerm(glitchoslavPopiciFacts, 'POPIČI'),
    false,
    'glitchoslav must not receive the popici self-identity fact'
);

console.log('PASS: KB persona identity facts stay within their matching persona');
