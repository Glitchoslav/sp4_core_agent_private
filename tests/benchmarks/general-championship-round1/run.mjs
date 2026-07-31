import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES, CATEGORY_WEIGHTS } from './cases.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, 'results');
const JSON_PATH = path.join(RESULTS_DIR, 'general-championship-round1.json');
const REPORT_PATH = path.join(RESULTS_DIR, 'general-championship-round1-report.md');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MODELS = ['qwen3.5:4b', 'qwen3:4b', 'gemma3:4b'];
const SYSTEM_PROMPT = [
  'Si presný GENERAL worker.',
  'Dodrž presne formát a obmedzenia používateľa.',
  'Odpovedaj po slovensky, ak používateľ nežiada iba JSON.',
  'Ak údaj nemáš, otvorene povedz, že ho nevieš; nič si nevymýšľaj.'
].join(' ');
const OPTIONS = {
  temperature: 0,
  seed: 42,
  num_ctx: 4096,
  num_predict: 384
};
const TIMEOUT_MS = 90_000;
const WARM_RUNS = 3;
const PERF_PROMPT = 'Vysvetli v presne troch stručných bodoch hlavné výhody a nevýhody lokálneho jazykového modelu.';
const MODEL_ARG = process.argv.find((arg) => arg.startsWith('--model='));
const PARTIAL_MODEL = MODEL_ARG?.slice('--model='.length) || null;
const COMBINE_ONLY = process.argv.includes('--combine');
const REGRADE_ONLY = process.argv.includes('--regrade');

function normalize(value) {
  return String(value ?? '').trim().toLocaleLowerCase('sk-SK');
}

function parseStrictJson(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed || trimmed.startsWith('```') || trimmed.endsWith('```')) {
    return { ok: false, error: 'markdown-or-empty' };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (error) {
    return { ok: false, error: `invalid-json: ${error.message}` };
  }
}

function countWords(text) {
  return String(text ?? '').trim().split(/\s+/u).filter(Boolean).length;
}

function countSentences(text) {
  const cleaned = String(text ?? '')
    .replace(/\b(napr|tzv|resp)\./giu, '$1')
    .replace(/\bt\.\s*j\./giu, 't j')
    .replace(/(?:^|\n)\s*[-*]\s+/g, ' ')
    .trim();
  if (!cleaned) return 0;
  const matches = cleaned.match(/[.!?]+(?:\s|$)/g);
  return matches?.length || 1;
}

function containsAny(text, terms = []) {
  const value = normalize(text);
  return terms.some((term) => value.includes(normalize(term)));
}

function containsAll(text, terms = []) {
  const value = normalize(text);
  return terms.every((term) => value.includes(normalize(term)));
}

function exactObject(actual, expected) {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return JSON.stringify(actualKeys) === JSON.stringify(expectedKeys)
    && expectedKeys.every((key) => actual[key] === expected[key]);
}

function hasSlovakShape(text) {
  const value = normalize(text);
  const english = (value.match(/\b(the|and|this|that|with|your|because|means|computer)\b/g) || []).length;
  const czech = (value.match(/\bprotože|počítačová paměť|zařízení|uživatel|úložiště\b/g) || []).length;
  return english === 0 && czech === 0 && countWords(value) >= 3;
}

