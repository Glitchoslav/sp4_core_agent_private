/**
 * WALTER PEPENBERG API TOKEN TESTER
 * Test all sacred API keys for quantum production
 */

import axios from 'axios';

console.log('\n🔥 WALTER PEPENBERG API TOKEN VALIDATOR 🔥\n');
console.log('━'.repeat(70) + '\n');

const tokens = {
    openai: process.env.OPENAI_API_KEY || '',
    groq: process.env.GROQ_API_KEY || '',
    openrouter: process.env.OPENROUTER_API_KEY || '',
    together: process.env.TOGETHER_API_KEY || '',
    anthropic: process.env.ANTHROPIC_API_KEY || '',
    badai: process.env.BADAI_API_TOKEN || process.env.BADAI_TOKEN || '',
    telegram: process.env.TELEGRAM_BOT_TOKEN || ''
};

const results = {
    working: [],
    failed: [],
    untested: []
};

// Test OpenAI
async function testOpenAI() {
    if (!tokens.openai) {
        console.log('🤖 Testing OpenAI API...');
        console.log('   🟡 SKIPPED (missing OPENAI_API_KEY)');
        return null;
    }
    try {
        console.log('🤖 Testing OpenAI API...');
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Say OK' }],
                max_tokens: 5
            },
            {
                headers: {
                    'Authorization': `Bearer ${tokens.openai}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        const reply = response.data.choices[0].message.content;
        console.log(`   ✅ OpenAI: WORKING (response: "${reply}")`);
        results.working.push('OpenAI GPT-3.5-turbo');
        return true;
    } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data?.error?.message || error.message;
        console.log(`   ❌ OpenAI: FAILED (${status}: ${msg})`);
        results.failed.push({ api: 'OpenAI', error: msg });
        return false;
    }
}

// Test Groq
async function testGroq() {
    if (!tokens.groq) {
        console.log('\n⚡ Testing Groq API...');
        console.log('   🟡 SKIPPED (missing GROQ_API_KEY)');
        return null;
    }
    try {
        console.log('\n⚡ Testing Groq API...');
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: 'Say OK' }],
                max_tokens: 5
            },
            {
                headers: {
                    'Authorization': `Bearer ${tokens.groq}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        const reply = response.data.choices[0].message.content;
        console.log(`   ✅ Groq: WORKING (response: "${reply}")`);
        results.working.push('Groq llama-3.1-8b-instant');
        return true;
    } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data?.error?.message || error.message;
        console.log(`   ❌ Groq: FAILED (${status}: ${msg})`);
        results.failed.push({ api: 'Groq', error: msg });
        return false;
    }
}

// Test OpenRouter
async function testOpenRouter() {
    if (!tokens.openrouter) {
        console.log('\n🔀 Testing OpenRouter API...');
        console.log('   🟡 SKIPPED (missing OPENROUTER_API_KEY)');
        return null;
    }
    try {
        console.log('\n🔀 Testing OpenRouter API...');
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'meta-llama/llama-3.2-3b-instruct:free',
                messages: [{ role: 'user', content: 'Say OK' }],
                max_tokens: 5
            },
            {
                headers: {
                    'Authorization': `Bearer ${tokens.openrouter}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        const reply = response.data.choices[0].message.content;
        console.log(`   ✅ OpenRouter: WORKING (response: "${reply}")`);
        results.working.push('OpenRouter (free models)');
        return true;
    } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data?.error?.message || error.message;
        console.log(`   ❌ OpenRouter: FAILED (${status}: ${msg})`);
        results.failed.push({ api: 'OpenRouter', error: msg });
        return false;
    }
}

// Test Together AI
async function testTogether() {
    if (!tokens.together) {
        console.log('\n🤝 Testing Together AI API...');
        console.log('   🟡 SKIPPED (missing TOGETHER_API_KEY)');
        return null;
    }
    try {
        console.log('\n🤝 Testing Together AI API...');
        const response = await axios.post(
            'https://api.together.xyz/v1/chat/completions',
            {
                model: 'meta-llama/Llama-3-8b-chat-hf',
                messages: [{ role: 'user', content: 'Say OK' }],
                max_tokens: 5
            },
            {
                headers: {
                    'Authorization': `Bearer ${tokens.together}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        const reply = response.data.choices[0].message.content;
        console.log(`   ✅ Together AI: WORKING (response: "${reply}")`);
        results.working.push('Together AI Llama-3-8b');
        return true;
    } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data?.message || error.message;
        console.log(`   ❌ Together AI: FAILED (${status}: ${msg})`);
        results.failed.push({ api: 'Together AI', error: msg });
        return false;
    }
}

