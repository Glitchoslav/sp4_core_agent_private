import assert from 'node:assert/strict';
import fs from 'node:fs';

import { calculateRelationshipMetrics, evaluateRelationshipProgression } from '../relationshipEvolution.js';

console.log('🧪 TEST: operational truth tail contracts');

const metrics = calculateRelationshipMetrics({
    rawMemory: {
        log: [
            { timestamp: 'invalid-date', metadata: { importance: 0.9, emotion: { averageIntensity: 0.2 }, tags: [] } },
            { timestamp: '2026-04-11T10:00:00.000Z', metadata: { importance: 0.8, emotion: { averageIntensity: 0.4 }, tags: ['rodina'] } }
        ]
    }
});

assert.equal(Number.isFinite(metrics.time), true);
assert.equal(Number.isFinite(metrics.consistency), true);

const progressed = await evaluateRelationshipProgression({
    rawMemory: {
        log: Array.from({ length: 12 }, (_, index) => ({
            timestamp: index === 0 ? 'invalid-date' : `2026-04-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`,
            metadata: { importance: 0.8, emotion: { averageIntensity: 0.4 }, tags: [] }
        }))
    },
    relationship: {
        level: 'stranger',
        startDate: '2026-04-01T10:00:00.000Z',
        history: []
    }
});

assert.ok(progressed);

const integrationSource = fs.readFileSync(new URL('../integration.js', import.meta.url), 'utf8');
assert.match(integrationSource, /else if \(useCouncil\) \{\s*runtimeLog\('\\n🎭 Multi-Agent Council: 3 voices activated\\n'\)/s);
assert.match(integrationSource, /CORE: Stripped .* emoji before validation/);

console.log('✅ Operational truth tail contracts work');