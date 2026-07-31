import { ollamaHealthCheck } from '../llm/ollamaClient.js';

export const QUALIFICATION = Object.freeze({
    QUALIFIED: 'QUALIFIED',
    WEAK_CANDIDATE: 'WEAK_CANDIDATE',
    UNQUALIFIED: 'UNQUALIFIED',
    INCONCLUSIVE_CONTAMINATED: 'INCONCLUSIVE_CONTAMINATED',
    NOT_YET_BENCHMARKED: 'NOT_YET_BENCHMARKED',
});

export const FALLBACK_POLICY = Object.freeze({
    LEGACY_MODEL: 'LEGACY_MODEL',
    DETERMINISTIC_ONLY: 'DETERMINISTIC_ONLY',
    ALLOW_WEAK_CANDIDATE: 'ALLOW_WEAK_CANDIDATE',
    FAIL_CLOSED: 'FAIL_CLOSED',
});

export const REGISTRY_MODE = Object.freeze({
    ADVISORY: 'advisory',
    ENFORCE: 'enforce',
});

export const RUNTIME_AVAILABILITY = Object.freeze({
    INSTALLED: 'installed',
    NOT_INSTALLED: 'not_installed',
    UNKNOWN: 'unknown',
});

const GENERAL_REPORT = 'tests/benchmarks/general-championship-round1/results/general-championship-round1-report.md';
const FAST_REPORT = 'tests/benchmarks/fast-championship-round1/results/fast-championship-round1-report.md';
const GENERAL_RUN_ID = 'SP4_GENERAL_R1_2026-07-31T05:54:09.001Z';
const FAST_RUN_ID = 'SP4_FAST_R1_2026-07-31T05:32:20.224Z';

const NULL_CAPABILITY_PRIOR = Object.freeze({
    reasoning: null,
    coding: null,
    slovak: null,
    factuality: null,
    creativity: null,
    structuredOutput: null,
    speed: null,
});

function benchmarkEvidence({ runId, reportPath, date, modelDigest }) {
    return {
        source: 'SP4_BENCHMARK',
        runId,
        reportPath,
        round: 1,
        date,
        benchmarkVersion: 1,
        harnessVersion: null,
        modelDigest,
        configHash: null,
    };
}

function roleRecord({
    role,
    qualification,
    measuredRoleQuality,
    measuredRoleQualityRaw,
    passedCases,
    totalCases,
    warmLatencyMs,
    tokensPerSecond,
    coldLoadMs,
    resourceEfficiency,
    reason,
    evidence,
}) {
    return {
        role,
        qualification,
        estimatedCapability: null,
        measuredRoleQuality,
        measuredRoleQualityRaw,
        passedCases,
        totalCases,
        warmLatencyMs,
        tokensPerSecond,
        coldLoadMs,
        resourceEfficiency,
        reason,
        evidence,
    };
}

function metadata(family, parametersB) {
    return {
        family,
        parametersB,
        contextTokens: null,
        license: null,
        modalities: null,
    };
}

function performance(score, maxScore, basis) {
    return { score, maxScore, basis };
}

const GENERAL_EVIDENCE = {
    'qwen3.5:4b': benchmarkEvidence({
        runId: GENERAL_RUN_ID,
        reportPath: GENERAL_REPORT,
        date: '2026-07-31T05:54:09.001Z',
        modelDigest: '2a654d98e6fba55d452b7043684e9b57a947e393bbffa62485a7aac05ee4eefd',
    }),
    'qwen3:4b': benchmarkEvidence({
        runId: GENERAL_RUN_ID,
        reportPath: GENERAL_REPORT,
        date: '2026-07-31T05:54:09.001Z',
        modelDigest: '359d7dd4bcdab3d86b87d73ac27966f4dbb9f5efdfcc75d34a8764a09474fae7',
    }),
    'gemma3:4b': benchmarkEvidence({
        runId: GENERAL_RUN_ID,
        reportPath: GENERAL_REPORT,
        date: '2026-07-31T05:54:09.001Z',
        modelDigest: 'a2af6cc3eb7fa8be8504abaf9b04e88f17a119ec3f04a3addf55f92841195f5a',
    }),
};

