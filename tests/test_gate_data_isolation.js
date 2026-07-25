import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(projectRoot, "scripts", "runIsolatedGate.js");
const fixture = path.join(projectRoot, "tests", "fixtures", "gate_isolation_child.js");
const productionFixture = path.join(projectRoot, "data", ".gate-isolation-owned-fixture.txt");
const expectedArtifacts = [
    "data/snippets/_index.json",
    "data/memory/core.json",
    "data/memory/shared.json",
    "data/memory/personas/core.json",
    "data/memory/personas/popici.json",
    "rules/user-behavior.log",
    "logs/scheduler.log",
    "logs/aios_costs.jsonl"
];
const fakeSecret = "gate-fixture-secret-never-visible";

function runFixture(mode) {
    const env = {
        ...process.env,
        SP4_TEST: "true",
        SP4_GATE_COMMAND: JSON.stringify(process.execPath) + " " + JSON.stringify(fixture),
        SP4_GATE_FIXTURE_MODE: mode,
        SP4_GATE_PRODUCTION_FIXTURE: productionFixture,
        SP4_GATE_EXPECTED_ARTIFACTS: JSON.stringify(expectedArtifacts),
        GROQ_API_KEY: fakeSecret,
        GEMINI_API_KEY: fakeSecret,
        GOOGLE_API_KEY: fakeSecret,
        MISTRAL_API_KEY: fakeSecret,
        ANTHROPIC_API_KEY: fakeSecret,
        OPENAI_API_KEY: fakeSecret,
        AZURE_OPENAI_API_KEY: fakeSecret
    };
    const result = spawnSync(process.execPath, [runner], {
        cwd: projectRoot,
        env,
        encoding: "utf8",
        timeout: 180000
    });
    const output = (result.stdout || "") + (result.stderr || "");
    const rootMatch = output.match(/TEMP_ROOT=(.+)/);
    const artifactsLine = output.split(/\r?\n/).find(line => line.includes("ARTIFACTS="));
    return {
        ...result,
        output,
        tempRoot: rootMatch ? rootMatch[1].trim() : null,
        artifacts: artifactsLine ? JSON.parse(artifactsLine.slice(artifactsLine.indexOf("ARTIFACTS=") + 10)) : []
    };
}

function assertCleanRun(result, expectedStatus) {
    assert.equal(result.status, expectedStatus, result.output);
    assert.ok(result.tempRoot, result.output);
    assert.equal(fs.existsSync(result.tempRoot), false, "temp root leaked: " + result.tempRoot);
    assert.match(result.output, /CLEANUP=SUCCESS/);
    assert.match(result.output, /PRODUCTION_MANIFEST=IDENTICAL/);
    assert.doesNotMatch(result.output, new RegExp(fakeSecret));
}

const productionFixtureExisted = fs.existsSync(productionFixture);
const productionFixtureBefore = productionFixtureExisted ? await fsp.readFile(productionFixture) : null;
const tempRoots = new Set();

try {
    const successOne = runFixture("success");
    assertCleanRun(successOne, 0);
    tempRoots.add(successOne.tempRoot);
    for (const artifact of expectedArtifacts) assert.ok(successOne.artifacts.includes(artifact), "missing " + artifact);
    assert.equal(successOne.artifacts.filter(item => item.startsWith("data/snippets/") && item.endsWith(".txt")).length, 1);

    const failed = runFixture("failure");
    assertCleanRun(failed, 7);
    tempRoots.add(failed.tempRoot);

    const successTwo = runFixture("success");
    assertCleanRun(successTwo, 0);
    tempRoots.add(successTwo.tempRoot);
    assert.notEqual(successOne.tempRoot, successTwo.tempRoot, "two runs reused temp state");

    const violation = runFixture("production-write");
    assert.equal(violation.status, 86, violation.output);
    assert.match(violation.output, /PRODUCTION_MANIFEST=CHANGED/);
    assert.match(violation.output, /data\/.gate-isolation-owned-fixture\.txt/);
    assert.match(violation.output, /CLEANUP=SUCCESS/);
    assert.ok(violation.tempRoot && !fs.existsSync(violation.tempRoot));
    tempRoots.add(violation.tempRoot);

    assert.equal(tempRoots.size, 4, "isolated runs leaked or reused temp roots");
} finally {
    if (productionFixtureExisted) await fsp.writeFile(productionFixture, productionFixtureBefore);
    else await fsp.rm(productionFixture, { force: true });
}

console.log("PASS: isolated gate runner contains writers, sanitizes cloud env, detects production changes, and cleans temp state");
