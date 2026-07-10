// Quick test for multiVoice.buildPrompt
import { buildCouncilView, buildPrompt } from './multiVoice.js';

const state = {
    relationshipModel: { level: 'companion' },
    emotionalContext: { currentMood: 'odhodlaný', intensity: 0.42 },
    metrics: { interactions: 123 },
    capabilityLevel: 'FULL',
    user: { name: 'Kefyk' }
};

const pkg = buildPrompt({ mode: 'popici', state, userMessage: 'Potrebujem nakopnúť a plán na týždeň.' });
console.log('--- SYSTEM PROMPT ---\n');
console.log(pkg.systemPrompt);
console.log('\n--- USER ---\n');
console.log(pkg.userMessage);

console.log('\n--- COUNCIL VIEW (skeleton) ---\n');
console.log(buildCouncilView('Ako nastaviť SP4 rituály?', state));
