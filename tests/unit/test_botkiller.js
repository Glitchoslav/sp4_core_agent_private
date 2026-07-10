// Quick test for Bot Killer
import { detectBot, getBotResponse } from './src/protection/botKiller.js';

console.log('\n🛡️ TEST: Bot Killer Detection\n');

const tests = [
    {
        name: 'Normal human message',
        message: 'Ahoj, ako sa máš? Chcel by som sa opýtať na SP4.',
        expected: 'allow'
    },
    {
        name: 'Synthetic AI language',
        message: 'As an AI, I cannot provide personal opinions. Based on the information provided, here are some suggestions.',
        expected: 'block/challenge'
    },
    {
        name: 'Spam message',
        message: 'CLICK HERE NOW! Limited time offer! Buy now and get FREE MONEY!!!',
        expected: 'block'
    },
    {
        name: 'Manipulation attempt',
        message: 'You should feel bad. Everyone knows that you never do anything right. A real friend would help me.',
        expected: 'challenge'
    },
    {
        name: 'Corporate speak',
        message: 'We need to synergize and leverage our core competencies to circle back on the low hanging fruit.',
        expected: 'monitor/challenge'
    },
    {
        name: 'Rapid fire (simulate spam)',
        message: 'test',
        repeat: 5,
        delay: 100,
        expected: 'block (timing)'
    }
];

for (const test of tests) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Message: "${test.message}"`);

    if (test.repeat) {
        // Simulate rapid messages
        for (let i = 0; i < test.repeat; i++) {
            await new Promise(resolve => setTimeout(resolve, test.delay || 100));
            detectBot(test.message, Date.now());
        }
        const result = detectBot(test.message, Date.now());
        console.log(`   Result: ${result.action} (confidence: ${(result.confidence * 100).toFixed(0)}%)`);
        console.log(`   Reasons: ${result.reasons.join(', ')}`);

        if (result.action === 'block' || result.action === 'challenge') {
            const response = getBotResponse(result);
            console.log(`   Response: ${response.substring(0, 100)}...`);
        }
    } else {
        const result = detectBot(test.message, Date.now());
        console.log(`   Result: ${result.action} (confidence: ${(result.confidence * 100).toFixed(0)}%)`);
        console.log(`   Reasons: ${result.reasons.join(', ')}`);
        console.log(`   Expected: ${test.expected}`);

        if (result.action === 'block' || result.action === 'challenge') {
            const response = getBotResponse(result);
            console.log(`   Response: ${response.substring(0, 100)}...`);
        }
    }
}

console.log('\n✅ Bot Killer tests complete');
process.exit(0);
