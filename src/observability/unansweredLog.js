// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: unansweredLog              │
// │  Layer: Observability                      │
// │  Role: Anonymizovaný log nepokrytých otázok│
// │  Mission: KURATOR_v0 — potrava pre Kurátora│
// │  API: logUnanswered(text, meta, logPath?)  │
// └─────────────────────────────────────────────┘

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOG_PATH = process.env.SP4_UNANSWERED_LOG
    || path.resolve(__dirname, '../../logs/unanswered-questions.jsonl');

/**
 * Má sa otázka logovať ako nepokrytá?
 * Logujeme len vtedy, keď KB nemala zásah (kbHits===0) ALEBO model odpovedal neisto.
 */
export function shouldLogUnanswered(meta = {}) {
    return meta.kbHits === 0 || meta.uncertain === true;
}

/**
 * Vytvorí anonymizovaný záznam. ZÁMERNE vynecháva memberId / userId / akúkoľvek
 * identitu — v malej obci by sa aj bez mena dal uhádnuť, kto sa pýtal.
 */
export function buildUnansweredEntry(text, meta = {}) {
    return {
        ts: new Date().toISOString(),
        text: String(text || '').slice(0, 500), // obmedzenie dĺžky
        kbHits: meta.kbHits ?? null,
        uncertain: !!meta.uncertain,
        persona: meta.persona || null,
        engine: meta.engine || null,
        source: meta.source || null,
    };
}

/**
 * Zapíše anonymizovaný záznam (fire-and-forget, nikdy nehádže).
 * @returns {boolean} true ak sa zapísalo, false ak nie (shouldLog=false alebo chyba).
 */
export function logUnanswered(text, meta = {}, logPath = null) {
    try {
        if (!shouldLogUnanswered(meta)) return false;
        const line = JSON.stringify(buildUnansweredEntry(text, meta));
        fs.appendFileSync(logPath || LOG_PATH, line + '\n', 'utf8');
        return true;
    } catch (_) {
        return false;
    }
}

export default logUnanswered;
