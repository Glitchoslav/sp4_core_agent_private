import crypto from 'node:crypto';

function positiveInteger(value, fallback) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function credentialKey(req, scope) {
    const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
    const credential = match ? match[1] : 'missing';
    const digest = crypto.createHash('sha256').update(credential).digest('hex');
    return `${scope}:${digest}`;
}

export function createBridgeRateLimiter({
    scope,
    maxRequestsEnv,
    windowMsEnv,
    defaultMaxRequests,
    defaultWindowMs,
    now = Date.now
}) {
    const windows = new Map();

    return function bridgeRateLimit(req, res, next) {
        const maxRequests = positiveInteger(
            process.env[maxRequestsEnv],
            defaultMaxRequests
        );
        const windowMs = positiveInteger(
            process.env[windowMsEnv],
            defaultWindowMs
        );
        const currentTime = now();
        const key = credentialKey(req, scope);
        let state = windows.get(key);

        if (!state || currentTime >= state.resetAt) {
            state = { count: 0, resetAt: currentTime + windowMs };
            windows.set(key, state);
        }

        if (state.count >= maxRequests) {
            const retryAfterSeconds = Math.max(
                1,
                Math.ceil((state.resetAt - currentTime) / 1000)
            );
            res.header('Retry-After', String(retryAfterSeconds));
            return res.status(429).json({
                error: 'rate_limited',
                scope,
                retryAfterSeconds
            });
        }

        state.count += 1;
        next();
    };
}
