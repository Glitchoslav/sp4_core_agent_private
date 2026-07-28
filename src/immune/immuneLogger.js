// ┌─────────────────────────────────────────────────────────────────┐
// │  SP4 OS MODULE: immuneLogger                                   │
// │  Phase: 3 (persistent logging)                                 │
// │  Layer: Protection                                             │
// │  Role: Append-only JSONL log of immune events for learning     │
// │  API: logImmuneEvent({ verdict, mode, handledBy })             │
// │  Output: data/immune_log.jsonl (relative to sp4_core_agent/)   │
// │  Do NOT modify without explicit permission.                    │
// └─────────────────────────────────────────────────────────────────┘

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { DATA_DIR, IMMUNE_LOG_FILE } from '../../config/paths.js';

/**
 * Zapíše immune event do JSONL logu.
 * Od Phase 5 loguje AJ pass eventy, inak sa fail rates nedajú počítať.
 * NIKDY nevyhadzuje chybu — celý handler je try/catch.
 *
 * Štruktúra záznamu:
 *   { timestamp, input_hash, response_hash, handledBy, mode,
 *     severity, reason_codes, immune_confidence, query_type, model }
 *
 * @param {Object} params
 * @param {Object} params.verdict     - Výstup runImmuneCheck()
 * @param {string} params.mode        - Aktívna persona (napr. 'core', 'popici')
 * @param {string} params.handledBy   - Identifikátor handlera
 * @param {string} params.queryType   - Phase 5 query type heuristic
 * @param {string} params.model       - Model, ktorý odpoveď vytvoril
 * @param {string} params.eventKind   - 'final_verdict' | 'retry_attempt'
 * @param {boolean} params.retryApplied
 * @param {boolean} params.retryImproved
 */
export async function logImmuneEvent({ verdict, mode, handledBy, queryType, model, eventKind, retryApplied, retryImproved }) {
    try {
        if (!verdict) return;

        const entry = {
            timestamp: new Date().toISOString(),
            input_hash: verdict.prompt_hash || null,
            response_hash: verdict.response_hash || null,
            handledBy: handledBy || 'unknown',
            mode: mode || 'unknown',
            severity: verdict.severity,
            reason_codes: verdict.reason_codes || [],
            immune_confidence: verdict.immune_confidence || null,
            immune_profile: verdict.immune_profile || null,
            query_type: queryType || null,
            model: model || null,
            event_kind: eventKind || 'final_verdict',
            retryApplied: retryApplied === true,
            retryImproved: retryImproved === true,
        };

        if (!existsSync(DATA_DIR)) {
            mkdirSync(DATA_DIR, { recursive: true });
        }

        appendFileSync(IMMUNE_LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
    } catch (_err) {
        // Never propagate – logger must never crash runtime
    }
}
