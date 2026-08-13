import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../src/routing/classify.js';

test('triviálny pozdrav → local, krátky', () => {
    const r = classify('Ahoj', {});
    assert.equal(r.engine, 'local');
    assert.ok(r.num_predict <= 150, `num_predict=${r.num_predict} má byť ≤150`);
});

test('kľúčové slovo "prečo" → cloud (budget alebo quality), dlhšie', () => {
    const r = classify('Prečo je obloha modrá a ako to fyzikálne funguje?', {});
    assert.ok(['budget', 'quality'].includes(r.engine), `engine=${r.engine}`);
    assert.ok(r.num_predict >= 300, `num_predict=${r.num_predict} má byť ≥300`);
});

test('/hlbsie → hard override na quality, max tokeny', () => {
    const r = classify('/hlbsie čo je sloboda', {});
    assert.equal(r.engine, 'quality');
    assert.ok(r.num_predict >= 700, `num_predict=${r.num_predict}`);
});

test('viacero otáznikov zvyšuje skóre', () => {
    const r = classify('Čo je SP4? A kto ho vytvoril?', {});
    assert.ok(r.score >= 2, `score=${r.score}`);
});

test('persona glitchoslav pridáva skóre', () => {
    const a = classify('Ahoj', {});
    const b = classify('Ahoj', { persona: 'glitchoslav' });
    assert.ok(b.score > a.score, `${b.score} má byť > ${a.score}`);
});

test('dlhý text (>40 slov) → budget cloud', () => {
    const words = Array(45).fill('slovo').join(' ');
    const r = classify(words, {});
    assert.equal(r.engine, 'budget');
});

test('KB hit znižuje skóre (ostane local)', () => {
    const r = classify('Kto to vytvoril?', { kbHit: 0.9 });
    assert.ok(r.score < 0, `score=${r.score} s KB hit má byť < 0`);
});
