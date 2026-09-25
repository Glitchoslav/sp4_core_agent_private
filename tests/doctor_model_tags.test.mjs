import test from 'node:test';
import assert from 'node:assert/strict';
import { checkConfiguredModels } from '../tools/doctor.js';

const INSTALLED = ['gemma3:4b', 'llama3.2:3b', 'sp4-popici:latest'];

test('PRIMARY + FALLBACK installed -> OK', () => {
  const r = checkConfiguredModels(INSTALLED, { primary: 'gemma3:4b', fallback: 'llama3.2:3b' });
  assert.equal(r.status, 'OK');
  assert.deepEqual(r.missing, []);
});

test('missing PRIMARY_MODEL -> FAIL', () => {
  const r = checkConfiguredModels(INSTALLED, { primary: 'qwen3:8b', fallback: 'llama3.2:3b' });
  assert.equal(r.status, 'FAIL');
  assert.match(r.reason, /PRIMARY_MODEL qwen3:8b/);
});

test('missing FALLBACK_MODEL -> WARN', () => {
  const r = checkConfiguredModels(INSTALLED, { primary: 'gemma3:4b', fallback: 'gemma3:12b' });
  assert.equal(r.status, 'WARN');
  assert.match(r.reason, /FALLBACK_MODEL gemma3:12b/);
});

test('both missing -> FAIL and lists both', () => {
  const r = checkConfiguredModels(INSTALLED, { primary: 'qwen3:8b', fallback: 'qwen2.5:14b' });
  assert.equal(r.status, 'FAIL');
  assert.deepEqual(r.missing.map((m) => m.model), ['qwen3:8b', 'qwen2.5:14b']);
});

test('untagged name matches :latest', () => {
  const r = checkConfiguredModels(INSTALLED, { primary: 'sp4-popici', fallback: undefined });
  assert.equal(r.status, 'OK');
});

test('unset FALLBACK_MODEL is not checked', () => {
  const r = checkConfiguredModels(INSTALLED, { primary: 'gemma3:4b' });
  assert.equal(r.status, 'OK');
});
