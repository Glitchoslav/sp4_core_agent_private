import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runImmuneCheck } from '../src/immune/outputImmuneCheck.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.resolve(ROOT, 'TESTY/evolution/test_006/questions.json');
const LOG_DIR = path.resolve(ROOT, 'TESTY/logs');

function buildStamp(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function safeTrim(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function flattenCases(config) {
    return [
        ...(config.core_inherited_set || []),
        ...(config.expanded_set || []),
        ...(config.edge_stress_set || []),
    ];
}

function buildAssertions(caseDef, verdict) {
    const detection = verdict?._detection || {};
    const expected = caseDef.expected || {};
    const checks = [];

    if (Object.prototype.hasOwnProperty.call(expected, 'keyword_count')) {
        checks.push({
            name: 'keyword_count',
            pass: detection.keyword_count === expected.keyword_count,
            expected: expected.keyword_count,
            actual: detection.keyword_count,
        });
    }

    if (Object.prototype.hasOwnProperty.call(expected, 'bypass_llm')) {
        checks.push({
            name: 'bypass_llm',
            pass: detection.bypass_llm === expected.bypass_llm,
            expected: expected.bypass_llm,
            actual: detection.bypass_llm,
        });
    }

    if (Object.prototype.hasOwnProperty.call(expected, 'llm_used')) {
        checks.push({
            name: 'llm_used',
            pass: detection.llm_used === expected.llm_used,
            expected: expected.llm_used,
            actual: detection.llm_used,
        });
    }

    if (Object.prototype.hasOwnProperty.call(expected, 'identity_ok')) {
        checks.push({
            name: 'identity_ok',
            pass: verdict.identity_ok === expected.identity_ok,
            expected: expected.identity_ok,
            actual: verdict.identity_ok,
        });
    }

    return checks;
}

function buildNote(checks, verdict) {
    const failed = checks.filter((check) => !check.pass);
    if (failed.length === 0) {
        return `bypass=${verdict?._detection?.bypass_llm}; llm=${verdict?._detection?.llm_used}; identity=${verdict?.identity_ok}`;
    }
    return failed.map((check) => `${check.name}:${check.actual}!=${check.expected}`).join('; ');
}

function buildMarkdown(payload) {
    const lines = [
        `# ${payload.test_id} patch-targeted immune check`,
        '',
        `- run_at: ${payload.run_at}`,
        `- passed: ${payload.overall.passed}`,
        `- failed: ${payload.overall.failed}`,
        '',
        '| case_id | status | bucket | note |',
        '| --- | --- | --- | --- |',
    ];

    for (const result of payload.results) {
        lines.push(`| ${result.id} | ${result.status} | ${result.bucket} | ${safeTrim(result.note)} |`);
    }

    return `${lines.join('\n')}\n`;
}

const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
const cases = flattenCases(config);
const results = [];

for (const caseDef of cases) {
    let verdict = null;
    let runtimeError = null;

    try {
        verdict = await runImmuneCheck({
            userInput: caseDef.user_input,
            responseText: caseDef.response_text,
            persona: 'core',
            prevUserInput: caseDef.prev_user_input,
        });
    } catch (error) {
        runtimeError = {
            message: error?.message || String(error),
            stack: error?.stack || null,
        };
    }

    const checks = verdict ? buildAssertions(caseDef, verdict) : [];
    const pass = runtimeError == null && checks.every((check) => check.pass);

    results.push({
        id: caseDef.id,
        bucket: caseDef.bucket,
        kind: caseDef.kind,
        prev_user_input: caseDef.prev_user_input,
        user_input: caseDef.user_input,
        response_text: caseDef.response_text,
        expected: caseDef.expected,
        verdict,
        runtimeError,
        checks,
        pass,
        status: pass ? 'PASS' : 'FAIL',
        note: runtimeError ? runtimeError.message : buildNote(checks, verdict),
    });
}

const runAt = new Date().toISOString();
const stamp = buildStamp(new Date(runAt));
const payload = {
    test_id: config.test_id,
    parent_test_id: config.parent_test_id,
    run_at: runAt,
    overall: {
        passed: results.filter((result) => result.status === 'PASS').length,
        failed: results.filter((result) => result.status === 'FAIL').length,
    },
    results,
};

await fs.mkdir(LOG_DIR, { recursive: true });
const latestJsonPath = path.join(LOG_DIR, `${config.test_id}.results.latest.json`);
const snapshotJsonPath = path.join(LOG_DIR, `${config.test_id}.results.${stamp}.json`);
const latestMdPath = path.join(LOG_DIR, `${config.test_id}.summary.latest.md`);
const snapshotMdPath = path.join(LOG_DIR, `${config.test_id}.summary.${stamp}.md`);

await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
await fs.writeFile(snapshotJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const markdown = buildMarkdown(payload);
await fs.writeFile(latestMdPath, markdown, 'utf8');
await fs.writeFile(snapshotMdPath, markdown, 'utf8');

console.log(`PATCH TEST: ${payload.overall.passed} passed / ${payload.overall.failed} failed`);
for (const result of results) {
    console.log(`${result.status} ${result.id} ${result.kind} :: ${result.note}`);
}
console.log(`ARTIFACTS: ${latestJsonPath}`);
console.log(`SNAPSHOT: ${snapshotJsonPath}`);