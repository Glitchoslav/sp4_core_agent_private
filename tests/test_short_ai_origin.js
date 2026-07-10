import assert from 'node:assert/strict';
import { orchestrate } from '../orchestration/glitchOrchestrator.js';

console.log('🧪 TEST: short ask_ai_origin shortcut');

const result = await orchestrate('kto si?', {});

assert.equal(result.handledBy, 'glitchoslav');
assert.equal(result.action, 'shortcut');
assert.equal(result.meta?.shortcut, 'ask_ai_origin_short');
assert.match(result.response, /^Som Glitchoslav,/);
assert.ok(result.response.length < 140, 'identity shortcut must stay short');
assert.ok(!/I am|As an AI|language model/i.test(result.response), 'must stay Slovak and avoid AI boilerplate');

console.log('✅ Short ask_ai_origin shortcut works');
