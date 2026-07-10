import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SP4IntegratedAgent } from '../integration.js';
import { loadMemory, saveMemory } from '../memory.js';
import { buildPrompt } from '../multiVoice.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const MEMORY_PATH = path.join(ROOT, 'data', 'memory.json');
const CLI_SOURCE = path.join(ROOT, 'index_v07.js');
const QUERY = 'Vysvetli mi ako funguje SP4 memory system? Potrebujem prakticke vysvetlenie v troch vetach.';
const CLI_SMOKE_QUERY = 'ahoj';
const TODAY = new Date().toISOString().split('T')[0];
const PERSONA_HEADER_PATTERN = /(🧠 CORE|💥 POPIČI KOKOT|🌀 GLITCHOSLAV|🔥 SP4):/;
const CLI_READY_PATTERN = /(Denný rituál je pripravený: \/today|SP4 OS|👤|╔════════|GLITCH|VALID|version)/;

function getRawLog(memory) {
    return memory?.rawMemory?.log || [];
}

function normalizeBaseline(memory) {
    const next = structuredClone(memory);
    next.rawMemory = { log: [], stats: { totalInteractions: 0 } };
    next.sessionMetadata = {
        ...(next.sessionMetadata || {}),
        lastSessionDate: TODAY,
    };
    next.onboarding = {
        stage: 3,
        completed: true,
        discoveries: next.onboarding?.discoveries || {},
    };
    next.preferences = {
        ...(next.preferences || {}),
        defaultMode: 'core',
    };
    return next;
}

function extractLineHandlerBlock(source) {
    const startMarker = "rl.on('line', async (input) => {";
    const endMarker = '\n// Start';
    const startIndex = source.indexOf(startMarker);
    assert.notEqual(startIndex, -1, 'CLI line handler marker not found');

    const endIndex = source.indexOf(endMarker, startIndex);
    assert.notEqual(endIndex, -1, 'CLI line handler end marker not found');

    return source.slice(startIndex, endIndex);
}

function assertCliWritebackGuard(source) {
    const lineHandler = extractLineHandlerBlock(source);

    assert.doesNotMatch(
        source,
        /import\s*\{[^}]*\baddLogEntry\b[^}]*\}\s*from\s*["']\.\/memory\.js["']/,
        'CLI must not import addLogEntry from memory.js'
    );

    assert.match(lineHandler, /const result = await agent\.ask\(trimmed,\s*\{/);
    assert.doesNotMatch(
        lineHandler,
        /const result = await agent\.ask\(trimmed,\s*\{[\s\S]*?await\s+addLogEntry\(/,
        'CLI line handler must not perform a direct post-ask addLogEntry write'
    );
}

async function waitForOutput(child, matcher, timeoutMs) {
    let stdout = '';
    let stderr = '';

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error(`Timeout waiting for CLI output: ${matcher}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
        }, timeoutMs);

        const onStdout = (chunk) => {
            stdout += chunk.toString();
            if (matcher.test(stdout)) {
                cleanup();
                resolve({ stdout, stderr });
            }
        };

        const onStderr = (chunk) => {
            stderr += chunk.toString();
        };

        const onExit = (code) => {
            cleanup();
            reject(new Error(`CLI exited before expected output (code=${code})\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
        };

        function cleanup() {
            clearTimeout(timeout);
            child.stdout.off('data', onStdout);
            child.stderr.off('data', onStderr);
            child.off('exit', onExit);
        }

        child.stdout.on('data', onStdout);
        child.stderr.on('data', onStderr);
        child.on('exit', onExit);
    });
}

async function waitForCliReady(child, timeoutMs) {
    let stdout = '';
    let stderr = '';
    let settleTimer = null;

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error(`Timeout waiting for CLI readiness\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
        }, timeoutMs);

        const resolveReady = () => {
            cleanup();
            resolve({ stdout, stderr });
        };

        const scheduleIdleResolve = () => {
            clearTimeout(settleTimer);
            settleTimer = setTimeout(() => {
                if (stdout.length > 0) {
                    resolveReady();
                }
            }, 1500);
        };

        const onStdout = (chunk) => {
            stdout += chunk.toString();
            if (CLI_READY_PATTERN.test(stdout)) {
                resolveReady();
                return;
            }
            scheduleIdleResolve();
        };

        const onStderr = (chunk) => {
            stderr += chunk.toString();
        };

        const onExit = (code) => {
            cleanup();
            reject(new Error(`CLI exited before readiness (code=${code})\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
        };

        function cleanup() {
            clearTimeout(timeout);
            clearTimeout(settleTimer);
            child.stdout.off('data', onStdout);
            child.stderr.off('data', onStderr);
            child.off('exit', onExit);
        }

        child.stdout.on('data', onStdout);
        child.stderr.on('data', onStderr);
        child.on('exit', onExit);
    });
}

