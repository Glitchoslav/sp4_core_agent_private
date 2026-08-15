// 🧪 LiteLLM canonical egress — regression tests (2026-08-15 migration)
// Consent model: cloud requires resolvePolicy().allowCloud === true, threaded to
// sp4LlmCall → askCloudLLM → mayEgress('conversation_text','litellm_gateway').
//   - explicit deny → zero network
//   - missing policy → fail closed
//   - env fallback (USE_CLOUD_FALLBACK) without consent → zero network
//   - manifest deny → blocked
//   - explicit allow → single sink litellm_gateway
//   - no production import of SP4AIOSBridge
//   - no direct provider egress
// All HTTP mocked (global.fetch) — offline, deterministic.

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

// ── env BEFORE dynamic imports (module-top-level reads) ──
process.env.USE_CLOUD_FALLBACK = 'true';   // env fallback must NOT grant consent
delete process.env.SP4_ALLOW_CLOUD;
delete process.env.SP4_TEST;
process.env.SP4_COST_LOG_PATH = path.join(os.tmpdir(), `sp4-costlog-test-${Date.now()}.jsonl`);

// ── fetch mock (offline) ──
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
    console.log('━━━ LiteLLM canonical egress — regression ━━━');

    const { sp4LlmCall } = await import('../src/llm/llmRouter.js');
    const { mayEgress } = await import('../src/constitution/loader.js');
    const { resolvePolicy } = await import('../src/policy/policy.js');
    const { classify } = await import('../src/routing/classify.js');

    // 1. explicit deny → zero network
    {
        calls.length = 0;
        const r = await sp4LlmCall({ preference: 'cloud-only', prompt: 'otazka', policy: { allowCloud: false }, actorType: 'interactive-human' });
        check('deny: ok=false', r.ok === false, JSON.stringify(r));
        check('deny: cloud_policy_required', r.error === 'cloud_policy_required', r.error);
        check('deny: zero network', calls.length === 0, `calls=${calls.length}`);
    }

    // 2. missing policy → fail closed
    {
        calls.length = 0;
        const r = await sp4LlmCall({ preference: 'cloud-only', prompt: 'otazka', actorType: 'interactive-human' });
        check('missing policy: ok=false', r.ok === false, JSON.stringify(r));
        check('missing policy: cloud_policy_required', r.error === 'cloud_policy_required', r.error);
        check('missing policy: zero network', calls.length === 0, `calls=${calls.length}`);
    }

    // 3. env fallback (USE_CLOUD_FALLBACK=true) without consent → zero cloud egress
    {
        calls.length = 0;
        // complex prompt → classify would pick cloud, but no consent → must NOT egress
        const r = await sp4LlmCall({ preference: 'local-first', model: 'gemma3:4b', prompt: 'vysvetli hlbšie prečo a porovnaj a analyzuj a navrhni a čo ak a zmysel a etika a filozof', policy: { allowCloud: false }, actorType: 'interactive-human' });
        const cloudCalls = calls.filter(c => c.includes(':4000'));
        check('env fallback no consent: zero litellm calls', cloudCalls.length === 0, `cloudCalls=${cloudCalls.length} r=${JSON.stringify(r)}`);
    }

    // 4. manifest deny → blocked (allow:false sinks)
    {
        const openai = mayEgress('conversation_text', 'openai_api', { policyAllowCloud: true, actorType: 'automation' });
        check('manifest deny openai_api: BLOCK', openai.decision === 'BLOCK', JSON.stringify(openai));
        const google = mayEgress('conversation_text', 'google_ai_api', { policyAllowCloud: true, actorType: 'automation' });
        check('manifest deny google_ai_api: BLOCK', google.decision === 'BLOCK', JSON.stringify(google));
    }

    // 5. explicit allow → single sink litellm_gateway
    {
        calls.length = 0;
        const r = await sp4LlmCall({ preference: 'cloud-only', prompt: 'otazka', policy: { allowCloud: true }, actorType: 'interactive-human' });
        const litellmCalls = calls.filter(c => c.includes(':4000'));
        check('allow: ok=true', r.ok === true, JSON.stringify(r));
        check('allow: engine cloud-only', r.engine === 'cloud-only', r.engine);
        check('allow: exactly 1 litellm call', litellmCalls.length === 1, `calls=${calls.length}`);
        check('allow: sink is litellm_gateway (:4000)', !!litellmCalls[0] && litellmCalls[0].includes(':4000'), litellmCalls[0]);
        check('allow: NOT groq.com', !calls.some(c => c.includes('api.groq.com')));
        check('allow: no direct provider cloud host', !calls.some(c => /api\.(openai|anthropic|groq)\.com|generativelanguage/i.test(c)), calls.join(' | '));
    }

    // 6. no production import of SP4AIOSBridge
    {
        const prod = ['integration.js', 'executionOrchestrator.js', 'autonomousController.js', 'cloudLLM.js', 'src/llm/llmRouter.js'];
        const bad = [];
        for (const f of prod) {
            const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
            if (/SP4AIOSBridge|aiosBridge|\.\.\/SP4AIOS/.test(t)) bad.push(f);
        }
        check('no production SP4AIOS import', bad.length === 0, bad.join(','));
        check('SP4AIOSBridge.js deleted', !fs.existsSync(path.join(ROOT, 'SP4AIOSBridge.js')));
    }

    // 7. no direct provider egress
    {
        const cloud = fs.readFileSync(path.join(ROOT, 'cloudLLM.js'), 'utf8');
        check('no askGroqLLM export', !/export async function askGroqLLM/.test(cloud));
        check('no api.groq.com endpoint', !/api\.groq\.com/.test(cloud));
    }

    // 8. P0: env SP4_ALLOW_CLOUD=true does NOT grant consent (missing request policy → BLOCK)
    {
        const p = resolvePolicy({}, { SP4_ALLOW_CLOUD: 'true' });
        check('P0: env SP4_ALLOW_CLOUD => allowCloud:false', p.allowCloud === false, JSON.stringify(p));
        check('P0: env SP4_ALLOW_CLOUD => cloudAvailable:true', p.cloudAvailable === true, JSON.stringify(p));
        calls.length = 0;
        const r = await sp4LlmCall({ preference: 'cloud-only', prompt: 'otazka', policy: p, actorType: 'interactive-human' });
        check('P0: BLOCK (ok=false)', r.ok === false, JSON.stringify(r));
        check('P0: zero network', calls.length === 0, `calls=${calls.length}`);
    }

    // 9. autonomous controller: no groq/google provider; tier via classify()
    {
        const ac = fs.readFileSync(path.join(ROOT, 'autonomousController.js'), 'utf8');
        check('no provider=groq', !/provider\s*=\s*'groq'/.test(ac));
        check('no provider=google', !/provider\s*=\s*'google'/.test(ac));
        const trivial = classify('ahoj');
        const deep = classify('vysvetli hlbšie prečo a porovnaj a analyzuj a navrhni');
        check('classify trivial -> local', trivial.engine === 'local', JSON.stringify(trivial));
        check('classify deep -> budget|quality', deep.engine === 'budget' || deep.engine === 'quality', JSON.stringify(deep));
    }

    console.log(`\nVÝSLEDOK: ${passed} passed, ${failed} failed`);
    failures.forEach(f => console.log(`  - ${f}`));
    process.exitCode = failed > 0 ? 1 : 0;
}

main();
