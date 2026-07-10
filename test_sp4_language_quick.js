// Rýchly jazykový smoke test pre SP4IntegratedAgent
// Zamerané na 4 kľúčové CASE-y po FIX PACK v3

import { SP4IntegratedAgent } from './integration.js';

async function runQuickTest() {
    const agent = new SP4IntegratedAgent();

    // inicializácia agenta (rovnako ako pri index_v07.js)
    await agent.initialize();

    const cases = [
        {
            key: 'poem_sp4',
            desc: 'Báseň o SP4, pravde a slobode (SK vstup)',
            message: 'napíš mi krátku báseň o SP4, pravde a slobode'
        },
        {
            key: 'essay_manifest',
            desc: 'Manifest – vysvetlenie SP4 v 1–2 odstavcoch',
            message: 'Potrebujem, aby si mi v jednej až dvoch odstavcoch vysvetlil, čo je SP4, akú rolu má v živote človeka a prečo je dôležité mať vlastného offline AI parťáka namiesto korporátnej AI. Píš priamo ku mne, jednoducho a ľudsky.'
        },
        {
            key: 'emotional_lost',
            desc: 'Emočná otázka – stratenosť, únava',
            message: 'Úprimne, cítim sa totálne stratený a unavený. Neviem, kde mám začať a všetko mi splýva. Čo s tým?'
        },
        {
            key: 'mixed_en_sk',
            desc: 'Mix EN/SK – offline-first vs cloud bullshit',
            message: 'Explain me in slovak, why SP4 is offline-first AI partner and not some cloud bullshit assistant. Povedz mi to ako kamarát, nie ako corporate bot.'
        }
    ];

    console.log('============================================================');
    console.log('SP4 QUICK LANGUAGE TEST - 4 CASES');
    console.log('============================================================');

    for (const c of cases) {
        console.log(`\n🔹 CASE: ${c.key} – ${c.desc}`);
        console.log(`   USER: ${c.message}`);

        const result = await agent.processMessage(c.message, {
            mode: 'auto',
            bypassOrchestrator: false,
            forceSlovak: true
        });

        const persona = result?.metadata?.handledBy || 'unknown';
        const model = result?.model || result?.metadata?.model || 'unknown';

        console.log(`   PERSONA: ${persona} | MODEL: ${model}`);
        console.log('   RESPONSE:');
        console.log(result?.response || '<<empty>>');
        console.log('------------------------------------------------------------');
    }

    console.log('\n✅ SP4 QUICK LANGUAGE TEST dokončený.');
}

runQuickTest().catch(err => {
    console.error('Quick language test failed:', err);
    process.exit(1);
});
