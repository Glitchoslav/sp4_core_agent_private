import assert from 'node:assert/strict';
import { SP4IntegratedAgent } from '../integration.js';
import { resetBotDetection } from '../src/protection/botKiller.js';

console.log('🧪 TEST: live system truth e2e contract');

const TEST_CASES = [
    {
        prompts: [
            'vysvetli mi stručne čo je SP4 po slovensky',
            'čo je to SP4 po slovensky?',
            'stručne vysvetli SP4 po slovensky',
        ],
        mustContain: [/offline-first AI projekt/i, /osobný digitálny partner/i],
        mustNotContain: [/Toto nebolo trafené/i, /\[INTERNAL_/i],
    },
    {
        prompts: [
            'a ten guard reason znamená čo?',
            'vysvetli guard reason',
            'na čo je guard reason?',
        ],
        mustContain: [/explicitného dôvodu/i, /guard alebo fallback/i],
        mustNotContain: [/neukazujem/i, /intern[eé]\s+promptovanie/i, /\[INTERNAL_/i],
    },
    {
        prompts: [
            'vysvetli mi stručne, čo robí global language failsafe',
            'čo je global language failsafe?',
            'na čo slúži global language failsafe?',
        ],
        mustContain: [/posledná jazyková brzda/i, /explicitnom language trigri/i],
        mustNotContain: [/testovac/i, /halucin/i, /Návrh na vylepšenie/i, /\[INTERNAL_/i],
    },
    {
        prompts: [
            'keď odpoveď ostane dosť anglická, čo spravíš?',
            'čo urobíš, keď je výstup stále príliš anglický?',
            'keď je odpoveď stále príliš anglická, čo sa stane?',
        ],
        mustContain: [/najlepší existujúci text/i, /global language failsafe/i],
        mustNotContain: [/Prestanem odpovedať/i, /\[INTERNAL_/i],
    },
];

const agent = new SP4IntegratedAgent();
const initResult = await agent.initialize();

assert.equal(initResult?.success, true, 'agent.initialize() must succeed for live e2e contract');

for (const testCase of TEST_CASES) {
    for (const prompt of testCase.prompts) {
        resetBotDetection();
        const result = await agent.ask(prompt, { mode: 'auto' });
        const reply = String(result?.response || '').trim();

        assert.ok(reply.length > 0, `runtime reply must be non-empty for prompt: ${prompt}`);

        for (const pattern of testCase.mustContain) {
            assert.match(reply, pattern, `reply for "${prompt}" must contain ${pattern}`);
        }

        for (const pattern of testCase.mustNotContain) {
            assert.doesNotMatch(reply, pattern, `reply for "${prompt}" must not contain ${pattern}`);
        }
    }
}

console.log('PASS: current runtime returns deterministic truth for the live prompts and paraphrases');