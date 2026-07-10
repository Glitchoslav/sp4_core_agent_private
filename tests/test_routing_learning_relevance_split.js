import assert from 'node:assert';
import { analyzeRoutingLearning } from '../src/immune/routingLearning.js';

const preferRetryEvents = Array.from({ length: 6 }, (_, index) => ({
    severity: 'soft',
    mode: 'core',
    handledBy: 'core',
    immune_profile: 'technical',
    query_type: 'technical_simple',
    model: 'qwen2.5:7b',
    event_kind: 'final_verdict',
    reason_codes: ['RELEVANCE_LOW_CONFIDENCE'],
    retryApplied: true,
    retryImproved: index < 4,
}));

const preferRetrySummary = analyzeRoutingLearning(preferRetryEvents, { minHintSamples: 5 });
const preferRetryHint = preferRetrySummary.routing_hints.find((entry) => entry.query_type === 'technical_simple');

assert.ok(preferRetryHint, 'expected routing hint for technical_simple');
assert.equal(preferRetryHint.suggested_action, 'prefer_retry', 'low-confidence dominant bucket should have explicit retry hint');
assert.match(preferRetryHint.reason, /RELEVANCE_LOW_CONFIDENCE|low-confidence relevance ambiguity/i, 'hint reason should explicitly mention low-confidence split');

const preferRetryStats = preferRetrySummary.stats.query_type.technical_simple;
assert.equal(preferRetryStats.dominant_reason_code, 'RELEVANCE_LOW_CONFIDENCE', 'low-confidence should remain visible as separate dominant reason');

const shortTechFallbackEvents = Array.from({ length: 6 }, (_, index) => ({
    severity: 'soft',
    mode: 'core',
    handledBy: 'core',
    immune_profile: 'technical',
    query_type: 'technical_simple',
    model: 'qwen2.5:7b',
    event_kind: 'final_verdict',
    reason_codes: ['RELEVANCE_LOW_CONFIDENCE'],
    retryApplied: true,
    retryImproved: index < 2,
}));

const shortTechFallbackSummary = analyzeRoutingLearning(shortTechFallbackEvents, { minHintSamples: 5 });
const shortTechFallbackHint = shortTechFallbackSummary.routing_hints.find((entry) => entry.query_type === 'technical_simple');

assert.ok(shortTechFallbackHint, 'expected fallback routing hint for technical_simple');
assert.equal(shortTechFallbackHint.suggested_action, 'prefer_short_tech_path', 'low-confidence technical cases below 50% retry success should prefer short tech path');
assert.match(shortTechFallbackHint.reason, /RELEVANCE_LOW_CONFIDENCE|short technical questions/i, 'fallback reason should explicitly mention low-confidence technical split');

console.log('PASS: routing learning relevance split');