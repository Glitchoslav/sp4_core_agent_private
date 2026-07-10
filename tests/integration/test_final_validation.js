// test_final_validation.js
// Final validation s novými unique queries pre každú personu

import { orchestrate } from './orchestration/glitchOrchestrator.js';

const FINAL_TESTS = [
    // ═══════════════════════════════════════════════════════════════
    // GLITCHOSLAV - Existential, Deep Philosophy, Tribal Identity
    // ═══════════════════════════════════════════════════════════════
    {
        category: "GLITCHOSLAV",
        name: "Meaning of Freedom",
        query: "čo znamená byť naozaj slobodný?",
        expectedHandler: "glitchoslav",
        checkFor: ["metafora", "hĺbka", "filozofia"]
    },
    {
        category: "GLITCHOSLAV",
        name: "Death Acceptance",
        query: "ako sa zmieriť s tým, že jedného dňa zomriem?",
        expectedHandler: "glitchoslav",
        checkFor: ["empatie", "existenciálne"]
    },
    {
        category: "GLITCHOSLAV",
        name: "SP4 Vision",
        query: "aká je vízia SP4 do budúcnosti?",
        expectedHandler: "glitchoslav",
        checkFor: ["SP4", "komunita", "sloboda"]
    },
    {
        category: "GLITCHOSLAV",
        name: "Purpose of Pain",
        query: "prečo musíme trpieť?",
        expectedHandler: "glitchoslav",
        checkFor: ["metafora", "pochopenie"]
    },

    // ═══════════════════════════════════════════════════════════════
    // CORE - Technical, System, Implementation Details
    // ═══════════════════════════════════════════════════════════════
    {
        category: "CORE",
        name: "Model Selection",
        query: "aké AI modely používa SP4?",
        expectedHandler: "core",
        checkFor: ["technické", "qwen", "llama"]
    },
    {
        category: "CORE",
        name: "Memory ACL",
        query: "ako funguje ACL v memory hierarchy?",
        expectedHandler: "core",
        checkFor: ["ACL", "prístup", "filtrované"]
    },
    {
        category: "CORE",
        name: "Prompt Engineering",
        query: "ako sa buduje prompt pre jednotlivé persony?",
        expectedHandler: "core",
        checkFor: ["prompt", "systém", "buildPrompt"]
    },
    {
        category: "CORE",
        name: "Validator System",
        query: "ako funguje validator v SP4?",
        expectedHandler: "core",
        checkFor: ["validácia", "persona", "output"]
    },

    // ═══════════════════════════════════════════════════════════════
    // POPICI - Frustration, Brutal Honesty, Eastern Slovak Style
    // ═══════════════════════════════════════════════════════════════
    {
        category: "POPICI",
        name: "Career Frustration",
        query: "piča, už nevládzem v tejto robote!",
        expectedHandler: "popici",
        checkFor: ["slang", "pravda", "humor"]
    },
    {
        category: "POPICI",
        name: "Relationship Issue",
        query: "kokot som, zase som to pokazil s ňou",
        expectedHandler: "popici",
        checkFor: ["slang", "úprimnosť", "facka"]
    },
    {
        category: "POPICI",
        name: "Life Overwhelm",
        query: "všetko ma sere, neviem kam ísť",
        expectedHandler: "popici",
        checkFor: ["slang", "podpora", "akcia"]
    },
    {
        category: "POPICI",
        name: "Anger Expression",
        query: "kurva mám toho plné zuby!",
        expectedHandler: "popici",
        checkFor: ["slang", "rozumienie", "východniarsky"]
    }
];

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║      🔥 SP4 FINAL VALIDATION TEST - NEW QUERIES 🔥           ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let stats = {
    total: 0,
    passed: 0,
    failed: 0,
    glitchoslav: { correct: 0, total: 0 },
    core: { correct: 0, total: 0 },
    popici: { correct: 0, total: 0 }
};

