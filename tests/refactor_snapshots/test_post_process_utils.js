import assert from 'node:assert/strict';

import {
  auditCleanupStep,
  brutalizeFireResponse,
  cleanupWeirdSlovak,
  getGlobalLanguageFailsafeDecision,
  reconcileLanguageRewrite,
  sanitizeAiCliches,
  stripInternalPromptArtifacts,
  stripResidualEnglish
} from '../../src/pipeline/postProcessUtils.js';

assert.equal(
  sanitizeAiCliches('Ako AI jazykový model. Toto je odpoveď.'),
  'Toto je odpoveď.'
);

assert.equal(
  stripResidualEnglish('As an AI language model, I help. Toto je veta.'),
  'Toto je veta.'
);

assert.equal(
  stripInternalPromptArtifacts('A [INTERNAL_DEBUG]  B'),
  'A B'
);

assert.equal(
  cleanupWeirdSlovak(' ahoj  ahoj  😂😂 ! '),
  'ahoj 😂😂!'
);

assert.equal(
  brutalizeFireResponse('nevzdávaj sa\n1. skús zvážiť'),
  'ak to fakt chceš, prestaň si klamať a niečo urob\nprestaň váhať a rozhodni sa'
);

assert.deepEqual(
  reconcileLanguageRewrite({
    originalText: 'Original English text that stayed broken.',
    rewrittenText: 'Still English text.',
    englishRatioBefore: 0.9,
    englishRatioAfter: 0.8
  }),
  {
    text: 'Still English text.',
    ratioDropPercent: 10,
    persistentEnglish: true,
    rewriteImproved: true
  }
);

assert.deepEqual(
  getGlobalLanguageFailsafeDecision({
    userInputLang: 'sk',
    isManifestRequest: false,
    forceSlovak: false,
    enforcementResult: null,
    englishRatioFinal: 0.8,
    totalWords: 30
  }),
  {
    shouldFallback: true,
    explicitLanguageTrigger: 'USER_INPUT_SK',
    heavyEnglishLeak: true
  }
);

const audit = [];
auditCleanupStep('stripInternalPromptArtifacts', 'A [INTERNAL_DEBUG]', 'A', audit);
assert.deepEqual(audit, [{
  step: 'stripInternalPromptArtifacts',
  changed: true,
  beforeLength: 18,
  afterLength: 1
}]);

console.log('✅ postProcessUtils refactor snapshots passed');