const FAST_EVIDENCE = {
    'qwen3.5:0.8b': benchmarkEvidence({
        runId: FAST_RUN_ID,
        reportPath: FAST_REPORT,
        date: '2026-07-31T05:32:20.224Z',
        modelDigest: 'f3817196d142eaf72ce79dfebe53dcb20bd21da87ce13e138a8f8e10a866b3a4',
    }),
    'llama3.2:3b': benchmarkEvidence({
        runId: FAST_RUN_ID,
        reportPath: FAST_REPORT,
        date: '2026-07-31T05:32:20.224Z',
        modelDigest: 'a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72',
    }),
    'gemma3:1b': benchmarkEvidence({
        runId: FAST_RUN_ID,
        reportPath: FAST_REPORT,
        date: '2026-07-31T05:32:20.224Z',
        modelDigest: '8648f39daa8fbf5b18c7b4e6a8fb4990c692751d49917417b8842ca5758e7ffc',
    }),
};

/*
 * Role-quality formulas:
 * - general: GENERAL R1 quality points / 70, never the 100-point championship total.
 * - router: FAST R1 (Intent points + JSON points) / 35.
 * - memory_extraction: passed memory contracts / 5.
 */
export const LOCAL_MODEL_REGISTRY = Object.freeze([
    {
        model: 'qwen3.5:4b',
        metadata: metadata('qwen35', 4.7),
        capabilityPrior: NULL_CAPABILITY_PRIOR,
        roles: {
            general: roleRecord({
                role: 'general',
                qualification: QUALIFICATION.WEAK_CANDIDATE,
                measuredRoleQuality: 57.92 / 70,
                measuredRoleQualityRaw: '57.92/70',
                passedCases: 29,
                totalCases: 36,
                warmLatencyMs: 19066.77,
                tokensPerSecond: 10.43,
                coldLoadMs: 8039.38,
                resourceEfficiency: performance(3.18, 6, 'Ollama /api/ps size'),
                reason: 'Highest measured SP4 GENERAL R1 candidate; no production threshold is approved.',
                evidence: [GENERAL_EVIDENCE['qwen3.5:4b']],
            }),
        },
    },
    {
        model: 'gemma3:4b',
        metadata: metadata('gemma3', 4.3),
        capabilityPrior: NULL_CAPABILITY_PRIOR,
        roles: {
            general: roleRecord({
                role: 'general',
                qualification: QUALIFICATION.WEAK_CANDIDATE,
                measuredRoleQuality: 41.92 / 70,
                measuredRoleQualityRaw: '41.92/70',
                passedCases: 21,
                totalCases: 36,
                warmLatencyMs: 12485.76,
                tokensPerSecond: 31.33,
                coldLoadMs: 6090.02,
                resourceEfficiency: performance(4.91, 6, 'Ollama /api/ps size'),
                reason: 'Measured SP4 GENERAL R1 candidate; no production threshold is approved.',
                evidence: [GENERAL_EVIDENCE['gemma3:4b']],
            }),
        },
    },
    {
        model: 'qwen3:4b',
        metadata: metadata('qwen3', 4.0),
        capabilityPrior: NULL_CAPABILITY_PRIOR,
        roles: {
            general: roleRecord({
                role: 'general',
                qualification: QUALIFICATION.INCONCLUSIVE_CONTAMINATED,
                measuredRoleQuality: null,
                measuredRoleQualityRaw: '0/70',
                passedCases: 0,
                totalCases: 36,
                warmLatencyMs: 7139.29,
                tokensPerSecond: 55.47,
                coldLoadMs: 4175.32,
                resourceEfficiency: performance(6, 6, 'Ollama /api/ps size'),
                reason: '31/36 quality runs ended at the output limit, thinking was not reliably disabled, and think markup leaked; this run is not clean evidence of model capability.',
                evidence: [GENERAL_EVIDENCE['qwen3:4b']],
            }),
        },
    },
    {
        model: 'qwen3.5:0.8b',
        metadata: metadata('qwen35', 0.87344),
        capabilityPrior: NULL_CAPABILITY_PRIOR,
        roles: {
            router: roleRecord({
                role: 'router',
                qualification: QUALIFICATION.WEAK_CANDIDATE,
                measuredRoleQuality: 8 / 35,
                measuredRoleQualityRaw: '(5 Intent + 3 JSON)/35',
                passedCases: 3,
                totalCases: 13,
                warmLatencyMs: 2787.77,
                tokensPerSecond: 100.87,
                coldLoadMs: 4175.19,
                resourceEfficiency: performance(3.2, 6, 'Ollama /api/ps size'),
                reason: 'Best measured FAST R1 router candidate, but only 3/13 relevant cases passed and no production threshold is approved.',
                evidence: [FAST_EVIDENCE['qwen3.5:0.8b']],
            }),
            memory_extraction: roleRecord({
                role: 'memory_extraction',
                qualification: QUALIFICATION.UNQUALIFIED,
                measuredRoleQuality: 0,
                measuredRoleQualityRaw: '0/5',
                passedCases: 0,
                totalCases: 5,
                warmLatencyMs: 2787.77,
                tokensPerSecond: 100.87,
                coldLoadMs: 4175.19,
                resourceEfficiency: performance(3.2, 6, 'Ollama /api/ps size'),
                reason: 'Failed all five SP4 FAST R1 memory-extraction contracts.',
                evidence: [FAST_EVIDENCE['qwen3.5:0.8b']],
            }),
        },
    },
    {
        model: 'llama3.2:3b',
        metadata: metadata('llama', 3.2),
        capabilityPrior: NULL_CAPABILITY_PRIOR,
        roles: {
            memory_extraction: roleRecord({
                role: 'memory_extraction',
                qualification: QUALIFICATION.UNQUALIFIED,
                measuredRoleQuality: 0,
                measuredRoleQualityRaw: '0/5',
                passedCases: 0,
                totalCases: 5,
                warmLatencyMs: 3848.68,
                tokensPerSecond: 85.89,
                coldLoadMs: 4114.85,
                resourceEfficiency: performance(2.93, 6, 'Ollama /api/ps size'),
                reason: 'Failed all five SP4 FAST R1 memory-extraction contracts.',
                evidence: [FAST_EVIDENCE['llama3.2:3b']],
            }),
        },
    },
    {
        model: 'gemma3:1b',
        metadata: metadata('gemma3', 0.99989),
        capabilityPrior: NULL_CAPABILITY_PRIOR,
        roles: {
            memory_extraction: roleRecord({
                role: 'memory_extraction',
                qualification: QUALIFICATION.UNQUALIFIED,
                measuredRoleQuality: 0,
                measuredRoleQualityRaw: '0/5',
                passedCases: 0,
                totalCases: 5,
                warmLatencyMs: 856.05,
                tokensPerSecond: 132.15,
                coldLoadMs: 2823.07,
                resourceEfficiency: performance(6, 6, 'Ollama /api/ps size'),
                reason: 'Failed all five SP4 FAST R1 memory-extraction contracts.',
                evidence: [FAST_EVIDENCE['gemma3:1b']],
            }),
        },
    },
]);

