// Test: Offline models + Online cloud AI mixing
// Overíme či SP4 dokáže inteligentne prepínať medzi local/cloud

import { SP4IntegratedAgent } from './integration.js';

(async () => {
    console.log('🧪 TEST: Offline/Online AI Mixing\n');
    console.log('═══════════════════════════════════════════\n');

    const agent = new SP4IntegratedAgent('test_user');
    await agent.initialize();

    // Test 1: Simple query → Should use LOCAL (Ollama)
    console.log('TEST 1: Simple greeting (should use LOCAL Ollama)\n');
    const test1 = await agent.processMessage('ahoj', 'auto');
    console.log(`✅ Response: ${test1.response.substring(0, 100)}...`);
    console.log(`🎯 Used cloud: ${test1.usedCloud ? 'YES ☁️' : 'NO 🏠'}`);
    console.log(`💰 Cost: $${test1.cloudCost || 0}\n`);

    // Test 2: Complex coding task → Should use CLOUD (Groq)
    console.log('═══════════════════════════════════════════');
    console.log('TEST 2: Complex coding task (should use CLOUD)\n');

    const complexQuery = `Vytvor kompletný Express.js REST API s:
1. JWT authentication
2. MongoDB + Mongoose
3. Rate limiting
4. Input validation (Joi)
5. Error handling middleware
6. Docker setup
7. Unit tests (Jest)`;

    const test2 = await agent.processMessage(complexQuery, 'auto');
    console.log(`✅ Response preview: ${test2.response.substring(0, 150)}...`);
    console.log(`🎯 Used cloud: ${test2.usedCloud ? 'YES ☁️' : 'NO 🏠'}`);
    console.log(`💰 Cost: $${test2.cloudCost ? test2.cloudCost.toFixed(6) : '0.000000'}`);
    console.log(`⚡ Latency: ${test2.cloudLatency || 'N/A'}ms`);
    console.log(`☁️  Provider: ${test2.cloudProvider || 'local'}`);
    console.log(`🤖 Model: ${test2.cloudModel || 'ollama'}\n`);

    // Test 3: Medium complexity → Intelligent routing
    console.log('═══════════════════════════════════════════');
    console.log('TEST 3: Medium complexity (intelligent routing)\n');

    const mediumQuery = 'Vysvetli mi čo je async/await v JavaScripte';
    const test3 = await agent.processMessage(mediumQuery, 'auto');
    console.log(`✅ Response preview: ${test3.response.substring(0, 150)}...`);
    console.log(`🎯 Used cloud: ${test3.usedCloud ? 'YES ☁️' : 'NO 🏠'}`);
    console.log(`💰 Cost: $${test3.cloudCost ? test3.cloudCost.toFixed(6) : '0.000000'}\n`);

    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('📊 SUMMARY\n');
    const totalCost = (test1.cloudCost || 0) + (test2.cloudCost || 0) + (test3.cloudCost || 0);
    console.log(`Total cost: $${totalCost.toFixed(6)}`);
    console.log(`Daily budget remaining: $${(agent.maxDailyCloudCost - agent.dailyCloudCost).toFixed(4)}`);
    console.log(`Cloud AI enabled: ${agent.cloudAIEnabled ? 'YES ✅' : 'NO ❌'}`);

    console.log('\n✅ Test completed!\n');
})().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
