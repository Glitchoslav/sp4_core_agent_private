/**
 * 🧪 CONSTITUTION V1 — POLICY THREADING TESTS (integration.js → askCloudAI → SP4AIOSBridge)
 *
 * Tests the effective-policy chain added on top of already-committed Binding C
 * (SP4AIOS/src/bridge.js). Verifies resolvePolicy()'s allowCloud result — passed
 * by the caller as options.policy — actually reaches mayEgress() at the bottom
 * of the chain, through BOTH askCloudAI()'s direct-provider branch and its
 * intelligentRoute() branch, without ever being hardcoded to true along the way.
 *
 * Runs SP4IntegratedAgent.prototype.askCloudAI() directly (via .call() against a
 * minimal stub `this`) rather than booting the full agent — askCloudAI only
 * touches this.aiosBridge/this.dailyCloudCost/this.lastLocalError/
 * this.estimateComplexity/this.getCloudSystemPrompt, none of which need Ollama,
 * memory files, or the autonomous controller to exist. The real SP4AIOSBridge
 * class and its real mayEgress() gate are used (not mocked). Only each
 * provider's own complete() is stubbed (same technique as
 * test_constitution_binding_c.js) — node-fetch is a named import inside
 * bridge.js, not the global fetch, so a global fetch mock can't intercept it;
 * stubbing complete() is also the cleaner boundary: it's exactly the line
 * after the Constitution gate and before any real network call.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
    if (condition) {
        passed++;
        console.log(`   ✅ ${name}`);
    } else {
        failed++;
        failures.push(name);
        console.log(`   ❌ ${name}${detail ? ' — ' + detail : ''}`);
    }
}

async function main() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 CONSTITUTION V1 — POLICY THREADING TESTS (askCloudAI → SP4AIOSBridge)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.env.SP4_TEST = 'false'; // must NOT be 'true' — askCloudAI short-circuits on that

    const { SP4IntegratedAgent } = await import('../integration.js');
    const { default: SP4AIOSBridge } = await import('../../SP4AIOS/src/bridge.js');

    const askCloudAI = SP4IntegratedAgent.prototype.askCloudAI;
    const estimateComplexity = SP4IntegratedAgent.prototype.estimateComplexity;
    const getCloudSystemPrompt = SP4IntegratedAgent.prototype.getCloudSystemPrompt;

    function makeStub() {
        const bridge = new SP4AIOSBridge({ enableCache: false, enableCostTracking: false });
        const calls = new Map();
        for (const provider of ['groq', 'openai', 'anthropic', 'google', 'mistral']) {
            calls.set(provider, 0);
            bridge.providers[provider] = {
                apiKey: 'test-key',
                complete: async () => {
                    calls.set(provider, calls.get(provider) + 1);
                    return {
                        text: `mock ${provider} response`,
                        model: `mock-${provider}`,
                        usage: { promptTokens: 1, completionTokens: 1 },
                        cost: 0
                    };
                }
            };
        }
        const stub = {
            aiosBridge: bridge,
            dailyCloudCost: 0,
            lastLocalError: null,
            estimateComplexity,
            getCloudSystemPrompt
        };
        return { stub, calls };
    }

    function totalCalls(calls) {
        return [...calls.values()].reduce((sum, c) => sum + c, 0);
    }

    // ── A: allowCloud:false, direct provider/model branch → ZERO provider calls ──
    console.log('🎯 A: allowCloud:false (direct ask() branch) → ZERO provider calls');
    {
        const { stub, calls } = makeStub();
        let threw = null;
        try {
            await askCloudAI.call(stub, 'test message A1', 'core', {
                policy: { allowCloud: false },
                provider: 'groq',
                model: 'llama-3.3-70b-versatile'
            });
        } catch (err) { threw = err; }
        check('A1: throws (blocked)', threw !== null, threw && threw.message);
        check('A1: reason is policy_disallows_cloud', threw && threw.reason === 'policy_disallows_cloud', threw && threw.reason);
        check('A1: ZERO calls to groq', calls.get('groq') === 0);
    }

    // ── A2: allowCloud:false, intelligentRoute branch (no provider/model) ──────
    {
        const { stub, calls } = makeStub();
        let threw = null;
        try {
            await askCloudAI.call(stub, 'test message A2', 'core', {
                policy: { allowCloud: false }
                // no provider/model → forces intelligentRoute() branch
            });
        } catch (err) { threw = err; }
        check('A2 (intelligentRoute branch): throws (blocked)', threw !== null, threw && threw.message);
        check('A2: reason is policy_disallows_cloud', threw && threw.reason === 'policy_disallows_cloud', threw && threw.reason);
        check('A2: ZERO calls to any provider', totalCalls(calls) === 0, JSON.stringify([...calls]));
    }

    // ── B: missing policy entirely → ZERO provider calls ────────────────────────
    console.log('\n🎯 B: options.policy missing entirely → ZERO provider calls');
    {
        const { stub, calls } = makeStub();
        let threw = null;
        try {
            await askCloudAI.call(stub, 'test message B', 'core', {
                provider: 'groq',
                model: 'llama-3.3-70b-versatile'
                // no policy key at all
            });
        } catch (err) { threw = err; }
        check('B: throws (blocked)', threw !== null, threw && threw.message);
        check('B: reason is policy_context_missing', threw && threw.reason === 'policy_context_missing', threw && threw.reason);
        check('B: ZERO calls to groq', calls.get('groq') === 0);
    }

    // ── C: allowCloud:true + groq_api (explicitly allowed pair) → reaches provider ──
    console.log('\n🎯 C: allowCloud:true + groq_api (allowed pair) → GROQ provider reachable');
    {
        const { stub, calls } = makeStub();
        const result = await askCloudAI.call(stub, 'test message C', 'core', {
            policy: { allowCloud: true },
            provider: 'groq',
            model: 'llama-3.3-70b-versatile'
        });
        check('C: askCloudAI resolved (not blocked)', result && typeof result.text === 'string', JSON.stringify(result));
        check('C: exactly 1 call to groq.complete()', calls.get('groq') === 1, `count=${calls.get('groq')}`);
    }

    // ── D: allowCloud:true + google_ai_api ──────────────────────────────────────
    console.log('\n🎯 D: allowCloud:true + google_ai_api');
    console.log('   NOTE: current manifest has conversation_text→google_ai_api as allow:false');
    console.log('   (only groq_api is an allowed exception in v1 — see sp4.constitution.yaml).');
    console.log('   This is a deliberate DEC-001 policy choice, not part of this Hranica to widen.');
    console.log('   Test verifies the THREADING reaches the real manifest decision (policy_denies),');
    console.log('   not that Google is reachable — that would require a separate Constitution decision.');
    {
        const { stub, calls } = makeStub();
        let threw = null;
        try {
            await askCloudAI.call(stub, 'test message D', 'core', {
                policy: { allowCloud: true },
                provider: 'google',
                model: 'gemini-2.5-flash'
            });
        } catch (err) { threw = err; }
        check('D: blocked by manifest (policy_denies), not by threading', threw && threw.reason === 'policy_denies', threw && threw.reason);
        check('D: ZERO calls to google.complete() (manifest denies this sink today)', calls.get('google') === 0);
    }

    // ── E: allowCloud:true + nepovolený sink (openai, explicitly allow:false) ──
    console.log('\n🎯 E: allowCloud:true + nepovolený sink (openai_api) → BLOCK');
    {
        const { stub, calls } = makeStub();
        let threw = null;
        try {
            await askCloudAI.call(stub, 'test message E', 'core', {
                policy: { allowCloud: true },
                provider: 'openai',
                model: 'gpt-4o-mini'
            });
        } catch (err) { threw = err; }
        check('E: throws (blocked)', threw !== null, threw && threw.message);
        check('E: reason is policy_denies', threw && threw.reason === 'policy_denies', threw && threw.reason);
        check('E: ZERO calls to openai.complete()', calls.get('openai') === 0);
    }

    // ── F: intelligentRoute() carries policy context through to ask()/mayEgress ──
    console.log('\n🎯 F: intelligentRoute() carries the same policy context through to ask()/mayEgress()');
    {
        // F1: allowCloud:true, no provider/model → intelligentRoute() picks one internally
        const { stub, calls } = makeStub();
        const result = await askCloudAI.call(stub, 'short', 'core', {
            policy: { allowCloud: true }
            // no provider/model → intelligentRoute() branch
        });
        check('F1: intelligentRoute + allowCloud:true resolves (not blocked)', result && typeof result.text === 'string', JSON.stringify(result));
        check('F1: exactly 1 provider call made', totalCalls(calls) === 1, JSON.stringify([...calls]));
    }
    {
        // F2: allowCloud:false, no provider/model → intelligentRoute() must still block
        const { stub, calls } = makeStub();
        let threw = null;
        try {
            await askCloudAI.call(stub, 'short', 'core', {
                policy: { allowCloud: false }
            });
        } catch (err) { threw = err; }
        check('F2: intelligentRoute + allowCloud:false still blocks', threw && threw.reason === 'policy_disallows_cloud', threw && threw.reason);
        check('F2: ZERO provider calls', totalCalls(calls) === 0, JSON.stringify([...calls]));
    }

    // ── G: no existing path creates policyAllowCloud:true implicitly ───────────
    console.log('\n🎯 G: static check — no hardcoded policyAllowCloud:true anywhere in the chain');
    {
        const integrationSrc = fs.readFileSync(path.resolve(__dirname, '../integration.js'), 'utf8');
        const bridgeSrc = fs.readFileSync(path.resolve(__dirname, '../../SP4AIOS/src/bridge.js'), 'utf8');
        const hardcodedPattern = /policyAllowCloud\s*[:=]\s*true\b/;
        check('integration.js has no hardcoded policyAllowCloud:true', !hardcodedPattern.test(integrationSrc));
        check('bridge.js has no hardcoded policyAllowCloud:true', !hardcodedPattern.test(bridgeSrc));
    }
    console.log('   (runtime confirmation: tests A2/B/F2 above already prove that omitting or');
    console.log('   falsifying policy produces BLOCK, not an implicit ALLOW, through both branches)');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`VÝSLEDOK: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        console.log('Zlyhané testy:');
        failures.forEach((f) => console.log(`  - ${f}`));
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error('❌ TEST SUITE CRASHED:', err);
    process.exit(1);
});
