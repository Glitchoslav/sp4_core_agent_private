import assert from 'node:assert/strict';

import { buildSystemStatusText } from '../src/commands/systemCommand.js';
import { runBootSequence } from '../src/startup/bootSequence.js';

const originalFetch = globalThis.fetch;

const baseHealth = {
    ok: false,
    checks: {
        bible: true,
        architectureDoc: true,
        memoryDir: true,
        dataDir: true,
        scheduler: true,
    },
};

const baseSpgDiag = {
    enabled: true,
    version: '0.1.1',
    statesCount: 1,
    stateIds: ['cpr_adult'],
    totalKeywords: 19,
};

function createFetchMock({ ok = true, models = [], throws = false } = {}) {
    return async () => {
        if (throws) {
            throw new Error('offline');
        }

        return {
            ok,
            async json() {
                return { models };
            },
        };
    };
}

async function withMockedFetch(fetchMock, callback) {
    globalThis.fetch = fetchMock;

    try {
        await callback();
    } finally {
        globalThis.fetch = originalFetch;
    }
}

function getLine(text, prefix) {
    return text.split('\n').find((line) => line.startsWith(prefix));
}

console.log('🧪 TEST: /system model status rendering');

const emptyRegistryText = buildSystemStatusText({
    health: {
        ...baseHealth,
        checks: {
            ...baseHealth.checks,
            ollama: true,
            modelsAvailable: false,
        },
    },
    spgDiag: baseSpgDiag,
});

assert.match(emptyRegistryText, /Models: NO LOCAL MODELS/, 'empty registry should render as NO LOCAL MODELS');

const unreachableText = buildSystemStatusText({
    health: {
        ...baseHealth,
        checks: {
            ...baseHealth.checks,
            ollama: false,
            modelsAvailable: false,
        },
    },
    spgDiag: baseSpgDiag,
});

assert.match(unreachableText, /Models: UNREACHABLE/, 'unreachable probe should render as UNREACHABLE');

let httpErrorText = '';
await withMockedFetch(createFetchMock({ ok: false }), async () => {
    const health = await runBootSequence({ quiet: true, autoStartOllama: false });
    httpErrorText = buildSystemStatusText({ health, spgDiag: baseSpgDiag });
});

let thrownText = '';
await withMockedFetch(createFetchMock({ throws: true }), async () => {
    const health = await runBootSequence({ quiet: true, autoStartOllama: false });
    thrownText = buildSystemStatusText({ health, spgDiag: baseSpgDiag });
});

assert.equal(getLine(httpErrorText, 'Models:'), 'Models: UNREACHABLE', 'HTTP error should render model status as UNREACHABLE');
assert.equal(getLine(thrownText, 'Models:'), 'Models: UNREACHABLE', 'thrown probe should render model status as UNREACHABLE');
assert.equal(getLine(httpErrorText, 'Models:'), getLine(thrownText, 'Models:'), 'HTTP error and thrown probe should render the same UNREACHABLE status line');

const okText = buildSystemStatusText({
    health: {
        ...baseHealth,
        ok: true,
        checks: {
            ...baseHealth.checks,
            ollama: true,
            modelsAvailable: true,
        },
    },
    spgDiag: baseSpgDiag,
});

assert.match(okText, /Models: OK/, 'reachable Ollama with models should render as OK');

console.log('✅ /system model status rendering works');