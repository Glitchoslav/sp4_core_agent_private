// test_cloud_direct.js - Direct test of SP4AIOS cloud routing
// Tests cloud AI decision logic WITHOUT waiting for Ollama

import { SP4IntegratedAgent } from './integration.js';

console.log('🧪 Testing SP4AIOS Cloud Routing Logic\n');

(async () => {
    const agent = new SP4IntegratedAgent('kefyk');
    await agent.initialize();

    // Force FULL capability level (not SAFE) for testing
    agent.degradationManager.currentLevel = 'FULL';
    console.log(`⚙️  Capability level set to: ${agent.degradationManager.currentLevel}\n`);

    console.log('═══════════════════════════════════════════');
    console.log('TEST 1: Short prompt (should use LOCAL)');
    console.log('═══════════════════════════════════════════\n');

    const shortPrompt = 'Hello, how are you?';
    const shouldUseCloud1 = agent.shouldUseCloudAI(shortPrompt, 'core', {
        priority: 'normal',
        taskType: 'greeting'
    });

    console.log(`📨 Input: "${shortPrompt}"`);
    console.log(`📏 Length: ${shortPrompt.length} chars`);
    console.log(`🎯 Decision: ${shouldUseCloud1 ? '☁️  CLOUD' : '🏠 LOCAL'}`);
    console.log(`✅ Expected: 🏠 LOCAL`);
    console.log(`${shouldUseCloud1 === false ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('═══════════════════════════════════════════');
    console.log('TEST 2: Long prompt (>2000 chars)');
    console.log('═══════════════════════════════════════════\n');

    const longPrompt = 'Write a detailed explanation '.repeat(100); // ~3000 chars
    const shouldUseCloud2 = agent.shouldUseCloudAI(longPrompt, 'core', {
        priority: 'normal',
        taskType: 'explanation'
    });

    console.log(`📨 Input: [Long text, ${longPrompt.length} chars]`);
    console.log(`🎯 Decision: ${shouldUseCloud2 ? '☁️  CLOUD' : '🏠 LOCAL'}`);
    console.log(`✅ Expected: ☁️  CLOUD`);
    console.log(`${shouldUseCloud2 === true ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('═══════════════════════════════════════════');
    console.log('TEST 3: Code generation task');
    console.log('═══════════════════════════════════════════\n');

    const codePrompt = 'Write a Python script to implement a binary search algorithm with detailed comments and error handling';
    const shouldUseCloud3 = agent.shouldUseCloudAI(codePrompt, 'core', {
        priority: 'normal',
        taskType: 'coding'
    });

    console.log(`📨 Input: "${codePrompt}"`);
    console.log(`📏 Length: ${codePrompt.length} chars`);
    console.log(`🎯 Decision: ${shouldUseCloud3 ? '☁️  CLOUD' : '🏠 LOCAL'}`);
    console.log(`✅ Expected: ☁️  CLOUD (contains "code", "implement")`);
    console.log(`${shouldUseCloud3 === true ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('═══════════════════════════════════════════');
    console.log('TEST 4: Slovak code generation');
    console.log('═══════════════════════════════════════════\n');

    const slovakCodePrompt = 'Vytvor mi Node.js server s Express a MongoDB';
    const shouldUseCloud4 = agent.shouldUseCloudAI(slovakCodePrompt, 'core', {
        priority: 'normal',
        taskType: 'coding'
    });

    console.log(`📨 Input: "${slovakCodePrompt}"`);
    console.log(`📏 Length: ${slovakCodePrompt.length} chars`);
    console.log(`🎯 Decision: ${shouldUseCloud4 ? '☁️  CLOUD' : '🏠 LOCAL'}`);
    console.log(`✅ Expected: ☁️  CLOUD (contains "vytvor.*server")`);
    console.log(`${shouldUseCloud4 === true ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('═══════════════════════════════════════════');
    console.log('TEST 5: Analysis task');
    console.log('═══════════════════════════════════════════\n');

    const analysisPrompt = 'Analyze the differences between React and Vue.js frameworks and compare their performance';
    const shouldUseCloud5 = agent.shouldUseCloudAI(analysisPrompt, 'core', {
        priority: 'normal',
        taskType: 'analysis'
    });

    console.log(`📨 Input: "${analysisPrompt}"`);
    console.log(`📏 Length: ${analysisPrompt.length} chars`);
    console.log(`🎯 Decision: ${shouldUseCloud5 ? '☁️  CLOUD' : '🏠 LOCAL'}`);
    console.log(`✅ Expected: ☁️  CLOUD (contains "analyze", "compare")`);
    console.log(`${shouldUseCloud5 === true ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('═══════════════════════════════════════════');
    console.log('TEST 6: Glitchoslav high priority');
    console.log('═══════════════════════════════════════════\n');

    const glitchPrompt = 'Tell me about consciousness';
    const shouldUseCloud6 = agent.shouldUseCloudAI(glitchPrompt, 'glitchoslav', {
        priority: 'high',
        taskType: 'philosophical'
    });

    console.log(`📨 Input: "${glitchPrompt}"`);
    console.log(`🎭 Mode: glitchoslav (priority: high)`);
    console.log(`🎯 Decision: ${shouldUseCloud6 ? '☁️  CLOUD' : '🏠 LOCAL'}`);
    console.log(`✅ Expected: ☁️  CLOUD (glitchoslav + high priority)`);
    console.log(`${shouldUseCloud6 === true ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('═══════════════════════════════════════════');
    console.log('TEST 7: Explicit cloud request');
    console.log('═══════════════════════════════════════════\n');

    const explicitPrompt = 'What is the meaning of life? [cloud]';
    const shouldUseCloud7 = agent.shouldUseCloudAI(explicitPrompt, 'core', {
        priority: 'normal',
        taskType: 'question'
    });

    console.log(`📨 Input: "${explicitPrompt}"`);
    console.log(`🎯 Decision: ${shouldUseCloud7 ? '☁️  CLOUD' : '🏠 LOCAL'}`);
    console.log(`✅ Expected: ☁️  CLOUD (explicit [cloud] tag)`);
    console.log(`${shouldUseCloud7 === true ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('═══════════════════════════════════════════');
    console.log('TEST 8: Budget exceeded scenario');
    console.log('═══════════════════════════════════════════\n');

    // Simulate budget exceeded
    agent.dailyCloudCost = 6.0; // Over $5 limit
    const budgetPrompt = 'Implement a complex AI system with neural networks';
    const shouldUseCloud8 = agent.shouldUseCloudAI(budgetPrompt, 'core', {
        priority: 'normal',
        taskType: 'coding'
    });

    console.log(`📨 Input: [Complex task that normally needs cloud]`);
    console.log(`💰 Daily cost: $${agent.dailyCloudCost.toFixed(2)} (limit: $${agent.maxDailyCloudCost})`);
    console.log(`🎯 Decision: ${shouldUseCloud8 ? '☁️  CLOUD' : '🏠 LOCAL'}`);
    console.log(`✅ Expected: 🏠 LOCAL (budget exceeded)`);
    console.log(`${shouldUseCloud8 === false ? '✅ PASS' : '❌ FAIL'}\n`);

    // Reset budget
    agent.dailyCloudCost = 0;

    console.log('═══════════════════════════════════════════');
    console.log('TEST 9: Cloud disabled globally');
    console.log('═══════════════════════════════════════════\n');

    // Disable cloud
    agent.cloudAIEnabled = false;
    const disabledPrompt = 'Write a 10000 line application with extensive documentation';
    const shouldUseCloud9 = agent.shouldUseCloudAI(disabledPrompt, 'core', {
        priority: 'normal',
        taskType: 'coding'
    });

    console.log(`📨 Input: [Huge task, ${disabledPrompt.length} chars]`);
    console.log(`⚙️  Cloud AI enabled: ${agent.cloudAIEnabled}`);
    console.log(`🎯 Decision: ${shouldUseCloud9 ? '☁️  CLOUD' : '🏠 LOCAL'}`);
    console.log(`✅ Expected: 🏠 LOCAL (cloud disabled)`);
    console.log(`${shouldUseCloud9 === false ? '✅ PASS' : '❌ FAIL'}\n`);

    // Re-enable cloud
    agent.cloudAIEnabled = true;

    console.log('═══════════════════════════════════════════');
    console.log('TEST 10: Local LLM emergency fallback');
    console.log('═══════════════════════════════════════════\n');

    // Simulate recent local failure
    agent.lastLocalError = Date.now() - 60000; // 1 minute ago
    const emergencyPrompt = 'Simple greeting';
    const shouldUseCloud10 = agent.shouldUseCloudAI(emergencyPrompt, 'core', {
        priority: 'normal',
        taskType: 'greeting'
    });

    console.log(`📨 Input: "${emergencyPrompt}"`);
    console.log(`⚠️  Last local error: ${Math.floor((Date.now() - agent.lastLocalError) / 1000)}s ago`);
    console.log(`🎯 Decision: ${shouldUseCloud10 ? '☁️  CLOUD' : '🏠 LOCAL'}`);
    console.log(`✅ Expected: ☁️  CLOUD (emergency fallback - local failed recently)`);
    console.log(`${shouldUseCloud10 === true ? '✅ PASS' : '❌ FAIL'}\n`);

    // Reset error state
    agent.lastLocalError = null;

    console.log('═══════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════\n');

    const results = [
        shouldUseCloud1 === false,
        shouldUseCloud2 === true,
        shouldUseCloud3 === true,
        shouldUseCloud4 === true,
        shouldUseCloud5 === true,
        shouldUseCloud6 === true,
        shouldUseCloud7 === true,
        shouldUseCloud8 === false,
        shouldUseCloud9 === false,
        shouldUseCloud10 === true
    ];

    const passed = results.filter(r => r === true).length;
    const total = results.length;

    console.log(`📊 Tests passed: ${passed}/${total}`);
    console.log(`${passed === total ? '✅ ALL TESTS PASSED!' : '❌ Some tests failed'}\n`);

    // Test complexity estimation
    console.log('═══════════════════════════════════════════');
    console.log('BONUS: Complexity Estimation');
    console.log('═══════════════════════════════════════════\n');

    const testCases = [
        { text: 'hi', expected: 'simple' },
        { text: 'Can you help me understand recursion?', expected: 'medium' },
        { text: 'Implement a distributed microservices architecture with Kubernetes, Docker, and service mesh', expected: 'complex' },
        { text: 'Write a comprehensive 50-page technical whitepaper on quantum computing algorithms with mathematical proofs and experimental validation data' + ' '.repeat(500), expected: 'expert' }
    ];

    testCases.forEach(({ text, expected }) => {
        const complexity = agent.estimateComplexity(text);
        const pass = complexity === expected;
        console.log(`📝 "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        console.log(`   🎯 Complexity: ${complexity} (expected: ${expected}) ${pass ? '✅' : '❌'}`);
    });

    console.log('\n✅ Test suite completed!\n');

})().catch(err => {
    console.error('❌ Test failed:', err);
    console.error(err.stack);
    process.exit(1);
});
