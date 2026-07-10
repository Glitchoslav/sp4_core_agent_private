import assert from 'node:assert/strict';

import { SP4_LOCAL_FIRST_NATURE, SP4_SYSTEM_ROLE, SP4_TARGET_USERS } from '../src/core/sp4Facts.js';
import { DialogueState, isFollowUpQuestion, resolveDeterministicFollowUp } from '../src/dialogue/dialogueState.js';

console.log('🧪 TEST: dialogue follow-up SP4 subject contract');

const state = new DialogueState({ maxTurns: 6, topicDecayTurns: 4 });
state.addTurn({ role: 'user', text: 'co je SP4?', topic: 'project_direction' });
state.addTurn({ role: 'assistant', text: 'SP4 je offline-first AI projekt a osobny digitalny partner.', topic: 'project_direction' });

assert.equal(isFollowUpQuestion('a na co to sluzi', state), true, 'SP4 purpose follow-up must stay classified as follow-up');

const followUp = resolveDeterministicFollowUp('a na co to sluzi', state);

assert.equal(followUp, SP4_SYSTEM_ROLE, 'SP4 purpose follow-up must resolve to the canonical SP4 system role');
assert.doesNotMatch(followUp, /persony alebo agentov|spresni/i, 'SP4 purpose follow-up must not fall into the generic agent clarifier');

state.addTurn({ role: 'user', text: 'a na co to sluzi', topic: 'project_direction' });
state.addTurn({ role: 'assistant', text: followUp, topic: 'project_direction' });

assert.equal(isFollowUpQuestion('a pre koho je to', state), true, 'SP4 target-users follow-up must stay classified as follow-up');

const targetUsersFollowUp = resolveDeterministicFollowUp('a pre koho je to', state);

assert.equal(targetUsersFollowUp, SP4_TARGET_USERS, 'SP4 target-users follow-up must resolve to the canonical SP4 target-users fact');
assert.doesNotMatch(targetUsersFollowUp, /intern[eé]\s+promptovanie|spresni/i, 'SP4 target-users follow-up must not fall into refusal or generic clarifier drift');

state.addTurn({ role: 'user', text: 'a pre koho je to', topic: 'project_direction' });
state.addTurn({ role: 'assistant', text: targetUsersFollowUp, topic: 'project_direction' });

assert.equal(isFollowUpQuestion('a preco je to local-first', state), true, 'SP4 local-first follow-up must stay classified as follow-up');

const localFirstFollowUp = resolveDeterministicFollowUp('a preco je to local-first', state);

assert.equal(localFirstFollowUp, SP4_LOCAL_FIRST_NATURE, 'SP4 local-first follow-up must resolve to the canonical SP4 local-first fact');
assert.doesNotMatch(localFirstFollowUp, /intern[eé]\s+promptovanie|spresni/i, 'SP4 local-first follow-up must not fall into refusal or generic clarifier drift');

const memoryState = new DialogueState({ maxTurns: 6, topicDecayTurns: 4 });
memoryState.addTurn({ role: 'user', text: 'ako funguje SP4 memory?', topic: 'memory' });
memoryState.addTurn({ role: 'assistant', text: 'SP4 pamäť je lokálna a vrstvená: Raw Log, zhrnutia a Seeds.', topic: 'memory' });

assert.equal(isFollowUpQuestion('a ako funguje memory', memoryState), true, 'memory follow-up must stay classified as follow-up');

const memoryFollowUp = resolveDeterministicFollowUp('a ako funguje memory', memoryState);

assert.match(memoryFollowUp, /SP4 pam[aä]ť je lok[aá]lna a vrstven[aá]/i, 'memory follow-up must stay on the canonical memory explanation');
assert.doesNotMatch(memoryFollowUp, /Toto nebolo trafené|spresni/i, 'memory follow-up must not fall into generic fallback drift');

const ospfState = new DialogueState({ maxTurns: 6, topicDecayTurns: 4 });
ospfState.addTurn({ role: 'user', text: 'co je OSPF', topic: 'short_tech' });
ospfState.addTurn({ role: 'assistant', text: 'OSPF (Open Shortest Path First) je dynamický routing protokol pre IP siete. Routery si v ňom vymieňajú informácie o topológii a automaticky počítajú najlepšie trasy. Používa sa namiesto statických trás tam, kde má sieť viac routerov alebo sa mení topológia.', topic: 'short_tech' });

