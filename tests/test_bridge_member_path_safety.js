import assert from 'node:assert/strict';
import {
    mkdtempSync,
    readFileSync,
    rmSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const previousDataRoot = process.env.SP4_BRIDGE_DATA_ROOT;
const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), 'sp4-member-path-'));
process.env.SP4_BRIDGE_DATA_ROOT = fixtureRoot;

try {
    const memory = await import(`../bridge-memory.js?path-test=${Date.now()}`);
    const invalidIds = [
        '../',
        '..\\',
        '%2f',
        '%5c',
        '..%2fescape',
        'member/escape',
        'member\\escape',
        '../../escape',
        '..\\..\\escape',
        'a'.repeat(65)
    ];

    for (const id of invalidIds) {
        assert.throws(
            () => memory.validateMemberId(id),
            error => error?.code === 'INVALID_MEMBER_ID',
            `must reject ${JSON.stringify(id)}`
        );
    }

    const consumers = [
        () => memory.readMemberMin('../escape'),
        () => memory.recordMemberInteraction('../escape', 'test'),
        () => memory.setMemberConsent('../escape', { personalNotes: true }),
        () => memory.appendPersonalNote('../escape', { text: 'test' }),
        () => memory.purgeMemberMemory('../escape'),
        () => memory.memberSummaryForPrompt('../escape')
    ];
    for (const consume of consumers) {
        assert.throws(
            consume,
            error => error?.code === 'INVALID_MEMBER_ID'
        );
    }

    const validId = 'member_01-test';
    const initial = memory.readMemberMin(validId);
    assert.equal(initial.memberId, validId);
    assert.equal(initial.consent.collectiveContribution, false);

    memory.setMemberConsent(validId, { personalNotes: true });
    const note = memory.appendPersonalNote(validId, { text: 'fixture note' });
    assert.equal(note.ok, true);
    assert.equal(memory.memberSummaryForPrompt(validId).includes('fixture note'), true);

    const memberFile = path.join(fixtureRoot, 'dhz-members', `${validId}.json`);
    assert.doesNotThrow(() => JSON.parse(readFileSync(memberFile, 'utf8')));
    assert.equal(memory.purgeMemberMemory(validId).deletedFile, true);

    const serverSource = readFileSync(
        new URL('../bridge-server.js', import.meta.url),
        'utf8'
    );
    assert.match(serverSource, /app\.param\('id'/);
    assert.match(serverSource, /status\(400\)\.json\(\{ ok: false, error: 'invalid_memberId'/);
} finally {
    if (previousDataRoot === undefined) delete process.env.SP4_BRIDGE_DATA_ROOT;
    else process.env.SP4_BRIDGE_DATA_ROOT = previousDataRoot;

    const resolvedFixture = path.resolve(fixtureRoot);
    const tempPrefix = path.resolve(os.tmpdir()) + path.sep;
    assert.ok(resolvedFixture.startsWith(tempPrefix));
    rmSync(resolvedFixture, { recursive: true, force: true });
}

console.log('bridge member path safety: PASS');
