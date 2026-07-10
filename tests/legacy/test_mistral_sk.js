// Test mistral-sk-7b Slovak support

import { sp4LlmCall } from './src/llm/llmRouter.js';

console.log('🇸🇰 Testing mistral-sk-7b Slovak support...\n');

const startTime = Date.now();
const result = await sp4LlmCall({
    preference: 'local-only',
    model: 'hf.co/un1verse/mistral-sk-7b-Q4_K_M-GGUF:latest',
    prompt: 'Povedz mi čo je SP4 projekt a čím sa odlišuje od iných AI asistentov. Odpoveď 2-3 vety PO SLOVENSKY.',
    system: 'Odpovedaj IBA PO SLOVENSKY. Používaj slovenské diakritické znamienka (áčďéíľňóôŕšťúýž). Nepoužívaj anglické slová okrem: AI, API, JSON, HTTP.',
    temperature: 0.7,
    num_predict: 200
});

const duration = Date.now() - startTime;

if (!result.ok) {
    console.log(`❌ FAILED: ${result.error}\n`);
    process.exit(1);
}

const response = result.text;
const hasSlovakDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi.test(response);
const slovakCount = (response.match(/[áäčďéíĺľňóôŕšťúýž]/gi) || []).length;
const englishWords = (response.match(/\b(the|and|of|to|in|is|that|with|for|this|are|was|you|your|project|system|different|other|assistants)\b/gi) || []).length;
const wordCount = response.split(/\s+/).length;

console.log(`✅ RESPONSE (${duration}ms, ${wordCount} words):\n`);
console.log(response);
console.log(`\n📊 ANALYSIS:`);
console.log(`   Slovak diacritics: ${hasSlovakDiacritics ? '✅ YES' : '❌ NO'} (${slovakCount} chars)`);
console.log(`   English words: ${englishWords > 0 ? `⚠️ ${englishWords}` : '✅ 0'}`);
console.log(`   Duration: ${duration}ms`);

if (hasSlovakDiacritics && englishWords < 5) {
    console.log(`\n🔥 VERDICT: EXCELLENT Slovak support!\n`);
} else if (hasSlovakDiacritics) {
    console.log(`\n⚠️ VERDICT: Partial Slovak (mixed with English)\n`);
} else {
    console.log(`\n❌ VERDICT: Poor Slovak support\n`);
}
