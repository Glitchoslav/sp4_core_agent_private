import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { selectProvider, TIER_PROVIDER, PROVIDER, SENSITIVITY } from '../src/llm/providerPolicy.js';

const CONSENT = { allowCloud: true };
let savedEnv;
let logs;
let originalLog;

beforeEach(() => {
  savedEnv = process.env.SP4_ALLOW_CLOUD;
  process.env.SP4_ALLOW_CLOUD = 'true';
  logs = [];
  originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
});

afterEach(() => {
  console.log = originalLog;
  if (savedEnv === undefined) delete process.env.SP4_ALLOW_CLOUD;
  else process.env.SP4_ALLOW_CLOUD = savedEnv;
});

test('table defaults every tier to local', () => {
  assert.deepEqual(Object.values(TIER_PROVIDER), [PROVIDER.LOCAL, PROVIDER.LOCAL, PROVIDER.LOCAL]);
  for (const tier of ['local', 'budget', 'quality']) {
    assert.equal(selectProvider({ tier, sensitivity: 'public', policy: CONSENT }).provider, 'local');
  }
});

test('unknown tier -> local', () => {
  assert.equal(selectProvider({ tier: 'mystery', requested: 'cloud', sensitivity: 'public', policy: CONSENT }).provider, 'local');
});

test('cloud request with all gates open -> cloud', () => {
  const d = selectProvider({ tier: 'budget', requested: 'cloud', sensitivity: 'public', policy: CONSENT });
  assert.equal(d.provider, 'cloud');
  assert.equal(d.reason, 'cloud_allowed');
});

test('SP4_ALLOW_CLOUD not true -> local', () => {
  for (const value of [undefined, 'false', '1', 'TRUE']) {
    if (value === undefined) delete process.env.SP4_ALLOW_CLOUD;
    else process.env.SP4_ALLOW_CLOUD = value;
    const d = selectProvider({ tier: 'budget', requested: 'cloud', sensitivity: 'public', policy: CONSENT });
    assert.equal(d.provider, 'local', `SP4_ALLOW_CLOUD=${value}`);
    assert.equal(d.reason, 'cloud_capability_disabled');
  }
});

test('private is never cloud, even with every other gate open', () => {
  const d = selectProvider({ tier: 'quality', requested: 'cloud', sensitivity: SENSITIVITY.PRIVATE, policy: CONSENT });
  assert.equal(d.provider, 'local');
  assert.equal(d.reason, 'private_never_cloud');
});

test('missing or unknown sensitivity fails closed', () => {
  for (const sensitivity of [undefined, null, '', 'internal', 'PUBLIC']) {
    const d = selectProvider({ tier: 'budget', requested: 'cloud', sensitivity, policy: CONSENT });
    assert.equal(d.provider, 'local', `sensitivity=${sensitivity}`);
    assert.equal(d.reason, 'sensitivity_unknown_fail_closed');
  }
});

test('missing request consent -> local', () => {
  for (const policy of [undefined, null, {}, { allowCloud: 'true' }, { allowCloud: false }]) {
    const d = selectProvider({ tier: 'budget', requested: 'cloud', sensitivity: 'public', policy });
    assert.equal(d.provider, 'local');
    assert.equal(d.reason, 'cloud_consent_required');
  }
});

test('forceLocal policy -> local', () => {
  const d = selectProvider({ tier: 'budget', requested: 'cloud', sensitivity: 'public', policy: { allowCloud: true, forceLocal: true } });
  assert.equal(d.provider, 'local');
  assert.equal(d.reason, 'force_local');
});

test('logs {requestId, tier, provider, reason, model} without payload', () => {
  selectProvider({
    tier: 'budget', requested: 'cloud', sensitivity: 'private', policy: CONSENT,
    requestId: 'req-42', model: 'budget', prompt: 'TAJNE-HESLO', system: 'PAMAT-XYZ',
  });
  const line = logs.find((l) => l.startsWith('[PROVIDER-POLICY]'));
  assert.ok(line, 'decision logged');
  const entry = JSON.parse(line.slice('[PROVIDER-POLICY] '.length));
  assert.deepEqual(Object.keys(entry).sort(), ['model', 'provider', 'reason', 'requestId', 'tier']);
  assert.equal(entry.requestId, 'req-42');
  assert.equal(entry.provider, 'local');
  assert.ok(!line.includes('TAJNE-HESLO') && !line.includes('PAMAT-XYZ'));
});
