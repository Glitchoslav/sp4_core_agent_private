import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productionLog = path.join(projectRoot, "logs", "agent.log");
const fingerprint = filePath => {
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath);
    return { size: data.length, sha256: crypto.createHash("sha256").update(data).digest("hex") };
};
const before = fingerprint(productionLog);
const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "sp4-agent-log-"));

try {
    const code = "import('./logger.js').then(async m=>{await m.logInfo('isolated agent log fixture');const p=await import('./config/paths.js');console.log(p.AGENT_LOG_FILE)})";
    const env = { ...process.env, SP4_TEST: "true", SP4_RUNTIME_ROOT: tempRoot };
    delete env.SP4_DATA_ROOT;
    const child = spawnSync(process.execPath, ["-e", code], { cwd: projectRoot, env, encoding: "utf8" });
    assert.equal(child.status, 0, (child.stdout || "") + (child.stderr || ""));
    const tempLog = path.join(tempRoot, "logs", "agent.log");
    assert.equal(child.stdout.trim(), tempLog);
    assert.equal(fs.existsSync(tempLog), true);
    assert.match(await fsp.readFile(tempLog, "utf8"), /isolated agent log fixture/);
    assert.deepEqual(fingerprint(productionLog), before, "production agent.log changed");
} finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
}

assert.deepEqual(fingerprint(productionLog), before, "production agent.log changed after cleanup");
console.log("PASS: agent.log path parity and temp-only write isolation");
