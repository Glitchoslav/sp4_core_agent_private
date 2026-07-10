/**
 * SP4 CORE AGENT - Policy Test: Force Local CONTRACT (v1.4.1)
 * 
 * Test Objective:
 * - Validate force local policy CONTRACT
 * - When forceLocal=true, cloud must be blocked regardless of other flags
 * 
 * Expected Results:
 * ✅ cloudAllowed = false
 * ✅ policyReason = "force-local-test"
 * ✅ route = "force-local"
 * ✅ handledBy = persona (core/glitchoslav/popici)
 * ✅ provider = local_ollama (cloud must be blocked)
 * ✅ meta === metadata (unified contract)
 * 
 * NOTE: This validates that forceLocal takes precedence over allowCloud.
 */

import { SP4IntegratedAgent } from './integration.js';

async function testPolicyForceLocalContract() {
    console.log('🧪 === SP4 POLICY TEST: Force Local CONTRACT (v1.4.1) ===\n');
    console.log('ℹ️  NOTE: This test validates force local policy contract.');
    console.log('   forceLocal=true must block cloud regardless of allowCloud.\n');

    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    const testCases = [
        {
            name: 'CORE: Force local policy (contract)',
            message: 'Vysvetli mi ako funguje SP4 memory system?',
            options: {
                forceLocal: true, // 🔒 FORCE LOCAL (highest priority)
                testMode: true
            },
            expectedPolicy: {
                cloudAllowed: false,
                policyReason: 'force-local-test',
                route: 'force-local'
            }
        },
        {
            name: 'GLITCHOSLAV: Force local with allowCloud=true (precedence test)',
            message: 'Aký je zmysel pravdy?',
            options: {
                forceLocal: true,  // 🔒 FORCE LOCAL (must take precedence)
                allowCloud: true,  // This should be ignored
                testMode: true
            },
            expectedPolicy: {
                cloudAllowed: false, // forceLocal takes precedence
                policyReason: 'force-local-test',
                route: 'force-local'
            }
        },
        {
            name: 'POPIČI: Force local policy (contract)',
            message: 'Ta čo piješ za sračky?',
            options: {
                forceLocal: true,
                testMode: true
            },
            expectedPolicy: {
                cloudAllowed: false,
                policyReason: 'force-local-test',
                route: 'force-local'
            }
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        console.log(`\n📋 TEST: ${testCase.name}`);
        console.log(`   Input: "${testCase.message}"`);
        console.log(`   Options: forceLocal=true (cloud must be blocked)`);

        try {
            const result = await agent.processMessage(testCase.message, 'auto', testCase.options);

            console.log(`\n   ✅ Response received (${result.response.length} chars)`);

            // 🔥 v1.4.2: Validate NEW metadata contract (policy vs execution)
            const policy = result.metadata?.policy || result.meta?.policy;
            const execution = result.metadata?.execution || result.meta?.execution;

            console.log(`\n   📊 POLICY CONTRACT:`);
            console.log(`      cloudAllowed: ${policy?.cloudAllowed}`);
            console.log(`      forceLocal: ${policy?.forceLocal}`);
            console.log(`      route: ${policy?.route}`);
            console.log(`      reason: ${policy?.reason}`);

            console.log(`\n   📊 EXECUTION:`);
            console.log(`      provider: ${execution?.provider}`);
            console.log(`      cloudUsed: ${execution?.cloudUsed}`);
            console.log(`      cloudDisabled: ${execution?.cloudDisabled}`);
            console.log(`      cloudDisabledReason: ${execution?.cloudDisabledReason}`);

            // Validate force local policy contract (v1.4.2)
            const checks = [
                {
                    name: 'policy.cloudAllowed = false (cloud blocked)',
                    pass: policy?.cloudAllowed === false,
                    actual: policy?.cloudAllowed
                },
                {
                    name: 'policy.forceLocal = true',
                    pass: policy?.forceLocal === true,
                    actual: policy?.forceLocal
                },
                {
                    name: 'policy.reason = force-local-test',
                    pass: policy?.reason === 'force-local-test',
                    actual: policy?.reason
                },
                {
                    name: 'policy.route = force-local',
                    pass: policy?.route === 'force-local',
                    actual: policy?.route
                },
                {
                    name: 'execution.cloudDisabled = true (policy)',
                    pass: execution?.cloudDisabled === true,
                    actual: execution?.cloudDisabled
                },
                {
                    name: 'execution.cloudDisabledReason = policy',
                    pass: execution?.cloudDisabledReason === 'policy',
                    actual: execution?.cloudDisabledReason
                },
                {
                    name: 'execution.provider = local_ollama (cloud blocked)',
                    pass: execution?.provider === 'local_ollama',
                    actual: execution?.provider
                },
                {
                    name: 'handledBy = persona (NOT provider)',
                    pass: result.metadata?.handledBy &&
                        !result.metadata.handledBy.startsWith('cloud_') &&
                        result.metadata.handledBy !== 'local_ollama',
                    actual: result.metadata?.handledBy
                },
                {
                    name: 'meta === metadata (unified contract)',
                    pass: result.meta === result.metadata,
                    actual: `same=${result.meta === result.metadata}`
                }
            ];

            // 🔥 v1.4.2: Print validation results only once per test case
            let testPassed = true;
            for (const check of checks) {
                if (check.pass) {
                    console.log(`   ✅ ${check.name}`);
                } else {
                    console.log(`   ❌ ${check.name}`);
                    console.log(`      Actual: ${check.actual}`);
                    testPassed = false;
                }
            }

            if (testPassed) {
                console.log(`\n   ✅ ${testCase.name} PASSED\n`);

                // 🔥 v1.4.2: One-line case summary (grep-friendly)
                console.log(`   ✅ CASE SUMMARY: route=${policy?.route} cloudAllowed=${policy?.cloudAllowed} cloudUsed=${execution?.cloudUsed} cloudDisabledReason=${execution?.cloudDisabledReason} provider=${execution?.provider}\n`);

                passed++;
            } else {
                console.log(`\n   ❌ ${testCase.name} FAILED\n`);
                failed++;
            }

        } catch (error) {
            console.error(`   ❌ ERROR: ${error.message}`);
            failed++;
        }
    }

    console.log(`\n\n🏁 === TEST SUMMARY ===`);
    console.log(`   ✅ Passed: ${passed}/${testCases.length}`);
    console.log(`   ❌ Failed: ${failed}/${testCases.length}`);

    if (failed === 0) {
        console.log(`\n   🎉 ALL TESTS PASSED - Force local policy working!`);
        console.log(`   🔒 forceLocal=true correctly blocks cloud execution.`);
        process.exit(0);
    } else {
        console.log(`\n   ⚠️  SOME TESTS FAILED - Force local policy broken!`);
        process.exit(1);
    }
}

// Run tests
testPolicyForceLocalContract().catch(err => {
    console.error('💥 TEST RUNNER ERROR:', err);
    process.exit(1);
});
