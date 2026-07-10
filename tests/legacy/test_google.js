// test_google.js - Test Google Gemini provider
import { SP4IntegratedAgent } from './integration.js';

console.log('🌐 Testing Google Gemini 2.5 Flash\n');

(async () => {
    const agent = new SP4IntegratedAgent('kefyk');
    await agent.initialize();
    agent.degradationManager.currentLevel = 'FULL';

    console.log('═══════════════════════════════════════════');
    console.log('TEST 1: Google Gemini - Simple question');
    console.log('═══════════════════════════════════════════\n');

    const prompt1 = 'What are the top 3 programming languages in 2024?';
    console.log(`📨 Prompt: "${prompt1}"\n`);

    const startTime1 = Date.now();
    try {
        // Force Google provider
        const response1 = await agent.aiosBridge.ask(prompt1, {
            provider: 'google',
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            maxTokens: 300
        });

        const elapsed1 = Date.now() - startTime1;

        console.log('✅ GOOGLE GEMINI RESPONSE:\n');
        console.log('─'.repeat(70));
        console.log(response1.text);
        console.log('─'.repeat(70));
        console.log(`\n📊 Stats:`);
        console.log(`   Provider: ${response1.provider}`);
        console.log(`   Model: ${response1.model}`);
        console.log(`   Latency: ${response1.latency}ms (total: ${elapsed1}ms)`);
        console.log(`   Cost: $${response1.cost.toFixed(6)} (FREE tier!)`);
        console.log(`   Cached: ${response1.cached ? 'YES' : 'NO'}\n`);

    } catch (error) {
        console.error(`❌ Google failed: ${error.message}\n`);
    }

    console.log('═══════════════════════════════════════════');
    console.log('TEST 2: Google Gemini - Slovak code task');
    console.log('═══════════════════════════════════════════\n');

    const prompt2 = 'Napíš mi jednoduchú Python funkciu na výpočet faktoriálu s rekurziou';
    console.log(`📨 Prompt: "${prompt2}"\n`);

    const startTime2 = Date.now();
    try {
        const response2 = await agent.aiosBridge.ask(prompt2, {
            provider: 'google',
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            maxTokens: 500
        });

        const elapsed2 = Date.now() - startTime2;

        console.log('✅ GOOGLE GEMINI RESPONSE:\n');
        console.log('─'.repeat(70));
        console.log(response2.text);
        console.log('─'.repeat(70));
        console.log(`\n📊 Stats:`);
        console.log(`   Provider: ${response2.provider}`);
        console.log(`   Model: ${response2.model}`);
        console.log(`   Latency: ${response2.latency}ms (total: ${elapsed2}ms)`);
        console.log(`   Cost: $${response2.cost.toFixed(6)} (FREE tier!)`);
        console.log(`   Cached: ${response2.cached ? 'YES' : 'NO'}\n`);

    } catch (error) {
        console.error(`❌ Google failed: ${error.message}\n`);
    }

    console.log('═══════════════════════════════════════════');
    console.log('TEST 3: GROQ vs GOOGLE comparison');
    console.log('═══════════════════════════════════════════\n');

    const comparePrompt = 'Explain what is machine learning in 2 sentences.';
    console.log(`📨 Prompt: "${comparePrompt}"\n`);

    // Test GROQ
    console.log('🚀 Testing GROQ...');
    const groqStart = Date.now();
    let groqResponse;
    try {
        groqResponse = await agent.aiosBridge.ask(comparePrompt, {
            provider: 'groq',
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            maxTokens: 150
        });
        const groqElapsed = Date.now() - groqStart;
        console.log(`✅ GROQ: ${groqElapsed}ms, Cost: $${groqResponse.cost.toFixed(6)}`);
        console.log(`   Response: ${groqResponse.text.substring(0, 100)}...\n`);
    } catch (error) {
        console.error(`❌ GROQ failed: ${error.message}\n`);
    }

    // Test GOOGLE
    console.log('🌐 Testing GOOGLE...');
    const googleStart = Date.now();
    let googleResponse;
    try {
        googleResponse = await agent.aiosBridge.ask(comparePrompt, {
            provider: 'google',
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            maxTokens: 150
        });
        const googleElapsed = Date.now() - googleStart;
        console.log(`✅ GOOGLE: ${googleElapsed}ms, Cost: $${googleResponse.cost.toFixed(6)}`);
        console.log(`   Response: ${googleResponse.text.substring(0, 100)}...\n`);
    } catch (error) {
        console.error(`❌ GOOGLE failed: ${error.message}\n`);
    }

    // Comparison
    if (groqResponse && googleResponse) {
        console.log('📊 COMPARISON:');
        console.log(`   Speed:  GROQ ${groqResponse.latency}ms  vs  GOOGLE ${googleResponse.latency}ms`);
        console.log(`   Cost:   GROQ $${groqResponse.cost.toFixed(6)}  vs  GOOGLE $${googleResponse.cost.toFixed(6)} (FREE)`);
        console.log(`   Winner: Speed → ${groqResponse.latency < googleResponse.latency ? 'GROQ 🏆' : 'GOOGLE 🏆'}`);
        console.log(`           Cost  → GOOGLE 🏆 (always free)\n`);
    }

    console.log('═══════════════════════════════════════════');
    console.log('FINAL STATS');
    console.log('═══════════════════════════════════════════\n');

    const stats = agent.aiosBridge.getStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n✅ Google Gemini test completed!\n');

})().catch(err => {
    console.error('❌ Test failed:', err);
    console.error(err.stack);
    process.exit(1);
});
