import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

const SYSTEM_PROMPT = 'Odpovedaj po slovensky, drž diakritiku, neprepínaj jazyk.';
const OPTIONS = {
  temperature: 0.3,
  top_p: 0.9,
  repeat_penalty: 1.1,
  num_ctx: 2048
};

const PROMPTS = [
  { id: 'SK1', bucket: 'general', text: 'Vysvetli rozdiel medzi REST API a GraphQL pre juniora v 5 vetách.' },
  { id: 'SK2', bucket: 'general', text: 'Zhrň tento text do 4 viet: Lokálne AI modely dávajú lepšie súkromie, ale často majú nižší výkon ako cloud.' },
  { id: 'SK3', bucket: 'general', text: 'Napíš krátky plán dňa pre človeka, ktorý má 2 hodiny na učenie programovania.' },
  { id: 'SK4', bucket: 'general', text: 'Vysvetli, prečo je dôležité robiť malé iterácie namiesto veľkých refaktorov.' },

  { id: 'T1', bucket: 'tech', text: 'Node.js app padá s ECONNREFUSED na localhost:5432. Daj postup debugovania krok za krokom.' },
  { id: 'T2', bucket: 'tech', text: 'Navrhni jednoduchú architektúru pre chat aplikáciu: API, DB, cache, worker, observability.' },
  { id: 'T3', bucket: 'tech', text: 'Ako by si riešil memory leak v dlhobežiacom Node procese? Uveď praktické nástroje a metriky.' },
  { id: 'T4', bucket: 'tech', text: 'Rozdiel medzi horizontálnym a vertikálnym škálovaním pri backend API, vrátane trade-offov.' },

  { id: 'C1', bucket: 'coding', text: 'Napíš JS funkciu debounce(fn, delay) s príkladom použitia.' },
  { id: 'C2', bucket: 'coding', text: 'Napíš Node.js express middleware pre request-id a structured log (JSON).' },
  { id: 'C3', bucket: 'coding', text: 'Napíš funkciu v JS, ktorá bezpečne parsuje JSON a vráti {ok,data,error}.' },
  { id: 'C4', bucket: 'coding', text: 'Napíš jednoduchý retry wrapper pre async funkciu (max pokusov, exponenciálny backoff).' }
];

const MODEL_CONFIG = [
  { model: 'qwen2.5:7b', buckets: new Set(['general', 'tech', 'coding']) },
  { model: 'llama3:8b', buckets: new Set(['general', 'tech', 'coding']) },
  { model: 'qwen3:4b', buckets: new Set(['general', 'tech', 'coding']) },
  { model: 'deepseek-coder:6.7b', buckets: new Set(['coding']) }
];

function calcSlovakScore(text = '') {
  const value = String(text || '');
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;

  const englishHits = (value.match(/\b(the|and|with|this|that|from|your|code|function|return|error|debug)\b/gi) || []).length;
  const diacriticsHits = (value.match(/[áäčďéíĺľňóôŕšťúýž]/gi) || []).length;
  const ratio = englishHits / words.length;

  if (ratio <= 0.01 && diacriticsHits >= 2) return 5;
  if (ratio <= 0.03 && diacriticsHits >= 1) return 4;
  if (ratio <= 0.07) return 3;
  if (ratio <= 0.12) return 2;
  return 1;
}

function calcUsefulnessScore(text = '') {
  const value = String(text || '');
  const hasSteps = /(\d+\.)|(-\s)|krok|postup|príklad|napríklad/i.test(value);
  const hasActionableTerms = /(middleware|retry|log|monitor|metrik|cache|db|kód|funkci|parameter|backoff)/i.test(value);
  const len = value.trim().length;

  if (len > 260 && hasSteps && hasActionableTerms) return 5;
  if (len > 180 && (hasSteps || hasActionableTerms)) return 4;
  if (len > 120) return 3;
  if (len > 60) return 2;
  return 1;
}

