/**
 * SP4 CORE AGENT - Cloud Execution Smoke Test (v1.4.2)
 * 
 * Test Objective:
 * - Validate REAL cloud execution (Groq/Google API calls)
 * - Verify end-to-end cloud path after PHASE 2 policy implementation
 * 
 * Expected Results:
 * ✅ policy.forceCloud = true (policy intent)
 * ✅ execution.cloudUsed = true (execution reality)
 * ✅ execution.provider = cloud_groq OR cloud_google (NOT local_ollama)
 * ✅ execution.cloudDisabled = false (not blocked by testMode or policy)
 * ✅ handledBy = persona (core/glitchoslav/popici)
 * ✅ meta === metadata (unified contract)
 * ✅ response not empty (actual cloud response received)
 * 
 * CRITICAL: This test uses forceCloud=true to ensure deterministic cloud execution.
 * Without it, autonomous controller may choose local (budget/complexity rules).
 * 
 * 🔥 v1.4.2 GUARD: Prevents SP4_TEST=true from silently blocking cloud execution.
 * 
 * Prerequisites:
 * - Ollama running (for initialization)
 * - GROQ_API_KEY or GOOGLE_API_KEY in environment/SP4AIOS/.env
 * - Internet connection
 * - SP4_TEST must NOT be set to 'true'
 */

import { SP4IntegratedAgent } from './integration.js';

