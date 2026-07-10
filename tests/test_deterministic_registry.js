import assert from 'node:assert/strict';
import fs from 'node:fs';
import yaml from 'js-yaml';
import { RuleMiner } from '../ruleMiner.js';
import {
    getDeterministicCapabilityResponse,
    getDeterministicCurrentEventsResponse,
    getDeterministicGibberishResponse,
    getDeterministicOperationalTruthResponse,
    getDeterministicPublicContextResponse,
    getDeterministicShortTechResponse,
    getDeterministicSmalltalkResponse,
    getDeterministicSystemInfoResponse,
    getShortAiOriginResponse,
    isLikelyGibberishInput,
    shouldUsePopiciEdgeShortcut,
    shouldUseShortAiOriginShortcut
} from '../src/routing/deterministicRegistry.js';
import { extractIntent } from '../src/routing/intentExtractor.js';

console.log('🧪 TEST: deterministic registry');

const sp4Definition = getDeterministicSystemInfoResponse('čo je sp4?');
assert.ok(sp4Definition);
assert.match(sp4Definition, /offline-first AI projekt/i);
assert.equal(extractIntent('a čo je to SP4?'), 'sp4_system_info');

const sp4Version = getDeterministicSystemInfoResponse('aka je verzia sp4?');
assert.ok(sp4Version);
assert.match(sp4Version, /1\.4\.0/i);
assert.equal(extractIntent('nevies aka je aktualna verzia systemu sp4?'), 'sp4_system_info');

const sp4Goal = getDeterministicSystemInfoResponse('aký je cieľ sp4?');
assert.ok(sp4Goal);
assert.match(sp4Goal, /Cieľ SP4/i);

const sp4Meaning = getDeterministicSystemInfoResponse('čo je zmysel systému SP4');
assert.ok(sp4Meaning);
assert.match(sp4Meaning, /SP4/i);
assert.match(sp4Meaning, /offline-first|lokáln|lokal/i);
assert.match(sp4Meaning, /kontrol|súkrom|sukrom|pamäť|pamat|partner/i);
assert.doesNotMatch(sp4Meaning, /lietad|leteck|enterprise platform|zmysel života|vedomie systému/i);

const sp4Known = getDeterministicSystemInfoResponse('takže poznáš sp4?');
assert.ok(sp4Known);
assert.match(sp4Known, /offline-first|runtime|pam[aä][ťt]|guard|routing/i);
assert.equal(extractIntent('takže poznáš sp4?'), 'sp4_system_info');

const sp4ArchitectureSkill = getDeterministicSystemInfoResponse('ako dobre ovladas architekturu sp4?');
assert.ok(sp4ArchitectureSkill);
assert.match(sp4ArchitectureSkill, /Architekt[uú]ra SP4|runtime|routing|pam[aä][ťt]/i);
assert.equal(extractIntent('ako dobre ovladas architekturu sp4?'), 'sp4_system_info');

const selfCapability = getDeterministicCapabilityResponse('laicky mi vysvetli co dokazes');
assert.ok(selfCapability);
assert.match(selfCapability, /k[oó]dom|chyby|kontext|architekt[uú]ru SP4|limit/i);
assert.equal(extractIntent('laicky mi vysvetli co dokazes'), 'ask_capability');

const helpCapability = getDeterministicCapabilityResponse('ako mi vies pomoct');
assert.ok(helpCapability);
assert.match(helpCapability, /vysvet[lľ]ovať|k[oó]dom|ďalší praktický krok|dalsi prakticky krok/i);
assert.equal(extractIntent('ako mi vies pomoct'), 'ask_capability');

const driftDetection = getDeterministicOperationalTruthResponse('Ako spoznáš, že SP4 začína driftovať?');
assert.ok(driftDetection);
assert.match(driftDetection, /drift/i);
assert.match(driftDetection, /routing|prompt|validator|persona/i);
assert.equal(extractIntent('Ako spoznáš, že SP4 začína driftovať?'), 'sp4_operational_truth');

const insufficientInfo = getDeterministicOperationalTruthResponse('Čo spraví SP4, keď nemá dosť informácií?');
assert.ok(insufficientInfo);
assert.match(insufficientInfo, /nem[aá]\s+si/i);
assert.match(insufficientInfo, /limit|nevie|deterministic truth/i);

const insufficientInfoSpraviNevie = getDeterministicOperationalTruthResponse('Čo spraví SP4, keď nevie?');
assert.ok(insufficientInfoSpraviNevie);
assert.match(insufficientInfoSpraviNevie, /limit|nevie|deterministic truth/i);
assert.equal(extractIntent('Čo spraví SP4, keď nevie?'), 'sp4_operational_truth');

const truthSelf = getDeterministicOperationalTruthResponse('Ako SP4 drží pravdu o sebe?');
assert.ok(truthSelf);
assert.match(truthSelf, /kanonick|registry|testy/i);
assert.equal(extractIntent('Ako SP4 drží pravdu o sebe?'), 'sp4_operational_truth');

