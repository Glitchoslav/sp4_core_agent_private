import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../bridge-server.js', import.meta.url), 'utf8');
const functionStart = source.indexOf('function requireBridgeAuth');
const functionEnd = source.indexOf('const app = express();', functionStart);

assert.notEqual(functionStart, -1, 'requireBridgeAuth must exist');
assert.notEqual(functionEnd, -1, 'requireBridgeAuth boundary must remain detectable');

const sandbox = {
    process: { env: {} },
    requireBridgeAuth: null
};
const functionSource = source.slice(functionStart, functionEnd);
vm.runInNewContext(
    `${functionSource}\nthis.requireBridgeAuth = requireBridgeAuth;`,
    sandbox
);

function invoke({
    token,
    localhostBypass,
    ip = '203.0.113.10',
    authorization
} = {}) {
    const env = {};
    if (token !== undefined) env.BRIDGE_AUTH_TOKEN = token;
    if (localhostBypass !== undefined) {
        env.BRIDGE_ALLOW_LOCALHOST_BYPASS = localhostBypass;
    }
    sandbox.process.env = env;

    let nextCalls = 0;
    let statusCode = null;
    let body = null;
    const req = {
        ip,
        socket: { remoteAddress: ip },
        headers: authorization ? { authorization } : {}
    };
    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(payload) {
            body = payload;
            return this;
        }
    };

    sandbox.requireBridgeAuth(req, res, () => {
        nextCalls += 1;
    });

    return { nextCalls, statusCode, body };
}

for (const token of [undefined, '', '   ']) {
    const result = invoke({ token });
    assert.equal(result.statusCode, 503, 'missing or blank token must return 503');
    assert.equal(result.nextCalls, 0, 'missing or blank token must never call next');
    assert.equal(result.body?.error, 'bridge_auth_misconfigured');
    assert.match(result.body?.message || '', /BRIDGE_AUTH_TOKEN not set/);
}

const localhostDefault = invoke({ token: 'test-token', ip: '127.0.0.1' });
assert.equal(localhostDefault.nextCalls, 1, 'localhost bypass defaults to enabled');

const localhostProtected = invoke({
    token: 'test-token',
    localhostBypass: 'false',
    ip: '127.0.0.1'
});
assert.equal(localhostProtected.statusCode, 401);
assert.equal(localhostProtected.nextCalls, 0);

const localhostAuthorized = invoke({
    token: 'test-token',
    localhostBypass: 'false',
    ip: '127.0.0.1',
    authorization: 'Bearer test-token'
});
assert.equal(localhostAuthorized.nextCalls, 1);

const remoteUnauthorized = invoke({ token: 'test-token' });
assert.equal(remoteUnauthorized.statusCode, 401);
assert.equal(remoteUnauthorized.nextCalls, 0);

const remoteAuthorized = invoke({
    token: 'test-token',
    authorization: 'Bearer test-token'
});
assert.equal(remoteAuthorized.nextCalls, 1);

const prefixAuth =
    "app.use(['/api/member', '/api/collective'], requireBridgeAuth);";
const prefixAuthIndex = source.indexOf(prefixAuth);
assert.notEqual(prefixAuthIndex, -1, 'member and collective prefix auth must exist');

const protectedRoutePattern =
    /app\.(?:get|post|delete)\('\/api\/(?:member|collective)[^']*'/g;
const protectedRoutes = [...source.matchAll(protectedRoutePattern)];
assert.equal(protectedRoutes.length, 9, 'all nine member/collective routes must be present');
assert.ok(
    protectedRoutes.every((match) => match.index > prefixAuthIndex),
    'prefix auth must be registered before every member/collective route'
);
assert.match(
    source,
    /app\.post\('\/api\/bridge\/ask', requireBridgeAuth,/,
    'bridge ask must retain explicit auth middleware'
);

console.log('bridge auth contract: PASS');