assert.equal(isFollowUpQuestion('a kedy by si ho pouzil namiesto statickych tras?', ospfState), true, 'OSPF kedy-follow-up must stay classified as follow-up');

const ospfKedyFollowUp = resolveDeterministicFollowUp('a kedy by si ho pouzil namiesto statickych tras?', ospfState);

assert.match(ospfKedyFollowUp, /OSPF/i, 'OSPF kedy-follow-up must keep the protocol subject');
assert.match(ospfKedyFollowUp, /routing|trasy/i, 'OSPF kedy-follow-up must stay in routing context');
assert.match(ospfKedyFollowUp, /dynam/i, 'OSPF kedy-follow-up must keep the dynamic-routing reason');
assert.doesNotMatch(ospfKedyFollowUp, /Toto nebolo trafené|spresni/i, 'OSPF kedy-follow-up must not fall into generic fallback drift');

// ── Meta-follow-up retroaktívne referencie (2026-04-16) ─────────────────────
// Repro: "čo je nové v sp4?" → téma project_direction → "ja som sa pýtal na novinky"
// Root cause: isFollowUpQuestion nerozpoznal retroaktívne formulácie → followUp=false → topic drop

const metaRefState = new DialogueState({ maxTurns: 6, topicDecayTurns: 4 });
metaRefState.addTurn({ role: 'user', text: 'co je nove v sp4?', topic: 'project_direction' });
metaRefState.addTurn({ role: 'assistant', text: 'SP4 je offline-first projekt.', topic: 'project_direction' });

assert.equal(
    isFollowUpQuestion('ja som sa pytal na novinky', metaRefState),
    true,
    'meta-followup "ja som sa pytal na novinky" must be classified as follow-up'
);
assert.equal(
    isFollowUpQuestion('pýtal som sa na novinky', metaRefState),
    true,
    'meta-followup "pýtal som sa na novinky" must be classified as follow-up'
);
assert.equal(
    isFollowUpQuestion('myslel som tie novinky', metaRefState),
    true,
    'meta-followup "myslel som tie novinky" must be classified as follow-up'
);
assert.equal(
    isFollowUpQuestion('tým myslím novinky', metaRefState),
    true,
    'meta-followup "tým myslím novinky" must be classified as follow-up'
);

// Kontrola: nové témové otázky sa nesmú falošne klasifikovať ako follow-up
assert.equal(
    isFollowUpQuestion('vysvetli mi ako funguje docker', metaRefState),
    false,
    'new-topic sentence starting with vysvetli mi must NOT be classified as follow-up'
);
assert.equal(
    isFollowUpQuestion('myslel som docker', metaRefState),
    false,
    'subject correction "myslel som docker" must NOT inherit the previous SP4 follow-up topic'
);
assert.equal(
    resolveDeterministicFollowUp('myslel som docker', metaRefState),
    null,
    'subject correction "myslel som docker" must not fall into the project-direction clarifier'
);
assert.equal(
    isFollowUpQuestion('pýtal som sa na docker', metaRefState),
    false,
    'subject correction "pýtal som sa na docker" must NOT inherit the previous SP4 follow-up topic'
);
assert.equal(
    isFollowUpQuestion('tým myslím docker', metaRefState),
    false,
    'subject correction "tým myslím docker" must NOT inherit the previous SP4 follow-up topic'
);
assert.equal(
    isFollowUpQuestion('takže poznáš sp4?', metaRefState),
    false,
    'explicit SP4 knowledge question must start a new deterministic system-info route, not inherit follow-up topic'
);
assert.equal(
    isFollowUpQuestion('ako dobre ovladas architekturu sp4?', metaRefState),
    false,
    'explicit SP4 architecture capability question must not inherit follow-up topic'
);
assert.equal(
    isFollowUpQuestion('laicky mi vysvetli co dokazes', metaRefState),
    false,
    'explicit capability question must not inherit follow-up topic'
);
assert.equal(
    isFollowUpQuestion('ako mi vies pomoct', metaRefState),
    false,
    'explicit help capability question must not inherit follow-up topic'
);

console.log('PASS: SP4 and memory follow-ups keep the last subject instead of falling into clarifier drift');
console.log('PASS: meta-follow-up retroactive references (pytal/myslel/tym myslim) correctly classified as follow-up');
