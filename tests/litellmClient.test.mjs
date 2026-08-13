import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cascadeOrder, estimateCost, estimateTokens } from '../src/llm/litellmClient.js';

test('kaskáda quality → budget → fast → free', () => {
    assert.deepEqual(cascadeOrder('quality'), ['quality', 'budget', 'fast', 'free']);
});

test('kaskáda budget → fast → free', () => {
    assert.deepEqual(cascadeOrder('budget'), ['budget', 'fast', 'free']);
});

test('kaskáda fast → free', () => {
    assert.deepEqual(cascadeOrder('fast'), ['fast', 'free']);
});

test('cena budget (1M in + 1M out) ≈ 0.68 USD', () => {
    const c = estimateCost('budget', 1000000, 1000000);
    assert.ok(Math.abs(c - 0.68) < 0.01, `cost=${c}`);
});

test('free vrstva = 0 USD', () => {
    assert.equal(estimateCost('free', 1000000, 1000000), 0);
});

test('estimateTokens ≈ dĺžka/4', () => {
    const t = estimateTokens('a'.repeat(100));
    assert.ok(t >= 20 && t <= 30, `tokens=${t}`);
});