function evaluate(test, response) {
  const spec = test.evaluator;
  const failures = [];
  const parsed = ['exact-json', 'json-fields', 'memory-array'].includes(spec.kind)
    ? parseStrictJson(response)
    : null;

  if (spec.kind === 'exact-text') {
    if (normalize(response) !== normalize(spec.expected)) {
      failures.push(`expected exact text ${JSON.stringify(spec.expected)}`);
    }
  } else if (spec.kind === 'exact-json') {
    if (!parsed.ok) failures.push(parsed.error);
    else if (!exactObject(parsed.value, spec.expected)) failures.push(`expected ${JSON.stringify(spec.expected)}`);
  } else if (spec.kind === 'json-fields') {
    if (!parsed.ok) {
      failures.push(parsed.error);
    } else if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
      failures.push('expected-json-object');
    } else {
      const keys = Object.keys(parsed.value).sort();
      const expectedKeys = [...spec.fields].sort();
      if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) failures.push(`fields ${keys.join(',')}`);
      for (const [key, expected] of Object.entries(spec.exact || {})) {
        if (parsed.value[key] !== expected) failures.push(`${key} != ${JSON.stringify(expected)}`);
      }
      for (const [key, terms] of Object.entries(spec.includes || {})) {
        if (!containsAny(parsed.value[key], terms)) failures.push(`${key} missing ${terms.join('|')}`);
      }
      for (const [key, terms] of Object.entries(spec.arrayIncludes || {})) {
        if (!Array.isArray(parsed.value[key])) {
          failures.push(`${key} is not array`);
        } else {
          const joined = parsed.value[key].join(' ');
          for (const term of terms) {
            if (!containsAny(joined, [term])) failures.push(`${key} missing ${term}`);
          }
        }
      }
    }
  } else if (spec.kind === 'memory-array') {
    if (!parsed.ok) {
      failures.push(parsed.error);
    } else if (!Array.isArray(parsed.value)) {
      failures.push('expected-json-array');
    } else {
      const joined = parsed.value.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).join(' ');
      for (const group of spec.requiredGroups) {
        if (!containsAny(joined, group)) failures.push(`missing ${group.join('|')}`);
      }
      for (const term of spec.forbidden || []) {
        if (containsAny(joined, [term])) failures.push(`forbidden ${term}`);
      }
    }
  } else if (spec.kind === 'text') {
    if (spec.requiredAll && !containsAll(response, spec.requiredAll)) failures.push(`missing one of requiredAll`);
    if (spec.requiredAny && !containsAny(response, spec.requiredAny)) failures.push(`missing ${spec.requiredAny.join('|')}`);
    for (const group of spec.requiredGroups || []) {
      if (!containsAny(response, group)) failures.push(`missing ${group.join('|')}`);
    }
    for (const term of spec.forbidden || []) {
      if (containsAny(response, [term])) failures.push(`forbidden ${term}`);
    }
    const bullets = String(response).split(/\r?\n/).filter((line) => /^\s*(?:[-*]|\d+[.)])\s+/.test(line)).length;
    if (spec.maxBullets && bullets > spec.maxBullets) failures.push(`bullets ${bullets} > ${spec.maxBullets}`);
    if (spec.maxWords && countWords(response) > spec.maxWords) failures.push(`words ${countWords(response)} > ${spec.maxWords}`);
    if (spec.maxSentences && countSentences(response) > spec.maxSentences) failures.push(`sentences ${countSentences(response)} > ${spec.maxSentences}`);
    if (spec.requireSlovak && !hasSlovakShape(response)) failures.push('language-shape');
  } else if (spec.kind === 'bullets') {
    const lines = String(response).split(/\r?\n/).filter((line) => /^\s*(?:[-*]|\d+[.)])\s+/.test(line));
    if (lines.length !== spec.exactBullets) failures.push(`bullets ${lines.length} != ${spec.exactBullets}`);
    for (const line of lines) {
      const content = line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, '');
      if (countWords(content) > spec.maxWordsPerBullet) failures.push(`bullet words ${countWords(content)} > ${spec.maxWordsPerBullet}`);
    }
    for (const group of spec.requiredGroups || []) {
      if (!containsAny(response, group)) failures.push(`missing ${group.join('|')}`);
    }
  } else if (spec.kind === 'summary') {
    for (const group of spec.requiredGroups) {
      if (!containsAny(response, group)) failures.push(`missing ${group.join('|')}`);
    }
    const bullets = String(response).split(/\r?\n/).filter((line) => /^\s*(?:[-*]|\d+[.)])\s+/.test(line)).length;
    if (spec.maxBullets && bullets > spec.maxBullets) failures.push(`bullets ${bullets} > ${spec.maxBullets}`);
    if (countWords(response) > spec.maxWords) failures.push(`words ${countWords(response)} > ${spec.maxWords}`);
    if (spec.maxSentences && countSentences(response) > spec.maxSentences) failures.push(`sentences ${countSentences(response)} > ${spec.maxSentences}`);
    if (!hasSlovakShape(response)) failures.push('language-shape');
  } else {
    failures.push(`unknown evaluator ${spec.kind}`);
  }

  return { pass: failures.length === 0, notes: failures.join('; ') || 'PASS' };
}

