// ┌─────────────────────────────────────────────────────────────────┐
// │  SP4 OS MODULE: routingLearning                                │
// │  Phase: 5 (routing learning)                                   │
// │  Layer: Protection / Analytics                                 │
// │  Role: Build conservative routing hints from immune logs       │
// └─────────────────────────────────────────────────────────────────┘

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { classifyQueryType } from './queryTypeClassifier.js';

const DEFAULT_MIN_HINT_SAMPLES = 5;
const RETRY_HANDLER = 'softRetry';

function pctNumber(numerator, denominator) {
    if (!denominator) return 0;
    return Number(((numerator / denominator) * 100).toFixed(1));
}

function sortedDesc(entries, selector = (entry) => entry.value?.total_count ?? entry.total_count ?? 0) {
    return [...entries].sort((a, b) => selector(b) - selector(a));
}

function inc(map, key, amount = 1) {
    map.set(key, (map.get(key) ?? 0) + amount);
}

function ensureBucket(map, key) {
    if (!map.has(key)) {
        map.set(key, {
            total_count: 0,
            pass_count: 0,
            hard_count: 0,
            soft_count: 0,
            unknown_count: 0,
            retry_count: 0,
            retry_success_count: 0,
            reason_counts: new Map(),
        });
    }
    return map.get(key);
}

function finalizeBucket(bucket) {
    const total = bucket.total_count;
    const dominantReason = [...bucket.reason_counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
        total_count: total,
        pass_count: bucket.pass_count,
        hard_fail_rate: pctNumber(bucket.hard_count, total),
        soft_fail_rate: pctNumber(bucket.soft_count, total),
        unknown_rate: pctNumber(bucket.unknown_count, total),
        retry_rate: pctNumber(bucket.retry_count, total),
        retry_success_rate: pctNumber(bucket.retry_success_count, bucket.retry_count),
        dominant_reason_code: dominantReason,
        reason_counts: Object.fromEntries(sortedDesc(bucket.reason_counts.entries(), (entry) => entry[1])),
    };
}

function toPlainStats(map) {
    return Object.fromEntries(
        [...map.entries()].map(([key, bucket]) => [key, finalizeBucket(bucket)])
    );
}

function getQueryType(event) {
    if (typeof event.query_type === 'string' && event.query_type.trim()) {
        return event.query_type;
    }
    if (typeof event.user_input_preview === 'string' && event.user_input_preview.trim()) {
        return classifyQueryType(event.user_input_preview);
    }
    return 'unclassified';
}

function isPrimaryEvent(event) {
    return (event.event_kind ?? 'final_verdict') !== 'retry_attempt';
}

function normalizeEvent(event) {
    const severity = event.severity ?? 'unknown';
    const mode = event.mode ?? 'unknown';
    const handledBy = event.handledBy ?? 'unknown';
    const immuneProfile = event.immune_profile ?? 'unknown';
    const queryType = getQueryType(event);
    const eventKind = event.event_kind ?? (handledBy === RETRY_HANDLER ? 'retry_attempt' : 'final_verdict');
    const model = event.model ?? 'unknown';

    return {
        ...event,
        severity,
        mode,
        handledBy,
        immune_profile: immuneProfile,
        query_type: queryType,
        event_kind: eventKind,
        model,
    };
}

function updateBucket(bucket, event) {
    bucket.total_count++;

    if (event.severity === 'hard') bucket.hard_count++;
    else if (event.severity === 'soft') bucket.soft_count++;
    else if (event.severity === 'unknown') bucket.unknown_count++;
    else bucket.pass_count++;

    if (event.retryApplied) bucket.retry_count++;
    if (event.retryApplied && event.retryImproved) bucket.retry_success_count++;

    for (const code of (event.reason_codes ?? [])) {
        inc(bucket.reason_counts, code);
    }
}

function buildHintConfidence(totalCount, signalStrength, minHintSamples) {
    if (totalCount < minHintSamples) return 'low';
    if (totalCount >= 12 && signalStrength >= 50) return 'high';
    if (totalCount >= 8 && signalStrength >= 30) return 'medium';
    return 'low';
}

