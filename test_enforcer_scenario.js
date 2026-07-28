// Language Enforcer scenario test: hard persona contract plus soft style telemetry.

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateHardPersonaContract } from './test_metadata_contract.js';

const testCases = [
    {
        name: 'CORE Technical Query (English)',
        input: 'How does SP4 memory system work? Explain the architecture.',
        mode: 'core',
        expectedPersona: 'core',
        forceLocal: true,
        bypassAutonomous: true
    },
    {
        name: 'GLITCHOSLAV Philosophy (English)',
        input: 'What is the meaning of life? Why do we exist?',
        mode: 'glitchoslav',
        expectedPersona: 'glitchoslav',
        forceLocal: true,
        bypassAutonomous: true
    },
    {
        name: 'POPIČI Dialect (Mixed)',
        input: 'Ta give me advice, bratu, what should I do?',
        mode: 'popici',
        expectedPersona: 'popici',
        forceLocal: true,
        bypassAutonomous: true
    }
];

export function validateEnforcerResult(result, test) {
    return validateHardPersonaContract(result, {
        expectedPersona: test.expectedPersona,
        userInput: test.input,
        forceLocal: test.forceLocal,
        englishLimit: 10
    });
}

function printChecks(checks) {
    for (const [key, label] of [['passed', 'PASSED'], ['warnings', 'WARNINGS'], ['info', 'INFO'], ['failed', 'FAILED']]) {
        if (checks[key]?.length) {
            console.log(`   ${label} (${checks[key].length}):`);
            checks[key].forEach(item => console.log(`      ${item}`));
        }
    }
}

export async function runEnforcerScenario() {
    console.log('LANGUAGE ENFORCER SCENARIO TEST');
    console.log('Hard: metadata, routing, provider, language, validator, identity boundaries. Style: INFO/WARN.');

    const { SP4IntegratedAgent } = await import('./integration.js');
    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    let passed = 0;
    let failed = 0;
    const testModeCooldown = process.env.SP4_TEST === 'true' ? 500 : 0;

    for (const [index, test] of testCases.entries()) {
        if (testModeCooldown > 0 && index > 0) {
            console.log(`\nTest cooldown: ${testModeCooldown}ms`);
            await new Promise(resolve => setTimeout(resolve, testModeCooldown));
        }

        console.log(`\nTEST: ${test.name}`);
        console.log(`Input: "${test.input}"`);
        console.log(`Mode: ${test.mode}; Expected persona: ${test.expectedPersona}`);

        try {
            const result = await agent.processMessage(test.input, test.mode, {
                forceLocal: test.forceLocal,
                bypassAutonomous: test.bypassAutonomous
            });
            console.log(`Response: "${result.response.substring(0, 200)}${result.response.length > 200 ? '...' : ''}"`);
            console.log(`Metadata: handledBy=${result.metadata?.handledBy} model=${result.metadata?.model} provider=${result.metadata?.provider}`);
            const checks = validateEnforcerResult(result, test);
            printChecks(checks);

            if (checks.failed.length === 0) {
                console.log('TEST PASSED - hard persona contract preserved');
                passed++;
            } else {
                console.log('TEST FAILED - hard persona contract violated');
                failed++;
            }
        } catch (error) {
            console.error(`TEST ERROR: ${error.message}`);
            failed++;
        }
    }

    console.log(`\nENFORCER SCENARIO RESULTS: passed=${passed}/${testCases.length} failed=${failed}/${testCases.length}`);
    if (failed === 0) console.log('ALL ENFORCER SCENARIOS PASSED');
    else console.log('ENFORCER SCENARIOS FAILED - Pipeline integrity compromised');
    process.exitCode = failed > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    runEnforcerScenario().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}