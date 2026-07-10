// test_all_personas.js
// Complete test: CORE + POPICI + GLITCHOSLAV routing + validation

import { orchestrate } from './orchestration/glitchOrchestrator.js';

const ALL_TESTS = [
    // ═══════════════════════════════════════════════════════════════
    // GLITCHOSLAV TESTS (Existential, Philosophy, Tribal)
    // ═══════════════════════════════════════════════════════════════
    {
        category: "GLITCHOSLAV",
        name: "Existential Question",
        query: "prečo som tu?",
        expectedHandler: "glitchoslav"
    },
    {
        category: "GLITCHOSLAV",
        name: "SP4 Philosophy",
        query: "vysvetli mi SP4 manifest",
        expectedHandler: "glitchoslav"
    },
    {
        category: "GLITCHOSLAV",
        name: "Kefyk Identity",
        query: "kto je zakladateľ SP4?",
        expectedHandler: "glitchoslav"
    },

    // ═══════════════════════════════════════════════════════════════
    // CORE TESTS (Technical, System, Documentation)
    // ═══════════════════════════════════════════════════════════════
    {
        category: "CORE",
        name: "Technical Query",
        query: "ako funguje orchestrácia v SP4?",
        expectedHandler: "core"
    },
    {
        category: "CORE",
        name: "Token Info",
        query: "ako získam SP4OT token?",
        expectedHandler: "core"
    },
    {
        category: "CORE",
        name: "Architecture",
        query: "aká je architektúra memory systému?",
        expectedHandler: "core"
    },

    // ═══════════════════════════════════════════════════════════════
    // POPICI TESTS (Frustration, Vulgarity, Brutal Truth)
    // ═══════════════════════════════════════════════════════════════
    {
        category: "POPICI",
        name: "Frustration",
        query: "kurva prečo mi to stále nefunguje?!",
        expectedHandler: "popici"
    },
    {
        category: "POPICI",
        name: "High Intensity",
        query: "mám toho dosť, všetko ma sere!",
        expectedHandler: "popici"
    },
    {
        category: "POPICI",
        name: "Vulgar Expression",
        query: "kokot, už neviem čo s tým",
        expectedHandler: "popici"
    }
];

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  🔥 SP4 MULTI-PERSONA ORCHESTRATION TEST v1.0 🔥              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const results = {
    glitchoslav: { passed: 0, failed: 0 },
    core: { passed: 0, failed: 0 },
    popici: { passed: 0, failed: 0 }
};

for (const test of ALL_TESTS) {
    totalTests++;

    console.log(`\n${'━'.repeat(70)}`);
    console.log(`📋 [${test.category}] ${test.name}`);
    console.log(`   Query: "${test.query}"`);
    console.log(`   Expected: ${test.expectedHandler.toUpperCase()}`);
    console.log(`${'━'.repeat(70)}`);

    try {
        const result = await orchestrate(test.query, {
            emotionalState: 'neutral',
            emotionalIntensity: test.category === 'POPICI' ? 0.8 : 0.3
        });

        const actualHandler = result.handledBy;
        const isCorrect = actualHandler === test.expectedHandler;

        console.log(`\n   ✓ Routed to: ${actualHandler?.toUpperCase() || 'UNKNOWN'}`);
        console.log(`   ✓ Reasoning: ${result.reasoning}`);
        console.log(`   ✓ Model: ${result.meta?.model || 'unknown'}`);

        // Language check
        const response = result.response;
        const englishWords = /\b(the|and|of|to|in|is|that|with|for|this|are)\b/gi;
        const englishMatches = (response.match(englishWords) || []).length;
        const slovakDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi;
        const slovakMarks = (response.match(slovakDiacritics) || []).length;

        const isSlovak = englishMatches < 5 || slovakMarks > 5;

        console.log(`\n   🇸🇰 Language: ${isSlovak ? '✅ Slovak' : '⚠️  Mixed'} (EN: ${englishMatches}, SK: ${slovakMarks})`);
        console.log(`   📏 Length: ${response.length} chars`);

        // POPICI slang check
        if (test.category === 'POPICI') {
            const slangPatterns = /\b(ta|bo|bratu|furt|šak|piči|kokot|kurva)\b/gi;
            const slangMatches = (response.match(slangPatterns) || []).length;
            console.log(`   🗣️  Slang: ${slangMatches > 0 ? '✅' : '❌'} (${slangMatches} detected)`);
        }

        // CORE forbidden check
        if (test.category === 'CORE') {
            const hasForbidden = /\b(Glitchoslav|som Glitchoslav|AI asistent)\b/i.test(response);
            console.log(`   🚫 Forbidden: ${hasForbidden ? '❌ DETECTED' : '✅ Clean'}`);
        }

        if (isCorrect) {
            console.log(`\n   ✅ ROUTING: PASS`);
            passedTests++;
            results[test.category.toLowerCase()].passed++;
        } else {
            console.log(`\n   ❌ ROUTING: FAIL (expected ${test.expectedHandler}, got ${actualHandler})`);
            failedTests++;
            results[test.category.toLowerCase()].failed++;
        }

        // Show response snippet
        console.log(`\n   💬 Response preview:`);
        console.log(`   "${response.substring(0, 150)}${response.length > 150 ? '...' : ''}"`);

    } catch (error) {
        console.log(`\n   ❌ ERROR: ${error.message}`);
        failedTests++;
        results[test.category.toLowerCase()].failed++;
    }

    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 1500));
}

// ═══════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════

console.log(`\n\n${'═'.repeat(70)}`);
console.log('📊 FINAL REPORT');
console.log(`${'═'.repeat(70)}\n`);

console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests} (${Math.round(passedTests / totalTests * 100)}%)`);
console.log(`❌ Failed: ${failedTests} (${Math.round(failedTests / totalTests * 100)}%)\n`);

console.log(`${'─'.repeat(70)}`);
console.log('Per-Persona Breakdown:\n');

console.log(`🌀 GLITCHOSLAV: ${results.glitchoslav.passed}/${results.glitchoslav.passed + results.glitchoslav.failed} passed`);
console.log(`🧠 CORE:        ${results.core.passed}/${results.core.passed + results.core.failed} passed`);
console.log(`💥 POPICI:      ${results.popici.passed}/${results.popici.passed + results.popici.failed} passed`);

console.log(`\n${'═'.repeat(70)}`);

if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED - SYSTEM PRODUCTION READY! 🔥');
} else if (passedTests >= totalTests * 0.8) {
    console.log('✅ GOOD PERFORMANCE - Minor tuning needed');
} else {
    console.log('⚠️  NEEDS ATTENTION - Review failed tests');
}

console.log(`${'═'.repeat(70)}\n`);
