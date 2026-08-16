import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

const DAY_MS = 24 * 60 * 60 * 1000;
const runtimeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sp4-memory-archive-fifo-'));
process.env.SP4_TEST = 'true';
process.env.SP4_RUNTIME_ROOT = runtimeRoot;

const { getMemoryAge, shouldArchive } = await import('../../memory/metadataHelpers.js');
const { addLogEntry, loadMemory, saveMemory } = await import('../../memory.js');

after(async () => {
    await fs.rm(runtimeRoot, { recursive: true, force: true });
    delete process.env.SP4_TEST;
    delete process.env.SP4_RUNTIME_ROOT;
});

function daysAgo(days) {
    return new Date(Date.now() - (days * DAY_MS)).toISOString();
}

async function seedMemory(entries, maxLogEntries) {
    const memory = await loadMemory();
    memory.preferences = { ...memory.preferences, maxLogEntries };
    memory.rawMemory = {
        log: entries.map(entry => ({ ...entry })),
        stats: { totalInteractions: entries.length }
    };
    memory.archivedMemory = [];
    await saveMemory(memory);
}

function entry(id, days = 10) {
    return {
        id,
        ts: daysAgo(days),
        mode: 'core',
        input: `${id} input`,
        reply: `${id} reply`,
        metadata: {
            importance: 0.2,
            lastUsed: daysAgo(days),
            reasonKept: 'standard'
        }
    };
}

test('1. getMemoryAge supports fresh and old raw-log ts values', () => {
    assert.equal(getMemoryAge({ ts: new Date().toISOString(), metadata: { lastUsed: new Date().toISOString() } }), 0);
    assert.ok(getMemoryAge({ ts: daysAgo(10), metadata: { lastUsed: daysAgo(10) } }) >= 10);
});

test('2. getMemoryAge preserves legacy timestamp compatibility', () => {
    assert.ok(getMemoryAge({ timestamp: daysAgo(12) }) >= 12);
});

test('3. getMemoryAge supports raw-log metadata with only lastUsed', () => {
    const rawLogEntry = { metadata: { lastUsed: daysAgo(8) } };
    assert.ok(getMemoryAge(rawLogEntry.metadata) >= 8);
});

test('4. shouldArchive rejects records without a usable timestamp', () => {
    assert.equal(shouldArchive({ importance: 0.1, reasonKept: 'standard' }), false);
});

test('5. shouldArchive accepts old low-importance unused metadata', () => {
    assert.equal(shouldArchive({
        importance: 0.2,
        lastUsed: daysAgo(200),
        reasonKept: 'standard'
    }), true);
});

test('6. FIFO archives one evicted record before trimming the raw log', async () => {
    const oldest = entry('oldest');
    await seedMemory([oldest, entry('second')], 2);

    await addLogEntry('new input', 'new reply', 'core');

    const memory = await loadMemory();
    assert.equal(memory.rawMemory.log.length, 2);
    assert.equal(memory.archivedMemory.length, 1);
    assert.equal(memory.archivedMemory[0].reason, 'fifo_cap_eviction');
    assert.match(memory.archivedMemory[0].archivedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(memory.archivedMemory[0].input, 'oldest input');
    assert.equal(memory.archivedMemory[0].reply, 'oldest reply');
    assert.equal(memory.archivedMemory[0].ts, oldest.ts);
});

test('7. FIFO archives the oldest records in their original order', async () => {
    await seedMemory([
        entry('oldest-1', 14),
        entry('oldest-2', 13),
        entry('oldest-3', 12),
        entry('kept', 11)
    ], 2);

    await addLogEntry('latest input', 'latest reply', 'core');

    const memory = await loadMemory();
    assert.deepEqual(memory.archivedMemory.map(item => item.id), ['oldest-1', 'oldest-2', 'oldest-3']);
    assert.deepEqual(memory.rawMemory.log.map(item => item.id || item.input), ['kept', 'latest input']);
});
