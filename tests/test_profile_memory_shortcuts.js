import assert from 'node:assert/strict';

import { DialogueState, isFollowUpQuestion, resolveDeterministicFollowUp } from '../src/dialogue/dialogueState.js';
import {
    buildProfileMemoryShortcutResponse,
    detectProfileMemoryShortcutKind,
} from '../src/services/profileMemoryShortcuts.js';

console.log('🧪 TEST: profile memory shortcuts');

const seed = {
    username: 'kefyk',
    intent: 'pokoj,slobodu,život a lásku',
    fear: 'Še NEBOJ!',
    created_at: '2025-11-22T12:53:53.627Z',
    projects: ['SP4_CORE_AGENT', 'SP4OT token', 'BadLabs integration', 'Glitchoslav orchestration'],
};

const memory = {
    rawMemory: {
        log: [
            { input: 'čo je firewall', reply: 'x' },
            { input: 'ako funguje sp4', reply: 'x' },
            { input: 'čo si o mne pamätáš', reply: 'x' },
        ],
        stats: { totalInteractions: 3 }
    },
    userProfile: {
        id: 'kefyk',
        name: 'Kefyk',
        style: 'popici-filozof',
    },
    relationship: {
        stage: 'stranger',
        metrics: {
            interactionCount: 3,
            deepConversations: 0,
            ritualsCompleted: 0,
            vulnerabilityMoments: 0,
        },
        milestones: []
    }
};

assert.equal(detectProfileMemoryShortcutKind('kto som?'), 'whoami');
assert.equal(detectProfileMemoryShortcutKind('co si o mne pamatas?'), 'memory_about_user');
assert.equal(detectProfileMemoryShortcutKind('co o mne vies?'), 'memory_about_user');
assert.equal(detectProfileMemoryShortcutKind('ako sa volam?'), 'profile_name');
assert.equal(detectProfileMemoryShortcutKind('aky mam styl?'), 'profile_style');
assert.equal(detectProfileMemoryShortcutKind('čo máš uložené omne?'), 'memory_stored_about_user');
assert.equal(detectProfileMemoryShortcutKind('máš pamet? co si pametas?'), 'memory_about_user');
assert.equal(detectProfileMemoryShortcutKind('pamatas si ma?'), 'memory_about_user');
assert.equal(detectProfileMemoryShortcutKind('máš pamäť?'), 'memory_status');
assert.equal(detectProfileMemoryShortcutKind('vyvija sa spravnym smerom?'), 'longterm_project_direction');
assert.equal(detectProfileMemoryShortcutKind('kam sa to posuva?'), 'longterm_project_direction');
assert.equal(detectProfileMemoryShortcutKind('kto tvori komunitu sp4?'), 'sp4_community');
assert.equal(detectProfileMemoryShortcutKind('kto tvori kmen?'), 'sp4_community');
assert.equal(detectProfileMemoryShortcutKind('ako funguje pamäť v sp4?'), null);

const whoAmI = await buildProfileMemoryShortcutResponse('kto som?', { seed, memory });
assert.match(whoAmI, /Ty si kefyk\./i);
assert.match(whoAmI, /Chceš pokoj, slobodu, život a lásku\./i);
assert.match(whoAmI, /Bojíš sa Še NEBOJ!/i);

const memoryAboutUser = await buildProfileMemoryShortcutResponse('co si o mne pamatas?', { seed, memory });
assert.match(memoryAboutUser, /Pamätám si, že si Kefyk/i);
assert.match(memoryAboutUser, /pokoj, slobodu, život a lásku/i);
assert.match(memoryAboutUser, /popici-filozof/i);
assert.match(memoryAboutUser, /SP4_CORE_AGENT/i);
assert.match(memoryAboutUser, /3 záznamy v logu rozhovorov/i);

const whatDoYouKnow = await buildProfileMemoryShortcutResponse('co o mne vies?', { seed, memory });
assert.match(whatDoYouKnow, /Kefyk/i);
assert.match(whatDoYouKnow, /popici-filozof/i);

const profileName = await buildProfileMemoryShortcutResponse('ako sa volam?', { seed, memory });
assert.match(profileName, /Voláš sa Kefyk/i);

const profileStyle = await buildProfileMemoryShortcutResponse('aky mam styl?', { seed, memory });
assert.match(profileStyle, /popici-filozof/i);

