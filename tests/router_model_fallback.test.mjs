// sp4LlmCall bez explicitneho model pre budget/quality tier poslal Ollame model:undefined
// a spadol na TypeError v callOllama. Chybajuci model -> PRIMARY_MODEL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp4-router-model-'));
process.env.SP4_RUNTIME_ROOT = tmp;
process.env.OLLAMA_HOSTS = 'http://localhost:11434';
process.env.OLLAMA_MAX_RETRIES = '0';
process.env.SP4_MODEL_TAGS_REFRESH_MS = '0';
delete process.env.SP4_ALLOW_CLOUD;
delete process.env.SP4_TEST;

const chatModels = [];
globalThis.fetch = async (url, options = {}) => {
  if (String(url).includes('/api/chat')) {
    chatModels.push(JSON.parse(options.body).model);
    return { ok: true, status: 200, json: async () => ({ message: { content: 'ok' } }) };
  }
  throw new TypeError('fetch failed');
};
console.log = () => {};

const { sp4LlmCall } = await import('../src/llm/llmRouter.js');
const { PRIMARY_MODEL } = await import('../src/config/models.js');

const DEEP = 'Prečo je obloha modrá a porovnaj to s východom slnka? A čo ak analyzuj hlbšie?';

test('local-first budget/quality tier without model -> PRIMARY_MODEL', async () => {
  chatModels.length = 0;
  const r = await sp4LlmCall({ prompt: DEEP });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(chatModels, [PRIMARY_MODEL]);
});

test('local-only without model -> PRIMARY_MODEL', async () => {
  chatModels.length = 0;
  const r = await sp4LlmCall({ preference: 'local-only', prompt: 'Ahoj' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(chatModels, [PRIMARY_MODEL]);
});

test('explicit model is still respected', async () => {
  chatModels.length = 0;
  await sp4LlmCall({ preference: 'local-only', prompt: 'Ahoj', model: 'llama3.2:3b' });
  assert.deepEqual(chatModels, ['llama3.2:3b']);
});
