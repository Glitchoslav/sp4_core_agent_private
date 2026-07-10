/**
 * 🔥 SP4 ORCHESTRATOR - ROUTING VALIDATION TEST
 * Tests routing accuracy with diverse queries (SP4, universe, frustration, technical)
 */

import { orchestrate } from './orchestration/glitchOrchestrator.js';

const tests = [
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SP4 PHILOSOPHY → GLITCHOSLAV
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        query: 'Čo je SP4 a prečo vzniklo?',
        expected: 'glitchoslav',
        category: 'SP4 Philosophy',
        reason: 'Deep SP4 understanding requires full context'
    },
    {
        query: 'aký je rozdiel medzi SP4 a inými komunitami?',
        expected: 'glitchoslav',
        category: 'SP4 Philosophy',
        reason: 'SP4 values need philosophical depth'
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // EXISTENTIAL / UNIVERSE → GLITCHOSLAV
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        query: 'prečo existuje vesmír?',
        expected: 'glitchoslav',
        category: 'Existential',
        reason: 'Metaphysical question needs poetic depth'
    },
    {
        query: 'čo je pravda?',
        expected: 'glitchoslav',
        category: 'Existential',
        reason: 'Philosophical concept, core to SP4 manifest'
    },
    {
        query: 'bojím sa smrti',
        expected: 'glitchoslav',
        category: 'Existential',
        reason: 'Deep emotional + existential theme'
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TECHNICAL → CORE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        query: 'ako nainštalovať npm balíček?',
        expected: 'core',
        category: 'Technical',
        reason: 'Technical instruction, no philosophy needed'
    },
    {
        query: 'čo je to LLM model?',
        expected: 'core',
        category: 'Technical',
        reason: 'Technical definition'
    },
    {
        query: 'ako funguje orchestrátor v SP4?',
        expected: 'core',
        category: 'Technical',
        reason: 'System architecture question'
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FRUSTRATION / VULGAR → POPICI
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        query: 'kokot mám toho dosť!',
        expected: 'popici',
        category: 'Frustration',
        reason: 'Vulgar expression needs brutal honesty'
    },
    {
        query: 'sere ma že nič nefunguje',
        expected: 'popici',
        category: 'Frustration',
        reason: 'High frustration, direct language'
    },
    {
        query: 'už nevládzem, piči...',
        expected: 'popici',
        category: 'Frustration',
        reason: 'Emotional exhaustion + vulgar slang'
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SP4 TOKEN (simple) → CORE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        query: 'ako získať SP4OT token?',
        expected: 'core',
        category: 'SP4 Token',
        reason: 'Simple factual question, no philosophy'
    }
];

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔥 SP4 ORCHESTRATOR - ROUTING VALIDATION TEST');
console.log(`   Testing ${tests.length} queries across 4 categories`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let correctRouting = 0;
let totalTests = tests.length;
const results = [];

for (const test of tests) {
    const result = await orchestrate(test.query, {
        emotionalState: { dominantEmotion: 'neutral' }
    });

    const routingOK = result.persona === test.expected;
    if (routingOK) correctRouting++;

    const icon = routingOK ? '✅' : '❌';

    results.push({
        query: test.query,
        category: test.category,
        expected: test.expected,
        actual: result.persona,
        model: result.model,
        routingOK,
        response: result.response.substring(0, 150)
    });

    console.log(`${icon} [${test.category}]`);
    console.log(`   Query: "${test.query}"`);
    console.log(`   Expected: ${test.expected.toUpperCase()} | Got: ${result.persona?.toUpperCase()}`);
    console.log(`   Model: ${result.model}`);
    console.log(`   Reason: ${test.reason}`);
    console.log(`   Response: ${result.response.substring(0, 100).replace(/\n/g, ' ')}...`);
    console.log('');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`   Total Tests: ${totalTests}`);
console.log(`   Correct Routing: ${correctRouting} / ${totalTests} (${Math.round(correctRouting / totalTests * 100)}%)`);
console.log(`   Failed Routing: ${totalTests - correctRouting}`);
console.log('');

// Breakdown by category
const categories = {};
results.forEach(r => {
    if (!categories[r.category]) {
        categories[r.category] = { total: 0, correct: 0 };
    }
    categories[r.category].total++;
    if (r.routingOK) categories[r.category].correct++;
});

console.log('📈 CATEGORY BREAKDOWN:');
Object.entries(categories).forEach(([cat, stats]) => {
    const pct = Math.round(stats.correct / stats.total * 100);
    console.log(`   ${cat}: ${stats.correct}/${stats.total} (${pct}%)`);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (correctRouting === totalTests) {
    console.log('🎯 PERFECT SCORE! All routing decisions correct!');
} else if (correctRouting / totalTests >= 0.9) {
    console.log('🔥 EXCELLENT! 90%+ routing accuracy achieved!');
} else if (correctRouting / totalTests >= 0.75) {
    console.log('👍 GOOD! 75%+ routing accuracy, room for improvement.');
} else {
    console.log('⚠️  NEEDS WORK! Routing accuracy below 75%.');
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
