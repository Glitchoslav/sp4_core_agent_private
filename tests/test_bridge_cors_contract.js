import assert from 'node:assert/strict';
import { bridgeCors } from '../bridge-cors.js';

const previousOrigins = process.env.BRIDGE_ALLOWED_ORIGIN;

function invoke({ configured, origin, method = 'GET', requestedMethod } = {}) {
    if (configured === undefined) delete process.env.BRIDGE_ALLOWED_ORIGIN;
    else process.env.BRIDGE_ALLOWED_ORIGIN = configured;

    let statusCode = null;
    let body = null;
    let nextCalls = 0;
    const headers = {};
    const req = {
        method,
        headers: {
            ...(origin ? { origin } : {}),
            ...(requestedMethod
                ? { 'access-control-request-method': requestedMethod }
                : {})
        }
    };
    const res = {
        header(name, value) {
            headers[name] = value;
            return this;
        },
        status(code) {
            statusCode = code;
            return this;
        },
        json(payload) {
            body = payload;
            return this;
        },
        sendStatus(code) {
            statusCode = code;
            return this;
        }
    };

    bridgeCors(req, res, () => {
        nextCalls += 1;
    });
    return { statusCode, body, nextCalls, headers };
}

try {
    const machineCaller = invoke();
    assert.equal(machineCaller.nextCalls, 1);
    assert.equal(machineCaller.headers['Access-Control-Allow-Origin'], undefined);

    for (const configured of [undefined, '', '*']) {
        const denied = invoke({
            configured,
            origin: 'https://untrusted.example'
        });
        assert.equal(denied.statusCode, 403);
        assert.equal(denied.body?.error, 'cors_origin_denied');
        assert.equal(denied.headers['Access-Control-Allow-Origin'], undefined);
    }

    const configured =
        'http://localhost:9000, http://127.0.0.1:9000';
    const allowed = invoke({
        configured,
        origin: 'http://localhost:9000'
    });
    assert.equal(allowed.nextCalls, 1);
    assert.equal(
        allowed.headers['Access-Control-Allow-Origin'],
        'http://localhost:9000'
    );
    assert.equal(
        allowed.headers['Access-Control-Allow-Methods'],
        'GET, POST, PUT, OPTIONS'
    );
    assert.equal(
        allowed.headers['Access-Control-Allow-Headers'],
        'Content-Type, Authorization'
    );
    assert.equal(allowed.headers['Access-Control-Allow-Credentials'], undefined);

    for (const requestedMethod of ['GET', 'POST', 'PUT']) {
        const preflight = invoke({
            configured,
            origin: 'http://127.0.0.1:9000',
            method: 'OPTIONS',
            requestedMethod
        });
        assert.equal(preflight.statusCode, 204, requestedMethod);
        assert.equal(
            preflight.headers['Access-Control-Allow-Methods'],
            'GET, POST, PUT, OPTIONS'
        );
    }

    const disallowed = invoke({
        configured,
        origin: 'http://localhost:3000'
    });
    assert.equal(disallowed.statusCode, 403);
    assert.equal(disallowed.nextCalls, 0);
} finally {
    if (previousOrigins === undefined) delete process.env.BRIDGE_ALLOWED_ORIGIN;
    else process.env.BRIDGE_ALLOWED_ORIGIN = previousOrigins;
}

console.log('bridge CORS contract: PASS');
