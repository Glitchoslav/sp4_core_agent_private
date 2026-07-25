import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runGateSteps } from "../scripts/runGate.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(projectRoot, "tests", "fixtures", "gate_false_success_child.js");
const gateScript = path.join(projectRoot, "scripts", "runGate.js");
const isolatedRunner = path.join(projectRoot, "scripts", "runIsolatedGate.js");

const direct = await runGateSteps([{ name: "false-success-fixture", file: fixture }]);
assert.equal(direct.childExitCode, 0);
assert.equal(direct.semanticFailure, true);
assert.equal(direct.exitCode, 1);
assert.equal(direct.failedStep, "false-success-fixture");

const env = {
    ...process.env,
    SP4_TEST: "true",
    SP4_GATE_COMMAND: JSON.stringify(process.execPath) + " " + JSON.stringify(gateScript),
    SP4_GATE_TEST_FIXTURE: fixture,
    GROQ_API_KEY: "must-not-leak"
};
const isolated = spawnSync(process.execPath, [isolatedRunner], {
    cwd: projectRoot,
    env,
    encoding: "utf8",
    timeout: 180000
});
const output = (isolated.stdout || "") + (isolated.stderr || "");
assert.equal(isolated.status, 1, output);
assert.match(output, /STEP_FAIL name=exit-code-fixture child_exit=0 semantic_failure=true gate_exit=1/);
assert.match(output, /FUNCTIONAL_GATE_STATUS=FAIL/);
assert.match(output, /ISOLATION_STATUS=PASS/);
assert.match(output, /PRODUCTION_MANIFEST=IDENTICAL/);
assert.match(output, /CLEANUP=SUCCESS/);
assert.doesNotMatch(output, /must-not-leak/);

console.log("PASS: semantic assertion failure propagates through test:gate and isolated runner as non-zero");
