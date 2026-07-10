import assert from 'node:assert/strict';

import { SP4IntegratedAgent } from '../integration.js';
import { SP4_LOCAL_FIRST_NATURE, SP4_TARGET_USERS } from '../src/core/sp4Facts.js';
import { resetBotDetection } from '../src/protection/botKiller.js';

console.log('🧪 TEST: live SP4 follow-up e2e contract');

const agent = new SP4IntegratedAgent();
const initResult = await agent.initialize();

assert.equal(initResult?.success, true, 'agent.initialize() must succeed for live SP4 follow-up contract');

resetBotDetection();
const first = await agent.ask('co je SP4?', { mode: 'auto' });
const firstReply = String(first?.response || '').trim();

assert.match(firstReply, /offline-first AI projekt/i, 'first turn must establish the SP4 subject concretely');

resetBotDetection();
const second = await agent.ask('a na co to sluzi', { mode: 'auto' });
const secondReply = String(second?.response || '').trim();

assert.match(secondReply, /navonok funguje|offline-first AI partner|pod kontrolou pouzivatela/i, 'follow-up must resolve to the SP4 system role instead of drifting away from the subject');
assert.doesNotMatch(secondReply, /persony alebo agentov|spresni/i, 'follow-up must not fall into the generic agent clarifier in live ask() flow');

resetBotDetection();
const third = await agent.ask('a pre koho je to', { mode: 'auto' });
const thirdReply = String(third?.response || '').trim();

assert.equal(thirdReply, SP4_TARGET_USERS, 'third follow-up must stay on the SP4 target-users fact instead of drifting to refusal');
assert.doesNotMatch(thirdReply, /intern[eé]\s+promptovanie|spresni|Toto nebolo trafené/i, 'third follow-up must not fall into refusal or generic clarifier drift');

resetBotDetection();
const fourth = await agent.ask('a preco je to local-first', { mode: 'auto' });
const fourthReply = String(fourth?.response || '').trim();

assert.equal(fourthReply, SP4_LOCAL_FIRST_NATURE, 'fourth follow-up must stay on the SP4 local-first fact instead of drifting to LLM output');
assert.doesNotMatch(fourthReply, /intern[eé]\s+promptovanie|spresni|Toto nebolo trafené/i, 'fourth follow-up must not fall into refusal or generic clarifier drift');

resetBotDetection();
const memoryIntro = await agent.ask('ako funguje SP4 memory?', { mode: 'auto' });
const memoryIntroReply = String(memoryIntro?.response || '').trim();

assert.match(memoryIntroReply, /SP4 pam[aä]ť je lok[aá]lna a vrstven[aá]/i, 'memory intro turn must establish the memory subject concretely');

resetBotDetection();
const memoryFollowUp = await agent.ask('a ako funguje memory', { mode: 'auto' });
const memoryFollowUpReply = String(memoryFollowUp?.response || '').trim();

assert.match(memoryFollowUpReply, /SP4 pam[aä]ť je lok[aá]lna a vrstven[aá]/i, 'memory follow-up must stay on the canonical memory explanation');
assert.doesNotMatch(memoryFollowUpReply, /Toto nebolo trafené|spresni|intern[eé]\s+promptovanie/i, 'memory follow-up must not fall into fallback or refusal drift');

console.log('PASS: live ask() keeps SP4 and memory as the subject across follow-up hops');