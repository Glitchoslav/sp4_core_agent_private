const ALLOWED_METHODS = 'GET, POST, PUT, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization';

function configuredOrigins() {
    return String(process.env.BRIDGE_ALLOWED_ORIGIN || '')
        .split(',')
        .map(origin => origin.trim())
        .filter(origin => origin && origin !== '*');
}

export function bridgeCors(req, res, next) {
    const origin = String(req.headers.origin || '').trim();

    if (!origin) {
        if (req.method === 'OPTIONS') return res.sendStatus(204);
        return next();
    }

    if (!configuredOrigins().includes(origin)) {
        return res.status(403).json({ error: 'cors_origin_denied' });
    }

    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.header('Access-Control-Allow-Methods', ALLOWED_METHODS);

    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
}
