/**
 * LIVE TEST: v0.7 Integration
 * Tests /context, /mode, auto mode detection, context locking
 */

import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

console.log('🧪 SP4_CORE_AGENT v0.7 LIVE TEST\n');

const proc = spawn('node', ['index_v07.js'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';

proc.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(text);
});

proc.stderr.on('data', (data) => {
    process.stderr.write(data);
});

async function sendCommand(cmd, delay = 2000) {
    console.log(`\n> ${cmd}`);
    proc.stdin.write(cmd + '\n');
    await sleep(delay);
}

async function runTests() {
    // Wait for initialization
    await sleep(5000);

    console.log('\n📋 TEST SEQUENCE:\n');

    // Test 1: /help
    await sendCommand('/help', 1000);

    // Test 2: /context (should be empty)
    await sendCommand('/context', 1000);

    // Test 3: Send message (auto mode)
    await sendCommand('Som smutný a unavený', 8000);

    // Test 4: /context (should show EMPATIA lock)
    await sendCommand('/context', 1000);

    // Test 5: Send weak message (should stay locked)
    await sendCommand('Ako sa máš?', 8000);

    // Test 6: /context (lock should decay)
    await sendCommand('/context', 1000);

    // Test 7: Send intense message
    await sendCommand('Kurva, kokot, dosť je toho!!!', 8000);

    // Test 8: /context (should show POPICI force unlock)
    await sendCommand('/context', 1000);

    // Test 9: /mode core
    await sendCommand('/mode core', 1000);

    // Test 10: /context (should show CORE manual lock)
    await sendCommand('/context', 1000);

    // Test 11: /unlock
    await sendCommand('/unlock', 1000);

    // Test 12: /exit
    await sendCommand('/exit', 3000);

    console.log('\n✅ Test sequence completed!');
    process.exit(0);
}

runTests().catch(console.error);