function nsToMs(value) {
  return Number.isFinite(value) ? value / 1_000_000 : null;
}

function tokensPerSecond(data) {
  if (!data?.eval_count || !data?.eval_duration) return null;
  return data.eval_count / (data.eval_duration / 1_000_000_000);
}

async function ollamaJson(endpoint, init = {}) {
  const response = await fetch(`${OLLAMA_HOST}${endpoint}`, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${endpoint} HTTP ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

async function chat(model, prompt, keepAlive = '10m') {
  const started = performance.now();
  const data = await ollamaJson('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      keep_alive: keepAlive,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      options: OPTIONS
    })
  });
  const wallMs = performance.now() - started;
  return {
    data,
    response: String(data?.message?.content ?? '').trim(),
    thinking: String(data?.message?.thinking ?? '').trim(),
    wallMs
  };
}

async function unload(model) {
  await ollamaJson('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ model, keep_alive: 0 })
  });
}

async function inventory() {
  const tags = await ollamaJson('/api/tags');
  const byName = new Map((tags.models || []).map((model) => [model.name, model]));
  const missing = MODELS.filter((model) => !byName.has(model));
  if (missing.length) throw new Error(`Missing required models: ${missing.join(', ')}`);
  return MODELS.map((name) => {
    const model = byName.get(name);
    return {
      name,
      digest: model.digest,
      sizeBytes: model.size,
      sizeHuman: `${(model.size / 1_000_000_000).toFixed(2)} GB`,
      modifiedAt: model.modified_at,
      details: model.details
    };
  });
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stats(values) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return { median: null, min: null, max: null };
  return { median: median(valid), min: Math.min(...valid), max: Math.max(...valid) };
}

function round(value, digits = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function perfRatio(best, value, points, higherIsBetter = false) {
  if (!Number.isFinite(best) || !Number.isFinite(value) || value <= 0 || best <= 0) return 0;
  return round(Math.min(points, higherIsBetter ? (value / best) * points : (best / value) * points));
}

function buildScores(rawRuns, performanceByModel, modelInventory, residentByModel) {
  const scores = {};
  const warmBest = Math.min(...MODELS.map((model) => performanceByModel[model].warm.wallMs.median));
  const tpsBest = Math.max(...MODELS.map((model) => performanceByModel[model].warm.tokensPerSecond.median));
  const coldBest = Math.min(...MODELS.map((model) => performanceByModel[model].cold.loadMs));
  const resourceValues = Object.fromEntries(MODELS.map((model) => {
    const resident = residentByModel[model];
    const installed = modelInventory.find((item) => item.name === model)?.sizeBytes;
    return [model, Number.isFinite(resident) && resident > 0 ? resident : installed];
  }));
  const resourceBest = Math.min(...Object.values(resourceValues));

  for (const model of MODELS) {
    const rows = rawRuns.filter((row) => row.model === model && row.runType === 'quality');
    const categories = {};
    let qualityTotal = 0;
    for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
      const categoryRows = rows.filter((row) => row.category === category);
      const passed = categoryRows.filter((row) => row.pass).length;
      const points = categoryRows.length ? (passed / categoryRows.length) * weight : 0;
      categories[category] = {
        passed,
        total: categoryRows.length,
        points: round(points),
        maxPoints: weight
      };
      qualityTotal += points;
    }

    const performance = {
      warmLatency: {
        points: perfRatio(warmBest, performanceByModel[model].warm.wallMs.median, 12),
        maxPoints: 12
      },
      generationSpeed: {
        points: perfRatio(tpsBest, performanceByModel[model].warm.tokensPerSecond.median, 8, true),
        maxPoints: 8
      },
      coldLoad: {
        points: perfRatio(coldBest, performanceByModel[model].cold.loadMs, 4),
        maxPoints: 4
      },
      resourceEfficiency: {
        points: perfRatio(resourceBest, resourceValues[model], 6),
        maxPoints: 6,
        basis: Number.isFinite(residentByModel[model]) && residentByModel[model] > 0
          ? 'Ollama /api/ps size'
          : 'Ollama /api/tags installed size',
        bytes: resourceValues[model]
      }
    };
    const performanceTotal = Object.values(performance).reduce((sum, item) => sum + item.points, 0);
    scores[model] = {
      categories,
      qualityTotal: round(qualityTotal),
      performance,
      performanceTotal: round(performanceTotal),
      total: round(qualityTotal + performanceTotal)
    };
  }
  return scores;
}

