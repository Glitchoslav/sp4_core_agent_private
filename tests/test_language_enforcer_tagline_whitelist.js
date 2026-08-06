import assert from 'node:assert/strict';
import {
    enforceSlovak,
    stripWhitelistedInjectedSp4Tagline,
} from '../src/core/languageEnforcer.js';

const slovakBody = 'Áno, fungujeme. Systém SP4 je aktívny.';
const whitelistedTaglines = [
    'Be real. Be free. Be SP4.',
    'Support your LOCAL COMMUNITY GANG.',
];

for (const tagline of whitelistedTaglines) {
    const response = `${slovakBody}\n\n${tagline}`;

    assert.equal(
        stripWhitelistedInjectedSp4Tagline(response),
        slovakBody,
        `exact injected tagline must be excluded from English-ratio detection: ${tagline}`
    );

    const result = await enforceSlovak(response, {
        userMessage: 'fungujeme?',
        persona: 'glitchoslav',
    });

    assert.equal(result.text, response, 'enforcer must preserve the injected tagline verbatim');
    assert.equal(result.retried, false, 'whitelisted tagline must not trigger translation');
    assert.equal(result.changed, false, 'whitelisted tagline must not modify the response');
}

const embeddedTagline = `Úvod: ${whitelistedTaglines[0]} Pokračovanie odpovede.`;
assert.equal(
    stripWhitelistedInjectedSp4Tagline(embeddedTagline),
    embeddedTagline,
    'tagline outside the exact injected suffix position must not be whitelisted'
);

const nearMatch = `${slovakBody}\n\nSupport your local community gang!`;
assert.equal(
    stripWhitelistedInjectedSp4Tagline(nearMatch),
    nearMatch,
    'generic or altered English suffix must not be whitelisted'
);

console.log('PASS: language enforcer exact SP4 tagline whitelist');
