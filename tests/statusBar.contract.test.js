// tests/statusBar.contract.test.js
// Contract test for status bar renderer: return value is string, printing is side-effect helper.

import { printStatusBar, renderStatusBar } from '../src/interface/statusBar.js';

function assert(name, condition) {
    if (!condition) throw new Error(`ASSERT FAIL: ${name}`);
}

async function run() {
    console.log('🧪 STATUS BAR CONTRACT TEST\n');

    const input = {
        health: {
            version: 'v1.2.0',
            checks: {
                memoryDir: true,
                dataDir: true,
            },
        },
        agents: ['CORE', 'GLITCH', 'POPIČI', 'VALID'],
        jobs: 4,
    };

    const rendered = await renderStatusBar(input);
    assert('renderStatusBar returns string', typeof rendered === 'string');
    assert('contains version', rendered.includes('[SP4 OS v1.2.0]'));
    assert('contains agents', rendered.includes('[agents: CORE/GLITCH/POPIČI/VALID]'));
    assert('contains jobs', rendered.includes('[jobs: 4]'));

    const originalConsoleLog = console.log;
    const lines = [];
    console.log = (...args) => {
        lines.push(args.join(' '));
    };

    try {
        await printStatusBar(input);
    } finally {
        console.log = originalConsoleLog;
    }

    assert('printStatusBar emits exactly one line', lines.length === 1);
    assert('printStatusBar emits rendered status string', lines[0] === rendered);

    console.log('✅ PASS: status bar contract');
}

run().catch((err) => {
    console.error('❌ FAIL:', err.message);
    process.exitCode = 1;
});