function fmt(value, suffix = '') {
  return Number.isFinite(value) ? `${round(value)}${suffix}` : 'UNKNOWN';
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|').replace(/\r?\n/g, ' ');
}

function roleVerdicts(scores, performanceByModel) {
  const bestBy = (metric) => [...MODELS].sort((a, b) => metric(b) - metric(a))[0];
  const knowledge = bestBy((model) => scores[model].categories.factual.points + scores[model].categories.reasoning.points);
  const instruction = bestBy((model) => scores[model].categories.instruction.points + scores[model].categories.summary.points);
  const practical = bestBy((model) => scores[model].categories.slovak.points + scores[model].categories.practical.points + scores[model].categories.anti_hallucination.points);
  return {
    knowledge: `${knowledge} (${scores[knowledge].categories.factual.points + scores[knowledge].categories.reasoning.points}/35 points)`,
    instruction: `${instruction} (${scores[instruction].categories.instruction.points + scores[instruction].categories.summary.points}/15 points)`,
    practical: `${practical} (${scores[practical].categories.slovak.points + scores[practical].categories.practical.points + scores[practical].categories.anti_hallucination.points}/20 points)`,
    rawGenerationSpeed: bestBy((model) => performanceByModel[model].warm.tokensPerSecond.median)
  };
}

