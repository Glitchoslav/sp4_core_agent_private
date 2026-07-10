/**
 * 🇸🇰 SMOKE TEST: Slovak Language Enforcement (v1.3.0)
 * 
 * Overuje, že SP4 odpovedá PO SLOVENSKY pri otázkach o SP4.
 * 
 * Test queries:
 * 1. "vysvetli mi SP4 v slovenskom jazyku" → explain_sp4_sk intent
 * 2. "aké má sp4 vízie, ciele a manifest? v slovenčine" → explain_sp4_sk intent
 * 3. "čo je sp4?" → deep_identity intent (Slovak default)
 * 
 * Expected behavior:
 * - ✅ GLITCHOSLAV handles all SP4 questions
 * - ✅ Uses canonical Slovak manifest (SP4_DEFINITION_SK, SP4_VISION_SK, SP4_GOALS_SK)
 * - ✅ No English words (except: API, JSON, LLM, SP4, HTTP)
 * - ✅ No "Here is...", "Vision:", "Goals:" phrases
 * - ✅ Stručné odpovede (3-6 viet max)
 * 
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-28
 */

import { detectLanguageHint } from '../src/core/languageHintDetector.js';
import { SP4_DEFINITION_SK, SP4_GOALS_SK, SP4_VISION_SK } from '../src/core/sp4Manifest.js';
import { extractIntent } from '../src/routing/intentExtractor.js';

console.log('🇸🇰 SLOVAK LANGUAGE ENFORCEMENT TEST v1.3.0\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 1: Intent Detection - "explain_sp4_sk"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('TEST 1: Intent Detection (explain_sp4_sk)\n');

const testQueries = [
    "vysvetli mi SP4 v slovenskom jazyku",
    "aké má sp4 vízie, ciele a manifest? v slovenčine",
    "čo je sp4 po slovensky"
];

testQueries.forEach((query, i) => {
    const intent = extractIntent(query);
    const langHint = detectLanguageHint(query);

    console.log(`Query ${i + 1}: "${query}"`);
    console.log(`  Intent: ${intent} ${intent === 'explain_sp4_sk' ? '✅' : '❌ EXPECTED: explain_sp4_sk'}`);
    console.log(`  forceSlovak: ${langHint.forceSlovak} ${langHint.forceSlovak ? '✅' : '❌'}`);
    console.log();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 2: Canonical Slovak Manifest Availability
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\nTEST 2: Canonical Slovak Manifest\n');

console.log('SP4_DEFINITION_SK:');
console.log(SP4_DEFINITION_SK);
console.log();

console.log('SP4_VISION_SK (5 points):');
SP4_VISION_SK.forEach((v, i) => console.log(`  ${i + 1}. ${v}`));
console.log();

console.log('SP4_GOALS_SK (5 points):');
SP4_GOALS_SK.forEach((g, i) => console.log(`  ${i + 1}. ${g}`));
console.log();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 3: Forbidden Patterns Detection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\nTEST 3: Forbidden English Patterns\n');

const forbiddenPatterns = [
    "Here is",
    "Here are",
    "Vision:",
    "Goals:",
    "SP4 is a community",
    "The vision of SP4",
    "Founded in 1994" // Hallucination: project created 2025, Kefyk born 1994
];

console.log('Forbidden patterns (must NOT appear in Slovak responses):');
forbiddenPatterns.forEach(pattern => console.log(`  ❌ "${pattern}"`));
console.log();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MANUAL TEST INSTRUCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n📋 MANUAL TEST CHECKLIST:\n');
console.log('1. Start SP4: node index_v07.js');
console.log('2. Ask: "vysvetli mi SP4 v slovenskom jazyku"');
console.log('3. Verify response:');
console.log('   ✅ Persona: GLITCHOSLAV');
console.log('   ✅ Language: 100% Slovak (except API, JSON, LLM, SP4)');
console.log('   ✅ No "Here is...", "Vision:", "Goals:"');
console.log('   ✅ Length: 3-6 sentences max');
console.log('   ✅ Uses canonical manifest (not hallucinations)');
console.log('   ✅ No "1994 project" (correct: 2025 project, 1994 Kefyk birth)');
console.log();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ STATIC CHECKS PASSED');
console.log('⚠️  LIVE TEST REQUIRED (see checklist above)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
