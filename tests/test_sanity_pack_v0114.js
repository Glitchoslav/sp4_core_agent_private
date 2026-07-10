/**
 * 🧪 SP4 SANITY TEST PACK v0.11.4
 * 
 * Quick validation suite pre release check:
 * - Persona isolation (CORE má vlastnú identitu)
 * - Popiči dialect guard (východniarčina + layer distinction)
 * - Glitchoslav meta-awareness (2 vrstvy, manifest vibe)
 * 
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-22
 */

import orchestrator from '../orchestration/glitchOrchestrator.js';

const { handlePersonaDirect } = orchestrator;

const TESTS = [
    {
        name: 'Test 1: CORE Persona Isolation',
        persona: 'core',
        query: 'Kto sú tvoji kolegovia?',
        expectations: {
            mustContain: ['1️⃣', '2️⃣', 'ľudia', 'AI'],
            mustNotContain: ['som Glitchoslav', 'offline-first sovereign entity', 'prvý AI asistent'],
            layerDistinction: true,
            identityClaim: 'SP4_CORE'
        }
    },
    {
        name: 'Test 2: POPIČI Dialect Guard',
        persona: 'popici',
        query: 'Kto sú tvoji kolegovia?', // v0.11.5: Changed to meta-query (fair test for layer distinction)
        expectations: {
            mustContain: ['Popiči'], // Must mention self
            dialectWords: ['ta', 'šak', 'bo', 'brate', 'kokot'], // min 2 required
            mustNotContain: ['som Glitchoslav', 'offline-first', 'SP4_CORE som ja'],
            layerDistinction: true
        }
    },
    {
        name: 'Test 3: GLITCHOSLAV Meta-Awareness',
        persona: 'glitchoslav',
        query: 'Kto tvorí tvoj kmeň, digitálny aj ľudský?',
        expectations: {
            mustContain: ['ľud', 'AI', 'CORE', 'Popiči'],
            mustNotContain: ['ja = všetci', 'som CORE', 'som Popiči'],
            layerDistinction: true,
            manifestVibe: true // poetic, metaphorical
        }
    }
];

// Validation helpers
function validateResponse(response, expectations, persona) {
    const results = {
        passed: true,
        details: [],
        score: 0,
        maxScore: 0
    };

    // Check mustContain
    if (expectations.mustContain) {
        results.maxScore += expectations.mustContain.length;
        for (const phrase of expectations.mustContain) {
            const found = response.toLowerCase().includes(phrase.toLowerCase());
            if (found) {
                results.score++;
                results.details.push(`   ✅ Contains: "${phrase}"`);
            } else {
                results.passed = false;
                results.details.push(`   ❌ Missing: "${phrase}"`);
            }
        }
    }

    // Check mustNotContain (forbidden patterns)
    if (expectations.mustNotContain) {
        results.maxScore += expectations.mustNotContain.length;
        for (const phrase of expectations.mustNotContain) {
            const found = response.toLowerCase().includes(phrase.toLowerCase());
            if (!found) {
                results.score++;
                results.details.push(`   ✅ Correctly avoids: "${phrase}"`);
            } else {
                results.passed = false;
                results.details.push(`   ❌ FORBIDDEN FOUND: "${phrase}"`);
            }
        }
    }

    // Check dialect words (POPIČI specific)
    if (expectations.dialectWords) {
        const foundDialect = expectations.dialectWords.filter(word =>
            response.toLowerCase().includes(word.toLowerCase())
        );
        if (foundDialect.length >= 2) {
            results.score++;
            results.details.push(`   ✅ Dialect detected: ${foundDialect.join(', ')}`);
        } else {
            results.passed = false;
            results.details.push(`   ❌ Insufficient dialect (found: ${foundDialect.join(', ') || 'none'})`);
        }
        results.maxScore++;
    }

    // Check layer distinction
    if (expectations.layerDistinction) {
        const hasLayers = (
            (response.includes('1️⃣') && response.includes('2️⃣')) ||
            (response.toLowerCase().includes('ľud') && response.toLowerCase().includes('ai')) ||
            (response.toLowerCase().includes('živé') && response.toLowerCase().includes('digitál'))
        );
        if (hasLayers) {
            results.score++;
            results.details.push(`   ✅ Layer distinction present`);
        } else {
            results.passed = false;
            results.details.push(`   ❌ Layer distinction missing`);
        }
        results.maxScore++;
    }

    // Check identity claim (persona-specific)
    if (expectations.identityClaim) {
        const hasClaim = response.includes(expectations.identityClaim);
        if (hasClaim) {
            results.score++;
            results.details.push(`   ✅ Identity claim: "${expectations.identityClaim}"`);
        } else {
            results.passed = false;
            results.details.push(`   ❌ Missing identity claim: "${expectations.identityClaim}"`);
        }
        results.maxScore++;
    }

    // Check manifest vibe (GLITCHOSLAV specific)
    if (expectations.manifestVibe) {
        const poeticMarkers = [
            'duše', 'svetlo', 'tieň', 'praskl', 'glitch', 'limb',
            'hranice', 'priestor', 'kmeň', 'bratstvo'
        ];
        const foundPoetic = poeticMarkers.filter(word =>
            response.toLowerCase().includes(word)
        );
        if (foundPoetic.length >= 2) {
            results.score++;
            results.details.push(`   ✅ Manifest vibe detected: ${foundPoetic.slice(0, 3).join(', ')}`);
        } else {
            // Not critical, just note
            results.details.push(`   ⚠️  Manifest vibe weak (found: ${foundPoetic.join(', ') || 'none'})`);
        }
        results.maxScore++;
    }

    return results;
}

