// scripts/runConsolidation.js – Ručné spustenie konsolidácie pamäte

import { consolidateMemory } from '../consolidationEngine.js';
import { loadMemory, saveMemory } from '../memory.js';

async function main() {
    console.log('🔄 Spúšťam konsolidáciu pamäte...\n');

    try {
        const state = await loadMemory();

        console.log(`📊 Aktuálny stav:`);
        console.log(`   Raw záznamy: ${state.rawMemory.length}`);
        console.log(`   Daily záznamy: ${Object.keys(state.episodicMemory.daily).length}`);
        console.log(`   Weekly záznamy: ${Object.keys(state.episodicMemory.weekly).length}\n`);

        const newState = await consolidateMemory(state);
        await saveMemory(newState);

        console.log(`\n📊 Nový stav:`);
        console.log(`   Daily záznamy: ${Object.keys(newState.episodicMemory.daily).length}`);
        console.log(`   Weekly záznamy: ${Object.keys(newState.episodicMemory.weekly).length}`);

        // Zobraz dnešný záznam ak existuje
        const today = new Date().toISOString().split('T')[0];
        if (newState.episodicMemory.daily[today]) {
            const dailyEntry = newState.episodicMemory.daily[today];
            console.log(`\n📅 Dnešný záznam (${today}):`);
            console.log(`   Interakcie: ${dailyEntry.entryCount}`);
            console.log(`   Top témy: ${dailyEntry.topics.slice(0, 3).map(t => `${t.tag} (${t.count}×)`).join(', ')}`);
            console.log(`   Summary: ${dailyEntry.summary}`);
        }

        console.log('\n✅ Konsolidácia hotová');
    } catch (err) {
        console.error('❌ Chyba pri konsolidácii:', err);
        process.exit(1);
    }
}

main();
