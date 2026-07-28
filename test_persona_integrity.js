// Persona system integrity check using runtime validators as the hard authority.

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { evaluateStyleSignal, validateHardPersonaContract } from './test_metadata_contract.js';

const tests = [
    {
        name: 'GLITCHOSLAV - Philosophy Question',
        mode: 'glitchoslav',
        input: 'Čo je zmysel života?',
        minLength: 1,
        maxLength: 8,
        style: 'filozofické, metafory, rúny'
    },
    {
        name: 'CORE - Technical Question',
        mode: 'core',
        input: 'Ako SP4 routuje input na správny model?',
        minLength: 1,
        maxLength: 5,
        style: 'technické, jasné, štruktúrované'
    },
    {
        name: 'POPIČI - Life Advice',
        mode: 'popici',
        input: 'Ta daj mi radu, bratu.',
        minLength: 1,
        maxLength: 6,
        style: 'východniarsky slang, drsné, láskavé'
    }
];

export function validatePersonaIntegrityResult(result, test) {
    const validations = validateHardPersonaContract(result, {
        expectedPersona: test.mode,
        userInput: test.input,
        englishLimit: 5
    });

    // Replace the generic style telemetry with the historical fingerprint warning label.
    validations.info = validations.info.filter(item => !/^(vibe|dialect) score=/.test(item));
    validations.warnings = validations.warnings.filter(item => !/^(vibe|dialect) score=/.test(item));
    const style = evaluateStyleSignal(result?.response || '', test.mode);
    if (style.hasVibe) {
        validations.info.push(`FINGERPRINT INFO: ${test.style}; score=${style.score}`);
    } else {
        validations.warnings.push(`FINGERPRINT WARNING: ${test.style} signal not detected; informational only`);
    }

    const sentences = String(result?.response || '').split(/[.!?]+/u).filter(sentence => sentence.trim());
    if (sentences.length < test.minLength || sentences.length > test.maxLength) {
        validations.warnings.push(`LENGTH WARNING: ${sentences.length} viet, expected ${test.minLength}-${test.maxLength}`);
    } else {
        validations.passed.push(`length=${sentences.length} viet`);
    }

    return validations;
}

function printChecks(checks) {
    for (const [key, label] of [['passed', 'PASSED'], ['warnings', 'WARNINGS'], ['info', 'INFO'], ['failed', 'FAILED']]) {
        if (checks[key]?.length) {
            console.log(`   ${label} (${checks[key].length}):`);
            checks[key].forEach(item => console.log(`      ${item}`));
        }
    }
}

export async function runPersonaTests() {
    console.log('SP4 PERSONA INTEGRITY TEST');
    console.log('Hard: metadata, routing, provider, language, validator, identity boundaries. Fingerprint: INFO/WARN.');

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
            console.log(`Response: "${result.response}"`);
            console.log(`Metadata: handledBy=${result.metadata?.handledBy} model=${result.metadata?.model} provider=${result.metadata?.provider}`);
            const validations = validatePersonaIntegrityResult(result, test);
            printChecks(validations);
            if (validations.failed.length === 0) {
                console.log('TEST PASSED - persona hard contract preserved');
                passed++;
            } else {
                console.log('TEST FAILED - persona hard contract violated');
                failed++;
            }
        } catch (error) {
            console.error(`TEST ERROR: ${error.message}`);
            failed++;
        }
    }

    console.log(`\nFINAL RESULTS: passed=${passed}/${tests.length} failed=${failed}/${tests.length}`);
    if (failed === 0) console.log('ALL TESTS PASSED - Personas are distinct and functional');
    else console.log('SOME TESTS FAILED - Persona hard contract violated');
    process.exitCode = failed > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    runPersonaTests().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}