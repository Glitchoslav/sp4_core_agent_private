import assert from 'node:assert/strict';
import { orchestrate } from '../orchestration/glitchOrchestrator.js';

console.log('🧪 TEST: gibberish input guard');

const result = await orchestrate('AKGKGKG', {});

assert.equal(result.handledBy, 'gibberish_guard');
assert.equal(result.response, 'To vyzerá ako náhodný vstup. Napíš to prosím normálne jednou vetou.');
assert.equal(result.meta?.shortcut, 'gibberish_input');

console.log('✅ Gibberish input guard works');
