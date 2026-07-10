import assert from 'node:assert/strict';

import { buildPrompt } from '../multiVoice.js';

console.log('🧪 TEST: short-tech prompt routing');

const conversationalCases = [
    'kde ste?',
    'kedy prideš ku mne?',
];

for (const userMessage of conversationalCases) {
    const pkg = await buildPrompt({ mode: 'core', userMessage, state: {} });
    assert.equal(pkg.meta?.shortTechMode === true, false, `short-tech mode must stay off for conversational query: ${userMessage}`);
    assert.doesNotMatch(pkg.systemPrompt, /Krátka technická odpoveď/i, `mini tech prompt must not be used for conversational query: ${userMessage}`);
}

const technicalPkg = await buildPrompt({ mode: 'core', userMessage: 'čo robí wifi router', state: {} });
assert.equal(technicalPkg.meta?.shortTechMode, true, 'short-tech mode should stay enabled for a simple technical query');
assert.match(technicalPkg.systemPrompt, /Krátka technická odpoveď/i, 'technical query should keep the mini tech prompt');

console.log('✅ Short-tech prompt routing works');