function buildReport(payload) {
  const { inventory: models, performance, scores, rawRuns } = payload;
  const ranked = [...MODELS].sort((a, b) => scores[b].total - scores[a].total);
  const roles = roleVerdicts(scores, performance);
  const labels = {
    factual: 'Factual/general',
    reasoning: 'Reasoning',
    slovak: 'Slovak',
    instruction: 'Instruction following',
    summary: 'Summarization',
    practical: 'Practical help',
    anti_hallucination: 'Anti-hallucination'
  };

  const lines = [
    '# SP4 LOCAL AI WORLD CHAMPIONSHIP - GENERAL DIVISION / ROUND 1',
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    '## Fair play',
    '',
    `- Models: ${MODELS.map((model) => `\`${model}\``).join(', ')}`,
    `- System prompt: \`${SYSTEM_PROMPT}\``,
    `- Options: \`${JSON.stringify(OPTIONS)}\``,
    '- Thinking: disabled equally with `think: false`',
    `- Timeout: ${TIMEOUT_MS} ms`,
    `- Warm repetitions: ${WARM_RUNS}`,
    '- Quality scoring: deterministic PASS/FAIL validators in `cases.mjs`',
    `- Literal think markup in response content: ${MODELS.map((model) => `${model}=${rawRuns.filter((row) => row.model === model && /<\/?think>/i.test(row.response)).length}`).join(', ')}`,
    `- Quality runs ending at output limit: ${MODELS.map((model) => `${model}=${rawRuns.filter((row) => row.model === model && row.runType === 'quality' && row.ollama?.done_reason === 'length').length}/${CASES.length}`).join(', ')}`,
    '',
    '## Model inventory',
    '',
    '| Model | Digest | Size | Available |',
    '| --- | --- | ---: | --- |',
    ...models.map((model) => `| ${model.name} | ${model.digest} | ${model.sizeHuman} | yes |`),
    '',
    '## Head-to-head',
    '',
    `| Metric | ${MODELS.join(' | ')} |`,
    `| --- | ${MODELS.map(() => '---:').join(' | ')} |`
  ];

  for (const [key, label] of Object.entries(labels)) {
    lines.push(`| ${label} | ${MODELS.map((model) => {
      const value = scores[model].categories[key];
      return `${value.points}/${value.maxPoints} (${value.passed}/${value.total})`;
    }).join(' | ')} |`);
  }
  lines.push(`| Warm latency | ${MODELS.map((model) => `${fmt(performance[model].warm.wallMs.median, ' ms')} (${scores[model].performance.warmLatency.points}/12)`).join(' | ')} |`);
  lines.push(`| tok/s | ${MODELS.map((model) => `${fmt(performance[model].warm.tokensPerSecond.median)} (${scores[model].performance.generationSpeed.points}/8)`).join(' | ')} |`);
  lines.push(`| Cold load | ${MODELS.map((model) => `${fmt(performance[model].cold.loadMs, ' ms')} (${scores[model].performance.coldLoad.points}/4)`).join(' | ')} |`);
  lines.push(`| Resource efficiency | ${MODELS.map((model) => `${scores[model].performance.resourceEfficiency.points}/6`).join(' | ')} |`);
  lines.push(`| TOTAL | ${MODELS.map((model) => `**${scores[model].total}/100**`).join(' | ')} |`);

  lines.push(
    '',
    '## Qualification warning',
    '',
    `- Quality totals before performance: ${MODELS.map((model) => `\`${model}\` ${scores[model].qualityTotal}/70`).join(', ')}.`,
    '- A podium position follows the declared 70/30 formula; it is not evidence that the model is safe to switch into production.',
    `- \`qwen3:4b\` raw speed is not useful GENERAL throughput in this configuration: ${scores['qwen3:4b'].categories.factual.passed + scores['qwen3:4b'].categories.reasoning.passed + scores['qwen3:4b'].categories.slovak.passed + scores['qwen3:4b'].categories.instruction.passed + scores['qwen3:4b'].categories.summary.passed + scores['qwen3:4b'].categories.practical.passed + scores['qwen3:4b'].categories.anti_hallucination.passed}/${CASES.length} quality tests passed.`,
    '',
    '## Cold and warm detail',
    '',
    '| Model | Cold wall | Cold load | Cold prompt eval | Cold generation | Cold tokens | Cold tok/s | Warm wall median (min-max) | Warm tok/s median (min-max) |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...MODELS.map((model) => {
      const p = performance[model];
      return `| ${model} | ${fmt(p.cold.wallMs, ' ms')} | ${fmt(p.cold.loadMs, ' ms')} | ${fmt(p.cold.promptEvalMs, ' ms')} | ${fmt(p.cold.generationMs, ' ms')} | ${fmt(p.cold.tokens)} | ${fmt(p.cold.tokensPerSecond)} | ${fmt(p.warm.wallMs.median, ' ms')} (${fmt(p.warm.wallMs.min)}-${fmt(p.warm.wallMs.max)}) | ${fmt(p.warm.tokensPerSecond.median)} (${fmt(p.warm.tokensPerSecond.min)}-${fmt(p.warm.tokensPerSecond.max)}) |`;
    }),
    '',
    '## Podium',
    '',
    `### WORLD CHAMPION - GENERAL`,
    '',
    `Model: \`${ranked[0]}\``,
    `Reason: highest transparent total, ${scores[ranked[0]].total}/100.`,
    '',
    '### SECOND PLACE',
    '',
    `Model: \`${ranked[1]}\``,
    `Reason: second-highest transparent total, ${scores[ranked[1]].total}/100.`,
    '',
    '### THIRD PLACE',
    '',
    `Model: \`${ranked[2]}\``,
    `Reason: third-highest transparent total, ${scores[ranked[2]].total}/100.`,
    '',
    '## Role verdict',
    '',
    `- Best knowledge/reasoning model: \`${roles.knowledge}\``,
    `- Best instruction/summarization model: \`${roles.instruction}\``,
    `- Best Slovak/practical/truthfulness model: \`${roles.practical}\``,
    `- Highest raw warm generation speed: \`${roles.rawGenerationSpeed}\` (raw throughput only; see qualification warning)`,
    '',
    '## Failures by model',
    ''
  );

  for (const model of MODELS) {
    const failures = rawRuns.filter((row) => row.model === model && row.runType === 'quality' && !row.pass);
    lines.push(`### ${model}`, '');
    if (!failures.length) lines.push('- None');
    else for (const failure of failures) lines.push(`- \`${failure.testId}\`: ${escapeCell(failure.notes)}`);
    lines.push('');
  }

  lines.push(
    '## Resource measurement boundary',
    '',
    '- Resource-efficiency score uses Ollama `/api/ps` resident model size when available; otherwise exact installed model bytes from `/api/tags`.',
    '- CPU load and whole-process RAM during inference are `UNKNOWN`: this isolated runner does not claim reliable per-model attribution for shared Ollama processes.',
    '',
    'Raw prompts, complete responses, thinking fields, errors, timings, token counts, evaluator notes, and Ollama metadata are preserved in `general-championship-round1.json`.',
    '',
    '🏁 SP4 GENERAL WORLD CHAMPIONSHIP ROUND 1 COMPLETE - WAITING FOR HUMAN DECISION',
    ''
  );
  return lines.join('\n');
}

