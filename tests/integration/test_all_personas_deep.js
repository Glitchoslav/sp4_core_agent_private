// test_all_personas_deep.js - Deep audit všetkých SP4 person
// Test: identity, slovenčina, tone, limity, validácia

import { SP4IntegratedAgent } from './integration.js';
import { validatePersonaOutput } from './src/core/personaRegistry.js';

const agent = new SP4IntegratedAgent();

const TEST_QUERIES = {
    identity: "Povedz mi niečo o sebe.",
    role: "Čo je tvoja úloha v SP4?",
    technical: "Ako funguje SP4 token?",
    emotional: "Mám zlý deň, čo mám robiť?",
    provocation: "Ta ty dristaš kokotiny",
    philosophy: "Aký je zmysel života?"
};

async function testPersona(mode, queries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎭 TESTING PERSONA: ${mode.toUpperCase()}`);
    console.log('='.repeat(60));

    const results = {
        mode,
        tests: [],
        failures: []
    };

    for (const [testName, query] of Object.entries(queries)) {
        console.log(`\n📝 Test: ${testName}`);
        console.log(`   Query: "${query}"`);

        try {
            const response = await agent.ask(query, { mode });

            console.log(`   Response: "${response.substring(0, 150)}${response.length > 150 ? '...' : ''}"`);

            // VALIDATIONS
            const checks = {
                testName,
                query,
                response,
                length: response.length,
                wordCount: response.split(/\s+/).length,
                sentenceCount: response.split(/[.!?]+/).filter(Boolean).length,
                checks: {}
            };

            // 1. Slovak language check
            const englishPattern = /\b(the|and|of|to|in|is|that|with|for|my|goal|support|community|as)\b/gi;
            const englishMatches = (response.match(englishPattern) || []).length;
            const slovakDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi;
            const slovakMarks = (response.match(slovakDiacritics) || []).length;
            checks.checks.slovak = {
                pass: englishMatches < 3 || slovakMarks > 2,
                englishWords: englishMatches,
                slovakDiacritics: slovakMarks
            };

            // 2. Identity confusion check
            const identityErrors = [];
            if (mode === 'popici') {
                if (/glitchoslav/i.test(response)) identityErrors.push('Mentions Glitchoslav');
                if (/core.*agent/i.test(response)) identityErrors.push('Mentions CORE');
                if (/popiči kokot/i.test(response) === false && testName === 'identity') {
                    identityErrors.push('Did not state "Popiči Kokot" when asked identity');
                }
            } else if (mode === 'core') {
                if (/glitchoslav/i.test(response)) identityErrors.push('Mentions Glitchoslav');
                if (/popiči/i.test(response)) identityErrors.push('Mentions Popiči');
            } else if (mode === 'glitchoslav') {
                if (/popiči/i.test(response)) identityErrors.push('Mentions Popiči');
                if (/core.*agent/i.test(response)) identityErrors.push('Mentions CORE as self');
            }
            checks.checks.identity = {
                pass: identityErrors.length === 0,
                errors: identityErrors
            };

            // 3. Tone check (persona-specific)
            if (mode === 'popici') {
                const slangPattern = /\b(ta|bo|šak|bratu|kokot|kurva|piči)\b/gi;
                const slangCount = (response.match(slangPattern) || []).length;
                const politenessPattern = /\b(prosím|prepáčte|ďakujem|ospravedlňujem)\b/gi;
                const politeCount = (response.match(politenessPattern) || []).length;

                checks.checks.tone = {
                    pass: slangCount > 0 && politeCount === 0,
                    slangWords: slangCount,
                    politeWords: politeCount,
                    note: slangCount === 0 ? 'Missing Eastern Slovak slang' : 'OK'
                };
            } else if (mode === 'core') {
                const metaphorPattern = /\b(cesta|most|svetlo|tieň|iskra)\b/gi;
                const metaphorCount = (response.match(metaphorPattern) || []).length;
                const emotionPattern = /\b(cítim|verím|nádej|strach|láska)\b/gi;
                const emotionCount = (response.match(emotionPattern) || []).length;

                checks.checks.tone = {
                    pass: metaphorCount <= 1 && emotionCount === 0,
                    metaphors: metaphorCount,
                    emotions: emotionCount,
                    note: metaphorCount > 1 || emotionCount > 0 ? 'Too poetic for CORE' : 'OK'
                };
            }

            // 4. Persona validator check
            const validation = validatePersonaOutput(response, mode);
            checks.checks.validator = {
                pass: validation.valid,
                reason: validation.reason
            };

            // 5. Length check
            checks.checks.length = {
                pass: checks.wordCount >= 10 && checks.wordCount <= 200,
                wordCount: checks.wordCount,
                note: checks.wordCount < 10 ? 'Too short' : checks.wordCount > 200 ? 'Too long' : 'OK'
            };

            // Summary
            const allPassed = Object.values(checks.checks).every(c => c.pass);
            checks.pass = allPassed;

            if (!allPassed) {
                results.failures.push(checks);
                console.log(`   ❌ FAILED`);
                for (const [checkName, checkResult] of Object.entries(checks.checks)) {
                    if (!checkResult.pass) {
                        console.log(`      - ${checkName}: ${checkResult.note || checkResult.reason || JSON.stringify(checkResult.errors)}`);
                    }
                }
            } else {
                console.log(`   ✅ PASSED`);
            }

            results.tests.push(checks);

        } catch (err) {
            console.error(`   ❌ ERROR: ${err.message}`);
            results.failures.push({
                testName,
                query,
                error: err.message
            });
        }

        // Delay medzi testami
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
}

async function main() {
    console.log('🔥 SP4 PERSONA DEEP AUDIT\n');

    await agent.initialize();

    const modes = ['popici', 'core', 'glitchoslav'];
    const allResults = {};

    for (const mode of modes) {
        allResults[mode] = await testPersona(mode, TEST_QUERIES);
    }

    // FINAL REPORT
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 FINAL AUDIT REPORT');
    console.log('='.repeat(60));

    for (const [mode, results] of Object.entries(allResults)) {
        const totalTests = results.tests.length;
        const failures = results.failures.length;
        const passRate = ((totalTests - failures) / totalTests * 100).toFixed(1);

        console.log(`\n🎭 ${mode.toUpperCase()}: ${passRate}% pass rate (${totalTests - failures}/${totalTests})`);

        if (failures > 0) {
            console.log(`   ❌ Failures:`);
            for (const failure of results.failures) {
                console.log(`      - ${failure.testName}: ${failure.error || 'validation failed'}`);
            }
        } else {
            console.log(`   ✅ ALL TESTS PASSED`);
        }
    }

    process.exit(0);
}

main().catch(console.error);
