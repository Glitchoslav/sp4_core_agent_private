import assert from 'node:assert/strict';
import { applyFallbackTruth } from '../src/pipeline/fallbackTruth.js';

console.log('🧪 TEST: applyFallbackTruth explicit reason-code contract');

assert.equal(typeof applyFallbackTruth, 'function', 'applyFallbackTruth must be importable from fallbackTruth');

const explicitTimeoutMeta = { fallbackReason: 'grounded_timeout_fallback' };
const explicitTimeout = applyFallbackTruth({
    userMessage: 'čo je sp4?',
    output: 'Ticho. Pamäť/log/data: lokálny model nedal odpoveď.',
    deliberationMeta: explicitTimeoutMeta,
    enforcementResult: null,
    elapsedMs: 25000,
});

assert.equal(explicitTimeout, 'timeout', 'explicit grounded timeout fallback must normalize to timeout');
assert.equal(explicitTimeoutMeta.accuracyFallback, true, 'explicit fallback reason must mark accuracyFallback');
assert.equal(explicitTimeoutMeta.fallbackReason, 'timeout', 'explicit fallback reason must be normalized');

const explicitEmptyMeta = { fallbackReason: 'empty_orchestrator_response' };
const explicitEmpty = applyFallbackTruth({
    userMessage: 'čo je sp4?',
    output: '',
    deliberationMeta: explicitEmptyMeta,
    enforcementResult: null,
    elapsedMs: 0,
});

assert.equal(explicitEmpty, 'empty_response', 'explicit empty orchestrator fallback must normalize to empty_response');
assert.equal(explicitEmptyMeta.accuracyFallback, true, 'explicit empty fallback must mark accuracyFallback');
assert.equal(explicitEmptyMeta.fallbackReason, 'empty_response', 'explicit empty fallback must be normalized');

const heuristicTimeoutMeta = {};
const heuristicTimeout = applyFallbackTruth({
    userMessage: 'ako sa máš?',
    output: 'Ticho. Skús znova.',
    deliberationMeta: heuristicTimeoutMeta,
    enforcementResult: null,
    elapsedMs: 25000,
});

assert.equal(heuristicTimeout, null, 'stub-like output without explicit reason must not infer timeout');
assert.equal(heuristicTimeoutMeta.accuracyFallback, undefined, 'heuristic timeout case must not mark accuracyFallback');
assert.equal(heuristicTimeoutMeta.fallbackReason, undefined, 'heuristic timeout case must not invent fallbackReason');

const heuristicCanonicalMeta = {};
const heuristicCanonical = applyFallbackTruth({
    userMessage: 'ako sa máš?',
    output: 'SP4 je offline-first AI partner a osobný digitálny partner pre ľudí, ktorí chcú žiť slobodne a lokálne.',
    deliberationMeta: heuristicCanonicalMeta,
    enforcementResult: null,
    elapsedMs: 0,
});

assert.equal(heuristicCanonical, null, 'canonical fallback similarity without explicit reason must not infer low_confidence');
assert.equal(heuristicCanonicalMeta.accuracyFallback, undefined, 'heuristic canonical case must not mark accuracyFallback');
assert.equal(heuristicCanonicalMeta.fallbackReason, undefined, 'heuristic canonical case must not invent fallbackReason');

console.log('✅ PASS: applyFallbackTruth explicit reason-code contract');