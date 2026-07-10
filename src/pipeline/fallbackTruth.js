export function mapFallbackReasonToEnum(reason) {
  const normalized = String(reason || '').trim().toLowerCase();
  if (!normalized) return null;

  if (normalized === 'timeout' || normalized === 'grounded_timeout_fallback') {
    return 'timeout';
  }

  if (normalized === 'empty_response' || normalized === 'empty_orchestrator_response') {
    return 'empty_response';
  }

  if (normalized === 'enforcer_fail') {
    return 'enforcer_fail';
  }

  if (
    normalized === 'grounding_violation'
    || normalized === 'grounded_language_fallback'
    || normalized === 'low_confidence'
  ) {
    return 'low_confidence';
  }

  return null;
}

export function applyFallbackTruth({
  userMessage,
  output,
  deliberationMeta,
  enforcementResult,
  elapsedMs
}) {
  if (!deliberationMeta) return null;

  const fallbackReason = mapFallbackReasonToEnum(deliberationMeta.fallbackReason);

  if (!fallbackReason) {
    return null;
  }

  deliberationMeta.accuracyFallback = true;
  deliberationMeta.fallbackReason = fallbackReason;
  return fallbackReason;
}
