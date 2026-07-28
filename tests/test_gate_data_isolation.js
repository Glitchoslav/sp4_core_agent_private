import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildProductionManifest, diffManifests } from "../scripts/runIsolatedGate.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(projectRoot, "scripts", "runIsolatedGate.js");
const fixture = path.join(projectRoot, "tests", "fixtures", "gate_isolation_child.js");
const productionFixture = path.join(projectRoot, "data", ".gate-isolation-owned-fixture.txt");
const productionEpoch = path.join(projectRoot, "data", "epochs.json");
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
const tempEpochScript = [
    "const fs=require('node:fs')",
    "const path=require('node:path')",
    "const root=process.env.SP4_RUNTIME_ROOT",
    "if(process.env.SP4_TEST!=='true'||!root)process.exit(9)",
    "fs.mkdirSync(path.join(root,'data'),{recursive:true})",
    "fs.writeFileSync(path.join(root,'data','epochs.json'),'[]\\n','utf8')"
].join(";");

function parseOutputArray(output, marker) {
    const line = output.split(/\r?\n/).find(item => item.includes(marker));
    return line ? JSON.parse(line.slice(line.indexOf(marker) + marker.length)) : [];
}

function runFixture(mode, options = {}) {
    const command = options.command || (JSON.stringify(process.execPath) + " " + JSON.stringify(fixture));
    const expected = options.expectedArtifacts || expectedArtifacts;
    const env = {
        ...process.env,
        SP4_TEST: "true",
        SP4_GATE_COMMAND: command,
        SP4_GATE_FIXTURE_MODE: mode,
        SP4_GATE_PRODUCTION_FIXTURE: productionFixture,
        SP4_GATE_EXPECTED_ARTIFACTS: JSON.stringify(expected),
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
    return {
        ...result,
        output,
        tempRoot: rootMatch ? rootMatch[1].trim() : null,
        artifacts: parseOutputArray(output, "ARTIFACTS="),
        optionalNotReached: parseOutputArray(output, "OPTIONAL_ARTIFACTS_NOT_REACHED=")
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

async function assertProductionEpochUnchanged(existed, before) {
    assert.equal(fs.existsSync(productionEpoch), existed, "production epochs existence changed");
    if (existed) assert.deepEqual(await fsp.readFile(productionEpoch), before, "production epochs content changed");
}

const productionFixtureExisted = fs.existsSync(productionFixture);
const productionFixtureBefore = productionFixtureExisted ? await fsp.readFile(productionFixture) : null;
const productionEpochExisted = fs.existsSync(productionEpoch);
const productionEpochBefore = productionEpochExisted ? await fsp.readFile(productionEpoch) : null;
const tempRoots = new Set();

try {
    // A: a successful child may legitimately skip the conditional epoch branch.
    const successOne = runFixture("success");
    assertCleanRun(successOne, 0);
    tempRoots.add(successOne.tempRoot);
    for (const artifact of expectedArtifacts) assert.ok(successOne.artifacts.includes(artifact), "missing " + artifact);
    assert.equal(successOne.artifacts.includes("data/epochs.json"), false);
    assert.ok(successOne.optionalNotReached.includes("data/epochs.json"), successOne.output);
    assert.equal(successOne.artifacts.filter(item => item.startsWith("data/snippets/") && item.endsWith(".txt")).length, 1);
    await assertProductionEpochUnchanged(productionEpochExisted, productionEpochBefore);

    // B: when reached, epochs.json is captured strictly under the temp runtime root.
    const tempEpoch = runFixture("temp-epoch", {
        command: JSON.stringify(process.execPath) + " -e " + JSON.stringify(tempEpochScript),
        expectedArtifacts: ["data/epochs.json"]
    });
    assertCleanRun(tempEpoch, 0);
    tempRoots.add(tempEpoch.tempRoot);
    assert.ok(tempEpoch.artifacts.includes("data/epochs.json"), tempEpoch.output);
    assert.equal(tempEpoch.optionalNotReached.includes("data/epochs.json"), false, tempEpoch.output);
    await assertProductionEpochUnchanged(productionEpochExisted, productionEpochBefore);

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

    // C: the exact production epochs path is detected by the same manifest guard in a safe fake project root.
    const manifestRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "sp4-epoch-manifest-"));
    try {
        for (const dir of ["data", "logs", "rules"]) await fsp.mkdir(path.join(manifestRoot, dir), { recursive: true });
        const before = await buildProductionManifest(manifestRoot);
        await fsp.writeFile(path.join(manifestRoot, "data", "epochs.json"), "fixture violation\n", "utf8");
        const after = await buildProductionManifest(manifestRoot);
        const diff = diffManifests(before, after);
        assert.deepEqual(diff.map(item => item.path), ["data/epochs.json"]);
        assert.equal(diff[0].change, "added");
    } finally {
        await fsp.rm(manifestRoot, { recursive: true, force: true });
    }

    await assertProductionEpochUnchanged(productionEpochExisted, productionEpochBefore);
    assert.equal(tempRoots.size, 5, "isolated runs leaked or reused temp roots");
} finally {
    if (productionFixtureExisted) await fsp.writeFile(productionFixture, productionFixtureBefore);
    else await fsp.rm(productionFixture, { force: true });
}

console.log("PASS: isolated gate treats epochs as conditional, contains temp writes, detects production manifest changes, and cleans temp state");