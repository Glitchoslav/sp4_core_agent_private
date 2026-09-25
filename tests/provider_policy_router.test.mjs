// T6: kazda cloud cesta v llmRouter prechadza providerPolicy — private nikdy nedosiahne LiteLLM.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp4-provider-policy-'));
process.env.SP4_RUNTIME_ROOT = tmp;
process.env.SP4_COST_LOG_PATH = path.join(tmp, 'costLog.jsonl');
process.env.SP4_CONSTITUTION_LOG_PATH = path.join(tmp, 'constitution.jsonl');
process.env.OLLAMA_HOSTS = 'http://localhost:11434';
process.env.OLLAMA_MAX_RETRIES = '0';
process.env.SP4_ALLOW_CLOUD = 'true';
process.env.USE_CLOUD_FALLBACK = 'true';
process.env.SP4_MODEL_TAGS_REFRESH_MS = '0';
delete process.env.SP4_TEST;

const calls = { ollama: 0, litellm: 0 };
const litellmBodies = [];
globalThis.fetch = async (url, options = {}) => {
  const value = String(url);
  if (value.includes(':11434')) {
    calls.ollama += 1;
    throw new TypeError('fetch failed');
  }
  if (value.includes(':3003')) return { ok: false, status: 503, text: async () => 'offline' };
  if (value.includes(':4000')) {
    calls.litellm += 1;
    litellmBodies.push(String(options.body || ''));
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'cloud-ok' } }] }) };
  }
  throw new Error(`unexpected network target: ${value}`);
};

const quietLog = console.log;
const quietWarn = console.warn;
const quietError = console.error;
console.log = () => {};
console.warn = () => {};
console.error = () => {};
after(() => {
  console.log = quietLog;
  console.warn = quietWarn;
  console.error = quietError;
  fs.rmSync(tmp, { recursive: true, force: true });
});

const { sp4LlmCall } = await import('../src/llm/llmRouter.js');
const { resetOllamaHealth } = await import('../src/llm/ollamaClient.js');

const CONSENT = { allowCloud: true };
const PRIVATE_SYSTEM = '## PAMÄŤ (relevantné minulé udalosti)\nTAJNA-SPOMIENKA';

function fresh() {
  resetOllamaHealth();
  calls.ollama = 0;
  calls.litellm = 0;
  litellmBodies.length = 0;
}

test('local-first fallback: private never reaches LiteLLM', async () => {
  fresh();
  const r = await sp4LlmCall({ prompt: 'Ahoj', system: PRIVATE_SYSTEM, policy: CONSENT, sensitivity: 'private' });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'cloud_denied_by_policy');
  assert.equal(r.reason, 'private_never_cloud');
  assert.ok(calls.ollama >= 1, 'local was tried');
  assert.equal(calls.litellm, 0);
});

test('local-first with unhealthy Ollama: private skips preemptive cloud too', async () => {
  fresh();
  await sp4LlmCall({ prompt: 'Ahoj', policy: CONSENT, sensitivity: 'private' }); // marks unhealthy
  const r = await sp4LlmCall({ prompt: 'Ahoj', system: PRIVATE_SYSTEM, policy: CONSENT, sensitivity: 'private' });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'cloud_denied_by_policy');
  assert.equal(calls.litellm, 0);
});

test('complex query: private does not take the direct cloud route', async () => {
  fresh();
  const r = await sp4LlmCall({
    model: 'gemma3:4b', // realni volajuci (bridge, askLocalLLM) model vzdy posielaju
    prompt: 'Prečo je obloha modrá a porovnaj to s východom slnka?',
    system: PRIVATE_SYSTEM, policy: CONSENT, sensitivity: 'private',
  });
  assert.equal(r.ok, false);
  assert.equal(calls.litellm, 0);
  assert.ok(calls.ollama >= 1, 'fell through to local');
});

test('missing sensitivity fails closed', async () => {
  fresh();
  const r = await sp4LlmCall({ prompt: 'Ahoj', policy: CONSENT });
  assert.equal(r.error, 'cloud_denied_by_policy');
  assert.equal(r.reason, 'sensitivity_unknown_fail_closed');
  assert.equal(calls.litellm, 0);
});

test('cloud-only: private denied without any egress', async () => {
  fresh();
  const r = await sp4LlmCall({ preference: 'cloud-only', prompt: 'Ahoj', system: PRIVATE_SYSTEM, policy: CONSENT, sensitivity: 'private' });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'cloud_denied_by_policy');
  assert.equal(calls.ollama, 0);
  assert.equal(calls.litellm, 0);
});

test('public + consent + SP4_ALLOW_CLOUD still falls back to cloud', async () => {
  fresh();
  const r = await sp4LlmCall({ prompt: 'Ahoj', policy: CONSENT, sensitivity: 'public', actorType: 'interactive-human' });
  assert.equal(calls.litellm, 1, `result=${JSON.stringify(r)}`);
  assert.equal(r.ok, true);
  assert.equal(r.text, 'cloud-ok');
  assert.ok(!litellmBodies.join('').includes('TAJNA-SPOMIENKA'));
});
