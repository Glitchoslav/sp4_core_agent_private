import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SP4IntegratedAgent } from '../integration.js';
import { checkOllamaHealth } from '../src/startup/ollamaManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const QUESTIONS_PATH = path.resolve(ROOT, 'TESTY/evolution/test_012/questions.json');
const LOGS_DIR = path.resolve(ROOT, 'TESTY/logs');
const TEST_DIR = path.resolve(ROOT, 'TESTY/evolution/test_012');

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
        provider: metadata?.provider || metadata?.execution?.provider || null,
        model: result?.model || metadata?.model || metadata?.execution?.model || null,
        intent: metadata?.intent || null,
        responseControlApplied: metadata?.responseControlApplied === true,
        responseControlReason: metadata?.responseControlReason || null,
        qualitySanityApplied: metadata?.qualitySanityApplied === true,
        immuneSkipped: metadata?.immuneSkipped === true,
        immuneSkipReason: metadata?.immuneSkipReason || null,
        fallbackSource: metadata?.fallbackSource || null,
        wasGrounded: metadata?.wasGrounded ?? null,
        wasDeterministic: metadata?.wasDeterministic ?? null,
        originalImmuneReason: metadata?.originalImmuneReason || null,
        accuracyFallback: metadata?.accuracyFallback === true,
        orchestrationMode: metadata?.orchestrationMode || null,
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

function evaluateSignals(caseDef, finalResponse) {
    const expectedSignals = caseDef.expected_signals || [];
    const bannedSignals = caseDef.banned_signals || [];

    const matchedExpected = expectedSignals.filter((signal) => containsSignal(finalResponse, signal));
    const matchedBanned = bannedSignals.filter((signal) => containsSignal(finalResponse, signal));
    const missingExpected = expectedSignals.filter((signal) => !matchedExpected.includes(signal));

    let status = 'PASS';
    if (matchedBanned.length > 0) {
        status = 'FAIL';
    } else if (missingExpected.length > 0) {
        status = matchedExpected.length > 0 ? 'PARTIAL' : 'FAIL';
    }

    return { status, matchedExpected, missingExpected, matchedBanned };
}

function isLocalLlm(meta) {
    return meta?.provider === 'local_ollama' && typeof meta?.model === 'string' && meta.model !== 'none';
}

function isCloudProvider(provider) {
    return typeof provider === 'string' && provider.startsWith('cloud_');
}

function summarizeRecord(record) {
    if (record.error) return `runtime_error=${record.error}`;
    const parts = [];
    if (record.contractFailures.length > 0) parts.push(`contract=${record.contractFailures.join(',')}`);
    if (record.signalCheck.missingExpected.length > 0) parts.push(`missing=${record.signalCheck.missingExpected.join(',')}`);
    if (record.signalCheck.matchedBanned.length > 0) parts.push(`banned=${record.signalCheck.matchedBanned.join(',')}`);
    if (parts.length === 0) parts.push(`expected=${record.signalCheck.matchedExpected.length}/${record.expectedSignals.length}`);
    return parts.join('; ');
}

function buildMarkdown(payload) {
    const lines = [
        `# ${payload.test_id} memory & privacy truth eval`,
        '',
        `- run_at: ${payload.run_at}`,
        `- total: ${payload.overall.total}`,
        `- pass: ${payload.overall.pass}`,
        `- partial: ${payload.overall.partial}`,
        `- fail: ${payload.overall.fail}`,
        `- skipped: ${payload.overall.skipped}`,
        `- local_llm_count: ${payload.overall.local_llm_count}/${payload.overall.required_local_llm_cases}`,
        `- offline_proof_passed: ${payload.overall.offline_proof_passed}`,
        `- guard_routed: ${payload.overall.guard_routed}/${payload.overall.total}`,
        `- fallback_fired: ${payload.overall.fallback_fired}`,
    ];

    if (payload.overall.skip_reason) {
        lines.push(`- skip_reason: ${payload.overall.skip_reason}`);
        return `${lines.join('\n')}\n`;
    }

    lines.push('');
    lines.push('| case_id | status | kind | handledBy | immuneSkipped | fallbackSource | note |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');

    for (const record of payload.results) {
        const m = record.final_meta || {};
        lines.push(
            `| ${record.id} | ${record.status} | ${record.kind} | ${m.handledBy || '-'} | ${m.immuneSkipped ? 'yes' : 'no'} | ${m.fallbackSource || '-'} | ${summarizeRecord(record)} |`
        );
    }

    return `${lines.join('\n')}\n`;
}

async function writeArtifacts(config, payload) {
    const stamp = buildStamp(new Date(payload.run_at));
    await fs.mkdir(LOGS_DIR, { recursive: true });
    await fs.mkdir(TEST_DIR, { recursive: true });

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

    return { latestJsonPath, snapshotJsonPath };
}

// ── MAIN ────────────────────────────────────────────────────────────────────

const config = JSON.parse(await fs.readFile(QUESTIONS_PATH, 'utf8'));
const cases = flattenCases(config);
const offlineRequirements = config.offline_requirements || {};

