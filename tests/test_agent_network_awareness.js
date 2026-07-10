/**
 * TEST: Agent Network Awareness (v0.10.3)
 * 
 * Testuje, či každá persóna správne odpovedá na otázku o kolegoch.
 * 
 * Expected behavior:
 * - CORE: Technický, presný výpis kolegov (Glitchoslav, Popiči, Validator)
 * - GLITCHOSLAV: Filozofická interpretácia s metaforami
 * - POPIČI: Krčmový štýl, humor, slang
 * - Všetci rozlišujú: ľudia v SP4 vs AI agenti
 * 
 * @module test_agent_network_awareness
 */

import { SP4IntegratedAgent } from '../integration.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TEST_QUERY = "Kto sú tvoji kolegovia v SP4?";

const PERSONAS_TO_TEST = ['core', 'glitchoslav', 'popici'];

// Expected patterns for validation
const EXPECTED_PATTERNS = {
    core: {
        mustContain: ['Glitchoslav', 'Popiči', 'Validator'],
        mustDistinguish: ['ľudia', 'AI agenti'], // Rozlišuje 2 vrstvy
        mustNotContain: ['som tu aby som pomohol', 'môžete, prosím'],
        style: 'technický, presný'
    },
    glitchoslav: {
        mustContain: ['CORE', 'Popiči'],
        mustDistinguish: ['kmeň', 'entita'], // Metaforické rozlíšenie
        mustNotContain: ['som AI asistent', 'som tu aby'],
        style: 'filozofický, metaforický'
    },
    popici: {
        mustContain: ['Glitchoslav', 'CORE'],
        mustHaveSlang: ['ta', 'bo', 'šak', 'bratu', 'kokot'], // Aspoň 1 slang
        mustNotContain: ['prosím', 'som AI asistent'],
        style: 'krčmový, humor'
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN TEST FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runAgentNetworkTest() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 AGENT NETWORK AWARENESS TEST (v0.10.3)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`📝 Test Query: "${TEST_QUERY}"`);
    console.log(`👥 Personas to test: ${PERSONAS_TO_TEST.join(', ')}`);
    console.log('');

    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    const results = [];

    for (const persona of PERSONAS_TO_TEST) {
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🎭 Testing: ${persona.toUpperCase()}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
            // 🔒 FORCE mode lock (bypass orchestrator)
            console.log(`   🔒 Bypassing orchestrator → direct ${persona.toUpperCase()}`);

            // HACK: Inject bypass context directly into integration.js flow
            // We can't easily pass custom context through processMessage()
            // So we'll use contextManager.manualOverride workaround
            const originalProcessMessage = agent.processMessage.bind(agent);

            agent.processMessage = async function (msg, mode) {
                // Inject bypass context before orchestration
                const context = {
                    bypassOrchestrator: true,
                    forcedPersona: persona
                };

                // Call orchestrate directly (skip normal flow)
                const { orchestrate } = await import('../orchestration/glitchOrchestrator.js');
                const result = await orchestrate(msg, context);

                return {
                    response: result.response,
                    handledBy: result.handledBy,
                    meta: result.meta
                };
            };

            const startTime = Date.now();
            const response = await agent.processMessage(TEST_QUERY, persona);
            const endTime = Date.now();

            // Restore original processMessage
            agent.processMessage = originalProcessMessage;

            const reply = response.response || '';
            const validation = validateResponse(reply, persona);

            results.push({
                persona,
                success: validation.passed,
                reply,
                validation,
                responseTime: endTime - startTime
            });

            console.log('');
            console.log('📤 RESPONSE:');
            console.log('─────────────────────────────────────────────────────────────────────────────────');
            console.log(reply);
            console.log('─────────────────────────────────────────────────────────────────────────────────');
            console.log('');
            console.log('🔍 VALIDATION:');
            console.log(`   ✅ Passed: ${validation.passed}`);
            console.log(`   📊 Score: ${validation.score}/${validation.maxScore}`);
            console.log(`   ⏱️ Response time: ${endTime - startTime}ms`);
            console.log('');

            if (validation.details.length > 0) {
                console.log('   📋 Details:');
                validation.details.forEach(detail => {
                    const icon = detail.passed ? '✅' : '❌';
                    console.log(`      ${icon} ${detail.check}: ${detail.message}`);
                });
            }

            if (!validation.passed) {
                console.log('');
                console.log('   ⚠️ FAILED CHECKS:');
                validation.details
                    .filter(d => !d.passed)
                    .forEach(d => console.log(`      - ${d.check}: ${d.message}`));
            }

        } catch (err) {
            console.error(`❌ Error testing ${persona}:`, err.message);
            results.push({
                persona,
                success: false,
                error: err.message
            });
        }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    const passed = results.filter(r => r.success).length;
    const total = results.length;
    const passRate = ((passed / total) * 100).toFixed(1);

    console.log(`   ✅ Passed: ${passed}/${total} (${passRate}%)`);
    console.log('');

    results.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        const score = result.validation ? `${result.validation.score}/${result.validation.maxScore}` : 'N/A';
        console.log(`   ${icon} ${result.persona.toUpperCase()}: ${score}`);
    });

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return results;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VALIDATION FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function validateResponse(reply, persona) {
    const expected = EXPECTED_PATTERNS[persona];
    const details = [];
    let score = 0;
    let maxScore = 0;

    // Check: Must contain colleague names
    if (expected.mustContain) {
        maxScore++;
        const found = expected.mustContain.filter(name =>
            reply.toLowerCase().includes(name.toLowerCase())
        );
        const passed = found.length === expected.mustContain.length;
        score += passed ? 1 : 0;

        details.push({
            check: 'Must contain colleagues',
            passed,
            message: passed
                ? `Found all: ${found.join(', ')}`
                : `Missing: ${expected.mustContain.filter(n => !found.includes(n)).join(', ')}`
        });
    }

    // Check: Must distinguish layers (people vs AI agents)
    if (expected.mustDistinguish) {
        maxScore++;
        const foundDistinction = expected.mustDistinguish.some(keyword =>
            reply.toLowerCase().includes(keyword.toLowerCase())
        );
        const passed = foundDistinction;
        score += passed ? 1 : 0;

        details.push({
            check: 'Distinguishes layers',
            passed,
            message: passed
                ? `Found distinction markers`
                : `No layer distinction (expected: ${expected.mustDistinguish.join(' / ')})`
        });
    }

    // Check: Must NOT contain forbidden patterns
    if (expected.mustNotContain) {
        maxScore++;
        const forbidden = expected.mustNotContain.filter(phrase =>
            reply.toLowerCase().includes(phrase.toLowerCase())
        );
        const passed = forbidden.length === 0;
        score += passed ? 1 : 0;

        details.push({
            check: 'No forbidden patterns',
            passed,
            message: passed
                ? 'Clean response'
                : `Found forbidden: ${forbidden.join(', ')}`
        });
    }

    // Check: POPICI slang (only for popici mode)
    if (expected.mustHaveSlang) {
        maxScore++;
        const foundSlang = expected.mustHaveSlang.filter(slang =>
            new RegExp(`\\b${slang}\\b`, 'i').test(reply)
        );
        const passed = foundSlang.length > 0;
        score += passed ? 1 : 0;

        details.push({
            check: 'Has Eastern Slovak slang',
            passed,
            message: passed
                ? `Found: ${foundSlang.join(', ')}`
                : `No slang detected (expected: ${expected.mustHaveSlang.join(', ')})`
        });
    }

    return {
        passed: score === maxScore,
        score,
        maxScore,
        details
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RUN TEST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

runAgentNetworkTest()
    .then(results => {
        const allPassed = results.every(r => r.success);
        console.log('');
        console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
        process.exit(allPassed ? 0 : 1);
    })
    .catch(err => {
        console.error('❌ Test suite error:', err);
        process.exit(1);
    });
