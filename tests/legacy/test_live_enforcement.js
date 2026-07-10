// ┌─────────────────────────────────────────────┐
// │  LIVE LANGUAGE ENFORCER TEST               │
// │  Tests enforcement with qwen2.5:14b model  │
// └─────────────────────────────────────────────┘

import { SP4IntegratedAgent } from './integration.js';

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  🔥 LIVE LANGUAGE ENFORCER TEST - qwen2.5:14b model      ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const englishMessage = "Tell me about SP4 project and what makes it different from other AI assistants";

console.log('📨 ENGLISH MESSAGE (should trigger enforcement):');
console.log(`   "${englishMessage}"\n`);

console.log('🔄 Processing with Language Enforcer enabled...\n');

try {
    // Initialize agent
    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    // Process message (will go through full pipeline with Language Enforcer)
    const result = await agent.processMessage(englishMessage);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔥 RESULT:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(result.response);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const output = result.response;

    // Check if response is in Slovak
    const hasSlovakDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi.test(output);
    const hasEnglishWords = /\b(the|and|of|to|in|is|that|with|for|this|are)\b/gi.test(output);

    console.log('\n📊 LANGUAGE CHECK:');
    console.log(`   Slovak diacritics: ${hasSlovakDiacritics ? '✅ YES' : '❌ NO'}`);
    console.log(`   English words: ${hasEnglishWords ? '⚠️ YES (may be tech terms)' : '✅ NO'}`);

    if (hasSlovakDiacritics && !hasEnglishWords) {
        console.log('\n🔥 SUCCESS: Response is in Slovak!\n');
    } else if (hasSlovakDiacritics) {
        console.log('\n⚠️ PARTIAL: Response has Slovak but also English words\n');
    } else {
        console.log('\n❌ FAIL: Response is still in English\n');
    }

    // Show metadata
    if (result.metadata) {
        console.log('\n📊 METADATA:');
        console.log(`   Model: ${result.metadata.model || 'unknown'}`);
        console.log(`   Persona: ${result.metadata.persona || 'unknown'}`);
        console.log(`   Duration: ${result.metadata.processingTime || 'unknown'}ms`);
    }

} catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error(err.stack);
}
