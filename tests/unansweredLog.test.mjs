import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    shouldLogUnanswered,
    buildUnansweredEntry,
    logUnanswered,
} from '../src/observability/unansweredLog.js';

test('kbHits=0 → treba logovať', () => {
    assert.equal(shouldLogUnanswered({ kbHits: 0, uncertain: false }), true);
});

test('uncertain=true → treba logovať', () => {
    assert.equal(shouldLogUnanswered({ kbHits: 2, uncertain: true }), true);
});

test('kbHits>0 + nie uncertain → netreba logovať', () => {
    assert.equal(shouldLogUnanswered({ kbHits: 3, uncertain: false }), false);
});

test('entry anonymizuje — nikdy neobsahuje memberId/userId', () => {
    const e = buildUnansweredEntry('Kto to vytvoril?', {
        kbHits: 0,
        uncertain: false,
        persona: 'glitchoslav',
        engine: 'ollama',
        source: 'telegram',
        memberId: 'SP4-USER-SECRET',
        userId: 12345,
    });
    assert.equal('memberId' in e, false);
    assert.equal('userId' in e, false);
    assert.equal(e.text, 'Kto to vytvoril?');
    assert.equal(e.kbHits, 0);
    assert.equal(e.persona, 'glitchoslav');
    assert.equal(typeof e.ts, 'string');
});

test('logUnanswered zapíše len keď shouldLog, do určeného súboru', () => {
    const tmp = path.join(os.tmpdir(), `unanswered-test-${Date.now()}.jsonl`);
    const wroteNo = logUnanswered('Ahoj', { kbHits: 5, uncertain: false }, tmp);
    assert.equal(wroteNo, false);
    assert.equal(fs.existsSync(tmp), false);

    const wroteYes = logUnanswered('Čo je herbár?', { kbHits: 0, uncertain: false, persona: 'glitchoslav' }, tmp);
    assert.equal(wroteYes, true);
    const lines = fs.readFileSync(tmp, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.text, 'Čo je herbár?');
    assert.equal('memberId' in parsed, false);
    fs.unlinkSync(tmp);
});
