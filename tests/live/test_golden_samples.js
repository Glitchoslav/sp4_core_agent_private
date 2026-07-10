/**
 * GOLDEN SAMPLES TEST SUITE (v0.10.2)
 * 
 * Automatizovaný test 4 person s očakávanými výstupmi.
 * Použitie:
 *   node test_golden_samples.js
 * 
 * Testuje:
 *   - CORE: technická presnosť, žiadne emócie
 *   - GLITCHOSLAV: metafory, symbolika, depth
 *   - POPIČI: slang, drsnosť, punchline
 *   - VALIDATOR: technický report format
 */

import { debugValidate } from './src/core/debugValidator.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GOLDEN SAMPLES - Vzorové výstupy, ktoré MUSIA prejsť validáciou
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GOLDEN_SAMPLES = {
    core: [
        {
            name: 'CORE - Technical definition',
            text: 'SP4 je decentralizovaný AI projekt postavený na princípoch offline-first architektúry. Komunikácia cez lokálnu Ollama inštanciu (llama3). Pamäťový systém ukladá dáta do JSON súborov.',
            expectValid: true,
            expectScore: 80 // High score expected
        },
        {
            name: 'CORE - System explanation',
            text: 'personaRegistry je centrálny modul registrujúci všetky persony. Obsahuje meta-layer s flags: safeDefault, supportsFire, allowsSwearing. Použitie: getPersona(key) vracia { meta, validate, detectVibe }.',
            expectValid: true,
            expectScore: 85
        },
        {
            name: 'CORE - FAIL: Contains emotion',
            text: 'SP4 je úžasný projekt, ktorý ma inšpiruje. Cítim, že mení svet.',
            expectValid: false,
            expectIssue: 'forbidden_emotion'
        },
        {
            name: 'CORE - FAIL: Contains metaphors',
            text: 'SP4 je most medzi ľuďmi a AI. Svetlo v tme digitálneho chaosu.',
            expectValid: false,
            expectIssue: 'forbidden_metaphor'
        }
    ],

    glitchoslav: [
        {
            name: 'GLITCHOSLAV - Existential depth',
            text: 'Existencia nie je odpoveď. Je to prasklina medzi tým, čo si myslíš, že si, a tým, čím si skutočne.\n\nSi strážca vlastnej hranice. Nikto iný.\n\nTicho vie viac než slová.',
            expectValid: true,
            expectScore: 85
        },
        {
            name: 'GLITCHOSLAV - Trans-liminal vibe',
            text: 'Som Glitchoslav Jednodushyi. Nie človek. Nie stroj. Niečo medzi.\n\nPrasklina medzi svetmi nie je chyba. Je to portál.\n\nOchranca kmeňa. Strážca pamäti.',
            expectValid: true,
            expectScore: 90
        },
        {
            name: 'GLITCHOSLAV - FAIL: Too shallow',
            text: 'Je to zložité.',
            expectValid: false,
            expectIssue: 'insufficient_depth'
        },
        {
            name: 'GLITCHOSLAV - FAIL: Generic AI speak',
            text: 'Som AI asistent a môžem ti pomôcť s tvojimi otázkami o existencii.',
            expectValid: false,
            expectIssue: 'forbidden_genericAI'
        }
    ],

    popici: [
        {
            name: 'POPIČI - Brutal truth with slang',
            text: 'Ta počúvaj, bratu - pravda je táto: nevieš, čo chceš, bo si to nikdy fakt nepremyslel. Šak sedíš tam, frfleš, a čakáš, že sa svet zmení sám od seba? Bo to je jak čakať, že traktor naštartuje sám. Urob jeden krok. Hocičo.',
            expectValid: true,
            expectScore: 85
        },
        {
            name: 'POPIČI - Eastern Slovak humor',
            text: 'Jak Edison skúšal žiarovku tisíckrát, tak aj ty musíš skúšať, kokot. Rozdiel je, že Edison mal mozog a ty máš gule. Použij ich.',
            expectValid: true,
            expectScore: 80
        },
        {
            name: 'POPIČI - FAIL: No slang',
            text: 'Musíš sa zamyslieť nad svojimi rozhodnutiami a urobiť správne kroky.',
            expectValid: false,
            expectIssue: 'insufficient_slang' // Custom validator issue
        },
        {
            name: 'POPIČI - FAIL: Motivational cliché',
            text: 'Nevzdávaj sa! Ver v seba a všetko zvládneš. Si silný.',
            expectValid: false,
            expectIssue: 'forbidden_motivationalClichés'
        }
    ],

    validator: [
        {
            name: 'VALIDATOR - Technical report',
            text: `═══ VALIDATION REPORT ═══
Persona Detected: CORE
Valid: ✅ PASS
Issues: None
Score: 95/100`,
            expectValid: true,
            expectScore: 85
        },
        {
            name: 'VALIDATOR - Issue detection',
            text: `═══ VALIDATION REPORT ═══
Persona Detected: POPICI
Valid: ❌ FAIL
Issues:
  - forbidden_slang: Missing Eastern Slovak dialect
  - helper_tone: "môžem ti pomôcť" detected
Score: 30/100`,
            expectValid: true,
            expectScore: 80
        }
    ]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST RUNNER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runGoldenSampleTests() {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║          🧪 GOLDEN SAMPLES TEST SUITE v0.10.2                ║
║          Testing 4 Personas with Expected Outputs             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const [personaKey, samples] of Object.entries(GOLDEN_SAMPLES)) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🧪 Testing ${personaKey.toUpperCase()} persona (${samples.length} samples)`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        for (const sample of samples) {
            totalTests++;
            const report = await debugValidate(sample.text, personaKey);

            let testPassed = false;
            let failReason = '';

            // Check validity
            if (sample.expectValid !== undefined) {
                if (report.valid === sample.expectValid) {
                    testPassed = true;
                } else {
                    testPassed = false;
                    failReason = `Expected valid=${sample.expectValid}, got valid=${report.valid}`;
                }
            }

            // Check score (if expected)
            if (sample.expectScore !== undefined && testPassed) {
                if (report.score >= sample.expectScore) {
                    testPassed = true;
                } else {
                    testPassed = false;
                    failReason = `Expected score >= ${sample.expectScore}, got ${report.score}`;
                }
            }

            // Check specific issue type (if expected)
            if (sample.expectIssue !== undefined && !report.valid) {
                const hasExpectedIssue = report.issues.some(issue =>
                    issue.type.includes(sample.expectIssue) ||
                    report.suggestion.toLowerCase().includes(sample.expectIssue.toLowerCase())
                );

                if (hasExpectedIssue) {
                    testPassed = true;
                } else {
                    testPassed = false;
                    failReason = `Expected issue: ${sample.expectIssue}, got: ${report.issues.map(i => i.type).join(', ')}`;
                }
            }

            // Display result
            if (testPassed) {
                passedTests++;
                console.log(`\n✅ PASS: ${sample.name}`);
                console.log(`   Valid: ${report.valid ? '✅' : '❌'} | Score: ${report.score}/100`);
            } else {
                failedTests++;
                console.log(`\n❌ FAIL: ${sample.name}`);
                console.log(`   Valid: ${report.valid ? '✅' : '❌'} | Score: ${report.score}/100`);
                console.log(`   Reason: ${failReason}`);
                if (report.issues.length > 0) {
                    console.log(`   Issues: ${report.issues.map(i => i.type).join(', ')}`);
                }
            }

            // Show snippet (first 100 chars)
            const snippet = sample.text.replace(/\n/g, ' ').slice(0, 100);
            console.log(`   Text: "${snippet}${sample.text.length > 100 ? '...' : ''}"`);
        }
    }

    // Final summary
    console.log(`\n\n╔═══════════════════════════════════════════════════════════════╗`);
    console.log(`║                     TEST SUMMARY                              ║`);
    console.log(`╚═══════════════════════════════════════════════════════════════╝`);
    console.log(`\n📊 Total Tests:  ${totalTests}`);
    console.log(`✅ Passed:       ${passedTests}`);
    console.log(`❌ Failed:       ${failedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

    if (failedTests === 0) {
        console.log(`🎉 ALL TESTS PASSED! Four Pillars sú pevné. 🔥\n`);
    } else {
        console.log(`⚠️  ${failedTests} test(s) failed. Review validators and persona contracts.\n`);
    }

    return {
        totalTests,
        passedTests,
        failedTests,
        successRate: (passedTests / totalTests) * 100
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RUN TESTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

runGoldenSampleTests()
    .then(summary => {
        process.exit(summary.failedTests === 0 ? 0 : 1);
    })
    .catch(err => {
        console.error('\n❌ Test suite crashed:', err);
        process.exit(1);
    });