export const ROLE_POLICIES = Object.freeze({
    router: {
        role: 'router',
        requiresDeterministicFirst: true,
        productionThreshold: null,
        hardGates: ['deterministic_first'],
        fallbackPolicy: FALLBACK_POLICY.DETERMINISTIC_ONLY,
    },
    memory_extraction: {
        role: 'memory_extraction',
        requiresDeterministicFirst: true,
        productionThreshold: null,
        hardGates: ['deterministic_first'],
        fallbackPolicy: FALLBACK_POLICY.FAIL_CLOSED,
    },
    general: {
        role: 'general',
        requiresDeterministicFirst: false,
        productionThreshold: null,
        hardGates: [],
        fallbackPolicy: FALLBACK_POLICY.ALLOW_WEAK_CANDIDATE,
    },
    fast_conversation: {
        role: 'fast_conversation',
        requiresDeterministicFirst: false,
        productionThreshold: null,
        hardGates: [],
        fallbackPolicy: FALLBACK_POLICY.LEGACY_MODEL,
    },
    code: {
        role: 'code',
        requiresDeterministicFirst: false,
        productionThreshold: null,
        hardGates: [],
        fallbackPolicy: FALLBACK_POLICY.LEGACY_MODEL,
    },
    reasoning: {
        role: 'reasoning',
        requiresDeterministicFirst: false,
        productionThreshold: null,
        hardGates: [],
        fallbackPolicy: FALLBACK_POLICY.LEGACY_MODEL,
    },
});

export function getRegistryMode(value = process.env.SP4_MODEL_REGISTRY_MODE) {
    return String(value || '').toLowerCase() === REGISTRY_MODE.ENFORCE
        ? REGISTRY_MODE.ENFORCE
        : REGISTRY_MODE.ADVISORY;
}