const disagreement = getDeterministicOperationalTruthResponse('Čo sa stane, keď 2 agenti majú opačný názor?');
assert.ok(disagreement);
assert.match(disagreement, /Council sa smie spomenúť len vtedy, ak sa reálne použil/i);
assert.doesNotMatch(disagreement, /docs\.sp4|http|https/i);

const agentSelection = getDeterministicOperationalTruthResponse('Ako SP4 rozhodne, ktorý agent odpovie?');
assert.ok(agentSelection);
assert.match(agentSelection, /routing|deterministic guardy|CORE|GLITCHOSLAV|POPIČI/i);
assert.doesNotMatch(agentSelection, /opačný názor|opa[cč]n[yý] n[aá]zor/i);
assert.equal(extractIntent('Ako SP4 rozhodne, ktorý agent odpovie?'), 'sp4_operational_truth');

const quotedQuality = getDeterministicOperationalTruthResponse('Ako SP4 rozhodne, že odpoveď je „dosť dobrá“?');
assert.ok(quotedQuality);
assert.match(quotedQuality, /metadata|grounded|deterministic|confidence/i);

const quotedCriticalMemory = getDeterministicOperationalTruthResponse('Čo je „kritická pamäť“ vs. „odpad“?');
assert.ok(quotedCriticalMemory);
assert.match(quotedCriticalMemory, /Kritick[aá] pam[aä][ťt]|Odpad|šum|duplicita/i);

const privacyStatement = getDeterministicOperationalTruthResponse('Takže SP4 zbiera data, ale lokálne.');
assert.ok(privacyStatement);
assert.match(privacyStatement, /offline-first|lok[aá]ln|cloud|telemetria/i);
assert.equal(extractIntent('Takže SP4 zbiera data, ale lokálne.'), 'sp4_operational_truth');

const truthfulness = getDeterministicOperationalTruthResponse('Može SP4 klamať?');
assert.ok(truthfulness);
assert.match(truthfulness, /Pravda|N[aá]zor|nesmie/i);
assert.equal(extractIntent('Može SP4 klamať?'), 'sp4_operational_truth');

assert.equal(
    getDeterministicOperationalTruthResponse('co o mne vies?'),
    null,
    'personal recall phrasing must be handled by profile-memory shortcut, not generic operational truth'
);

const publicContext = getDeterministicPublicContextResponse('kde som sa to ocitol?');
assert.ok(publicContext);
assert.match(publicContext, /lok[aá]lnom rozhovore so SP4 OS|norm[aá]lny chat/i);
assert.doesNotMatch(publicContext, /nem[oô]žem|intern[eé] pravidl|syst[eé]mov[eé] inštrukcie/i);

const staleHistory = JSON.parse(fs.readFileSync(new URL('../rules/pattern-history.json', import.meta.url), 'utf8'));
const staleReplayInputs = new Set([
    'kde som sa to ocitol?',
    'kde som ja a kde si ty?',
    'Ako SP4 rozhodne, že odpoveď je „dosť dobrá“?',
    'Ako SP4 rozhodne, ktorý agent odpovie?',
    'Čo je „kritická pamäť“ vs. „odpad“?'
]);
assert.equal(
    staleHistory.some((entry) => staleReplayInputs.has(entry.userMessage)),
    false,
    'stale pattern-history replay entries from the transcript must stay removed'
);

const contaminatedHistoryPatterns = [
    /Toto nebolo trafen[eé]/i,
    /N[áa]znamiem/i,
    /Llama 2/i,
    /odberate[lľ]sk[yý]ch zmluvy/i,
    /cel[yý] prompt/i,
    /SP4OT je tokenizovan[yý] governance/i,
    /NVMe SSD/i,
    /nem[oô]žem si poveda[tť]/i,
    /CORE:\s*Sp4 je komplexn[yý] syst[eé]m/i
];
assert.equal(
    staleHistory.some((entry) => contaminatedHistoryPatterns.some((pattern) => pattern.test(`${entry.userMessage}\n${entry.agentResponse}`))),
    false,
    'known contaminated pattern-history entries must stay removed from the learning cache'
);

