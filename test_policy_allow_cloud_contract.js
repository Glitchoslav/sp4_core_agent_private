/**
 * SP4 CORE AGENT - Policy Test: Cloud Opt-In CONTRACT (v1.4.1)
 * 
 * Test Objective:
 * - Validate cloud opt-in policy CONTRACT (not actual cloud execution)
 * - Policy fields must be correct even without real cloud calls
 * 
 * Expected Results:
 * ✅ cloudAllowed = true
 * ✅ policyReason = "cloud-allowed-explicit"
 * ✅ route = "autonomous-cloud"
 * ✅ handledBy = persona (core/glitchoslav/popici)
 * ✅ provider can be local_ollama (no cloud execution, just policy contract)
 * ✅ meta === metadata (unified contract)
 * 
 * NOTE: This test uses SP4_TEST=true to disable cloud execution.
 * For actual cloud execution test, see test_cloud_execution_smoke.js
 */

import { SP4IntegratedAgent } from './integration.js';

async function testPolicyAllowCloudContract() {
    console.log('🧪 === SP4 POLICY TEST: Cloud Opt-In CONTRACT (v1.4.1) ===\n');
    console.log('ℹ️  NOTE: This test validates policy contract, NOT cloud execution.');
    console.log('   Uses SP4_TEST=true to prevent real cloud calls.\n');

    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    const testCases = [
        {
            name: 'CORE: Cloud allowed policy (contract)',
            message: 'Vysvetli mi ako funguje SP4 memory system?',
            options: {
                allowCloud: true, // 🔥 EXPLICIT CLOUD OPT-IN (policy contract)
                testMode: true    // Disable cloud execution (contract test only)
            },
            expectedPolicy: {
                cloudAllowed: true,
                policyReason: 'cloud-allowed-explicit',
                route: 'autonomous-cloud'
            }
        },
        {
            name: 'GLITCHOSLAV: Cloud allowed policy (contract)',
            message: 'Aký je zmysel pravdy?',
            options: {
                allowCloud: true,
                testMode: true
            },
            expectedPolicy: {
                cloudAllowed: true,
                policyReason: 'cloud-allowed-explicit',
                route: 'autonomous-cloud'
            }
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        console.log(`\n📋 TEST: ${testCase.name}`);
        console.log(`   Input: "${testCase.message}"`);
        console.log(`   Options: allowCloud=true, testMode=true (contract test, no cloud execution)`);

        try {
            const result = await agent.processMessage(testCase.message, 'auto', testCase.options);

            console.log(`\n   ✅ Response received (${result.response.length} chars)`);

            // 🔥 v1.4.2: Validate NEW metadata contract (policy vs execution)
            const policy = result.metadata?.policy || result.meta?.policy;
            const execution = result.metadata?.execution || result.meta?.execution;

            console.log(`\n   📊 POLICY CONTRACT:`);
            console.log(`      cloudAllowed: ${policy?.cloudAllowed}`);
            console.log(`      route: ${policy?.route}`);
            console.log(`      reason: ${policy?.reason}`);

            console.log(`\n   📊 EXECUTION (testMode blocks cloud):`);
            console.log(`      provider: ${execution?.provider}`);
            console.log(`      cloudUsed: ${execution?.cloudUsed}`);
            console.log(`      cloudDisabled: ${execution?.cloudDisabled}`);
            console.log(`      cloudDisabledReason: ${execution?.cloudDisabledReason}`);

            // Validate policy contract fields (v1.4.2)
            const checks = [
                {
                    name: 'policy.cloudAllowed = true (policy intent)',
                    pass: policy?.cloudAllowed === true,
                    actual: policy?.cloudAllowed
                },
                {
                    name: 'policy.reason = cloud-allowed-explicit',
                    pass: policy?.reason === 'cloud-allowed-explicit',
                    actual: policy?.reason
                },
                {
                    name: 'policy.route = autonomous-cloud',
                    pass: policy?.route === 'autonomous-cloud',
                    actual: policy?.route
                },
                {
                    name: 'execution.cloudDisabled = true (testMode)',
                    pass: execution?.cloudDisabled === true,
                    actual: execution?.cloudDisabled
                },
                {
                    name: 'execution.cloudDisabledReason = testMode',
                    pass: execution?.cloudDisabledReason === 'testMode',
                    actual: execution?.cloudDisabledReason
                },
                {
                    name: 'execution.provider = local_ollama (contract test)',
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
        console.log(`\n   🎉 ALL TESTS PASSED - Cloud opt-in policy contract valid!`);
        console.log(`   ℹ️  This validates policy fields, not actual cloud execution.`);
        console.log(`   ℹ️  For cloud execution test, run: npm run test:cloud:smoke`);
        process.exit(0);
    } else {
        console.log(`\n   ⚠️  SOME TESTS FAILED - Policy contract broken!`);
        process.exit(1);
    }
}

// Run tests
testPolicyAllowCloudContract().catch(err => {
    console.error('💥 TEST RUNNER ERROR:', err);
    process.exit(1);
});
