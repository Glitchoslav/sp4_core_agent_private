import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEMANTIC_FAILURE_PATTERNS = [
    /REGRESSION DETECTED - Pipeline integrity compromised/,
    /ENFORCER SCENARIOS FAILED - Pipeline integrity compromised/,
    /GATE_ASSERTION_FAILURE/
];

export const DEFAULT_GATE_STEPS = [
    { name: "runtime-authority", file: "tests/test_runtime_authority_contract.js" },
    { name: "workspace-docs", file: "tests/test_workspace_docs_contract.js" },
    { name: "runtime-authority-guard", file: "tests/test_runtime_authority_guard_contract.js" },
    { name: "identity-kernel", file: "tests/unit/test_identity_kernel_contract.js" },
    { name: "prompt-assembly-identity", file: "tests/test_prompt_assembly_identity_contract.js" },
    { name: "immune-identity-all-personas", file: "tests/test_immune_identity_all_personas.js" },
    { name: "metadata-contract", file: "test_metadata_contract.js" },
    { name: "persona-integrity", file: "test_persona_integrity.js" },
    { name: "language-enforcer-scenario", file: "test_enforcer_scenario.js", env: { SP4_TEST: "true" } }
];

async function runStep(step) {
    const args = step.args || [path.isAbsolute(step.file) ? step.file : path.join(PROJECT_ROOT, step.file)];
    const command = step.command || process.execPath;
    const env = { ...process.env, ...(step.env || {}) };
    const child = spawn(command, args, { cwd: PROJECT_ROOT, env, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", chunk => {
        output += chunk.toString();
        process.stdout.write(chunk);
    });
    child.stderr.on("data", chunk => {
        output += chunk.toString();
        process.stderr.write(chunk);
    });
    const result = await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", (code, signal) => resolve({ code: code ?? 1, signal }));
    });
    const semanticFailure = SEMANTIC_FAILURE_PATTERNS.some(pattern => pattern.test(output));
    return { ...result, semanticFailure, output };
}

export async function runGateSteps(steps = DEFAULT_GATE_STEPS) {
    for (const step of steps) {
        console.log("[gate] STEP_START name=" + step.name);
        const result = await runStep(step);
        if (result.code !== 0 || result.semanticFailure) {
            const gateExit = result.code !== 0 ? result.code : 1;
            console.error("[gate] STEP_FAIL name=" + step.name + " child_exit=" + result.code + " semantic_failure=" + result.semanticFailure + " gate_exit=" + gateExit);
            return { exitCode: gateExit, failedStep: step.name, childExitCode: result.code, semanticFailure: result.semanticFailure };
        }
        console.log("[gate] STEP_PASS name=" + step.name + " child_exit=0");
    }
    console.log("[gate] ALL_STEPS_PASS count=" + steps.length);
    return { exitCode: 0, failedStep: null, childExitCode: 0, semanticFailure: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const requiredStepArg = process.argv.find(arg => arg.startsWith("--required-step="));
    if (requiredStepArg) {
        const requiredFile = requiredStepArg.slice("--required-step=".length);
        if (!DEFAULT_GATE_STEPS.some(step => step.file === requiredFile)) {
            throw new Error("Required gate step is not configured: " + requiredFile);
        }
    }
    let steps = DEFAULT_GATE_STEPS;
    if (process.env.SP4_GATE_TEST_FIXTURE) {
        if (process.env.SP4_TEST !== "true") throw new Error("SP4_GATE_TEST_FIXTURE requires SP4_TEST=true");
        steps = [{ name: "exit-code-fixture", file: process.env.SP4_GATE_TEST_FIXTURE }];
    }
    const result = await runGateSteps(steps);
    process.exitCode = result.exitCode;
}