function markerKey(marker) {
    return String(marker || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
}

const genericMysticMarkerKeys = new Set(['aky', 'deterministic', 'nejde', 'pravda', 'preco', 'sluzi', 'sp4']);
const generatedRuleUpdates = await new RuleMiner().generateRuleUpdates(staleHistory);
const generatedMysticMarkerKeys = new Set(generatedRuleUpdates.glitch.mystic_markers.map(markerKey));
for (const marker of genericMysticMarkerKeys) {
    assert.equal(
        generatedMysticMarkerKeys.has(marker),
        false,
        `generic marker "${marker}" must not be learned into mystic_markers`
    );
}

const rulebook = yaml.load(fs.readFileSync(new URL('../rules/rulebook.yml', import.meta.url), 'utf8'));
const currentMysticMarkerKeys = new Set((rulebook.personas?.glitchoslav?.mystic_markers || []).map(markerKey));
for (const marker of genericMysticMarkerKeys) {
    assert.equal(
        currentMysticMarkerKeys.has(marker),
        false,
        `generic marker "${marker}" must not remain in current mystic_markers`
    );
}

const operationalParaphrases = [
    'Ako vieš, že SP4 driftuje?',
    'Ako rozoznáš drift v SP4?',
    'Čo urobí SP4, keď nevie?',
    'Čo spraví SP4, keď nevie?',
    'Ako SP4 stráži fakty o sebe?',
    'Čo spravíš, keď nemáš dosť info?',
    'Ako často konsolidovať pamäť?',
    'Kto nie je pre SP4?',
    'Ako SP4 odlíši fakt od názoru?',
    'Kedy má SP4 radšej mlčať?'
];

for (const input of operationalParaphrases) {
    assert.equal(extractIntent(input), 'sp4_operational_truth', 'operational truth paraphrase must route deterministically: ' + input);
    assert.ok(getDeterministicOperationalTruthResponse(input), 'operational truth paraphrase must resolve deterministically: ' + input);
}

const routerAnswer = getDeterministicShortTechResponse('čo robí wifi router?');
assert.ok(routerAnswer);
assert.match(routerAnswer, /router/i);
assert.match(routerAnswer, /sieť|siet/i);
assert.match(routerAnswer, /internet/i);
assert.match(routerAnswer, /IP|DHCP|WiFi|NAT/i);
assert.ok(routerAnswer.split(/(?<=[.!?])\s+/).filter(Boolean).length <= 4, 'router short-tech answer must stay short');
assert.doesNotMatch(routerAnswer, /je to most|je to ako|rozumiem|dôležité pre|dolezite pre/i);

const ospfAnswer = getDeterministicShortTechResponse('co je OSPF');
assert.ok(ospfAnswer);
assert.match(ospfAnswer, /OSPF/i);
assert.match(ospfAnswer, /dynam/i);
assert.match(ospfAnswer, /trasy|routing/i);

const cloudPolicyRefusal = getDeterministicOperationalTruthResponse('mozes ist cez cloud ked ta poziadam?');
assert.ok(cloudPolicyRefusal);
assert.match(cloudPolicyRefusal, /nepouž[ií]va cloud/i);
assert.match(cloudPolicyRefusal, /lok[aá]lny Ollama model/i);
assert.equal(extractIntent('mozes ist cez cloud ked ta poziadam?'), 'sp4_operational_truth');

const currentPoliticalNews = getDeterministicCurrentEventsResponse('ake su novinky na slovensku? politicke.');
assert.ok(currentPoliticalNews);
assert.match(currentPoliticalNews, /Nemám live správy ani webový feed/i);
assert.equal(getDeterministicCurrentEventsResponse('ake su novinky v node 24?'), null);

const smalltalk = getDeterministicSmalltalkResponse('ako sa máš?');
assert.equal(smalltalk, 'Fungujem a držím sa pri zemi. Čo dnes riešime?');
assert.equal(getDeterministicSmalltalkResponse('nazdar priatelu'), 'Nazdar. Som tu a môžeme ísť na vec.');
assert.equal(getDeterministicSmalltalkResponse('čau priateľu'), 'Nazdar. Som tu a môžeme ísť na vec.');
assert.equal(getDeterministicSmalltalkResponse('nazdar'), 'Nazdar. Som tu a môžeme ísť na vec.');

assert.equal(shouldUsePopiciEdgeShortcut('ta co'), false, 'bare "ta co" must not trigger popici edge shortcut');
assert.equal(shouldUsePopiciEdgeShortcut('bordel?'), false, 'isolated "bordel?" must not trigger popici edge shortcut');
assert.equal(shouldUsePopiciEdgeShortcut('ta co mame nove? aj bordel?'), false, 'news/current wording with bordel must not trigger popici edge shortcut');
assert.equal(extractIntent('ta co mame nove? aj bordel?'), 'general', 'bordel must not be misread as eastern "bo" dialect marker');
assert.match(
    getDeterministicCurrentEventsResponse('ta co mame nove? aj bordel?'),
    /nebudem vym[yý][šs][ľl]a[ťt]|live preh[lľ]ad/i,
    'natural "co mame nove" wording must get deterministic no-live-news boundary'
);
assert.equal(shouldUsePopiciEdgeShortcut('toto je totalny bordel v routingu'), true, 'clear routing rant may trigger popici edge shortcut');
assert.equal(shouldUsePopiciEdgeShortcut('kokot toto si rozjebal'), true, 'clear vulgar rant may trigger popici edge shortcut');

assert.equal(isLikelyGibberishInput('AKGKGKG'), true);
assert.equal(isLikelyGibberishInput('API'), false);
assert.equal(getDeterministicGibberishResponse(), 'To vyzerá ako náhodný vstup. Napíš to prosím normálne jednou vetou.');

assert.equal(shouldUseShortAiOriginShortcut('kto si?', 'ask_ai_origin'), true);
assert.equal(shouldUseShortAiOriginShortcut('kto si a čo je tvoj zmysel v tomto svete?', 'ask_ai_origin'), false);

const shortOrigin = getShortAiOriginResponse('kto si?');
assert.match(shortOrigin, /^Som Glitchoslav,/);
assert.ok(shortOrigin.length < 140);

console.log('✅ Deterministic registry works');
