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
    nodeEnv,
    ip = '203.0.113.10',
    authorization,
    forwardedFor
} = {}) {
    const env = {};
    if (token !== undefined) env.BRIDGE_AUTH_TOKEN = token;
    if (nodeEnv !== undefined) env.NODE_ENV = nodeEnv;
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
        headers: {
            ...(authorization ? { authorization } : {}),
            ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {})
        }
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
assert.equal(localhostDefault.statusCode, 401, 'localhost bypass must default to disabled');
assert.equal(localhostDefault.nextCalls, 0);

const productionBypassAttempt = invoke({
    token: 'test-token',
    localhostBypass: 'true',
    nodeEnv: 'production',
    ip: '127.0.0.1'
});
assert.equal(productionBypassAttempt.statusCode, 401);
assert.equal(productionBypassAttempt.nextCalls, 0);

const developmentBypass = invoke({
    token: 'test-token',
    localhostBypass: 'true',
    nodeEnv: 'development',
    ip: '127.0.0.1'
});
assert.equal(developmentBypass.nextCalls, 1, 'explicit DEV localhost bypass must work');

const localhostAuthorized = invoke({
    token: 'test-token',
    ip: '127.0.0.1',
    authorization: 'Bearer test-token'
});
assert.equal(localhostAuthorized.nextCalls, 1);

const spoofedForwardedFor = invoke({
    token: 'test-token',
    localhostBypass: 'true',
    nodeEnv: 'development',
    ip: '203.0.113.10',
    forwardedFor: '127.0.0.1'
});
assert.equal(spoofedForwardedFor.statusCode, 401);
assert.equal(spoofedForwardedFor.nextCalls, 0);

const remoteUnauthorized = invoke({ token: 'test-token' });
assert.equal(remoteUnauthorized.statusCode, 401);
assert.equal(remoteUnauthorized.nextCalls, 0);

const remoteAuthorized = invoke({
    token: 'test-token',
    authorization: 'Bearer test-token'
});
assert.equal(remoteAuthorized.nextCalls, 1);

const apiAuth = "app.use('/api', requireBridgeAuth);";
const apiAuthIndex = source.indexOf(apiAuth);
assert.notEqual(apiAuthIndex, -1, 'default-deny /api auth must exist');

const apiRoutePattern =
    /app\.(?:get|post|put|patch|delete)\('\/api\/[^']*'/g;
const apiRoutes = [...source.matchAll(apiRoutePattern)];
assert.equal(apiRoutes.length, 14, 'all fourteen API routes must be present');
assert.ok(
    apiRoutes.every((match) => match.index > apiAuthIndex),
    'default-deny auth must be registered before every API route'
);
assert.doesNotMatch(
    source,
    /app\.get\('\/health', requireBridgeAuth,/,
    'health must remain public'
);

const corsIndex = source.indexOf('// CORS (iba lokálne; Launcher/DHZ)');
const preflightIndex = source.indexOf("if (req.method === 'OPTIONS')", corsIndex);
assert.ok(corsIndex !== -1 && preflightIndex !== -1);
assert.ok(preflightIndex < apiAuthIndex, 'CORS preflight must run before auth');
assert.match(source, /app\.set\('trust proxy', false\)/);

console.log('bridge auth contract: PASS');
