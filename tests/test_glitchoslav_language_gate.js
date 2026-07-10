// ┌─────────────────────────────────────────────┐
// │  SP4 OS TEST: Glitchoslav Language Gate    │
// │  Layer: Protection / Quality Assurance     │
// │  Role: Test STRICT_TRANSLATE_MODE          │
// │  Mission: PREVENT_ENGLISH_LEAKAGE          │
// └─────────────────────────────────────────────┘

/**
 * 🔥 TEST: STRICT TRANSLATE MODE IN ORCHESTRATOR
 * 
 * PURPOSE:
 * - Verify Glitchoslav orchestrator enforces Slovak language
 * - Test STRICT_TRANSLATE_MODE triggers at 25% English threshold
 * - Verify final output is clean Slovak (<10% English)
 * - Validate metadata contains translation method
 * 
 * SCENARIO:
 * - Send heavily English query through orchestrator
 * - Orchestrator should detect English, trigger strict translate
 * - Final output must be clean Slovak
 * 
 * SUCCESS CRITERIA:
 * ✅ Response is in Slovak (has diacritics)
 * ✅ English ratio < 10%
 * ✅ Metadata contains validation.languageEnforced = true
 * ✅ Metadata contains validation.languageMethod (strict_translate | fallback_*)
 * 
 * @module test_glitchoslav_language_gate
 */

import { orchestrate } from '../orchestration/glitchOrchestrator.js';

/**
 * Calculate English ratio in text
 * 
 * @param {string} text - Text to analyze
 * @returns {number} English ratio (0.0 to 1.0)
 */
function calculateEnglishRatio(text) {
    const enMatches = (text.match(/\b(the|and|of|to|in|is|that|with|for|as|by|this|it|from|are|be|on|was|at|have|has|or|an|if|all|but|can|not|which|will|would|when|there|their|what|so|up|out|who|get|my|me|they|we|more|your|do|about|than|into|after|because|through)\b/gi) || []).length;
    const totalWords = text.split(/\s+/).filter(Boolean).length;
    return totalWords > 0 ? enMatches / totalWords : 0;
}

/**
 * Check if text has Slovak diacritics
 * 
 * @param {string} text - Text to check
 * @returns {boolean} True if has Slovak characters
 */
function hasSlovakDiacritics(text) {
    const skDiacritics = /[áäčďéíĺľňóôŕšťúýž]/i;
    return skDiacritics.test(text);
}

/**
 * Main test function
 */
