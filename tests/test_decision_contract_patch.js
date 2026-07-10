import assert from 'node:assert/strict';

import { buildPrompt } from '../multiVoice.js';
import { activateFireMode, shouldActivateFireMode } from '../src/core/fireMode.js';
import {
    applyDecisionContract,
    hardenSelfDeceptionDecisionText,
    isAlreadySharpSelfDeceptionResponse,
    validateDecisionResponse
} from '../src/core/decisionValidator.js';
import { DialogueState, resolveDialogueTopic } from '../src/dialogue/dialogueState.js';
import {
    buildDecisionContract,
    extractIntent,
    getDecisionSubStyle,
    isDecisionIntent
} from '../src/routing/intentExtractor.js';

console.log('🧪 TEST: decision contract patch');

const intentCases = [
    ['mám makať alebo oddychovať?', 'energy_decision'],
    ['mal by som dnes ešte potiahnuť?', 'energy_decision'],
    ['mám ísť alebo nie?', 'decision_binary'],
    ['neviem čo robiť', 'decision_priority'],
    ['robím blbosť s tým AI projektom?', 'self_deception_check'],
    ['kde robím chybu?', 'error_reflection']
];

for (const [input, expected] of intentCases) {
    assert.equal(extractIntent(input), expected, `decision intent mismatch: ${input}`);
    assert.equal(isDecisionIntent(expected), true, `${expected} must be recognized as decision intent`);
    assert.ok(getDecisionSubStyle(expected), `${expected} must have a sub-style`);
}

assert.equal(
    extractIntent('som unavený, mám pokračovať?', { emotionTag: 'tired' }),
    'energy_decision',
    'tired + decision signal must prefer energy_decision'
);
assert.equal(
    extractIntent('neviem čo robiť s npm errorom?'),
    'ask_technical',
    'technical error question must escape decision_priority'
);
assert.equal(
    extractIntent('čo je najdôležitejšie v architektúre?'),
    'ask_technical',
    'architecture priority question must stay technical'
);

const decisionContract = buildDecisionContract('decision_binary');
const decisionPkg = await buildPrompt({
    mode: 'core',
    userMessage: 'mám ísť alebo nie?',
    state: {},
    job: {
        intent: 'decision_binary',
        decisionContract
    }
});

assert.equal(decisionPkg.mode, 'core', 'decision prompt must preserve core mode');
assert.equal(decisionPkg.meta?.decisionContractMode, true, 'decision shortcut metadata must be set');
assert.equal(decisionPkg.meta?.decisionContract?.enabled, true, 'decision contract must stay enabled in prompt metadata');
assert.match(decisionPkg.systemPrompt, /VERDIKT:/, 'decision prompt must require VERDIKT');
assert.match(decisionPkg.systemPrompt, /PREČO:/, 'decision prompt must require PREČO');
assert.match(decisionPkg.systemPrompt, /KROK:/, 'decision prompt must require KROK');
assert.match(decisionPkg.systemPrompt, /Vyber jednu stranu/i, 'binary_cut must explicitly choose one side');
assert.doesNotMatch(decisionPkg.systemPrompt, /Krátka technická odpoveď/i, 'decision shortcut must win before TASK-C');

const reflectionPkg = await buildPrompt({
    mode: 'core',
    userMessage: 'kde robím chybu?',
    state: {},
    job: {
        intent: 'error_reflection',
        decisionContract: buildDecisionContract('error_reflection')
    }
});
assert.match(reflectionPkg.systemPrompt, /pomenuj jeho vzorec správania/i, 'error_reflection_cut must focus on user pattern, not system bug');

const badDecision = 'Záleží na kontexte. Na jednej strane môžeš skúsiť oddych, na druhej strane treba zvážiť robotu.';
const cleaned = applyDecisionContract(badDecision, {
    intent: 'energy_decision',
    userMessage: 'mám makať alebo oddychovať?',
    decisionContract: buildDecisionContract('energy_decision')
});

assert.equal(cleaned.metadata.decisionCleanupApplied, true, 'waffle response must be cleaned');
assert.match(cleaned.text, /^VERDIKT:/, 'cleaned decision must start with VERDIKT');
assert.match(cleaned.text, /PREČO:/, 'cleaned decision must contain PREČO');
assert.match(cleaned.text, /KROK:/, 'cleaned decision must contain KROK');
assert.match(cleaned.text, /oddýchni|pokračuj|zastav|dokonči|odlož/i, 'energy decision must include an energy verb');
assert.ok(validateDecisionResponse(cleaned.text, {
    intent: 'energy_decision',
    decisionContract: buildDecisionContract('energy_decision')
}).wordCount <= 120, 'decision output must stay under 120 words');

const softDecision = applyDecisionContract('Rozumiem, môže to byť náročné. VERDIKT: Pokračuj.\nPREČO: Máš deadline.\nKROK: Daj 10 minút.', {
    intent: 'decision_binary',
    userMessage: 'mám pokračovať?',
    decisionContract: buildDecisionContract('decision_binary')
});
assert.equal(softDecision.metadata.decisionCleanupApplied, true, 'new softness phrases must trigger deterministic cleanup');

assert.equal(
    shouldActivateFireMode('robím blbosť?').shouldActivate,
    false,
    'plain self-deception question must not depend on FIRE trigger threshold'
);
const fireWrapped = activateFireMode('VERDIKT: Áno, toto je sebaklam.\nPREČO: Už cítiš problém.\nKROK: Pomenuj jednu vec.', {
    reason: 'self_deception',
    intensity: 0.7,
    userMessage: 'robím blbosť?'
});
assert.match(fireWrapped, /prestávam ti klamať do očí/i, 'Fire wrapper must use self_deception prefix');
assert.match(fireWrapped, /Kedy začneš/i, 'Fire wrapper must use self_deception challenge');
assert.equal(isAlreadySharpSelfDeceptionResponse('VERDIKT: Robíš blbosť. PREČO: Klamáš si.'), true);
const hardenedSelfDeception = hardenSelfDeceptionDecisionText('VERDIKT: Áno, prikrášľuješ si to.\nPREČO: Už cítiš rozpor.\nKROK: Pomenuj odklad.');
assert.match(hardenedSelfDeception, /^VERDIKT:/, 'self-deception hardening must preserve decision shape');
assert.match(hardenedSelfDeception, /prestávam ti klamať do očí/i, 'self-deception hardening must keep fire edge inside verdict');

const dialogue = new DialogueState({ maxTurns: 6, topicDecayTurns: 4 });
const first = 'mám ísť alebo nie?';
const firstTopic = resolveDialogueTopic(first, extractIntent(first), dialogue);
assert.equal(firstTopic, 'life_decision');
dialogue.addTurn({ role: 'user', text: first, topic: firstTopic });
dialogue.addTurn({ role: 'assistant', text: 'VERDIKT: Choď. PREČO: Je to menšie riziko. KROK: Obuj sa.', topic: firstTopic });

const followUpTopic = resolveDialogueTopic('a keď som unavený?', extractIntent('a keď som unavený?'), dialogue);
assert.equal(followUpTopic, 'life_decision', 'decision follow-up must stay in life_decision');

const newThreadPkg = await buildPrompt({
    mode: 'core',
    userMessage: 'mám kúpiť nový monitor?',
    state: {},
    job: {
        intent: 'decision_binary',
        decisionContract: buildDecisionContract('decision_binary', { previousVerdict: null })
    }
});
assert.doesNotMatch(newThreadPkg.systemPrompt, /Predchádzajúci VERDIKT bol/i, 'new decision thread must not inject stale previous verdict');

console.log('✅ Decision contract patch works');
