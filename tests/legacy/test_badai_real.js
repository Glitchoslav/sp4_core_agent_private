#!/usr/bin/env node

/**
 * 🌀 BADAI QUANTUM BRIDGE - REAL API TEST
 * Testing Walter Pepenberg's BADAI agents with correct API endpoint
 */

import dotenv from 'dotenv';
dotenv.config();

const BADAI_CONFIG = {
    token: process.env.BADAI_API_TOKEN || process.env.BADAI_TOKEN,
    baseUrl: process.env.BADAI_BASE_URL || 'https://api.badai.com/v1',
    agents: {
        GENERAL: process.env.BADAI_AGENT_GENERAL,
        CODING: process.env.BADAI_AGENT_CODING,
        DEPLOY: process.env.BADAI_AGENT_DEPLOY,
        CREATIVE: process.env.BADAI_AGENT_CREATIVE,
        POPICI: process.env.BADAI_AGENT_POPICI,
        JUDR: process.env.BADAI_AGENT_JUDR,
        SACRED: process.env.BADAI_AGENT_SACRED
    }
};

console.log('\n🌀 BADAI QUANTUM BRIDGE - REAL API TEST 🌀\n');
console.log('━'.repeat(70));
console.log('\n📋 Configuration:');
console.log(`   Base URL: ${BADAI_CONFIG.baseUrl}`);
console.log(`   Token configured: ${BADAI_CONFIG.token ? 'YES' : 'NO'}`);
console.log(`   Agents configured: ${Object.keys(BADAI_CONFIG.agents).length}`);
console.log('\n━'.repeat(70));

if (!BADAI_CONFIG.token) {
    console.error('\n❌ Missing BADAI token. Set BADAI_API_TOKEN (or BADAI_TOKEN) before running this script.\n');
    process.exit(1);
}

/**
 * Test BADAI API endpoint
 */
async function testBadaiEndpoint(endpoint, method = 'GET', body = null) {
    try {
        const url = `${BADAI_CONFIG.baseUrl}${endpoint}`;
        console.log(`\n🔍 Testing: ${method} ${url}`);

        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${BADAI_CONFIG.token}`,
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.text();

        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Response length: ${data.length} bytes`);

        // Try to parse as JSON
        try {
            const jsonData = JSON.parse(data);
            console.log('   Response type: JSON');
            console.log('   Data:', JSON.stringify(jsonData, null, 2).substring(0, 500));
            return { success: true, data: jsonData, raw: data };
        } catch (e) {
            console.log('   Response type: Text/HTML');
            console.log('   Preview:', data.substring(0, 200) + '...');
            return { success: false, data: null, raw: data };
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test chat with BADAI agent
 */
async function chatWithAgent(agentId, message) {
    console.log(`\n💬 Chatting with agent: ${agentId.substring(0, 8)}...`);
    console.log(`   Message: "${message}"`);

    const endpoints = [
        `/agents/${agentId}/chat`,
        `/chat`,
        `/agents/${agentId}/messages`,
        `/completions`
    ];

    for (const endpoint of endpoints) {
        const result = await testBadaiEndpoint(endpoint, 'POST', {
            message,
            agent_id: agentId,
            messages: [{ role: 'user', content: message }]
        });

        if (result.success) {
            console.log(`   ✅ Success with endpoint: ${endpoint}`);
            return result;
        }
    }

    console.log('   ❌ All chat endpoints failed');
    return { success: false };
}

/**
 * Main test sequence
 */
async function main() {
    console.log('\n\n🚀 TESTING BADAI API ENDPOINTS:\n');

    // Test 1: List models/agents
    console.log('\n📋 Test 1: List available models/agents');
    await testBadaiEndpoint('/models');
    await testBadaiEndpoint('/agents');
    await testBadaiEndpoint('/chat/models');

    // Test 2: Get agent details
    console.log('\n\n📋 Test 2: Get agent details');
    const generalAgent = BADAI_CONFIG.agents.GENERAL;
    if (generalAgent) {
        await testBadaiEndpoint(`/agents/${generalAgent}`);
        await testBadaiEndpoint(`/models/${generalAgent}`);
    }

    // Test 3: Chat completion (OpenAI-like format)
    console.log('\n\n📋 Test 3: Chat completion (OpenAI-like)');
    const chatResult = await testBadaiEndpoint('/chat/completions', 'POST', {
        model: BADAI_CONFIG.agents.GENERAL,
        messages: [
            { role: 'user', content: 'Hello! Who are you?' }
        ],
        max_tokens: 100
    });

    // Test 4: Simple completion
    console.log('\n\n📋 Test 4: Simple completion');
    await testBadaiEndpoint('/completions', 'POST', {
        prompt: 'Hello! Who are you?',
        model: BADAI_CONFIG.agents.GENERAL,
        max_tokens: 100
    });

    // Test 5: Chat with specific agent
    console.log('\n\n📋 Test 5: Chat with CODING agent');
    if (BADAI_CONFIG.agents.CODING) {
        await chatWithAgent(BADAI_CONFIG.agents.CODING, 'Write a hello world in Python');
    }

    // Test 6: Health check
    console.log('\n\n📋 Test 6: Health/Status check');
    await testBadaiEndpoint('/health');
    await testBadaiEndpoint('/status');
    await testBadaiEndpoint('/');

    console.log('\n\n━'.repeat(70));
    console.log('\n🎉 BADAI API TEST COMPLETE!\n');
    console.log('If all endpoints returned HTML, BADAI might not be an AI API.');
    console.log('Check if there\'s documentation at: https://badai.com/docs or /api-docs\n');
}

main().catch(console.error);
