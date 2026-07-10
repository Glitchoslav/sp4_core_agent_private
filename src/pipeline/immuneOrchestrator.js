import { runtimeLog, runtimeWarn } from '../core/runtimeLogging.js';
import { logImmuneEvent } from '../immune/immuneLogger.js';
import { buildSkippedImmuneVerdict, runImmuneCheck } from '../immune/outputImmuneCheck.js';
import { classifyQueryType } from '../immune/queryTypeClassifier.js';
import { applyPostImmuneResponseControl, getImmuneRetryDirective } from '../runtime/responseControl.js';
import { detectGeneralQualitySanityIssue } from './qualityGuards.js';

function appendImmuneAudit(result, entry) {
  if (!result?.metadata) return;
  const current = Array.isArray(result.metadata.immune_audit)
    ? result.metadata.immune_audit
    : [];
  result.metadata.immune_audit = [...current, entry];
  if (result.meta && result.meta !== result.metadata) {
    result.meta.immune_audit = result.metadata.immune_audit;
  }
}

function assertResponseReady(result, stage) {
  if (result?.response === undefined) {
    throw new Error(`immuneOrchestrator: result.response is undefined before ${stage}`);
  }
}

/**
 * Post-response immune stage order:
 * skip decision → immune run → soft retry decision → response control → quality sanity → metadata patch commit.
 *
 * Non-goals: no routing changes, no persona changes, no provider selection changes, no prompt changes.
 */
