import assert from 'node:assert/strict';

import { runPostResponseImmuneStage } from '../../src/pipeline/immuneOrchestrator.js';

const result = {
  response: 'OK odpoveď',
  metadata: {
    model: 'none',
    stageTrace: {}
  }
};
result.meta = result.metadata;

await runPostResponseImmuneStage({
  result,
  userMessage: 'test',
  finalMode: 'core',
  detectedMode: 'core',
  mode: 'core',
  selectedModel: 'none',
  groundingPrompt: null,
  promptPackage: null,
  testMode: true,
  forceLocal: true,
  options: {
    shouldSkipPostResponseImmuneCheck: () => ({ skip: true, reason: 'test_mode' })
  },
  dialogueState: null,
  primaryModel: 'none'
});

assert.equal(result.response, 'OK odpoveď');
assert.equal(result.metadata.immuneSkipped, true);
assert.equal(result.metadata.immuneSkipReason, 'test_mode');
assert.equal(result.metadata.stageTrace.immuneOutcome, 'pass');
assert.deepEqual(result.metadata.immune_audit, ['skip:true', 'immune:skipped:test_mode']);
assert.equal(result.meta, result.metadata);

console.log('✅ immuneOrchestrator skip snapshot passed');
