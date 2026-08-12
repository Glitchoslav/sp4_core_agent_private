import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PRIMARY = 'http://100.93.236.76:11434';
const SECONDARY = 'http://localhost:11434';
let importSequence = 0;
const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sp4-ollama-fallback-'));
process.env.SP4_RUNTIME_ROOT = runtimeRoot;
process.on('exit', () => fs.rmSync(runtimeRoot, { recursive: true, force: true }));

function response(data, { ok = true, status = 200, statusText = 'OK' } = {}) {
  return {
    ok,
    status,
    statusText,
    async json() { return data; },
  };
}

async function loadClient({ hosts, legacyHost } = {}) {
  if (hosts === undefined) delete process.env.OLLAMA_HOSTS;
  else process.env.OLLAMA_HOSTS = hosts;
  if (legacyHost === undefined) delete process.env.OLLAMA_HOST;
  else process.env.OLLAMA_HOST = legacyHost;
  delete process.env.SP4_TEST;
  process.env.OLLAMA_TIMEOUT_MS = '60000';
  importSequence += 1;
  return import(`../src/llm/ollamaClient.js?fallback-test=${importSequence}`);
}

// 1. Primarny host ostava preferovany a model sa na nom nemapuje.
{
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return response({ message: { content: 'primary-ok' } });
  };
  const client = await loadClient({ hosts: `${PRIMARY},${SECONDARY}` });
  const result = await client.callOllama({ model: 'qwen2.5:7b', prompt: 'test', maxRetries: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.host, PRIMARY);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${PRIMARY}/api/chat`);
  assert.equal(calls[0].body.model, 'qwen2.5:7b');
}

// 2. Primarny vycerpa retries, sekundarny sa skusi presne raz.
{
  const calls = [];
  const timeoutValues = [];
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (callback, timeoutMs) => {
    timeoutValues.push(timeoutMs);
    return { callback, timeoutMs };
  };
  globalThis.clearTimeout = () => {};
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    if (url.startsWith(PRIMARY)) throw new TypeError('fetch failed');
    return response({ message: { content: 'secondary-ok' } });
  };
  try {
    const client = await loadClient({ hosts: `${PRIMARY},${SECONDARY}` });
    const result = await client.callOllama({ model: 'gemma3:4b', prompt: 'test', maxRetries: 1 });
    assert.equal(result.ok, true);
    assert.equal(result.host, SECONDARY);
    assert.deepEqual(calls.map((call) => call.url), [
      `${PRIMARY}/api/chat`,
      `${PRIMARY}/api/chat`,
      `${SECONDARY}/api/chat`,
    ]);
    assert.deepEqual(timeoutValues, [60000, 60000, 90000]);
    assert.equal(calls[2].body.model, 'gemma3:4b');
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
}

// 3. Volajuci nemoze prepisat think:false pre qwen3.
{
  let body;
  globalThis.fetch = async (url, options) => {
    body = JSON.parse(options.body);
    return response({ message: { content: 'qwen3-visible-response' } });
  };
  const client = await loadClient({ hosts: PRIMARY });
  const result = await client.callOllama({
    model: 'qwen3:8b', prompt: 'test', think: true, maxRetries: 0,
  });
  assert.equal(body.think, false);
  assert.equal(result.text, 'qwen3-visible-response');
}

// 4. Vycerpany retazec konci unhealthy bez opakovania sekundarneho hosta.
{
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    throw new TypeError('fetch failed');
  };
  const client = await loadClient({ hosts: `${PRIMARY},${SECONDARY}` });
  const result = await client.callOllama({ model: 'gemma3:4b', prompt: 'test', maxRetries: 1 });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'OLLAMA_UNHEALTHY');
  assert.equal(result.healthStatus, 'unhealthy');
  assert.equal(calls.length, 3);
}

// 5. OLLAMA_HOSTS bez ciarky znamena jeden host.
{
  const client = await loadClient({ hosts: PRIMARY });
  assert.deepEqual(client.getOllamaConfig().hosts, [PRIMARY]);
}

// 6. Legacy OLLAMA_HOST ostava podporovany.
{
  const client = await loadClient({ legacyHost: SECONDARY });
  assert.deepEqual(client.getOllamaConfig().hosts, [SECONDARY]);
}

// 7. Mapping plati iba na sekundarnom hoste.
{
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    if (url.startsWith(PRIMARY)) throw new TypeError('fetch failed');
    return response({ message: { content: 'mapped' } });
  };
  const client = await loadClient({ hosts: `${PRIMARY},${SECONDARY}` });
  const result = await client.callOllama({ model: 'qwen2.5:7b', prompt: 'test', maxRetries: 0 });
  assert.equal(result.model, 'qwen3:8b');
  assert.equal(calls[0].body.model, 'qwen2.5:7b');
  assert.equal(calls[1].body.model, 'qwen3:8b');
}

// Plain import pouzivany llmLocal/rituals nacita rovnaku dvojicu hostov.
process.env.OLLAMA_HOSTS = `${PRIMARY},${SECONDARY}`;
delete process.env.OLLAMA_HOST;
const reachabilityCalls = [];
globalThis.fetch = async (url) => {
  reachabilityCalls.push(url);
  if (url.startsWith(PRIMARY)) throw new TypeError('fetch failed');
  return response({ models: [{ name: 'qwen3:8b', size: 1, modified_at: 'now' }] });
};

// 8. Diagnostika ukazuje host, ktory realne uspel.
const { getModelDiagnostics } = await import('../sp4os/llmLocal.js');
const diagnostics = await getModelDiagnostics();
assert.equal(diagnostics.server.host, SECONDARY);

// 9. Ritual reachability skusi aj sekundarny host.
const { isOllamaReachableForToday } = await import('../rituals.js');
reachabilityCalls.length = 0;
assert.equal(await isOllamaReachableForToday(), true);
assert.deepEqual(reachabilityCalls, [`${PRIMARY}/api/tags`, `${SECONDARY}/api/tags`]);

console.log('PASS: Ollama primary/fallback chain (9 contracts)');
