// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: confidenceScoring          │
// │  Layer: Core / Quality Assessment          │
// │  Role: Unified confidence score calculator │
// │  API: calculateConfidenceScore(context)    │
// └─────────────────────────────────────────────┘

/**
 * 🎯 UNIFIED CONFIDENCE SCORING v1.0
 * 
 * Single score (0.0 - 1.0) that answers:
 * "Ako veľmi si môžem veriť tomuto výstupu?"
 * 
 * @module confidenceScoring
 */

import { runtimeLog } from './runtimeLogging.js';

/**
 * Calculate confidence score for a response
 * @param {Object} context - Response generation context
 * @returns {Object} { score: number, factors: Object, breakdown: string }
 */
export function calculateConfidenceScore(context = {}) {
    const {
        // Model selection
        modelUsed = 'llama3:8b',
        modelConfidence = null,      // From modeCompass pattern matching

        // Pipeline interventions
        patternFallback = false,     // Low confidence, used pattern fallback
        groundingApplied = false,    // SP4 factual grounding injected
        languageEnforced = false,    // Language enforcer rewrite
        hallucinationFixed = false,  // Detected + fixed hallucination
        validationPassed = true,     // Persona validation check

        // Policy & execution
        policyCompliant = true,      // Policy matched execution
        cloudUsed = false,
        localFallback = false,       // Cloud failed, fell back to local
        accuracyFallback = false,    // Runtime had to replace empty/bad answer with fallback

        // Task characteristics
        taskComplexity = 0.5,        // 0=simple, 1=very complex
        requiresPrecision = false,   // Technical accuracy critical

        // Additional context
        memoryAccess = false,        // Used memory/RAG
        responseLength = 100         // Chars (very short = suspicious)
    } = context;

    // 🎯 BASE SCORE (neutral 0.7 — certainty must be earned, not assumed)
    let score = 0.7;
    const factors = {};

    // 1️⃣ MODEL CONFIDENCE (from modeCompass)
    if (modelConfidence !== null && modelConfidence < 0.65) {
        const penalty = (0.65 - modelConfidence) * 0.3; // Up to -0.3
        score -= penalty;
        factors.lowModelConfidence = -penalty;
    } else if (modelConfidence !== null) {
        factors.modelConfidence = 0; // Baseline OK
    }

    // 2️⃣ PATTERN FALLBACK (signal of uncertainty)
    if (patternFallback) {
        score -= 0.15;
        factors.patternFallback = -0.15;
    }

    // 3️⃣ GROUNDING APPLIED (increases confidence - has facts)
    if (groundingApplied) {
        score += 0.1;
        factors.groundingApplied = +0.1;
    }

    // 4️⃣ LANGUAGE ENFORCEMENT (mild penalty - had to fix output)
    if (languageEnforced) {
        score -= 0.05;
        factors.languageEnforced = -0.05;
    }

    // 5️⃣ HALLUCINATION DETECTION (penalty - model tried to lie)
    if (hallucinationFixed) {
        score -= 0.2;
        factors.hallucinationFixed = -0.2;
    }

    // 6️⃣ VALIDATION FAILURE (critical issue)
    if (!validationPassed) {
        score -= 0.25;
        factors.validationFailed = -0.25;
    }

    // 7️⃣ POLICY COMPLIANCE (trust issue if mismatch)
    if (!policyCompliant) {
        score -= 0.15;
        factors.policyMismatch = -0.15;
    }

    // 8️⃣ LOCAL FALLBACK (cloud failed - warning sign)
    if (localFallback) {
        score -= 0.1;
        factors.localFallback = -0.1;
    }

    // 8.5️⃣ ACCURACY/EMPTY FALLBACK (strong trust penalty)
    if (accuracyFallback) {
        score -= 0.35;
        factors.accuracyFallback = -0.35;
    }

    // 9️⃣ TASK COMPLEXITY vs MODEL CAPABILITY
    if (requiresPrecision && !cloudUsed) {
        // High precision task on local model - slight penalty
        score -= 0.08;
        factors.precisionOnLocal = -0.08;
    }

    // 🔟 RESPONSE LENGTH (suspiciously short = low confidence)
    if (responseLength < 20) {
        score -= 0.1;
        factors.tooShort = -0.1;
    }

    // 1️⃣1️⃣ MEMORY ACCESS (bonus - has context)
    if (memoryAccess) {
        score += 0.05;
        factors.memoryAccess = +0.05;
    }

    // 🔒 BOUNDS: Clamp to [0, 1]
    score = Math.max(0, Math.min(1, score));

    // 📊 BREAKDOWN (human-readable explanation)
    const breakdown = buildBreakdown(score, factors);

    return {
        score: parseFloat(score.toFixed(3)),
        factors,
        breakdown,
        label: getConfidenceLabel(score)
    };
}

/**
 * Get human-readable label for confidence score
 * @param {number} score - Confidence score 0-1
 * @returns {string} Label
 */
function getConfidenceLabel(score) {
    if (score >= 0.9) return 'VERY_HIGH';
    if (score >= 0.75) return 'HIGH';
    if (score >= 0.6) return 'MEDIUM';
    if (score >= 0.4) return 'LOW';
    return 'VERY_LOW';
}

/**
 * Build human-readable breakdown
 * @param {number} score - Final score
 * @param {Object} factors - Factor contributions
 * @returns {string} Breakdown text
 */
function buildBreakdown(score, factors) {
    const lines = [`Final: ${score.toFixed(3)} (${getConfidenceLabel(score)})`];

    // Sort factors by absolute impact
    const sorted = Object.entries(factors).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

    for (const [factor, value] of sorted) {
        const sign = value >= 0 ? '+' : '';
        lines.push(`  ${factor}: ${sign}${value.toFixed(3)}`);
    }

    return lines.join('\n');
}

/**
 * Log confidence score (for debugging)
 * @param {Object} confidenceResult - Result from calculateConfidenceScore()
 * @param {boolean} verbose - Show full breakdown
 */
export function logConfidenceScore(confidenceResult, verbose = false) {
    const { score, label, breakdown } = confidenceResult;

    runtimeLog(`   🎯 Confidence: ${score.toFixed(3)} (${label})`);

    if (verbose) {
        runtimeLog(`   📊 Breakdown:\n${breakdown}`);
    }
}

/**
 * Check if confidence is acceptable for task
 * @param {number} score - Confidence score
 * @param {Object} requirements - Task requirements
 * @returns {boolean} True if acceptable
 */
export function isConfidenceAcceptable(score, requirements = {}) {
    const {
        minConfidence = 0.6,         // Default threshold
        criticalTask = false          // Requires higher confidence
    } = requirements;

    const threshold = criticalTask ? Math.max(minConfidence, 0.75) : minConfidence;
    return score >= threshold;
}
