// Bod 2 E2E: "kurva, oprav mi …" cez integration.processMessage sa dostane k LLM
// (mock Ollama), nevráti pevnú vetu popici_edge. Izolované cez SP4_RUNTIME_ROOT.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp4-popici-e2e-'));
process.env.SP4_RUNTIME_ROOT = tmp;
process.env.OLLAMA_HOSTS = 'http://localhost:11434';
process.env.OLLAMA_MAX_RETRIES = '0';
process.env.SP4_MODEL_TAGS_REFRESH_MS = '0';
delete process.env.SP4_ALLOW_CLOUD;

const CANNED = /bordel pomenovaný/;
const LLM_TEXT = 'Jasné, pozriem sa na ten skript a opravíme zálohu krok po kroku.';
const chatPrompts = [];
globalThis.fetch = async (url, options = {}) => {
  const u = String(url);
  if (u.includes('/api/chat')) {
    const body = JSON.parse(options.body);
    chatPrompts.push(body.messages?.map((m) => m.content).join('\n') || '');
    return { ok: true, status: 200, json: async () => ({ message: { content: LLM_TEXT } }) };
  }
  if (u.includes('/api/tags')) return { ok: true, status: 200, json: async () => ({ models: [{ name: 'gemma3:4b' }] }) };
  throw new TypeError('fetch failed');
};

const quiet = [console.log, console.warn, console.error, console.info];
console.log = console.warn = console.error = console.info = () => {};

const { SP4IntegratedAgent } = await import('../integration.js');
const agent = new SP4IntegratedAgent();
await agent.initialize();

test.after(() => {
  [console.log, console.warn, console.error, console.info] = quiet;
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('profanity + request reaches the LLM with the original text', async () => {
  chatPrompts.length = 0;
  const msg = 'kurva, oprav mi tento skript na zálohu';
  const result = await agent.processMessage(msg, 'auto');
  const response = String(result?.response || '');
  assert.doesNotMatch(response, CANNED, `canned shortcut returned: ${response}`);
  assert.ok(chatPrompts.some((p) => p.includes('oprav mi tento skript')), 'original text reached the LLM');
});

test('pure rant still gets the deterministic shortcut (no LLM)', async () => {
  chatPrompts.length = 0;
  const result = await agent.processMessage('kurva, zas bordel', 'auto');
  assert.match(String(result?.response || ''), CANNED);
  assert.equal(chatPrompts.length, 0);
});
