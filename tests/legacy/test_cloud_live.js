// test_cloud_live.js - Live test with REAL cloud AI calls
// Tests actual Groq/Google API responses

import { SP4IntegratedAgent } from './integration.js';

console.log('🌩️ Testing LIVE Cloud AI Integration\n');

(async () => {
    const agent = new SP4IntegratedAgent('kefyk');
    await agent.initialize();

    // Force FULL capability
    agent.degradationManager.currentLevel = 'FULL';

    console.log('═══════════════════════════════════════════');
    console.log('TEST 1: Simple code generation via CLOUD');
    console.log('═══════════════════════════════════════════\n');

    const codePrompt = 'Write a simple Python function to calculate fibonacci numbers with recursion';
    console.log(`📨 Prompt: "${codePrompt}"`);
    console.log(`📏 Length: ${codePrompt.length} chars\n`);

    const shouldUseCloud = agent.shouldUseCloudAI(codePrompt, 'core', { priority: 'normal' });
    console.log(`🎯 Routing decision: ${shouldUseCloud ? '☁️  CLOUD' : '🏠 LOCAL'}\n`);

    if (shouldUseCloud) {
        console.log('⏳ Calling cloud AI...\n');
        const startTime = Date.now();

        try {
            const response = await agent.askCloudAI(codePrompt, 'core', {
                temperature: 0.7,
                maxTokens: 500
            });

            const elapsed = Date.now() - startTime;

            console.log('✅ CLOUD AI RESPONSE:\n');
            console.log('─'.repeat(60));
            console.log(response.substring(0, 400) + (response.length > 400 ? '...' : ''));
            console.log('─'.repeat(60));
            console.log(`\n⏱️  Latency: ${elapsed}ms`);
            console.log(`💰 Daily cost so far: $${agent.dailyCloudCost.toFixed(6)}`);
            console.log(`📊 Budget remaining: $${(agent.maxDailyCloudCost - agent.dailyCloudCost).toFixed(6)}\n`);

        } catch (error) {
            console.error(`❌ Cloud AI failed: ${error.message}\n`);
        }
    } else {
        console.log('ℹ️  Test skipped - routing chose LOCAL instead\n');
    }

    console.log('═══════════════════════════════════════════');
    console.log('TEST 2: Slovak analysis task via CLOUD');
    console.log('═══════════════════════════════════════════\n');

    const analysisPrompt = 'Analyzuj rozdiely medzi React a Vue.jsframeworkmi a porovnaj ich výkon';
    console.log(`📨 Prompt: "${analysisPrompt}"`);
    console.log(`📏 Length: ${analysisPrompt.length} chars\n`);

    const shouldUseCloud2 = agent.shouldUseCloudAI(analysisPrompt, 'core', { priority: 'normal' });
    console.log(`🎯 Routing decision: ${shouldUseCloud2 ? '☁️  CLOUD' : '🏠 LOCAL'}\n`);

    if (shouldUseCloud2) {
        console.log('⏳ Calling cloud AI...\n');
        const startTime = Date.now();

        try {
            const response = await agent.askCloudAI(analysisPrompt, 'core', {
                temperature: 0.7,
                maxTokens: 600
            });

            const elapsed = Date.now() - startTime;

            console.log('✅ CLOUD AI RESPONSE:\n');
            console.log('─'.repeat(60));
            console.log(response.substring(0, 400) + (response.length > 400 ? '...' : ''));
            console.log('─'.repeat(60));
            console.log(`\n⏱️  Latency: ${elapsed}ms`);
            console.log(`💰 Daily cost so far: $${agent.dailyCloudCost.toFixed(6)}`);
            console.log(`📊 Budget remaining: $${(agent.maxDailyCloudCost - agent.dailyCloudCost).toFixed(6)}\n`);

        } catch (error) {
            console.error(`❌ Cloud AI failed: ${error.message}\n`);
        }
    } else {
        console.log('ℹ️  Test skipped - routing chose LOCAL instead\n');
    }

    console.log('═══════════════════════════════════════════');
    console.log('TEST 3: Explicit [cloud] tag');
    console.log('═══════════════════════════════════════════\n');

    const explicitPrompt = 'What is the capital of Slovakia? [cloud]';
    console.log(`📨 Prompt: "${explicitPrompt}"`);
    console.log(`📏 Length: ${explicitPrompt.length} chars\n`);

    const shouldUseCloud3 = agent.shouldUseCloudAI(explicitPrompt, 'core', { priority: 'normal' });
    console.log(`🎯 Routing decision: ${shouldUseCloud3 ? '☁️  CLOUD' : '🏠 LOCAL'}\n`);

    if (shouldUseCloud3) {
        console.log('⏳ Calling cloud AI...\n');
        const startTime = Date.now();

        try {
            const response = await agent.askCloudAI(explicitPrompt, 'core', {
                temperature: 0.5,
                maxTokens: 100
            });

            const elapsed = Date.now() - startTime;

            console.log('✅ CLOUD AI RESPONSE:\n');
            console.log('─'.repeat(60));
            console.log(response);
            console.log('─'.repeat(60));
            console.log(`\n⏱️  Latency: ${elapsed}ms`);
            console.log(`💰 Daily cost so far: $${agent.dailyCloudCost.toFixed(6)}`);
            console.log(`📊 Budget remaining: $${(agent.maxDailyCloudCost - agent.dailyCloudCost).toFixed(6)}\n`);

        } catch (error) {
            console.error(`❌ Cloud AI failed: ${error.message}\n`);
        }
    } else {
        console.log('ℹ️  Test skipped - routing chose LOCAL instead\n');
    }

    console.log('═══════════════════════════════════════════');
    console.log('FINAL STATISTICS');
    console.log('═══════════════════════════════════════════\n');

    const stats = agent.aiosBridge.getStats();
    console.log('📊 SP4AIOS Bridge Statistics:\n');
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n💰 Cost Summary:');
    console.log(`   Total spent today: $${agent.dailyCloudCost.toFixed(6)}`);
    console.log(`   Budget limit: $${agent.maxDailyCloudCost.toFixed(2)}`);
    console.log(`   Remaining: $${(agent.maxDailyCloudCost - agent.dailyCloudCost).toFixed(6)}`);
    console.log(`   Utilization: ${((agent.dailyCloudCost / agent.maxDailyCloudCost) * 100).toFixed(2)}%`);

    console.log('\n✅ Live test completed!\n');

})().catch(err => {
    console.error('❌ Test failed:', err);
    console.error(err.stack);
    process.exit(1);
});
