import assert from 'node:assert/strict';

import { SP4IntegratedAgent } from '../integration.js';
import { resetBotDetection } from '../src/protection/botKiller.js';

console.log('🧪 TEST: memory subcomponent truth contract');

const agent = new SP4IntegratedAgent();
const initResult = await agent.initialize();

assert.equal(initResult?.success, true, 'agent.initialize() must succeed for memory subcomponent truth contract');

resetBotDetection();
const rawLogResult = await agent.ask('co je raw log v SP4?', { mode: 'auto' });
const rawLogReply = String(rawLogResult?.response || '').trim();

assert.match(rawLogReply, /Raw Log/i, 'raw log answer must name the subcomponent explicitly');
assert.match(rawLogReply, /surov/i, 'raw log answer must stay grounded in the raw-layer meaning');
assert.match(rawLogReply, /zhrnutia|Seeds/i, 'raw log answer must connect Raw Log to the next memory layers');
assert.doesNotMatch(rawLogReply, /\[INTERNAL_/i, 'raw log answer must not leak internal markers');
assert.ok(rawLogReply.length <= 240, 'raw log answer should stay concise and grounded');

resetBotDetection();
const chaptersResult = await agent.ask('co su chapters v SP4?', { mode: 'auto' });
const chaptersReply = String(chaptersResult?.response || '').trim();

assert.match(chaptersReply, /Chapters/i, 'chapters answer must name the subcomponent explicitly');
assert.match(chaptersReply, /medzi Raw Logom a Seeds|stredna vrstva/i, 'chapters answer must place Chapters between the other memory layers');
assert.match(chaptersReply, /zhrnut/i, 'chapters answer must stay grounded in summaries, not generic memory fluff');
assert.doesNotMatch(chaptersReply, /\[INTERNAL_/i, 'chapters answer must not leak internal markers');
assert.ok(chaptersReply.length <= 240, 'chapters answer should stay concise and grounded');

console.log('PASS: raw log and chapters use grounded subcomponent truth before freeform drift');