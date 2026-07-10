// scripts/testMemorySystem.js – Celkový test pamäťového systému

import { consolidateMemory } from '../consolidationEngine.js';
import { loadMemory, saveMemory } from '../memory.js';
import { extractConcepts, updateSelfConcept } from '../semanticExtractor.js';

async function main() {
    console.log('🧪 WALTER MEMORY SYSTEM - Kompletný test\n');

    try {
        let state = await loadMemory();

        // 1. Ukáž aktuálny stav
        console.log('📊 AKTUÁLNY STAV PAMÄTE:');
        console.log(`   Raw záznamy: ${state.rawMemory.length}`);
        console.log(`   Daily záznamy: ${Object.keys(state.episodicMemory.daily).length}`);
        console.log(`   Weekly záznamy: ${Object.keys(state.episodicMemory.weekly).length}`);
        console.log(`   Beliefs: ${state.semanticMemory.beliefs.length}`);
        console.log(`   Concepts: ${state.semanticMemory.concepts.length}`);
        console.log(`   Self-concept traits: ${state.semanticMemory.selfConcept.coreTraits.length}`);
        console.log();

        // 2. Testuj metadata extrakciu (ak sú nejaké záznamy)
        if (state.rawMemory.length > 0) {
            const lastEntry = state.rawMemory[state.rawMemory.length - 1];
            console.log('📋 POSLEDNÝ ZÁZNAM:');
            console.log(`   Input: "${lastEntry.input.substring(0, 60)}..."`);
            console.log(`   Tags: ${lastEntry.metadata?.tags?.join(', ') || 'žiadne'}`);
            console.log(`   Emotion (user): ${lastEntry.metadata?.emotion?.user?.type || 'N/A'} (${(lastEntry.metadata?.emotion?.user?.intensity || 0).toFixed(2)})`);
            console.log(`   Emotion (agent): ${lastEntry.metadata?.emotion?.agent?.type || 'N/A'} (${(lastEntry.metadata?.emotion?.agent?.intensity || 0).toFixed(2)})`);
            console.log(`   Importance: ${(lastEntry.metadata?.importance || 0).toFixed(2)}`);
            console.log();
        }

        // 3. Spusti konsolidáciu
        console.log('🔄 Spúšťam konsolidáciu...');
        state = await consolidateMemory(state);
        console.log('✅ Konsolidácia dokončená\n');

        // 4. Testuj semantic extraction
        console.log('🧠 Extrahujem koncepty...');
        const concepts = extractConcepts(state.rawMemory);
        console.log(`   Nájdených ${concepts.length} konceptov`);
        if (concepts.length > 0) {
            console.log('   Top 5:');
            concepts.slice(0, 5).forEach(c => {
                console.log(`      - ${c.concept}: ${c.frequency}× (súvisí: ${c.relatedTopics.slice(0, 3).join(', ')})`);
            });
        }
        console.log();

        // 5. Update self-concept
        console.log('🪞 Aktualizujem self-concept...');
        updateSelfConcept(state.semanticMemory, state.rawMemory);
        console.log(`   Core traits: ${state.semanticMemory.selfConcept.coreTraits.join(', ')}`);
        console.log(`   Values: ${state.semanticMemory.selfConcept.values.join(', ')}`);
        console.log(`   Evolution entries: ${state.semanticMemory.selfConcept.evolution.length}`);
        console.log();

        // 6. Zobraz daily summary ak existuje
        const today = new Date().toISOString().split('T')[0];
        if (state.episodicMemory.daily[today]) {
            const dailyEntry = state.episodicMemory.daily[today];
            console.log(`📅 DNEŠNÝ SUMMARY (${today}):`);
            console.log(`   ${dailyEntry.summary}`);
            console.log(`   Emočný profil:`);
            console.log(`      User avg intensity: ${dailyEntry.emotionalProfile.avgIntensity.user.toFixed(2)}`);
            console.log(`      Agent avg intensity: ${dailyEntry.emotionalProfile.avgIntensity.agent.toFixed(2)}`);
            console.log(`      Resonance: ${(dailyEntry.emotionalProfile.resonance * 100).toFixed(0)}%`);
            console.log();
        }

        // 7. Ulož zmeny
        await saveMemory(state);
        console.log('💾 Zmeny uložené\n');

        console.log('✅ Walter memory system test PASSED');
        console.log('   Systém je funkčný a pripravený na živý režim.');

    } catch (err) {
        console.error('❌ Test FAILED:', err);
        console.error(err.stack);
        process.exit(1);
    }
}

main();
