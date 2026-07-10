// ┌─────────────────────────────────────────────┐
// │  TEST: SP4 Grounding Knowledge             │
// │  Validates anti-hallucination system       │
// └─────────────────────────────────────────────┘

import path from 'path';
import { fileURLToPath } from 'url';
import { ensureProjectRoot } from './scripts/cwdGuard.js';
import { detectSP4Query, getGroundingPrompt, getSP4KnowledgeBlock } from './src/core/sp4GroundingKnowledge.js';

// 🔥 v1.4.2: Auto-correct working directory
ensureProjectRoot();

// 🔥 v1.4.2: ES module guard - run only when executed directly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isMainModule = process.argv[1] === __filename;

async function runTests() {
    console.log('🧪 === SP4 GROUNDING KNOWLEDGE TEST ===\n');

    const testQueries = [
        { query: 'Ako funguje SP4 memory system?', expectedTopic: 'memory' },
        { query: 'Vysvetli mi SP4 policy', expectedTopic: 'policy' },
        { query: 'Čo je integration layer?', expectedTopic: 'integration' },
        { query: 'Ako je postavený SP4?', expectedTopic: 'architecture' },
        { query: 'Čo je to počasie?', expectedTopic: null } // Non-SP4 query
    ];

    let passed = 0;
    let failed = 0;

    for (const { query, expectedTopic } of testQueries) {
        console.log(`\n📋 TEST: "${query}"`);
        console.log(`   Expected topic: ${expectedTopic || 'null'}`);

        const detectedTopic = detectSP4Query(query);
        console.log(`   Detected topic: ${detectedTopic || 'null'}`);

        if (detectedTopic === expectedTopic) {
            console.log('   ✅ PASS - Correct detection');
            passed++;
        } else {
            console.log(`   ❌ FAIL - Expected ${expectedTopic}, got ${detectedTopic}`);
            failed++;
            continue;
        }

        // If topic detected, check knowledge block
        if (detectedTopic) {
            const knowledgeBlock = getSP4KnowledgeBlock(query);
            const groundingPrompt = getGroundingPrompt(query);

            if (knowledgeBlock && knowledgeBlock.length > 100) {
                console.log(`   ✅ Knowledge block generated (${knowledgeBlock.length} chars)`);
            } else {
                console.log('   ❌ Knowledge block empty or too short');
                failed++;
                continue;
            }

            if (groundingPrompt && groundingPrompt.includes('FAKTICKÝ ZDROJ')) {
                console.log('   ✅ Grounding prompt generated with instruction block');
            } else {
                console.log('   ❌ Grounding prompt invalid');
                failed++;
                continue;
            }

            // Check for specific facts based on topic
            if (detectedTopic === 'memory') {
                if (knowledgeBlock.includes('Raw Log') && knowledgeBlock.includes('Compressed Summaries')) {
                    console.log('   ✅ Memory facts present (Raw Log, Summaries, Seeds)');
                } else {
                    console.log('   ❌ Memory facts incomplete');
                    failed++;
                }
            }

            if (detectedTopic === 'policy') {
                if (knowledgeBlock.includes('local-first') && knowledgeBlock.includes('force-local')) {
                    console.log('   ✅ Policy facts present (routes, metadata contract)');
                } else {
                    console.log('   ❌ Policy facts incomplete');
                    failed++;
                }
            }
        }
    }

    console.log('\n\n🏁 === TEST SUMMARY ===');
    console.log(`   ✅ Passed: ${passed}/${testQueries.length}`);
    console.log(`   ❌ Failed: ${failed}/${testQueries.length}`);

    if (failed === 0) {
        console.log('\n   🎉 ALL TESTS PASSED - Grounding knowledge working!\n');
        process.exit(0);
    } else {
        console.log('\n   ⚠️ SOME TESTS FAILED\n');
        process.exit(1);
    }
}

// 🔥 v1.4.2: Only run when executed directly (not imported)
if (isMainModule) {
    runTests().catch(err => {
        console.error('❌ Test execution failed:', err);
        process.exit(1);
    });
}
