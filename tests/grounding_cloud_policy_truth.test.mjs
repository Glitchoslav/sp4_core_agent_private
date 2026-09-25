// Bod 3 (P1_P2_FIX_PROPOSAL): grounding fakty o cloude musia sedieť s realitou.
// Live log: SP4 radil neexistujúci prepínač cloudu, lebo prompt tvrdil Groq/Google,
// režim autonomous-cloud a metadata kontrakt s cloudAllowed.
import { test } from 'node:test';
import assert from 'node:assert/strict';

console.log = () => {};
const { getSP4KnowledgeBlock, detectSP4Query, getGroundedFallbackAnswer } = await import('../src/core/sp4GroundingKnowledge.js');
const { generateGroundingFallback } = await import('../src/core/groundingValidator.js');

const STALE = /Groq|Google|autonomous-cloud|cloudAllowed|cloud_groq|cloud_google/i;

test('policy question routes to the policy block', () => {
  assert.equal(detectSP4Query('ako zapnem cloud?'), 'policy');
});

test('no grounded topic carries stale cloud claims', () => {
  for (const query of ['ako zapnem cloud?', 'čo je sp4?', 'ako funguje pamat', 'ako funguje routing', 'kto je glitchoslav?']) {
    const block = getSP4KnowledgeBlock(query) || '';
    assert.ok(block.length > 0, `no block for ${query}`);
    const hit = block.match(STALE);
    assert.equal(hit, null, `"${query}" block still says "${hit?.[0]}"`);
  }
});

test('user-facing fallbacks (hallucination + language) carry no stale cloud claims', () => {
  for (const topic of ['memory', 'policy', 'integration', 'architecture']) {
    const text = generateGroundingFallback(topic);
    const hit = text.match(STALE);
    assert.equal(hit, null, `generateGroundingFallback(${topic}) still says "${hit?.[0]}"`);
  }
  assert.equal(getGroundedFallbackAnswer('ako zapnem cloud?').match(STALE), null);
});

test('policy hallucination fallback says chat cannot enable cloud', () => {
  const text = generateGroundingFallback('policy');
  assert.match(text, /LiteLLM/);
  assert.match(text, /SP4_ALLOW_CLOUD/);
  assert.match(text, /neexistuje[^.\n]*príkaz/i);
});

test('policy block states the real cloud gates and that chat cannot enable cloud', () => {
  const block = getSP4KnowledgeBlock('ako zapnem cloud?');
  assert.match(block, /LiteLLM/);
  assert.match(block, /SP4_ALLOW_CLOUD/);
  assert.match(block, /sensitivity/);
  assert.match(block, /neexistuje[^.\n]*príkaz/i);
  assert.match(block, /súkromn/i);
});
