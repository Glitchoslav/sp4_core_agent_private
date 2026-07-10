export function assembleUnifiedMetadata({
    policy,
    testMode,
    deliberationMeta,
    selectedModel,
    processingTime,
    emotionalAnalysis,
    capabilityLevel,
    taskType,
    groundingPrompt,
    confidenceResult,
    cloudUsed
}) {
    const getCloudDisabledReason = () => {
        if (policy.forceLocal) return 'policy';
        if (!policy.allowCloud && !policy.forceCloud) return 'policy';
        if (testMode && !policy.forceCloud) return 'testMode';
        return null;
    };

    const cloudDisabledReason = getCloudDisabledReason();
    const cloudDisabled = cloudDisabledReason !== null;

    return {
        policy: {
            cloudAllowed: policy.allowCloud || false,
            forceLocal: policy.forceLocal || false,
            forceCloud: policy.forceCloud || false,
            route: policy.route || 'local-first',
            reason: policy.reason || 'local-first-default'
        },

        execution: {
            cloudUsed: cloudUsed,
            provider: deliberationMeta?.provider || 'local_ollama',
            cloudDisabled: cloudDisabled,
            cloudDisabledReason: cloudDisabledReason,
            accuracyFallback: deliberationMeta?.accuracyFallback || false,
            fallbackReason: deliberationMeta?.fallbackReason || null,
            confidenceScore: confidenceResult.score,
            confidenceLabel: confidenceResult.label,
            confidenceFactors: confidenceResult.factors
        },

        handledBy: deliberationMeta?.handledBy || 'unknown',
        model: deliberationMeta?.selectedModel || deliberationMeta?.model || selectedModel,
        selectedModel: deliberationMeta?.selectedModel || deliberationMeta?.model || selectedModel,
        selectionReason: deliberationMeta?.selectionReason || null,
        fastPathUsed: deliberationMeta?.fastPathUsed === true,
        highRiskTrigger: deliberationMeta?.highRiskTrigger || null,
        highRiskTriggers: deliberationMeta?.highRiskTriggers || [],
        queryType: deliberationMeta?.queryType || null,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),

        emotionalAnalysis,
        capabilityLevel,
        taskType,
        grounding: groundingPrompt ? true : false,
        orchestrationMode: deliberationMeta?.orchestrationMode,
        orchestratedBy: deliberationMeta?.orchestratedBy,
        reasoning: deliberationMeta?.reasoning,
        persona: deliberationMeta?.persona,
        memoryAccess: deliberationMeta?.memoryAccess,
        role: deliberationMeta?.role,
        decisionContract: deliberationMeta?.decisionContract || null,
        decisionType: deliberationMeta?.decisionType || null,
        decisionSubStyle: deliberationMeta?.decisionSubStyle || null,
        decisionStrength: deliberationMeta?.decisionStrength || null,
        decisionReasonType: deliberationMeta?.decisionReasonType || null,
        hedgeCount: Number.isFinite(deliberationMeta?.hedgeCount) ? deliberationMeta.hedgeCount : null,
        decisionCleanupApplied: deliberationMeta?.decisionCleanupApplied === true,
        decisionValidationIssues: deliberationMeta?.decisionValidationIssues || [],
        lastVerdict: deliberationMeta?.lastVerdict || null,
        fireDecisionApplied: deliberationMeta?.fireDecisionApplied === true,
        fireDecisionSkipped: deliberationMeta?.fireDecisionSkipped === true,

        provider: (process.env.SP4_TEST === 'true' && policy.forceLocal)
            ? undefined
            : (deliberationMeta?.provider || 'local_ollama'),
        cloudAllowed: policy.allowCloud || false,
        policyReason: policy.reason || 'local-first-default',
        route: policy.route || 'local-first',

        // Stage Trace — diagnostická vrstva pre battletest a audit
        // immuneOutcome, writeDecision, retrievalPolicy sú doplnené neskôr v pipeline
        stageTrace: {
            routeDecision: (() => {
                const p = deliberationMeta?.provider || '';
                const h = deliberationMeta?.handledBy || '';
                if (p.startsWith('deterministic_') || p === 'local_deterministic') return 'deterministic';
                if (deliberationMeta?.orchestrationMode === 'guard' || h.endsWith('_guard')) return 'guard';
                return 'freeform';
            })(),
            routeOwner: deliberationMeta?.handledBy || null,
            promptStrategy: deliberationMeta?.promptStrategy || null,
            immuneOutcome: null,
            writeDecision: null,
            retrievalPolicy: null
        }
    };
}
