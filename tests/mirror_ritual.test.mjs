// Bod 1 (P1_P2_FIX_PROPOSAL): /mirror nemá psychologizovať a má rešpektovať počet dní.
// CLI /mirror → rituals.js handleRitual → ritualMirror (LLM prompt). Izolované cez SP4_RUNTIME_ROOT.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp4-mirror-'));
process.env.SP4_RUNTIME_ROOT = tmp;
process.env.OLLAMA_HOSTS = 'http://localhost:11434';
process.env.OLLAMA_MAX_RETRIES = '0';
process.env.SP4_MODEL_TAGS_REFRESH_MS = '0';

const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
fs.mkdirSync(path.join(tmp, 'data'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'data', 'memory.json'), JSON.stringify({
  rawMemory: {
    log: [
      { timestamp: daysAgo(5), input: 'ako nastavím tlačiareň v kancelárii', reply: 'ok' },
      { timestamp: daysAgo(2), input: 'pomôž mi so zálohovaním skriptu', reply: 'ok' },
    ],
    stats: {},
  },
}));

const chats = [];
globalThis.fetch = async (url, options = {}) => {
  if (String(url).includes('/api/chat')) {
    const body = JSON.parse(options.body);
    chats.push(body.messages.map((m) => m.content).join('\n---\n'));
    return { ok: true, status: 200, json: async () => ({ message: { content: 'Opakuje sa téma zálohovania.' } }) };
  }
  throw new TypeError('fetch failed');
};

const quiet = [console.log, console.warn, console.error];
console.log = console.warn = console.error = () => {};
const { handleRitual } = await import('../rituals.js');

test.after(() => {
  [console.log, console.warn, console.error] = quiet;
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('/mirror 3 analyzes only the last 3 days', async () => {
  chats.length = 0;
  await handleRitual('/mirror', '3');
  assert.equal(chats.length, 1, 'one LLM call');
  assert.match(chats[0], /zálohovaním skriptu/);
  assert.doesNotMatch(chats[0], /tlačiareň/, '5-day-old entry must be outside a 3-day mirror');
});

test('/mirror without a number defaults to 7 days', async () => {
  chats.length = 0;
  await handleRitual('/mirror', '');
  assert.match(chats[0], /tlačiareň/);
});

test('mirror prompt observes patterns, it does not diagnose the user', async () => {
  chats.length = 0;
  await handleRitual('/mirror', '7');
  assert.doesNotMatch(chats[0], /trápi|bolestn|pravdu o sebe|vyhoren|burnout/i, chats[0]);
});

test('dead mirror modules are removed (owner decision)', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'src/commands/mirrorCommand.js')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'src/services/conversationMirror.js')), false);
});