function calcFactualityScore(text = '', prompt = '') {
  const value = String(text || '');
  const p = String(prompt || '').toLowerCase();

  if (p.includes('debounce')) {
    return (/settimeout/i.test(value) && /cleartimeout/i.test(value)) ? 5 : 2;
  }
  if (p.includes('request-id')) {
    return (/x-request-id|request-id|uuid/i.test(value) && /next\(/i.test(value)) ? 5 : 2;
  }
  if (p.includes('parsuje json')) {
    return (/try|catch/i.test(value) && /\bok\b/i.test(value) && /error/i.test(value)) ? 5 : 2;
  }
  if (p.includes('retry wrapper')) {
    return (/async/i.test(value) && /await/i.test(value) && /backoff|2 \*\*|settimeout/i.test(value)) ? 5 : 3;
  }
  if (p.includes('econnrefused')) {
    return (/5432|postgres|port|docker|service/i.test(value)) ? 4 : 2;
  }
  if (p.includes('memory leak')) {
    return (/heap|clinic|--inspect|profiler|metrics|gc/i.test(value)) ? 4 : 2;
  }
  if (p.includes('rest api') && p.includes('graphql')) {
    return (/endpoint|schema|query|overfetch|underfetch/i.test(value)) ? 4 : 2;
  }

  return 4;
}

function speedLabel(ms) {
  if (ms <= 3500) return 'rýchle';
  if (ms <= 9000) return 'ok';
  return 'pomalé';
}

async function askModel(model, prompt) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const started = Date.now();
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(180000),
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          options: OPTIONS
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const output = String(data?.message?.content || '').trim();
      const latencyMs = Date.now() - started;
      return { output, latencyMs, attempt };
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
    }
  }
  throw lastError || new Error('unknown request error');
}

function avg(list) {
  if (!list.length) return 0;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

async function run() {
  const results = [];

  for (const cfg of MODEL_CONFIG) {
    for (const prompt of PROMPTS) {
      if (!cfg.buckets.has(prompt.bucket)) continue;
      try {
        const { output, latencyMs, attempt } = await askModel(cfg.model, prompt.text);
        const row = {
          model: cfg.model,
          promptId: prompt.id,
          bucket: prompt.bucket,
          prompt: prompt.text,
          latencyMs,
          speed: speedLabel(latencyMs),
          output,
          attempt,
          scores: {
            slovak: calcSlovakScore(output),
            factual: calcFactualityScore(output, prompt.text),
            usefulness: calcUsefulnessScore(output)
          }
        };
        results.push(row);
        console.log(`${cfg.model} :: ${prompt.id} :: ${latencyMs}ms :: ${row.speed}${attempt > 1 ? ` :: retry${attempt}` : ''}`);
      } catch (err) {
        const row = {
          model: cfg.model,
          promptId: prompt.id,
          bucket: prompt.bucket,
          prompt: prompt.text,
          latencyMs: 180000,
          speed: 'pomalé',
          output: '',
          error: String(err?.message || err),
          scores: {
            slovak: 1,
            factual: 1,
            usefulness: 1
          }
        };
        results.push(row);
        console.log(`${cfg.model} :: ${prompt.id} :: ERROR :: ${row.error}`);
      }
    }
  }

  const byModel = {};
  for (const r of results) {
    byModel[r.model] = byModel[r.model] || [];
    byModel[r.model].push(r);
  }

  const summary = Object.entries(byModel).map(([model, rows]) => {
    const slovak = avg(rows.map((r) => r.scores.slovak));
    const factual = avg(rows.map((r) => r.scores.factual));
    const usefulness = avg(rows.map((r) => r.scores.usefulness));
    const latencyMs = avg(rows.map((r) => r.latencyMs));
    const combinedQuality = (slovak + factual + usefulness) / 3;
    return {
      model,
      prompts: rows.length,
      avgSlovak: Number(slovak.toFixed(2)),
      avgFactual: Number(factual.toFixed(2)),
      avgUsefulness: Number(usefulness.toFixed(2)),
      avgLatencyMs: Math.round(latencyMs),
      speed: speedLabel(latencyMs),
      avgQuality: Number(combinedQuality.toFixed(2))
    };
  });

  const output = {
    generatedAt: new Date().toISOString(),
    systemPrompt: SYSTEM_PROMPT,
    options: OPTIONS,
    prompts: PROMPTS,
    results,
    summary
  };

  const outPath = path.join(__dirname, '..', 'logs', `model_sweep_sk.${Date.now()}.json`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`\nSaved: ${outPath}`);
}

await run();
