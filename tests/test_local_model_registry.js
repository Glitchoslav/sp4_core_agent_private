import assert from 'node:assert/strict';

import {
    FALLBACK_POLICY,
    LOCAL_MODEL_REGISTRY,
    QUALIFICATION,
    REGISTRY_MODE,
    ROLE_POLICIES,
    RUNTIME_AVAILABILITY,
    buildRuntimeModelStates,
    resolveModelForRole,
} from '../src/core/localModelRegistry.js';
import {
    FAST_PATH_MODEL,
    PRIMARY_MODEL,
    ollamaHealthCheck,
    pickModelForTaskDetailed,
} from '../sp4os/llmLocal.js';

console.log('TEST: local model registry v0.1');

function entry(model, role, qualification, measuredRoleQuality, estimatedCapability = null, evidence = []) {
    return {
        model,
        metadata: {
            family: null,
            parametersB: null,
            contextTokens: null,
            license: null,
            modalities: null,
        },
        capabilityPrior: null,
        roles: {
            [role]: {
                role,
                qualification,
                estimatedCapability,
                measuredRoleQuality,
                measuredRoleQualityRaw: measuredRoleQuality === null ? null : String(measuredRoleQuality),
                passedCases: null,
                totalCases: null,
                warmLatencyMs: null,
                tokensPerSecond: null,
                coldLoadMs: null,
                resourceEfficiency: null,
                reason: 'test fixture',
                evidence,
            },
        },
    };
}

function runtime(model, availability = RUNTIME_AVAILABILITY.INSTALLED, digest = null) {
    return {
        model,
        availability,
        digest,
        sizeGB: null,
        checkedAt: '2026-07-31T00:00:00.000Z',
    };
}

function resolve(role, registry, runtimeStates, options = {}) {
    return resolveModelForRole(role, {
        registry,
        runtimeStates,
        legacyModel: 'legacy:model',
        mode: REGISTRY_MODE.ENFORCE,
        ...options,
    });
}

{
    const registry = [
        entry('qualified:model', 'general', QUALIFICATION.QUALIFIED, 0.6),
        entry('weak:model', 'general', QUALIFICATION.WEAK_CANDIDATE, 0.9),
    ];
    const decision = resolve('general', registry, registry.map(({ model }) => runtime(model)));
    assert.equal(decision.selectedModel, 'qualified:model', 'QUALIFIED must outrank installed WEAK');
}

{
    const registry = [entry('weak:model', 'code', QUALIFICATION.WEAK_CANDIDATE, 0.9)];
    const blocked = resolve('code', registry, [runtime('weak:model')]);
    assert.equal(blocked.selectedModel, null, 'WEAK must be blocked when policy does not allow it');
    assert.equal(blocked.actualModel, 'legacy:model');

    const policies = {
        ...ROLE_POLICIES,
        code: { ...ROLE_POLICIES.code, fallbackPolicy: FALLBACK_POLICY.ALLOW_WEAK_CANDIDATE },
    };
    const allowed = resolve('code', registry, [runtime('weak:model')], { policies });
    assert.equal(allowed.selectedModel, 'weak:model', 'WEAK must be selectable only under ALLOW_WEAK_CANDIDATE');
}

{
    const registry = [
        entry('bad:model', 'general', QUALIFICATION.UNQUALIFIED, 1),
        entry('weak:model', 'general', QUALIFICATION.WEAK_CANDIDATE, 0.2),
    ];
    const decision = resolve('general', registry, registry.map(({ model }) => runtime(model)));
    assert.equal(decision.selectedModel, 'weak:model', 'UNQUALIFIED must never be selected');
}

{
    const registry = [
        entry('contaminated:model', 'general', QUALIFICATION.INCONCLUSIVE_CONTAMINATED, null),
        entry('weak:model', 'general', QUALIFICATION.WEAK_CANDIDATE, 0.2),
    ];
    const decision = resolve('general', registry, registry.map(({ model }) => runtime(model)));
    assert.equal(decision.selectedModel, 'weak:model', 'contaminated evidence must never win');
    assert.equal(
        decision.candidates.find(({ model }) => model === 'contaminated:model').rejectionReason,
        'benchmark_contaminated'
    );
}

