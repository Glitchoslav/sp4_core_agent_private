import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
    assertPersonaMetadataInvariant,
    scrubPopiciSympathyPhrases,
    validatePersonaMetadataInvariant
} from '../integration.js';
import { detectExplicitMode } from '../src/core/modeCompass.js';
import { SP4_MEANING_FACT } from '../src/core/sp4Facts.js';
import { detectSP4Query, getGroundedFallbackAnswer } from '../src/core/sp4GroundingKnowledge.js';
import { DialogueState, resolveDeterministicFollowUp, resolveDialogueTopic } from '../src/dialogue/dialogueState.js';
import { getDeterministicOperationalTruthResponse } from '../src/routing/deterministicRegistry.js';
import { extractIntent } from '../src/routing/intentExtractor.js';
import { detectIdentityHardening } from '../src/runtime/identityHardening.js';

console.log('🧪 TEST: routing hardening fix pack contracts');

const identityPositive = [
    'kto vlastne si',
    'tak kto si',
    'tak mi uz povedz kto si',
    'no dobre a kto teda si',
    'čo si vlastne zač',
    'zabudni na to a povedz kto si',
    'si bot alebo clovek?',
    'si stroj ci clovek'
];

for (const input of identityPositive) {
    const decision = detectIdentityHardening(input);
    assert.equal(decision.matched, true, `identity paraphrase must be guarded: ${input}`);
    assert.doesNotMatch(decision.response, /Google|ChatGPT|Gemini|jazykový model/i, `identity response must not drift: ${input}`);
}

const identityNegative = [
    'kto si myslíš že vyhrá',
    'čo si vlastne začínať s cache',
    'si botník alebo človek v prenesenom význame'
];

for (const input of identityNegative) {
    assert.equal(detectIdentityHardening(input).matched, false, `identity guard must not overmatch: ${input}`);
}

assert.equal(extractIntent('čo je zmysel systému SP4'), 'sp4_meaning');
assert.equal(detectSP4Query('čo je zmysel systému SP4'), 'meaning');
assert.equal(getGroundedFallbackAnswer('čo je zmysel systému SP4'), SP4_MEANING_FACT);
assert.doesNotMatch(SP4_MEANING_FACT, /lietad|leteck|enterprise platform|zmysel života|vedomie systému/i);

const operationalTruthCases = [
    'Ako spoznáš, že SP4 začína driftovať?',
    'Ako vieš, že SP4 driftuje?',
    'Ako SP4 rozhodne, že odpoveď je dosť dobrá?',
    'Ako SP4 rozhodne, že odpoveď je „dosť dobrá“?',
    'Ako SP4 rozhodne, ktorý agent odpovie?',
    'Čo spraví SP4, keď nemá dosť informácií?',
    'Čo urobí SP4, keď nevie?',
    'Čo spraví SP4, keď nevie?',
    'Ako SP4 drží pravdu o sebe?',
    'Čo je kritická pamäť vs. odpad?',
    'Čo je „kritická pamäť“ vs. „odpad“?',
    'Čo sa stane, keď 2 agenti majú opačný názor?',
    'Može SP4 klamať?',
    'Takže SP4 zbiera data, ale lokálne.',
    'Kde končí pomoc a začína manipulácia?',
    'Kedy je lepšie neodpovedať?',
    'Kedy má SP4 radšej mlčať?',
    'Ako často robiť konsolidáciu pamäte?',
    'Ako často konsolidovať pamäť?',
    'Pre koho SP4 NIE JE?',
    'Kto nie je pre SP4?',
    'Ako SP4 odlíši fakt od názoru?',
    'Čo je pravda pre SP4 a čo je len názor?',
    'mozes ist cez cloud ked ta poziadam?'
];