const storedAboutUser = await buildProfileMemoryShortcutResponse('čo máš uložené omne?', { seed, memory });
assert.match(storedAboutUser, /O tebe mám uložené/i);
assert.match(storedAboutUser, /že si kefyk/i);
assert.match(storedAboutUser, /SP4OT token/i);

const memoryStatus = await buildProfileMemoryShortcutResponse('máš pamäť?', { seed, memory });
assert.match(memoryStatus, /Mám lokálnu pamäť/i);
assert.match(memoryStatus, /3 záznamy v živom logu rozhovorov/i);

const longtermDirection = await buildProfileMemoryShortcutResponse('vyvija sa spravnym smerom?', { seed, memory });
assert.match(longtermDirection, /SP4 smeruje k hlbšej lokálnej AI integrácii|lokálnej AI integrácii/i);

const communityText = await buildProfileMemoryShortcutResponse('kto tvori komunitu sp4?', { seed, memory });
assert.match(communityText, /SP4 tvorí kmeň reálnych ľudí okolo Kefyka/i);

const whoAmIFollowUpState = new DialogueState({ maxTurns: 6, topicDecayTurns: 4 });
whoAmIFollowUpState.addTurn({ role: 'user', text: 'kto som?' });
whoAmIFollowUpState.addTurn({
    role: 'assistant',
    text: 'Ty si kefyk. Chceš pokoj, slobodu, život a lásku. Bojíš sa Še NEBOJ!.'
});

assert.equal(isFollowUpQuestion('ako vieš kto som', whoAmIFollowUpState), true);
const memorySourceFollowUp = resolveDeterministicFollowUp('ako vieš?', whoAmIFollowUpState);
assert.match(memorySourceFollowUp, /zo seedu používateľa/i);
assert.match(memorySourceFollowUp, /živom logu rozhovorov/i);

const memorySourceFollowUpLong = resolveDeterministicFollowUp('ako vieš kto som', whoAmIFollowUpState);
assert.match(memorySourceFollowUpLong, /nie z veštenia/i);

const followUpState = new DialogueState({ maxTurns: 6, topicDecayTurns: 4 });
followUpState.addTurn({ role: 'user', text: 'co si o mne pamatas?' });
followUpState.addTurn({
    role: 'assistant',
    text: '🧠 CORE: Pamätám si, že si kefyk, že chceš pokoj, slobodu, život a lásku. V živej pamäti mám navyše 200 záznamov v logu rozhovorov, ale citlivé veci nesypem naslepo bez kontextu.'
});

const countFollowUp = resolveDeterministicFollowUp('akych 200 zaznamov?', followUpState);
assert.match(countFollowUp, /raw memory logu rozhovorov/i);
assert.doesNotMatch(countFollowUp, /persony alebo agentov/i);
assert.match(countFollowUp, /200 záznamov/i);

const countFollowUpShort = resolveDeterministicFollowUp('200 zaznamov z pameti', followUpState);
assert.match(countFollowUpShort, /nie 200 faktov o tebe/i);

const countFollowUpParaphrase = resolveDeterministicFollowUp('ake zaznamy myslis?', followUpState);
assert.match(countFollowUpParaphrase, /200 záznamov/i);
assert.match(countFollowUpParaphrase, /raw memory logu rozhovorov/i);

const countFollowUpLogs = resolveDeterministicFollowUp('kolko logov tam drzis?', followUpState);
assert.match(countFollowUpLogs, /200 záznamov/i);
assert.match(countFollowUpLogs, /nie 200 záznamov faktov o tebe|nie 200 faktov o tebe/i);

console.log('  PASS [whoami]');
console.log(`  ${whoAmI.split('\n').slice(0, 3).join(' | ')}`);
console.log('  PASS [memory about user]');
console.log(`  ${memoryAboutUser}`);
console.log('  PASS [memory stored about user]');
console.log(`  ${storedAboutUser}`);
console.log('  PASS [memory status]');
console.log(`  ${memoryStatus}`);
console.log('  PASS [longterm direction + community]');
console.log(`  ${longtermDirection} | ${communityText}`);
console.log('  PASS [memory source follow-up]');
console.log(`  ${memorySourceFollowUpLong}`);
console.log('  PASS [memory count follow-up]');
console.log(`  ${countFollowUp}`);
console.log('  PASS [memory count paraphrases]');
console.log(`  ${countFollowUpLogs}`);
console.log('✅ Profile memory shortcuts work');
