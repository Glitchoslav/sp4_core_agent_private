// 🧪 REGRESSION TEST: Metadata Contract Integrity
// Verifies that metadata contract remains stable across pipeline transformations
//
// CRITICAL RULES (v1.3.1):
// 1. result.meta === result.metadata (unified contract)
// 2. Language Enforcer MUST NOT change handledBy/persona/model
// 3. Persona fingerprint MUST survive text rewrites
//
// @author Kefyk (SP4 Community)
// @version 1.3.1
// @date 2026-01-31

const tests = [
    {
        name: 'Meta Contract Unification',
        description: 'result.meta and result.metadata must point to same object',
        input: 'Čo je SP4?',
        mode: 'glitchoslav',
        validate: (result) => {
            const checks = {
                passed: [],
                failed: []
            };

            // Check 1: Both fields exist
            if (!result.meta) {
                checks.failed.push('❌ result.meta is undefined');
            }
            if (!result.metadata) {
                checks.failed.push('❌ result.metadata is undefined');
            }

            if (result.meta && result.metadata) {
                // Check 2: Same reference (strict equality)
                if (result.meta === result.metadata) {
                    checks.passed.push('✅ meta === metadata (same reference)');
                } else {
                    checks.failed.push('❌ meta !== metadata (different objects)');
                }

                // Check 3: handledBy consistency
                if (result.meta.handledBy === result.metadata.handledBy) {
                    checks.passed.push(`✅ handledBy consistent: "${result.meta.handledBy}"`);
                } else {
                    checks.failed.push(`❌ handledBy mismatch: meta="${result.meta.handledBy}" vs metadata="${result.metadata.handledBy}"`);
                }

                // Check 4: model consistency
                if (result.meta.model === result.metadata.model) {
                    checks.passed.push(`✅ model consistent: "${result.meta.model}"`);
                } else {
                    checks.failed.push(`❌ model mismatch: meta="${result.meta.model}" vs metadata="${result.metadata.model}"`);
                }

                // Check 5: No "unknown" values
                if (result.meta.handledBy !== 'unknown' && result.meta.handledBy !== undefined) {
                    checks.passed.push('✅ handledBy not "unknown"');
                } else {
                    checks.failed.push('❌ handledBy is "unknown" or undefined');
                }

                if (result.meta.model !== 'unknown' && result.meta.model !== undefined) {
                    checks.passed.push('✅ model not "unknown"');
                } else {
                    checks.failed.push('❌ model is "unknown" or undefined');
                }
            }

            return checks;
        }
    },
    {
        name: 'Language Enforcer Metadata Preservation',
        description: 'Language Enforcer must NOT change handledBy/persona/model even when rewriting text',
        input: 'How does SP4 memory system work?', // Deliberate English to trigger enforcer
        mode: 'core',
        validate: (result) => {
            const checks = {
                passed: [],
                failed: []
            };

            // Check 1: Persona preserved (CORE expected)
            if (result.metadata?.handledBy === 'core') {
                checks.passed.push('✅ handledBy="core" (preserved after enforcer)');
            } else {
                checks.failed.push(`❌ handledBy="${result.metadata?.handledBy}" (expected "core")`);
            }

            // Check 2: Model preserved
            if (result.metadata?.model && result.metadata.model !== 'unknown') {
                checks.passed.push(`✅ model="${result.metadata.model}" (preserved)`);
            } else {
                checks.failed.push(`❌ model="${result.metadata?.model}" (lost or unknown)`);
            }

            // Check 3: Response is in Slovak (enforcer worked)
            const englishPattern = /\b(the|and|of|to|in|is|that|with|for|as|this)\b/gi;
            const englishWords = (result.response.match(englishPattern) || []).length;

            if (englishWords < 5) {
                checks.passed.push('✅ Response in Slovak (enforcer translated)');
            } else {
                checks.failed.push(`❌ Response still in English (${englishWords} EN words)`);
            }

            // Check 4: Technical fingerprint preserved (CORE characteristic)
            const technicalMarkers = ['pamäť', 'systém', 'vrstvy', 'log', 'memory', 'data'];
            const hasTechnical = technicalMarkers.some(marker =>
                result.response.toLowerCase().includes(marker.toLowerCase())
            );

            if (hasTechnical) {
                checks.passed.push('✅ Technical fingerprint preserved');
            } else {
                checks.failed.push('❌ Technical fingerprint lost (generic response)');
            }

            return checks;
        }
    },
    {
        name: 'Popiči Dialect Routing (>=2 markers)',
        description: 'Eastern Slovak dialect with >=2 markers must trigger Popiči delegation',
        input: 'Ta šak mi porad, bratu', // 4 markers: ta, šak, porad (rada), bratu
        mode: 'auto', // Let orchestrator decide
        validate: (result) => {
            const checks = {
                passed: [],
                failed: []
            };

            // Check 1: Routed to Popiči
            if (result.metadata?.handledBy === 'popici') {
                checks.passed.push('✅ handledBy="popici" (dialect routing worked)');
            } else {
                checks.failed.push(`❌ handledBy="${result.metadata?.handledBy}" (expected "popici")`);
            }

            // Check 2: Slang preserved in response
            const slangMarkers = ['ta', 'bratu', 'šak', 'bo', 'ňe'];
            const foundSlang = slangMarkers.filter(marker =>
                result.response.toLowerCase().includes(marker)
            );

            if (foundSlang.length > 0) {
                checks.passed.push(`✅ Slang preserved: ${foundSlang.join(', ')}`);
            } else {
                checks.failed.push('❌ No slang in response (characteristic lost)');
            }

            return checks;
        }
    },
    {
        name: 'Popiči Dialect Routing (1 marker + rada)',
        description: 'Eastern Slovak with 1 marker + advice request must trigger Popiči',
        input: 'Ta daj mi radu', // 2 markers: ta, radu (rada)
        mode: 'auto',
        validate: (result) => {
            const checks = {
                passed: [],
                failed: []
            };

            if (result.metadata?.handledBy === 'popici') {
                checks.passed.push('✅ handledBy="popici" (marker + rada routing)');
            } else {
                checks.failed.push(`❌ handledBy="${result.metadata?.handledBy}" (expected "popici")`);
            }

            return checks;
        }
    }
];