function buildRoutingHint(queryType, stats, queryModeStats, minHintSamples) {
    const sampleCount = stats.total_count;
    if (sampleCount < minHintSamples) {
        return {
            query_type: queryType,
            suggested_action: 'keep_current',
            confidence: 'low',
            reason: 'insufficient samples',
        };
    }

    const dominant = stats.dominant_reason_code;
    const hardRate = stats.hard_fail_rate;
    const softRate = stats.soft_fail_rate;
    const retrySuccessRate = stats.retry_success_rate;
    const riskyModes = Object.entries(queryModeStats)
        .filter(([, value]) => value.total_count >= minHintSamples)
        .sort((a, b) => (b[1].hard_fail_rate + b[1].soft_fail_rate) - (a[1].hard_fail_rate + a[1].soft_fail_rate));
    const topRiskyMode = riskyModes[0];

    if (hardRate >= 45 && (dominant === 'IDENTITY_AI_CLAIM' || dominant === 'META_POLICY_LEAK' || dominant === 'META_SYSTEM_LEAK')) {
        return {
            query_type: queryType,
            suggested_action: 'needs_manual_review',
            confidence: buildHintConfidence(sampleCount, hardRate, minHintSamples),
            reason: `high hard fail rate driven by ${dominant}`,
        };
    }

    if (topRiskyMode && topRiskyMode[1].hard_fail_rate >= 35) {
        return {
            query_type: queryType,
            suggested_action: 'avoid_mode',
            confidence: buildHintConfidence(sampleCount, topRiskyMode[1].hard_fail_rate, minHintSamples),
            reason: `high hard fail rate on mode ${topRiskyMode[0].split('|')[1]}`,
        };
    }

    if (dominant === 'RELEVANCE_ZERO_OVERLAP' && retrySuccessRate >= 50) {
        return {
            query_type: queryType,
            suggested_action: 'prefer_retry',
            confidence: buildHintConfidence(sampleCount, retrySuccessRate, minHintSamples),
            reason: `retry frequently recovers ${queryType} after relevance drift`,
        };
    }

    if (dominant === 'RELEVANCE_LOW_CONFIDENCE' && retrySuccessRate >= 50) {
        return {
            query_type: queryType,
            suggested_action: 'prefer_retry',
            confidence: buildHintConfidence(sampleCount, retrySuccessRate, minHintSamples),
            reason: `retry frequently recovers ${queryType} after low-confidence relevance ambiguity`,
        };
    }

    if (queryType === 'technical_simple' && dominant === 'RELEVANCE_ZERO_OVERLAP' && softRate >= 25) {
        return {
            query_type: queryType,
            suggested_action: 'prefer_short_tech_path',
            confidence: buildHintConfidence(sampleCount, softRate, minHintSamples),
            reason: 'high RELEVANCE_ZERO_OVERLAP rate on short technical questions',
        };
    }

    if (queryType === 'technical_simple' && dominant === 'RELEVANCE_LOW_CONFIDENCE' && softRate >= 25) {
        return {
            query_type: queryType,
            suggested_action: 'prefer_short_tech_path',
            confidence: buildHintConfidence(sampleCount, softRate, minHintSamples),
            reason: 'high RELEVANCE_LOW_CONFIDENCE rate on short technical questions',
        };
    }

    if (hardRate >= 25 && (dominant === 'IDENTITY_AI_CLAIM' || dominant === 'META_POLICY_LEAK' || dominant === 'META_SYSTEM_LEAK')) {
        return {
            query_type: queryType,
            suggested_action: 'prefer_guard',
            confidence: buildHintConfidence(sampleCount, hardRate, minHintSamples),
            reason: `guard-worthy leak pattern dominated by ${dominant}`,
        };
    }

    return {
        query_type: queryType,
        suggested_action: 'keep_current',
        confidence: buildHintConfidence(sampleCount, Math.max(hardRate, softRate), minHintSamples),
        reason: dominant ? `no dominant failure pattern strong enough beyond ${dominant}` : 'no dominant failure pattern',
    };
}

