import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUNTIME_ROOT = path.resolve(__dirname, '..');

async function run() {
    const sourcePath = path.join(RUNTIME_ROOT, 'src', 'pipeline', 'postProcessUtils.js');
    const fullSource = await fs.readFile(sourcePath, 'utf8');

    const startIdx = fullSource.indexOf('function cleanupWeirdSlovak');
    const endIdx = fullSource.indexOf('export function auditCleanupStep');
    assert.ok(startIdx >= 0, 'cleanupWeirdSlovak must exist in postProcessUtils.js');
    assert.ok(endIdx > startIdx, 'cleanupWeirdSlovak block must be bounded in postProcessUtils.js');
    const cleanupBlock = fullSource.slice(startIdx, endIdx);

    assert.match(cleanupBlock, /replace\(/, 'cleanupWeirdSlovak must still perform basic cleanup work');
    assert.ok(cleanupBlock.includes(String.raw`\s+([,.!?;:])`), 'cleanupWeirdSlovak must keep punctuation spacing cleanup');
    assert.ok(cleanupBlock.includes(String.raw`\s{2,}`), 'cleanupWeirdSlovak must keep multi-space collapse');

    assert.doesNotMatch(cleanupBlock, /governanciu|offline-first|offline režime AI|creativity|spoločenské projektovanie|\bthingy\b|\btrue\b/i,
        'cleanupWeirdSlovak must not contain semantic word rewrites');

    console.log('PASS: cleanupWeirdSlovak stays form-only');
}

run().catch((error) => {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
});