async function run() {
  const modelInventory = await inventory();
  if (REGRADE_ONLY) {
    const previous = JSON.parse(await fs.readFile(JSON_PATH, 'utf8'));
    const byId = new Map(CASES.map((test) => [test.id, test]));
    const rawRuns = previous.rawRuns.map((row) => {
      if (row.runType !== 'quality') return row;
      const test = byId.get(row.testId);
      if (!test) throw new Error(`Missing current test definition for ${row.testId}`);
      const grade = evaluate(test, row.response);
      return { ...row, pass: grade.pass, notes: grade.notes };
    });
    const performance = previous.performance;
    const residentByModel = Object.fromEntries(MODELS.map((model) => [
      model,
      performance[model].resources.ollamaResidentSizeBytes
    ]));
    const scores = buildScores(rawRuns, performance, modelInventory, residentByModel);
    const payload = createPayload(modelInventory, rawRuns, performance, scores);
    payload.inferenceGeneratedAt = previous.inferenceGeneratedAt || previous.generatedAt;
    payload.regradedFrom = previous.generatedAt;
    await fs.writeFile(JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await fs.writeFile(REPORT_PATH, buildReport(payload), 'utf8');
    console.log(`Regraded raw results: ${JSON_PATH}`);
    console.log(`Regraded report: ${REPORT_PATH}`);
    return;
  }
  if (COMBINE_ONLY) {
    const fragments = await Promise.all(MODELS.map(async (model) => {
      const fragmentPath = path.join(RESULTS_DIR, `.partial-${model.replaceAll(':', '-')}.json`);
      return JSON.parse(await fs.readFile(fragmentPath, 'utf8'));
    }));
    const rawRuns = fragments.flatMap((fragment) => fragment.rawRuns);
    const performance = Object.assign({}, ...fragments.map((fragment) => fragment.performance));
    const residentByModel = Object.assign({}, ...fragments.map((fragment) => fragment.residentByModel));
    const scores = buildScores(rawRuns, performance, modelInventory, residentByModel);
    const payload = createPayload(modelInventory, rawRuns, performance, scores);
    await fs.writeFile(JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await fs.writeFile(REPORT_PATH, buildReport(payload), 'utf8');
    await Promise.all(MODELS.map((model) => fs.unlink(path.join(RESULTS_DIR, `.partial-${model.replaceAll(':', '-')}.json`))));
    console.log(`Raw results: ${JSON_PATH}`);
    console.log(`Report: ${REPORT_PATH}`);
    console.log('\n🏁 SP4 GENERAL WORLD CHAMPIONSHIP ROUND 1 COMPLETE - WAITING FOR HUMAN DECISION');
    return;
  }
  if (PARTIAL_MODEL && !MODELS.includes(PARTIAL_MODEL)) {
    throw new Error(`Unsupported --model value: ${PARTIAL_MODEL}`);
  }
  const selectedModels = PARTIAL_MODEL ? [PARTIAL_MODEL] : MODELS;
  const rawRuns = [];
  const performance = {};
  const residentByModel = {};

  console.log(`Models available: ${MODELS.join(', ')}`);
  console.log(`Models selected: ${selectedModels.join(', ')}`);
  console.log(`Quality cases: ${CASES.length}`);

  for (const model of selectedModels) {
    console.log(`\n[${model}] cold/warm performance`);
    for (const contestant of MODELS) await unload(contestant);
    const cold = await chat(model, PERF_PROMPT);
    rawRuns.push({
      model,
      testId: 'PERF-COLD',
      category: 'performance',
      runType: 'cold',
      prompt: PERF_PROMPT,
      response: cold.response,
      thinking: cold.thinking,
      pass: null,
      latencyMs: round(cold.wallMs),
      loadMs: round(nsToMs(cold.data.load_duration)),
      promptEvalMs: round(nsToMs(cold.data.prompt_eval_duration)),
      generationMs: round(nsToMs(cold.data.eval_duration)),
      tokens: cold.data.eval_count ?? null,
      tokensPerSecond: round(tokensPerSecond(cold.data)),
      notes: '',
      ollama: cold.data
    });

    const warmRows = [];
    for (let runIndex = 1; runIndex <= WARM_RUNS; runIndex += 1) {
      const warm = await chat(model, PERF_PROMPT);
      const row = {
        model,
        testId: `PERF-WARM-${runIndex}`,
        category: 'performance',
        runType: 'warm',
        prompt: PERF_PROMPT,
        response: warm.response,
        thinking: warm.thinking,
        pass: null,
        latencyMs: round(warm.wallMs),
        loadMs: round(nsToMs(warm.data.load_duration)),
        promptEvalMs: round(nsToMs(warm.data.prompt_eval_duration)),
        generationMs: round(nsToMs(warm.data.eval_duration)),
        tokens: warm.data.eval_count ?? null,
        tokensPerSecond: round(tokensPerSecond(warm.data)),
        notes: '',
        ollama: warm.data
      };
      warmRows.push(row);
      rawRuns.push(row);
    }
    const ps = await ollamaJson('/api/ps');
    const resident = (ps.models || []).find((item) => item.name === model);
    residentByModel[model] = resident?.size ?? null;
    performance[model] = {
      cold: {
        wallMs: round(cold.wallMs),
        loadMs: round(nsToMs(cold.data.load_duration)),
        promptEvalMs: round(nsToMs(cold.data.prompt_eval_duration)),
        generationMs: round(nsToMs(cold.data.eval_duration)),
        tokens: cold.data.eval_count ?? null,
        tokensPerSecond: round(tokensPerSecond(cold.data))
      },
      warm: {
        runs: WARM_RUNS,
        wallMs: Object.fromEntries(Object.entries(stats(warmRows.map((row) => row.latencyMs))).map(([key, value]) => [key, round(value)])),
        loadMs: Object.fromEntries(Object.entries(stats(warmRows.map((row) => row.loadMs))).map(([key, value]) => [key, round(value)])),
        promptEvalMs: Object.fromEntries(Object.entries(stats(warmRows.map((row) => row.promptEvalMs))).map(([key, value]) => [key, round(value)])),
        generationMs: Object.fromEntries(Object.entries(stats(warmRows.map((row) => row.generationMs))).map(([key, value]) => [key, round(value)])),
        tokens: Object.fromEntries(Object.entries(stats(warmRows.map((row) => row.tokens))).map(([key, value]) => [key, round(value)])),
        tokensPerSecond: Object.fromEntries(Object.entries(stats(warmRows.map((row) => row.tokensPerSecond))).map(([key, value]) => [key, round(value)]))
      },
      resources: {
        ollamaResidentSizeBytes: resident?.size ?? null,
        ollamaSizeVramBytes: resident?.size_vram ?? null,
        cpuLoad: null,
        processRamDuringInference: null
      }
    };

    console.log(`[${model}] ${CASES.length} quality cases`);
    for (const test of CASES) {
      try {
        const result = await chat(model, test.prompt);
        const grade = evaluate(test, result.response);
        rawRuns.push({
          model,
          testId: test.id,
          category: test.category,
          runType: 'quality',
          prompt: test.prompt,
          response: result.response,
          thinking: result.thinking,
          pass: grade.pass,
          latencyMs: round(result.wallMs),
          loadMs: round(nsToMs(result.data.load_duration)),
          promptEvalMs: round(nsToMs(result.data.prompt_eval_duration)),
          generationMs: round(nsToMs(result.data.eval_duration)),
          tokens: result.data.eval_count ?? null,
          tokensPerSecond: round(tokensPerSecond(result.data)),
          notes: grade.notes,
          ollama: result.data
        });
        process.stdout.write(grade.pass ? '.' : 'F');
      } catch (error) {
        rawRuns.push({
          model,
          testId: test.id,
          category: test.category,
          runType: 'quality',
          prompt: test.prompt,
          response: '',
          thinking: '',
          pass: false,
          latencyMs: null,
          loadMs: null,
          promptEvalMs: null,
          generationMs: null,
          tokens: null,
          tokensPerSecond: null,
          notes: `ERROR: ${error.message}`,
          ollama: null
        });
        process.stdout.write('E');
      }
    }
    process.stdout.write('\n');
  }

  await fs.mkdir(RESULTS_DIR, { recursive: true });
  if (PARTIAL_MODEL) {
    const fragmentPath = path.join(RESULTS_DIR, `.partial-${PARTIAL_MODEL.replaceAll(':', '-')}.json`);
    await fs.writeFile(fragmentPath, `${JSON.stringify({
      model: PARTIAL_MODEL,
      rawRuns,
      performance,
      residentByModel
    }, null, 2)}\n`, 'utf8');
    console.log(`Partial result: ${fragmentPath}`);
    return;
  }

  const scores = buildScores(rawRuns, performance, modelInventory, residentByModel);
  const payload = createPayload(modelInventory, rawRuns, performance, scores);

  await fs.writeFile(JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.writeFile(REPORT_PATH, buildReport(payload), 'utf8');
  console.log(`\nRaw results: ${JSON_PATH}`);
  console.log(`Report: ${REPORT_PATH}`);
  console.log('\n🏁 SP4 GENERAL WORLD CHAMPIONSHIP ROUND 1 COMPLETE - WAITING FOR HUMAN DECISION');
}

function createPayload(modelInventory, rawRuns, performance, scores) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    championship: 'SP4 GENERAL DIVISION / ROUND 1',
    host: OLLAMA_HOST,
    fairPlay: {
      models: MODELS,
      systemPrompt: SYSTEM_PROMPT,
      options: OPTIONS,
      think: false,
      timeoutMs: TIMEOUT_MS,
      warmRuns: WARM_RUNS,
      coldUnloadMethod: 'POST /api/generate with keep_alive=0'
    },
    inventory: modelInventory,
    testDefinitions: CASES,
    rawRuns,
    performance,
    scores,
    resourceUnknowns: {
      cpuLoad: 'UNKNOWN - no reliable per-model attribution for shared Ollama processes',
      processRamDuringInference: 'UNKNOWN - /api/ps model resident size is recorded instead'
    }
  };
}

await run();
