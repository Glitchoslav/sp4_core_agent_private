import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp4-binding-c-'));
const decisionLog = path.join(testDir, 'constitution_decisions.jsonl');
process.env.SP4_CONSTITUTION_LOG_PATH = decisionLog;

const { SP4AIOSBridge } = await import('../../SP4AIOS/src/bridge.js');
const { ConstitutionalBlockError } = await import('../src/constitution/loader.js');

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        passed++;
        console.log(`PASS ${name}`);
    } catch (error) {
        failed++;
        console.error(`FAIL ${name}: ${error.stack || error.message}`);
    }
}

function createBridge() {
    const bridge = new SP4AIOSBridge({
        enableCache: false,
        enableCostTracking: false
    });
    const calls = new Map();

    for (const provider of ['groq', 'openai', 'anthropic', 'google', 'mistral']) {
        calls.set(provider, 0);
        bridge.providers[provider] = {
            apiKey: 'test-key',
            complete: async () => {
                calls.set(provider, calls.get(provider) + 1);
                return {
                    text: `mock ${provider}`,
                    model: `mock-${provider}`,
                    usage: { promptTokens: 1, completionTokens: 1 },
                    cost: 0
                };
            }
        };
    }

    return { bridge, calls };
}

async function expectBlock(promise, reason) {
    await assert.rejects(
        promise,
        (error) => error instanceof ConstitutionalBlockError && error.reason === reason
    );
}

await test('A allowCloud:false + groq makes zero provider calls', async () => {
    const { bridge, calls } = createBridge();
    await expectBlock(
        bridge.ask('blocked groq', {
            provider: 'groq',
            policyAllowCloud: false,
            useCache: false
        }),
        'policy_disallows_cloud'
    );
    assert.equal(calls.get('groq'), 0);
});

await test('B allowCloud:false + google makes zero provider calls', async () => {
    const { bridge, calls } = createBridge();
    await expectBlock(
        bridge.ask('blocked google', {
            provider: 'google',
            policyAllowCloud: false,
            useCache: false
        }),
        'policy_disallows_cloud'
    );
    assert.equal(calls.get('google'), 0);
});

await test('C unknown provider blocks before any provider call', async () => {
    const { bridge, calls } = createBridge();
    await expectBlock(
        bridge.ask('unknown provider', {
            provider: 'future-unknown',
            policyAllowCloud: true,
            useCache: false
        }),
        'unknown_provider'
    );
    assert.equal([...calls.values()].reduce((sum, count) => sum + count, 0), 0);
});

await test('D unknown data category blocks before groq', async () => {
    const { bridge, calls } = createBridge();
    await expectBlock(
        bridge.ask('unknown category', {
            provider: 'groq',
            dataCategory: 'not_registered',
            policyAllowCloud: true,
            useCache: false
        }),
        'unknown_category'
    );
    assert.equal(calls.get('groq'), 0);
});

await test('E explicit allowCloud:true and allowed pair reaches provider', async () => {
    const { bridge, calls } = createBridge();
    const result = await bridge.ask('allowed groq', {
        provider: 'groq',
        dataCategory: 'conversation_text',
        policyAllowCloud: true,
        useCache: false
    });
    assert.equal(calls.get('groq'), 1);
    assert.equal(result.text, 'mock groq');
});

await test('F OpenAI, Anthropic, Google and Mistral are governance-covered', async () => {
    for (const provider of ['openai', 'anthropic', 'google', 'mistral']) {
        const { bridge, calls } = createBridge();
        await expectBlock(
            bridge.ask(`blocked ${provider}`, {
                provider,
                dataCategory: 'conversation_text',
                policyAllowCloud: true,
                useCache: false
            }),
            'policy_denies'
        );
        assert.equal(calls.get(provider), 0);
    }
});

await test('G intelligentRoute cannot bypass ask/mayEgress', async () => {
    const { bridge, calls } = createBridge();
    await expectBlock(
        bridge.intelligentRoute('high priority route', {
            priority: 'high',
            policyAllowCloud: false,
            useCache: false
        }),
        'policy_disallows_cloud'
    );
    assert.equal(calls.get('groq'), 0);
});

await test('known category and sink without an explicit pair blocks', async () => {
    const { bridge, calls } = createBridge();
    await expectBlock(
        bridge.ask('missing pair', {
            provider: 'openai',
            dataCategory: 'collective_insight',
            policyAllowCloud: true,
            useCache: false
        }),
        'no_policy_for_pair'
    );
    assert.equal(calls.get('openai'), 0);
});

await test('registered provider without sink mapping blocks as unknown sink', async () => {
    const { bridge } = createBridge();
    let calls = 0;
    bridge.providers.futurecloud = {
        complete: async () => {
            calls++;
            return { text: 'must not run' };
        }
    };
    await expectBlock(
        bridge.ask('unknown sink', {
            provider: 'futurecloud',
            policyAllowCloud: true,
            useCache: false
        }),
        'unknown_sink'
    );
    assert.equal(calls, 0);
});

await test('missing explicit policyAllowCloud blocks', async () => {
    const { bridge, calls } = createBridge();
    await expectBlock(
        bridge.ask('missing policy context', {
            provider: 'groq',
            useCache: false
        }),
        'policy_context_missing'
    );
    assert.equal(calls.get('groq'), 0);
});

await test('BLOCK log contains no prompt or systemPrompt content', async () => {
    const promptSentinel = 'PROMPT_SECRET_BINDING_C_9f4e';
    const systemSentinel = 'SYSTEM_SECRET_BINDING_C_2a7d';
    const { bridge } = createBridge();
    await expectBlock(
        bridge.ask(promptSentinel, {
            provider: 'groq',
            systemPrompt: systemSentinel,
            policyAllowCloud: false,
            requestId: 'binding-c-log-test',
            useCache: false
        }),
        'policy_disallows_cloud'
    );

    const log = fs.readFileSync(decisionLog, 'utf8');
    assert.equal(log.includes(promptSentinel), false);
    assert.equal(log.includes(systemSentinel), false);
    assert.equal(log.includes('binding-c-log-test'), true);
});

fs.rmSync(testDir, { recursive: true, force: true });

console.log(`\nConstitution Binding C: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
