import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeAiCliches, stripResidualEnglish } from '../src/pipeline/postProcessUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUNTIME_ROOT = path.resolve(__dirname, '..');

async function run() {
    // Source-level freeze assertions on postProcessUtils.js
    const sourcePath = path.join(RUNTIME_ROOT, 'src', 'pipeline', 'postProcessUtils.js');
    const sourceText = await fs.readFile(sourcePath, 'utf8');

    const sanitizeBlock = sourceText.slice(
        sourceText.indexOf('function sanitizeAiCliches(text)'),
        sourceText.indexOf('function stripResidualEnglish(text)')
    );
    const stripResidualEnglishBlock = sourceText.slice(
        sourceText.indexOf('function stripResidualEnglish(text)'),
        sourceText.indexOf('function stripInternalPromptArtifacts(text)')
    );

    assert.match(sanitizeBlock, /bannedPatterns/, 'sanitizeAiCliches must keep explicit banned pattern filtering');
    assert.doesNotMatch(
        sanitizeBlock,
        /Ticho\. Skús sa spýtať inak, konkrétnejšie alebo úprimnejšie\./,
        'sanitizeAiCliches must not author its own fallback sentence'
    );
    assert.doesNotMatch(
        sanitizeBlock,
        /explore the world of|fascinating world|fascinating realm|sparks your curiosity/i,
        'sanitizeAiCliches must not keep broad generic style-removal patterns'
    );

    assert.match(stripResidualEnglishBlock, /sentences\.filter/, 'stripResidualEnglish must keep residual English sentence filtering');
    assert.doesNotMatch(
        stripResidualEnglishBlock,
        /Nerozumel som tomu po svojom\. Skús sa ma spýtať znova, jednoducho a po ľudsky\./,
        'stripResidualEnglish must not author its own fallback sentence'
    );
    assert.doesNotMatch(
        stripResidualEnglishBlock,
        /what do you think|well done|as a reward|it seems|in the context of/i,
        'stripResidualEnglish must not keep broad generic English phrase deletion'
    );

    assert.equal(typeof sanitizeAiCliches, 'function', 'sanitizeAiCliches must be importable from postProcessUtils');
    assert.equal(typeof stripResidualEnglish, 'function', 'stripResidualEnglish must be importable from postProcessUtils');

    assert.equal(
        sanitizeAiCliches('As an AI language model, I can help with that.'),
        '',
        'sanitizeAiCliches must still remove explicit AI self-reference sentences'
    );

    assert.equal(
        sanitizeAiCliches('Explore the world of caching through TTL.'),
        'Explore the world of caching through TTL.',
        'sanitizeAiCliches must preserve generic contentful sentences that are not explicit AI/meta clichés'
    );

    assert.equal(
        stripResidualEnglish('As an outside observer, I cannot provide a response.'),
        '',
        'stripResidualEnglish must still remove explicit assistant/meta English sentences'
    );

    assert.equal(
        stripResidualEnglish('Well done, ideme dalej.'),
        'Well done, ideme dalej.',
        'stripResidualEnglish must preserve generic sentences that only sound formal or partly English'
    );

    // Source-level freeze assertions on integration.js pipeline contracts
    const integrationText = await fs.readFile(path.join(RUNTIME_ROOT, 'integration.js'), 'utf8');

    assert.match(
        integrationText,
        /enforcementResult\.text = enforcedText;/,
        'language enforcer tail must sync the final enforced text back into enforcementResult'
    );

    assert.match(
        integrationText,
        /const baseOutput = stripInternalPromptArtifacts\(sanitizedOutput/,
        'baseOutput must pass sanitizedOutput through stripInternalPromptArtifacts at final output boundary'
    );

    console.log('PASS: tail helpers stay explicit and meta-only');
}

run().catch((error) => {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
});