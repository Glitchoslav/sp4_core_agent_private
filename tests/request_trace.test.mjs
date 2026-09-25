// T7 strangler Phase 0: requestId na vstupe prúdi cez legacy aj src vrstvu; trace je default vypnutý.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  runWithRequest,
  currentRequestId,
  traceLayer,
  requestTraceMiddleware,
} from '../src/core/requestTrace.js';

const saved = { trace: process.env.SP4_TRACE, file: process.env.SP4_TRACE_FILE };
afterEach(() => {
  if (saved.trace === undefined) delete process.env.SP4_TRACE; else process.env.SP4_TRACE = saved.trace;
  if (saved.file === undefined) delete process.env.SP4_TRACE_FILE; else process.env.SP4_TRACE_FILE = saved.file;
});

function capture(fn) {
  const lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(args.join(' '));
  return Promise.resolve(fn()).finally(() => { console.log = original; }).then((result) => ({ result, lines }));
}

test('requestId survives awaits; nested runs inherit the outer id', async () => {
  assert.equal(currentRequestId(), null);
  await runWithRequest({ requestId: 'req-outer' }, async () => {
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(currentRequestId(), 'req-outer');
    await runWithRequest({ requestId: 'req-inner' }, async () => {
      assert.equal(currentRequestId(), 'req-outer');
    });
  });
  assert.equal(currentRequestId(), null);
});

test('missing requestId gets a generated UUID', async () => {
  await runWithRequest({}, async () => {
    assert.match(currentRequestId(), /^[0-9a-f-]{36}$/);
  });
});

test('trace is silent by default', async () => {
  delete process.env.SP4_TRACE;
  delete process.env.SP4_TRACE_FILE;
  const { lines } = await capture(() => runWithRequest({ requestId: 'r1' }, () => traceLayer('legacy', 'x')));
  assert.deepEqual(lines, []);
});

test('SP4_TRACE=1 emits {requestId, layer, at} JSON', async () => {
  process.env.SP4_TRACE = '1';
  const { lines } = await capture(() => runWithRequest({ requestId: 'r2' }, () => traceLayer('src', 'llmRouter.sp4LlmCall', { tier: 'local' })));
  assert.equal(lines.length, 1);
  const entry = JSON.parse(lines[0].replace('[SP4-TRACE] ', ''));
  assert.equal(entry.requestId, 'r2');
  assert.equal(entry.layer, 'src');
  assert.equal(entry.at, 'llmRouter.sp4LlmCall');
  assert.equal(entry.tier, 'local');
});

test('middleware takes a safe x-request-id header, otherwise generates one', async () => {
  const seen = [];
  const mw = requestTraceMiddleware('test-entry');
  await new Promise((resolve) => mw({ get: () => 'abc-123' }, {}, () => { seen.push(currentRequestId()); resolve(); }));
  await new Promise((resolve) => mw({ get: () => 'bad header\nx' }, {}, () => { seen.push(currentRequestId()); resolve(); }));
  assert.equal(seen[0], 'abc-123');
  assert.match(seen[1], /^[0-9a-f-]{36}$/);
});

test('sp4LlmCall picks up the request context id (provider policy log)', async () => {
  process.env.OLLAMA_HOSTS = 'http://localhost:11434';
  process.env.OLLAMA_MAX_RETRIES = '0';
  process.env.SP4_MODEL_TAGS_REFRESH_MS = '0';
  const savedAllowCloud = process.env.SP4_ALLOW_CLOUD;
  process.env.SP4_ALLOW_CLOUD = 'true'; // capability on; chýbajúca sensitivity → policy deny, zero network
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  const quietWarn = console.warn;
  const quietError = console.error;
  console.warn = console.error = () => {};
  try {
    const { sp4LlmCall } = await import('../src/llm/llmRouter.js');
    const { lines } = await capture(() => runWithRequest({ requestId: 'req-ctx-7' }, () =>
      sp4LlmCall({ preference: 'cloud-only', prompt: 'Ahoj', policy: { allowCloud: true } })));
    const policyLine = lines.find((l) => l.startsWith('[PROVIDER-POLICY]'));
    assert.ok(policyLine, 'provider policy decision logged');
    assert.equal(JSON.parse(policyLine.replace('[PROVIDER-POLICY] ', '')).requestId, 'req-ctx-7');
  } finally {
    if (savedAllowCloud === undefined) delete process.env.SP4_ALLOW_CLOUD;
    else process.env.SP4_ALLOW_CLOUD = savedAllowCloud;
    globalThis.fetch = originalFetch;
    console.warn = quietWarn;
    console.error = quietError;
  }
});
