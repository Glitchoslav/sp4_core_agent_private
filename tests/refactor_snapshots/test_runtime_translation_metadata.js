import assert from 'node:assert/strict';

import {
  buildGuardResult,
  buildRuntimeAuthorityPrompt,
  resolveRuntimeAuthorityGuardOutcome
} from '../../src/pipeline/runtimeAuthorityGuard.js';
import {
  buildTranslationTaskPrompt,
  isExplicitTranslationTask
} from '../../src/pipeline/translationGuard.js';
import {
  diffMetadata,
  patchDeliberationMeta,
  patchResultMetadata,
  patchResultResponse
} from '../../src/pipeline/metadataPatch.js';

assert.equal(
  buildRuntimeAuthorityPrompt('ako spustím runtime?'),
  `Splň presne túto runtime-authority úlohu používateľa.

PRAVIDLÁ:
1. Odpovedaj výlučne po slovensky.
2. Max 2 vety.
3. Musíš explicitne použiť tokeny: sp4.js start, default, server.js, legacy.
4. Nevymýšľaj hru, latenciu ani server hosting.
5. Nepouži frázu npm run serve.
6. Drž sa len tohto faktu: sp4.js start je kanonický default entrypoint runtime; server.js je legacy HTTP flow oddelený od default štartu.

Úloha používateľa:
ako spustím runtime?`
);

assert.deepEqual(
  resolveRuntimeAuthorityGuardOutcome({
    rawOutput: 'sp4.js start je default. server.js je legacy.',
    runtimeAuthorityModel: 'gemma3:4b'
  }),
  {
    response: 'sp4.js start je default. server.js je legacy.',
    provider: 'local_ollama',
    model: 'gemma3:4b',
    fallbackUsed: false,
    localLlmProven: true,
    reasoning: 'Focused local launcher guard before freeform orchestration',
    confidenceScore: 0.94,
    confidenceLabel: 'VERY_HIGH'
  }
);

const guardResult = buildGuardResult({
  response: 'OK',
  handledBy: 'runtime_authority_guard',
  provider: 'deterministic_runtime_authority',
  policy: { route: 'local-first', reason: 'test' },
  emotionalAnalysis: { intensity: 0 },
  capabilityLevel: 'FULL',
  taskType: 'general',
  processingTime: 12,
  intent: 'runtime_authority'
});
assert.equal(guardResult.success, true);
assert.equal(guardResult.meta, guardResult.metadata);
assert.equal(guardResult.metadata.role, 'GUARD');

assert.equal(
  isExplicitTranslationTask('Napíš vetu po nemecky a preklad do slovenčiny.'),
  true
);
assert.equal(
  buildTranslationTaskPrompt('Napíš vetu po nemecky a preklad do slovenčiny.'),
  `Splň presne túto úlohu používateľa.

PRAVIDLÁ:
1. Ak používateľ chce vetu v cudzom jazyku a potom preklad do slovenčiny, vráť presne 2 riadky.
2. Formát:
DE: ...
SK: ...
3. Nepíš anglické meta vety, komentáre ani vysvetlenia.
4. Nepíš "Here is", "Final answer", "Preklad:" ani nič navyše.
5. Zachovaj význam jednoducho a prirodzene.

Úloha používateľa:
Napíš vetu po nemecky a preklad do slovenčiny.`
);

const aliased = { metadata: { a: 1 } };
aliased.meta = aliased.metadata;
patchResultMetadata(aliased, { b: 2 });
assert.deepEqual(aliased.metadata, { a: 1, b: 2 });
assert.equal(aliased.meta, aliased.metadata);

const split = { metadata: { a: 1 }, meta: { c: 3 } };
patchResultMetadata(split, { b: 2 });
assert.deepEqual(split.metadata, { a: 1, b: 2 });
assert.deepEqual(split.meta, { c: 3, b: 2 });

const deliberation = { meta: { a: 1 }, metadata: { c: 3 } };
patchDeliberationMeta(deliberation, { b: 2 });
assert.equal(deliberation.b, 2);
assert.deepEqual(deliberation.meta, { a: 1, b: 2 });
assert.deepEqual(deliberation.metadata, { c: 3, b: 2 });

patchResultResponse(split, 'NEW', {});
assert.equal(split.response, 'NEW');

assert.deepEqual(diffMetadata({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 }), {
  b: { before: 2, after: 3 },
  c: { before: undefined, after: 4 }
});

console.log('✅ runtime/translation/metadata refactor snapshots passed');
