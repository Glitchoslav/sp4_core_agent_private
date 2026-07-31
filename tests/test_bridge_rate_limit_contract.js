import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBridgeRateLimiter } from '../bridge-rate-limit.js';

const previousMax = process.env.TEST_BRIDGE_RATE_MAX;
const previousWindow = process.env.TEST_BRIDGE_RATE_WINDOW_MS;
process.env.TEST_BRIDGE_RATE_MAX = '2';
process.env.TEST_BRIDGE_RATE_WINDOW_MS = '1000';

let currentTime = 10_000;
const limiter = createBridgeRateLimiter({
    scope: 'test-inference',
    maxRequestsEnv: 'TEST_BRIDGE_RATE_MAX',
    windowMsEnv: 'TEST_BRIDGE_RATE_WINDOW_MS',
    defaultMaxRequests: 99,
    defaultWindowMs: 99_000,
    now: () => currentTime
});

function invoke({
    authorization = 'Bearer synthetic-rate-token',
    body = { text: 'must-not-leak' }
} = {}) {
    let statusCode = null;
    let responseBody = null;
    let nextCalls = 0;
    const headers = {};
    const req = { headers: { authorization }, body };
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
            responseBody = payload;
            return this;
        }
    };

    limiter(req, res, () => {
        nextCalls += 1;
    });
    return { statusCode, responseBody, nextCalls, headers };
}

try {
    assert.equal(invoke().nextCalls, 1);
    assert.equal(invoke().nextCalls, 1);

    const limited = invoke();
    assert.equal(limited.statusCode, 429);
    assert.equal(limited.nextCalls, 0);
    assert.equal(limited.responseBody?.error, 'rate_limited');
    assert.equal(limited.responseBody?.scope, 'test-inference');
    assert.equal(limited.headers['Retry-After'], '1');
    assert.doesNotMatch(JSON.stringify(limited.responseBody), /synthetic-rate-token/);
    assert.doesNotMatch(JSON.stringify(limited.responseBody), /must-not-leak/);

    currentTime += 1000;
    assert.equal(invoke().nextCalls, 1, 'new window must reset the bucket');

    const otherCredential = invoke({
        authorization: 'Bearer synthetic-other-token'
    });
    assert.equal(otherCredential.nextCalls, 1, 'credentials must have separate buckets');

    const source = readFileSync(new URL('../bridge-server.js', import.meta.url), 'utf8');
    assert.match(source, /app\.post\('\/api\/bridge\/ask', inferenceRateLimit,/);
    assert.match(source, /app\.post\('\/api\/member\/purge', purgeRateLimit,/);
    assert.match(source, /app\.put\('\/api\/member\/:id\/consent', writeRateLimit,/);
    assert.match(source, /app\.post\('\/api\/member\/:id\/note', writeRateLimit,/);
    assert.match(source, /app\.post\('\/api\/collective\/tip', writeRateLimit,/);
    assert.match(source, /app\.post\('\/api\/glossary', writeRateLimit,/);
} finally {
    if (previousMax === undefined) delete process.env.TEST_BRIDGE_RATE_MAX;
    else process.env.TEST_BRIDGE_RATE_MAX = previousMax;
    if (previousWindow === undefined) delete process.env.TEST_BRIDGE_RATE_WINDOW_MS;
    else process.env.TEST_BRIDGE_RATE_WINDOW_MS = previousWindow;
}

console.log('bridge rate limit contract: PASS');
