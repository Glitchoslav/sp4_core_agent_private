import assert from 'node:assert';
import { calculateConfidenceScore } from '../src/core/confidenceScoring.js';
import { getGroundedFallbackAnswer } from '../src/core/sp4GroundingKnowledge.js';

const fallback = getGroundedFallbackAnswer('čo je to sp4?');
const identityFallback = getGroundedFallbackAnswer('kto je kefyk a kde vzniklo sp4?');

assert.ok(fallback, 'expected factual fallback for SP4 query');
assert.ok(/offline|lokáln|lokal|súkrom|slobod/i.test(fallback), 'fallback should contain SP4 factual framing');
assert.ok(!/Ticho\. Skús sa spýtať inak/i.test(fallback), 'fallback must not use generic empty stub');

assert.ok(identityFallback, 'expected factual fallback for founder + origin query');
assert.ok(/Kefyk .* zakladateľ SP4|Kefyk \(Glitchoslav\) je zakladateľ SP4/i.test(identityFallback), 'identity timeout fallback should contain founder fact');
assert.ok(/v roku 2025 na východnom Slovensku/i.test(identityFallback), 'identity timeout fallback should contain origin fact');

const confidence = calculateConfidenceScore({
  groundingApplied: true,
  accuracyFallback: true,
  responseLength: fallback.length,
  requiresPrecision: true,
  cloudUsed: false
});

assert.ok(confidence.score < 0.8, `expected fallback confidence to stay below high-trust zone, got ${confidence.score}`);

console.log('PASS: grounded timeout fallback');