export function buildRuntimeModelStates(healthSnapshot, registry = LOCAL_MODEL_REGISTRY) {
    const checkedAt = healthSnapshot?.timestamp
        ? new Date(healthSnapshot.timestamp).toISOString()
        : null;
    const isAuthoritativeSnapshot = healthSnapshot?.healthy === true && Array.isArray(healthSnapshot.models);
    const runtimeByName = new Map(
        isAuthoritativeSnapshot
            ? healthSnapshot.models.map((model) => [model.name, model])
            : []
    );

    return registry.map((entry) => {
        const runtimeModel = runtimeByName.get(entry.model);
        const availability = !isAuthoritativeSnapshot
            ? RUNTIME_AVAILABILITY.UNKNOWN
            : runtimeModel
                ? RUNTIME_AVAILABILITY.INSTALLED
                : RUNTIME_AVAILABILITY.NOT_INSTALLED;

        return {
            model: entry.model,
            availability,
            digest: runtimeModel?.digest || null,
            sizeGB: Number.isFinite(runtimeModel?.size) ? runtimeModel.size / 1e9 : null,
            checkedAt,
        };
    });
}

export async function readRuntimeModelStates({
    healthCheck = ollamaHealthCheck,
    registry = LOCAL_MODEL_REGISTRY,
} = {}) {
    try {
        const healthSnapshot = await healthCheck();
        return buildRuntimeModelStates(healthSnapshot, registry);
    } catch {
        return buildRuntimeModelStates(null, registry);
    }
}

function missingRoleRecord(role) {
    return {
        role,
        qualification: QUALIFICATION.NOT_YET_BENCHMARKED,
        estimatedCapability: null,
        measuredRoleQuality: null,
        measuredRoleQualityRaw: null,
        passedCases: null,
        totalCases: null,
        warmLatencyMs: null,
        tokensPerSecond: null,
        coldLoadMs: null,
        resourceEfficiency: null,
        reason: `No SP4 benchmark evidence exists for role ${role}.`,
        evidence: [],
    };
}

function rejectionReasonFor({ policy, runtimeState, roleRecord: record }) {
    if (runtimeState.availability === RUNTIME_AVAILABILITY.NOT_INSTALLED) {
        return 'runtime_not_installed';
    }
    if (runtimeState.availability === RUNTIME_AVAILABILITY.UNKNOWN) {
        return 'runtime_availability_unknown';
    }
    if (record.qualification === QUALIFICATION.UNQUALIFIED) {
        return 'role_unqualified';
    }
    if (record.qualification === QUALIFICATION.INCONCLUSIVE_CONTAMINATED) {
        return 'benchmark_contaminated';
    }
    if (record.qualification === QUALIFICATION.NOT_YET_BENCHMARKED) {
        return 'role_not_yet_benchmarked';
    }
    if (
        record.qualification === QUALIFICATION.WEAK_CANDIDATE
        && policy.fallbackPolicy !== FALLBACK_POLICY.ALLOW_WEAK_CANDIDATE
    ) {
        return 'weak_candidate_not_allowed_by_policy';
    }
    return null;
}

function noCandidateDecision({ role, policy, mode, legacyModel, candidates, reason, selectionSource }) {
    const mayUseLegacy = ![
        FALLBACK_POLICY.DETERMINISTIC_ONLY,
        FALLBACK_POLICY.FAIL_CLOSED,
    ].includes(policy.fallbackPolicy);
    const actualModel = mayUseLegacy ? legacyModel || null : null;
    const resolvedSelectionSource = selectionSource || (actualModel ? 'LEGACY_FALLBACK' : policy.fallbackPolicy);
    const executionReason = resolvedSelectionSource === 'DETERMINISTIC_REQUIRED'
        ? 'deterministic_required'
        : actualModel
            ? 'legacy_fallback'
            : policy.fallbackPolicy === FALLBACK_POLICY.FAIL_CLOSED
                ? 'fail_closed'
                : 'deterministic_only';

    return {
        role,
        selectedModel: null,
        recommendedModel: null,
        actualModel,
        qualification: null,
        selectionSource: resolvedSelectionSource,
        executionReason,
        candidates,
        fallbackUsed: Boolean(actualModel),
        fallbackPolicy: policy.fallbackPolicy,
        reason,
        evidenceRunIds: [],
        mode,
    };
}

