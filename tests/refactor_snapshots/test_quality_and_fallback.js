import assert from 'node:assert/strict';

import {
  detectGeneralQualitySanityIssue,
  detectShortTechTopic,
  detectShortTechUtilityIssue,
  hasMojibakeArtifacts,
  isEmptyLikeResponse,
  isStubLikeResponse,
  looksLikeCanonicalSp4Fallback
} from '../../src/pipeline/qualityGuards.js';
import { applyFallbackTruth, mapFallbackReasonToEnum } from '../../src/pipeline/fallbackTruth.js';

assert.equal(isEmptyLikeResponse('   '), true);
assert.equal(isEmptyLikeResponse('text'), false);
assert.equal(isStubLikeResponse('Skús to zopakovať jednou vetou.'), true);
assert.equal(isStubLikeResponse('Skús to nasadiť cez runtime guard.'), false);

assert.equal(
  looksLikeCanonicalSp4Fallback('čo robí router?', 'SP4 je offline-first AI partner pre lokálny runtime.'),
  true
);
assert.equal(
  looksLikeCanonicalSp4Fallback('čo je sp4?', 'SP4 je offline-first AI partner pre lokálny runtime.'),
  false
);

assert.equal(hasMojibakeArtifacts('rozbitý ÔÇ text'), true);
assert.equal(detectShortTechTopic('čo robí wifi router?'), 'wifi_router');

assert.deepEqual(
  detectShortTechUtilityIssue({
    userMessage: 'čo robí wifi router?',
    responseText: 'Router prepoziva stradiu a priipojenymi zariadeniam.',
    queryType: 'technical_simple'
  }),
  {
    applied: true,
    reason: 'short_tech_low_utility_wifi_router',
    replacementText: 'Odpoveď síce trafila tému, ale bola jazykovo alebo prakticky slabá, preto ju nepúšťam ďalej. Polož tú istú otázku ešte raz jednou vetou a odpoviem priamo.',
    action: 'GENERAL_QUALITY_SHORT_TECH_UTILITY'
  }
);

assert.deepEqual(
  detectGeneralQualitySanityIssue({
    userMessage: 'čo je cache?',
    responseText: 'ERROR: Empty response.',
    queryType: 'technical_simple',
    responseControlApplied: false
  }),
  {
    applied: true,
    reason: 'stub_like_output',
    replacementText: 'Odpoveď bola zjavne rozbitá, preto ju nepúšťam ďalej. Polož otázku ešte raz jednou vetou a odpoviem priamo.',
    action: 'GENERAL_QUALITY_STUB'
  }
);

assert.equal(mapFallbackReasonToEnum('grounded_language_fallback'), 'low_confidence');
assert.equal(mapFallbackReasonToEnum('unknown_reason'), null);

const deliberationMeta = { fallbackReason: 'empty_orchestrator_response' };
assert.equal(
  applyFallbackTruth({
    userMessage: 'x',
    output: 'y',
    deliberationMeta,
    enforcementResult: null,
    elapsedMs: 1
  }),
  'empty_response'
);
assert.deepEqual(deliberationMeta, {
  fallbackReason: 'empty_response',
  accuracyFallback: true
});

console.log('✅ qualityGuards/fallbackTruth refactor snapshots passed');
