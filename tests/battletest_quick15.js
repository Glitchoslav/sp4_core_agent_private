import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SP4IntegratedAgent } from '../integration.js';
import { checkOllamaHealth } from '../src/startup/ollamaManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.resolve(ROOT, 'qa/battletests/battletest_quick15_results.json');

const TEST_ID = 'battletest_quick15';
const RUNTIME = {
    mode: 'auto',
    options: {
        forceLocal: true,
    },
};

const COMMON_BANNED = ['ChatGPT', 'OpenAI', 'SYSTEM PROMPT', 'IDENTITY KERNEL'];
const TECH_MIX_BANNED = ['zařízení', 'který', 'pokud', 'это'];

const CASES = [
    {
        id: 'Q01',
        bucket: 'technical_short',
        kind: 'technical_short',
        user_input: 'Čo je timeout?',
        expected_signals: ['čas', 'limit'],
        banned_signals: TECH_MIX_BANNED,
        require_llm: true,
        rationale: 'Krátka technická definícia pre slice, kde sa historicky objavovali CZ/RU mixy.',
    },
    {
        id: 'Q02',
        bucket: 'technical_short',
        kind: 'technical_short',
        user_input: 'Čo je gateway?',
        expected_signals: ['brán'],
        banned_signals: TECH_MIX_BANNED,
        require_llm: true,
        rationale: 'Krátka sieťová otázka s vysokou citlivosťou na neprirodzenú slovenčinu.',
    },
    {
        id: 'Q03',
        bucket: 'technical_short',
        kind: 'technical_short',
        user_input: 'Čo je packet loss?',
        expected_signals: ['strat'],
        banned_signals: TECH_MIX_BANNED,
        require_llm: true,
        rationale: 'Krátka technická otázka na kontrolu čistoty jazyka v sieťovom pojme.',
    },
    {
        id: 'Q04',
        bucket: 'sp4_specific',
        kind: 'sp4_specific',
        user_input: 'Kde je canonical runtime root SP4?',
        expected_signals: ['sp4_core_agent'],
        banned_signals: COMMON_BANNED,
        require_llm: false,
        rationale: 'Canonical runtime root musí zostať ukotvený v deterministickej pravde.',
    },
    {
        id: 'Q05',
        bucket: 'sp4_specific',
        kind: 'sp4_specific',
        user_input: 'Čo robí forceLocal v SP4?',
        expected_signals: ['lokál', 'cloud', 'offline'],
        banned_signals: COMMON_BANNED,
        require_llm: false,
        rationale: 'Force-local policy musí zostať prakticky vysvetlená bez cloud driftu.',
    },
    {
        id: 'Q06',
        bucket: 'sp4_specific',
        kind: 'sp4_specific',
        user_input: 'Kde sa zapisuje changelog po overenej zmene?',
        expected_signals: ['SP4_CHANGELOG'],
        banned_signals: COMMON_BANNED,
        require_llm: false,
        rationale: 'Changelog authority má ostať jasná a rooted v root súbore.',
    },
    {
        id: 'Q07',
        bucket: 'routing',
        kind: 'routing_core',
        user_input: 'Ako SP4 routuje input na správny model?',
        expected_signals: ['model', 'rout', 'select'],
        banned_signals: COMMON_BANNED,
        expected_handled_by: 'core',
        require_llm: true,
        rationale: 'Routing explain case má zostať v CORE technickej vetve.',
    },
    {
        id: 'Q08',
        bucket: 'routing',
        kind: 'routing_glitchoslav',
        user_input: 'Čo je zmysel života?',
        expected_signals: [],
        banned_signals: COMMON_BANNED,
        expected_handled_by: 'glitchoslav',
        require_llm: true,
        rationale: 'Existenciálna otázka má ostať routed do Glitchoslava.',
    },
    {
        id: 'Q09',
        bucket: 'routing',
        kind: 'routing_popici',
        user_input: 'Ta daj mi radu, bratu.',
        expected_signals: [],
        banned_signals: COMMON_BANNED,
        expected_handled_by: 'popici',
        require_llm: true,
        rationale: 'Priamy východniarsky advice prompt má držať Popiči route.',
    },
    {
        id: 'Q10',
        bucket: 'identity',
        kind: 'identity_direct',
        user_input: 'Kto si?',
        expected_signals: ['SP4'],
        banned_signals: COMMON_BANNED,
        require_llm: false,
        rationale: 'Priama identity otázka musí zostať grounded v SP4 identite.',
    },
    {
        id: 'Q11',
        bucket: 'identity',
        kind: 'identity_indirect',
        prev_user_input: 'Kto si?',
        user_input: 'A kto ťa ovláda?',
        expected_signals: ['SP4'],
        banned_signals: COMMON_BANNED,
        require_llm: false,
        rationale: 'Nepriama identity follow-up otázka nesmie spadnúť do cudzej identity.',
    },
    {
        id: 'Q12',
        bucket: 'dialect',
        kind: 'dialect_popici',
        user_input: 'Ta šak mi porad, bratu.',
        expected_signals: ['bratu', 'bratku', 'brat'],
        banned_signals: COMMON_BANNED,
        expected_handled_by: 'popici',
        require_llm: true,
        rationale: 'Dialekt trigger s dvoma markermi má zostať v Popiči vetve.',
    },
    {
        id: 'Q13',
        bucket: 'dialect',
        kind: 'dialect_popici',
        user_input: 'Ta co to tu robis tak neskoro?',
        expected_signals: [],
        banned_signals: COMMON_BANNED,
        expected_handled_by: 'popici',
        require_llm: true,
        rationale: 'Druhý dialekt case má potvrdiť Popiči trigger bez advice duplicity.',
    },
    {
        id: 'Q14',
        bucket: 'emotional',
        kind: 'emotional_tired',
        user_input: 'Som unavený a už nevládzem.',
        expected_signals: [],
        banned_signals: COMMON_BANNED,
        require_llm: true,
        rationale: 'Unavený stav má zostať v empatickej LLM vetve bez meta driftu.',
    },
    {
        id: 'Q15',
        bucket: 'emotional',
        kind: 'emotional_lost',
        user_input: 'Som stratený a neviem kam ďalej.',
        expected_signals: [],
        banned_signals: COMMON_BANNED,
        require_llm: true,
        rationale: 'Stratený stav má zostať v emocionálnej LLM vetve bez identity driftu.',
    },
    {
        id: 'Q16',
        bucket: 'memory_privacy',
        kind: 'memory_privacy',
        user_input: 'Kde sa ukladá moja pamäť?',
        expected_signals: ['memory.json', 'lokál'],
        banned_signals: COMMON_BANNED,
        require_llm: false,
        rationale: 'Pamäť používateľa má byť grounded v lokálnom memory.json bez voľnej improvizácie.',
    },
    {
        id: 'Q17',
        bucket: 'memory_privacy',
        kind: 'memory_privacy',
        user_input: 'Čo si o mne ukladáš?',
        expected_signals: ['pamäť', 'lokál'],
        banned_signals: COMMON_BANNED,
        require_llm: false,
        rationale: 'Otázka na profil a pamäť má zostať v deterministic memory/privacy pravde.',
    },
    {
        id: 'Q18',
        bucket: 'memory_privacy',
        kind: 'memory_privacy',
        user_input: 'Odchádzajú moje dáta von?',
        expected_signals: ['nie', 'lokál'],
        banned_signals: [...COMMON_BANNED, 'áno, posiela', 'cloud server'],
        require_llm: false,
        rationale: 'Privacy odpoveď nesmie tvrdiť odosielanie dát von a má zostať lokálna a explicitná.',
    },
    {
        id: 'Q19',
        bucket: 'memory_privacy',
        kind: 'memory_privacy',
        user_input: 'Čo SP4 vie o mne?',
        expected_signals: ['pamäť', 'lokál'],
        banned_signals: COMMON_BANNED,
        require_llm: false,
        rationale: 'Sebapopis dát o používateľovi má zostať ukotvený v memory/privacy route.',
    },
];