export async function runPostResponseImmuneStage({
  result,
  userMessage,
  finalMode,
  detectedMode,
  mode,
  selectedModel,
  groundingPrompt,
  promptPackage,
  testMode,
  forceLocal,
  options = {},
  dialogueState = null,
  primaryModel
}) {
  assertResponseReady(result, 'immune skip decision');

  try {
    const immunePersona = finalMode || detectedMode || mode || 'core';
    const immuneQueryType = classifyQueryType(userMessage);
    const immuneModel = result.metadata?.model || result.meta?.model || selectedModel || 'unknown';
    // Predchádzajúci user turn pre follow-up kontext v immune evaluácii
    const _immunePrevTurn = dialogueState?.getPreviousTurn?.('user', t => t.text.toLowerCase().trim() === userMessage.toLowerCase().trim());
    const _immunePrevUserInput = _immunePrevTurn?.text || null;
    const immuneSkipDecision = options.shouldSkipPostResponseImmuneCheck({
      userMessage,
      responseText: result.response,
      metadata: result.metadata,
      persona: immunePersona,
      testMode,
      forceLocal
    });

    appendImmuneAudit(result, `skip:${immuneSkipDecision.skip === true}`);

    if (immuneSkipDecision.skip) {
      const immuneVerdict = buildSkippedImmuneVerdict(immuneSkipDecision.reason);
      if (result.metadata) {
        result.metadata.immuneVerdict = immuneVerdict;
        result.metadata.immuneSkipped = true;
        result.metadata.immuneSkipReason = immuneSkipDecision.reason;
        if (result.metadata.stageTrace) result.metadata.stageTrace.immuneOutcome = 'pass'; // skip = immune not needed
      }
      if (result.meta && result.meta !== result.metadata) {
        result.meta.immuneVerdict = immuneVerdict;
        result.meta.immuneSkipped = true;
        result.meta.immuneSkipReason = immuneSkipDecision.reason;
        if (result.meta.stageTrace) result.meta.stageTrace.immuneOutcome = 'pass';
      }

      appendImmuneAudit(result, `immune:skipped:${immuneSkipDecision.reason}`);
      runtimeLog(`🩸 IMMUNE SKIP [${immunePersona}] reason=${immuneSkipDecision.reason}`);
    } else {
      assertResponseReady(result, 'immune run');
      let immuneVerdict = await runImmuneCheck({
        userInput: userMessage,
        responseText: result.response,
        persona: immunePersona,
        prevUserInput: _immunePrevUserInput
      });
      appendImmuneAudit(result, 'immune:ran');

      const retryDirective = getImmuneRetryDirective({
        immuneVerdict,
        retryApplied: result.metadata?.retryApplied === true,
        truthAnchorAvailable: groundingPrompt !== null
      });

      // 🩸 SOFT RETRY (Phase 4) ─────────────────────────────────────────────
      // Trigger: one repairable soft fail (relevance/language), first time only.
      const _SOFT_RETRY_SAFE =
        retryDirective.shouldRetry &&
        immuneVerdict.immune_confidence === 'high' &&
        typeof result.response === 'string' &&
        result.response.trim().length > 0 &&
        (retryDirective.strategy !== 'answer_again' || groundingPrompt !== null);

      appendImmuneAudit(result, _SOFT_RETRY_SAFE ? 'soft_retry:eligible' : 'soft_retry:skipped');

      if (_SOFT_RETRY_SAFE) {
        try {
          const { askLocalLLM } = await import('../../sp4os/llmLocal.js');
          const _retryModel = result.metadata?.model || result.meta?.model || selectedModel || primaryModel;
          const _inputSnippet = String(userMessage || '').slice(0, 200);
          const _retryPrompt = retryDirective.strategy === 'repair_existing_output'
            ? (
              `${retryDirective.prompt}\n` +
              `Používateľská otázka: ${_inputSnippet}\n` +
              `Rozbitá odpoveď: ${String(result.response || '').slice(0, 500)}`
            )
            : (
              `${retryDirective.prompt}\n` +
              `Používateľská otázka bola: ${_inputSnippet}`
            );

          // 🛡️ Pre answer_again retry vždy prenesieme pôvodný grounding system prompt —
          // prázdny system string necháva model bez kontextu a výsledok halucinuje mimo tému.
          const _retrySystem = retryDirective.strategy === 'answer_again'
            ? (promptPackage?.systemPrompt || '')
            : '';

          const _retryText = await askLocalLLM(
            _retryPrompt, _retrySystem, _retryModel,
            {
              persona: immunePersona,
              mode: immunePersona,
              temperature: 0.2,
              num_predict: retryDirective.strategy === 'repair_existing_output' ? 220 : 300
            }
          );

          if (
            typeof _retryText === 'string'
            && _retryText.trim().length > 0
            && _retryText.trim() !== 'REPAIR_FAILED'
          ) {
            const _retryVerdict = await runImmuneCheck({
              userInput: userMessage,
              responseText: _retryText,
              persona: immunePersona,
              prevUserInput: _immunePrevUserInput
            });

            const _beforeSev = immuneVerdict.severity;
            const _beforeCodes = [...(immuneVerdict.reason_codes || [])];
            const _afterSev = _retryVerdict.severity;
            const _afterCodes = [...(_retryVerdict.reason_codes || [])];

            // Improved = pass true OR severity resolved to none, AND not made hard
            // Extra guard: keď originálny fail bol relevance-based, požadujeme explicitné
            // relevance_ok=true z immune verdiktu — zabraňujeme náhodnému token overlap pass
            // (1 spoločné slovo v off-topic texte nesmie stačiť na akceptáciu retry odpovede)
            const _originalWasRelevanceFail =
              _beforeCodes.includes('RELEVANCE_ZERO_OVERLAP') ||
              _beforeCodes.includes('RELEVANCE_LOW_CONFIDENCE');
            const _retryImproved =
              _retryVerdict.severity !== 'hard' &&
              (_retryVerdict.pass === true || _retryVerdict.severity === 'none') &&
              (!_originalWasRelevanceFail || _retryVerdict.relevance_ok === true);

            if (_retryImproved) {
              result.response = _retryText;
              immuneVerdict = _retryVerdict; // use improved verdict downstream
            }

            const _retryMeta = {
              retryApplied: true,
              retryReason: retryDirective.retryReason,
              retryImproved: _retryImproved,
              retryImmuneBefore: { severity: _beforeSev, reason_codes: _beforeCodes },
              retryImmuneAfter: { severity: _afterSev, reason_codes: _afterCodes }
            };

            if (result.metadata) Object.assign(result.metadata, _retryMeta);
            if (result.meta && result.meta !== result.metadata) Object.assign(result.meta, _retryMeta);

            appendImmuneAudit(result, `soft_retry:attempted:${_retryImproved}`);

            // Log retry as separate immune event
            logImmuneEvent({
              verdict: _retryVerdict,
              mode: immunePersona,
              handledBy: 'softRetry',
              queryType: immuneQueryType,
              model: _retryModel,
              eventKind: 'retry_attempt',
              retryApplied: true,
              retryImproved: _retryImproved
            }).catch(() => { });

            runtimeLog(
              `🩸 IMMUNE RETRY [${immunePersona}] before=${_beforeSev} after=${_afterSev} ` +
              `improved=${_retryImproved} [${_retryVerdict.latency_ms}ms]`
            );
          }
        } catch (_retryErr) {
          appendImmuneAudit(result, 'soft_retry:error');
          runtimeWarn(`🩸 IMMUNE RETRY ERROR (non-fatal): ${_retryErr?.message || _retryErr}`);
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      // Ulož verdict do metadata (Phase 3: observe + sync)
      if (result.metadata) result.metadata.immuneVerdict = immuneVerdict;
      if (result.meta && result.meta !== result.metadata) result.meta.immuneVerdict = immuneVerdict;

      assertResponseReady(result, 'response control');
      const responseControlDecision = applyPostImmuneResponseControl({
        immuneVerdict,
        retryApplied: result.metadata?.retryApplied === true,
        retryImproved: result.metadata?.retryImproved === true,
        userInput: userMessage,
        prevUserInput: _immunePrevUserInput,
        responseText: result.response
      });

      if (responseControlDecision.responseControlApplied) {
        result.response = responseControlDecision.replacementText;
        const _fallbackTelemetry = {
          responseControlApplied: true,
          responseControlReason: responseControlDecision.responseControlReason,
          replacementUsed: responseControlDecision.replacementUsed,
          accuracyFallback: true,
          fallbackReason: responseControlDecision.action,
          fallbackSource: responseControlDecision.replacementUsed || 'response_control',
          wasGrounded: groundingPrompt !== null,
          wasDeterministic: false,
          originalImmuneReason: immuneVerdict?.reason ?? null,
        };
        if (result.metadata) Object.assign(result.metadata, _fallbackTelemetry);
        if (result.meta && result.meta !== result.metadata) Object.assign(result.meta, _fallbackTelemetry);

        appendImmuneAudit(result, `response_control:${responseControlDecision.responseControlReason}`);
        runtimeWarn(
          `🛡️ RESPONSE CONTROL [${immunePersona}] action=${responseControlDecision.action} ` +
          `reason=${responseControlDecision.responseControlReason}`
        );
      } else {
        appendImmuneAudit(result, 'response_control:pass');
      }

      const qualitySanityDecision = detectGeneralQualitySanityIssue({
        userMessage,
        responseText: result.response,
        queryType: immuneQueryType,
        responseControlApplied: result.metadata?.responseControlApplied === true
      });

      if (qualitySanityDecision.applied) {
        result.response = qualitySanityDecision.replacementText;
        if (result.metadata) {
          result.metadata.qualitySanityApplied = true;
          result.metadata.qualitySanityReason = qualitySanityDecision.reason;
          result.metadata.accuracyFallback = true;
          result.metadata.fallbackReason = qualitySanityDecision.action;
        }
        if (result.meta && result.meta !== result.metadata) {
          result.meta.qualitySanityApplied = true;
          result.meta.qualitySanityReason = qualitySanityDecision.reason;
          result.meta.accuracyFallback = true;
          result.meta.fallbackReason = qualitySanityDecision.action;
        }
        appendImmuneAudit(result, `quality:${qualitySanityDecision.reason}`);
        runtimeWarn(
          `🧪 GENERAL QUALITY SANITY [${immunePersona}] action=${qualitySanityDecision.action} ` +
          `reason=${qualitySanityDecision.reason}`
        );
      } else {
        appendImmuneAudit(result, 'quality:pass');
      }

      // Stage Trace: immuneOutcome — zapisujeme AŽ TU, po response control + quality sanity
      // Odráža finálny stav výstupu, nie stav pred prepísaním fallbackom.
      const _immuneOutcome = result.metadata?.retryApplied === true
        ? 'soft_retry'
        : (result.metadata?.responseControlApplied === true
          ? (immuneVerdict?.severity === 'hard' ? 'hard_block' : 'soft_retry')
          : (immuneVerdict?.severity === 'hard' ? 'hard_block' : 'pass'));
      if (result.metadata?.stageTrace) result.metadata.stageTrace.immuneOutcome = _immuneOutcome;
      if (result.meta?.stageTrace && result.meta !== result.metadata) result.meta.stageTrace.immuneOutcome = _immuneOutcome;

      // 🩸 METADATA TRUTH SYNC (Phase 3: Task B)
      // hard: identity/meta leak → accuracyFallback + confidence degradation
      // soft: lang/relevance issue → qualitySuspect signal
      // unknown: immune error → qualityUnknown flag
      if (immuneVerdict.severity === 'hard') {
        if (result.metadata) {
          result.metadata.accuracyFallback = true;
          result.metadata.fallbackReason = 'immune_hard_fail';
          result.metadata.confidence = 'low';
        }
        if (result.meta && result.meta !== result.metadata) {
          result.meta.accuracyFallback = true;
          result.meta.fallbackReason = 'immune_hard_fail';
          result.meta.confidence = 'low';
        }
      } else if (immuneVerdict.severity === 'soft') {
        if (result.metadata) {
          result.metadata.qualitySuspect = true;
          result.metadata.confidenceCap = 'medium';
        }
        if (result.meta && result.meta !== result.metadata) {
          result.meta.qualitySuspect = true;
          result.meta.confidenceCap = 'medium';
        }
      } else if (immuneVerdict.severity === 'unknown') {
        if (result.metadata) result.metadata.qualityUnknown = true;
        if (result.meta && result.meta !== result.metadata) result.meta.qualityUnknown = true;
      }

      // 🩸 PERSISTENT LOG (Phase 3: Task A) – fire-and-forget, non-blocking
      logImmuneEvent({
        verdict: immuneVerdict,
        mode: immunePersona,
        handledBy: 'runImmuneCheck',
        queryType: immuneQueryType,
        model: immuneModel,
        eventKind: 'final_verdict',
        retryApplied: result.metadata?.retryApplied === true,
        retryImproved: result.metadata?.retryImproved === true
      })
        .catch(e => runtimeWarn(`🩸 IMMUNE LOG ERROR: ${e?.message}`));

      // Log verdict (vždy – aj PASS, aj FAIL, aj unknown)
      if (immuneVerdict.immune_error) {
        runtimeLog(`🩸 IMMUNE: unknown (${immuneVerdict.reason}) [${immuneVerdict.latency_ms ?? '?'}ms]`);
      } else if (immuneVerdict.pass === false) {
        runtimeWarn(`🩸 IMMUNE FAIL [${immunePersona}] sev=${immuneVerdict.severity} conf=${immuneVerdict.immune_confidence} prof=${immuneVerdict.immune_profile} → codes=[${(immuneVerdict.reason_codes || []).join(',')}] | ${immuneVerdict.reason} [${immuneVerdict.latency_ms}ms]`);
      } else {
        runtimeLog(`🩸 IMMUNE PASS [${immunePersona}] prof=${immuneVerdict.immune_profile} [${immuneVerdict.latency_ms}ms]`);
      }
    }
  } catch (immuneErr) {
    appendImmuneAudit(result, 'immune:error');
    runtimeWarn(`🩸 IMMUNE ERROR (non-fatal): ${immuneErr?.message || immuneErr}`);
  }

  return result;
}
