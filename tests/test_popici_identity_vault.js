import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSystemPrompt } from '../multiVoice.js';
import { getGlitchoslavTruth, getPopiciTruth } from '../src/core/identityVault.js';

const CHARACTERISTIC_TEXT = 'Še neopuščaj';
const OLD_PLACEHOLDER = 'Humor a krcmove prirovnania maju sluzit pravde.';

const popiciTruth = getPopiciTruth();
assert.match(popiciTruth, new RegExp(CHARACTERISTIC_TEXT));

const popiciPrompt = buildSystemPrompt('popici', {});
assert.match(popiciPrompt, new RegExp(CHARACTERISTIC_TEXT));
assert.ok(!popiciPrompt.includes(OLD_PLACEHOLDER));

const glitchTruth = getGlitchoslavTruth();
const glitchPrompt = buildSystemPrompt('glitch', {});
const corePrompt = buildSystemPrompt('core', {});
assert.match(glitchTruth, new RegExp(CHARACTERISTIC_TEXT));
assert.match(glitchPrompt, new RegExp(CHARACTERISTIC_TEXT));
assert.ok(!corePrompt.includes(CHARACTERISTIC_TEXT));
assert.ok(!corePrompt.includes(OLD_PLACEHOLDER));

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const missingRoot = path.join(os.tmpdir(), `sp4-missing-popici-${process.pid}-${Date.now()}`);
const child = spawnSync(process.execPath, [
  '--input-type=module',
  '--eval',
  "import { getPopiciTruth } from './src/core/identityVault.js'; process.stdout.write(JSON.stringify(getPopiciTruth()));",
], {
  cwd: projectRoot,
  env: {
    ...process.env,
    SP4_IDENTITY_ROOT_OVERRIDE: path.join(missingRoot, 'canonical'),
    SP4_IDENTITY_LEGACY_DIR_OVERRIDE: path.join(missingRoot, 'legacy'),
  },
  encoding: 'utf8',
});

assert.equal(child.status, 0, child.stderr);
assert.equal(JSON.parse(child.stdout), '');

console.log('PASS: Popici identity vault uses its real slot and fails safe');
