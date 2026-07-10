// test_real_conversation.js - Test reálnej konverzácie s novými pravidlami

import { SP4IntegratedAgent } from './integration.js';

console.log('🧪 TEST REÁLNEJ KONVERZÁCIE S NOVÝMI JAZYKOVÝMI PRAVIDLAMI\n');
console.log('═'.repeat(70));

const agent = new SP4IntegratedAgent();
await agent.initialize();

console.log('\n📝 Testovacie otázky:\n');

const testQuestions = [
    'Ahoj, ako sa máš?',
    'Povedz mi niečo o sebe.',
    'Väzne, Slovenský jazyk je ti blízky?',
];

for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`👤 OTÁZKA ${i + 1}: "${question}"\n`);

    try {
        const result = await agent.processMessage(question, 'core');

        console.log(`🤖 ODPOVEĎ:`);
        console.log(result.response);
        console.log(`\n📊 Metadata:`);
        console.log(`   - Model: ${result.metadata.model}`);
        console.log(`   - Processing time: ${result.metadata.processingTime}`);
        console.log(`   - Emotional intensity: ${result.metadata.emotionalAnalysis.intensity.toFixed(2)}`);
        console.log(`   - Grounding: ${result.metadata.grounding ? 'ÁNO' : 'NIE'}`);

    } catch (err) {
        console.error(`❌ CHYBA: ${err.message}`);
    }
}

console.log(`\n${'═'.repeat(70)}`);
console.log('✅ Test dokončený\n');
