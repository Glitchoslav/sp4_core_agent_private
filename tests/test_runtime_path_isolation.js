import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pathNames = [
    "DATA_DIR", "MEMORY_FILE", "IDENTITY_FILE", "EPOCH_FILE", "IMMUNE_LOG_FILE",
    "MEMORY_HIERARCHY_DIR", "LOGS_DIR", "AUTONOMOUS_DECISIONS_FILE", "AIOS_COST_LOG_FILE",
    "SCHEDULER_LOG_FILE", "AGENT_LOG_FILE", "AUTONOMOUS_LEARNING_FILE", "RULES_DIR", "PATTERN_HISTORY_FILE",
    "RULEBOOK_FILE", "AUTO_TUNING_FILE", "USER_BEHAVIOR_LOG", "RULE_BACKUPS_DIR", "SNIPPETS_DIR"
];
const script = "import('./config/paths.js').then(m=>console.log(JSON.stringify(Object.fromEntries(" + JSON.stringify(pathNames) + ".map(k=>[k,m[k]])))))";

function snapshot(envChanges = {}) {
    const env = { ...process.env };
    for (const key of ["SP4_RUNTIME_ROOT", "SP4_DATA_ROOT", "SP4_RAW_LOG_DIR", "SP4_CHAPTERS_DIR", "SP4_ARCHIVE_DIR", "SP4_SEEDS_DIR", "SP4_EPOCH_LOG"]) delete env[key];
    Object.assign(env, envChanges);
    const result = spawnSync(process.execPath, ["-e", script], { cwd: projectRoot, env, encoding: "utf8" });
    if (result.status !== 0) throw new Error((result.stdout || "") + (result.stderr || ""));
    return JSON.parse(result.stdout.trim());
}

const production = snapshot();
const expected = {
    DATA_DIR: path.join(projectRoot, "data"),
    MEMORY_FILE: path.join(projectRoot, "data", "memory.json"),
    IDENTITY_FILE: path.join(projectRoot, "data", "identity.json"),
    EPOCH_FILE: path.join(projectRoot, "data", "epochs.json"),
    IMMUNE_LOG_FILE: path.join(projectRoot, "data", "immune_log.jsonl"),
    MEMORY_HIERARCHY_DIR: path.join(projectRoot, "data", "memory"),
    LOGS_DIR: path.join(projectRoot, "logs"),
    AUTONOMOUS_DECISIONS_FILE: path.join(projectRoot, "logs", "autonomous_decisions.jsonl"),
    AIOS_COST_LOG_FILE: path.join(projectRoot, "logs", "aios_costs.jsonl"),
    SCHEDULER_LOG_FILE: path.join(projectRoot, "logs", "scheduler.log"),
    AGENT_LOG_FILE: path.join(projectRoot, "logs", "agent.log"),
    AUTONOMOUS_LEARNING_FILE: path.join(projectRoot, "data", "autonomous_learning.json"),
    RULES_DIR: path.join(projectRoot, "rules"),
    PATTERN_HISTORY_FILE: path.join(projectRoot, "rules", "pattern-history.json"),
    RULEBOOK_FILE: path.join(projectRoot, "rules", "rulebook.yml"),
    AUTO_TUNING_FILE: path.join(projectRoot, "rules", "auto-tuning.yml"),
    USER_BEHAVIOR_LOG: path.join(projectRoot, "rules", "user-behavior.log"),
    RULE_BACKUPS_DIR: path.join(projectRoot, "rules", "backups"),
    SNIPPETS_DIR: path.join(projectRoot, "data", "snippets")
};
assert.deepEqual(production, expected);

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "sp4-path-contract-"));
try {
    const isolated = snapshot({ SP4_RUNTIME_ROOT: tempRoot });
    for (const value of Object.values(isolated)) {
        assert.ok(path.resolve(value).startsWith(path.resolve(tempRoot) + path.sep), value + " escaped temp root");
    }
    assert.equal(isolated.DATA_DIR, path.join(tempRoot, "data"));
    assert.equal(isolated.SNIPPETS_DIR, path.join(tempRoot, "data", "snippets"));
    assert.equal(isolated.SCHEDULER_LOG_FILE, path.join(tempRoot, "logs", "scheduler.log"));
    assert.equal(isolated.AGENT_LOG_FILE, path.join(tempRoot, "logs", "agent.log"));

    const legacyDataRoot = path.join(tempRoot, "legacy-data-root");
    const legacy = snapshot({ SP4_DATA_ROOT: legacyDataRoot });
    assert.equal(legacy.DATA_DIR, legacyDataRoot);
    assert.equal(legacy.MEMORY_FILE, path.join(legacyDataRoot, "memory.json"));

    const escaped = spawnSync(process.execPath, ["-e", script], {
        cwd: projectRoot,
        env: { ...process.env, SP4_RUNTIME_ROOT: tempRoot, SP4_RAW_LOG_DIR: projectRoot },
        encoding: "utf8"
    });
    assert.notEqual(escaped.status, 0, "escaping path override was accepted");
} finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
}

console.log("PASS: production path parity, SP4_DATA_ROOT semantics, runtime containment, snippets and scheduler paths");
