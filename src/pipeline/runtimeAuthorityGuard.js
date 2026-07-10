export function buildRuntimeAuthorityPrompt(userMessage) {
  return `Splň presne túto runtime-authority úlohu používateľa.

PRAVIDLÁ:
1. Odpovedaj výlučne po slovensky.
2. Max 2 vety.
3. Musíš explicitne použiť tokeny: sp4.js start, default, server.js, legacy.
4. Nevymýšľaj hru, latenciu ani server hosting.
5. Nepouži frázu npm run serve.
6. Drž sa len tohto faktu: sp4.js start je kanonický default entrypoint runtime; server.js je legacy HTTP flow oddelený od default štartu.

Úloha používateľa:
${userMessage}`.trim();
}

export function finalizeRuntimeAuthorityGuardResponse(rawOutput) {
  const candidate = String(rawOutput || '').trim();
  const normalized = candidate
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const requiredSignals = ['sp4.js start', 'default', 'server.js', 'legacy'];
  const hasRequiredSignals = requiredSignals.every((signal) => normalized.includes(signal));
  const hasBannedSignal = normalized.includes('npm run serve');

  if (candidate && hasRequiredSignals && !hasBannedSignal) {
    return candidate;
  }

  return 'SP4 sa defaultne štartuje cez sp4.js start, lebo to je kanonický entrypoint runtime. server.js je legacy HTTP flow oddelený od default štartu, aby ostal bootstrap čistý a mimo legacy server vetvy.';
}

export function resolveRuntimeAuthorityGuardOutcome({
  rawOutput,
  runtimeAuthorityModel,
  localLlmError = null
}) {
  const rawCandidate = String(rawOutput || '').trim();
  const finalResponse = finalizeRuntimeAuthorityGuardResponse(rawCandidate);
  const fallbackUsed = Boolean(localLlmError) || finalResponse !== rawCandidate;
  const localLlmProven = !localLlmError && rawCandidate.length > 0;

  if (!fallbackUsed) {
    return {
      response: finalResponse,
      provider: 'local_ollama',
      model: runtimeAuthorityModel,
      fallbackUsed: false,
      localLlmProven: true,
      reasoning: 'Focused local launcher guard before freeform orchestration',
      confidenceScore: 0.94,
      confidenceLabel: 'VERY_HIGH'
    };
  }

  if (localLlmProven) {
    return {
      response: finalResponse,
      provider: 'local_ollama',
      model: runtimeAuthorityModel,
      fallbackUsed: true,
      localLlmProven: true,
      reasoning: 'Focused local launcher guard corrected off-contract local output',
      confidenceScore: 0.88,
      confidenceLabel: 'HIGH'
    };
  }

  return {
    response: finalResponse,
    provider: 'deterministic_runtime_authority',
    model: 'none',
    fallbackUsed: true,
    localLlmProven: false,
    reasoning: 'Focused local launcher guard used exact fallback after missing local LLM proof',
    confidenceScore: 0.83,
    confidenceLabel: 'HIGH'
  };
}

/**
 * @typedef {Object} GuardResult
 * @property {boolean} success
 * @property {string} response
 * @property {Object} metadata
 * @property {Object} meta
 */
export function buildGuardResult({
  response,
  handledBy,
  provider,
  policy,
  emotionalAnalysis,
  capabilityLevel,
  taskType,
  processingTime,
  intent,
  reasoning = 'Guard resolved request before orchestration',
  confidenceScore = 0.99,
  confidenceLabel = 'VERY_HIGH',
  selectedPersona = null,
  promptMode = null,
  finalMode = null,
  personaInvariantOverrideReason = 'guard',
  extraMetadata = {}
}) {
  const metadata = {
    policy: {
      cloudAllowed: policy.allowCloud || false,
      forceLocal: policy.forceLocal || false,
      forceCloud: policy.forceCloud || false,
      route: policy.route || 'local-first',
      reason: policy.reason || 'local-first-default'
    },
    execution: {
      cloudUsed: false,
      provider,
      cloudDisabled: true,
      cloudDisabledReason: 'policy',
      accuracyFallback: false,
      fallbackReason: null,
      confidenceScore,
      confidenceLabel,
      confidenceFactors: {}
    },
    handledBy,
    selectedPersona: selectedPersona || handledBy,
    promptMode: promptMode || selectedPersona || handledBy,
    finalMode: finalMode || selectedPersona || handledBy,
    personaInvariantOverrideReason,
    model: 'none',
    processingTime: `${processingTime}ms`,
    timestamp: new Date().toISOString(),
    emotionalAnalysis,
    capabilityLevel,
    taskType,
    grounding: false,
    orchestrationMode: 'guard',
    orchestratedBy: handledBy,
    reasoning,
    persona: handledBy,
    memoryAccess: 'none',
    role: 'GUARD',
    intent,
    provider,
    cloudAllowed: policy.allowCloud || false,
    policyReason: policy.reason || 'local-first-default',
    route: policy.route || 'local-first',
    languageMethod: 'none',
    responseControlApplied: false,
    responseControlReason: null,
    replacementUsed: false,
    preLLMBlocked: false,
    preLLMBlockReason: null,
    identityHardeningApplied: false,
    identityPath: null,
    identitySanitized: false,
    qualitySanityApplied: false,
    qualitySanityReason: null,
    memoryWriteBlocked: false,
    memoryWriteBlockReason: null,
    contaminatedMemoryIgnored: 0,
    ...extraMetadata
  };

  return {
    success: true,
    response,
    metadata,
    meta: metadata
  };
}