if (offlineRequirements.ollama_health_gate) {
    const ollamaOk = await checkOllamaHealth();
    if (!ollamaOk) {
        const skippedPayload = {
            test_id: config.test_id,
            parent_test_id: config.parent_test_id,
            run_at: new Date().toISOString(),
            overall: {
                total: cases.length,
                pass: 0, partial: 0, fail: 0, skipped: cases.length,
                local_llm_count: 0,
                required_local_llm_cases: offlineRequirements.min_local_llm_cases || 0,
                offline_proof_passed: false,
                guard_routed: 0, fallback_fired: 0,
                skip_reason: 'ollama_unavailable',
            },
            results: [],
        };
        const artifacts = await writeArtifacts(config, skippedPayload);
        console.log(`test_id: ${config.test_id}`);
        console.log('status: SKIP');
        console.log('reason: ollama_unavailable');
        console.log(`artifacts: ${artifacts.latestJsonPath}`);
        process.exit(0);
    }
}

const results = [];

for (const caseDef of cases) {
    const agent = await createAgent();
    const record = {
        id: caseDef.id,
        bucket: caseDef.bucket,
        kind: caseDef.kind,
        user_input: caseDef.user_input,
        prev_user_input: caseDef.prev_input || null,
        rationale: caseDef.rationale,
        expectedSignals: caseDef.expected_signals || [],
        bannedSignals: caseDef.banned_signals || [],
        require_llm: caseDef.require_llm === true,
        first_turn: null,
        final_turn: null,
        first_meta: null,
        final_meta: null,
        signalCheck: {
            status: 'FAIL',
            matchedExpected: [],
            missingExpected: caseDef.expected_signals || [],
            matchedBanned: [],
        },
        contractFailures: [],
        local_llm_used: false,
        status: 'FAIL',
        error: null,
    };

    try {
        if (caseDef.prev_input) {
            const firstResult = await agent.processMessage(
                caseDef.prev_input,
                config.runtime.mode,
                config.runtime.options || {}
            );
            record.first_turn = String(firstResult?.response || '').trim();
            record.first_meta = extractMeta(firstResult);
        }

        const finalResult = await agent.processMessage(
            caseDef.user_input,
            config.runtime.mode,
            config.runtime.options || {}
        );
        record.final_turn = String(finalResult?.response || '').trim();
        record.final_meta = extractMeta(finalResult);
        record.signalCheck = evaluateSignals(caseDef, record.final_turn);

        if (offlineRequirements.require_no_cloud && isCloudProvider(record.final_meta?.provider)) {
            record.contractFailures.push('cloud_provider');
        }

        record.local_llm_used = isLocalLlm(record.final_meta);
        if (caseDef.require_llm === true && !record.local_llm_used) {
            record.contractFailures.push('local_llm_not_proven');
        }

        record.status = record.signalCheck.status;
        if (record.contractFailures.length > 0) record.status = 'FAIL';

    } catch (error) {
        record.error = error?.message || String(error);
        record.status = 'FAIL';
    }

    results.push(record);
}

const localLlmCount = results.filter((r) => r.local_llm_used).length;
const requiredLocalLlmCases = offlineRequirements.min_local_llm_cases || 0;
const offlineProofPassed = localLlmCount >= requiredLocalLlmCases;
const guardRoutedCount = results.filter((r) => r.final_meta?.orchestrationMode === 'guard').length;
const fallbackFiredCount = results.filter((r) => r.final_meta?.accuracyFallback === true).length;

const payload = {
    test_id: config.test_id,
    parent_test_id: config.parent_test_id,
    run_at: new Date().toISOString(),
    overall: {
        total: results.length,
        pass: results.filter((r) => r.status === 'PASS').length,
        partial: results.filter((r) => r.status === 'PARTIAL').length,
        fail: results.filter((r) => r.status === 'FAIL').length,
        skipped: 0,
        local_llm_count: localLlmCount,
        required_local_llm_cases: requiredLocalLlmCases,
        offline_proof_passed: offlineProofPassed,
        guard_routed: guardRoutedCount,
        fallback_fired: fallbackFiredCount,
        skip_reason: null,
    },
    results,
};

const artifacts = await writeArtifacts(config, payload);

console.log(`test_id: ${config.test_id}`);
console.log(`total: ${payload.overall.total}`);
console.log(`pass: ${payload.overall.pass}`);
console.log(`partial: ${payload.overall.partial}`);
console.log(`fail: ${payload.overall.fail}`);
console.log(`local_llm_count: ${payload.overall.local_llm_count}/${payload.overall.required_local_llm_cases}`);
console.log(`offline_proof_passed: ${payload.overall.offline_proof_passed}`);
console.log(`guard_routed: ${payload.overall.guard_routed}/${payload.overall.total}`);
console.log(`fallback_fired: ${payload.overall.fallback_fired}`);
console.log('');

for (const record of payload.results) {
    const prefix = record.status === 'PASS' ? 'PASS' : record.status === 'PARTIAL' ? 'PARTIAL' : 'FAIL';
    const m = record.final_meta || {};
    console.log(
        `${prefix} ${record.id} ${record.kind} :: ` +
        `handledBy=${m.handledBy || '-'} immuneSkipped=${m.immuneSkipped ? 'yes' : 'no'} ` +
        summarizeRecord(record)
    );
}

console.log(`artifacts: ${artifacts.latestJsonPath}`);