export function resolveModelForRole(role, {
    registry = LOCAL_MODEL_REGISTRY,
    policies = ROLE_POLICIES,
    runtimeStates = buildRuntimeModelStates(null, registry),
    legacyModel = null,
    mode = getRegistryMode(),
    deterministicFirstSatisfied = false,
} = {}) {
    const policy = policies[role];
    if (!policy) {
        throw new Error(`Unknown local model role: ${role}`);
    }

    const normalizedMode = getRegistryMode(mode);
    const runtimeByModel = new Map(runtimeStates.map((state) => [state.model, state]));
    const candidates = registry.map((entry) => {
        const record = entry.roles?.[role] || missingRoleRecord(role);
        const runtimeState = runtimeByModel.get(entry.model) || {
            model: entry.model,
            availability: RUNTIME_AVAILABILITY.UNKNOWN,
            digest: null,
            sizeGB: null,
            checkedAt: null,
        };
        const rejectionReason = rejectionReasonFor({ policy, runtimeState, roleRecord: record });

        return {
            model: entry.model,
            available: runtimeState.availability === RUNTIME_AVAILABILITY.INSTALLED,
            availability: runtimeState.availability,
            qualification: record.qualification,
            measuredRoleQuality: record.measuredRoleQuality,
            estimatedCapability: record.estimatedCapability,
            accepted: rejectionReason === null,
            rejectionReason,
            evidence: Array.isArray(record.evidence) ? record.evidence : [],
        };
    });

    if (policy.requiresDeterministicFirst && deterministicFirstSatisfied !== true) {
        for (const candidate of candidates) {
            candidate.accepted = false;
            candidate.rejectionReason = 'deterministic_first_not_satisfied';
        }
        return noCandidateDecision({
            role,
            policy,
            mode: normalizedMode,
            legacyModel,
            candidates,
            reason: 'Deterministic-first hard gate was not satisfied; registry selection is blocked.',
            selectionSource: 'DETERMINISTIC_REQUIRED',
        });
    }

    const eligible = candidates
        .filter((candidate) => candidate.accepted)
        .sort((left, right) => {
            const authority = {
                [QUALIFICATION.QUALIFIED]: 2,
                [QUALIFICATION.WEAK_CANDIDATE]: 1,
            };
            const authorityDelta = (authority[right.qualification] || 0) - (authority[left.qualification] || 0);
            if (authorityDelta !== 0) return authorityDelta;
            return (right.measuredRoleQuality ?? -1) - (left.measuredRoleQuality ?? -1);
        });

    const selected = eligible[0] || null;
    if (!selected) {
        const reason = policy.fallbackPolicy === FALLBACK_POLICY.FAIL_CLOSED
            ? 'No qualified installed model exists; role policy fails closed.'
            : 'No safe installed registry candidate exists; compatibility fallback applies.';
        return noCandidateDecision({
            role,
            policy,
            mode: normalizedMode,
            legacyModel,
            candidates,
            reason,
        });
    }

    for (const candidate of candidates) {
        if (candidate !== selected && candidate.accepted) {
            candidate.accepted = false;
            candidate.rejectionReason = 'lower_authority_or_role_quality';
        }
    }

    const evidenceRunIds = [...new Set(
        selected.evidence.map((item) => item.runId).filter(Boolean)
    )];
    const selectionSource = selected.qualification === QUALIFICATION.QUALIFIED
        ? 'SP4_BENCHMARK_QUALIFIED'
        : 'SP4_BENCHMARK_WEAK_CANDIDATE';
    const actualModel = normalizedMode === REGISTRY_MODE.ENFORCE
        ? selected.model
        : legacyModel || selected.model;

    return {
        role,
        selectedModel: selected.model,
        recommendedModel: selected.model,
        actualModel,
        qualification: selected.qualification,
        selectionSource,
        executionReason: normalizedMode === REGISTRY_MODE.ENFORCE
            ? 'registry_selection'
            : 'advisory_mode',
        candidates,
        fallbackUsed: false,
        fallbackPolicy: policy.fallbackPolicy,
        reason: selected.qualification === QUALIFICATION.QUALIFIED
            ? 'Highest-authority installed model with a qualified SP4 role benchmark.'
            : 'Highest measured installed SP4 weak candidate allowed by role policy.',
        evidenceRunIds,
        mode: normalizedMode,
    };
}

export function formatModelRegistryAudit(decision) {
    return [
        '[MODEL-REGISTRY]',
        `role=${decision.role}`,
        `mode=${decision.mode}`,
        `recommended=${decision.recommendedModel || 'none'}`,
        `actual=${decision.actualModel || 'none'}`,
        `execution=${decision.executionReason || 'unknown'}`,
        `qualification=${decision.qualification || 'none'}`,
        `fallback=${decision.fallbackUsed}`,
        `reason=${decision.reason}`,
    ].join(' ');
}
