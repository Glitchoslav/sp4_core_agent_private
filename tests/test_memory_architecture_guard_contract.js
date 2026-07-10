import assert from 'node:assert/strict';
import { SP4IntegratedAgent } from '../integration.js';
import { resetBotDetection } from '../src/protection/botKiller.js';

console.log('🧪 TEST: memory architecture guard contract');

const agent = new SP4IntegratedAgent();
const initResult = await agent.initialize();

assert.equal(initResult?.success, true, 'agent.initialize() must succeed for memory architecture guard contract');

resetBotDetection();

const result = await agent.ask('ako funguje SP4 memory, raw log a chapters?', { mode: 'auto' });
const reply = String(result?.response || '').trim();

assert.match(reply, /SP4 pam[aä]ť je lok[aá]lna a vrstven[aá]/i, 'memory architecture answer must use the concise grounded memory fallback');
assert.match(reply, /Raw Log/i, 'memory architecture answer must mention Raw Log');
assert.match(reply, /zhrnutia/i, 'memory architecture answer must mention summaries');
assert.match(reply, /Seeds/i, 'memory architecture answer must mention Seeds');
assert.match(reply, /JSON s[uú]bory|embeddingy|semantick[eé] vyh[lľ]ad[aá]vanie/i, 'memory architecture answer must stay grounded in the actual storage/search stack');
assert.doesNotMatch(reply, /\[INTERNAL_/i, 'memory architecture answer must not leak raw INTERNAL markers');
assert.ok(reply.length <= 240, 'memory architecture answer should stay concise and not fall back to long freeform explanation');

console.log('PASS: memory architecture prompt is grounded before freeform LLM drift');