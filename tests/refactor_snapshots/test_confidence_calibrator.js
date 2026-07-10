import assert from 'node:assert/strict';

import { calibrateConfidence, getConfidenceLabel } from '../../src/pipeline/confidenceCalibrator.js';

assert.equal(getConfidenceLabel(0.86), 'VERY_HIGH');
assert.equal(getConfidenceLabel(0.7), 'HIGH');
assert.equal(getConfidenceLabel(0.5), 'MEDIUM');
assert.equal(getConfidenceLabel(0.3), 'LOW');
assert.equal(getConfidenceLabel(0.29), 'VERY_LOW');

assert.deepEqual(
  calibrateConfidence({
    baseScore: 0.92,
    enforcementResult: { rewriteCount: 1, englishRatioAfter: 0.2 },
    deliberationMeta: {},
    orchestrationResult: null
  }),
  {
    confidenceScore: 0.55,
    confidenceLabel: 'MEDIUM',
    metadataPatch: {
      calibrationReasons: ['language_rewrite_count=1', 'english_ratio_after=20.0%'],
      penaltyLogs: [
        '   ⚙️ PENALTY: Language rewrites (1x) → max confidence 0.65',
        '   ⚙️ PENALTY: English leakage (20.0%) → max confidence 0.55'
      ]
    }
  }
);

assert.deepEqual(
  calibrateConfidence({
    baseScore: 0.9,
    enforcementResult: null,
    deliberationMeta: { accuracyFallback: true, fallbackReason: 'low_confidence' },
    orchestrationResult: { meta: { validation: { languageEnforced: true, languageMethod: 'strict_translate' } } }
  }),
  {
    confidenceScore: 0.35,
    confidenceLabel: 'LOW',
    metadataPatch: {
      calibrationReasons: ['fallback_truth=low_confidence', 'orchestrator_strict_translate'],
      penaltyLogs: [
        '   ⚙️ PENALTY: Truthful fallback (low_confidence) → max confidence 0.35',
        '   ⚙️ PENALTY: Orchestrator strict translate → max confidence 0.60'
      ]
    }
  }
);

console.log('✅ confidenceCalibrator refactor snapshots passed');