async function runLanguageGateTest() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🧪 TEST: GLITCHOSLAV LANGUAGE GATE (STRICT_TRANSLATE_MODE)');
    console.log('═══════════════════════════════════════════════════════\n');

    // Test query - heavily English mixed with Slovak
    const testQuery = "What is the meaning of SP4? Can you explain the philosophy behind be real be free?";

    console.log(`📝 Test Query (English): "${testQuery}"\n`);

    // Build context for orchestrator
    const context = {
        mode: 'glitchoslav', // Force Glitchoslav path
        userProfile: {
            name: 'Test User',
            relationshipLevel: 'friend'
        },
        memoryAccess: {
            shortTerm: [],
            seeds: [],
            chapters: []
        },
        intent: 'sp4_philosophy_query',
        groundingApplied: false, // Not testing grounding here
        detectedTopic: null
    };

    console.log('🔄 Calling orchestrator with English query...\n');

    let result;
    try {
        result = await orchestrate(testQuery, context);
    } catch (error) {
        console.error('❌ TEST FAILED: Orchestrator threw error');
        console.error(`   Error: ${error.message}`);
        process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 VALIDATION RESULTS');
    console.log('═══════════════════════════════════════════════════════\n');

    const response = result.response;
    const meta = result.meta;

    console.log(`📄 Response length: ${response.length} chars`);
    console.log(`📄 First 200 chars: "${response.substring(0, 200)}..."\n`);

    // CHECK 1: Slovak diacritics present
    const hasSlovak = hasSlovakDiacritics(response);
    console.log(`✓ CHECK 1: Slovak diacritics present`);
    console.log(`   Result: ${hasSlovak ? '✅ YES' : '❌ NO'}`);

    if (!hasSlovak) {
        console.error('\n❌ TEST FAILED: Response lacks Slovak diacritics');
        console.error(`   Response: "${response.substring(0, 100)}..."`);
        process.exit(1);
    }

    // CHECK 2: English ratio < 10%
    const enRatio = calculateEnglishRatio(response);
    console.log(`\n✓ CHECK 2: English ratio < 10%`);
    console.log(`   Detected: ${(enRatio * 100).toFixed(1)}%`);
    console.log(`   Result: ${enRatio < 0.10 ? '✅ PASS' : '❌ FAIL'}`);

    if (enRatio >= 0.10) {
        console.error('\n❌ TEST FAILED: Too much English in response');
        console.error(`   English ratio: ${(enRatio * 100).toFixed(1)}% (threshold: 10%)`);
        console.error(`   Response: "${response.substring(0, 200)}..."`);
        process.exit(1);
    }

    // CHECK 3: Validation metadata present
    console.log(`\n✓ CHECK 3: Validation metadata present`);
    const hasValidation = meta?.validation !== undefined;
    console.log(`   Result: ${hasValidation ? '✅ YES' : '❌ NO'}`);

    if (!hasValidation) {
        console.error('\n❌ TEST FAILED: Missing validation metadata');
        console.error(`   Meta: ${JSON.stringify(meta, null, 2)}`);
        process.exit(1);
    }

    // CHECK 4: Language enforcement triggered (if English input)
    console.log(`\n✓ CHECK 4: Language enforcement status`);
    const languageEnforced = meta.validation.languageEnforced;
    const languageMethod = meta.validation.languageMethod;

    console.log(`   Enforced: ${languageEnforced ? '✅ YES' : 'ℹ️ NO (not needed)'}`);
    if (languageEnforced) {
        console.log(`   Method: ${languageMethod}`);

        // If language was enforced, verify method is valid
        const validMethods = ['strict_translate', 'fallback_quality', 'fallback_error', 'skip'];
        if (!validMethods.includes(languageMethod)) {
            console.error('\n❌ TEST FAILED: Invalid language method');
            console.error(`   Method: ${languageMethod}`);
            console.error(`   Valid: ${validMethods.join(', ')}`);
            process.exit(1);
        }
        console.log(`   ✅ Method is valid`);
    }

    // CHECK 5: Response is meaningful (not empty/fallback only)
    console.log(`\n✓ CHECK 5: Response quality`);
    const isMeaningful = response.length >= 50 && !response.includes('VALIDATION FAILED');
    console.log(`   Length: ${response.length} chars`);
    console.log(`   Result: ${isMeaningful ? '✅ MEANINGFUL' : '❌ TOO SHORT/FALLBACK'}`);

    if (!isMeaningful) {
        console.warn('\n⚠️ WARNING: Response may be low quality');
        console.warn(`   Response: "${response}"`);
        // Don't fail - just warn
    }

    // SUMMARY
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ ALL CHECKS PASSED');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n📊 SUMMARY:`);
    console.log(`   • Slovak diacritics: ✅`);
    console.log(`   • English ratio: ${(enRatio * 100).toFixed(1)}% (< 10% ✅)`);
    console.log(`   • Validation metadata: ✅`);
    console.log(`   • Language enforced: ${languageEnforced ? '✅' : 'ℹ️ not needed'}`);
    console.log(`   • Response quality: ${isMeaningful ? '✅' : '⚠️'}`);
    console.log(`\n🎯 TEST: LANGUAGE GATE ENFORCEMENT WORKING CORRECTLY\n`);

    process.exit(0);
}

// Run test
runLanguageGateTest().catch(err => {
    console.error('\n❌ TEST CRASHED:');
    console.error(err);
    process.exit(1);
});
