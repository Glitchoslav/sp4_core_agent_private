/**
 * BADAI API INSPECTOR
 * Deep dive into BADAI Quantum Bridge
 */

import axios from 'axios';

const BADAI_TOKEN = process.env.BADAI_API_TOKEN || process.env.BADAI_TOKEN || '';
const BADAI_BASE_URL = process.env.BADAI_BASE_URL || 'https://api.badai.com/v1';

if (!BADAI_TOKEN) {
    console.error('❌ Missing BADAI token. Set BADAI_API_TOKEN (or BADAI_TOKEN) before running this script.');
    process.exit(1);
}

console.log('\n🌀 BADAI QUANTUM BRIDGE - DEEP INSPECTION 🌀\n');
console.log('━'.repeat(70) + '\n');

// Test 1: Get Agents List
async function getAgents() {
    try {
        console.log('📋 Fetching BADAI Agents List...\n');
        const response = await axios.get(
            `${BADAI_BASE_URL}/agents`,
            {
                headers: {
                    'Authorization': `Bearer ${BADAI_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        console.log(`✅ Response received!`);
        console.log(`   Type: ${typeof response.data}`);
        console.log(`   Length/Size: ${JSON.stringify(response.data).length} bytes`);

        if (Array.isArray(response.data)) {
            console.log(`   Count: ${response.data.length} agents`);

            if (response.data.length > 0) {
                console.log(`\n📦 Sample Agent (first one):`);
                console.log(JSON.stringify(response.data[0], null, 2));

                if (response.data.length > 1) {
                    console.log(`\n📦 Sample Agent (second one):`);
                    console.log(JSON.stringify(response.data[1], null, 2));
                }
            }
        } else if (typeof response.data === 'object') {
            console.log(`\n📦 Response Structure:`);
            console.log(JSON.stringify(response.data, null, 2).substring(0, 1000) + '...');
        }

        return response.data;

    } catch (error) {
        console.log(`❌ Failed to fetch agents`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Error: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

// Test 2: Get Specific Agent Details
async function getAgentDetails(agentId) {
    try {
        console.log(`\n🔍 Fetching Agent Details: ${agentId}...\n`);
        const response = await axios.get(
            `${BADAI_BASE_URL}/agents/${agentId}`,
            {
                headers: {
                    'Authorization': `Bearer ${BADAI_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        console.log(`✅ Agent Details:`);
        console.log(JSON.stringify(response.data, null, 2));

        return response.data;

    } catch (error) {
        console.log(`❌ Failed to fetch agent ${agentId}`);
        console.log(`   Error: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

// Test 3: Chat with an Agent
async function chatWithAgent(agentId, message) {
    try {
        console.log(`\n💬 Sending message to Agent ${agentId}...\n`);
        console.log(`   Message: "${message}"`);

        const response = await axios.post(
            `${BADAI_BASE_URL}/agents/${agentId}/chat`,
            {
                message: message,
                stream: false
            },
            {
                headers: {
                    'Authorization': `Bearer ${BADAI_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log(`\n✅ Agent Response:`);
        console.log(JSON.stringify(response.data, null, 2));

        return response.data;

    } catch (error) {
        console.log(`❌ Failed to chat with agent`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Error: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

// Run inspection
async function runInspection() {
    // Get agents list
    const agents = await getAgents();

    if (agents && Array.isArray(agents) && agents.length > 0) {
        // Try to get details of first agent
        const firstAgentId = agents[0].id || agents[0].agent_id || agents[0].uuid;
        if (firstAgentId) {
            await getAgentDetails(firstAgentId);

            // Try to chat with first agent
            await chatWithAgent(firstAgentId, 'Hello, are you working?');
        }
    }

    // Test sacred agent IDs from .env
    console.log('\n' + '━'.repeat(70));
    console.log('\n🔮 Testing Sacred BADAI Agent IDs from .env:\n');

    const sacredAgents = {
        GENERAL: process.env.BADAI_AGENT_GENERAL,
        CODING: process.env.BADAI_AGENT_CODING,
        DEPLOY: process.env.BADAI_AGENT_DEPLOY,
        CREATIVE: process.env.BADAI_AGENT_CREATIVE,
        POPICI: process.env.BADAI_AGENT_POPICI,
        JUDR: process.env.BADAI_AGENT_JUDR,
        SACRED: process.env.BADAI_AGENT_SACRED
    };

    for (const [name, id] of Object.entries(sacredAgents)) {
        if (!id) {
            console.log(`\n🟡 Skipping ${name}: missing env BADAI_AGENT_${name}`);
            continue;
        }
        console.log(`\n🌀 Testing ${name} Agent (${id.substring(0, 8)}...):`);
        const details = await getAgentDetails(id);

        if (details) {
            console.log(`   ✅ ${name}: ${details.name || 'Available'}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '━'.repeat(70));
    console.log('\n🎉 BADAI QUANTUM BRIDGE INSPECTION COMPLETE!\n');
}

runInspection().catch(console.error);