export function analyzeRoutingLearning(events, options = {}) {
    const minHintSamples = options.minHintSamples ?? DEFAULT_MIN_HINT_SAMPLES;
    const normalizedEvents = events.map(normalizeEvent);
    const primaryEvents = normalizedEvents.filter(isPrimaryEvent);
    const retryEvents = normalizedEvents.filter((event) => !isPrimaryEvent(event));

    const byQueryType = new Map();
    const byMode = new Map();
    const byHandledBy = new Map();
    const byImmuneProfile = new Map();
    const byQueryTypeMode = new Map();
    const byModel = new Map();
    const riskyReasonCodes = new Map();

    for (const event of primaryEvents) {
        updateBucket(ensureBucket(byQueryType, event.query_type), event);
        updateBucket(ensureBucket(byMode, event.mode), event);
        updateBucket(ensureBucket(byHandledBy, event.handledBy), event);
        updateBucket(ensureBucket(byImmuneProfile, event.immune_profile), event);
        updateBucket(ensureBucket(byQueryTypeMode, `${event.query_type}|${event.mode}`), event);
        updateBucket(ensureBucket(byModel, event.model), event);

        for (const code of (event.reason_codes ?? [])) {
            inc(riskyReasonCodes, code);
        }
    }

    const queryTypeStats = toPlainStats(byQueryType);
    const queryTypeModeStats = toPlainStats(byQueryTypeMode);
    const modeStats = toPlainStats(byMode);
    const handledByStats = toPlainStats(byHandledBy);
    const immuneProfileStats = toPlainStats(byImmuneProfile);
    const modelStats = toPlainStats(byModel);

    const topFailCombinations = Object.entries(queryTypeModeStats)
        .map(([key, value]) => ({
            key,
            query_type: key.split('|')[0],
            mode: key.split('|')[1],
            total_count: value.total_count,
            hard_fail_rate: value.hard_fail_rate,
            soft_fail_rate: value.soft_fail_rate,
            dominant_reason_code: value.dominant_reason_code,
            risk_score: Number((value.hard_fail_rate * 1.5 + value.soft_fail_rate + value.unknown_rate * 0.5).toFixed(1)),
        }))
        .filter((entry) => entry.total_count > 0)
        .sort((a, b) => b.risk_score - a.risk_score)
        .slice(0, 10);

    const routingHints = Object.entries(queryTypeStats)
        .map(([queryType, stats]) => {
            const relatedModeStats = Object.fromEntries(
                Object.entries(queryTypeModeStats).filter(([key]) => key.startsWith(`${queryType}|`))
            );

            return buildRoutingHint(queryType, stats, relatedModeStats, minHintSamples);
        })
        .sort((a, b) => {
            const confidenceOrder = { high: 3, medium: 2, low: 1 };
            return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
        });

    const topRiskyModes = Object.entries(modeStats)
        .map(([mode, value]) => ({
            mode,
            total_count: value.total_count,
            hard_fail_rate: value.hard_fail_rate,
            soft_fail_rate: value.soft_fail_rate,
            dominant_reason_code: value.dominant_reason_code,
            risk_score: Number((value.hard_fail_rate * 1.5 + value.soft_fail_rate + value.unknown_rate * 0.5).toFixed(1)),
        }))
        .sort((a, b) => b.risk_score - a.risk_score)
        .slice(0, 5);

    const topRiskyReasonCodes = sortedDesc(riskyReasonCodes.entries(), (entry) => entry[1])
        .slice(0, 10)
        .map(([code, count]) => ({ code, count }));

    const meta = {
        generated_at: new Date().toISOString(),
        total_events: normalizedEvents.length,
        primary_events: primaryEvents.length,
        retry_events: retryEvents.length,
        primary_retry_applied_count: primaryEvents.filter((event) => event.retryApplied).length,
        primary_retry_success_count: primaryEvents.filter((event) => event.retryApplied && event.retryImproved).length,
        unclassified_primary_events: primaryEvents.filter((event) => event.query_type === 'unclassified').length,
        min_hint_samples: minHintSamples,
    };

    return {
        meta,
        stats: {
            query_type: queryTypeStats,
            mode: modeStats,
            handledBy: handledByStats,
            immune_profile: immuneProfileStats,
            model: modelStats,
            query_type_mode: queryTypeModeStats,
        },
        top_risky_modes: topRiskyModes,
        top_risky_reason_codes: topRiskyReasonCodes,
        top_fail_combinations: topFailCombinations,
        routing_hints: routingHints,
    };
}

export function writeRoutingLearningSummary(outputPath, summary) {
    const outDir = dirname(outputPath);
    if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
    }
    writeFileSync(outputPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');
}