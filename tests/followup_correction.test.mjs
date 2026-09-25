// Bod 5 (P1_P2_FIX_PROPOSAL, schválené): oprava nesmie stratiť kontext.
// Korekcie/spresnenia predchádzajúcej odpovede musia zostať follow-upmi,
// aby sa do promptu dostala predošlá replika (prevAssistantText).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DialogueState, isFollowUpQuestion } from '../src/dialogue/dialogueState.js';

console.log = () => {};

function stateWithTopic(topic = 'project_direction') {
  const state = new DialogueState({ maxTurns: 6, topicDecayTurns: 4 });
  state.addTurn({ role: 'user', text: 'co je SP4?', topic });
  state.addTurn({ role: 'assistant', text: 'SP4 je offline-first AI projekt.', topic });
  return state;
}

test('correction phrases stay follow-ups (carry context)', () => {
  const state = stateWithTopic();
  for (const phrase of [
    'nie, to som nemyslel, išlo mi o pamäť',
    'to som nemyslel',
    'zle si ma pochopil',
    'zle si pochopil',
    'myslel som tým pamäť',
    'nie tak',
  ]) {
    assert.equal(isFollowUpQuestion(phrase, state), true, `"${phrase}" must be a follow-up`);
  }
});

test('"myslel som X" with a new subject stays a new topic', () => {
  const state = stateWithTopic();
  assert.equal(isFollowUpQuestion('myslel som docker', state), false, '"myslel som docker" must NOT inherit the old topic');
  assert.equal(isFollowUpQuestion('myslel som, že docker', state), false, '"myslel som, že docker" must NOT inherit the old topic');
});
