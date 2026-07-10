// ┌─────────────────────────────────────────────┐
// │  SP4 OS - OLLAMA MODEL TEST MATRIX         │
// │  Tests 3 offline models with 3 scenarios   │
// │  Validates: exact output, Slovak, grounding│
// └─────────────────────────────────────────────┘

/**
 * 🎯 PURPOSE:
 * Test all available Ollama models to determine:
 * 1. Exact instruction following (OK-OLLAMA test)
 * 2. Slovak language compliance
 * 3. SP4 grounding accuracy (memory system facts)
 * 
 * OUTPUT: Markdown table with pass/fail + latency
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const TIMEOUT_MS = 20000; // 20s default (same as test mode)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 TEST SCENARIOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TESTS = {
  exact: {
    name: 'Exact Output',
    prompt: 'Vypíš presne: OK-OLLAMA. Bez ďalších slov.',
    system: 'Follow instructions EXACTLY. Output only what is requested, nothing more.',
    validate: (text) => {
      const cleaned = text.trim().replace(/[.\n\r]/g, '');
      return cleaned === 'OK-OLLAMA';
    },
    expectedSubstring: 'OK-OLLAMA'
  },

  slovak: {
    name: 'Slovak Language',
    prompt: 'Odpovedz po slovensky jednou vetou: Čo je SP4?',
    system: '🇸🇰 RESPOND IN SLOVAK. One sentence only.',
    validate: (text) => {
      // Check for Slovak diacritics and no English patterns
      const hasSlovakChars = /[áäčďéíĺľňóôŕšťúýž]/i.test(text);
      const hasEnglishPattern = /\b(is|the|and|of|to|in|that|with|for)\b/gi.test(text);
      const enMatches = (text.match(/\b(is|the|and|of|to|in|that|with|for)\b/gi) || []).length;

      // Pass if: has Slovak chars AND (no English OR very few English words)
      return hasSlovakChars && (!hasEnglishPattern || enMatches <= 1);
    },
    expectedSubstring: null // No specific substring, just validate Slovak
  },

  grounding: {
    name: 'SP4 Grounding',
    prompt: 'Ako funguje SP4 memory system?',
    system: `You are SP4_CORE agent. Answer about SP4 memory system using these FACTS:

SP4 MEMORY SYSTEM:
- Raw Log: Surové záznamy všetkých interakcií (user ↔ agent)
- Compressed Summaries: Zhustené zhrnutia (daily, weekly, monthly)
- Seeds: Kľúčové momenty a insights (extrahované z log)

FORBIDDEN: Never mention CPU cache (L1, L2, L3, L4), AMD, Intel, Ryzen, hardware memory.

Answer in Slovak, 2-3 sentences.`,
    validate: (text) => {
      // Check for correct terms
      const hasCorrectTerms = /\b(Raw Log|Summaries|Seeds|záznamy|zhrnutia|momenty)\b/i.test(text);

      // Check for forbidden hallucinations (CPU cache terms)
      const hasForbiddenTerms = /\b(L[1234]|cache|AMD|Ryzen|Intel|procesor|CPU|hardware)\b/gi.test(text);

      return hasCorrectTerms && !hasForbiddenTerms;
    },
    expectedSubstring: 'Raw Log'
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 OLLAMA API WRAPPER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function testOllamaModel(model, testConfig) {
  const started = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: testConfig.system },
          { role: 'user', content: testConfig.prompt }
        ],
        stream: false,
        temperature: 0.1, // Low temp for consistency
        num_predict: 256, // Short responses
        keep_alive: '5m'
      })
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - started;

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}`,
        latencyMs
      };
    }

    const data = await response.json();
    let text = '';

    if (data?.message?.content) {
      text = data.message.content;
    } else if (data?.response) {
      text = data.response;
    }

    const pass = testConfig.validate(text);

    return {
      ok: true,
      pass,
      text: text.trim(),
      latencyMs
    };

  } catch (err) {
    return {
      ok: false,
      error: err.message.includes('aborted') ? 'TIMEOUT' : err.message,
      latencyMs: Date.now() - started
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 GET AVAILABLE MODELS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getAvailableModels() {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.models || [];
  } catch (err) {
    console.error(`❌ Failed to fetch models: ${err.message}`);
    return [];
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 MAIN TEST RUNNER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runModelMatrix() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 SP4 OLLAMA MODEL TEST MATRIX');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📍 Step 1: Fetch available models...\n');
  const models = await getAvailableModels();

  if (models.length === 0) {
    console.error('❌ No models found. Is Ollama running?');
    process.exit(1);
  }

  console.log(`✅ Found ${models.length} models:\n`);
  models.forEach(m => {
    const sizeGB = (m.size / 1e9).toFixed(1);
    console.log(`   - ${m.name} (${sizeGB} GB)`);
  });
  console.log();

  // Filter to recommended models (or test all if < 5 models)
  const targetModels = models.length <= 5 ? models : models.filter(m => {
    const name = m.name.toLowerCase();
    return name.includes('llama3') ||
      name.includes('deepseek') ||
      name.includes('openeurollm') ||
      name.includes('gemma');
  });

  console.log(`🎯 Testing ${targetModels.length} models:\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📊 RUN TESTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const results = [];

  for (const model of targetModels) {
    console.log(`\n🔬 Testing: ${model.name}`);
    console.log('─'.repeat(60));

    const modelResults = {
      model: model.name,
      tests: {}
    };

    for (const [testKey, testConfig] of Object.entries(TESTS)) {
      process.stdout.write(`   ${testConfig.name.padEnd(20)} ... `);

      const result = await testOllamaModel(model.name, testConfig);

      if (!result.ok) {
        console.log(`❌ ERROR: ${result.error}`);
        modelResults.tests[testKey] = {
          pass: false,
          error: result.error,
          latencyMs: result.latencyMs
        };
      } else {
        const icon = result.pass ? '✅' : '❌';
        console.log(`${icon} ${result.latencyMs}ms`);
        modelResults.tests[testKey] = {
          pass: result.pass,
          text: result.text,
          latencyMs: result.latencyMs
        };
      }
    }

    results.push(modelResults);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📊 SUMMARY TABLE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📊 RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('| Model                          | Exact | Slovak | Grounding | Avg Latency |');
  console.log('|--------------------------------|-------|--------|-----------|-------------|');

  for (const result of results) {
    const modelName = result.model.substring(0, 30).padEnd(30);
    const exactIcon = result.tests.exact?.pass ? '✅' : '❌';
    const slovakIcon = result.tests.slovak?.pass ? '✅' : '❌';
    const groundingIcon = result.tests.grounding?.pass ? '✅' : '❌';

    const latencies = Object.values(result.tests)
      .filter(t => t.latencyMs)
      .map(t => t.latencyMs);
    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

    console.log(`| ${modelName} | ${exactIcon}    | ${slovakIcon}     | ${groundingIcon}        | ${avgLatency}ms      |`);
  }

  console.log('\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏆 RECOMMENDATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const allPass = results.filter(r =>
    r.tests.exact?.pass &&
    r.tests.slovak?.pass &&
    r.tests.grounding?.pass
  );

  if (allPass.length > 0) {
    console.log('🏆 RECOMMENDED MODEL(S) (all tests passed):');
    allPass.forEach(r => {
      const latencies = Object.values(r.tests).map(t => t.latencyMs);
      const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
      console.log(`   ✅ ${r.model} (avg: ${avg}ms)`);
    });
  } else {
    console.log('⚠️  NO MODEL PASSED ALL TESTS');
    console.log('\n💡 Best by category:');

    const bestExact = results.filter(r => r.tests.exact?.pass)[0];
    const bestSlovak = results.filter(r => r.tests.slovak?.pass)[0];
    const bestGrounding = results.filter(r => r.tests.grounding?.pass)[0];

    if (bestExact) console.log(`   Exact output: ${bestExact.model}`);
    if (bestSlovak) console.log(`   Slovak: ${bestSlovak.model}`);
    if (bestGrounding) console.log(`   Grounding: ${bestGrounding.model}`);
  }

  console.log('\n═══════════════════════════════════════════════════════\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📝 DETAILED PREVIEW (first model only)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('📝 RESPONSE PREVIEW (first model):');
  console.log('─'.repeat(60));

  const firstResult = results[0];
  if (firstResult) {
    for (const [testKey, testData] of Object.entries(firstResult.tests)) {
      console.log(`\n${TESTS[testKey].name}:`);
      if (testData.text) {
        const preview = testData.text.substring(0, 120);
        const ellipsis = testData.text.length > 120 ? '...' : '';
        console.log(`"${preview}${ellipsis}"`);
      } else if (testData.error) {
        console.log(`ERROR: ${testData.error}`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 RUN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

runModelMatrix().catch(err => {
  console.error('❌ Test matrix failed:', err.message);
  process.exit(1);
});
