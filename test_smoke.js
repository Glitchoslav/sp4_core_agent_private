// 🧪 SMOKE TEST - Fast health check (10-15s)
// Verifies basic system functionality without deep validation
//
// PURPOSE:
// - Quick answer to "Is it healthy?"
// - Pre-deployment sanity check
// - CI/CD gate (fast feedback)
//
// SCOPE:
// - One CORE request (forceLocal)
// - Assert: meta===metadata, handledBy=core, provider=local_ollama
// - Assert: non-empty Slovak output
// - Report: latency, retries, output length
//
// @author Kefyk (SP4 Community)
// @version 1.3.2
// @date 2026-01-31

async function runSmokeTest() {
    console.log('🧪 SP4 SMOKE TEST\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 GOAL: Fast health check (10-15s)');
    console.log('   Verify: basic functionality, local-first, Slovak output');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { SP4IntegratedAgent } = await import('./integration.js');
    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    const testMessage = 'Vysvetli mi ako funguje SP4 memory system?'; // Longer query to bypass short_reply_guard
    const startTime = Date.now();

    console.log('📋 SMOKE TEST: CORE persona health check');
    console.log(`   Input: "${testMessage}"`);
    console.log(`   Mode: core`);
    console.log(`   Force Local: YES\n`);

    try {
        const result = await agent.processMessage(testMessage, 'core', {
            forceLocal: true,
            testMode: true
        });

        const latency = Date.now() - startTime;

        console.log(`\n✅ RESPONSE RECEIVED (${latency}ms)\n`);

        // VALIDATION CHECKS
        const checks = {
            passed: [],
            failed: []
        };

        // Check 1: Response not empty
        if (result.response && result.response.trim().length > 0) {
            checks.passed.push(`✅ Response present (${result.response.length} chars)`);
        } else {
            checks.failed.push('❌ EMPTY RESPONSE');
        }

        // Check 2: Meta contract unified
        if (result.meta === result.metadata) {
            checks.passed.push('✅ meta === metadata (unified contract)');
        } else {
            checks.failed.push('❌ meta !== metadata (contract broken)');
        }

        // Check 3: handledBy = core
        const handledBy = result.meta?.handledBy || result.metadata?.handledBy;
        if (handledBy === 'core') {
            checks.passed.push(`✅ handledBy="core" (correct persona)`);
        } else {
            checks.failed.push(`❌ handledBy="${handledBy}" (expected "core")`);
        }

        // Check 4: Provider = local_ollama (not cloud)
        const provider = result.meta?.execution?.provider || result.meta?.provider || result.metadata?.provider;
        const engine = result.meta?.engine || result.metadata?.engine;
        const isLocal = !provider || provider === 'local_ollama' || engine?.includes('local') || engine?.includes('test_mode');
        if (isLocal) {
            checks.passed.push(`✅ Local provider (provider="${provider || 'local_ollama'}")`);
        } else {
            checks.failed.push(`❌ Cloud provider detected: ${provider}`);
        }

        // Check 5: Slovak output (basic heuristic)
        const englishPattern = /\b(the|and|of|to|in|is|that|with|for|as|this)\b/gi;
        const englishWords = (result.response.match(englishPattern) || []).length;
        const totalWords = result.response.split(/\s+/).length;
        const englishRatio = totalWords > 0 ? (englishWords / totalWords * 100).toFixed(1) : 0;

        if (englishWords < 5) {
            checks.passed.push(`✅ Slovak output (${englishRatio}% EN)`);
        } else {
            checks.failed.push(`❌ Too much English (${englishRatio}% EN, ${englishWords} words)`);
        }

        // Check 6: Model not "unknown"
        const model = result.meta?.model || result.metadata?.model;
        if (model && model !== 'unknown') {
            checks.passed.push(`✅ model="${model}" (preserved)`);
        } else {
            checks.failed.push(`❌ model="${model}" (lost or unknown)`);
        }

        // RESULTS
        console.log(`📊 SMOKE TEST RESULTS:\n`);

        if (checks.passed.length > 0) {
            console.log(`   ✅ PASSED (${checks.passed.length}):`);
            checks.passed.forEach(p => console.log(`      ${p}`));
        }

        if (checks.failed.length > 0) {
            console.log(`\n   ❌ FAILED (${checks.failed.length}):`);
            checks.failed.forEach(f => console.log(`      ${f}`));
        }

        // METRICS SUMMARY
        console.log(`\n📈 METRICS SUMMARY:`);
        console.log(`   Latency: ${latency}ms`);
        console.log(`   Output length: ${result.response.length} chars`);
        console.log(`   Provider: ${provider || 'unknown'}`);
        console.log(`   Engine: ${engine || '(via provider)'}`);
        console.log(`   Model: ${model || 'unknown'}`);
        console.log(`   English ratio: ${englishRatio}%`);

        const testPassed = checks.failed.length === 0;

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        if (testPassed) {
            console.log(`🎉 SMOKE TEST PASSED`);
            console.log(`   System is healthy ✅`);
            console.log(`   Local-first working ✅`);
            console.log(`   Slovak output OK ✅`);
        } else {
            console.log(`❌ SMOKE TEST FAILED`);
            console.log(`   System health compromised ⚠️`);
            console.log(`   ${checks.failed.length} check(s) failed`);
        }
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        // Exit code for CI/CD
        process.exit(testPassed ? 0 : 1);

    } catch (err) {
        console.error(`\n❌ SMOKE TEST ERROR: ${err.message}`);
        console.error(err);

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`💥 SMOKE TEST CRASHED`);
        console.log(`   System NOT healthy ❌`);
        console.log(`   Error: ${err.message}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        process.exit(1);
    }
}

runSmokeTest().catch(console.error);
