// Bod 8 (P1_P2_FIX_PROPOSAL): embeddingy pamäte sa nesmú prepočítavať každé kolo.
// integration.js volá loadMemory() (čerstvý parse memory.json) → embeddingy sa zapisovali
// do dočasnej kópie a strácali. Cache v procese musí prežiť nový stavový objekt.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

const ENTRIES = [
  { timestamp: '2026-09-20T10:00:00Z', input: 'ako zálohujem priečinok', reply: 'použi rsync alebo robocopy' },
  { timestamp: '2026-09-21T10:00:00Z', input: 'čo je SP4', reply: 'local-first ekosystém' },
  { timestamp: '2026-09-22T10:00:00Z', input: 'nefunguje mi tlačiareň', reply: 'skontroluj ovládač' },
];
// Simuluje loadMemory(): vždy nový objekt bez embeddingov.
const freshState = (entries = ENTRIES) => JSON.parse(JSON.stringify({ rawMemory: { log: entries } }));

let rag;
before(async () => {
  console.log = () => {};
  rag = await import('../sp4os/ragLocal.js');
  rag.clearEmbeddingCache();
});

test('second retrieval on a freshly loaded state computes no memory embeddings', async () => {
  await rag.retrieveRelevantMemories('záloha', freshState(), 3);
  const afterFirst = rag.getEmbeddingCacheStats();
  assert.equal(afterFirst.misses, 3);

  await rag.retrieveRelevantMemories('tlačiareň', freshState(), 3);
  const afterSecond = rag.getEmbeddingCacheStats();
  assert.equal(afterSecond.misses, 3, 'no new memory embeddings computed');
  assert.equal(afterSecond.hits - afterFirst.hits, 3, 'all three served from cache');
});

test('changed entry text recomputes only that entry', async () => {
  const before = rag.getEmbeddingCacheStats();
  const changed = ENTRIES.map((e, i) => (i === 1 ? { ...e, reply: 'SP4 je local-first ekosystém pre komunity' } : e));
  await rag.retrieveRelevantMemories('sp4', freshState(changed), 3);
  const after = rag.getEmbeddingCacheStats();
  assert.equal(after.misses - before.misses, 1);
  assert.equal(after.hits - before.hits, 2);
});

test('cached embeddings rank the same as freshly computed ones', async () => {
  rag.clearEmbeddingCache();
  const first = await rag.retrieveRelevantMemories('záloha priečinka', freshState(), 3);
  const second = await rag.retrieveRelevantMemories('záloha priečinka', freshState(), 3);
  assert.deepEqual(second.map((r) => r.entry.input), first.map((r) => r.entry.input));
  assert.deepEqual(second.map((r) => r.score.toFixed(6)), first.map((r) => r.score.toFixed(6)));
});