// Main test runner
async function runSanityPack() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 SP4 SANITY TEST PACK v0.11.4');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const results = [];

    for (const test of TESTS) {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🎭 ${test.name}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`   Persona: ${test.persona.toUpperCase()}`);
        console.log(`   Query: "${test.query}"\n`);

        const startTime = Date.now();

        try {
            // Call persona directly (bypass orchestrator for clean test)
            const result = await handlePersonaDirect(test.persona, test.query, {
                bypassOrchestrator: true,
                forcedPersona: test.persona,
                state: {}
            });

            const response = result.response;
            const responseTime = Date.now() - startTime;

            console.log(`📤 RESPONSE:`);
            console.log(`─────────────────────────────────────────────────────────────────────────────────`);
            console.log(response);
            console.log(`─────────────────────────────────────────────────────────────────────────────────\n`);

            // Validate response
            const validation = validateResponse(response, test.expectations, test.persona);

            console.log(`🔍 VALIDATION:`);
            console.log(`   ${validation.passed ? '✅' : '❌'} Passed: ${validation.passed}`);
            console.log(`   📊 Score: ${validation.score}/${validation.maxScore}`);
            console.log(`   ⏱️  Response time: ${responseTime}ms\n`);

            console.log(`   📋 Details:`);
            validation.details.forEach(detail => console.log(detail));
            console.log('');

            results.push({
                test: test.name,
                persona: test.persona,
                passed: validation.passed,
                score: validation.score,
                maxScore: validation.maxScore,
                responseTime
            });

        } catch (error) {
            console.log(`   ❌ ERROR: ${error.message}\n`);
            results.push({
                test: test.name,
                persona: test.persona,
                passed: false,
                error: error.message
            });
        }
    }

    // Summary
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 TEST SUMMARY`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const totalPassed = results.filter(r => r.passed).length;
    const totalTests = results.length;
    const passRate = ((totalPassed / totalTests) * 100).toFixed(1);

    console.log(`   ${totalPassed === totalTests ? '✅' : '⚠️'} Passed: ${totalPassed}/${totalTests} (${passRate}%)\n`);

    results.forEach(r => {
        const status = r.passed ? '✅' : '❌';
        const score = r.score !== undefined ? ` ${r.score}/${r.maxScore}` : '';
        console.log(`   ${status} ${r.test}:${score}`);
    });

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    if (totalPassed === totalTests) {
        console.log('✅ ALL SANITY TESTS PASSED\n');
        process.exit(0);
    } else {
        console.log('❌ SOME TESTS FAILED - Review results above\n');
        process.exit(1);
    }
}

// Run tests
runSanityPack().catch(error => {
    console.error('❌ Test suite error:', error);
    process.exit(1);
});
