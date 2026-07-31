import assert from 'node:assert/strict';

import { SP4IntegratedAgent } from '../integration.js';
import { DialogueState, resolveDeterministicFollowUp } from '../src/dialogue/dialogueState.js';
import { buildGuardResult } from '../src/pipeline/runtimeAuthorityGuard.js';

console.log('TEST: persona mode carry after deterministic guard');

async function persistGuardTurn({ currentMode, metadata, response = 'Guard response' }) {
  const dialogueState = new DialogueState({ maxTurns: 6, topicDecayTurns: 4 });
  dialogueState.addTurn({
    role: 'user',
    text: 'Predchádzajúca otázka',
    topic: 'life_decision',
    mode: currentMode
  });
  dialogueState.addTurn({
    role: 'assistant',
    text: 'Predchádzajúca odpoveď',
    topic: 'life_decision',
    mode: currentMode
  });

  const agent = new SP4IntegratedAgent();
  agent.initialized = true;
  agent._dlgState = dialogueState;
  agent._processMessageCore = async () => ({ success: true, response, metadata });
  agent._ensureEarlyWriteback = async () => {};

  await agent.processMessage('Nasledujúca otázka', 'auto');
  return dialogueState.currentMode;
}

const glitchoslavState = new DialogueState({ maxTurns: 6, topicDecayTurns: 4 });
glitchoslavState.addTurn({
  role: 'user',
  text: 'Prečo sa človek cíti na hranici, aj keď všetko ide podľa plánu?',
  topic: 'life_decision',
  mode: 'glitchoslav'
});
glitchoslavState.addTurn({
  role: 'assistant',
  text: 'Lebo plán vie držať smer, ale nevyrieši za teba, čo je naozaj tvoje.',
  topic: 'life_decision',
  mode: 'glitchoslav'
});

const followUpText = 'touto vetou: plán vie držať smer';
const deterministicFollowUp = resolveDeterministicFollowUp(followUpText, glitchoslavState, {
  intent: 'clarify_previous_reply'
});

assert.ok(deterministicFollowUp, 'clarify_previous_reply must resolve deterministically');

const guardResult = buildGuardResult({
  response: deterministicFollowUp,
  handledBy: 'followup_deterministic_guard',
  provider: 'deterministic_shortcut',
  policy: {
    allowCloud: false,
    forceLocal: false,
    forceCloud: false,
    route: 'local-first',
    reason: 'local-first-default'
  },
  emotionalAnalysis: null,
  capabilityLevel: 'full',
  taskType: 'conversation',
  processingTime: 0,
  intent: 'clarify_previous_reply',
  extraMetadata: {
    providerDetail: 'deterministic_followup',
    policyReason: 'deterministic_core_general_shortcut'
  }
});

const glitchoslavAgent = new SP4IntegratedAgent();
glitchoslavAgent.initialized = true;
glitchoslavAgent._dlgState = glitchoslavState;
glitchoslavAgent._processMessageCore = async () => guardResult;
glitchoslavAgent._ensureEarlyWriteback = async () => {};

await glitchoslavAgent.processMessage(followUpText, 'auto');

assert.equal(
  glitchoslavState.currentMode,
  'glitchoslav',
  'a technical guard name must not overwrite the carried persona mode'
);

assert.equal(
  await persistGuardTurn({
    currentMode: 'popici',
    metadata: { handledBy: 'gibberish_guard' }
  }),
  'popici',
  'gibberish guard must keep the carried popici mode'
);

assert.equal(
  await persistGuardTurn({
    currentMode: 'glitchoslav',
    metadata: { handledBy: 'CORE' }
  }),
  'core',
  'a valid handledBy persona must remain backward compatible'
);

assert.equal(
  await persistGuardTurn({
    currentMode: 'glitchoslav',
    metadata: {
      selectedPersona: 'core',
      handledBy: 'followup_deterministic_guard'
    }
  }),
  'core',
  'an explicit selectedPersona must override the carried mode'
);

assert.equal(
  await persistGuardTurn({
    currentMode: 'glitch',
    metadata: { handledBy: 'short_reply_guard' }
  }),
  'glitchoslav',
  'a legacy carried mode must be normalized before persistence'
);

assert.equal(
  await persistGuardTurn({
    currentMode: 'retired_persona',
    metadata: { handledBy: 'short_reply_guard' }
  }),
  'core',
  'an invalid carried mode must fall back through persona normalization'
);

console.log('PASS: guard carry and explicit persona transitions persist correctly');
