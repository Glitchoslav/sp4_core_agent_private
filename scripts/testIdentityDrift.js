// scripts/testIdentityDrift.js – Testovanie identity drift detekcie

import { BASELINE_IDENTITY, detectIdentityDrift } from '../identityDrift.js';
import { loadMemory } from '../memory.js';

async function main() {
    console.log('🔍 Testujem identity drift detection...\n');

    try {
        const state = await loadMemory();

        console.log('📊 BASELINE IDENTITY:');
        console.log('   Traits:', BASELINE_IDENTITY.traits);
        console.log('   Language czechIntrusion:', BASELINE_IDENTITY.language.czechIntrusion);
        console.log('   Values privacy:', BASELINE_IDENTITY.values.privacy);
        console.log();

        // Detekcia driftu
        const driftResult = detectIdentityDrift(state);

        console.log('📸 AKTUÁLNY SNAPSHOT:');
        console.log('   Sample size:', driftResult.snapshot.sampleSize);
        console.log('   Traits:', driftResult.snapshot.traits);
        console.log('   Language:', driftResult.snapshot.language);
        console.log('   Style:', driftResult.snapshot.style);
        console.log();

        console.log('🎯 DRIFT ANALÝZA:');
        console.log(`   Drifted: ${driftResult.drifted ? '🚨 ÁNO' : '✅ NIE'}`);
        console.log(`   Drift score: ${driftResult.driftScore.toFixed(3)}`);
        console.log(`   Odchýlky: ${driftResult.details.length}`);
        console.log();

        if (driftResult.details.length > 0) {
            console.log('📋 DETAILY ODCHÝLOK:');
            driftResult.details.forEach(detail => {
                console.log(`   [${detail.category}.${detail.field}]`);
                console.log(`      Baseline: ${detail.baseline.toFixed(2)}`);
                console.log(`      Current:  ${detail.current.toFixed(2)}`);
                console.log(`      Drift:    ${detail.drift.toFixed(2)}`);
            });
            console.log();
        }

        if (driftResult.drifted) {
            console.log('⚠️  VAROVANIE: Identity drift detekovaný!');
            console.log('   Zvážte:\n   - Kontrolu promptov\n   - Reset na baseline\n   - Úpravu BASELINE_IDENTITY');

            // Už je logovaný v detectIdentityDrift()
            console.log('   → Drift event uložený do semanticMemory.selfConcept.evolution');
        } else {
            console.log('✅ Identita agenta je stabilná a v súlade s baseline');
        }

    } catch (err) {
        console.error('❌ Chyba:', err);
        process.exit(1);
    }
}

main();
