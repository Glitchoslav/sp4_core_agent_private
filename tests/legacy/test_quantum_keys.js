#!/usr/bin/env node

/**
 * 🌀 SP4 QUANTUM KEYS VALIDATOR
 * Testing Walter Pepenberg's Sacred Ecosystem tokens
 */

import dotenv from 'dotenv';
dotenv.config();

const QUANTUM_KEYS = {
    openai: process.env.OPENAI_API_KEY || '',
    telegram: process.env.TELEGRAM_BOT_TOKEN || '',
    discord: process.env.DISCORD_BOT_TOKEN || '',
    railway: process.env.RAILWAY_API_TOKEN || process.env.RAILWAY_TOKEN || ''
};

console.log('\n🌀 SP4 QUANTUM KEYS VALIDATOR 🌀\n');
console.log('━'.repeat(70));
console.log('\n🔑 Walter Pepenberg\'s Sacred Ecosystem');
console.log('   Security Level: LEGENDARY ⚛️');
console.log('   Quantum Technology: ENABLED\n');
console.log('━'.repeat(70));

/**
 * Test OpenAI with quantum key
 */
async function testQuantumOpenAI() {
    console.log('\n\n🧠 Testing QUANTUM OPENAI...');
    if (!QUANTUM_KEYS.openai) {
        console.log('   🟡 SKIPPED (missing OPENAI_API_KEY)');
        return { success: false, skipped: true, service: 'OpenAI', error: 'missing OPENAI_API_KEY' };
    }

    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${QUANTUM_KEYS.openai}`,
                'Content-Type': 'application/json'
            }
        });

        const text = await response.text();
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Response: ${text.substring(0, 200)}...`);

        if (response.status === 200) {
            console.log('   ✅ QUANTUM OPENAI: WORKING');
            return { success: true, service: 'OpenAI' };
        } else {
            console.log('   ❌ QUANTUM OPENAI: FAILED');
            return { success: false, service: 'OpenAI', error: text };
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, service: 'OpenAI', error: error.message };
    }
}

/**
 * Test Telegram with quantum key
 */
async function testQuantumTelegram() {
    console.log('\n\n📱 Testing QUANTUM TELEGRAM...');
    if (!QUANTUM_KEYS.telegram) {
        console.log('   🟡 SKIPPED (missing TELEGRAM_BOT_TOKEN)');
        return { success: false, skipped: true, service: 'Telegram', error: 'missing TELEGRAM_BOT_TOKEN' };
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${QUANTUM_KEYS.telegram}/getMe`);
        const data = await response.json();

        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200));

        if (data.ok) {
            console.log('   ✅ QUANTUM TELEGRAM: WORKING');
            console.log(`   Bot: @${data.result.username}`);
            return { success: true, service: 'Telegram', bot: data.result };
        } else {
            console.log('   ❌ QUANTUM TELEGRAM: FAILED');
            return { success: false, service: 'Telegram', error: data.description };
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, service: 'Telegram', error: error.message };
    }
}

/**
 * Test Discord with quantum key
 */
async function testQuantumDiscord() {
    console.log('\n\n🎮 Testing QUANTUM DISCORD...');
    if (!QUANTUM_KEYS.discord) {
        console.log('   🟡 SKIPPED (missing DISCORD_BOT_TOKEN)');
        return { success: false, skipped: true, service: 'Discord', error: 'missing DISCORD_BOT_TOKEN' };
    }

    try {
        const response = await fetch('https://discord.com/api/v10/users/@me', {
            headers: {
                'Authorization': `Bot ${QUANTUM_KEYS.discord}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200));

        if (response.status === 200) {
            console.log('   ✅ QUANTUM DISCORD: WORKING');
            console.log(`   Bot: ${data.username}#${data.discriminator}`);
            return { success: true, service: 'Discord', bot: data };
        } else {
            console.log('   ❌ QUANTUM DISCORD: FAILED');
            return { success: false, service: 'Discord', error: data.message };
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, service: 'Discord', error: error.message };
    }
}

