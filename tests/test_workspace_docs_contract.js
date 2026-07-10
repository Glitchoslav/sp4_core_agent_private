import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');

async function readText(...segments) {
    return fs.readFile(path.join(WORKSPACE_ROOT, ...segments), 'utf8');
}

function assertBattletestModel(text, label) {
    assert.match(text, /defaultný `npm run test:live:battletest` smeruje na `test_014` \(214 otázok\); `test_010` ostáva iba legacy 50-case baseline\./i, `${label}: missing canonical battletest default note`);
    assert.match(text, /Canonical executable tests sú v `sp4_core_agent\/tests\/` a canonical evolučné dáta v `sp4_core_agent\/TESTY\/`;/i, `${label}: missing canonical tests and TESTY note`);
    assert.match(text, /root `C:\\SP4KULT\\tests\\` aj `C:\\SP4KULT\\TESTY\\` sú len legacy šum\./i, `${label}: missing legacy root paths note`);
}

async function run() {
    const [testerAgent, copilotInstructions, rootReadme, testGates] = await Promise.all([
        readText('.github', 'agents', 'TESTER evo SP4.agent.md'),
        readText('.github', 'copilot-instructions.md'),
        readText('README.md'),
        readText('TEST_GATES.md'),
    ]);

    assertBattletestModel(testerAgent, 'TESTER agent');
    assertBattletestModel(copilotInstructions, 'copilot instructions');
    assertBattletestModel(rootReadme, 'root README');
    assertBattletestModel(testGates, 'TEST_GATES');

    assert.match(testerAgent, /evolution\/test_014\/\s+← default battletest \(214 otázok\)/i, 'TESTER agent must list test_014 as default battletest');
    assert.doesNotMatch(testerAgent, /evolution\/test_010\/\s+← battletest \(50 otázok\)/i, 'TESTER agent must not present test_010 as the default battletest');

    assert.match(copilotInstructions, /npm run test:live:battletest` \| Pred väčším commitom \(default: test_014, 214 otázok\)/i, 'copilot instructions must describe test_014 as the default battletest');
    assert.match(copilotInstructions, /Test suite:\*\* `sp4_core_agent\/TESTY\/evolution\/` — test_009 \(smoke\), test_014 \(default battletest\), test_010 \(legacy 50-case baseline\)/i, 'copilot instructions must keep test suite ordering and legacy note');
    assert.doesNotMatch(copilotInstructions, /Pred väčším commitom \(50 otázok\)/i, 'copilot instructions must not keep the stale 50-question default');

    assert.match(rootReadme, /npm run test:live:battletest  # default: test_014 — 214-otázkový kanonický battletest/i, 'root README must describe test_014 as the default battletest');
    assert.doesNotMatch(rootReadme, /test_010 — 50-otázkový kanonický battletest/i, 'root README must not keep the stale test_010 default line');

    assert.match(testGates, /### C\. Kanonický Live Battletest \(default: test_014\)/i, 'TEST_GATES must rename the canonical live battletest section to test_014 default');
    assert.match(testGates, /Manifest: \[TESTY\/evolution\/test_014\/manifest\.md\]/i, 'TEST_GATES must point to the test_014 manifest');
    assert.doesNotMatch(testGates, /### C\. Kanonický Live Battletest \(test_010\)/i, 'TEST_GATES must not keep test_010 as canonical heading');

    console.log('PASS: workspace docs contract');
}

run().catch((error) => {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
});