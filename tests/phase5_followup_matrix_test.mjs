// tests/phase5_followup_matrix_test.mjs
// Prvy evolucny regresny test pre deterministic follow-up wiring.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDeterministicFollowUp } from '../src/dialogue/dialogueState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QUESTIONS_PATH = path.resolve(__dirname, '../TESTY/evolution/test_001/questions.json');
const LOGS_DIR = path.resolve(__dirname, '../TESTY/logs');

function normalizeText(value = '') {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function makeDialogueState({ previousUser = '', previousAssistant = '', topic = null } = {}) {
    return {
        currentTopic: topic,
        getLastUserTurn: () => previousUser ? { text: previousUser } : null,
        getLastAssistantTurn: () => previousAssistant ? { text: previousAssistant } : null,
        getPreviousTurn: (role) => {
            if (role === 'user') {
                return previousUser ? { text: previousUser } : null;
            }
            return null;
        },
        getHistory: () => [
            ...(previousUser ? [{ role: 'user', text: previousUser }] : []),
            ...(previousAssistant ? [{ role: 'assistant', text: previousAssistant }] : []),
        ],
        getLastNTurns: () => [],
    };
}

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

function toMarkdownBlock(record) {
    return [
        `## ${record.id} [${record.bucket}]`,
        `- previous_user: ${record.previous_user}`,
        `- follow_up: ${record.follow_up}`,
        `- expected_path: ${record.expected_path}`,
        `- actual_path: ${record.actual_path}`,
        `- verdict: ${record.verdict}`,
        `- output: ${record.output ?? '(none - falls to LLM)'}`,
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
        `# ${questionSet.test_id} responses`,
        '',
        `- run_at: ${payload.run_at}`,
        `- total: ${totals.total}`,
        `- pass: ${totals.pass}`,
        `- fail: ${totals.fail}`,
        '',
        ...records.map(toMarkdownBlock),
    ].join('\n');

    await fs.mkdir(LOGS_DIR, { recursive: true });
    await fs.writeFile(latestJsonPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    await fs.writeFile(snapshotJsonPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    await fs.writeFile(latestMdPath, markdown, 'utf8');

    return {
        latestJsonPath,
        snapshotJsonPath,
        latestMdPath,
    };
}

function validateCaseResult(question, result) {
    const actualPath = result === null ? 'llm_fallback' : 'deterministic';
    assert.equal(actualPath, question.expected_path, `Path mismatch for ${question.id}`);

    if (actualPath === 'deterministic') {
        const normalizedResult = normalizeText(result);
        for (const fragment of question.expected_contains || []) {
            assert.ok(
                normalizedResult.includes(normalizeText(fragment)),
                `Missing fragment for ${question.id}: ${fragment}`
            );
        }
    }
}

const raw = await fs.readFile(QUESTIONS_PATH, 'utf8');
const questionSet = JSON.parse(raw);
const questions = flattenQuestions(questionSet);
const runRecords = [];

let passed = 0;
let failed = 0;

console.log('\n══ PHASE 5 FOLLOW-UP MATRIX TEST ═══════════════════════════');
console.log(`test_id: ${questionSet.test_id}`);
console.log(`parent_test_id: ${questionSet.parent_test_id}`);
console.log(`questions: ${questions.length}`);
console.log('');

for (const question of questions) {
    const dialogueState = makeDialogueState({
        previousUser: question.previous_user,
        previousAssistant: question.previous_assistant,
        topic: question.topic,
    });

    const result = resolveDeterministicFollowUp(question.follow_up, dialogueState);
    const actualPath = result === null ? 'llm_fallback' : 'deterministic';
    const record = {
        id: question.id,
        bucket: question.bucket,
        previous_user: question.previous_user,
        follow_up: question.follow_up,
        expected_path: question.expected_path,
        actual_path: actualPath,
        output: result,
        verdict: 'PASS',
    };

    try {
        validateCaseResult(question, result);
        passed += 1;
        console.log(`✅ ${question.id} [${question.bucket}] ${question.previous_user} -> ${question.follow_up}`);
        console.log(`   expected: ${question.expected_path} | actual: ${actualPath}`);
        if (result) {
            console.log(`   output: ${result.slice(0, 140)}${result.length > 140 ? '...' : ''}`);
        }
    } catch (error) {
        failed += 1;
        record.verdict = 'FAIL';
        record.error = error.message;
        console.log(`❌ ${question.id} [${question.bucket}] ${question.previous_user} -> ${question.follow_up}`);
        console.log(`   expected: ${question.expected_path} | actual: ${actualPath}`);
        console.log(`   reason: ${error.message}`);
        console.log(`   output: ${result ?? '(none - falls to LLM)'}`);
    }

    runRecords.push(record);

    console.log('');
}

const artifactPaths = await writeRunArtifacts(questionSet, runRecords, {
    total: questions.length,
    pass: passed,
    fail: failed,
});

console.log('════════════════════════════════════════════════════════════');
console.log(`TOTAL: ${passed} PASS | ${failed} FAIL`);
console.log(`ARTIFACTS: ${artifactPaths.latestJsonPath}`);
console.log(`SNAPSHOT: ${artifactPaths.snapshotJsonPath}`);

if (failed > 0) {
    process.exit(1);
}
