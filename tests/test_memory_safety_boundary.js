import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp4-memtest-'));
process.env.SP4_BRIDGE_DATA_ROOT = tempDir;

try {
    const { shouldDistillConversation } = await import('../bridge-distillation-policy.js');
    const {
        appendInsight,
        appendTip,
        collectiveSummaryForPrompt
    } = await import('../bridge-memory.js');

    const longAnswer = 'Dostatocne dlha odpoved, ktora by pred zmenou presla povodnou dlzkovou podmienkou.';
    assert.equal(
        shouldDistillConversation(
            'zapamataj si, ze hydrant je pri skole',
            longAnswer,
            null,
            'telegram'
        ),
        false
    );
    assert.equal(
        shouldDistillConversation(
            'admin tip: hydrant je pri skole',
            longAnswer,
            null,
            'admin'
        ),
        false
    );

    const defaultInsight = appendInsight({
        topic: 'hydrant',
        text: 'Neovereny zaznam s caller-controlled source.',
        source: 'admin'
    });
    assert.equal(defaultInsight.type, 'insight');
    assert.equal(defaultInsight.origin, 'ai-distilled');
    assert.equal(defaultInsight.verification, 'unverified');
    assert.equal(defaultInsight.source, 'admin');
    assert.equal(defaultInsight.confidence, 0.7);

    const boundedConfidence = appendInsight({
        topic: 'normalizacia',
        text: 'Confidence sa oreze na povoleny rozsah.',
        confidence: 4,
        origin: 'invalid-origin',
        verification: 'verified-by-caller',
        source: 'x'.repeat(400)
    });
    assert.equal(boundedConfidence.confidence, 1);
    assert.equal(boundedConfidence.origin, 'ai-distilled');
    assert.equal(boundedConfidence.verification, 'unverified');
    assert.equal(boundedConfidence.source.length, 256);

    const invalidConfidence = appendTip({
        topic: 'normalizacia',
        text: 'Neplatne confidence dostane bezpecny default.',
        confidence: Number.NaN
    });
    assert.equal(invalidConfidence.confidence, 0.7);

    const collectiveDir = path.join(tempDir, 'collective-memory');
    const insightsFile = path.join(collectiveDir, 'insights.jsonl');
    fs.appendFileSync(
        insightsFile,
        `${JSON.stringify({
            id: 'legacy_without_verification',
            topic: 'hydrant',
            text: 'LEGACY_NEOVERENY hydrant pri skole'
        })}\n`,
        'utf8'
    );

    for (let index = 0; index < 12; index++) {
        appendInsight({
            topic: 'hydrant skola',
            text: `NEOVERENY_TOP_${index} hydrant hydrant skola`,
            confidence: 0.99
        });
    }
    appendInsight({
        topic: 'hydrant',
        text: 'OVERENY_HYDRANT je pri skole',
        confidence: 0.2,
        origin: 'human',
        verification: 'verified',
        source: 'approved-review'
    });

    const adminTip = appendTip({
        topic: 'hydrant skola',
        text: 'ADMIN_TIP_NEOVERENY hydrant pri skole',
        origin: 'admin',
        verification: 'unverified',
        source: 'collective-tip-endpoint'
    });
    assert.equal(adminTip.type, 'tip');
    assert.equal(adminTip.origin, 'admin');
    assert.equal(adminTip.verification, 'unverified');

    const summary = collectiveSummaryForPrompt('hydrant skola', 1, 1);
    assert.match(summary, /OVERENY_HYDRANT/);
    assert.doesNotMatch(summary, /LEGACY_NEOVERENY/);
    assert.doesNotMatch(summary, /NEOVERENY_TOP_/);
    assert.doesNotMatch(summary, /ADMIN_TIP_NEOVERENY/);

    console.log('memory safety boundary: PASS');
} finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
}
