// 🧪 Egress callers — orchestrator regression (2026-08-15)
// executeCloudTask consent priority + executeTask cloud path (no ReferenceError).

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, detail = '') {
    if (cond) { passed++; console.log(`   ✅ ${name}`); }
    else { failed++; failures.push(name); console.log(`   ❌ ${name}${detail ? ' — ' + detail : ''}`); }
}

delete process.env.SP4_ALLOW_CLOUD;
delete process.env.SP4_TEST;
process.env.SP4_COST_LOG_PATH = path.join(os.tmpdir(), `sp4-costlog-orch-${Date.now()}.jsonl`);

const calls = [];
globalThis.fetch = async (url) => {
    const s = String(url);
    calls.push(s);
    if (s.includes(':4000')) {
        return { ok: true, json: async () => ({ choices: [{ message: { content: 'mock litellm' } }], usage: { prompt_tokens: 3, completion_tokens: 2 } }) };
    }
    throw new Error(`unexpected network call: ${s}`);
};

async function main() {
    console.log('━━━ Egress callers — orchestrator regression ━━━');

    const { sp4LlmCall } = await import('../src/llm/llmRouter.js');
    const { ExecutionOrchestrator } = await import('../executionOrchestrator.js');

    // Stub integration mirrors real askCloudAI: routes through sp4LlmCall (policy enforced).
    const stubIntegration = {
        async askCloudAI(prompt, mode, opts = {}) {
            const result = await sp4LlmCall({
                preference: 'cloud-only',
                prompt,
                system: '',
                policy: opts.policy || null,
                actorType: 'automation',
                temperature: opts.temperature || 0.7,
                num_predict: opts.maxTokens || 2000,
            });
            if (!result.ok) throw new Error(result.error || 'cloud_policy_required');
            return { text: result.text, provider: 'litellm', model: null, cost: null, latency: result.durationMs ?? null };
        }
    };
    const orch = new ExecutionOrchestrator(stubIntegration);

    const mkTask = (id, extra = {}) => ({ id, brain: 'cloud', type: 'general', description: 'otazka', dependencies: [], estimatedCost: 0, ...extra });

    // 1. no task/mission policy → BLOCK, zero network
    {
        calls.length = 0;
        let threw = null;
        try {
            await orch.executeCloudTask(mkTask('t1'), { mission: { goal: 'x' } }, []);
        } catch (e) { threw = e; }
        check('orchestrator no policy → BLOCK', !!threw, threw && threw.message);
        check('orchestrator no policy → zero network', calls.length === 0, `calls=${calls.length}`);
    }

    // 2. mission allowCloud:true → LiteLLM (exactly 1 litellm call)
    {
        calls.length = 0;
        const out = await orch.executeCloudTask(mkTask('t2'), { mission: { goal: 'x' }, policy: { allowCloud: true } }, []);
        check('mission allow → provider litellm', out.provider === 'litellm', JSON.stringify(out));
        check('mission allow → exactly 1 litellm call', calls.filter(c => c.includes(':4000')).length === 1, `calls=${calls.length}`);
    }

    // 3. task deny (allowCloud:false) overrides mission allow
    {
        calls.length = 0;
        let threw = null;
        try {
            await orch.executeCloudTask(mkTask('t3', { policy: { allowCloud: false } }), { mission: { goal: 'x' }, policy: { allowCloud: true } }, []);
        } catch (e) { threw = e; }
        check('task deny overrides mission allow → BLOCK', !!threw, threw && threw.message);
        check('task deny → zero network', calls.length === 0, `calls=${calls.length}`);
    }

    // 4. executeTask cloud path: completes without ReferenceError; engine mapped
    {
        calls.length = 0;
        const r = await orch.executeTask(mkTask('t4'), { mission: { goal: 'x' }, policy: { allowCloud: true } }, []);
        check('executeTask completes', r.status === 'completed', JSON.stringify(r));
        check('executeTask engine_used litellm', r.output?.meta?.engine_used === 'litellm', JSON.stringify(r.output?.meta));
        check('executeTask fallback_used false', r.output?.meta?.fallback_used === false, JSON.stringify(r.output?.meta));
    }

    console.log(`\nVÝSLEDOK: ${passed} passed, ${failed} failed`);
    failures.forEach(f => console.log(`  - ${f}`));
    process.exitCode = failed > 0 ? 1 : 0;
}

main();
