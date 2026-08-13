import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    clusterQuestions,
    filterRecent,
    buildProposalPrompt,
    formatProposal,
} from '../src/agents/kurator.js';

test('clusterQuestions: podobné otázky do jedného zhluku', () => {
    const r = clusterQuestions([
        { text: 'Kto vytvoril SP4?' },
        { text: 'Kto vymyslel SP4?' },
    ]);
    assert.equal(r.length, 1);
    assert.equal(r[0].questions.length, 2);
});

test('clusterQuestions: rôzne témy do rôznych zhlukov', () => {
    const r = clusterQuestions([
        { text: 'Čo je SP4?' },
        { text: 'Aké bude zajtra počasie?' },
        { text: 'Kde sa koná obecný ples?' },
    ]);
    assert.equal(r.length, 3);
});

test('clusterQuestions: prázdny vstup → prázdny výstup', () => {
    assert.deepEqual(clusterQuestions([]), []);
});

test('filterRecent: ponechá len čerstvé', () => {
    const now = Date.now();
    const entries = [
        { ts: new Date(now - 1000).toISOString() },
        { ts: new Date(now - 25 * 3600 * 1000).toISOString() },
    ];
    const r = filterRecent(entries, now, 24 * 3600 * 1000);
    assert.equal(r.length, 1);
});

test('buildProposalPrompt: obsahuje otázky + inštrukcie SK', () => {
    const cluster = { keywords: ['sp4'], questions: ['Kto vytvoril SP4?'] };
    const p = buildProposalPrompt(cluster);
    assert.ok(p.includes('Kto vytvoril SP4?'));
    assert.ok(p.includes('slovenčin') || p.includes('slovensky') || p.includes('fakt'));
});

test('buildProposalPrompt: zakazuje vymýšľať dátumy/mená (anti-halucinácia)', () => {
    const cluster = { keywords: ['x'], questions: ['Kedy bude zasadnutie?'] };
    const p = buildProposalPrompt(cluster);
    assert.ok(/nevymýšľaj|NEVYMÝŠĽAJ/i.test(p), 'prompt má zakazovať vymýšľanie');
    assert.ok(/overiť|overit/i.test(p), 'prompt má žiadať overenie zdroja');
});

test('formatProposal: štruktúrovaný návrh so statusom proposed', () => {
    const cluster = { keywords: ['sp4'], questions: ['Kto vytvoril SP4?'] };
    const p = formatProposal(cluster, 'SP4 vytvoril Kefyk. Aliases: kto vytvoril sp4');
    assert.equal(p.status, 'proposed');
    assert.equal(p.keywords[0], 'sp4');
    assert.equal(Array.isArray(p.questions), true);
    assert.ok(p.proposedFact.length > 0);
    assert.ok(p.aliases.length >= 0);
    assert.equal(typeof p.date, 'string');
});
