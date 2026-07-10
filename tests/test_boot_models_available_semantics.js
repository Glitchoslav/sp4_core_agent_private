import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ollamaHealthCheck as compatOllamaHealthCheck, getModelRegistry } from '../sp4os/llmLocal.js';
import { runBootSequence } from '../src/startup/bootSequence.js';

const originalFetch = globalThis.fetch;

function createFetchMock({ ok = true, models = [], throws = false } = {}) {
    return async () => {
        if (throws) {
            throw new Error('offline');
        }

        return {
            ok,
            async json() {
                return { models };
            },
        };
    };
}

async function withMockedFetch(fetchMock, callback) {
    globalThis.fetch = fetchMock;

    try {
        await callback();
    } finally {
        globalThis.fetch = originalFetch;
    }
}

async function withFakeOllamaCommand(callback) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sp4-fake-ollama-'));
    const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') || 'PATH';
    const originalPath = process.env[pathKey] || '';
    const separator = path.delimiter;

    await fs.writeFile(path.join(tempDir, 'ollama.cmd'), '@echo off\r\nexit /b 0\r\n', 'utf8');
    await fs.writeFile(path.join(tempDir, 'ollama'), '#!/usr/bin/env sh\nexit 0\n', 'utf8');
    await fs.chmod(path.join(tempDir, 'ollama'), 0o755);

    process.env[pathKey] = `${tempDir}${separator}${originalPath}`;

    try {
        await callback();
    } finally {
        process.env[pathKey] = originalPath;
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

async function run() {
    console.log('🧪 TEST: boot modelsAvailable semantics');

    await withMockedFetch(async () => {
        return {
            ok: true,
            async json() {
                return { models: [{ name: 'gemma3:4b' }] };
            },
        };
    }, async () => {
        let calls = 0;
        await withMockedFetch(async () => {
            calls += 1;
            if (calls > 1) {
                throw new Error('boot should use a single Ollama snapshot probe');
            }

            return {
                ok: true,
                async json() {
                    return { models: [{ name: 'gemma3:4b' }] };
                },
            };
        }, async () => {
            const health = await runBootSequence({ quiet: true, autoStartOllama: false });
            assert.equal(health.checks.ollama, true, 'ollama should be healthy when /api/tags responds');
            assert.equal(health.checks.modelsAvailable, true, 'modelsAvailable should be true when at least one local model exists');
            assert.equal(calls, 1, 'boot should derive ollama and model state from one probe snapshot');
        });
    });

    await withMockedFetch(createFetchMock({ models: [] }), async () => {
        const health = await runBootSequence({ quiet: true, autoStartOllama: false });
        assert.equal(health.checks.ollama, true, 'ollama health should stay true even with empty registry');
        assert.equal(health.checks.modelsAvailable, false, 'modelsAvailable should be false when the registry is empty');
        assert.equal(health.ok, false, 'empty registry should keep boot health degraded until at least one local model exists');
    });

    await withMockedFetch(createFetchMock({ ok: false }), async () => {
        const health = await runBootSequence({ quiet: true, autoStartOllama: false });
        assert.equal(health.checks.ollama, false, 'ollama health should be false when /api/tags returns an HTTP error');
        assert.equal(health.checks.modelsAvailable, false, 'modelsAvailable should be false when /api/tags returns an HTTP error');
    });

    await withMockedFetch(createFetchMock({ throws: true }), async () => {
        const health = await runBootSequence({ quiet: true, autoStartOllama: false });
        assert.equal(health.checks.ollama, false, 'ollama health should be false when /api/tags is unreachable');
        assert.equal(health.checks.modelsAvailable, false, 'modelsAvailable should be false when Ollama is unreachable');
    });

    await withMockedFetch(createFetchMock({ throws: true }), async () => {
        const registry = await getModelRegistry();
        assert.equal(registry.healthy, false, 'compat registry should report unhealthy when Ollama is unreachable');
        assert.deepEqual(registry.available, [], 'compat registry should keep the model list empty when Ollama is unreachable');
        assert.ok(registry.lastCheck instanceof Date, 'compat registry should still surface a timestamp for offline probes');
    });

    await withMockedFetch(createFetchMock({ models: [{ name: 'mythomax:13b' }] }), async () => {
        const compatHealth = await compatOllamaHealthCheck();
        const registry = await getModelRegistry();
        assert.equal(compatHealth.healthy, true, 'compat health export should stay callable when Ollama responds');
        assert.deepEqual(
            registry.available.map((model) => model.name),
            ['mythomax:13b'],
            'compat registry should surface available models from the canonical health check'
        );
    });

    await withFakeOllamaCommand(async () => {
        let calls = 0;

        await withMockedFetch(async () => {
            calls += 1;

            if (calls === 1) {
                throw new Error('offline before cold start');
            }

            return {
                ok: true,
                async json() {
                    return { models: [{ name: 'gemma3:4b' }] };
                },
            };
        }, async () => {
            const health = await runBootSequence({ quiet: true, autoStartOllama: true });
            assert.equal(calls, 2, 'cold start path should do one failed initial probe and one startup snapshot probe');
            assert.equal(health.checks.ollama, true, 'cold start should recover Ollama reachability from the startup snapshot');
            assert.equal(health.checks.ollamaAutoStarted, true, 'cold start should mark Ollama as auto-started after recovery');
            assert.equal(health.checks.modelsAvailable, true, 'cold start should carry models from the startup snapshot');
            assert.equal(health.ok, true, 'cold start should end healthy once the startup snapshot returns a local model');
        });
    });

    console.log('✅ Boot modelsAvailable semantics work');
}

run().catch((error) => {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
});