import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const launcherPath = path.join(WORKSPACE_ROOT, 'sp4_core_agent', 'sp4.js');

console.log('🧪 TEST: launcher cwd contract');

const result = spawnSync(process.execPath, [launcherPath, 'test'], {
    cwd: WORKSPACE_ROOT,
    encoding: 'utf8',
});

const output = `${result.stdout || ''}\n${result.stderr || ''}`;

assert.equal(result.status, 0, `launcher from workspace root must pass smoke test. Output:\n${output}`);
assert.match(output, /SP4 TEST/i);
assert.match(output, /SP4 SMOKE TEST: OK/i);

console.log('✅ Launcher cwd contract works');