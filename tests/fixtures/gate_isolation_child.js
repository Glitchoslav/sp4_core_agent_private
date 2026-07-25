import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const runtimeRoot = process.env.SP4_RUNTIME_ROOT;
assert.equal(process.env.SP4_TEST, "true");
assert.equal(process.env.USE_CLOUD_FALLBACK, "false");
assert.ok(runtimeRoot && path.isAbsolute(runtimeRoot));

const cloudKeys = [
    "GROQ_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "MISTRAL_API_KEY",
    "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "AZURE_OPENAI_API_KEY"
];
for (const key of cloudKeys) assert.equal(process.env[key], undefined, key + " leaked to child");

const paths = await import("../../config/paths.js");
for (const [name, value] of Object.entries(paths.ALL_PATHS)) {
    if (typeof value !== "string" || name === "PROJECT_ROOT") continue;
    if (name === "ROOT" || name === "RUNTIME_ROOT" || name.endsWith("DIR") || name.endsWith("FILE") || name.endsWith("LOG") || name.endsWith("PATH")) {
        assert.ok(path.resolve(value).startsWith(path.resolve(runtimeRoot) + path.sep) || path.resolve(value) === path.resolve(runtimeRoot), name + " escaped runtime root");
    }
}

const mode = process.env.SP4_GATE_FIXTURE_MODE || "success";
if (mode === "production-write") {
    const fixturePath = process.env.SP4_GATE_PRODUCTION_FIXTURE;
    assert.ok(fixturePath, "production fixture path required");
    await fs.writeFile(fixturePath, "intentional isolation violation", "utf8");
}

const { executeSaveSnippet } = await import("../../src/core/actions/saveSnippet.js");
const snippetResult = await executeSaveSnippet({ title: "Gate Isolation Fixture", content: "isolated", tags: ["test"] }, { persona: "core" });
assert.equal(snippetResult.success, true);
assert.ok(path.resolve(snippetResult.result.filepath).startsWith(path.resolve(paths.SNIPPETS_DIR) + path.sep));

const hierarchy = await import("../../memory/memoryHierarchy.js");
await hierarchy.loadMemoryForPersona("glitchoslav");

const { RuleMiningPipeline } = await import("../../ruleMiningPipeline.js");
const pipeline = new RuleMiningPipeline();
await pipeline.auditTrail({ type: "gate_isolation_fixture" });

const scheduler = await import("../../src/core/scheduler.js");
scheduler.registerJob({
    id: "gate_isolation_fixture",
    cron: "0 0 1 1 *",
    handler: () => {},
    description: "isolated fixture",
    enabled: false
});

const { executeOpenUrl } = await import("../../src/core/actions/openUrl.js");
const openResult = await executeOpenUrl({ url: "https://example.invalid" }, { persona: "core" });
assert.equal(openResult.skipped, true);
assert.equal(openResult.reason, "disabled_in_test_mode");

const { SP4IntegratedAgent } = await import("../../integration.js");
const agent = new SP4IntegratedAgent();
assert.equal(agent.cloudAIEnabled, false);
assert.equal(agent.aiosBridge.config.costLogPath, paths.AIOS_COST_LOG_FILE);
for (const provider of ["openai", "anthropic", "google", "mistral", "groq"]) {
    assert.equal(agent.aiosBridge.providers[provider].apiKey, undefined, provider + " secret visible");
}
await agent.aiosBridge.logCost({ provider: "fixture", cost: 0 });

await new Promise(resolve => setTimeout(resolve, 100));
if (mode === "failure") process.exitCode = 7;
