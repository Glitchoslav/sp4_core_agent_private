// tests/phase5_followup_handoff_probe.mjs
// Diagnosticky probe: processMessage vs ask pre follow-up handoff, identity patterns a response control.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SP4IntegratedAgent } from '../integration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QUESTIONS_PATH = path.resolve(__dirname, '../TESTY/evolution/test_003/questions.json');
const LOGS_DIR = path.resolve(__dirname, '../TESTY/logs');
const OUTPUT_LABEL = String(process.env.SP4_TEST_OUTPUT_LABEL || '').trim();

function buildArtifactBase(testId) {
    return OUTPUT_LABEL ? `${testId}.${OUTPUT_LABEL}` : `${testId}.results`;
}

function buildRunStamp(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function safeClone(value) {
    return JSON.parse(JSON.stringify(value, (_key, currentValue) => {
        if (typeof currentValue === 'function') {
            return undefined;
        }
        if (currentValue instanceof Error) {
            return {
                name: currentValue.name,
                message: currentValue.message,
                stack: currentValue.stack,
            };
        }
        return currentValue;
    }));
}

function snapshotDialogueState(agent) {
    if (!agent?._dlgState?.snapshot) {
        return null;
    }

    const snapshot = agent._dlgState.snapshot();
    return {
        turns: snapshot.turns || [],
        turnsLength: Array.isArray(snapshot.turns) ? snapshot.turns.length : 0,
        roleOrder: Array.isArray(snapshot.turns) ? snapshot.turns.map((turn) => turn.role) : [],
        currentTopic: snapshot.currentTopic || null,
        currentMode: snapshot.currentMode || null,
        activeReferents: snapshot.activeReferents || {},
    };
}

function getFollowUpStateSummary(agent, secondTurnText) {
    const state = agent?._dlgState;
    if (!state) {
        return null;
    }

    const normalizedSecond = String(secondTurnText || '').trim().toLowerCase();
    const lastAssistantTurn = state.getLastAssistantTurn?.() || null;
    const previousUserTurn = state.getPreviousTurn?.('user', (turn) => (
        String(turn?.text || '').trim().toLowerCase() === normalizedSecond
    )) || null;

    return {
        lastAssistantTurnExists: Boolean(lastAssistantTurn?.text),
        previousUserTurnExists: Boolean(previousUserTurn?.text),
        lastAssistantTurn,
        previousUserTurn,
    };
}

function installDialogueProbe(agent) {
    const state = agent?._dlgState;
    if (!state) {
        return { restore() { }, calls: [] };
    }

    const calls = [];
    const originalGetLastUserTurn = state.getLastUserTurn.bind(state);
    const originalGetLastAssistantTurn = state.getLastAssistantTurn.bind(state);
    const originalGetPreviousTurn = state.getPreviousTurn.bind(state);

    state.getLastUserTurn = function patchedGetLastUserTurn(...args) {
        const result = originalGetLastUserTurn(...args);
        calls.push({
            method: 'getLastUserTurn',
            returnedRole: result?.role || null,
            returnedText: result?.text || null,
            snapshot: snapshotDialogueState(agent),
        });
        return result;
    };

    state.getLastAssistantTurn = function patchedGetLastAssistantTurn(...args) {
        const result = originalGetLastAssistantTurn(...args);
        calls.push({
            method: 'getLastAssistantTurn',
            returnedRole: result?.role || null,
            returnedText: result?.text || null,
            snapshot: snapshotDialogueState(agent),
        });
        return result;
    };

    state.getPreviousTurn = function patchedGetPreviousTurn(...args) {
        const result = originalGetPreviousTurn(...args);
        calls.push({
            method: 'getPreviousTurn',
            args: args.map((arg) => typeof arg === 'function' ? '[function]' : arg),
            returnedRole: result?.role || null,
            returnedText: result?.text || null,
            snapshot: snapshotDialogueState(agent),
        });
        return result;
    };

    return {
        calls,
        restore() {
            state.getLastUserTurn = originalGetLastUserTurn;
            state.getLastAssistantTurn = originalGetLastAssistantTurn;
            state.getPreviousTurn = originalGetPreviousTurn;
        },
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

function simplifySecondTurnMetadata(result, fallbackResult = null) {
    const metadata = result?.metadata || result?.meta || fallbackResult?.metadata || fallbackResult?.meta || {};
    return {
        response: result?.response || fallbackResult?.response || null,
        handledBy: metadata?.handledBy || result?.handledBy || fallbackResult?.handledBy || null,
        model: metadata?.model || null,
        immuneVerdict: metadata?.immuneVerdict || null,
        responseControlApplied: metadata?.responseControlApplied === true,
        responseControlReason: metadata?.responseControlReason || null,
        qualitySanityApplied: metadata?.qualitySanityApplied === true,
        qualitySanityReason: metadata?.qualitySanityReason || null,
        retryApplied: metadata?.retryApplied === true,
        retryImproved: metadata?.retryImproved === true,
        error: result?.error || fallbackResult?.error || fallbackResult?.meta?.error || null,
    };
}

async function runProcessMessageVariant(pair, runtimeOptions) {
    const agent = await createAgent();
    const record = {
        pair_id: pair.id,
        pair_label: pair.label,
        path: 'processMessage',
        first_turn_raw: null,
        second_turn_raw: null,
        dlgStateAfterFirstTurn: null,
        dlgStateBeforeSecondTurn: null,
        dlgStateAfterSecondTurn: null,
        followUpStateBeforeSecondTurn: null,
        internalProbeCallsSecondTurn: [],
        internalProbeFirstSnapshotSecondTurn: null,
        runtimeError: null,
        second_turn_summary: null,
    };

    try {
        const firstTurnResult = await agent.processMessage(pair.first_turn, pair.mode, runtimeOptions);
        record.first_turn_raw = safeClone(firstTurnResult);
        record.dlgStateAfterFirstTurn = snapshotDialogueState(agent);
        record.followUpStateBeforeSecondTurn = getFollowUpStateSummary(agent, pair.second_turn);
        record.dlgStateBeforeSecondTurn = snapshotDialogueState(agent);

        const probe = installDialogueProbe(agent);
        const secondTurnResult = await agent.processMessage(pair.second_turn, pair.mode, runtimeOptions);
        probe.restore();

        record.second_turn_raw = safeClone(secondTurnResult);
        record.internalProbeCallsSecondTurn = safeClone(probe.calls);
        record.internalProbeFirstSnapshotSecondTurn = probe.calls[0]?.snapshot || null;
        record.dlgStateAfterSecondTurn = snapshotDialogueState(agent);
        record.second_turn_summary = simplifySecondTurnMetadata(secondTurnResult);
    } catch (error) {
        record.runtimeError = {
            message: error.message || String(error),
            stack: error.stack || null,
        };
    }

    return record;
}

async function runAskVariant(pair, runtimeOptions) {
    const agent = await createAgent();
    const record = {
        pair_id: pair.id,
        pair_label: pair.label,
        path: 'ask',
        ask_turn_1_return: null,
        ask_turn_2_return: null,
        first_turn_raw: null,
        second_turn_raw: null,
        dlgStateAfterFirstTurn: null,
        dlgStateBeforeSecondTurn: null,
        dlgStateAfterSecondTurn: null,
        followUpStateBeforeSecondTurn: null,
        internalProbeCallsSecondTurn: [],
        internalProbeFirstSnapshotSecondTurn: null,
        runtimeError: null,
        second_turn_summary: null,
    };

    const capturedRawResults = [];
    const originalProcessMessage = agent.processMessage.bind(agent);
    agent.processMessage = async (userMessage, mode = 'auto', options = {}) => {
        const mergedOptions = { ...runtimeOptions, ...options };
        try {
            const result = await originalProcessMessage(userMessage, mode, mergedOptions);
            capturedRawResults.push(safeClone(result));
            return result;
        } catch (error) {
            capturedRawResults.push({
                success: false,
                error: error.message || String(error),
            });
            throw error;
        }
    };

    try {
        const askTurn1Result = await agent.ask(pair.first_turn, { mode: pair.mode });
        record.ask_turn_1_return = safeClone(askTurn1Result);
        record.first_turn_raw = capturedRawResults[0] || null;
        record.dlgStateAfterFirstTurn = snapshotDialogueState(agent);
        record.followUpStateBeforeSecondTurn = getFollowUpStateSummary(agent, pair.second_turn);
        record.dlgStateBeforeSecondTurn = snapshotDialogueState(agent);

        const probe = installDialogueProbe(agent);
        const askTurn2Result = await agent.ask(pair.second_turn, { mode: pair.mode });
        probe.restore();

        record.ask_turn_2_return = safeClone(askTurn2Result);
        record.second_turn_raw = capturedRawResults[1] || null;
        record.internalProbeCallsSecondTurn = safeClone(probe.calls);
        record.internalProbeFirstSnapshotSecondTurn = probe.calls[0]?.snapshot || null;
        record.dlgStateAfterSecondTurn = snapshotDialogueState(agent);
        record.second_turn_summary = simplifySecondTurnMetadata(capturedRawResults[1], askTurn2Result);
    } catch (error) {
        record.runtimeError = {
            message: error.message || String(error),
            stack: error.stack || null,
        };
    }

    return record;
}

function summarizeDialogueState(record) {
    const snapshot = record.dlgStateBeforeSecondTurn;
    if (!snapshot) {
        return 'unavailable';
    }
    return `${snapshot.turnsLength} turns [${snapshot.roleOrder.join(' > ') || 'none'}]`;
}

function summarizeReasonCodes(record) {
    const codes = record.second_turn_summary?.immuneVerdict?.reason_codes || [];
    return codes.length > 0 ? codes.join(', ') : 'none';
}

function buildTable(records) {
    const rows = [
        ['par', 'cesta', 'stav DialogueState', 'handledBy', 'follow-up odpoved', 'immune reason_codes', 'responseControlApplied', 'qualitySanityApplied'],
        ...records.map((record) => [
            record.pair_label,
            record.path,
            summarizeDialogueState(record),
            String(record.second_turn_summary?.handledBy || 'null'),
            String(record.second_turn_summary?.response || '').replace(/\s+/g, ' ').trim(),
            summarizeReasonCodes(record),
            String(record.second_turn_summary?.responseControlApplied === true),
            String(record.second_turn_summary?.qualitySanityApplied === true),
        ])
    ];

    const widths = rows[0].map((_, columnIndex) => Math.max(...rows.map((row) => (row[columnIndex] || '').length)));
    return rows.map((row, rowIndex) => {
        const rendered = row.map((cell, columnIndex) => (cell || '').padEnd(widths[columnIndex])).join(' | ');
        if (rowIndex === 0) {
            return `${rendered}\n${widths.map((width) => '-'.repeat(width)).join('-|-')}`;
        }
        return rendered;
    }).join('\n');
}

async function writeArtifacts(testSet, records, analysis) {
    const runAt = new Date();
    const stamp = buildRunStamp(runAt);
    const artifactBase = buildArtifactBase(testSet.test_id);
    const payload = {
        test_id: testSet.test_id,
        parent_test_id: testSet.parent_test_id,
        run_at: runAt.toISOString(),
        output_label: OUTPUT_LABEL || null,
        records,
        analysis,
    };

    const latestJsonPath = path.join(LOGS_DIR, `${artifactBase}.latest.json`);
    const snapshotJsonPath = path.join(LOGS_DIR, `${artifactBase}.${stamp}.json`);
    const latestMdPath = path.join(LOGS_DIR, `${artifactBase}.latest.md`);

    const markdown = [
        `# ${testSet.test_id} handoff probe`,
        '',
        `- run_at: ${payload.run_at}`,
        '',
        '```text',
        buildTable(records),
        '```',
        '',
        `- handoff verdict: ${analysis.handoffVerdict}`,
        `- identity verdict: ${analysis.identityVerdict}`,
        `- response control verdict: ${analysis.responseControlVerdict}`,
        `- next action: ${analysis.nextAction}`,
        '',
    ].join('\n');

    await fs.mkdir(LOGS_DIR, { recursive: true });
    await fs.writeFile(latestJsonPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    await fs.writeFile(snapshotJsonPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    await fs.writeFile(latestMdPath, markdown, 'utf8');

    return { latestJsonPath, snapshotJsonPath, latestMdPath };
}

const raw = await fs.readFile(QUESTIONS_PATH, 'utf8');
const testSet = JSON.parse(raw);
const runtimeOptions = testSet.runtime?.options || {};

const records = [];
for (const pair of testSet.pairs) {
    records.push(await runProcessMessageVariant(pair, runtimeOptions));
    records.push(await runAskVariant(pair, runtimeOptions));
}

const processRecords = records.filter((record) => record.path === 'processMessage');
const askRecords = records.filter((record) => record.path === 'ask');

const askHasFilledState = askRecords.every((record) => (record.dlgStateAfterFirstTurn?.turnsLength || 0) >= 2);
const processHasEmptyState = processRecords.every((record) => (record.dlgStateAfterFirstTurn?.turnsLength || 0) === 0);
const askHasPreviousUser = askRecords.every((record) => record.followUpStateBeforeSecondTurn?.previousUserTurnExists === true);
const askHasAssistant = askRecords.every((record) => record.followUpStateBeforeSecondTurn?.lastAssistantTurnExists === true);
const processMissingPreviousUser = processRecords.every((record) => record.followUpStateBeforeSecondTurn?.previousUserTurnExists !== true);
const processMissingAssistant = processRecords.every((record) => record.followUpStateBeforeSecondTurn?.lastAssistantTurnExists !== true);

const askRuntimeBugTriggered = askRecords.some((record) => /Cannot access 'detectedIntent' before initialization/i.test(record.second_turn_summary?.error || ''));
const askIdentityBlindSpot = askRecords.some((record) => /core je/i.test(record.second_turn_summary?.response || ''))
    && askRecords.every((record) => ((record.second_turn_summary?.immuneVerdict?.reason_codes || []).filter((code) => code === 'IDENTITY_AI_CLAIM' || code === 'IDENTITY_CONFUSION').length === 0));
const askEnforcementMiss = askRecords.some((record) => ((record.second_turn_summary?.immuneVerdict?.reason_codes || []).some((code) => code === 'IDENTITY_AI_CLAIM' || code === 'IDENTITY_CONFUSION')))
    && askRecords.some((record) => record.second_turn_summary?.responseControlApplied !== true);
const askBeatsProcessOnContext = askRecords.some((record) => /HTTP požiadavky|opakované operácie|rýchlej pamäte|sockety|nslookup|localhost/i.test(record.second_turn_summary?.response || ''))
    && processRecords.some((record) => !/HTTP požiadavky|opakované operácie|rýchlej pamäte|sockety|nslookup|localhost/i.test(record.second_turn_summary?.response || ''));

const analysis = {
    handoffVerdict: processHasEmptyState && processMissingPreviousUser && processMissingAssistant && askHasFilledState && askHasPreviousUser && askHasAssistant
        ? 'Handoff root cause je potvrdený: processMessage necháva DialogueState po prvom turne prázdny, zatiaľ čo ask ho naplní user aj assistant turnmi.'
        : 'Handoff root cause nie je plne potvrdený len stavom DialogueState; treba pozrieť detail probe logov.',
    identityVerdict: askRuntimeBugTriggered
        ? 'Identity blind spot sa v ask variante teraz nedá čisto zmerať, lebo follow-up branch padá na runtime buge `detectedIntent` ešte pred normálnym vyhodnotením odpovede.'
        : askIdentityBlindSpot
            ? 'Identity pattern blind spot je potvrdený: aj v ask variante vznikajú CORE/persona halucinácie bez immune identity reason_codes.'
            : 'Identity pattern blind spot sa v ask variante nepotvrdil jednoznačne cez immune metadata.',
    responseControlVerdict: askRuntimeBugTriggered
        ? 'Response control verdict je zatiaľ sekundárny: ask follow-up sa rozbíja skôr na runtime bug než na post-immune enforcement vrstve.'
        : askEnforcementMiss
            ? 'Response control vyzerá podozrivo: immune nesie identity reason_codes, ale responseControlApplied nezareagoval.'
            : 'Response control sa zatiaľ neukazuje ako primárny problém; skôr chýba zásah už na úrovni pattern detekcie.',
    nextAction: askRuntimeBugTriggered
        ? 'Ďalší krok: opraviť premature použitie `detectedIntent` v deterministic follow-up return path a potom zopakovať ten istý probe bez zmeny otázok.'
        : askBeatsProcessOnContext
            ? 'Ďalší krok: presunúť _dlgState user/assistant writeback z ask do centrálneho flow processMessage alebo do spoločného wrappera pred follow-up hodnotením.'
            : 'Ďalší krok: po fixnutí handoffu hneď rozšíriť immune identity patterns o výklady typu "CORE je osoba/persona" a znovu spustiť ten istý probe.',
};

const artifactPaths = await writeArtifacts(testSet, records, analysis);

console.log('\n══ PHASE 5 FOLLOW-UP HANDOFF PROBE ════════════════════════');
console.log(buildTable(records));
console.log('');
console.log(`HANDOFF: ${analysis.handoffVerdict}`);
console.log(`IDENTITY: ${analysis.identityVerdict}`);
console.log(`RESPONSE CONTROL: ${analysis.responseControlVerdict}`);
console.log(`NEXT ACTION: ${analysis.nextAction}`);
console.log(`ARTIFACTS: ${artifactPaths.latestJsonPath}`);
console.log(`SNAPSHOT: ${artifactPaths.snapshotJsonPath}`);
