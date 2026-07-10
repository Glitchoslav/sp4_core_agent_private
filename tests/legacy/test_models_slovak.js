// ┌─────────────────────────────────────────────┐
// │  SLOVAK LANGUAGE MODEL COMPARISON TEST     │
// │  Tests: deepseek-r1:8b vs gemma3:12b       │
// └─────────────────────────────────────────────┘

import { sp4LlmCall } from './src/llm/llmRouter.js';

const SLOVAK_PROMPT = `Povedz mi čo je SP4 projekt a čím sa odlišuje od iných AI asistentov. 

KRITICKÉ PRAVIDLÁ:
1. Odpovedaj IBA PO SLOVENSKY
2. Nepoužívaj anglické slová (okrem: AI, API, JSON, HTTP)
3. Používaj slovenské diakritické znamienka (áčďéíľňóôŕšťúýž)

Odpoveď 2-3 vety.`;

const MODELS_TO_TEST = [
    'deepseek-r1:8b',
    'gemma3:12b',
    'llama3:8b',
    'jobautomation/OpenEuroLLM-Slovak:latest'
];

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  🇸🇰 SLOVAK LANGUAGE MODEL COMPARISON TEST               ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

console.log('📋 Testing models for Slovak language support:\n');

for (const model of MODELS_TO_TEST) {
    console.log('━'.repeat(60));
    console.log(`🤖 MODEL: ${model}`);
    console.log('━'.repeat(60));

    try {
        console.log(`\n⏱️  Calling ${model}...\n`);

        const startTime = Date.now();
        const result = await sp4LlmCall({
            preference: 'local-only',
            model,
            prompt: 'Povedz mi čo je SP4 projekt a čím sa odlišuje od iných AI asistentov. Odpoveď 2-3 vety PO SLOVENSKY.',
            system: SLOVAK_PROMPT,
            temperature: 0.7,
            num_predict: 200
        });
        const duration = Date.now() - startTime;

        if (!result.ok) {
            console.log(`❌ FAILED: ${result.error}\n`);
            continue;
        }

        const response = result.text;

        // Analyze response
        const hasSlovakDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi.test(response);
        const slovakDiacriticsCount = (response.match(/[áäčďéíĺľňóôŕšťúýž]/gi) || []).length;

        const commonEnglish = /\b(the|and|of|to|in|is|that|with|for|this|are|was|you|your|project|system|different|other|assistants)\b/gi;
        const englishMatches = (response.match(commonEnglish) || []).length;

        const wordCount = response.split(/\s+/).length;
        const isSlovak = hasSlovakDiacritics && englishMatches < 5;

        console.log(`✅ RESPONSE (${duration}ms, ${wordCount} words):\n`);
        console.log(response);
        console.log(`\n📊 ANALYSIS:`);
        console.log(`   Slovak diacritics: ${hasSlovakDiacritics ? '✅ YES' : '❌ NO'} (${slovakDiacriticsCount} chars)`);
        console.log(`   English words: ${englishMatches > 0 ? `⚠️ ${englishMatches}` : '✅ 0'}`);
        console.log(`   Word count: ${wordCount}`);
        console.log(`   Duration: ${duration}ms`);

        if (isSlovak) {
            console.log(`\n🔥 VERDICT: EXCELLENT Slovak support!\n`);
        } else if (hasSlovakDiacritics) {
            console.log(`\n⚠️ VERDICT: Partial Slovak (mixed with English)\n`);
        } else {
            console.log(`\n❌ VERDICT: English response (no Slovak support)\n`);
        }

    } catch (err) {
        console.log(`❌ ERROR: ${err.message}\n`);
    }
}

console.log('━'.repeat(60));
console.log('🏁 TEST COMPLETE');
console.log('━'.repeat(60));
