import assert from 'node:assert/strict';
import { getBridgeClientHeaders } from '../bridge-client-auth.js';

const previousToken = process.env.BRIDGE_AUTH_TOKEN;

try {
    for (const value of [undefined, '', '   ']) {
        if (value === undefined) delete process.env.BRIDGE_AUTH_TOKEN;
        else process.env.BRIDGE_AUTH_TOKEN = value;

        assert.throws(
            () => getBridgeClientHeaders(),
            /SP4 bridge auth is not configured/,
            'missing or blank client token must fail closed'
        );
    }

    process.env.BRIDGE_AUTH_TOKEN = 'synthetic-bridge-token';
    assert.deepEqual(getBridgeClientHeaders(), {
        'Content-Type': 'application/json',
        Authorization: 'Bearer synthetic-bridge-token'
    });
} finally {
    if (previousToken === undefined) delete process.env.BRIDGE_AUTH_TOKEN;
    else process.env.BRIDGE_AUTH_TOKEN = previousToken;
}

console.log('bridge client auth contract: PASS');