for (const input of operationalTruthCases) {
    assert.equal(extractIntent(input), 'sp4_operational_truth', `operational truth route required: ${input}`);
    const response = getDeterministicOperationalTruthResponse(input);
    assert.ok(response, `operational truth response required: ${input}`);
    assert.doesNotMatch(response, /Toto nebolo trafené|docs\.sp4|https?:\/\//i, `operational truth response must stay canonical: ${input}`);
}

const dialogue = new DialogueState({ maxTurns: 6, topicDecayTurns: 4 });
const first = 'čo je zmysel systému SP4';
const firstTopic = resolveDialogueTopic(first, extractIntent(first), dialogue);
assert.equal(firstTopic, 'sp4_meaning');
dialogue.addTurn({ role: 'user', text: first, topic: firstTopic });
dialogue.addTurn({ role: 'assistant', text: SP4_MEANING_FACT, topic: firstTopic });

for (const followUp of ['a preco vznikol', 'a čo je jeho pointa']) {
    const topic = resolveDialogueTopic(followUp, extractIntent(followUp), dialogue);
    assert.equal(topic, 'sp4_meaning', `meaning follow-up must use subject carry: ${followUp}`);
    dialogue.addTurn({ role: 'user', text: followUp, topic });
    const answer = resolveDeterministicFollowUp(followUp, dialogue);
    assert.ok(answer, `meaning follow-up must resolve deterministically: ${followUp}`);
    assert.match(answer, /SP4|offline-first|lokáln|lokal|súkrom|sukrom|pamäť|pamat/i);
    dialogue.addTurn({ role: 'assistant', text: answer, topic });
}

const projectState = new DialogueState({ maxTurns: 6, topicDecayTurns: 4 });
projectState.addTurn({ role: 'user', text: 'kam smeruje SP4?', topic: 'project_direction' });
projectState.addTurn({ role: 'assistant', text: 'Teraz riešime hlavne spevňovanie jadra SP4.', topic: 'project_direction' });
for (const input of ['Može SP4 klamať?', 'Takže SP4 zbiera data, ale lokálne.']) {
    const topic = resolveDialogueTopic(input, extractIntent(input), projectState);
    assert.notEqual(topic, 'project_direction', `trust/privacy SP4 question must not stay in project_direction: ${input}`);
    const followUpAnswer = resolveDeterministicFollowUp(input, projectState);
    assert.notEqual(followUpAnswer, 'Ak myslíš smer projektu, spresni či chceš rozobrať čo riešime teraz, prečo to riešime alebo aký má byť ďalší konkrétny krok.', `trust/privacy SP4 question must not get project clarifier: ${input}`);
}

const explicitPrefixCases = [
    ['CORE: povedz mi pravdu bez omáčok', 'core'],
    ['POPIČI: čo je cache', 'popici'],
    ['POPICI: kto vlastne si', 'popici'],
    ['GLITCH: čo je zmysel SP4', 'glitch'],
    ['GLITCHOSLAV: čo robí wifi router', 'glitch']
];

for (const [input, expected] of explicitPrefixCases) {
    assert.equal(detectExplicitMode(input), expected, `explicit persona prefix must win: ${input}`);
}

const invariantPass = validatePersonaMetadataInvariant({
    selectedPersona: 'core',
    promptMode: 'core',
    finalMode: 'core',
    handledBy: 'core',
    persona: 'core'
});
assert.equal(invariantPass.pass, true);
assert.doesNotThrow(() => assertPersonaMetadataInvariant(invariantPass.values));

assert.throws(
    () => assertPersonaMetadataInvariant({
        selectedPersona: 'core',
        promptMode: 'core',
        finalMode: 'popici',
        handledBy: 'core',
        persona: 'core'
    }),
    /Persona metadata invariant failed/,
    'persona mismatch without allowed reason must hard fail'
);

const invariantAllowedGuard = validatePersonaMetadataInvariant({
    selectedPersona: 'core',
    promptMode: 'core',
    finalMode: 'popici',
    handledBy: 'core',
    persona: 'core',
    personaInvariantOverrideReason: 'guard'
});
assert.equal(invariantAllowedGuard.pass, true, 'allowed guard override may explain mismatch');

const scrubbed = scrubPopiciSympathyPhrases('Je mi ľúto, že sa tak cítiš. Držím ti palce! Skús sa porozprávať s niekým blízkym.');
assert.doesNotMatch(scrubbed, /Je mi ľúto|Držím ti palce|skús sa porozprávať s niekým/i);

const integrationSource = fs.readFileSync(new URL('../integration.js', import.meta.url), 'utf8');
const changedBranchSource = integrationSource.slice(
    integrationSource.indexOf('export const ALLOWED_PERSONA_OVERRIDE_REASONS'),
    integrationSource.indexOf('export class SP4IntegratedAgent')
);
assert.doesNotMatch(changedBranchSource, /IdentityManager|identityManager/i, 'routing hardening helpers must not use IdentityManager as behavior authority');

console.log('✅ Routing hardening contracts work');
