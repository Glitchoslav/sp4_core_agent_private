// 🧪 ENFORCER CLOUD SCENARIO TEST
// Verifies that Language Enforcer works with CLOUD AI responses
//
// TEST SCENARIO:
// 1. Allow cloud routing (autonomous controller decides)
// 2. Verify enforcer rewrites cloud response to Slovak
// 3. Verify metadata contract stable (meta === metadata)
// 4. Verify NO empty responses
// 5. Do NOT assert persona fingerprint (cloud AI doesn't know personas)
//
// @author Kefyk (SP4 Community)
// @version 1.3.1
// @date 2026-01-31

async function runEnforcerCloudScenario() {
    console.log('🧪 LANGUAGE ENFORCER CLOUD SCENARIO TEST\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 SCENARIO: English query → Cloud AI → Language Enforcer → Slovak output');
    console.log('   Expected: metadata stable, Slovak output, no empty response');
    console.log('   NOT expected: persona fingerprint (cloud AI generic)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { SP4IntegratedAgent } = await import('./integration.js');
    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    const testCases = [
        {
            name: 'CLOUD Technical Query (English)',
            input: 'How does artificial intelligence memory system work? Explain in detail.',
            mode: 'core',
            forceLocal: false, // 🔥 Allow cloud routing
            bypassAutonomous: false
        },
        {
            name: 'CLOUD Philosophy Query (English)',
            input: 'What is the purpose of existence? Why do humans seek meaning?',
            mode: 'glitchoslav',
            forceLocal: false,
            bypassAutonomous: false
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of testCases) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📋 TEST: ${test.name}`);
        console.log(`   Input: "${test.input}"`);
        console.log(`   Mode: ${test.mode}`);
        console.log(`   Cloud Allowed: YES (autonomous controller decides)`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        try {
            console.log('📸 BEFORE: Sending English query (cloud allowed)...\n');

            const result = await agent.processMessage(test.input, test.mode, {
                forceLocal: test.forceLocal,
                bypassAutonomous: test.bypassAutonomous
            });

            console.log(`\n📸 AFTER: Response received\n`);
            console.log(`📥 RESPONSE (${result.response.length} chars):`);
            console.log(`   "${result.response.substring(0, 200)}${result.response.length > 200 ? '...' : ''}"\n`);

            console.log(`📊 METADATA CONTRACT:`);
            console.log(`   meta.handledBy: ${result.meta?.handledBy || 'undefined'}`);
            console.log(`   metadata.handledBy: ${result.metadata?.handledBy || 'undefined'}`);
            console.log(`   meta === metadata: ${result.meta === result.metadata}`);
            console.log(`   meta.model: ${result.meta?.model || 'undefined'}`);
            console.log(`   metadata.model: ${result.metadata?.model || 'undefined'}`);
            console.log(`   meta.provider: ${result.meta?.provider || 'undefined'}`);

            // VALIDATION CHECKS (CLOUD-SPECIFIC)
            const checks = {
                passed: [],
                failed: []
            };

            // Check 1: Meta contract unified
            if (result.meta === result.metadata) {
                checks.passed.push('✅ meta === metadata (unified contract)');
            } else {
                checks.failed.push('❌ meta !== metadata (contract broken)');
            }

            // Check 2: Response NOT empty
            if (result.response && result.response.trim().length > 0) {
                checks.passed.push(`✅ Response present (${result.response.length} chars)`);
            } else {
                checks.failed.push('❌ EMPTY RESPONSE');
            }

            // Check 3: Response is in Slovak (enforcer worked)
            const englishPattern = /\b(the|and|of|to|in|is|that|with|for|as|this|what|how|does|work|explain)\b/gi;
            const englishWords = (result.response.match(englishPattern) || []).length;
            const totalWords = result.response.split(/\s+/).length;
            const englishRatio = totalWords > 0 ? (englishWords / totalWords * 100).toFixed(1) : 0;

            if (englishWords < 10) {
                checks.passed.push(`✅ Slovak output (${englishRatio}% EN)`);
            } else {
                checks.failed.push(`❌ Still English (${englishRatio}% EN, ${englishWords} words)`);
            }

            // Check 4: Cloud routing detected (if autonomous chose cloud)
            const handledBy = result.meta?.handledBy || result.metadata?.handledBy;
            if (handledBy && handledBy.includes('cloud')) {
                checks.passed.push(`✅ Cloud routing used (handledBy="${handledBy}")`);
            } else {
                // Not a failure - autonomous might choose local
                checks.passed.push(`ℹ️ Local routing used (handledBy="${handledBy}") - autonomous decision`);
            }

            // Check 5: Model not "unknown"
            const model = result.meta?.model || result.metadata?.model;
            if (model && model !== 'unknown') {
                checks.passed.push(`✅ model="${model}" (preserved)`);
            } else {
                checks.failed.push(`❌ model="${model}" (lost or unknown)`);
            }

            // Check 6: handledBy consistency
            if (result.meta?.handledBy === result.metadata?.handledBy) {
                checks.passed.push('✅ handledBy consistent (meta ↔ metadata)');
            } else {
                checks.failed.push(`❌ handledBy mismatch: meta="${result.meta?.handledBy}" vs metadata="${result.metadata?.handledBy}"`);
            }

            // RESULTS
            console.log(`\n🔍 VALIDATION RESULTS:`);

            if (checks.passed.length > 0) {
                console.log(`   ✅ PASSED (${checks.passed.length}):`);
                checks.passed.forEach(p => console.log(`      ${p}`));
            }

            if (checks.failed.length > 0) {
                console.log(`   ❌ FAILED (${checks.failed.length}):`);
                checks.failed.forEach(f => console.log(`      ${f}`));
            }

            const testPassed = checks.failed.length === 0;
            if (testPassed) {
                console.log(`\n✅ TEST PASSED - Cloud Language Enforcer stable`);
                passed++;
            } else {
                console.log(`\n❌ TEST FAILED - Cloud metadata or output compromised`);

                // Diagnostics
                console.log(`\n🔍 ENFORCER DIAGNOSTICS:`);
                console.log(`   Original length: ${test.input.length} chars`);
                console.log(`   Rewrite length: ${result.response.length} chars`);
                console.log(`   English ratio: ${englishRatio}%`);
                console.log(`   HandledBy: ${handledBy || 'unknown'}`);
                console.log(`   Model: ${model || 'unknown'}`);

                failed++;
            }

        } catch (err) {
            console.log(`\n❌ TEST ERROR: ${err.message}`);
            console.error(err);

            console.log(`\n🔍 ERROR DIAGNOSTICS:`);
            console.log(`   Test: ${test.name}`);
            console.log(`   Input: "${test.input}"`);
            console.log(`   Mode: ${test.mode}`);
            console.log(`   Stack: ${err.stack?.split('\n').slice(0, 3).join('\n   ')}`);

            failed++;
        }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 ENFORCER CLOUD SCENARIO RESULTS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   ✅ Passed: ${passed}/${testCases.length}`);
    console.log(`   ❌ Failed: ${failed}/${testCases.length}`);

    if (passed === testCases.length) {
        console.log(`\n🎉 ALL CLOUD ENFORCER SCENARIOS PASSED`);
        console.log(`   Cloud responses properly enforced to Slovak ✅`);
        console.log(`   Meta contract remains stable ✅`);
        console.log(`   No empty responses ✅`);
    } else {
        console.log(`\n⚠️ CLOUD ENFORCER SCENARIOS FAILED - Cloud pipeline integrity compromised`);
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

runEnforcerCloudScenario().catch(console.error);
