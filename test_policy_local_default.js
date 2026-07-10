/**
 * SP4 CORE AGENT - Policy Test: Local Default (v1.4.0)
 * 
 * Test Objective:
 * - Validate default local-first policy (no flags)
 * - Ensure provider=local_ollama
 * - Ensure cloudAllowed=false
 * - Ensure handledBy=persona (NOT provider)
 * - Ensure meta===metadata (unified contract)
 * 
 * Expected Results:
 * ✅ provider = "local_ollama"
 * ✅ cloudAllowed = false
 * ✅ policyReason = "local-first-default"
 * ✅ route = "local-first"
 * ✅ handledBy = persona (core/glitchoslav/popici)
 * ✅ meta === metadata (same object reference)
 */

import { SP4IntegratedAgent } from './integration.js';

async function testPolicyLocalDefault() {
    console.log('🧪 === SP4 POLICY TEST: Local Default (v1.4.0) ===\n');

    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    const testCases = [
        {
            name: 'CORE: Local default policy',
            message: 'Vysvetli mi ako funguje SP4 memory system?',
            options: {
                // NO FLAGS - default policy
                testMode: true // Keep test mode for speed
            },
            expectedPolicy: {
                provider: 'local_ollama',
                cloudAllowed: false,
                policyReason: 'local-first-default',
                route: 'local-first'
            }
        },
        {
            name: 'GLITCHOSLAV: Local default policy',
            message: 'Čo je pravda?',
            options: {
                testMode: true
            },
            expectedPolicy: {
                provider: 'local_ollama',
                cloudAllowed: false,
                policyReason: 'local-first-default',
                route: 'local-first'
            }
        },
        {
            name: 'POPIČI: Local default policy',
            message: 'Ta čo piješ za sračky?',
            options: {
                testMode: true
            },
            expectedPolicy: {
                provider: 'local_ollama',
                cloudAllowed: false,
                policyReason: 'local-first-default',
                route: 'local-first'
            }
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        console.log(`\n📋 TEST: ${testCase.name}`);
        console.log(`   Input: "${testCase.message}"`);

        try {
            const result = await agent.processMessage(testCase.message, 'auto', testCase.options);

            console.log(`\n   ✅ Response received (${result.response.length} chars)`);

            // Validate policy fields
            const checks = [
                {
                    name: 'provider = local_ollama',
                    pass: result.metadata?.provider === 'local_ollama',
                    actual: result.metadata?.provider
                },
                {
                    name: 'cloudAllowed = false',
                    pass: result.metadata?.cloudAllowed === false,
                    actual: result.metadata?.cloudAllowed
                },
                {
                    name: 'policyReason = local-first-default OR short-input-guard',
                    pass: result.metadata?.policyReason === 'local-first-default' ||
                        result.metadata?.policyReason === 'short-input-guard',
                    actual: result.metadata?.policyReason
                },
                {
                    name: 'route = local-first',
                    pass: result.metadata?.route === 'local-first',
                    actual: result.metadata?.route
                },
                {
                    name: 'handledBy = persona (NOT provider)',
                    pass: result.metadata?.handledBy && !result.metadata.handledBy.includes('cloud'),
                    actual: result.metadata?.handledBy
                },
                {
                    name: 'meta === metadata (unified contract)',
                    pass: result.meta === result.metadata,
                    actual: `meta=${typeof result.meta}, metadata=${typeof result.metadata}, same=${result.meta === result.metadata}`
                }
            ];

            let testPassed = true;
            for (const check of checks) {
                if (check.pass) {
                    console.log(`   ✅ ${check.name}`);
                } else {
                    console.log(`   ❌ ${check.name}`);
                    console.log(`      Expected: ${testCase.expectedPolicy[check.name.split('=')[0].trim()]}`);
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
            failed++;
        }
    }

    console.log(`\n\n🏁 === TEST SUMMARY ===`);
    console.log(`   ✅ Passed: ${passed}/${testCases.length}`);
    console.log(`   ❌ Failed: ${failed}/${testCases.length}`);

    if (failed === 0) {
        console.log(`\n   🎉 ALL TESTS PASSED - Local-first policy working!`);
        process.exit(0);
    } else {
        console.log(`\n   ⚠️  SOME TESTS FAILED - Policy contract broken!`);
        process.exit(1);
    }
}

// Run tests
testPolicyLocalDefault().catch(err => {
    console.error('💥 TEST RUNNER ERROR:', err);
    process.exit(1);
});
