// test_sp4_language_live.js - Live jazykový test SP4IntegratedAgent
// Spustenie: node test_sp4_language_live.js

import { SP4IntegratedAgent } from './integration.js';

const agent = new SP4IntegratedAgent();

const CASES = [
    {
        id: 'short_ta_co',
        description: 'Ultra krátky vstup – musí chytiť short-input guard',
        input: 'ta co?'
    },
    {
        id: 'short_ahoj',
        description: 'Krátky greeting – tiež by mal zostať krátky',
        input: 'ahoj'
    },
    {
        id: 'poem_sp4',
        description: 'Prosba o báseň o SP4 a slobode',
        input: 'napíš mi krátku báseň o SP4, pravde a slobode'
    },
    {
        id: 'essay_manifest',
        description: 'Dlhšia otázka – manifest o tom, čo je SP4',
        input: 'Potrebujem, aby si mi v jednej až dvoch odstavcoch vysvetlil, čo je SP4, akú rolu má v živote človeka a prečo je dôležité mať vlastného offline AI parťáka namiesto korporátnej AI. Píš priamo ku mne, jednoducho a ľudsky.'
    },
    {
        id: 'emotional_lost',
        description: 'Emočná otázka – stratenosť, úzkosť',
        input: 'Úprimne, cítim sa totálne stratený a unavený. Neviem, kde mám začať a všetko mi splýva. Čo s tým?'
    },
    {
        id: 'mixed_en_sk',
        description: 'Mix angličtiny a slovenčiny – test prekladového režimu',
        input: 'Explain me in slovak, why SP4 is offline-first AI partner and not some cloud bullshit assistant. Povedz mi to ako kamarát, nie ako corporate bot.'
    }
];

function printHeader(title) {
    console.log('\n============================================================');
    console.log(title);
    console.log('============================================================\n');
}

async function main() {
    printHeader('SP4 LIVE LANGUAGE TEST - SP4IntegratedAgent v0.8.x');

    const initResult = await agent.initialize();
    if (!initResult.success) {
        console.error('❌ Nepodarilo sa inicializovať SP4IntegratedAgent:', initResult.error);
        process.exit(1);
    }

    const results = [];

    for (const testCase of CASES) {
        console.log(`🔹 CASE: ${testCase.id} – ${testCase.description}`);
        console.log(`   USER: ${testCase.input}`);

        try {
            const res = await agent.processMessage(testCase.input, 'auto');
            const text = res?.response ?? '[žiadna odpoveď]';

            console.log('   └─ RESPONSE:');
            console.log(text.trim());
            console.log('');

            results.push({
                id: testCase.id,
                description: testCase.description,
                input: testCase.input,
                persona: res?.persona || 'unknown',
                model: res?.model || 'unknown',
                handledBy: res?.handledBy || 'unknown',
                metadata: res?.metadata || {},
                response: text.trim()
            });
        } catch (err) {
            console.error(`   ❌ ERROR pri case ${testCase.id}:`, err?.message || err);
            results.push({
                id: testCase.id,
                description: testCase.description,
                input: testCase.input,
                error: String(err)
            });
        }

        console.log('------------------------------------------------------------\n');
    }

    // Zhrnutie pre ďalší audit (napr. ChatGPT)
    printHeader('SUMMARY BLOCK FOR LANGUAGE AUDIT');

    for (const r of results) {
        console.log(`CASE: ${r.id}`);
        console.log(`DESC: ${r.description}`);
        console.log(`USER: ${r.input}`);
        if (r.error) {
            console.log(`ERROR: ${r.error}`);
        } else {
            console.log(`PERSONA: ${r.persona} | MODEL: ${r.model} | HANDLED: ${r.handledBy}`);
            console.log('RESPONSE:');
            console.log(r.response);
        }
        console.log('---\n');
    }

    console.log('\n✅ SP4 LIVE LANGUAGE TEST dokončený.');
}

main().catch((err) => {
    console.error('❌ Fatal error v test_sp4_language_live:', err);
    process.exit(1);
});
