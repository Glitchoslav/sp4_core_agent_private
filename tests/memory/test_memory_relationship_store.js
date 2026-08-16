import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

const runtimeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sp4-memory-relationship-'));
process.env.SP4_TEST = 'true';
process.env.SP4_RUNTIME_ROOT = runtimeRoot;

const {
    addLogEntry,
    addToShadowLog,
    getSummary,
    incrementRelationshipMetric,
    loadMemory,
    saveMemory
} = await import('../../memory.js');

after(async () => {
    await fs.rm(runtimeRoot, { recursive: true, force: true });
    delete process.env.SP4_TEST;
    delete process.env.SP4_RUNTIME_ROOT;
});

const EMPTY_METRICS = () => ({
    interactionCount: 0,
    deepConversations: 0,
    ritualsCompleted: 0,
    vulnerabilityMoments: 0
});

/**
 * Nasadí realistický "split" stav: canonical `relationship` s danými hodnotami
 * a legacy `relationshipModel`, ktorý je zámerne stale (default 0 / stranger).
 */
async function seedSplit({ stage = 'stranger', metrics = {} } = {}) {
    const memory = await loadMemory();
    memory.relationship = {
        stage,
        metrics: { ...EMPTY_METRICS(), ...metrics },
        milestones: []
    };
    memory.relationshipModel = {
        level: 'stranger',
        metrics: EMPTY_METRICS(),
        milestones: []
    };
    await saveMemory(memory);
}

test('1. addLogEntry inkrementuje interactionCount v canonical store aj v legacy zrkadle', async () => {
    await seedSplit();

    await addLogEntry('input', 'reply', 'core');

    const memory = await loadMemory();
    assert.equal(memory.relationship.metrics.interactionCount, 1);
    assert.equal(memory.relationshipModel?.metrics?.interactionCount, 1,
        'legacy relationshipModel musí zrkadliť canonical relationship');
});

test('2. po 50 interakciách a 5 hlbokých konverzáciách sa vzťah posunie zo stranger na acquaintance', async () => {
    await seedSplit({
        stage: 'stranger',
        metrics: { interactionCount: 49, deepConversations: 5 }
    });

    await addLogEntry('50th input', '50th reply', 'core');

    const memory = await loadMemory();
    assert.equal(memory.relationship.stage, 'acquaintance');
    assert.equal(memory.relationshipModel?.level, 'acquaintance',
        'legacy level musí odrážať canonical stage');
    assert.equal(memory.relationship.milestones.length, 1);
    assert.equal(memory.relationship.milestones[0].level, 'acquaintance');
});

test('3. incrementRelationshipMetric zapisuje do canonical store (nie len do legacy)', async () => {
    await seedSplit();

    await incrementRelationshipMetric('ritualsCompleted');

    const memory = await loadMemory();
    assert.equal(memory.relationship.metrics.ritualsCompleted, 1);
    assert.equal(memory.relationshipModel?.metrics?.ritualsCompleted, 1);
});

test('4. getSummary vracia interakcie a úroveň z canonical relationship', async () => {
    await seedSplit({
        stage: 'acquaintance',
        metrics: { interactionCount: 7 }
    });

    const summary = await getSummary();
    assert.equal(summary.interactions, 7);
    assert.equal(summary.relationshipLevel, 'acquaintance');
});

test('5. addToShadowLog inkrementuje vulnerabilityMoments v canonical store', async () => {
    await seedSplit();

    await addToShadowLog('zraniteľný obsah');

    const memory = await loadMemory();
    assert.equal(memory.relationship.metrics.vulnerabilityMoments, 1);
    assert.equal(memory.relationshipModel?.metrics?.vulnerabilityMoments, 1);
});
