// test_aios_integration.js - Test SP4AIOS bridge integrácie
import { SP4IntegratedAgent } from './integration.js';

(async () => {
    console.log('🧪 Testing SP4AIOS Integration\n');

    // Create integration agent
    const integration = new SP4IntegratedAgent('kefyk');

    // Initialize agent first
    console.log('⚙️  Initializing SP4 Integrated Agent...\n');
    await integration.initialize();

    // Test 1: Simple message (should use LOCAL)
    console.log('═══════════════════════════════════════════');
    console.log('TEST 1: Simple greeting (should use LOCAL)');
    console.log('═══════════════════════════════════════════\n');

    const simpleMessage = 'ahoj, ako sa mas?';
    console.log(`📨 Input: "${simpleMessage}"`);

    const result1 = await integration.processMessage(simpleMessage, 'auto');
    console.log(`✅ Response: ${result1.response.substring(0, 150)}...`);
    console.log(`🎯 Cloud used: ${result1.usedCloud ? 'YES' : 'NO'}`);
    console.log(`💰 Cost: $${result1.cloudCost || 0}`);
    console.log(`⚡ Latency: ${result1.cloudLatency || 'N/A'}ms`);
    console.log('\n');

    // Test 2: Complex coding question (should use CLOUD if enabled)
    console.log('═══════════════════════════════════════════');
    console.log('TEST 2: Complex coding task (should use CLOUD)');
    console.log('═══════════════════════════════════════════\n');

    const complexMessage = `Create a complete production-ready Express.js REST API with:\n1. JWT authentication and refresh tokens\n2. MongoDB integration via Mongoose\n3. Rate limiting middleware (100 req/min)\n4. Winston logging to files\n5. Input validation using Joi\n6. Error handling middleware\n7. Swagger documentation\n8. Docker setup with docker-compose.yml\n9. Unit tests using Jest\n10. CI/CD pipeline for GitHub Actions\n\nStructure the code into directories (controllers, routes, middleware, models, services, utils, config).`;

    console.log(`📨 Input: [Complex coding task, ${complexMessage.length} chars]`);

    const result2 = await integration.processMessage(complexMessage, 'auto');
    console.log(`✅ Response preview: ${result2.response.substring(0, 200)}...`);
    console.log(`🎯 Cloud used: ${result2.usedCloud ? 'YES ✅' : 'NO ❌'}`);
    console.log(`☁️  Provider: ${result2.cloudProvider || 'local'}`);
    console.log(`🤖 Model: ${result2.cloudModel || 'ollama'}`);
    console.log(`💰 Cost: $${result2.cloudCost ? result2.cloudCost.toFixed(6) : '0.000000'}`);
    console.log(`⚡ Latency: ${result2.cloudLatency || 'N/A'}ms`);
    console.log(`💾 Daily total: $${integration.dailyCloudCost.toFixed(4)}`);

    // Print system status
    console.log('\n═══════════════════════════════════════════');
    console.log('SYSTEM STATUS');
    console.log('═══════════════════════════════════════════\n');

    const status = integration.getSystemStatus();
    console.log(JSON.stringify(status, null, 2));

    console.log('\n✅ Integration test completed!');
})().catch(err => {
    console.error('❌ Test failed:', err);
    console.error(err.stack);
    process.exit(1);
});
