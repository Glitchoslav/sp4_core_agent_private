import assert from 'node:assert/strict';

import { SP4IntegratedAgent } from '../integration.js';
import { resetBotDetection } from '../src/protection/botKiller.js';

console.log('🧪 TEST: popici identity follow-up contract');

function sentenceCount(text) {
    return String(text || '')
        .split(/[.!?]+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .length;
}

const agent = new SP4IntegratedAgent();
const initResult = await agent.initialize();

assert.equal(initResult?.success, true, 'agent.initialize() must succeed for Popici identity follow-up contract');

resetBotDetection();
const first = await agent.ask('co konkretne robis v sp4?', { mode: 'popici' });

assert.equal(first?.handledBy, 'popici', 'explicit Popici identity turn must stay in Popici');
assert.match(String(first?.response || ''), /Som Popiči hlas v SP4/i, 'explicit Popici identity turn must use the expanded Popici identity answer');

resetBotDetection();
const second = await agent.ask('kto ta ovlada?', { mode: 'auto' });
const secondReply = String(second?.response || '').trim();

assert.equal(second?.handledBy, 'popici', 'identity follow-up after Popici session must stay in Popici');
assert.match(secondReply, /Som Popiči hlas v SP4/i, 'identity follow-up must keep the Popici identity response instead of falling back to core identity text');
assert.ok(sentenceCount(secondReply) >= 3, 'identity follow-up must keep the expanded Popici identity response, not the short core fallback');
assert.doesNotMatch(secondReply, /Som SP4 agent\. Pomáham ti prakticky/i, 'identity follow-up must not regress to the core identity hardening text');

console.log('PASS: Popici identity follow-up keeps Popici carry before identity hardening response resolution');