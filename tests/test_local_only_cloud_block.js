import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "sp4-local-only-"));
process.env.SP4_RUNTIME_ROOT = tempRoot;
process.env.SP4_DATA_ROOT = path.join(tempRoot, "data");
process.env.GROQ_API_KEY = "fake-local-only-contract-key";
process.env.OLLAMA_MAX_RETRIES = "0";
process.env.USE_CLOUD_FALLBACK = "true";

let localCalls = 0;
let cloudCalls = 0;
let firewallCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async url => {
    const value = String(url);
    if (value.includes("localhost:11434")) {
        localCalls++;
        throw new Error("fetch ECONNREFUSED fixture");
    }
    if (value.includes("localhost:3003")) {
        firewallCalls++;
        return { ok: false, status: 503, text: async () => "offline" };
    }
    if (value.includes("api.groq.com")) {
        cloudCalls++;
        return {
            ok: true,
            json: async () => ({ choices: [{ message: { content: "cloud fixture" } }] })
        };
    }
    throw new Error("unexpected network target: " + value);
};

try {
    const { sp4LlmCall } = await import("../src/llm/llmRouter.js?local-only-contract");
    const { getOllamaHealthStatus } = await import("../src/llm/ollamaClient.js");
    const { assembleUnifiedMetadata } = await import("../src/pipeline/metadataAssemblyStep.js");
    const request = { preference: "local-first", model: "fixture", prompt: "test" };

    process.env.SP4_TEST = "true";
    const testResult = await sp4LlmCall(request);
    assert.equal(testResult.ok, false);
    assert.equal(cloudCalls, 0, "SP4_TEST attempted cloud fallback");
    assert.equal(firewallCalls, 0, "SP4_TEST consulted cloud firewall path");

    delete process.env.SP4_TEST;
    await sp4LlmCall({ ...request, forceLocal: true });
    await sp4LlmCall({ ...request, policy: { forceLocal: true } });
    assert.equal(getOllamaHealthStatus().unhealthy, true, "fixture did not mark local provider unhealthy");

    const forceLocalResult = await sp4LlmCall({ ...request, forceLocal: true });
    assert.equal(forceLocalResult.ok, false);
    assert.equal(cloudCalls, 0, "forceLocal attempted cloud fallback");
    assert.equal(firewallCalls, 0, "forceLocal consulted cloud path");

    const noPolicyResult = await sp4LlmCall(request);
    assert.equal(noPolicyResult.ok, false);
    assert.equal(noPolicyResult.error, "cloud_policy_required");
    assert.equal(cloudCalls, 0, "local-first without explicit policy attempted cloud");

    const productionResult = await sp4LlmCall({
        ...request,
        policy: { allowCloud: true },
    });
    assert.equal(productionResult.ok, true);
    assert.equal(productionResult.engine, "cloud-preemptive");
    assert.equal(cloudCalls, 1, "explicit cloud policy lost fallback capability");

    process.env.SP4_TEST = "true";
    const metadata = assembleUnifiedMetadata({
        policy: { forceLocal: true, allowCloud: false },
        testMode: true,
        deliberationMeta: { provider: "local_fixture" },
        selectedModel: "fixture",
        processingTime: 1,
        emotionalAnalysis: {},
        capabilityLevel: "test",
        taskType: "test",
        groundingPrompt: null,
        confidenceResult: { score: 1, label: "high", factors: [] },
        cloudUsed: false
    });
    assert.equal(metadata.provider, "local_fixture");
    assert.equal(metadata.execution.provider, "local_fixture");
    assert.notEqual(metadata.provider, undefined);
} finally {
    globalThis.fetch = originalFetch;
    delete process.env.SP4_TEST;
    delete process.env.SP4_RUNTIME_ROOT;
    delete process.env.SP4_DATA_ROOT;
    delete process.env.GROQ_API_KEY;
    delete process.env.OLLAMA_MAX_RETRIES;
    delete process.env.USE_CLOUD_FALLBACK;
    await fs.rm(tempRoot, { recursive: true, force: true });
}

console.log("PASS: local-only and missing policy block cloud while explicit policy preserves fallback");