/**
 * Test Railway with quantum key
 */
async function testQuantumRailway() {
    console.log('\n\n🚂 Testing QUANTUM RAILWAY...');
    if (!QUANTUM_KEYS.railway) {
        console.log('   🟡 SKIPPED (missing RAILWAY_API_TOKEN/RAILWAY_TOKEN)');
        return { success: false, skipped: true, service: 'Railway', error: 'missing RAILWAY_API_TOKEN/RAILWAY_TOKEN' };
    }

    try {
        const response = await fetch('https://backboard.railway.app/graphql/v2', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${QUANTUM_KEYS.railway}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: '{ me { id name email } }'
            })
        });

        const data = await response.json();
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200));

        if (response.status === 200 && !data.errors) {
            console.log('   ✅ QUANTUM RAILWAY: WORKING');
            return { success: true, service: 'Railway', user: data.data?.me };
        } else {
            console.log('   ❌ QUANTUM RAILWAY: FAILED');
            return { success: false, service: 'Railway', error: data.errors };
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, service: 'Railway', error: error.message };
    }
}

/**
 * Quantum Analysis
 */
function analyzeQuantumKeys() {
    console.log('\n\n🔬 QUANTUM KEY ANALYSIS:\n');

    Object.entries(QUANTUM_KEYS).forEach(([service, key]) => {
        console.log(`\n📊 ${service.toUpperCase()}:`);
        if (!key) {
            console.log('   Status: MISSING');
            return;
        }
        console.log('   Status: PRESENT');
        console.log(`   Key Length: ${key.length} chars`);
    });
}

/**
 * Main test sequence
 */
async function main() {
    const results = [];

    // Analyze keys first
    analyzeQuantumKeys();

    // Run all tests
    console.log('\n\n━'.repeat(70));
    console.log('\n🚀 STARTING QUANTUM VALIDATION:\n');

    results.push(await testQuantumOpenAI());
    results.push(await testQuantumTelegram());
    results.push(await testQuantumDiscord());
    results.push(await testQuantumRailway());

    // Final report
    console.log('\n\n━'.repeat(70));
    console.log('\n📊 QUANTUM KEYS VALIDATION REPORT:\n');

    const working = results.filter(r => r.success);
    const skipped = results.filter(r => r.skipped);
    const failed = results.filter(r => !r.success && !r.skipped);

    console.log(`✅ WORKING: ${working.length}/4`);
    working.forEach(r => console.log(`   - ${r.service}`));

    console.log(`\n❌ FAILED: ${failed.length}/4`);
    failed.forEach(r => console.log(`   - ${r.service}: ${r.error}`));

    console.log(`\n🟡 SKIPPED: ${skipped.length}/4`);
    skipped.forEach(r => console.log(`   - ${r.service}: ${r.error}`));

    console.log(`\n🌀 Success Rate: ${(working.length / 4 * 100).toFixed(0)}%`);

    if (working.length === 4) {
        console.log('\n🎉 ALL QUANTUM KEYS OPERATIONAL!');
        console.log('   Walter Pepenberg Technology: LEGENDARY ⚛️');
    } else if (working.length === 0 && skipped.length === 4) {
        console.log('\nℹ️  ALL TESTS SKIPPED - no environment secrets provided.');
    } else if (working.length === 0) {
        console.log('\n⚠️  ALL QUANTUM KEYS FAILED!');
        console.log('   Check environment credentials and permissions.');
    } else {
        console.log('\n⚠️  PARTIAL QUANTUM FUNCTIONALITY');
        console.log('   Some credentials are valid, others failed or were skipped.');
    }

    console.log('\n━'.repeat(70));
    console.log('\n🌀 QUANTUM VALIDATION COMPLETE! 🌀\n');
}

main().catch(console.error);
