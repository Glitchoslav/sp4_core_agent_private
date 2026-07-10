// tests/phase5_followup_live_test.mjs
// Live runtime runner pre follow-up dvojkrokove konverzacie cez SP4IntegratedAgent.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SP4IntegratedAgent } from '../integration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QUESTIONS_PATH = path.resolve(__dirname, '../TESTY/evolution/test_002/questions.json');
const LOGS_DIR = path.resolve(__dirname, '../TESTY/logs');

function flattenQuestions(questionSet) {
    return [
        ...(questionSet.core_inherited_set || []),
        ...(questionSet.expanded_set || []),
        ...(questionSet.edge_stress_set || []),
    ];
}

function buildRunStamp(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function shorten(text = '', max = 160) {
    const value = String(text || '').trim();
    if (value.length <= max) {
        return value;
    }
    return `${value.slice(0, max)}...`;
}

function extractMeta(result = {}) {
    const metadata = result?.metadata || result?.meta || {};
    return {
        persona: result?.persona || metadata?.persona || null,
        handledBy: result?.handledBy || metadata?.handledBy || null,
        model: result?.model || metadata?.model || metadata?.execution?.model || null,
        provider: metadata?.provider || metadata?.execution?.provider || null,
        processingTime: metadata?.processingTime || metadata?.execution?.processingTime || null,
        shortcut: metadata?.shortcut || null,
        qualitySanityApplied: metadata?.qualitySanityApplied === true,
        qualitySanityReason: metadata?.qualitySanityReason || null,
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

function toMarkdownBlock(record) {
    return [
        `## ${record.id} [${record.bucket}]`,
        `- previous_user: ${record.previous_user}`,
        `- previous_response: ${record.previous_response || '(none)'}`,
        `- follow_up: ${record.follow_up}`,
        `- follow_up_response: ${record.follow_up_response || '(none)'}`,
        `- follow_up_handled_by: ${record.follow_up_meta.handledBy || 'unknown'}`,
        `- follow_up_model: ${record.follow_up_meta.model || 'unknown'}`,
        `- quality_gate: ${record.follow_up_meta.qualitySanityApplied ? `yes (${record.follow_up_meta.qualitySanityReason || 'unknown'})` : 'no'}`,
        '',
    ].join('\n');
}

async function writeRunArtifacts(questionSet, records, totals) {
    const runAt = new Date();
    const stamp = buildRunStamp(runAt);
    const payload = {
        test_id: questionSet.test_id,
        parent_test_id: questionSet.parent_test_id,
        run_at: runAt.toISOString(),
        totals,
        records,
    };

    const latestJsonPath = path.join(LOGS_DIR, `${questionSet.test_id}.responses.latest.json`);
    const snapshotJsonPath = path.join(LOGS_DIR, `${questionSet.test_id}.responses.${stamp}.json`);
    const latestMdPath = path.join(LOGS_DIR, `${questionSet.test_id}.responses.latest.md`);

    const markdown = [
        `# ${questionSet.test_id} live responses`,
        '',
        `- run_at: ${payload.run_at}`,
        `- total: ${totals.total}`,
        `- completed: ${totals.completed}`,
        `- errors: ${totals.errors}`,
        '',
        ...records.map(toMarkdownBlock),
    ].join('\n');

    await fs.mkdir(LOGS_DIR, { recursive: true });
    await fs.writeFile(latestJsonPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    await fs.writeFile(snapshotJsonPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    await fs.writeFile(latestMdPath, markdown, 'utf8');

    return { latestJsonPath, snapshotJsonPath, latestMdPath };
}

const raw = await fs.readFile(QUESTIONS_PATH, 'utf8');
const questionSet = JSON.parse(raw);
const questions = flattenQuestions(questionSet);
const records = [];

let completed = 0;
let errors = 0;

console.log('\n══ PHASE 5 FOLLOW-UP LIVE TEST ═════════════════════════════');
console.log(`test_id: ${questionSet.test_id}`);
console.log(`parent_test_id: ${questionSet.parent_test_id}`);
console.log(`questions: ${questions.length}`);
console.log(`mode: ${questionSet.runtime.mode}`);
console.log('');

for (const question of questions) {
    console.log(`➡️  ${question.id} [${question.bucket}] ${question.previous_user} -> ${question.follow_up}`);

    const record = {
        id: question.id,
        bucket: question.bucket,
        previous_user: question.previous_user,
        follow_up: question.follow_up,
        previous_response: null,
        follow_up_response: null,
        previous_meta: {},
        follow_up_meta: {},
    };

    try {
        const agent = await createAgent();
        const firstResult = await agent.processMessage(question.previous_user, questionSet.runtime.mode, questionSet.runtime.options || {});
        const secondResult = await agent.processMessage(question.follow_up, questionSet.runtime.mode, questionSet.runtime.options || {});

        record.previous_response = String(firstResult?.response || '').trim();
        record.follow_up_response = String(secondResult?.response || '').trim();
        record.previous_meta = extractMeta(firstResult);
        record.follow_up_meta = extractMeta(secondResult);

        completed += 1;
        console.log(`   previous: ${shorten(record.previous_response)}`);
        console.log(`   follow-up: ${shorten(record.follow_up_response)}`);
        console.log(`   handledBy: ${record.follow_up_meta.handledBy || 'unknown'} | model: ${record.follow_up_meta.model || 'unknown'}`);
    } catch (error) {
        errors += 1;
        record.error = error.message || String(error);
        console.log(`   error: ${record.error}`);
    }

    records.push(record);
    console.log('');
}

const artifactPaths = await writeRunArtifacts(questionSet, records, {
    total: questions.length,
    completed,
    errors,
});

console.log('════════════════════════════════════════════════════════════');
console.log(`TOTAL: ${completed} COMPLETED | ${errors} ERRORS`);
console.log(`ARTIFACTS: ${artifactPaths.latestJsonPath}`);
console.log(`SNAPSHOT: ${artifactPaths.snapshotJsonPath}`);

if (errors > 0) {
    process.exit(1);
}
