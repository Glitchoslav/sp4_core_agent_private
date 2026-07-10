import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUNTIME_ROOT = path.resolve(__dirname, '..');

async function run() {
    const integrationPath = path.join(RUNTIME_ROOT, 'integration.js');
    const integrationText = await fs.readFile(integrationPath, 'utf8');

    assert.doesNotMatch(
        integrationText,
        /normalizeWeirdWords\s*\(/,
        'global integration tail must not call normalizeWeirdWords()'
    );

    assert.doesNotMatch(
        integrationText,
        /import\s*\{[^}]*normalizeWeirdWords[^}]*\}\s*from\s*['"]\.\/src\/core\/languageUtils\.js['"]/,
        'integration.js must not import normalizeWeirdWords from languageUtils.js'
    );

    console.log('PASS: integration tail no longer depends on normalizeWeirdWords');
}

run().catch((error) => {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
});