// Bod 4 (P1_P2_FIX_PROPOSAL, schválené): confidence nesmie tvrdiť istotu, ktorú nič nemeria.
// - LLM scorer štartuje na neutrálnych 0.7 (nie 1.0); hore ho posúvajú len overené signály.
// - Deterministické guardy nehlásia 1.0, ale confidenceSource:'deterministic'.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

console.log = () => {};
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { calculateConfidenceScore } = await import('../src/core/confidenceScoring.js');
const { buildGuardResult } = await import('../src/pipeline/runtimeAuthorityGuard.js');

test('LLM scorer: neutral start 0.7 when nothing is verified', () => {
  const r = calculateConfidenceScore({});
  assert.equal(r.score, 0.7);
  assert.ok(r.score < 0.9);
});

test('LLM scorer: verified signals raise it, detected problems lower it', () => {
  assert.ok(calculateConfidenceScore({ groundingApplied: true, memoryAccess: true }).score > 0.7);
  assert.ok(calculateConfidenceScore({ accuracyFallback: true }).score < 0.7);
  assert.ok(calculateConfidenceScore({ groundingApplied: true, memoryAccess: true }).score < 1);
});

test('guard results carry confidenceSource deterministic, not a 1.0 certainty', () => {
  const r = buildGuardResult({
    response: 'Ta brate…', handledBy: 'popici', provider: 'deterministic_shortcut',
    policy: {}, processingTime: 1,
  });
  assert.equal(r.metadata.execution.confidenceSource, 'deterministic');
  assert.equal(r.metadata.execution.confidenceScore, null);
  assert.equal(r.metadata.execution.confidenceLabel, 'DETERMINISTIC');
});

test('integration.js has no hardcoded confidenceScore 1.0 left', () => {
  const src = fs.readFileSync(path.join(ROOT, 'integration.js'), 'utf8');
  assert.equal((src.match(/confidenceScore:\s*1\.0\b/g) || []).length, 0);
});