async function testCloudExecutionSmoke() {
    console.log('🧪 === SP4 CLOUD EXECUTION SMOKE TEST (v1.4.2) ===\n');

    // 🔥 v1.4.2: GUARD - Prevent SP4_TEST from silently blocking cloud
    if (process.env.SP4_TEST === 'true') {
        console.error('❌ ERROR: SP4_TEST=true blocks cloud execution!');
        console.error('   This smoke test requires REAL cloud calls.');
        console.error('   Unset SP4_TEST before running:');
        console.error('   \n   $env:SP4_TEST=""; node test_cloud_execution_smoke.js\n');
        process.exit(1);
    }

    console.log('☁️  NOTE: This test makes REAL cloud API calls (Groq/Google).');
    console.log('   Requires valid API keys and internet connection.\n');

    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    // Check if cloud is available
    if (!agent.cloudAIEnabled) {
        console.error('❌ SKIP: Cloud AI not available (no API keys found)');
        console.error('   Set GROQ_API_KEY or GOOGLE_API_KEY in SP4AIOS/.env');
        process.exit(1);
    }

    console.log('✅ Cloud AI available:', {
        groq: agent.aiosBridge?.groqEnabled,
        google: agent.aiosBridge?.googleEnabled
    });

    const testCases = [
        {
            name: 'CORE: Cloud execution (technical query)',
            message: 'Explain transformer architecture in AI models - self-attention mechanism, multi-head attention, positional encoding?',
            options: {
                forceCloud: true, // 🔥 FORCE CLOUD for deterministic test
                testMode: false // Allow full pipeline (not minimal)
            }
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        console.log(`\n📋 TEST: ${testCase.name}`);
        console.log(`   Input: "${testCase.message.substring(0, 80)}..."`);
        console.log(`   Options: forceCloud=true (force cloud execution)`);

        try {
            const startTime = Date.now();
            const result = await agent.processMessage(testCase.message, 'core', testCase.options);
            const totalTime = Date.now() - startTime;

            console.log(`\n   ✅ Response received (${result.response.length} chars, ${totalTime}ms)`);

            // 🔥 v1.4.2: Extract policy and execution from new metadata contract
            const policy = result.metadata?.policy || result.meta?.policy;
            const execution = result.metadata?.execution || result.meta?.execution;

            console.log(`\n   📊 POLICY CONTRACT:`);
            console.log(`      forceCloud: ${policy?.forceCloud}`);
            console.log(`      cloudAllowed: ${policy?.cloudAllowed}`);
            console.log(`      route: ${policy?.route}`);

            console.log(`\n   📊 EXECUTION REALITY:`);
            console.log(`      cloudUsed: ${execution?.cloudUsed}`);
            console.log(`      provider: ${execution?.provider}`);
            console.log(`      cloudDisabled: ${execution?.cloudDisabled}`);

            // Validate cloud execution (v1.4.2 metadata contract)
            const checks = [
                {
                    name: 'policy.forceCloud = true (intent)',
                    pass: policy?.forceCloud === true,
                    actual: policy?.forceCloud,
                    critical: true
                },
                {
                    name: 'execution.cloudUsed = true (reality)',
                    pass: execution?.cloudUsed === true,
                    actual: execution?.cloudUsed,
                    critical: true
                },
                {
                    name: 'execution.provider = cloud_* (NOT local)',
                    pass: execution?.provider?.startsWith('cloud_'),
                    actual: execution?.provider,
                    critical: true
                },
                {
                    name: 'execution.cloudDisabled = false',
                    pass: execution?.cloudDisabled === false,
                    actual: execution?.cloudDisabled,
                    critical: true
                },
                {
                    name: 'handledBy = persona (NOT provider)',
                    pass: result.metadata?.handledBy &&
                        !result.metadata.handledBy.startsWith('cloud_'),
                    actual: result.metadata?.handledBy
                },
                {
                    name: 'meta === metadata (unified contract)',
                    pass: result.meta === result.metadata,
                    actual: `same=${result.meta === result.metadata}`
                },
                {
                    name: 'response not empty',
                    pass: result.response && result.response.trim().length > 50,
                    actual: `${result.response?.length || 0} chars`
                }
            ];

            let testPassed = true;
            for (const check of checks) {
                if (check.pass) {
                    console.log(`   ✅ ${check.name}`);
                } else {
                    console.log(`   ${check.critical ? '❌' : '⚠️'} ${check.name}`);
                    console.log(`      Actual: ${check.actual}`);
                    if (check.critical) testPassed = false;
                }
            }
            // Extra info logging
            console.log(`\n   📊 Cloud Metadata:`);
            console.log(`      Provider: ${result.metadata?.provider || 'unknown'}`);
            console.log(`      Model: ${result.metadata?.model || result.model || 'unknown'}`);
            console.log(`      Cost: $${result.metadata?.cloudCost || result.cloudCost || 0}`);
            console.log(`      Latency: ${result.metadata?.cloudLatency || result.cloudLatency || 0}ms`);

            if (testPassed) {
                console.log(`\n   ✅ ${testCase.name} PASSED`);
                passed++;
            } else {
                console.log(`\n   ❌ ${testCase.name} FAILED (critical checks failed)`);
                failed++;
            }

        } catch (error) {
            console.error(`   ❌ ERROR: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
            failed++;

            // Check if it's infrastructure failure vs logic bug
            const isInfraFailure =
                error.message.includes('ECONNREFUSED') ||
                error.message.includes('timeout') ||
                error.message.includes('API key') ||
                error.message.includes('rate limit');

            if (isInfraFailure) {
                console.log(`\n   ⚠️  INFRASTRUCTURE FAILURE (NOT LOGIC BUG)`);
                console.log(`   This may be: API key issue, network problem, or rate limit.`);
            }
        }
    }

    console.log(`\n\n🏁 === TEST SUMMARY ===`);
    console.log(`   ✅ Passed: ${passed}/${testCases.length}`);
    console.log(`   ❌ Failed: ${failed}/${testCases.length}`);

    if (failed === 0) {
        console.log(`\n   🎉 ALL TESTS PASSED - Cloud execution working!`);
        console.log(`   ☁️  Real cloud API calls successful (Groq/Google).`);
        process.exit(0);
    } else {
        console.log(`\n   ⚠️  SOME TESTS FAILED - Cloud execution broken!`);
        console.log(`   Check: API keys, network, budget limits, policy enforcement.`);
        process.exit(1);
    }
}

// Run tests
testCloudExecutionSmoke().catch(err => {
    console.error('💥 TEST RUNNER ERROR:', err);
    process.exit(1);
});
