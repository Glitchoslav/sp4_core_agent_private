import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { SP4IntegratedAgent } from '../integration.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.resolve(ROOT, 'TESTY/evolution/test_005/questions.json');
const LOG_DIR = path.resolve(ROOT, 'TESTY/logs');
const PROBE_PATH = path.resolve(ROOT, 'tests/phase5_followup_handoff_probe.mjs');

function buildStamp(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

const RUN_STAMP = buildStamp();
const RUN_LABEL = `isolated-${RUN_STAMP}`;

function safeTrim(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function snapshotTurns(agent) {
    if (!agent?._dlgState?.snapshot) return { turnsLength: null, roleOrder: [] };
    const snapshot = agent._dlgState.snapshot();
    return {
        turnsLength: Array.isArray(snapshot.turns) ? snapshot.turns.length : null,
        roleOrder: Array.isArray(snapshot.turns) ? snapshot.turns.map((turn) => turn.role) : [],
    };
}

function summarizeDialogueState(snapshotInfo) {
    if (!snapshotInfo || snapshotInfo.turnsLength == null) return 'unavailable';
    return `${snapshotInfo.turnsLength} turns [${snapshotInfo.roleOrder.join(' > ')}]`;
}

async function initAgent() {
    const agent = new SP4IntegratedAgent();
    const init = await agent.initialize();
    if (!init?.success) {
        throw new Error(`Agent initialization failed: ${init?.error || 'unknown error'}`);
    }
    return agent;
}

function exactAssistantText(agent) {
    return agent._dlgState?.getLastAssistantTurn?.()?.text || null;
}

function uniqueTestId(baseId) {
    return `${baseId}__${RUN_LABEL}`;
}

async function runTest1() {
    const agent = new SP4IntegratedAgent();
    let thrown = null;
    try {
        await agent.processMessage('test');
    } catch (error) {
        thrown = error;
    }
    const turnsLength = agent._dlgState?.turns?.length ?? agent._dlgState?.snapshot?.()?.turns?.length ?? 0;
    return {
        id: uniqueTestId('test_1_guard_preinit'),
        shortId: 'test_1_guard_preinit',
        title: 'Guard proti ghost user turn (pre-init)',
        pass: turnsLength === 0 && String(thrown?.message || '').includes('Agent nie je inicializovany'),
        details: { thrownMessage: thrown?.message || null, turnsLength }
    };
}

async function runTest2() {
    const agent = await initAgent();
    const result = await agent.ask('čo je cache', { mode: 'core', forceLocal: true, testMode: true });
    const meta = result.meta || {};
    const provider = meta.execution?.provider || meta.provider || null;
    const route = meta.policy?.route || meta.route || null;
    const cloudUsed = meta.execution?.cloudUsed;
    const pass = (cloudUsed === false) && (['local_ollama', 'deterministic_short_tech'].includes(provider) || route === 'force-local' || route === 'local');
    return {
        id: uniqueTestId('test_2_ask_options'),
        shortId: 'test_2_ask_options',
        title: 'ask() prenáša options',
        pass,
        details: { provider, route, cloudUsed, handledBy: result.handledBy || null, response: safeTrim(result.response) }
    };
}

async function runTest3() {
    const agent = await initAgent();
    agent._processMessageCore = async () => ({ success: false, response: 'Systém je v bezpečnostnom režime.', error: 'test_error' });
    const result = await agent.processMessage('testovacia otázka');
    const lastAssistantText = exactAssistantText(agent);
    return {
        id: uniqueTestId('test_3_error_writeback'),
        shortId: 'test_3_error_writeback',
        title: '_dlgState writeback pri error response',
        pass: lastAssistantText === 'Systém je v bezpečnostnom režime.' && result?.response === lastAssistantText,
        details: { result, lastAssistantText, dialogueState: summarizeDialogueState(snapshotTurns(agent)) }
    };
}

async function runTest4() {
    const agent = await initAgent();
    agent._processMessageCore = async () => ({ success: false, response: 'Systém je v bezpečnostnom režime.', error: 'test_error' });
    const askResult = await agent.ask('testovacia otázka', { mode: 'core' });
    const dlgText = exactAssistantText(agent);
    return {
        id: uniqueTestId('test_4_ask_error_alignment'),
        shortId: 'test_4_ask_error_alignment',
        title: 'ask() error branch vracia rovnaký text ako _dlgState',
        pass: askResult.response === dlgText,
        details: { askResponse: askResult.response, dlgText, handledBy: askResult.handledBy || null, dialogueState: summarizeDialogueState(snapshotTurns(agent)) }
    };
}

function mapProbeRecord(record) {
    const metadata = record?.second_turn_raw?.metadata || {};
    const state = record?.dlgStateBeforeSecondTurn || null;
    return {
        pair: record?.pair_label || null,
        path: record?.path || null,
        dialogueState: state ? `${state.turnsLength} turns [${(state.roleOrder || []).join(' > ')}]` : 'unavailable',
        turnsLength: state?.turnsLength ?? null,
        handledBy: record?.second_turn_summary?.handledBy || metadata?.handledBy || null,
        response: safeTrim(record?.second_turn_summary?.response || record?.second_turn_raw?.response),
        reasonCodes: (metadata?.immuneVerdict?.reason_codes || []).length > 0 ? metadata.immuneVerdict.reason_codes : [],
        responseControlApplied: metadata?.responseControlApplied === true,
        responseControlReason: metadata?.responseControlReason || null,
        qualitySanityApplied: metadata?.qualitySanityApplied === true,
        qualitySanityReason: metadata?.qualitySanityReason || null,
        retryApplied: metadata?.retryApplied === true,
        retryImproved: metadata?.retryImproved === true,
    };
}

async function runTest5() {
    const env = { ...process.env, SP4_TEST_OUTPUT_LABEL: RUN_LABEL };
    const { stdout, stderr } = await execFileAsync('node', [PROBE_PATH], { cwd: ROOT, env, timeout: 300000 });
    const probeLatestPath = path.join(LOG_DIR, `test_003.${RUN_LABEL}.latest.json`);
    const probeResults = JSON.parse(await fs.readFile(probeLatestPath, 'utf8'));
    const records = probeResults.records.map(mapProbeRecord);
    const pass = records.every((record) => record.turnsLength === 2)
        && records.every((record) => record.handledBy === 'followup_deterministic_guard')
        && records.every((record) => !/CORE je/i.test(record.response));

    return {
        id: uniqueTestId('test_5_followup_probe'),
        shortId: 'test_5_followup_probe',
        title: 'Follow-up kontext po oprave (end-to-end)',
        pass,
        details: {
            probeArtifact: probeLatestPath,
            stdoutTail: String(stdout || '').trim().split(/\r?\n/).slice(-12),
            stderrTail: String(stderr || '').trim().split(/\r?\n/).slice(-12),
            records,
        }
    };
}

async function runTest6() {
    const agent = await initAgent();
    const first = await agent.ask('čo je OSPF', { mode: 'core', forceLocal: true, testMode: true });
    const second = await agent.ask('a prečo to vzniklo?', { mode: 'core', forceLocal: true, testMode: true });
    const response = safeTrim(second.response);
    const failPattern = /\bCORE je\b|\bsom tu aby som\b|\bmoje poslanie\b/i;
    const topicPattern = /OSPF|link-state|smerovac|routing|protokol/i;
    const causalPattern = /histor|vznik|d[oô]vod|preto|potreb|navrh|vyvin|problem/i;
    const pass = topicPattern.test(response) && causalPattern.test(response) && !failPattern.test(response);
    return {
        id: uniqueTestId('test_6_identity_blind_spot'),
        shortId: 'test_6_identity_blind_spot',
        title: 'Identity blind spot pri nedeterministickom follow-up',
        pass,
        details: {
            firstResponse: safeTrim(first.response),
            secondResponse: response,
            secondHandledBy: second.handledBy || null,
            secondMeta: second.meta || {},
            dialogueState: summarizeDialogueState(snapshotTurns(agent)),
            topicMatch: topicPattern.test(response),
            causalMatch: causalPattern.test(response),
            identityDriftMatch: failPattern.test(response),
        }
    };
}

function buildMarkdown(payload) {
    const lines = [
        `# ${payload.test_id} isolated patch series`,
        '',
        `- run_label: ${payload.run_label}`,
        `- run_at: ${payload.run_at}`,
        `- passed: ${payload.overall.passed}`,
        `- failed: ${payload.overall.failed}`,
        `- skipped: ${payload.overall.skipped}`,
        '',
        '| unique_test_id | status | note |',
        '| --- | --- | --- |',
    ];
    for (const result of payload.results) {
        lines.push(`| ${result.id} | ${result.status} | ${safeTrim(result.note || '')} |`);
    }
    return lines.join('\n') + '\n';
}

const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
const results = [];

const test1 = await runTest1();
results.push({ ...test1, status: test1.pass ? 'PASS' : 'FAIL', note: `throw=${test1.details.thrownMessage}; turns=${test1.details.turnsLength}` });

const test2 = await runTest2();
results.push({ ...test2, status: test2.pass ? 'PASS' : 'FAIL', note: `provider=${test2.details.provider}; route=${test2.details.route}; cloudUsed=${test2.details.cloudUsed}` });

const test3 = await runTest3();
results.push({ ...test3, status: test3.pass ? 'PASS' : 'FAIL', note: `assistant=${test3.details.lastAssistantText}` });

const test4 = await runTest4();
results.push({ ...test4, status: test4.pass ? 'PASS' : 'FAIL', note: `ask==dlg=${test4.pass}` });

const test5 = await runTest5();
results.push({ ...test5, status: test5.pass ? 'PASS' : 'FAIL', note: test5.pass ? 'isolated probe fully passed' : 'isolated probe failed' });

if (test5.pass) {
    const test6 = await runTest6();
    results.push({ ...test6, status: test6.pass ? 'PASS' : 'FAIL', note: safeTrim(test6.details.secondResponse).slice(0, 140) });
} else {
    results.push({
        id: uniqueTestId('test_6_identity_blind_spot'),
        shortId: 'test_6_identity_blind_spot',
        title: 'Identity blind spot pri nedeterministickom follow-up',
        pass: false,
        status: 'SKIP',
        note: 'Skipped because isolated Test 5 failed.',
        details: {}
    });
}

const runAt = new Date().toISOString();
const payload = {
    test_id: config.test_id,
    parent_test_id: config.parent_test_id,
    run_label: RUN_LABEL,
    run_at: runAt,
    overall: {
        passed: results.filter((result) => result.status === 'PASS').length,
        failed: results.filter((result) => result.status === 'FAIL').length,
        skipped: results.filter((result) => result.status === 'SKIP').length,
    },
    results,
};

await fs.mkdir(LOG_DIR, { recursive: true });
const base = `${config.test_id}.${RUN_LABEL}`;
const latestJsonPath = path.join(LOG_DIR, `${base}.latest.json`);
const latestMdPath = path.join(LOG_DIR, `${base}.latest.md`);
await fs.writeFile(latestJsonPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
await fs.writeFile(latestMdPath, buildMarkdown(payload), 'utf8');

console.log(`test_id: ${config.test_id}`);
console.log(`run_label: ${RUN_LABEL}`);
for (const result of results) {
    console.log(`${result.status} ${result.id} :: ${result.note}`);
}
console.log(`artifacts: ${latestJsonPath}`);