{
    const registry = [
        entry('estimated:model', 'general', QUALIFICATION.NOT_YET_BENCHMARKED, null, 1),
        entry('measured:model', 'general', QUALIFICATION.WEAK_CANDIDATE, 0.1, null),
    ];
    const decision = resolve('general', registry, registry.map(({ model }) => runtime(model)));
    assert.equal(decision.selectedModel, 'measured:model', 'estimated prior must not outrank SP4 measurement');
}

{
    const registry = [
        entry('missing:model', 'general', QUALIFICATION.QUALIFIED, 1),
        entry('installed:model', 'general', QUALIFICATION.WEAK_CANDIDATE, 0.2),
    ];
    const decision = resolve('general', registry, [
        runtime('missing:model', RUNTIME_AVAILABILITY.NOT_INSTALLED),
        runtime('installed:model'),
    ]);
    assert.equal(decision.selectedModel, 'installed:model', 'not_installed model must not be selected');
}

{
    const registry = [entry('unknown:model', 'general', QUALIFICATION.QUALIFIED, 1)];
    const decision = resolve('general', registry, [runtime('unknown:model', RUNTIME_AVAILABILITY.UNKNOWN)]);
    assert.equal(decision.selectedModel, null, 'UNKNOWN availability must be conservative');
    assert.equal(decision.actualModel, 'legacy:model');
}

{
    const decision = resolve('general', [], []);
    assert.equal(decision.actualModel, 'legacy:model', 'general without candidates must use legacy primary');
    assert.equal(decision.fallbackUsed, true);
    assert.equal(decision.executionReason, 'legacy_fallback');
}

{
    const registry = [
        entry('bad-memory:model', 'memory_extraction', QUALIFICATION.UNQUALIFIED, 0),
    ];
    const decision = resolve('memory_extraction', registry, [runtime('bad-memory:model')], {
        deterministicFirstSatisfied: true,
    });
    assert.equal(decision.actualModel, null, 'memory extraction without qualified model must fail closed');
    assert.equal(decision.fallbackPolicy, FALLBACK_POLICY.FAIL_CLOSED);
    assert.equal(decision.executionReason, 'fail_closed');
}

{
    const registry = [entry('router:model', 'router', QUALIFICATION.QUALIFIED, 1)];
    const decision = resolve('router', registry, [runtime('router:model')]);
    assert.equal(decision.selectedModel, null, 'router must not bypass deterministic-first');
    assert.equal(decision.selectionSource, 'DETERMINISTIC_REQUIRED');
}

{
    const registry = [entry('recommended:model', 'general', QUALIFICATION.WEAK_CANDIDATE, 0.8)];
    const decision = resolve('general', registry, [runtime('recommended:model')], {
        mode: REGISTRY_MODE.ADVISORY,
    });
    assert.equal(decision.recommendedModel, 'recommended:model');
    assert.equal(decision.actualModel, 'legacy:model', 'advisory recommendation may differ from actual');
    assert.equal(decision.fallbackUsed, false, 'advisory execution is not a resolver fallback');
    assert.equal(decision.executionReason, 'advisory_mode');
}

{
    const registry = [entry('selected:model', 'general', QUALIFICATION.WEAK_CANDIDATE, 0.8)];
    const decision = resolve('general', registry, [runtime('selected:model')]);
    assert.equal(decision.actualModel, decision.selectedModel, 'enforce must execute allowed selection');
    assert.equal(decision.executionReason, 'registry_selection');
}

{
    const qwen3 = LOCAL_MODEL_REGISTRY.find(({ model }) => model === 'qwen3:4b');
    assert.equal(qwen3.roles.general.qualification, QUALIFICATION.INCONCLUSIVE_CONTAMINATED);
    assert.equal(qwen3.roles.general.measuredRoleQuality, null);
    assert.equal(qwen3.roles.general.measuredRoleQualityRaw, '0/70');
}

