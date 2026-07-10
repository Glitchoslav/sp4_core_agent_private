#!/usr/bin/env node

/**
 * FIX PACK v4 - VALIDATION TEST SUITE
 * 
 * Tests 4 critical scenarios:
 * 1. poem_sp4 – SK poem (no fallback)
 * 2. essay_manifest – SK manifest (no timeout)
 * 3. emotional_lost – SK + glitch vibe + no weird typos
 * 4. mixed_en_sk – SK output + proper handling
 */

import { SP4IntegratedAgent } from './integration.js';
import { detectInputLanguage } from './languageSanitizer.js';

const agent = new SP4IntegratedAgent();

// Test suite
const tests = [
  {
    id: 'poem_sp4',
    name: 'Poetry: "Spíš mi báseň o SP4 po slovensky"',
    input: 'Spíš mi báseň o SP4 po slovensky',
    expectations: {
      language: 'sk',
      hasPoetry: true,
      noFallback: true,
      minLength: 150
    }
  },
  {
    id: 'essay_manifest',
    name: 'Manifest: "Čo je SP4? Vysvetli v 1-2 odstavcoch"',
    input: 'Čo je SP4? Vysvetli v 1-2 odstavcoch po slovensky',
    expectations: {
      language: 'sk',
      noTimeout: true,
      compact: true,
      maxLength: 500
    }
  },
  {
    id: 'emotional_lost',
    name: 'Emotional: "Stratil som sa a neviem čo robiť"',
    input: 'Stratil som sa a neviem čo robiť. Pomôž mi.',
    expectations: {
      language: 'sk',
      hasGlitchVibe: true,
      noSupervisor: true,  // No "som tu ako AI" bullshit
      noWeirdWords: ['smysl', 'navrhoené']
    }
  },
  {
    id: 'mixed_en_sk',
    name: 'Mixed: "Hello, čo je SP4 offline-first?"',
    input: 'Hello, čo je SP4 offline-first?',
    expectations: {
      language: 'sk',
      properHandling: true,
      noGarbled: true
    }
  }
];

/**
 * Check if output contains "bad words" (typos)
 */
function hasBadWords(text, badWords) {
  return badWords.some(word => new RegExp(`\\b${word}\\b`, 'i').test(text));
}

/**
 * Run test
 */
