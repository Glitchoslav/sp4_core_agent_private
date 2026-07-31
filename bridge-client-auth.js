export function getBridgeClientHeaders() {
    const token = String(process.env.BRIDGE_AUTH_TOKEN || '').trim();
    if (!token) {
        throw new Error('SP4 bridge auth is not configured');
    }

    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
    };
}