{
    for (const model of LOCAL_MODEL_REGISTRY) {
        for (const record of Object.values(model.roles)) {
            assert.ok(Array.isArray(record.evidence), `${model.model}/${record.role} evidence must be an array`);
        }
    }
}

{
    const staticEntry = LOCAL_MODEL_REGISTRY.find(({ model }) => model === 'qwen3.5:4b');
    const benchmarkDigest = staticEntry.roles.general.evidence[0].modelDigest;
    const runtimeDigest = 'different-runtime-digest';
    const states = buildRuntimeModelStates({
        healthy: true,
        timestamp: new Date('2026-07-31T08:00:00.000Z'),
        models: [{ name: staticEntry.model, digest: runtimeDigest, size: 123 }],
    });
    assert.equal(states.find(({ model }) => model === staticEntry.model).digest, runtimeDigest);
    assert.equal(staticEntry.roles.general.evidence[0].modelDigest, benchmarkDigest);
    assert.notEqual(runtimeDigest, benchmarkDigest, 'runtime digest must not rewrite historical evidence');
}

const installedSeedStates = LOCAL_MODEL_REGISTRY.map(({ model }) => runtime(model));

{
    const decision = pickModelForTaskDetailed({
        userInput: 'Ahoj',
        runtimeStates: installedSeedStates,
    });
    assert.equal(decision.fastPathUsed, true);
    assert.equal(decision.model, FAST_PATH_MODEL, 'simple fast question must keep FAST behavior');
}

{
    const decision = pickModelForTaskDetailed({
        userInput: 'Vysvetli architekturu SP4.',
        registryMode: REGISTRY_MODE.ADVISORY,
        runtimeStates: installedSeedStates,
    });
    assert.equal(decision.role, 'general');
    assert.equal(decision.recommendedModel, 'qwen3.5:4b');
    assert.equal(decision.model, PRIMARY_MODEL, 'advisory general must keep legacy PRIMARY actual model');
}

{
    const decision = pickModelForTaskDetailed({
        userInput: 'Debug this Node.js function error.',
        registryMode: REGISTRY_MODE.ENFORCE,
        runtimeStates: installedSeedStates,
    });
    assert.equal(decision.role, 'code');
    assert.equal(decision.recommendedModel, null, 'code must not select a model by its name or prior');
    assert.equal(decision.model, PRIMARY_MODEL);
}

{
    const decision = pickModelForTaskDetailed({
        userInput: 'Vysvetli architekturu SP4.',
        registryResolver() {
            throw new Error('injected registry failure');
        },
    });
    assert.equal(decision.model, PRIMARY_MODEL, 'registry exception must preserve legacy general execution');
    assert.match(decision.registryDecision.reason, /Registry exception/);
    assert.equal(decision.registryDecision.executionReason, 'registry_exception_fallback');
}

{
    const offlineStates = buildRuntimeModelStates({
        healthy: false,
        timestamp: new Date('2026-07-31T08:00:00.000Z'),
    });
    assert.ok(offlineStates.every(({ availability }) => availability === RUNTIME_AVAILABILITY.UNKNOWN));
}

{
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
        ok: true,
        async json() {
            return {
                models: LOCAL_MODEL_REGISTRY.map(({ model }, index) => ({
                    name: model,
                    digest: `runtime-${index}`,
                    size: 1000 + index,
                })),
            };
        },
    });

    try {
        await ollamaHealthCheck();
    } finally {
        globalThis.fetch = originalFetch;
    }

    const decision = pickModelForTaskDetailed({
        userInput: 'Vysvetli architekturu SP4.',
        registryMode: REGISTRY_MODE.ADVISORY,
    });
    assert.equal(decision.recommendedModel, 'qwen3.5:4b', 'live health snapshot must feed the sync gate');
    assert.equal(decision.model, PRIMARY_MODEL);
}

console.log('PASS: local model registry v0.1');
