// src/routing/unifiedIntent.js
// SP4 Phase 3 — Unified Intent Coordinator (SHADOW / Step 0)
//
// STATUS: SHADOW. Not wired into the pipeline. Importing or changing this file
// does NOT change runtime behavior until a later migration step explicitly
// calls it from a pipeline call-site. Until then it is dead code by design.
//
// Design contract (verified against modeCompass.js + contextManager.js):
//   analyzeUnified(message, opts) — PURE. Does NOT mutate contextManager.
//     modeHint is computed via pickMode(message, false, true). With
//     useContextLock=false the override layers skip forceUnlock AND LAYER 2
//     (shouldChangeMode) is bypassed entirely, so no contextManager state
//     (currentMode / lastUserInput / conversationHistory) is touched.
//
//   resolveMode(...) — AUTHORITY passthrough. Delegates 1:1 to the real
//     pickMode WITH side-effects. NOT cached, NOT deduped. Provided only so a
//     later step has a single import surface; unused by the pipeline for now.
//
//   modeHint is a HINT (raw, pre-lock detection) — never the authority. The
//   persona that actually answers is whatever the existing pipeline resolves
//   via pickMode(..., true) at its original call-sites.

import {
    buildDecisionContract,
    extractIntent,
    isDecisionIntent,
} from './intentExtractor.js';
import { pickMode } from '../core/modeCompass.js';
import { classifyQueryTypeDetailed } from '../immune/queryTypeClassifier.js';
import { extractDialogueTopic } from '../dialogue/dialogueState.js';

const _turnCache = new Map();
const MAX_CACHE = 64;

function signature(message, opts = {}) {
    return [
        String(message || ''),
        opts.prevUserInput || '',
        opts.prevIntent || '',
        opts.emotionTag || '',
    ].join('::');
}

/**
 * PURE unified analysis for a single turn.
 * No side-effects — modeHint uses pickMode(message, false, true).
 *
 * @param {string} message
 * @param {object} opts - { prevUserInput, prevIntent, emotionTag } (passed to extractIntent)
 * @returns {{intent:string, queryType:object, modeHint:string, topic:string,
 *            decisionContract:object|null, signals:object, sources:object}}
 */
export function analyzeUnified(message, opts = {}) {
    const key = signature(message, opts);
    if (_turnCache.has(key)) return _turnCache.get(key);

    const intent = extractIntent(message, opts);
    const queryType = classifyQueryTypeDetailed(message);
    // useContextLock=false → skips forceUnlock AND shouldChangeMode mutation.
    const modeHint = pickMode(message, false, true);
    const topic = extractDialogueTopic(message, intent);
    const decisionContract = isDecisionIntent(intent)
        ? buildDecisionContract(intent, opts)
        : null;

    const result = {
        intent,
        queryType,
        modeHint,            // HINT only — raw pre-lock detection, not authority
        topic,
        decisionContract,
        signals: {
            isDecision: !!decisionContract,
            needsClarify: intent === 'clarify_previous_reply',
        },
        sources: {
            intent: 'intentExtractor.extractIntent',
            modeHint: 'modeCompass.pickMode(useContextLock=false)',
            queryType: 'queryTypeClassifier.classifyQueryTypeDetailed',
            topic: 'dialogueState.extractDialogueTopic',
        },
    };

    if (_turnCache.size >= MAX_CACHE) {
        _turnCache.delete(_turnCache.keys().next().value);
    }
    _turnCache.set(key, result);
    return result;
}

/**
 * AUTHORITY passthrough. Delegates to the real pickMode WITH side-effects.
 * NOT cached, NOT deduped. Exists only as a single import surface for later
 * migration steps; the pipeline does not call this in Step 0.
 */
export function resolveMode(message, useContextLock = true, useQuickAnalyzer = true) {
    return pickMode(message, useContextLock, useQuickAnalyzer);
}

/**
 * Shadow-diff helper. Compares the PURE unified outputs against legacy values
 * the caller already computed, returning a diff object or null if identical.
 * No pipeline effect — used only for Step 0 verification.
 *
 * @param {string} message
 * @param {object} opts
 * @param {string} [legacyIntent]   - value from a legacy extractIntent() call
 * @param {string} [legacyModeHint] - value from a legacy pickMode(...,false) call
 * @returns {object|null} diff, or null when identical
 */
export function shadowCompare(message, opts = {}, legacyIntent, legacyModeHint) {
    const u = analyzeUnified(message, opts);
    const diff = {};
    if (legacyIntent !== undefined && u.intent !== legacyIntent) {
        diff.intent = { unified: u.intent, legacy: legacyIntent };
    }
    if (legacyModeHint !== undefined && u.modeHint !== legacyModeHint) {
        diff.modeHint = { unified: u.modeHint, legacy: legacyModeHint };
    }
    return Object.keys(diff).length ? diff : null;
}

export function clearTurnCache() {
    _turnCache.clear();
}

export default { analyzeUnified, resolveMode, shadowCompare, clearTurnCache };