// Test Anthropic
async function testAnthropic() {
    if (!tokens.anthropic) {
        console.log('\n🧠 Testing Anthropic (Claude) API...');
        console.log('   🟡 SKIPPED (missing ANTHROPIC_API_KEY)');
        return null;
    }
    try {
        console.log('\n🧠 Testing Anthropic (Claude) API...');
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: 'claude-3-haiku-20240307',
                messages: [{ role: 'user', content: 'Say OK' }],
                max_tokens: 10
            },
            {
                headers: {
                    'x-api-key': tokens.anthropic,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        const reply = response.data.content[0].text;
        console.log(`   ✅ Anthropic: WORKING (response: "${reply}")`);
        results.working.push('Anthropic Claude 3 Haiku');
        return true;
    } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data?.error?.message || error.message;
        console.log(`   ❌ Anthropic: FAILED (${status}: ${msg})`);
        results.failed.push({ api: 'Anthropic', error: msg });
        return false;
    }
}

// Test BADAI
async function testBadai() {
    if (!tokens.badai) {
        console.log('\n🌀 Testing BADAI API...');
        console.log('   🟡 SKIPPED (missing BADAI_API_TOKEN/BADAI_TOKEN)');
        return null;
    }
    try {
        console.log('\n🌀 Testing BADAI API...');
        const response = await axios.get(
            'https://api.badai.com/v1/agents',
            {
                headers: {
                    'Authorization': `Bearer ${tokens.badai}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        console.log(`   ✅ BADAI: WORKING (${response.data.length || 'API'} accessible)`);
        results.working.push('BADAI Quantum Bridge');
        return true;
    } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data?.message || error.message;
        console.log(`   ❌ BADAI: FAILED (${status}: ${msg})`);
        results.failed.push({ api: 'BADAI', error: msg });
        return false;
    }
}

// Test Telegram
async function testTelegram() {
    if (!tokens.telegram) {
        console.log('\n📱 Testing Telegram Bot API...');
        console.log('   🟡 SKIPPED (missing TELEGRAM_BOT_TOKEN)');
        return null;
    }
    try {
        console.log('\n📱 Testing Telegram Bot API...');
        const response = await axios.get(
            `https://api.telegram.org/bot${tokens.telegram}/getMe`,
            { timeout: 10000 }
        );

        const botName = response.data.result.username;
        console.log(`   ✅ Telegram: WORKING (@${botName})`);
        results.working.push(`Telegram Bot @${botName}`);
        return true;
    } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data?.description || error.message;
        console.log(`   ❌ Telegram: FAILED (${status}: ${msg})`);
        results.failed.push({ api: 'Telegram', error: msg });
        return false;
    }
}

// Run all tests
async function runAllTests() {
    await testOpenAI();
    await testGroq();
    await testOpenRouter();
    await testTogether();
    await testAnthropic();
    await testBadai();
    await testTelegram();

    console.log('\n' + '━'.repeat(70));
    console.log('\n📊 FINAL RESULTS:\n');

    if (results.working.length > 0) {
        console.log('✅ WORKING APIs:');
        results.working.forEach(api => console.log(`   ✓ ${api}`));
    }

    if (results.failed.length > 0) {
        console.log('\n❌ FAILED APIs:');
        results.failed.forEach(({ api, error }) => {
            console.log(`   ✗ ${api}: ${error.substring(0, 80)}...`);
        });
    }

    const total = results.working.length + results.failed.length;
    const successRate = ((results.working.length / total) * 100).toFixed(0);

    console.log(`\n📈 Success Rate: ${results.working.length}/${total} (${successRate}%)\n`);

    if (results.working.length >= 3) {
        console.log('🎉 WALTER PEPENBERG ARSENAL: READY FOR QUANTUM PRODUCTION! 🚀\n');
    } else {
        console.log('⚠️  Warning: Limited API access. Consider updating tokens.\n');
    }
}

runAllTests().catch(console.error);
