import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { checkOllamaHealth } from './src/startup/ollamaManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_TEST_ID = process.env.SP4_BATTLETEST_ID || 'test_014';
const RUNNER_PATH = './tests/test_010_live_battletest_eval.mjs';

function parseArgs(argv) {
    const parsed = {
        prepare: argv.includes('--prepare'),
        testMode: argv.includes('--test-mode'),
        testId: null,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--test-id' && argv[index + 1]) {
            parsed.testId = argv[index + 1];
            index += 1;
            continue;
        }
        if (arg.startsWith('--test-id=')) {
            parsed.testId = arg.slice('--test-id='.length);
        }
    }

    return parsed;
}

function flattenCases(config) {
    return [
        ...(config.core_inherited_set || []),
        ...(config.expanded_set || []),
        ...(config.edge_stress_set || []),
    ];
}

async function loadConfig(testId) {
    const testDir = path.resolve(__dirname, `TESTY/evolution/${testId}`);
    const modulePath = path.join(testDir, 'questions.mjs');
    const jsonPath = path.join(testDir, 'questions.json');

    try {
        await fs.access(modulePath);
        const moduleUrl = `${pathToFileURL(modulePath).href}?ts=${Date.now()}`;
        const imported = await import(moduleUrl);
        const config = imported.default || imported.config;
        if (!config) {
            throw new Error(`No config export found in ${modulePath}`);
        }
        return { config, questionsPath: modulePath };
    } catch (moduleError) {
        if (moduleError?.code && moduleError.code !== 'ENOENT') {
            throw moduleError;
        }
    }

    const config = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    return { config, questionsPath: jsonPath };
}

async function runPrepare({ testMode, testId }) {
    if (testMode) {
        process.env.SP4_TEST = 'true';
    }

    const { config, questionsPath } = await loadConfig(testId);
    const cases = flattenCases(config);
    const ollamaOk = await checkOllamaHealth();

    console.log(`test_id=${config.test_id}`);
    console.log(`goal=${config.goal}`);
    console.log(`cases=${cases.length}`);
    console.log(`mode=${config.runtime?.mode || 'unknown'}`);
    console.log(`forceLocal=${config.runtime?.options?.forceLocal === true}`);
    console.log(`require_no_cloud=${config.offline_requirements?.require_no_cloud === true}`);
    console.log(`min_local_llm_cases=${config.offline_requirements?.min_local_llm_cases || 0}`);
    console.log(`ollama_health=${ollamaOk ? 'ok' : 'down'}`);
    console.log(`runner=${RUNNER_PATH}`);
    console.log(`questions=${questionsPath}`);
    console.log(`next=${testMode ? `cross-env SP4_TEST=true node battletest.js --test-id ${config.test_id}` : `node battletest.js --test-id ${config.test_id}`}`);

    if (!ollamaOk) {
        process.exitCode = 2;
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const testId = args.testId || DEFAULT_TEST_ID;
    process.env.SP4_BATTLETEST_ID = testId;

    if (args.prepare) {
        await runPrepare({ ...args, testId });
        return;
    }

    if (args.testMode) {
        process.env.SP4_TEST = 'true';
    }

    await import(RUNNER_PATH);
}

await main();