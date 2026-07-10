export function getConfidenceLabel(score) {
  return score >= 0.85 ? 'VERY_HIGH'
    : score >= 0.70 ? 'HIGH'
      : score >= 0.50 ? 'MEDIUM'
        : score >= 0.30 ? 'LOW'
          : 'VERY_LOW';
}

export function calibrateConfidence({
  baseScore,
  enforcementResult,
  deliberationMeta,
  orchestrationResult
}) {
  let finalConfidence = baseScore;
  const calibrationReasons = [];
  const penaltyLogs = [];

  // PENALTY 1: Language rewrites (model couldn't get Slovak right first time)
  const rewriteCount = enforcementResult?.rewriteCount || 0;
  if (rewriteCount > 0) {
    finalConfidence = Math.min(finalConfidence, 0.65);
    calibrationReasons.push(`language_rewrite_count=${rewriteCount}`);
    penaltyLogs.push(`   ⚙️ PENALTY: Language rewrites (${rewriteCount}x) → max confidence 0.65`);
  }

  // PENALTY 2: Persistent English leakage (>10% after enforcement)
  const englishRatioAfter = enforcementResult?.englishRatioAfter || 0;
  if (englishRatioAfter > 0.10) {
    finalConfidence = Math.min(finalConfidence, 0.55);
    calibrationReasons.push(`english_ratio_after=${(englishRatioAfter * 100).toFixed(1)}%`);
    penaltyLogs.push(`   ⚙️ PENALTY: English leakage (${(englishRatioAfter * 100).toFixed(1)}%) → max confidence 0.55`);
  }

  // PENALTY 3: Grounding violation (hallucination detected)
  if (deliberationMeta?.accuracyFallback === true && deliberationMeta?.fallbackReason === 'grounding_violation') {
    finalConfidence = Math.min(finalConfidence, 0.40);
    calibrationReasons.push('grounding_violation');
    penaltyLogs.push('   ⚙️ PENALTY: Grounding violation → max confidence 0.40');
  }

  // PENALTY 3.5: Timeout/empty fallback used
  if (deliberationMeta?.accuracyFallback === true && deliberationMeta?.fallbackReason === 'grounded_timeout_fallback') {
    finalConfidence = Math.min(finalConfidence, 0.45);
    calibrationReasons.push('grounded_timeout_fallback');
    penaltyLogs.push('   ⚙️ PENALTY: Grounded timeout fallback → max confidence 0.45');
  }

  if (deliberationMeta?.accuracyFallback === true && deliberationMeta?.fallbackReason === 'empty_orchestrator_response') {
    finalConfidence = Math.min(finalConfidence, 0.35);
    calibrationReasons.push('empty_orchestrator_response');
    penaltyLogs.push('   ⚙️ PENALTY: Empty orchestrator response → max confidence 0.35');
  }

  if (deliberationMeta?.accuracyFallback === true) {
    const fallbackCap = deliberationMeta?.fallbackReason === 'low_confidence' ? 0.35 : 0.25;
    finalConfidence = Math.min(finalConfidence, fallbackCap);
    calibrationReasons.push(`fallback_truth=${deliberationMeta?.fallbackReason || 'unknown'}`);
    penaltyLogs.push(`   ⚙️ PENALTY: Truthful fallback (${deliberationMeta?.fallbackReason || 'unknown'}) → max confidence ${fallbackCap.toFixed(2)}`);
  }

  // PENALTY 4: Orchestrator validation failures (if present)
  if (orchestrationResult?.meta?.validation?.groundingViolated) {
    finalConfidence = Math.min(finalConfidence, 0.45);
    calibrationReasons.push('orchestrator_grounding_violation');
    penaltyLogs.push('   ⚙️ PENALTY: Orchestrator grounding violation → max confidence 0.45');
  }

  if (orchestrationResult?.meta?.validation?.languageEnforced) {
    const method = orchestrationResult.meta.validation.languageMethod;
    if (method === 'fallback_quality' || method === 'fallback_error') {
      finalConfidence = Math.min(finalConfidence, 0.50);
      calibrationReasons.push(`orchestrator_language_fallback=${method}`);
      penaltyLogs.push(`   ⚙️ PENALTY: Orchestrator language fallback (${method}) → max confidence 0.50`);
    } else if (method === 'strict_translate') {
      finalConfidence = Math.min(finalConfidence, 0.60);
      calibrationReasons.push('orchestrator_strict_translate');
      penaltyLogs.push('   ⚙️ PENALTY: Orchestrator strict translate → max confidence 0.60');
    } else if (method === 'grounded_fallback') {
      finalConfidence = Math.min(finalConfidence, 0.45);
      calibrationReasons.push('orchestrator_grounded_fallback');
      penaltyLogs.push('   ⚙️ PENALTY: Orchestrator grounded fallback → max confidence 0.45');
    }
  }

  return {
    confidenceScore: finalConfidence,
    confidenceLabel: getConfidenceLabel(finalConfidence),
    metadataPatch: {
      calibrationReasons,
      penaltyLogs
    }
  };
}
