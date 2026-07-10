#!/usr/bin/env node

/**
 * 🇸🇰 LANGUAGE ENFORCEMENT TEST
 * Tests Slovak-first policy with explicit English request exception
 * 
 * Usage: node src/debug/testLanguageEnforcement.js
 */

import { detectInputLanguage, hasExplicitEnglishRequest } from '../../languageSanitizer.js';
import { buildPrompt } from '../../multiVoice.js';
import { askLocalLLM } from '../../sp4os/llmLocal.js';

const TEST_CASES = [
    {
        name: "Slovak input → Slovak output",
        input: "Čo je SP4?",
        expectedLang: "sk",
        hasEnRequest: false
    },
    {
        name: "Slovak input (identity) → Slovak output",
        input: "Kto si ty?",
        expectedLang: "sk",
        hasEnRequest: false
    },
    {
        name: "English input WITHOUT explicit request → Slovak output",
        input: "What is SP4?",
        expectedLang: "sk",  // Should respond in SK despite EN input
        hasEnRequest: false
    },
    {
        name: "English input WITH explicit request → English output",
        input: "What is SP4? Reply in English.",
        expectedLang: "en",
        hasEnRequest: true
    },
    {
        name: "Slovak input WITH explicit EN request → English output",
        input: "Čo je SP4? Odpíš po anglicky.",
        expectedLang: "en",
        hasEnRequest: true
    },
    {
        name: "Mixed input → Slovak output",
        input: "Ako funguje SP4 system a jeho architecture?",
        expectedLang: "sk",
        hasEnRequest: false
    },
    {
        name: "English greeting WITHOUT request → Slovak output",
        input: "Hello, how are you?",
        expectedLang: "sk",
        hasEnRequest: false
    },
    {
        name: "Technical question in SK → Slovak output",
        input: "Vymenuj 3 hlavné funkcie SP4_CORE_AGENT.",
        expectedLang: "sk",
        hasEnRequest: false
    }
];

async function testLanguageEnforcement() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🇸🇰 LANGUAGE ENFORCEMENT TEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let passCount = 0;
    let failCount = 0;

    for (let i = 0; i < TEST_CASES.length; i++) {
        const test = TEST_CASES[i];

        console.log(`\n📋 TEST ${i + 1}/${TEST_CASES.length}: ${test.name}`);
        console.log(`Input: "${test.input}"`);
        console.log(`Expected language: ${test.expectedLang.toUpperCase()}`);

        // Test helper functions
        const detectedInputLang = detectInputLanguage(test.input);
        const hasEnRequest = hasExplicitEnglishRequest(test.input);

        console.log(`Detected input lang: ${detectedInputLang}`);
        console.log(`Has EN request: ${hasEnRequest ? '✅ YES' : '❌ NO'} (expected: ${test.hasEnRequest ? 'YES' : 'NO'})`);

        if (hasEnRequest !== test.hasEnRequest) {
            console.log(`⚠️  WARNING: EN request detection mismatch!`);
        }

        try {
            // Build prompt with CORE mode
            const prompt = buildPrompt({
                mode: 'core',
                userMessage: test.input,
                state: {}
            });

            // Call LLM
            const startTime = Date.now();
            const response = await askLocalLLM(
                test.input,
                prompt.systemPrompt,
                'llama3:latest',
                {
                    temperature: 0.7,
                    num_predict: 256
                }
            );
            const duration = Date.now() - startTime;

            // Analyze output language
            const outputLang = detectInputLanguage(response);
            const hasSlovakDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi.test(response);
            const commonEnWords = response.match(/\b(the|and|of|to|in|is|that|with|as|for|which|who|are|on)\b/gi) || [];
            const enWordCount = commonEnWords.length;

            console.log('\n📝 Response:');
            console.log('─'.repeat(50));
            console.log(response.substring(0, 200) + (response.length > 200 ? '...' : ''));
            console.log('─'.repeat(50));

            console.log('\n📊 Analysis:');
            console.log(`  Length: ${response.length} chars`);
            console.log(`  Duration: ${duration}ms`);
            console.log(`  Detected output lang: ${outputLang}`);
            console.log(`  Slovak diacritics: ${hasSlovakDiacritics ? '✅ YES' : '❌ NO'}`);
            console.log(`  EN common words: ${enWordCount}`);

            // Determine pass/fail
            let passed = false;

            if (test.expectedLang === 'sk') {
                // Expected Slovak: check for diacritics and low EN word count
                passed = hasSlovakDiacritics && enWordCount < 5;
            } else if (test.expectedLang === 'en') {
                // Expected English: check for high EN word count and no diacritics
                passed = !hasSlovakDiacritics && enWordCount >= 3;
            }

            if (passed) {
                console.log(`\n✅ PASS - Output matches expected language (${test.expectedLang.toUpperCase()})`);
                passCount++;
            } else {
                console.log(`\n❌ FAIL - Output language mismatch!`);
                console.log(`   Expected: ${test.expectedLang.toUpperCase()}, Got: ${outputLang.toUpperCase()}`);
                failCount++;
            }

        } catch (error) {
            console.log(`\n❌ ERROR: ${error.message}`);
            failCount++;
        }

        console.log('\n' + '═'.repeat(50));
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total tests: ${TEST_CASES.length}`);
    console.log(`✅ Passed: ${passCount} (${((passCount / TEST_CASES.length) * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${failCount} (${((failCount / TEST_CASES.length) * 100).toFixed(1)}%)`);

    if (passCount === TEST_CASES.length) {
        console.log('\n🎉 ALL TESTS PASSED! Language enforcement working correctly.');
    } else {
        console.log(`\n⚠️  ${failCount} test(s) failed. Language enforcement needs improvement.`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run tests
testLanguageEnforcement().catch(console.error);
