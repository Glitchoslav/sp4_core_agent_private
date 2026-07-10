// SP4 System Healthcheck - End-to-End Test
// Tests emergency SPG bypass and normal flow

import { SP4IntegratedAgent } from './integration.js';

console.log('🔥 SP4 SYSTEM HEALTHCHECK - END-TO-END TEST\n');

const agent = new SP4IntegratedAgent();

async function runTests() {
    try {
        console.log('1️⃣ Initializing SP4 Agent...');
        await agent.initialize();
        console.log('   ✅ Agent initialized\n');

        // Test 1: Emergency Scenario (SPG should bypass LLM)
        console.log('2️⃣ TEST: Emergency Input (SPG Bypass)');
        console.log('   Input: "Človek leží, nereaguje a nedýcha"');

        const emergencyResult = await agent.processMessage('Človek leží, nereaguje a nedýcha', 'core');

        console.log('   Result:');
        console.log(`     - Success: ${emergencyResult.success}`);
        console.log(`     - Handler: ${emergencyResult.meta?.handledBy || 'unknown'}`);
        console.log(`     - Emergency: ${emergencyResult.meta?.emergency || false}`);
        console.log(`     - Bypass LLM: ${emergencyResult.meta?.bypassLLM || false}`);
        console.log(`     - Response length: ${emergencyResult.response?.length || 0} chars`);

        const emergencyPass =
            emergencyResult.success === true &&
            emergencyResult.meta?.handledBy === 'sp4_first_aid_spg' &&
            emergencyResult.meta?.emergency === true &&
            emergencyResult.meta?.bypassLLM === true &&
            emergencyResult.response?.includes('KPR');

        console.log(`   ${emergencyPass ? '✅ PASS' : '❌ FAIL'} - Emergency bypass working\n`);

        // Test 2: Normal Flow (should use orchestration/LLM)
        console.log('3️⃣ TEST: Normal Input (Standard Flow)');
        console.log('   Input: "Čo je dnes nové?"');

        const normalResult = await agent.processMessage('Čo je dnes nové?', 'core');

        console.log('   Result:');
        console.log(`     - Success: ${normalResult.success}`);
        console.log(`     - Handler: ${normalResult.meta?.handledBy || 'unknown'}`);
        console.log(`     - Emergency: ${normalResult.meta?.emergency || false}`);
        console.log(`     - Response length: ${normalResult.response?.length || 0} chars`);

        const normalPass =
            normalResult.success === true &&
            normalResult.meta?.handledBy !== 'sp4_first_aid_spg' &&
            normalResult.meta?.emergency !== true;

        console.log(`   ${normalPass ? '✅ PASS' : '❌ FAIL'} - Normal flow working\n`);

        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 END-TO-END TEST RESULTS:');
        console.log(`   Emergency Bypass: ${emergencyPass ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Normal Flow: ${normalPass ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Overall: ${emergencyPass && normalPass ? '✅ SYSTEM HEALTHY' : '⚠️ ISSUES DETECTED'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(emergencyPass && normalPass ? 0 : 1);
    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runTests();
