/**
 * 🧪 CLOUDLLM DOTENV / IMPORT-ORDER FIX — REGRESSION TESTS
 *
 * Root cause (see cloudLLM.js top comment): GROQ_API_KEY/GROQ_MODEL/
 * GROQ_MAX_TOKENS/GROQ_TEMPERATURE were captured into module-top-level
 * consts from process.env, but dotenv/config was only ever imported by
 * src/llm/ollamaClient.js. Whether cloudLLM.js's consts saw a populated
 * process.env depended entirely on which sibling module happened to import
 * dotenv first — in llmRouter.js, cloudLLM.js was imported BEFORE
 * ollamaClient.js, so on local/dev runs the consts silently captured ''.
 *
 * Fix: cloudLLM.js now imports 'dotenv/config' itself, as the first line,
 * so it no longer depends on any other module's import order.
 *
 * This file proves two independent things:
 *   1) The fix itself — cloudLLM.js deterministically picks up .env values
 *      even when it is the very first (and only) module imported, in a
 *      fresh child process with a controlled cwd/.env — the exact scenario
 *      the old bug depended on getting "lucky" with import order to avoid.
 *   2) The Constitution safety invariants still hold in every combination —
 *      credentials being reliably available now must NOT change what the
 *      Constitution gate allows or blocks. Security must not depend on
 *      credentials being present OR absent by accident.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

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
    console.log('🧪 cloudLLM.js dotenv/import-order fix — regression tests');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ── Test 1: cloudLLM.js is deterministic even as the FIRST module imported ──
    // Worst case for the old bug: nothing else has run yet, no other module has
    // had a chance to import dotenv first. Isolated child process, controlled
    // cwd + .env, cloudLLM.js is the ONLY thing imported (no llmRouter.js, no
    // ollamaClient.js in the picture at all).
    console.log('🎯 1: cloudLLM.js picks up .env deterministically as the first-ever import');
    {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp4-dotenv-fix-'));
        try {
            const testKey = 'gsk-test-deterministic-9f2a';
            fs.writeFileSync(path.join(tmpDir, '.env'), `GROQ_API_KEY=${testKey}\nGROQ_MODEL=test-model-x\n`);
            const cloudLLMUrl = pathToFileURL(path.join(REPO_ROOT, 'cloudLLM.js')).href;
            const script = `
                const cloudLLM = await import('${cloudLLMUrl}');
                const info = cloudLLM.getCloudLLMInfo();
                console.log(JSON.stringify({ available: cloudLLM.isCloudLLMAvailable(), model: info.model }));
            `;
            const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
                cwd: tmpDir,
                encoding: 'utf8'
            });
            const parsed = JSON.parse(out.trim().split('\n').pop());
            check('1: isCloudLLMAvailable() === true from a fresh .env, no other module involved', parsed.available === true, JSON.stringify(parsed));
            check('1: GROQ_MODEL from .env was actually read (not the hardcoded default)', parsed.model === 'test-model-x', JSON.stringify(parsed));
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    }

    // ── Test 2: without ANY .env and without pre-set env vars, still safely unavailable ──
    console.log('\n🎯 2: no .env, no pre-set env var → isCloudLLMAvailable() === false (not a crash, not a stale truthy leak)');
    {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp4-dotenv-fix-empty-'));
        try {
            const cloudLLMUrl = pathToFileURL(path.join(REPO_ROOT, 'cloudLLM.js')).href;
            const script = `
                const cloudLLM = await import('${cloudLLMUrl}');
                console.log(JSON.stringify({ available: cloudLLM.isCloudLLMAvailable() }));
            `;
            const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
                cwd: tmpDir,
                encoding: 'utf8',
                env: { ...process.env, GROQ_API_KEY: '' }
            });
            const parsed = JSON.parse(out.trim().split('\n').pop());
            check('2: isCloudLLMAvailable() === false with no key anywhere', parsed.available === false, JSON.stringify(parsed));
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    }

    // From here on, run in-process. USE_CLOUD_FALLBACK must be set before the
    // FIRST import of llmRouter.js in this process (its value is captured into
    // a module-top-level const, same caching rule as everywhere else in this
    // codebase) — set once, used for tests 3-5.
    process.env.GROQ_API_KEY = 'gsk-test-inprocess-valid-looking-key';
    process.env.USE_CLOUD_FALLBACK = 'true';
    process.env.SP4_TEST = 'false';

    const fetchCalls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
        const urlStr = String(url);
        fetchCalls.push(urlStr);
        if (urlStr.includes('api.groq.com')) {
            return { ok: true, json: async () => ({ choices: [{ message: { content: 'mock groq response' } }] }) };
        }
        throw new Error('ECONNREFUSED (mock: simulated Ollama unreachable)');
    };
    function resetCalls() { fetchCalls.length = 0; }
    function groqCalls() { return fetchCalls.filter((u) => u.includes('api.groq.com')).length; }

    const { sp4LlmCall } = await import('../src/llm/llmRouter.js');
    const cloudLLM = await import('../cloudLLM.js');

    check('sanity: GROQ_API_KEY is now deterministically visible to cloudLLM.js in-process', cloudLLM.isCloudLLMAvailable() === true);

    // ── Test 3 (MOST IMPORTANT): allowCloud:false + Ollama down + valid GROQ key
    //    + USE_CLOUD_FALLBACK=true → ZERO cloud network calls ──
    console.log('\n🎯 3 (safety invariant): allowCloud:false + Ollama unavailable + valid GROQ key + USE_CLOUD_FALLBACK=true → ZERO cloud calls');
    resetCalls();
    {
        const result = await sp4LlmCall({
            preference: 'local-first',
            model: 'llama3',
            prompt: 'invariant test 3 — must never reach groq',
            policy: { allowCloud: false }
        });
        check('3: result.ok === false', result.ok === false, JSON.stringify(result));
        check('3: blocked by Constitution, not by missing credentials', String(result.error).includes('policy_disallows_cloud'), result.error);
        check('3: ZERO calls to api.groq.com', groqCalls() === 0, `count=${groqCalls()}`);
    }

    // ── Test 4: allowCloud:true + valid key + fallback on + allowed pair → cloud proceeds ──
    console.log('\n🎯 4: allowCloud:true + valid GROQ key + USE_CLOUD_FALLBACK=true + allowed pair → cloud path proceeds');
    resetCalls();
    {
        const result = await sp4LlmCall({
            preference: 'local-first',
            model: 'llama3',
            prompt: 'invariant test 4 — should reach groq',
            policy: { allowCloud: true }
        });
        check('4: result.ok === true', result.ok === true, JSON.stringify(result));
        check('4: exactly 1 call to api.groq.com', groqCalls() === 1, `count=${groqCalls()}`);
    }

    // ── Test 5: missing policy → BLOCK ──────────────────────────────────────────
    console.log('\n🎯 5: missing policy → BLOCK');
    resetCalls();
    {
        const result = await sp4LlmCall({
            preference: 'local-first',
            model: 'llama3',
            prompt: 'invariant test 5 — no policy passed at all'
            // no policy key
        });
        check('5: result.ok === false', result.ok === false, JSON.stringify(result));
        check('5: reason is policy_context_missing', String(result.error).includes('policy_context_missing'), result.error);
        check('5: ZERO calls to api.groq.com', groqCalls() === 0, `count=${groqCalls()}`);
    }

    globalThis.fetch = originalFetch;

    // ── Test 6: USE_CLOUD_FALLBACK=false stays an independent operational kill
    //    switch — must NOT be reinterpreted as, or merged with, the Constitution
    //    gate. Isolated child process (USE_CLOUD_FALLBACK is captured once at
    //    llmRouter.js import time, same caching rule as GROQ_API_KEY). ──
    console.log('\n🎯 6: USE_CLOUD_FALLBACK=false is an independent kill switch, not a Constitution decision');
    {
        const llmRouterUrl = pathToFileURL(path.join(REPO_ROOT, 'src/llm/llmRouter.js')).href;
        const script = `
            process.env.GROQ_API_KEY = 'gsk-test-killswitch-key';
            process.env.USE_CLOUD_FALLBACK = 'false';
            process.env.SP4_TEST = 'false';
            globalThis.fetch = async (url) => {
                throw new Error('fetch should never be called in this scenario: ' + url);
            };
            const { sp4LlmCall } = await import('${llmRouterUrl}');
            // Constitution WOULD allow this (allowCloud:true) — the kill switch must
            // still stop it, independently, before Constitution is ever consulted.
            const result = await sp4LlmCall({
                preference: 'local-first',
                model: 'llama3',
                prompt: 'kill switch test',
                policy: { allowCloud: true }
            });
            console.log(JSON.stringify(result));
        `;
        const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
            cwd: REPO_ROOT,
            encoding: 'utf8'
        });
        const result = JSON.parse(out.trim().split('\n').pop());
        check('6: result.ok === false (Ollama down, no fallback attempted)', result.ok === false, JSON.stringify(result));
        check('6: engine reflects local/ollama, not a cloud attempt', result.engine === 'ollama', result.engine);
        check(
            '6: error is NOT a Constitutional block (kill switch fired first, Constitution never reached)',
            !String(result.error).includes('policy_disallows_cloud') && !String(result.error).includes('Constitutional block'),
            result.error
        );
    }

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
