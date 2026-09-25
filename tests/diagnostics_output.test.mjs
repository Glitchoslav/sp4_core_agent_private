// Bod 9 (P1_P2_FIX_PROPOSAL): diagnostické výstupy nesmú klamať ani lepiť nezmysly.
import { test } from 'node:test';
import assert from 'node:assert/strict';

console.log = () => {};
const { buildWhoAmITextFromSeed } = await import('../src/services/personalProfile.js');
const { formatEnforcementSuccessRate } = await import('../src/core/languageEnforcer.js');
const { getNextStageGap, formatRelationshipSummary } = await import('../relationshipEvolution.js');

test('9a /whoami: first-person intent/fear is not glued to "Chceš"/"Bojíš sa"', () => {
  const text = buildWhoAmITextFromSeed({ username: 'kefyk', intent: 'chcem žiť naplno', fear: 'bojím sa samoty' });
  assert.match(text, /Chceš žiť naplno\./);
  assert.match(text, /Bojíš sa samoty\./);
  assert.doesNotMatch(text, /Chceš chcem|Bojíš sa bojím/i);
  assert.match(buildWhoAmITextFromSeed({ intent: 'Chcel by som pokoj' }), /Chceš pokoj\./);
});

test('9a "čo si o mne pamätáš?": first-person intent is not glued to "že chceš"', async () => {
  const { buildProfileMemoryShortcutResponse } = await import('../src/services/profileMemoryShortcuts.js');
  const text = await buildProfileMemoryShortcutResponse('co si o mne pamatas?', {
    seed: { username: 'kefyk', intent: 'chcem žiť naplno' },
    memory: { rawMemory: { log: [] }, userProfile: { name: 'Kefyk' } },
  });
  assert.match(text, /že chceš žiť naplno/);
  assert.doesNotMatch(text, /chceš chcem/i);
});

test('9a /whoami: existing phrasing contract (test_profile_memory_shortcuts.js) holds', () => {
  const text = buildWhoAmITextFromSeed({ username: 'kefyk', intent: 'pokoj, slobodu, život a lásku', fear: 'Še NEBOJ!' });
  assert.match(text, /Ty si kefyk\./);
  assert.match(text, /Chceš pokoj, slobodu, život a lásku\./);
  assert.match(text, /Bojíš sa Še NEBOJ!/);
});

test('9b /language_stats: no English detected is n/a, not 0.0%', () => {
  assert.match(formatEnforcementSuccessRate({ totalChecks: 5, englishDetected: 0, retriesSuccessful: 0 }), /n\/a/);
  assert.equal(formatEnforcementSuccessRate({ totalChecks: 9, englishDetected: 4, retriesSuccessful: 3 }), '75.0%');
});

const day = (d) => new Date(Date.UTC(2026, 8, 1 + d)).toISOString();
const memoryWith = (entries, extra = {}) => ({
  rawMemory: { log: entries },
  relationship: { stage: 'stranger', metrics: { interactionCount: 164 } },
  ...extra,
});

test('9c relationship: canonical counter is rawMemory.log.length, not metrics.interactionCount', () => {
  const entries = Array.from({ length: 12 }, (_, i) => ({ timestamp: day(0), input: `q${i}` }));
  const summary = formatRelationshipSummary(memoryWith(entries));
  assert.match(summary, /stranger \(12\)/);
  assert.doesNotMatch(summary, /164/);
});

test('9c relationship: shows which requirement is missing for the next stage', () => {
  // 12 interakcií v jeden deň → minInteractions (10) splnené, time (0.2) nie.
  const entries = Array.from({ length: 12 }, (_, i) => ({ timestamp: day(0), input: `q${i}` }));
  const gap = getNextStageGap(memoryWith(entries));
  assert.equal(gap.nextStage, 'acquaintance');
  assert.ok(gap.missing.includes('time'), JSON.stringify(gap));
  assert.ok(!gap.missing.includes('interactions'));
  assert.match(formatRelationshipSummary(memoryWith(entries)), /chýba: .*time/);

  const few = getNextStageGap(memoryWith(entries.slice(0, 3)));
  assert.ok(few.missing.includes('interactions'));
});