async function runRegressionTests() {
    console.log('🧪 SP4 METADATA CONTRACT REGRESSION TESTS\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 CRITICAL RULES (v1.3.1):');
    console.log('   1. result.meta === result.metadata (unified contract)');
    console.log('   2. Language Enforcer MUST NOT change metadata');
    console.log('   3. Persona fingerprint MUST survive text rewrites');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { SP4IntegratedAgent } = await import('./integration.js');
    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📋 TEST: ${test.name}`);
        console.log(`   Description: ${test.description}`);
        console.log(`   Mode: ${test.mode}`);
        console.log(`   Input: "${test.input}"`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        try {
            const result = await agent.processMessage(test.input, test.mode);

            console.log(`📥 RESPONSE (${result.response.length} chars):`);
            console.log(`   "${result.response.substring(0, 150)}${result.response.length > 150 ? '...' : ''}"\n`);

            console.log(`📊 METADATA:`);
            console.log(`   meta.handledBy: ${result.meta?.handledBy || 'undefined'}`);
            console.log(`   metadata.handledBy: ${result.metadata?.handledBy || 'undefined'}`);
            console.log(`   meta.model: ${result.meta?.model || 'undefined'}`);
            console.log(`   metadata.model: ${result.metadata?.model || 'undefined'}`);
            console.log(`   meta === metadata: ${result.meta === result.metadata}`);

            // Run validation
            const checks = test.validate(result);

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
                console.log(`\n✅ TEST PASSED`);
                passed++;
            } else {
                console.log(`\n❌ TEST FAILED`);
                failed++;
            }

        } catch (err) {
            console.log(`\n❌ TEST ERROR: ${err.message}`);
            failed++;
        }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 FINAL RESULTS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   ✅ Passed: ${passed}/${tests.length}`);
    console.log(`   ❌ Failed: ${failed}/${tests.length}`);

    if (passed === tests.length) {
        console.log(`\n🎉 ALL REGRESSION TESTS PASSED`);
        console.log(`   Meta contract is stable ✅`);
        console.log(`   Language Enforcer preserves metadata ✅`);
        console.log(`   Persona fingerprints survive pipeline ✅`);
    } else {
        console.log(`\n⚠️ REGRESSION DETECTED - Pipeline integrity compromised`);
    }
}

runRegressionTests().catch(console.error);
