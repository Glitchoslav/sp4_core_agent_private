import assert from 'node:assert/strict';
import { buildVoiceBlock } from '../bridge-voice.js';
assert.equal(buildVoiceBlock(''), '');
assert.equal(buildVoiceBlock(null), '');
assert.ok(buildVoiceBlock('Buď krátky.').includes('## Komunitný hlas'));
assert.ok(buildVoiceBlock('Buď krátky.').includes('Buď krátky.'));
console.log('VOICE_BLOCK_OK');
