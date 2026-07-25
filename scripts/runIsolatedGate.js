import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_ROOTS = ["data", "logs", "rules"];
const CLOUD_ENV_KEYS = [
    "GROQ_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "MISTRAL_API_KEY",
    "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "AZURE_OPENAI_API_KEY",
    "COHERE_API_KEY", "TOGETHER_API_KEY", "PERPLEXITY_API_KEY",
    "DEEPSEEK_API_KEY", "XAI_API_KEY", "OPENROUTER_API_KEY"
];
const DEFAULT_EXPECTED_ARTIFACTS = [
    "data/identity.json",
    "data/memory.json",
    "data/epochs.json",
    "rules/rulebook.yml",
    "rules/pattern-history.json",
    "rules/auto-tuning.yml"
];
const OPTIONAL_ARTIFACTS = [
    "logs/autonomous_decisions.jsonl",
    "rules/user-behavior.log",
    "logs/scheduler.log",
    "logs/aios_costs.jsonl",
    "logs/agent.log",
    "data/snippets/"
];
const ISOLATION_FAILURE_EXIT = 86;

async function hashFile(filePath) {
    const hash = createHash("sha256");
    await new Promise((resolve, reject) => {
        const stream = createReadStream(filePath);
        stream.on("data", chunk => hash.update(chunk));
        stream.on("error", reject);
        stream.on("end", resolve);
    });
    return hash.digest("hex");
}

async function walkManifest(absolutePath, relativePath, manifest) {
    let stat;
    try {
        stat = await fs.lstat(absolutePath);
    } catch (error) {
        if (error.code === "ENOENT") return;
        throw error;
    }

    const normalized = relativePath.split(path.sep).join("/");
    if (stat.isSymbolicLink()) {
        manifest.set(normalized, { type: "symlink", target: await fs.readlink(absolutePath) });
        return;
    }
    if (stat.isDirectory()) {
        manifest.set(normalized + "/", { type: "directory" });
        const entries = await fs.readdir(absolutePath);
        entries.sort((a, b) => a.localeCompare(b));
        for (const entry of entries) {
            await walkManifest(path.join(absolutePath, entry), path.join(relativePath, entry), manifest);
        }
        return;
    }
    if (stat.isFile()) {
        manifest.set(normalized, { type: "file", size: stat.size, sha256: await hashFile(absolutePath) });
        return;
    }
    manifest.set(normalized, { type: "other", size: stat.size });
}

export async function buildProductionManifest(projectRoot = PROJECT_ROOT) {
    const manifest = new Map();
    for (const root of MANIFEST_ROOTS) {
        await walkManifest(path.join(projectRoot, root), root, manifest);
    }
    return manifest;
}

export function diffManifests(before, after) {
    const paths = new Set([...before.keys(), ...after.keys()]);
    const diff = [];
    for (const itemPath of [...paths].sort()) {
        const oldValue = before.get(itemPath);
        const newValue = after.get(itemPath);
        if (!oldValue) diff.push({ path: itemPath, change: "added", after: newValue });
        else if (!newValue) diff.push({ path: itemPath, change: "removed", before: oldValue });
        else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            diff.push({ path: itemPath, change: "changed", before: oldValue, after: newValue });
        }
    }
    return diff;
}

async function listFiles(root, current = root) {
    const files = [];
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
        const absolute = path.join(current, entry.name);
        if (entry.isDirectory()) files.push(...await listFiles(root, absolute));
        else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
    return files;
}

function buildChildEnv(tempRoot) {
    const env = { ...process.env };
    for (const key of CLOUD_ENV_KEYS) delete env[key];
    env.SP4_TEST = "true";
    env.SP4_RUNTIME_ROOT = tempRoot;
    delete env.SP4_DATA_ROOT;
    env.USE_CLOUD_FALLBACK = "false";
    return env;
}

function spawnGate(tempRoot) {
    const override = process.env.SP4_GATE_COMMAND;
    if (override && process.env.SP4_TEST !== "true") {
        throw new Error("SP4_GATE_COMMAND is allowed only when SP4_TEST=true");
    }

    const env = buildChildEnv(tempRoot);
    const command = override || (process.platform === "win32" ? "npm.cmd" : "npm");
    const args = override ? [] : ["run", "test:gate"];
    const child = spawn(command, args, {
        cwd: PROJECT_ROOT,
        env,
        shell: Boolean(override) || process.platform === "win32",
        stdio: "inherit"
    });
    return child;
}

async function waitForChild(child) {
    return await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", (code, signal) => resolve({ code: code ?? 1, signal }));
    });
}

