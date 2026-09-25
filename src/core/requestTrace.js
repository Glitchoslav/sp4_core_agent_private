// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: requestTrace               │
// │  Layer: Core / Observability               │
// │  Role: requestId naprieč legacy + src      │
// │  Mission: T7 strangler Phase 0             │
// └─────────────────────────────────────────────┘

/**
 * requestId sa nastaví na vstupe (bridge-server, integration.processMessage) a cez
 * AsyncLocalStorage prúdi do všetkých async volaní — bez zmeny signatúr v monolite.
 *
 * traceLayer() emituje { requestId, layer: 'legacy'|'src', at, ...extra } bez payloadu.
 * Default VYPNUTÉ (žiadny výstup, žiadna zmena správania):
 *   SP4_TRACE=1            → JSON riadky na console ([SP4-TRACE] {...})
 *   SP4_TRACE_FILE=<path>  → append JSONL do súboru
 * Cieľ: zviditeľniť, ktoré cesty integration.js sú ešte live.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

const storage = new AsyncLocalStorage();

export function newRequestId() {
    return randomUUID();
}

/** Spustí fn v kontexte requestu. Vnorené volania zdedia existujúci requestId. */
export function runWithRequest({ requestId, entry } = {}, fn) {
    const existing = storage.getStore();
    if (existing) return fn();
    return storage.run({ requestId: requestId || newRequestId(), entry: entry || null }, fn);
}

export function currentRequestId() {
    return storage.getStore()?.requestId ?? null;
}

export function isTraceEnabled() {
    return process.env.SP4_TRACE === '1' || Boolean(process.env.SP4_TRACE_FILE);
}

/**
 * @param {'legacy'|'src'} layer
 * @param {string} at - miesto v kóde, napr. 'integration.processMessage'
 * @param {object} [extra] - len metadáta (mode, tier, model, handledBy) — nikdy prompt/odpoveď
 */
export function traceLayer(layer, at, extra = {}) {
    if (!isTraceEnabled()) return;
    const entry = {
        ts: new Date().toISOString(),
        requestId: currentRequestId(),
        layer,
        at,
        ...extra,
    };
    try {
        const line = JSON.stringify(entry);
        if (process.env.SP4_TRACE === '1') console.log(`[SP4-TRACE] ${line}`);
        if (process.env.SP4_TRACE_FILE) fs.appendFileSync(process.env.SP4_TRACE_FILE, `${line}\n`, 'utf8');
    } catch {
        // tracing nesmie nikdy zhodiť request
    }
}

/** Express middleware: requestId z hlavičky x-request-id, inak nový UUID. */
export function requestTraceMiddleware(entry) {
    return (req, _res, next) => {
        const header = req.get?.('x-request-id');
        const requestId = typeof header === 'string' && /^[\w.:-]{1,128}$/.test(header) ? header : undefined;
        runWithRequest({ requestId, entry }, () => next());
    };
}

export default { runWithRequest, currentRequestId, traceLayer, requestTraceMiddleware, newRequestId };
