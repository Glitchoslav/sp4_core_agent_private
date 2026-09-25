import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveTierModel,
  recordTagsSnapshot,
  refreshRuntimeStates,
  resetModelResolverCache,
} from '../src/routing/modelResolver.js';
import { PRIMARY_MODEL, FALLBACK_MODEL } from '../src/config/models.js';
import { classify } from '../src/routing/classify.js';

const ALL_INSTALLED = ['qwen3.5:4b', 'gemma3:4b', 'qwen3:4b', 'qwen3.5:0.8b', 'llama3.2:3b', 'gemma3:1b'];

function snapshot(names) {
  return { healthy: true, timestamp: new Date(), models: names.map((name) => ({ name, size: 1e9, digest: 'x' })) };
}

function captureLogs(fn) {
  const logs = [];
  const original = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try { return { result: fn(), logs }; } finally { console.log = original; }
}

beforeEach(() => resetModelResolverCache());

test('config defaults: PRIMARY=gemma3:4b, FALLBACK=llama3.2:3b', () => {
  assert.equal(PRIMARY_MODEL, 'gemma3:4b');
  assert.equal(FALLBACK_MODEL, 'llama3.2:3b');
});

test('unknown runtime state -> served PRIMARY, no divergence', () => {
  const d = resolveTierModel('local');
  assert.equal(d.model, PRIMARY_MODEL);
  assert.equal(d.mode, 'advisory');
  assert.equal(d.divergence, false);
});

test('registry recommends another model -> served stays PRIMARY, divergence logged once', () => {
  recordTagsSnapshot(snapshot(ALL_INSTALLED));
  const first = captureLogs(() => resolveTierModel('local'));
  assert.equal(first.result.model, PRIMARY_MODEL);
  assert.equal(first.result.divergence, true);
  assert.notEqual(first.result.recommendedModel, PRIMARY_MODEL);
  assert.equal(first.logs.filter((l) => l.includes('[MODEL-RESOLVER]')).length, 1);

  const second = captureLogs(() => resolveTierModel('local'));
  assert.equal(second.result.model, PRIMARY_MODEL);
  assert.equal(second.logs.filter((l) => l.includes('[MODEL-RESOLVER]')).length, 0, 'same divergence is not re-logged');
});

test('SP4_MODEL_REGISTRY_MODE=enforce is ignored — served stays PRIMARY', () => {
  const prev = process.env.SP4_MODEL_REGISTRY_MODE;
  process.env.SP4_MODEL_REGISTRY_MODE = 'enforce';
  try {
    recordTagsSnapshot(snapshot(ALL_INSTALLED));
    const { result } = captureLogs(() => resolveTierModel('local'));
    assert.equal(result.model, PRIMARY_MODEL);
    assert.equal(result.mode, 'advisory');
  } finally {
    if (prev === undefined) delete process.env.SP4_MODEL_REGISTRY_MODE;
    else process.env.SP4_MODEL_REGISTRY_MODE = prev;
  }
});

test('PRIMARY not installed -> still served PRIMARY, fallback only reported', () => {
  recordTagsSnapshot(snapshot(['qwen3.5:4b', 'llama3.2:3b']));
  const { result, logs } = captureLogs(() => resolveTierModel('local'));
  assert.equal(result.model, PRIMARY_MODEL);
  assert.equal(result.primaryInstalled, false);
  assert.equal(result.wouldFallbackTo, FALLBACK_MODEL);
  assert.ok(logs.some((l) => l.includes(`wouldFallbackTo=${FALLBACK_MODEL}`)));
});

test('non-local tiers get no local model', () => {
  assert.equal(resolveTierModel('budget').model, undefined);
  assert.equal(resolveTierModel('quality').model, undefined);
});

test('refreshRuntimeStates uses injected health check and caches within TTL', async () => {
  let calls = 0;
  const healthCheck = async () => { calls += 1; return snapshot(ALL_INSTALLED); };
  await refreshRuntimeStates({ healthCheck });
  await refreshRuntimeStates({ healthCheck });
  assert.equal(calls, 1);
  await refreshRuntimeStates({ healthCheck, force: true });
  assert.equal(calls, 2);
});

test('failed health check keeps served PRIMARY', async () => {
  await refreshRuntimeStates({ healthCheck: async () => { throw new Error('down'); }, force: true });
  assert.equal(resolveTierModel('local').model, PRIMARY_MODEL);
});

test('classify local tiers still return PRIMARY with a recommending registry', () => {
  recordTagsSnapshot(snapshot(ALL_INSTALLED));
  const { result: a } = captureLogs(() => classify('Ahoj', {}));
  const { result: b } = captureLogs(() => classify('Čo je SP4? A kto ho vytvoril?', {}));
  assert.equal(a.engine, 'local');
  assert.equal(a.model, 'gemma3:4b');
  assert.equal(b.engine, 'local');
  assert.equal(b.model, 'gemma3:4b');
});
