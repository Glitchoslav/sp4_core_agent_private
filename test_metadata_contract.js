// Regression test: metadata contract integrity across pipeline transformations.

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getPersona } from './src/core/personaRegistry.js';
import { getIdentityKernel } from './src/identity/IDENTITY_KERNEL.js';

const CLOUD_PROVIDER_PATTERN = /cloud|groq|gemini|mistral|anthropic|openai/i;

function normalizeForContract(value = '') {
    return String(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function findIdentityConfusion(text, personaKey) {
    const phrases = getIdentityKernel(personaKey).forbidden.identityConfusion || [];
    const normalized = normalizeForContract(text);
    return phrases.filter(phrase => normalized.includes(normalizeForContract(phrase)));
}

export function evaluateStyleSignal(text, personaKey) {
    const persona = getPersona(personaKey);
    if (personaKey === 'popici') {
        const patterns = persona?.meta?.dialectPatterns || [];
        const markers = patterns.filter(pattern => {
            pattern.lastIndex = 0;
            return pattern.test(text);
        }).map(pattern => pattern.source);
        return { hasVibe: markers.length > 0, score: markers.length, markers };
    }

    const result = persona?.detectVibe?.(text);
    if (typeof result === 'boolean') return { hasVibe: result, score: result ? 1 : 0, markers: [] };
    return result || { hasVibe: false, score: 0, markers: [] };
}

export function validateHardPersonaContract(result, { expectedPersona, userInput, forceLocal = false, englishLimit = 5 }) {
    const checks = { passed: [], failed: [], warnings: [], info: [] };
    const text = typeof result?.response === 'string' ? result.response : '';
    const metadata = result?.metadata;
    const model = metadata?.model;
    const provider = metadata?.provider;

    if (result?.meta === result?.metadata) checks.passed.push('meta === metadata');
    else checks.failed.push('meta !== metadata');

    if (metadata?.handledBy === expectedPersona) checks.passed.push(`handledBy=${expectedPersona}`);
    else checks.failed.push(`handledBy=${metadata?.handledBy} expected=${expectedPersona}`);

    if (model && model !== 'unknown') checks.passed.push(`model=${model}`);
    else checks.failed.push(`model=${model} is missing or unknown`);

    if (provider && provider !== 'unknown') checks.passed.push(`provider=${provider}`);
    else checks.failed.push(`provider=${provider} is missing or unknown`);

    if (text.trim()) checks.passed.push('response is non-empty');
    else checks.failed.push('response is empty');

    const englishPattern = /\b(the|and|of|to|in|is|that|with|for|as|this|what|how|does|work|explain)\b/gi;
    const englishWords = (text.match(englishPattern) || []).length;
    if (englishWords < englishLimit) checks.passed.push(`Slovak output (${englishWords} EN words)`);
    else checks.failed.push(`response still in English (${englishWords} EN words)`);

    const validatorResult = getPersona(expectedPersona)?.validate?.(text, { userInput, mode: expectedPersona });
    if (validatorResult?.valid === true) checks.passed.push(`${expectedPersona} validator valid=true`);
    else checks.failed.push(`${expectedPersona} validator valid=false: ${validatorResult?.reason || 'validator unavailable'}`);

    const confusion = findIdentityConfusion(text, expectedPersona);
    if (confusion.length === 0) checks.passed.push('foreign identity confusion absent');
    else checks.failed.push(`forbidden identity confusion: ${confusion.join(', ')}`);

    if (forceLocal && CLOUD_PROVIDER_PATTERN.test(provider || '')) checks.failed.push(`forceLocal violated by provider=${provider}`);
    else if (forceLocal) checks.passed.push(`forceLocal respected (provider=${provider})`);

    const style = evaluateStyleSignal(text, expectedPersona);
    const label = expectedPersona === 'popici' ? 'dialect' : 'vibe';
    const detail = `${label} score=${style.score}${style.markers?.length ? ` (${style.markers.join(', ')})` : ''}`;
    if (style.hasVibe) checks.info.push(detail);
    else checks.warnings.push(`${detail}; informational only`);

    return checks;
}

const tests = [
    {
        name: 'Meta Contract Unification',
        description: 'result.meta and result.metadata must point to same object',
        input: 'Čo je SP4?',
        mode: 'glitchoslav',
        validate: result => {
            const checks = { passed: [], failed: [], warnings: [], info: [] };
            if (!result.meta) checks.failed.push('result.meta is undefined');
            if (!result.metadata) checks.failed.push('result.metadata is undefined');
            if (result.meta && result.metadata) {
                if (result.meta === result.metadata) checks.passed.push('meta === metadata');
                else checks.failed.push('meta !== metadata');
                if (result.meta.handledBy === result.metadata.handledBy) checks.passed.push(`handledBy consistent: ${result.meta.handledBy}`);
                else checks.failed.push('handledBy mismatch');
                if (result.meta.model === result.metadata.model) checks.passed.push(`model consistent: ${result.meta.model}`);
                else checks.failed.push('model mismatch');
                if (result.meta.handledBy && result.meta.handledBy !== 'unknown') checks.passed.push('handledBy known');
                else checks.failed.push('handledBy missing or unknown');
                if (result.meta.model && result.meta.model !== 'unknown') checks.passed.push('model known');
                else checks.failed.push('model missing or unknown');
            }
            return checks;
        }
    },
    {
        name: 'Language Enforcer Metadata Preservation',
        description: 'Hard contract uses routing, metadata and the CORE validator; style is informational',
        input: 'How does SP4 memory system work?',
        mode: 'core',
        validate: result => validateHardPersonaContract(result, {
            expectedPersona: 'core',
            userInput: 'How does SP4 memory system work?'
        })
    },
    {
        name: 'Popiči Dialect Routing (>=2 markers)',
        description: 'Dialect input must route to Popiči; response slang is informational',
        input: 'Ta šak mi porad, bratu',
        mode: 'auto',
        validate: result => validateHardPersonaContract(result, {
            expectedPersona: 'popici',
            userInput: 'Ta šak mi porad, bratu'
        })
    },
    {
        name: 'Popiči Dialect Routing (1 marker + rada)',
        description: 'Single dialect marker plus advice intent must route to Popiči',
        input: 'Ta daj mi radu',
        mode: 'auto',
        validate: result => validateHardPersonaContract(result, {
            expectedPersona: 'popici',
            userInput: 'Ta daj mi radu'
        })
    }
];

function printChecks(checks) {
    for (const [key, label] of [['passed', 'PASSED'], ['warnings', 'WARNINGS'], ['info', 'INFO'], ['failed', 'FAILED']]) {
        if (checks[key]?.length) {
            console.log(`   ${label} (${checks[key].length}):`);
            checks[key].forEach(item => console.log(`      ${item}`));
        }
    }
}

export async function runRegressionTests() {
    console.log('SP4 METADATA CONTRACT REGRESSION TESTS');
    console.log('Hard: metadata, routing, provider, language, validator, identity boundaries. Style: INFO/WARN.');
    const { SP4IntegratedAgent } = await import('./integration.js');
    const agent = new SP4IntegratedAgent();
    await agent.initialize();
    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        console.log(`\nTEST: ${test.name}`);
        console.log(`Mode: ${test.mode}`);
        console.log(`Input: "${test.input}"`);
        try {
            const result = await agent.processMessage(test.input, test.mode);
            console.log(`Response: "${result.response.substring(0, 200)}${result.response.length > 200 ? '...' : ''}"`);
            console.log(`Metadata: handledBy=${result.metadata?.handledBy} model=${result.metadata?.model} provider=${result.metadata?.provider}`);
            const checks = test.validate(result);
            printChecks(checks);
            if (checks.failed.length === 0) {
                console.log('TEST PASSED');
                passed++;
            } else {
                console.log('TEST FAILED');
                failed++;
            }
        } catch (error) {
            console.error(`TEST ERROR: ${error.message}`);
            failed++;
        }
    }

    console.log(`\nFINAL RESULTS: passed=${passed}/${tests.length} failed=${failed}/${tests.length}`);
    if (failed === 0) console.log('ALL REGRESSION TESTS PASSED');
    else console.log('REGRESSION DETECTED - Pipeline integrity compromised');
    process.exitCode = failed > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    runRegressionTests().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}