import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    rrfFusion,
    recencyNorm,
    contextBudgetSelect,
    toFtsQuery,
    initMemoryDb,
    recordEpisode,
    searchMemory,
} from '../src/memory/sp4Memory.js';

// ── Čisté funkcie ──────────────────────────────────────

test('rrfFusion: spája rank-listy cez rank (k=60)', () => {
    const scores = rrfFusion([['a', 'b'], ['b', 'a']]);
    // oba dokumenty majú rovnaké ranky → rovnaké skóre
    assert.equal(scores.get('a'), scores.get('b'));
    // vyšší rank = vyššie skóre
    const s2 = rrfFusion([['a', 'b', 'c']]);
    assert.ok(s2.get('a') > s2.get('b'));
    assert.ok(s2.get('b') > s2.get('c'));
});

test('recencyNorm: 1 teraz, →0 s vekom', () => {
    const now = Date.now();
    assert.equal(recencyNorm(now, now), 1);
    const old = recencyNorm(now - 7 * 24 * 3600 * 1000, now); // 7 dní = half-life → 0.5
    assert.ok(Math.abs(old - 0.5) < 0.001, `old=${old}`);
});

test('contextBudgetSelect: plní po token rozpočet, rešpektuje poradie', () => {
    const items = [
        { id: 1, content: 'a'.repeat(100) },   // ~25 tokenov
        { id: 2, content: 'b'.repeat(100) },   // ~25
        { id: 3, content: 'c'.repeat(4000) },  // ~1000 (presiahne)
    ];
    const sel = contextBudgetSelect(items, 60); // 100 znakov = 25 tok, 60 budget = 2 items
    assert.equal(sel.length, 2);
    assert.deepEqual(sel.map((i) => i.id), [1, 2]);
});

test('toFtsQuery: sanitizuje špeciálne FTS5 znaky', () => {
    const q = toFtsQuery('Kto to vytvoril? (SP4)');
    assert.ok(q.includes('vytvoril'));
    assert.ok(!q.includes('(') && !q.includes(')') && !q.includes('?'));
});

// ── DB integrácia (dočasný súbor) ──────────────────────

test('memory DB: recordEpisode + searchMemory round-trip', () => {
    const dbPath = path.join(os.tmpdir(), `sp4-mem-test-${Date.now()}.db`);
    const db = initMemoryDb(dbPath);

    recordEpisode(db, {
        ts: new Date().toISOString(),
        communityId: 'sp4',
        topic: 'vytvorenie',
        content: 'Kefyk vytvoril SP4 ako lokálny offline-first ekosystém.',
        importance: 0.8,
        sourceChannel: 'test',
    });
    recordEpisode(db, {
        ts: new Date().toISOString(),
        communityId: 'sp4',
        topic: 'pocasie',
        content: 'Dnes bude pršať celý deň.',
        importance: 0.3,
        sourceChannel: 'test',
    });

    const r1 = searchMemory(db, 'Kefyk SP4', { budgetTokens: 1000 });
    assert.ok(r1.length >= 1);
    assert.ok(r1[0].content.includes('Kefyk'));

    const r2 = searchMemory(db, 'počasie', { budgetTokens: 1000 });
    assert.ok(r2.length >= 1);
    assert.ok(r2[0].content.includes('pršať'));

    db.close();
    fs.unlinkSync(dbPath);
    // WAL/shm súbory ak vznikli
    for (const suffix of ['-wal', '-shm']) {
        if (fs.existsSync(dbPath + suffix)) fs.unlinkSync(dbPath + suffix);
    }
});
