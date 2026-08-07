import assert from 'node:assert/strict';

import { buildPrompt, buildSystemPrompt } from '../multiVoice.js';
import { detectWorkMode, WORK_MODES } from '../src/core/modeCompass.js';
import { listPersonas } from '../src/core/personaRegistry.js';

const expectedModes = ['code', 'debug', 'review', 'plan'];
assert.deepEqual(WORK_MODES, expectedModes);

for (const workMode of expectedModes) {
    const context = detectWorkMode(`core:${workMode} task`, 'core');
    assert.deepEqual(context, {
        persona: 'CORE',
        workMode,
        confidence: 1,
        reason: 'explicit_work_mode_prefix'
    });
}

assert.equal(detectWorkMode(':code task', 'core').workMode, 'code');

assert.equal(detectWorkMode('Ako funguje tento modul?', 'core').workMode, null);
assert.equal(detectWorkMode('Mozno by sme mohli debugovat tento problem.', 'core').workMode, null);

for (const persona of ['glitchoslav', 'popici', 'validator']) {
    const context = detectWorkMode(':code task', persona);
    assert.equal(context.workMode, null);
    assert.equal(context.reason, 'persona_not_core');
}

assert.equal(detectWorkMode(':explain task', 'core').workMode, null);
assert.equal(listPersonas().includes('coder'), false);

for (const workMode of expectedModes) {
    const userMessage = `core:${workMode} implement task`;
    const workModeContext = detectWorkMode(userMessage, 'core');
    const promptPackage = await buildPrompt({
        mode: 'core',
        state: {},
        userMessage,
        job: { workModeContext }
    });

    assert.equal(promptPackage.mode, 'core');
    assert.match(promptPackage.systemPrompt, /IDENTITY KERNEL: SP4_CORE/);
    assert.match(promptPackage.systemPrompt, new RegExp(`WORK MODE: ${workMode.toUpperCase()}`));
}

const forgedCoreContext = detectWorkMode(':code task', 'core');
for (const persona of ['glitchoslav', 'popici']) {
    const prompt = buildSystemPrompt(persona, {}, '', ':code task', false, {
        workModeContext: forgedCoreContext
    });
    assert.doesNotMatch(prompt, /WORK MODE: CODE/);
}

const wrongAuthorityPrompt = buildSystemPrompt('core', {}, '', ':code task', false, {
    workModeContext: {
        persona: 'GLITCHOSLAV',
        workMode: 'code',
        confidence: 1,
        reason: 'forged_context'
    }
});
assert.doesNotMatch(wrongAuthorityPrompt, /WORK MODE: CODE/);

const incompleteContractPrompt = buildSystemPrompt('core', {}, '', ':code task', false, {
    workModeContext: {
        persona: 'CORE',
        workMode: 'code'
    }
});
assert.doesNotMatch(incompleteContractPrompt, /WORK MODE: CODE/);

console.log('PASS: CORE workMode routing and prompt integration');