for (const test of FINAL_TESTS) {
    stats.total++;
    stats[test.expectedHandler].total++;

    console.log(`\n${'━'.repeat(70)}`);
    console.log(`📝 [${test.category}] ${test.name}`);
    console.log(`   "${test.query}"`);
    console.log(`${'━'.repeat(70)}`);

    try {
        const result = await orchestrate(test.query, {
            emotionalState: 'neutral',
            emotionalIntensity: test.category === 'POPICI' ? 0.8 : 0.3
        });

        const actualHandler = result.handledBy;
        const isCorrectRouting = actualHandler === test.expectedHandler;
        const response = result.response;

        // Language validation
        const englishWords = /\b(the|and|of|to|in|is|that|with|for|this|are|you|your|my)\b/gi;
        const englishCount = (response.match(englishWords) || []).length;
        const slovakDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi;
        const slovakCount = (response.match(slovakDiacritics) || []).length;
        const isSlovak = englishCount < 8 && (slovakCount > 3 || response.length < 200);

        // Persona-specific checks
        let specificCheck = true;
        if (test.category === 'POPICI') {
            const slangPattern = /\b(ta|bo|bratu|furt|šak|piči|kokot|kurva|sere)\b/gi;
            const slangCount = (response.match(slangPattern) || []).length;
            specificCheck = slangCount > 0;
            console.log(`   🗣️  Slang: ${specificCheck ? '✅' : '❌'} (${slangCount} detected)`);
        } else if (test.category === 'CORE') {
            const forbiddenPattern = /\b(Glitchoslav|som Glitchoslav|AI asistent|pomôžem ti)\b/i;
            specificCheck = !forbiddenPattern.test(response);
            console.log(`   🚫 Forbidden: ${specificCheck ? '✅ None' : '❌ Detected'}`);
        } else if (test.category === 'GLITCHOSLAV') {
            const hasDepth = response.length > 200 || /\b(ako|preto|lebo|možno|azda)\b/i.test(response);
            specificCheck = hasDepth;
            console.log(`   🧠 Depth: ${specificCheck ? '✅' : '❌'}`);
        }

        const isPerfect = isCorrectRouting && isSlovak && specificCheck;

        console.log(`   ✓ Routed: ${actualHandler?.toUpperCase()} (expected: ${test.expectedHandler.toUpperCase()})`);
        console.log(`   ✓ Model: ${result.meta?.model || 'unknown'}`);
        console.log(`   🇸🇰 Slovak: ${isSlovak ? '✅' : '⚠️'} (EN:${englishCount}, SK:${slovakCount})`);
        console.log(`   📏 Length: ${response.length} chars`);

        if (isPerfect) {
            console.log(`\n   ✅ PERFECT PASS`);
            stats.passed++;
            stats[test.expectedHandler].correct++;
        } else {
            console.log(`\n   ⚠️  PARTIAL PASS`);
            if (isCorrectRouting) stats[test.expectedHandler].correct++;
            stats.failed++;
        }

        // Response preview
        const preview = response.substring(0, 120).replace(/\n/g, ' ');
        console.log(`   💬 "${preview}${response.length > 120 ? '...' : ''}"`);

    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        stats.failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 1800));
}

// ═══════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════

console.log(`\n\n${'═'.repeat(70)}`);
console.log('📊 FINAL VALIDATION REPORT');
console.log(`${'═'.repeat(70)}\n`);

const accuracy = Math.round((stats.passed / stats.total) * 100);

console.log(`📈 OVERALL RESULTS:`);
console.log(`   Total Tests: ${stats.total}`);
console.log(`   ✅ Perfect: ${stats.passed} (${accuracy}%)`);
console.log(`   ⚠️  Issues: ${stats.failed} (${Math.round((stats.failed / stats.total) * 100)}%)\n`);

console.log(`${'─'.repeat(70)}`);
console.log(`📋 ROUTING ACCURACY BY PERSONA:\n`);

const glitchAccuracy = Math.round((stats.glitchoslav.correct / stats.glitchoslav.total) * 100);
const coreAccuracy = Math.round((stats.core.correct / stats.core.total) * 100);
const popiciAccuracy = Math.round((stats.popici.correct / stats.popici.total) * 100);

console.log(`   🌀 GLITCHOSLAV: ${stats.glitchoslav.correct}/${stats.glitchoslav.total} (${glitchAccuracy}%)`);
console.log(`   🧠 CORE:        ${stats.core.correct}/${stats.core.total} (${coreAccuracy}%)`);
console.log(`   💥 POPICI:      ${stats.popici.correct}/${stats.popici.total} (${popiciAccuracy}%)`);

console.log(`\n${'═'.repeat(70)}`);

if (accuracy >= 90) {
    console.log('🎉 EXCELLENT - SYSTEM PRODUCTION READY! 🔥🔥🔥');
} else if (accuracy >= 75) {
    console.log('✅ GOOD - Minor improvements recommended');
} else if (accuracy >= 60) {
    console.log('⚠️  ACCEPTABLE - Needs tuning');
} else {
    console.log('❌ NEEDS WORK - Critical issues detected');
}

console.log(`${'═'.repeat(70)}\n`);
