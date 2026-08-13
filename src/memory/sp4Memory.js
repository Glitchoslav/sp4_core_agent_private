// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: sp4Memory                  │
// │  Layer: Memory (v0 — SQLite, verbatim-first)│
// │  Mission: PAMAT_v0 — 3 tabulky + FTS5 + RRF │
// │  API: initMemoryDb / recordEpisode / searchMemory │
// └─────────────────────────────────────────────┘

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_DB_PATH = process.env.SP4_MEMORY_DB
    || path.resolve(__dirname, '../../data/sp4-memory.db');

// ── Čisté funkcie (testovateľné bez DB) ──────────────────

/**
 * Reciprocal Rank Fusion (Cormack 2009, k=60).
 * rankLists: pole rank-listov (každý = pole id zoradených podľa relevance).
 * @returns {Map<id, number>} id → rrf skóre
 */
export function rrfFusion(rankLists, k = 60) {
    const scores = new Map();
    for (const list of rankLists) {
        (list || []).forEach((id, i) => {
            scores.set(id, (scores.get(id) || 0) + 1 / (k + i + 1));
        });
    }
    return scores;
}

/**
 * Ebbinghaus-like recency: 1 = teraz, →0 s vekom (half-life).
 */
export function recencyNorm(tsMs, nowMs = Date.now(), halfLifeMs = 7 * 24 * 3600 * 1000) {
    const age = Math.max(0, nowMs - tsMs);
    return 1 / (1 + age / halfLifeMs);
}

/**
 * Vyberie položky kým sa nevyčerpá token rozpočet (context-budget injection).
 * Položky musia byť už zoradené (najlepšie prvé).
 */
export function contextBudgetSelect(items, budgetTokens = 1000, estTokensPerChar = 0.25) {
    const selected = [];
    let used = 0;
    for (const it of items || []) {
        const tok = Math.ceil(String(it.content || '').length * estTokensPerChar);
        if (used + tok > budgetTokens && selected.length > 0) break;
        selected.push(it);
        used += tok;
    }
    return selected;
}

/**
 * Sanitizuje user query na bezpečný FTS5 MATCH výraz (OR tokenov).
 * Diakritiku rieši FTS5 cez remove_diacritics 2 — netreba ju tu odstraňovať.
 */
export function toFtsQuery(text) {
    const tokens = String(text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 2);
    return tokens.map((t) => `"${t}"`).join(' OR ');
}

// ── DB ──────────────────────────────────────────────────

const SCHEMA = `
CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  community_id TEXT DEFAULT 'sp4',
  participants TEXT DEFAULT '[]',
  topic TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  importance REAL DEFAULT 0.5,
  source_channel TEXT DEFAULT 'bridge'
);
CREATE TABLE IF NOT EXISTS entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  type TEXT,
  aliases TEXT DEFAULT '[]',
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  confidence REAL DEFAULT 0.5,
  source_episode INTEGER,
  verified INTEGER DEFAULT 0,
  valid_from TEXT,
  valid_to TEXT,
  decay_score REAL DEFAULT 1.0
);
CREATE VIRTUAL TABLE IF NOT EXISTS episodes_fts USING fts5(
  content, topic,
  content='episodes', content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);
CREATE TRIGGER IF NOT EXISTS episodes_ai AFTER INSERT ON episodes BEGIN
  INSERT INTO episodes_fts(rowid, content, topic) VALUES (new.id, new.content, new.topic);
END;
CREATE TRIGGER IF NOT EXISTS episodes_ad AFTER DELETE ON episodes BEGIN
  INSERT INTO episodes_fts(episodes_fts, rowid, content, topic) VALUES ('delete', old.id, old.content, old.topic);
END;
CREATE TRIGGER IF NOT EXISTS episodes_au AFTER UPDATE ON episodes BEGIN
  INSERT INTO episodes_fts(episodes_fts, rowid, content, topic) VALUES ('delete', old.id, old.content, old.topic);
  INSERT INTO episodes_fts(rowid, content, topic) VALUES (new.id, new.content, new.topic);
END;
`;

/**
 * Inicializuje DB (WAL + pragmas + schéma + FTS5 + triggery).
 * @returns {DatabaseSync}
 */
export function initMemoryDb(dbPath = DEFAULT_DB_PATH) {
    const db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA busy_timeout = 5000;');
    db.exec(SCHEMA);
    return db;
}

/**
 * Zaznamená epizódu (VERBATIM — celý text, neextrahovaný).
 * @returns {number} id novej epizódy
 */
export function recordEpisode(db, {
    ts = new Date().toISOString(),
    communityId = 'sp4',
    participants = '[]',
    topic = null,
    content = '',
    summary = null,
    importance = 0.5,
    sourceChannel = 'bridge',
} = {}) {
    const r = db.prepare(
        `INSERT INTO episodes (ts, community_id, participants, topic, content, summary, importance, source_channel)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(ts, communityId, participants, topic, content, summary, importance, sourceChannel);
    return Number(r.lastInsertRowid);
}

/**
 * Hybrid retrieval v0: FTS5 (rank) → RRF → recency/importance multiplikátor
 * → context-budget injection. Vracia zoradené položky do rozpočtu tokenov.
 */
export function searchMemory(db, query, {
    limit = 20,
    budgetTokens = 1000,
    minScore = 0,
} = {}) {
    const ftsQuery = toFtsQuery(query);
    if (!ftsQuery) return [];

    const rows = db.prepare(
        `SELECT e.id, e.content, e.ts, e.importance
         FROM episodes_fts f JOIN episodes e ON e.id = f.rowid
         WHERE episodes_fts MATCH ?
         ORDER BY rank
         LIMIT ?`
    ).all(ftsQuery, limit);

    if (rows.length === 0) return [];

    const ranked = rows.map((r) => r.id);
    const rrf = rrfFusion([ranked]);
    const now = Date.now();

    const items = rows
        .map((r) => {
            const base = rrf.get(r.id) || 0;
            const rec = recencyNorm(Date.parse(r.ts), now);
            const imp = Number(r.importance) || 0.5;
            return {
                id: r.id,
                content: r.content,
                ts: r.ts,
                importance: imp,
                score: base * (1 + 0.2 * rec + 0.1 * imp),
            };
        })
        .filter((it) => it.score >= minScore)
        .sort((a, b) => b.score - a.score);

    return contextBudgetSelect(items, budgetTokens);
}

export default { initMemoryDb, recordEpisode, searchMemory, rrfFusion, recencyNorm, contextBudgetSelect, toFtsQuery };
