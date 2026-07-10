import assert from 'node:assert/strict';
import { getDeterministicSystemInfoResponse } from '../src/routing/deterministicRegistry.js';
import { extractIntent } from '../src/routing/intentExtractor.js';

console.log('🧪 TEST: deterministic system truth contract');

assert.equal(
    extractIntent('vysvetli mi stručne čo je SP4 po slovensky'),
    'sp4_system_info',
    'concise Slovak explain-SP4 prompt must route to deterministic system info instead of brittle fallback path'
);

assert.equal(
    extractIntent('vysvetli mi stručne, čo je SP4 po slovensky'),
    'sp4_system_info',
    'comma variant of concise Slovak explain-SP4 prompt must keep the same deterministic route'
);

assert.equal(
    extractIntent('čo je to SP4 po slovensky?'),
    'sp4_system_info',
    'direct Slovak-hint definition variant must route to deterministic system info'
);

assert.equal(
    extractIntent('stručne vysvetli SP4 po slovensky'),
    'sp4_system_info',
    'imperative explain-SP4 variant must route to deterministic system info'
);

const sp4Explain = getDeterministicSystemInfoResponse('vysvetli mi stručne čo je SP4 po slovensky');
assert.match(sp4Explain, /offline-first AI projekt/i, 'deterministic SP4 explain answer must use canonical SP4 definition');
assert.doesNotMatch(sp4Explain, /Toto nebolo trafené|Skúsim to povedať priamo/i, 'deterministic SP4 explain answer must avoid safe relevance fallback text');

const sp4ExplainVariant = getDeterministicSystemInfoResponse('stručne vysvetli SP4 po slovensky');
assert.match(sp4ExplainVariant, /offline-first AI projekt/i, 'imperative explain-SP4 variant must use canonical SP4 definition');

const guardReason = getDeterministicSystemInfoResponse('a ten guard reason znamená čo?');
assert.match(guardReason, /explicitného dôvodu/i, 'guard reason answer must explain the reason-code contract navonok');
assert.doesNotMatch(guardReason, /intern[eé]\s+promptovanie|neukazujem/i, 'guard reason answer must not fall into meta refusal');

const guardReasonVariant = getDeterministicSystemInfoResponse('vysvetli guard reason');
assert.match(guardReasonVariant, /explicitného dôvodu/i, 'guard reason imperative variant must stay in deterministic truth layer');

const failsafe = getDeterministicSystemInfoResponse('vysvetli mi stručne, čo robí global language failsafe');
assert.match(failsafe, /posledná jazyková brzda/i, 'global language failsafe answer must describe the real runtime role');
assert.match(failsafe, /explicitnom language trigri/i, 'global language failsafe answer must mention explicit trigger contract');
assert.doesNotMatch(failsafe, /GLFS|testovac|halucin|Návrh na vylepšenie/i, 'global language failsafe answer must not hallucinate broader system meaning or tack on meta suggestions');

const failsafeVariant = getDeterministicSystemInfoResponse('na čo slúži global language failsafe?');
assert.match(failsafeVariant, /posledná jazyková brzda/i, 'global language failsafe utility variant must stay deterministic');

const englishLeak = getDeterministicSystemInfoResponse('keď odpoveď ostane dosť anglická, čo spravíš?');
assert.match(englishLeak, /najlepší existujúci text/i, 'EN leak answer must reflect best-available-text behavior before failsafe');
assert.match(englishLeak, /fallback odpoveď/i, 'EN leak answer must mention failsafe fallback path only as last line');
assert.doesNotMatch(englishLeak, /Prestanem odpovedať/i, 'EN leak answer must not hallucinate stop-mode behavior');

const englishLeakVariant = getDeterministicSystemInfoResponse('čo urobíš, keď je výstup stále príliš anglický?');
assert.match(englishLeakVariant, /najlepší existujúci text/i, 'EN leak utility variant must preserve best-available-text behavior');

const modelEnglish = getDeterministicSystemInfoResponse('a čo keď model odíde do angličtiny?');
assert.match(modelEnglish, /jazyková vrstva/i, 'model-English answer must point to the language layer, not to model training mythology');
assert.match(modelEnglish, /global language failsafe/i, 'model-English answer must mention the final explicit last-line guard');
assert.doesNotMatch(modelEnglish, /trénovaní|dátami pre trénovanie/i, 'model-English answer must not hallucinate training-data diagnosis as primary runtime behavior');

console.log('PASS: deterministic system truth stays aligned with runtime authority');