async function runOptionalInteractiveCliSmoke() {
    if (process.env.SP4_CLI_SMOKE !== '1') {
        return { executed: false };
    }

    const baseline = normalizeBaseline(await loadMemory());
    await saveMemory(baseline);

    const child = spawn(process.execPath, [CLI_SOURCE], {
        cwd: ROOT,
        env: {
            ...process.env,
            SP4_TEST: 'true',
            SP4_VERBOSE: '0',
            SP4_DEBUG: 'false',
        },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    try {
        await waitForCliReady(child, 120000);
        child.stdin.write(`${CLI_SMOKE_QUERY}\n`);
        const cliOutput = await waitForOutput(child, PERSONA_HEADER_PATTERN, 120000);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const finalMemory = await loadMemory();
        const rawLog = getRawLog(finalMemory);
        assert.equal(
            rawLog.length,
            1,
            `Interactive CLI smoke expected exactly one persistent write, got ${rawLog.length}\nSTDOUT:\n${cliOutput.stdout}\nSTDERR:\n${cliOutput.stderr}`
        );
        assert.equal(rawLog[0].input, CLI_SMOKE_QUERY, 'Interactive CLI smoke stored input must match the smoke query');

        return { executed: true };
    } finally {
        if (!child.killed && child.exitCode == null) {
            child.kill();
        }
    }
}

async function run() {
    console.log('TEST: CLI single-write invariant');

    const originalExists = existsSync(MEMORY_PATH);
    const originalMemory = originalExists ? await fs.readFile(MEMORY_PATH, 'utf8') : null;

    try {
        const baseline = normalizeBaseline(await loadMemory());
        await saveMemory(baseline);

        const source = await fs.readFile(CLI_SOURCE, 'utf8');
        assertCliWritebackGuard(source);

        process.env.SP4_TEST = 'true';
        process.env.SP4_VERBOSE = '0';
        process.env.SP4_DEBUG = 'false';

        const memory = await loadMemory();
        const state = {
            relationshipModel: { level: memory.relationship?.stage || 'Stranger' },
            emotionalContext: { currentMood: 'neutral', intensity: 0 },
            metrics: { interactions: memory.rawMemory?.log?.length || 0 },
            capabilityLevel: 'FULL',
            user: { name: memory.userProfile?.name || 'Kefyk' }
        };
        const promptPackage = buildPrompt({
            mode: 'core',
            state,
            userMessage: QUERY,
            extraDirectives: ''
        });

        const agent = new SP4IntegratedAgent();
        const initResult = await agent.initialize();
        assert.equal(initResult.success, true, `Agent initialize failed: ${initResult.error || 'unknown error'}`);

        const result = await agent.ask(QUERY, {
            mode: 'core',
            systemPrompt: promptPackage.systemPrompt
        });

        assert.equal(typeof result.response, 'string');
        assert.ok(result.response.trim().length > 0, 'ask() must return a non-empty response');

        const finalMemory = await loadMemory();
        const rawLog = getRawLog(finalMemory);
        assert.equal(rawLog.length, 1, `Expected exactly one persistent write, got ${rawLog.length}`);
        assert.equal(rawLog[0].input, QUERY, 'Stored input must match the CLI query');
        assert.equal(typeof rawLog[0].reply, 'string');
        assert.ok(rawLog[0].reply.trim().length > 0, 'Stored reply must be non-empty');

        const smoke = await runOptionalInteractiveCliSmoke();

        console.log('OK: one CLI turn produced exactly one persistent write');
        if (smoke.executed) {
            console.log('OK: optional interactive CLI smoke also produced exactly one persistent write');
        }
    } catch (error) {
        console.error(`FAIL: ${error.message}`);
        process.exitCode = 1;
    } finally {
        if (originalExists) {
            await fs.writeFile(MEMORY_PATH, originalMemory, 'utf8');
        } else if (existsSync(MEMORY_PATH)) {
            await fs.unlink(MEMORY_PATH);
        }
    }
}

await run();