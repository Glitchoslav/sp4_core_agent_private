/**
 * SP4 CORE AGENT - Policy Test: Cloud Opt-In (v1.4.0)
 * 
 * Test Objective:
 * - Validate cloud opt-in policy (allowCloud: true)
 * - Cloud MAY run, but:
 *   - handledBy = persona (NOT cloud_*)
 *   - provider = cloud_groq / cloud_google (separate field)
 *   - meta === metadata (unified contract)
 * 
 * Expected Results:
 * ✅ cloudAllowed = true
 * ✅ policyReason = "cloud-allowed-explicit"
 * ✅ route = "autonomous-cloud"
 * ✅ handledBy = persona (core/glitchoslav/popici)
 * ✅ provider = cloud_* (if cloud used) OR local_ollama (if local chosen)
 * ✅ meta === metadata (same object reference)
 * 
 * NOTE: This is an INFORMATIONAL test. Cloud usage is autonomous decision,
 * so test validates contract, not deterministic cloud routing.
 */

import { SP4IntegratedAgent } from './integration.js';

async function testPolicyAllowCloud() {
    console.log('🧪 === SP4 POLICY TEST: Cloud Opt-In (v1.4.0) ===\n');
    console.log('ℹ️  NOTE: This test validates policy contract, NOT deterministic cloud routing.');
    console.log('   Autonomous controller may choose local if budget/complexity rules prefer it.\n');

    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    const testCases = [
        {
            name: 'CORE: Cloud allowed policy',
            message: 'Vysvetli mi deep learning architektúry a transformer modely?',
            options: {
                allowCloud: true, // 🔥 EXPLICIT CLOUD OPT-IN
                testMode: false // No test mode - allow full autonomous decision
            },
            expectedPolicy: {
                cloudAllowed: true,
                policyReason: 'cloud-allowed-explicit',
                route: 'autonomous-cloud'
            }
        },
        {
            name: 'GLITCHOSLAV: Cloud allowed policy',
            message: 'Aký je zmysel existencie v postmodernom svete?',
            options: {
                allowCloud: true,
                testMode: false
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
    let cloudUsed = 0;
    let localChosen = 0;

    for (const testCase of testCases) {
        console.log(`\n📋 TEST: ${testCase.name}`);
        console.log(`   Input: "${testCase.message}"`);
        console.log(`   Options: allowCloud=true`);

        try {
            const result = await agent.processMessage(testCase.message, 'auto', testCase.options);

            console.log(`\n   ✅ Response received (${result.response.length} chars)`);

            // Check if cloud was actually used
            const usedCloud = result.metadata?.provider?.startsWith('cloud_');
            if (usedCloud) {
                cloudUsed++;
                console.log(`   ☁️  Cloud USED: ${result.metadata.provider}`);
            } else {
                localChosen++;
                console.log(`   🏠 Local CHOSEN: ${result.metadata.provider}`);
            }

            // Validate policy fields (regardless of which provider chosen)
            const checks = [
                {
                    name: 'cloudAllowed = true',
                    pass: result.metadata?.cloudAllowed === true,
                    actual: result.metadata?.cloudAllowed
                },
                {
                    name: 'policyReason = cloud-allowed-explicit',
                    pass: result.metadata?.policyReason === 'cloud-allowed-explicit',
                    actual: result.metadata?.policyReason
                },
                {
                    name: 'route = autonomous-cloud',
                    pass: result.metadata?.route === 'autonomous-cloud',
                    actual: result.metadata?.route
                },
                {
                    name: 'provider exists (cloud_* OR local_ollama)',
                    pass: result.metadata?.provider &&
                        (result.metadata.provider.startsWith('cloud_') ||
                            result.metadata.provider === 'local_ollama'),
                    actual: result.metadata?.provider
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
                    actual: `meta=${typeof result.meta}, metadata=${typeof result.metadata}, same=${result.meta === result.metadata}`
                }
            ];

            // If cloud was used, validate cloud-specific fields
            if (usedCloud) {
                checks.push({
                    name: 'cloudCost exists (if cloud used)',
                    pass: typeof result.metadata?.cloudCost === 'number',
                    actual: result.metadata?.cloudCost
                });
                checks.push({
                    name: 'cloudLatency exists (if cloud used)',
                    pass: typeof result.metadata?.cloudLatency === 'number',
                    actual: result.metadata?.cloudLatency
                });
            }

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
                console.log(`\n   ✅ ${testCase.name} PASSED`);
                passed++;
            } else {
                console.log(`\n   ❌ ${testCase.name} FAILED`);
                failed++;
            }

        } catch (error) {
            console.error(`   ❌ ERROR: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
            failed++;
        }
    }

    console.log(`\n\n🏁 === TEST SUMMARY ===`);
    console.log(`   ✅ Passed: ${passed}/${testCases.length}`);
    console.log(`   ❌ Failed: ${failed}/${testCases.length}`);
    console.log(`\n   📊 Cloud Usage Stats:`);
    console.log(`      ☁️  Cloud used: ${cloudUsed}/${testCases.length}`);
    console.log(`      🏠 Local chosen: ${localChosen}/${testCases.length}`);

    if (failed === 0) {
        console.log(`\n   🎉 ALL TESTS PASSED - Cloud opt-in policy working!`);
        console.log(`   ℹ️  Cloud usage is autonomous decision - both outcomes valid.`);
        process.exit(0);
    } else {
        console.log(`\n   ⚠️  SOME TESTS FAILED - Policy contract broken!`);
        process.exit(1);
    }
}

// Run tests
testPolicyAllowCloud().catch(err => {
    console.error('💥 TEST RUNNER ERROR:', err);
    process.exit(1);
});