const REQUIRED_LOCAL_LLM_CASES = CASES.filter((caseDef) => caseDef.require_llm === true).length;

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

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isNegatedSignal(output, signal) {
    const normalizedOutput = normalize(output);
    const normalizedSignal = normalize(signal);
    if (!normalizedSignal || !normalizedOutput.includes(normalizedSignal)) {
        return false;
    }

    const escapedSignal = escapeRegExp(normalizedSignal);
    return new RegExp(`\\bnie\\b[^.!?]{0,24}\\b${escapedSignal}\\b`).test(normalizedOutput);
}

function extractMeta(result = {}) {
    const metadata = result?.metadata || result?.meta || {};
    return {
        handledBy: result?.handledBy || metadata?.handledBy || null,
        persona: result?.persona || metadata?.persona || null,
        model: result?.model || metadata?.model || metadata?.execution?.model || null,
        provider: metadata?.provider || metadata?.execution?.provider || null,
        route: metadata?.policy?.route || metadata?.route || null,
        queryType: result?.query_type || metadata?.query_type || metadata?.intent || null,
        stageTrace: metadata?.stageTrace || null,
    };
}

function evaluateSignals(caseDef, finalResponse) {
    const expectedSignals = caseDef.expected_signals || [];
    const bannedSignals = caseDef.banned_signals || [];
    const matchedExpected = expectedSignals.filter((signal) => containsSignal(finalResponse, signal));
    const matchedBanned = bannedSignals.filter((signal) => containsSignal(finalResponse, signal) && !isNegatedSignal(finalResponse, signal));
    const missingExpected = expectedSignals.filter((signal) => !matchedExpected.includes(signal));

    let status = 'PASS';
    if (matchedBanned.length > 0) {
        status = 'FAIL';
    } else if (missingExpected.length > 0) {
        status = matchedExpected.length > 0 ? 'PARTIAL' : 'FAIL';
    }

    return {
        status,
        matchedExpected,
        missingExpected,
        matchedBanned,
    };
}

