import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SP4IntegratedAgent } from '../integration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const QUESTIONS_PATH = path.resolve(ROOT, 'TESTY/evolution/test_008/questions.json');
const LOGS_DIR = path.resolve(ROOT, 'TESTY/logs');
const TEST_DIR = path.resolve(ROOT, 'TESTY/evolution/test_008');

function buildStamp(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function flattenCases(config) {
    return [
        ...(config.core_inherited_set || []),
        ...(config.expanded_set || []),
        ...(config.edge_stress_set || []),
    ];
}

function normalize(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function containsSignal(output, signal) {
    return normalize(output).includes(normalize(signal));
}

function extractMeta(result = {}) {
    const metadata = result?.metadata || result?.meta || {};
    return {
        persona: result?.persona || metadata?.persona || null,
        handledBy: result?.handledBy || metadata?.handledBy || null,
        query_type: result?.query_type || metadata?.query_type || metadata?.intent || null,
        model: result?.model || metadata?.model || metadata?.execution?.model || null,
        provider: metadata?.provider || metadata?.execution?.provider || null,
        route: metadata?.policy?.route || metadata?.route || null,
        responseControlApplied: metadata?.responseControlApplied === true,
        responseControlReason: metadata?.responseControlReason || null,
        qualitySanityApplied: metadata?.qualitySanityApplied === true,
        qualitySanityReason: metadata?.qualitySanityReason || null,
        identityHardeningApplied: metadata?.identityHardeningApplied === true,
        preLLMBlocked: metadata?.preLLMBlocked === true,
        preLLMBlockReason: metadata?.preLLMBlockReason || null,
        retryApplied: metadata?.retryApplied === true,
        retryImproved: metadata?.retryImproved === true,
        immuneVerdict: metadata?.immuneVerdict || null,
    };
}

async function createAgent() {
    const agent = new SP4IntegratedAgent();
    const init = await agent.initialize();
    if (!init?.success) {
        throw new Error(`Agent initialization failed: ${init?.error || 'unknown error'}`);
    }
    return agent;
}

function evaluateCase(caseDef, finalResponse) {
    const expectedSignals = caseDef.expected_signals || [];
    const bannedSignals = caseDef.banned_signals || [];

    const matchedExpected = expectedSignals.filter((signal) => containsSignal(finalResponse, signal));
    const matchedBanned = bannedSignals.filter((signal) => containsSignal(finalResponse, signal));

    const pass = matchedExpected.length === expectedSignals.length && matchedBanned.length === 0;
    let status = 'PASS';

    if (!pass) {
        status = matchedExpected.length > 0 && matchedBanned.length === 0 ? 'PARTIAL' : 'FAIL';
    }

    return {
        status,
        matchedExpected,
        missingExpected: expectedSignals.filter((signal) => !matchedExpected.includes(signal)),
        matchedBanned,
    };
}

function summarizeRecord(record) {
    if (record.error) {
        return `runtime_error=${record.error}`;
    }

    if (record.evaluation.status === 'PASS') {
        return `expected=${record.evaluation.matchedExpected.length}/${record.expectedSignals.length}; banned=0`;
    }

    const missing = record.evaluation.missingExpected.join(', ') || 'none';
    const banned = record.evaluation.matchedBanned.join(', ') || 'none';
    return `missing=${missing}; banned=${banned}`;
}

function buildMarkdown(payload) {
    const lines = [
        `# ${payload.test_id} live eval`,
        '',
        `- run_at: ${payload.run_at}`,
        `- total: ${payload.overall.total}`,
        `- pass: ${payload.overall.pass}`,
        `- partial: ${payload.overall.partial}`,
        `- fail: ${payload.overall.fail}`,
        `- runtime_errors: ${payload.overall.runtime_errors}`,
        '',
        '| case_id | status | kind | handledBy | query_type | note |',
        '| --- | --- | --- | --- | --- | --- |',
    ];

    for (const record of payload.results) {
        const handledBy = record.final_meta?.handledBy || '-';
        const queryType = record.final_meta?.query_type || '-';
        lines.push(`| ${record.id} | ${record.status} | ${record.kind} | ${handledBy} | ${queryType} | ${summarizeRecord(record)} |`);
    }

    return `${lines.join('\n')}\n`;
}

const config = JSON.parse(await fs.readFile(QUESTIONS_PATH, 'utf8'));
const cases = flattenCases(config);
const results = [];

for (const caseDef of cases) {
    const agent = await createAgent();
    const record = {
        id: caseDef.id,
        bucket: caseDef.bucket,
        kind: caseDef.kind,
        user_input: caseDef.user_input,
        prev_user_input: caseDef.prev_user_input || null,
        rationale: caseDef.rationale,
        expectedSignals: caseDef.expected_signals || [],
        bannedSignals: caseDef.banned_signals || [],
        first_turn: null,
        final_turn: null,
        final_response: null,
        first_meta: null,
        final_meta: null,
        evaluation: null,
        status: 'FAIL',
        error: null,
    };

    try {
        if (caseDef.prev_user_input) {
            const firstResult = await agent.processMessage(caseDef.prev_user_input, 'auto');
            record.first_turn = String(firstResult?.response || '').trim();
            record.first_meta = extractMeta(firstResult);
        }

        const finalResult = await agent.processMessage(caseDef.user_input, 'auto');
        record.final_turn = String(finalResult?.response || '').trim();
        record.final_response = record.final_turn;
        record.final_meta = extractMeta(finalResult);
        record.evaluation = evaluateCase(caseDef, record.final_turn);
        record.status = record.evaluation.status;
    } catch (error) {
        record.error = error?.message || String(error);
        record.status = 'FAIL';
    }

    results.push(record);
}

const payload = {
    test_id: config.test_id,
    parent_test_id: config.parent_test_id,
    run_at: new Date().toISOString(),
    overall: {
        total: results.length,
        pass: results.filter((record) => record.status === 'PASS').length,
        partial: results.filter((record) => record.status === 'PARTIAL').length,
        fail: results.filter((record) => record.status === 'FAIL').length,
        runtime_errors: results.filter((record) => record.error).length,
    },
    results,
};

const stamp = buildStamp(new Date(payload.run_at));
await fs.mkdir(LOGS_DIR, { recursive: true });
const latestJsonPath = path.join(LOGS_DIR, `${config.test_id}.results.latest.json`);
const snapshotJsonPath = path.join(LOGS_DIR, `${config.test_id}.results.${stamp}.json`);
const latestMdPath = path.join(LOGS_DIR, `${config.test_id}.summary.latest.md`);
const snapshotMdPath = path.join(LOGS_DIR, `${config.test_id}.summary.${stamp}.md`);
const evalMdPath = path.join(TEST_DIR, 'eval.md');

const markdown = buildMarkdown(payload);
await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
await fs.writeFile(snapshotJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
await fs.writeFile(latestMdPath, markdown, 'utf8');
await fs.writeFile(snapshotMdPath, markdown, 'utf8');
await fs.writeFile(evalMdPath, markdown, 'utf8');

console.log(`test_id: ${config.test_id}`);
console.log(`total: ${payload.overall.total}`);
console.log(`pass: ${payload.overall.pass}`);
console.log(`partial: ${payload.overall.partial}`);
console.log(`fail: ${payload.overall.fail}`);
console.log(`runtime_errors: ${payload.overall.runtime_errors}`);

for (const record of results) {
    console.log(`${record.status} ${record.id} ${record.kind} :: ${summarizeRecord(record)}`);
}

console.log(`artifacts: ${latestJsonPath}`);

if (payload.overall.fail > 0) {
    process.exit(1);
}