export async function runIsolatedGate() {
    const before = await buildProductionManifest();
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "sp4-gate-"));
    const displayRoot = process.env.SP4_TEST === "true" ? tempRoot : path.basename(tempRoot);
    let child = null;
    let receivedSignal = null;
    let childResult = { code: 1, signal: null };
    let manifestDiff = [];
    let artifacts = [];
    let cleanupSuccess = false;
    let isolationError = null;

    const signalHandler = signal => {
        receivedSignal = signal;
        if (child && child.exitCode === null) child.kill(signal);
    };
    const onSigint = () => signalHandler("SIGINT");
    const onSigterm = () => signalHandler("SIGTERM");
    process.once("SIGINT", onSigint);
    process.once("SIGTERM", onSigterm);

    console.log("[isolated-gate] TEMP_ROOT=" + displayRoot);
    try {
        for (const dir of ["data", "data/memory/personas", "data/snippets", "logs", "rules/backups"]) {
            await fs.mkdir(path.join(tempRoot, dir), { recursive: true });
        }

        child = spawnGate(tempRoot);
        childResult = await waitForChild(child);
        artifacts = await listFiles(tempRoot);

        const after = await buildProductionManifest();
        manifestDiff = diffManifests(before, after);
        if (manifestDiff.length > 0) {
            isolationError = "production manifest changed";
            console.error("[isolated-gate] PRODUCTION_MANIFEST_DIFF=" + JSON.stringify(manifestDiff));
        }

        if (childResult.code === 0) {
            const expected = process.env.SP4_GATE_EXPECTED_ARTIFACTS
                ? JSON.parse(process.env.SP4_GATE_EXPECTED_ARTIFACTS)
                : DEFAULT_EXPECTED_ARTIFACTS;
            const missing = expected.filter(item => !artifacts.includes(item));
            if (missing.length > 0) {
                isolationError = "missing expected temp artifacts: " + missing.join(", ");
                console.error("[isolated-gate] MISSING_ARTIFACTS=" + JSON.stringify(missing));
            }
        }

        const mandatory = process.env.SP4_GATE_EXPECTED_ARTIFACTS
            ? JSON.parse(process.env.SP4_GATE_EXPECTED_ARTIFACTS)
            : DEFAULT_EXPECTED_ARTIFACTS;
        const optionalNotReached = OPTIONAL_ARTIFACTS.filter(item => {
            if (item.endsWith("/")) return !artifacts.some(artifact => artifact.startsWith(item));
            return !artifacts.includes(item);
        });
        console.log("[isolated-gate] ARTIFACTS=" + JSON.stringify(artifacts));
        console.log("[isolated-gate] EXPECTED_MANDATORY_ARTIFACTS=" + JSON.stringify(mandatory));
        console.log("[isolated-gate] OPTIONAL_ARTIFACTS_NOT_REACHED=" + JSON.stringify(optionalNotReached));
        console.log("[isolated-gate] CHILD_EXIT_CODE=" + childResult.code);
        console.log("[isolated-gate] PRODUCTION_MANIFEST=" + (manifestDiff.length === 0 ? "IDENTICAL" : "CHANGED"));
        console.log("[isolated-gate] CLOUD_SECRETS_VISIBLE_TO_CHILD=0");
        console.log("[isolated-gate] CLOUD_CALLS_ATTEMPTED=0");
    } catch (error) {
        isolationError = error.message;
        console.error("[isolated-gate] ERROR=" + error.stack);
    } finally {
        process.removeListener("SIGINT", onSigint);
        process.removeListener("SIGTERM", onSigterm);
        try {
            await fs.rm(tempRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
            cleanupSuccess = true;
        } catch (cleanupError) {
            isolationError = isolationError || ("cleanup failed: " + cleanupError.message);
        }
        console.log("[isolated-gate] CLEANUP=" + (cleanupSuccess ? "SUCCESS" : "FAILED"));
        const isolationPassed = !isolationError && cleanupSuccess;
        console.log("[isolated-gate] ISOLATION_STATUS=" + (isolationPassed ? "PASS" : "FAIL"));
        console.log("[isolated-gate] FUNCTIONAL_GATE_STATUS=" + (childResult.code === 0 ? "PASS" : "FAIL"));
    }

    if (receivedSignal === "SIGINT") return 130;
    if (receivedSignal === "SIGTERM") return 143;
    if (isolationError || !cleanupSuccess) return ISOLATION_FAILURE_EXIT;
    return childResult.code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const exitCode = await runIsolatedGate();
    process.exitCode = exitCode;
}