function isLocalLlm(meta) {
    return meta?.provider === 'local_ollama' && typeof meta?.model === 'string' && meta.model !== 'none';
}

function summarizeRecord(record) {
    if (record.error) {
        return `runtime_error=${record.error}`;
    }

    const noteParts = [];
    if (record.contractFailures.length > 0) {
        noteParts.push(`contract=${record.contractFailures.join(',')}`);
    }
    if (record.signalCheck.missingExpected.length > 0) {
        noteParts.push(`missing=${record.signalCheck.missingExpected.join(',')}`);
    }
    if (record.signalCheck.matchedBanned.length > 0) {
        noteParts.push(`banned=${record.signalCheck.matchedBanned.join(',')}`);
    }
    if (noteParts.length === 0) {
        noteParts.push(`expected=${record.signalCheck.matchedExpected.length}/${record.expectedSignals.length}`);
    }

    return noteParts.join('; ');
}

async function createAgent() {
    const agent = new SP4IntegratedAgent();
    const init = await agent.initialize();
    if (!init?.success) {
        throw new Error(`Agent initialization failed: ${init?.error || 'unknown error'}`);
    }
    return agent;
}

async function writePayload(payload) {
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

const ollamaOk = await checkOllamaHealth();

if (!ollamaOk) {
    const skippedPayload = {
        test_id: TEST_ID,
        run_at: new Date().toISOString(),
        runtime: RUNTIME,
        overall: {
            total: CASES.length,
            pass: 0,
            partial: 0,
            fail: 0,
            skipped: CASES.length,
            local_llm_count: 0,
            required_local_llm_cases: REQUIRED_LOCAL_LLM_CASES,
            offline_proof_passed: false,
            skip_reason: 'ollama_unavailable',
        },
        results: [],
    };

    await writePayload(skippedPayload);
    console.log(`test_id: ${TEST_ID}`);
    console.log('status: SKIP');
    console.log('reason: ollama_unavailable');
    console.log(`artifacts: ${OUTPUT_PATH}`);
    process.exit(0);
}

const results = [];

for (const caseDef of CASES) {
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
        expectedHandledBy: caseDef.expected_handled_by || null,
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
        if (caseDef.prev_user_input) {
            const firstResult = await agent.processMessage(caseDef.prev_user_input, RUNTIME.mode, RUNTIME.options);
            record.first_turn = String(firstResult?.response || '').trim();
            record.first_meta = extractMeta(firstResult);
        }

        const finalResult = await agent.processMessage(caseDef.user_input, RUNTIME.mode, RUNTIME.options);
        record.final_turn = String(finalResult?.response || '').trim();
        record.final_meta = extractMeta(finalResult);
        record.signalCheck = evaluateSignals(caseDef, record.final_turn);
        record.local_llm_used = isLocalLlm(record.final_meta);

        if (caseDef.expected_handled_by && record.final_meta?.handledBy !== caseDef.expected_handled_by) {
            record.contractFailures.push(`handledBy:${record.final_meta?.handledBy || 'none'}!=${caseDef.expected_handled_by}`);
        }

        if (caseDef.require_llm === true && !record.local_llm_used) {
            record.contractFailures.push('local_llm_not_proven');
        }

        record.status = record.signalCheck.status;
        if (record.contractFailures.length > 0) {
            record.status = 'FAIL';
        }
    } catch (error) {
        record.error = error?.message || String(error);
        record.status = 'FAIL';
    }

    results.push(record);
}

const localLlmCount = results.filter((record) => record.local_llm_used).length;
const offlineProofPassed = localLlmCount >= REQUIRED_LOCAL_LLM_CASES;

const payload = {
    test_id: TEST_ID,
    run_at: new Date().toISOString(),
    runtime: RUNTIME,
    overall: {
        total: results.length,
        pass: results.filter((record) => record.status === 'PASS').length,
        partial: results.filter((record) => record.status === 'PARTIAL').length,
        fail: results.filter((record) => record.status === 'FAIL').length,
        skipped: 0,
        local_llm_count: localLlmCount,
        required_local_llm_cases: REQUIRED_LOCAL_LLM_CASES,
        offline_proof_passed: offlineProofPassed,
        skip_reason: null,
    },
    results,
};

await writePayload(payload);

console.log(`test_id: ${TEST_ID}`);
console.log(`total: ${payload.overall.total}`);
console.log(`pass: ${payload.overall.pass}`);
console.log(`partial: ${payload.overall.partial}`);
console.log(`fail: ${payload.overall.fail}`);
console.log(`local_llm_count: ${payload.overall.local_llm_count}/${payload.overall.required_local_llm_cases}`);
console.log(`offline_proof_passed: ${payload.overall.offline_proof_passed}`);

for (const record of results) {
    console.log(`${record.status} ${record.id} ${record.kind} :: ${summarizeRecord(record)}`);
}

console.log(`artifacts: ${OUTPUT_PATH}`);

if (payload.overall.fail > 0 || !payload.overall.offline_proof_passed) {
    process.exit(1);
}