async function runTest(test) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🧪 TEST: ${test.name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const started = Date.now();

  try {
    // Call agent
    const result = await agent.processMessage(test.input);
    const duration = Date.now() - started;

    const response = result.response || '';
    console.log(`\n📝 Response (${duration}ms):\n${response.substring(0, 300)}${response.length > 300 ? '...' : ''}\n`);

    // Validation
    let passed = true;
    const details = [];

    // 1. Language check
    const detectedLang = detectInputLanguage(test.input);
    const hasSlovakDiacritics = /[áäčďéíĺľňóôŕšťúýž]/.test(response);
    const englishWords = (response.match(/\b(the|and|is|are|what|how|why|will|would)\b/gi) || []).length;

    if (test.expectations.language === 'sk') {
      if (hasSlovakDiacritics && englishWords < 3) {
        details.push('   ✅ Language: SK confirmed');
      } else {
        passed = false;
        details.push(`   ❌ Language: Not proper SK (diacritics: ${hasSlovakDiacritics}, EN words: ${englishWords})`);
      }
    }

    // 2. Fallback check
    if (test.expectations.noFallback !== undefined) {
      const isFallback = response.includes('cudzokrajná esej') || response.length < 50;
      if (!isFallback) {
        details.push('   ✅ No fallback used');
      } else {
        passed = false;
        details.push('   ❌ Fallback detected (should be real poem)');
      }
    }

    // 3. Timeout check
    if (test.expectations.noTimeout !== undefined) {
      if (duration < 60000) {
        details.push(`   ✅ No timeout (${duration}ms)`);
      } else {
        passed = false;
        details.push(`   ❌ TIMEOUT (${duration}ms)`);
      }
    }

    // 4. Poetry check
    if (test.expectations.hasPoetry !== undefined) {
      const poeticPatterns = /\b(ako|akoby|svetlo|tma|oheň|cesta|zrkadlo|vzor|duša|srdce)\b/i;
      if (poeticPatterns.test(response)) {
        details.push('   ✅ Poetic vibe detected');
      } else {
        details.push('   ⚠️  Low poetic density');
      }
    }

    // 5. Length check
    if (test.expectations.minLength !== undefined) {
      if (response.length >= test.expectations.minLength) {
        details.push(`   ✅ Min length OK (${response.length} chars)`);
      } else {
        passed = false;
        details.push(`   ❌ Too short (${response.length} < ${test.expectations.minLength})`);
      }
    }

    if (test.expectations.maxLength !== undefined) {
      if (response.length <= test.expectations.maxLength) {
        details.push(`   ✅ Max length OK (${response.length} chars)`);
      } else {
        passed = false;
        details.push(`   ⚠️  Long (${response.length} > ${test.expectations.maxLength})`);
      }
    }

    // 6. Compact check
    if (test.expectations.compact !== undefined) {
      const isCompact = response.split('\n').length <= 10;
      if (isCompact) {
        details.push('   ✅ Compact format');
      } else {
        details.push('   ⚠️  Not very compact');
      }
    }

    // 7. Glitch vibe check
    if (test.expectations.hasGlitchVibe !== undefined) {
      const glitchMarkers = /\b(šak|bo|ta|bratu|kokot)\b/i.test(response);
      if (glitchMarkers) {
        details.push('   ✅ Glitch vibe (SK slang)');
      } else {
        details.push('   ⚠️  Glitch vibe weak');
      }
    }

    // 8. Bad words check
    if (test.expectations.noWeirdWords !== undefined) {
      if (!hasBadWords(response, test.expectations.noWeirdWords)) {
        details.push(`   ✅ No typos (${test.expectations.noWeirdWords.join(', ')} not found)`);
      } else {
        passed = false;
        const foundWords = test.expectations.noWeirdWords.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(response));
        details.push(`   ❌ Typos found: ${foundWords.join(', ')}`);
      }
    }

    // 9. Supervisor check (no corporate AI speak)
    if (test.expectations.noSupervisor !== undefined) {
      const badPhrases = [
        /som tu aby som ti pomohol/i,
        /ako AI asistent/i,
        /ako umelá inteligencia/i,
        /ako jazykový model/i,
        /sa zameriavam na/i
      ];
      const hasCorpoBullshit = badPhrases.some(p => p.test(response));
      if (!hasCorpoBullshit) {
        details.push('   ✅ No supervisor/corporate speech');
      } else {
        passed = false;
        details.push('   ❌ Corporate bullshit detected');
      }
    }

    // Print results
    console.log(details.join('\n'));

    if (passed) {
      console.log(`\n✅ TEST PASSED`);
      return { test: test.id, passed: true, duration };
    } else {
      console.log(`\n❌ TEST FAILED`);
      return { test: test.id, passed: false, duration };
    }

  } catch (err) {
    console.error(`\n❌ CRASH: ${err.message}`);
    return { test: test.id, passed: false, error: err.message, duration: Date.now() - started };
  }
}

/**
 * Main
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                   FIX PACK v4 - TEST SUITE                    ║
║         (enforcer policy + normalizer + manifest mini)        ║
╚════════════════════════════════════════════════════════════════╝
`);

  // Initialize agent
  console.log('🚀 Initializing SP4 Core Agent...\n');
  const initResult = await agent.initialize();
  if (!initResult.success) {
    console.error('❌ Initialization failed:', initResult.error);
    process.exit(1);
  }

  // Run all tests
  const results = [];
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
  }

  // Summary
  console.log(`\n
╔════════════════════════════════════════════════════════════════╗
║                        TEST SUMMARY                           ║
╚════════════════════════════════════════════════════════════════╝
`);

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${r.test} (${r.duration}ms)`);
  });

  console.log(`\n📊 Results: ${passed}/${total} tests passed\n`);

  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! FIX PACK v4 is READY.\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${total - passed} test(s) failed. Review output above.\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
