/**
 * 🧪 CONSTITUTION V1 — GATE TESTS (krok 7)
 *
 * Pokrýva scenáre A-G + regresný test z zadania IMPLEMENTUJ kroku 7.
 * Design: C:\SP4\plans\constitution-v1-plan.md, sekcie 1, 3, 13, 14.5.
 *
 * IMPORTANT: cloudLLM.js/llmRouter.js sa importujú dynamicky (nie static
 * import na vrchu súboru), pretože cloudLLM.js číta GROQ_API_KEY do const
 * na module-top-level. Env premenné musia byť nastavené PRED prvým importom,
 * inak by test nemal kontrolu nad tým, čo cloudLLM.js "vidí".
 *
 * global.fetch je nahradený mockom pre celý beh súboru — žiadny reálny
 * network call sa nesmie vykonať (ani na GROQ, ani na Ollama).
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execFileSync } from 'child_process';

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

// ── fetch mock (celý súbor beží offline, deterministicky) ──────────────
const fetchCalls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
    const urlStr = String(url);
    fetchCalls.push({ url: urlStr, opts });
    if (urlStr.includes(':4000')) {
        // LiteLLM gateway (novy cloud backend — AI_ROUTING_v1). Simulujeme
        // úspešnú odpoveď s usage, aby costLog mal co zapísať.
        return {
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'mock litellm response' } }],
                usage: { prompt_tokens: 5, completion_tokens: 4 }
            })
        };
    }
    if (urlStr.includes('api.groq.com')) {
        // Ak sa toto zavolá v scenári, kde malo byť BLOCK, test to odhalí
        // cez fetchCalls.length assert — tu simulujeme "úspešnú" cloud odpoveď,
        // aby sme vedeli odlíšiť "zavolané" od "zlyhalo z iného dôvodu".
        return {
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'mock groq response' } }] })
        };
    }
    // Akýkoľvek iný host (napr. Ollama) — simuluj nedostupnosť, aby sme
    // deterministicky vynútili fallback vetvu bez závislosti na reálnej sieti.
    throw new Error('ECONNREFUSED (test mock: simulated unreachable, non-groq/non-litellm host)');
};

function resetFetchCalls() {
    fetchCalls.length = 0;
}

function groqCallCount() {
    return fetchCalls.filter((c) => c.url.includes('api.groq.com')).length;
}

function litellmCallCount() {
    return fetchCalls.filter((c) => c.url.includes(':4000')).length;
}

async function main() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 SP4 CONSTITUTION V1 — GATE TESTS (krok 7)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // GROQ_API_KEY nastavený PRED akýmkoľvek importom cloudLLM.js — simuluje
    // stav "dotenv už doplnil kľúč" (potrebné pre test A aj pre regresný test).
    process.env.GROQ_API_KEY = 'sk-test-fake-key-for-constitution-test';
    process.env.SP4_TEST = 'false'; // aby sp4LlmCall nešiel do force-local test skratky
    // Reálny .env tohto stroja má USE_CLOUD_FALLBACK=false (nesúvisiaci kill-switch,
    // nie Constitution). Test musí byť deterministický a musí naozaj vyskúšať cestu
    // do cloud fallbacku, aby overil VLASTNÝ gate, nie tento nesúvisiaci flag.
    // dotenv (načítané transitívne cez ollamaClient.js) neprepisuje už nastavené
    // premenné, takže toto prežije import.
    process.env.USE_CLOUD_FALLBACK = 'true';
    // Capability gate (isCloudLLMConfigured) — must be ON for cloud-success cases.
    process.env.SP4_ALLOW_CLOUD = 'true';

    const loader = await import('../src/constitution/loader.js');
    const { can, mayEgress, isManifestLoaded } = loader;

    console.log(`Manifest loaded: ${isManifestLoaded()}\n`);
    check('manifest sa načítal (predpoklad pre všetky ostatné testy)', isManifestLoaded() === true);

    // ── Test E: OPEN_URL + glitchoslav = BLOCK ──────────────────────────
    console.log('\n🎯 Test E: OPEN_URL + glitchoslav (DEC-003)');
    {
        const result = can('OPEN_URL', { persona: 'glitchoslav', actorType: 'automation' });
        check('OPEN_URL + glitchoslav → BLOCK', result.decision === 'BLOCK', JSON.stringify(result));
        check('dôvod je gate_never (DEC-003)', result.reason === 'gate_never', result.reason);
    }

    // ── Test F: unknown action = BLOCK ──────────────────────────────────
    console.log('\n🎯 Test F: neznáma akcia');
    {
        const result = can('DELETE_EVERYTHING', { persona: 'core', actorType: 'automation' });
        check('neznámy action_type → BLOCK', result.decision === 'BLOCK', JSON.stringify(result));
        check('dôvod je unknown_action_type', result.reason === 'unknown_action_type', result.reason);
    }

    // ── can(): legitímna akcia stále prechádza (regresia pre binding A) ─
    console.log('\n🎯 can(): existujúca legitímna akcia zostáva ALLOW');
    {
        const result = can('SAVE_SNIPPET', { persona: 'core', actorType: 'automation' });
        check('SAVE_SNIPPET + core → ALLOW', result.decision === 'ALLOW', JSON.stringify(result));
    }
    {
        const result = can('NOTE_MEMORY', { persona: 'popici', actorType: 'automation' });
        check('NOTE_MEMORY + popici → ALLOW', result.decision === 'ALLOW', JSON.stringify(result));
    }

    // ── can(): chýbajúci/neplatný actorType/persona = BLOCK ─────────────
    console.log('\n🎯 can(): chýbajúci actorType/persona = BLOCK (fail-closed)');
    {
        const result = can('SAVE_SNIPPET', { persona: 'core' }); // actorType chýba
        check('chýbajúci actorType → BLOCK', result.decision === 'BLOCK', JSON.stringify(result));
        check('dôvod unknown_actor_type', result.reason === 'unknown_actor_type', result.reason);
    }
    {
        const result = can('SAVE_SNIPPET', { actorType: 'automation' }); // persona chýba
        check('chýbajúca persona → BLOCK', result.decision === 'BLOCK', JSON.stringify(result));
        check('dôvod unknown_persona', result.reason === 'unknown_persona', result.reason);
    }

    // ── Test C: unknown category = BLOCK (mayEgress priamo) ─────────────
    console.log('\n🎯 Test C: neznáma dátová kategória');
    {
        const result = mayEgress('nonexistent_category', 'groq_api', { actorType: 'automation', policyAllowCloud: true });
        check('neznáma category → BLOCK', result.decision === 'BLOCK', JSON.stringify(result));
        check('dôvod unknown_category', result.reason === 'unknown_category', result.reason);
    }

    // ── Test D: unknown sink = BLOCK (mayEgress priamo) ──────────────────
    console.log('\n🎯 Test D: neznámy sink');
    {
        const result = mayEgress('conversation_text', 'nonexistent_sink', { actorType: 'automation', policyAllowCloud: true });
        check('neznámy sink → BLOCK', result.decision === 'BLOCK', JSON.stringify(result));
        check('dôvod unknown_sink', result.reason === 'unknown_sink', result.reason);
    }

    // ── Test B: allowCloud:true + povolený pár = ALLOW (mayEgress priamo) ─
    console.log('\n🎯 Test B: allowCloud:true + explicitne povolený pár');
    {
        const result = mayEgress('conversation_text', 'groq_api', { actorType: 'automation', policyAllowCloud: true });
        check('conversation_text→groq_api + allowCloud:true → ALLOW', result.decision === 'ALLOW', JSON.stringify(result));
    }

    // ── mayEgress(): allowCloud:false alebo chýbajúci policy = BLOCK ────
    console.log('\n🎯 mayEgress(): allowCloud:false / chýbajúci policy context = BLOCK');
    {
        const result = mayEgress('conversation_text', 'groq_api', { actorType: 'automation', policyAllowCloud: false });
        check('allowCloud:false → BLOCK', result.decision === 'BLOCK', JSON.stringify(result));
        check('dôvod policy_disallows_cloud', result.reason === 'policy_disallows_cloud', result.reason);
    }
    {
        const result = mayEgress('conversation_text', 'groq_api', { actorType: 'automation' }); // policyAllowCloud chýba
        check('chýbajúci policyAllowCloud → BLOCK', result.decision === 'BLOCK', JSON.stringify(result));
        check('dôvod policy_context_missing', result.reason === 'policy_context_missing', result.reason);
    }

    // ── Test A: allowCloud:false + Ollama failure + GROQ key available ──
    console.log('\n🎯 Test A: allowCloud:false + Ollama failure + GROQ key available → ZERO GROQ network call');
    resetFetchCalls();
    {
        const { sp4LlmCall } = await import('../src/llm/llmRouter.js');
        const result = await sp4LlmCall({
            preference: 'local-first', // default fallback mode — Ollama zlyhá (mock), skúsi cloud
            model: 'llama3',
            prompt: 'test message, should never reach GROQ',
            policy: { allowCloud: false },
            actorType: 'automation'
        });
        check('sp4LlmCall vrátil ok:false (blokované)', result.ok === false, JSON.stringify(result));
        check(
            'chyba obsahuje constitutional block dôvod',
            typeof result.error === 'string' && result.error.includes('cloud_policy_required'),
            result.error
        );
        check('ZERO volaní na api.groq.com', groqCallCount() === 0, `groqCallCount=${groqCallCount()}`);
    }

    // ── Test G: existujúce local-only flows zostávajú funkčné ───────────
    console.log('\n🎯 Test G: local-only preferencia nikdy nesiahne na cloud');
    resetFetchCalls();
    {
        const { sp4LlmCall } = await import('../src/llm/llmRouter.js');
        // Ollama je v tomto teste nedosiahnuteľná (fetch mock), local-only nemá
        // fallback — očakávame ok:false z Ollama zlyhania, NIE zo Constitution
        // blocku, a nulový GROQ call.
        const result = await sp4LlmCall({
            preference: 'local-only',
            model: 'llama3',
            prompt: 'local only test',
            policy: { allowCloud: false }
        });
        check('local-only nevolá GROQ vôbec', groqCallCount() === 0, `groqCallCount=${groqCallCount()}`);
        check(
            'local-only zlyhanie nie je Constitution blok (je to Ollama chyba)',
            !(typeof result.error === 'string' && result.error.includes('Constitutional block')),
            result.error
        );
    }

    // ── Test B (end-to-end): allowCloud:true + explicitný sink = may proceed ─
    console.log('\n🎯 Test B (end-to-end cez sp4LlmCall/cloud-only): allowCloud:true → prejde až po fetch()');
    resetFetchCalls();
    {
        const { sp4LlmCall } = await import('../src/llm/llmRouter.js');
        const result = await sp4LlmCall({
            preference: 'cloud-only',
            model: 'llama3',
            prompt: 'explicit cloud allowed test',
            policy: { allowCloud: true },
            actorType: 'automation'
        });
        check('sp4LlmCall vrátil ok:true (povolené)', result.ok === true, JSON.stringify(result));
        check('presne 1 volanie na LiteLLM gateway', litellmCallCount() === 1, `litellmCallCount=${litellmCallCount()}`);
    }

    // ── Manifest unavailable → fail-closed (samostatný child process) ───
    console.log('\n🎯 Test: manifest sa nepodarí načítať → can()/mayEgress() vždy BLOCK');
    {
        const loaderUrl = pathToFileURL(path.resolve(__dirname, '../src/constitution/loader.js')).href;
        const script = `
            process.env.SP4_CONSTITUTION_PATH = 'C:/definitely/does/not/exist/sp4.constitution.yaml';
            const { can, mayEgress, isManifestLoaded } = await import('${loaderUrl}');
            const results = {
                loaded: isManifestLoaded(),
                canResult: can('SAVE_SNIPPET', { persona: 'core', actorType: 'automation' }),
                egressResult: mayEgress('conversation_text', 'groq_api', { actorType: 'automation', policyAllowCloud: true })
            };
            console.log(JSON.stringify(results));
        `;
        const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
        const parsed = JSON.parse(out.trim().split('\n').pop());
        check('manifest nenačítaný v child procese', parsed.loaded === false, JSON.stringify(parsed));
        check('can() → BLOCK pri chýbajúcom manifeste', parsed.canResult.decision === 'BLOCK', JSON.stringify(parsed.canResult));
        check('can() dôvod manifest_unavailable', parsed.canResult.reason === 'manifest_unavailable', parsed.canResult.reason);
        check('mayEgress() → BLOCK pri chýbajúcom manifeste (aj s allowCloud:true)', parsed.egressResult.decision === 'BLOCK', JSON.stringify(parsed.egressResult));
        check('mayEgress() dôvod manifest_unavailable', parsed.egressResult.reason === 'manifest_unavailable', parsed.egressResult.reason);
    }

    // ── Log obsah: overiť, že sa nikdy nezaloguje prompt content ─────────
    console.log('\n🎯 Log: constitution_decisions.jsonl neobsahuje prompt content');
    {
        const fs = await import('fs');
        const logPath = path.resolve(__dirname, '../logs/constitution_decisions.jsonl');
        const content = fs.readFileSync(logPath, 'utf8');
        check('log neobsahuje testovací prompt text', !content.includes('should never reach GROQ'), 'log obsahuje prompt!');
        check('log neobsahuje "explicit cloud allowed test"', !content.includes('explicit cloud allowed test'), 'log obsahuje prompt!');
        const lastLines = content.trim().split('\n').slice(-3);
        console.log('   (posledné záznamy v logu, pre kontrolu formátu):');
        lastLines.forEach((l) => console.log('   ' + l));
    }

    globalThis.fetch = originalFetch;

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
