/**
 * DEBUG VALIDATOR ENDPOINT (v0.10.2)
 * 
 * Validácia ľubovoľného textu proti persona contracts.
 * Použitie:
 *   - `/debug_validate <text>` príkaz v CLI
 *   - HTTP endpoint /api/validate
 *   - Multi-Agent Council rozhodcovský systém
 * 
 * @module debugValidator
 */

import { validatePersonaOutput } from './personaRegistry.js';

/**
 * Validuje text proti zadanej persone a vráti podrobný report.
 * 
 * @param {string} text - Text na validáciu
 * @param {string} mode - Persona mode (core, glitchoslav, popici, validator)
 * @returns {Promise<Object>} - Validation report
 */
export async function debugValidate(text, mode = 'core') {
    if (!text || typeof text !== 'string') {
        return {
            valid: false,
            mode,
            error: 'Empty or invalid text provided',
            score: 0
        };
    }

    // Get validation result from personaRegistry
    const validation = await validatePersonaOutput(text, mode);

    // Calculate quality score (0-100)
    const score = validation.valid ? calculateQualityScore(text, mode, validation) : 0;

    // Extract issues from validation reason
    const issues = extractIssues(validation, mode);

    return {
        valid: validation.valid,
        mode,
        personaDetected: mode, // TODO: Auto-detect persona from text vibe
        score,
        issues,
        suggestion: validation.valid
            ? 'Text passes persona validation.'
            : validation.reason || 'Unknown validation failure',
        meta: {
            length: text.length,
            sentences: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
            words: text.split(/\s+/).filter(w => w.trim().length > 0).length
        }
    };
}

/**
 * Vypočíta quality score (0-100) pre validovaný text.
 * 
 * @param {string} text - Validovaný text
 * @param {string} mode - Persona mode
 * @param {Object} validation - Validation result
 * @returns {number} - Score 0-100
 */
function calculateQualityScore(text, mode, validation) {
    if (!validation.valid) return 0;

    let score = 100; // Start at perfect

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.trim().length > 0);
    const avgWordsPerSentence = words.length / (sentences.length || 1);

    // Persona-specific quality metrics
    if (mode === 'core') {
        // CORE: prefer shorter, more technical
        if (sentences.length > 4) score -= 10; // Too long
        if (avgWordsPerSentence > 25) score -= 15; // Too wordy
        if (text.includes('...')) score -= 5; // Ellipsis too poetic
        if (/[áäčďéíĺľňóôŕšťúýž]/i.test(text)) score += 5; // Bonus for Slovak diacritics
    } else if (mode === 'popici') {
        // POPICI: prefer brutal, short, slang-heavy
        const slangMatches = (text.match(/\b(ta|bo|šak|bratu|kokot|kurva|piči)\b/gi) || []).length;
        if (slangMatches === 0) score -= 20; // No slang = weak POPICI
        if (slangMatches >= 2) score += 10; // Good slang density
        if (sentences.length > 6) score -= 15; // Too long for POPICI
        if (text.includes('prosím') || text.includes('ďakujem')) score -= 30; // Too polite
    } else if (mode === 'glitchoslav') {
        // GLITCHOSLAV: prefer depth, metaphors, poetry
        const deepWords = (text.match(/\b(prasklina|ticho|pamäť|temnota|svetlo|hranica)\b/gi) || []).length;
        if (deepWords >= 2) score += 15; // Good symbolic density
        if (sentences.length < 2) score -= 20; // Too shallow
        if (text.includes('...')) score += 5; // Ellipsis appropriate for GLITCH
    } else if (mode === 'validator') {
        // VALIDATOR: prefer structured, technical, dry
        if (text.includes('✅') || text.includes('❌')) score += 10; // Visual markers good
        if (text.split('\n').length > 1) score += 10; // Structured format
        if (text.match(/\d+\./g)) score += 5; // Numbered lists OK for VALIDATOR
    }

    // Universal penalties
    if (text.includes('som AI') || text.includes('ako AI model')) score -= 50; // Generic AI speak
    if (text.includes('😊') || text.includes('👍')) score -= 20; // Emoji (except VALIDATOR markers)

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
}

/**
 * Extrahuje konkrétne problémy z validation result.
 * 
 * @param {Object} validation - Validation result from personaRegistry
 * @param {string} mode - Persona mode
 * @returns {Array<Object>} - Array of issues
 */
function extractIssues(validation, mode) {
    if (validation.valid) return [];

    const issues = [];
    const reason = validation.reason || '';

    // Parse reason string for specific violations
    if (reason.includes('emotion')) {
        issues.push({
            type: 'forbidden_emotion',
            snippet: extractSnippet(reason, ['cítim', 'verím', 'nádej']),
            suggestion: 'Remove emotional language. Use factual tone.'
        });
    }

    if (reason.includes('metaphor')) {
        issues.push({
            type: 'forbidden_metaphor',
            snippet: extractSnippet(reason, ['cesta', 'most', 'svetlo', 'tieň']),
            suggestion: 'Remove metaphors. Use concrete technical language.'
        });
    }

    if (reason.includes('slang')) {
        issues.push({
            type: 'forbidden_slang',
            snippet: extractSnippet(reason, ['ta', 'bo', 'šak', 'kokot']),
            suggestion: mode === 'core'
                ? 'Remove slang. Use professional terminology.'
                : 'Slang missing. Add Eastern Slovak dialect for POPICI.'
        });
    }

    if (reason.includes('first person') || reason.includes('addressing')) {
        issues.push({
            type: 'forbidden_addressing',
            snippet: extractSnippet(reason, ['ja som', 'môj', 'ty si', 'teba']),
            suggestion: 'Remove first/second person. Use third person or passive voice.'
        });
    }

    if (reason.includes('helper tone')) {
        issues.push({
            type: 'helper_tone',
            snippet: extractSnippet(reason, ['som tu aby', 'pomôcť ti', 'rád ti pomôžem']),
            suggestion: 'Remove helper tone. Be direct and factual.'
        });
    }

    if (reason.includes('too shallow')) {
        issues.push({
            type: 'insufficient_depth',
            snippet: null,
            suggestion: 'Add more depth. Expand with metaphors and symbolism (GLITCHOSLAV).'
        });
    }

    if (reason.includes('sentence length')) {
        issues.push({
            type: 'sentence_count_violation',
            snippet: null,
            suggestion: mode === 'core'
                ? 'Keep 2-4 sentences. Current response too long/short.'
                : 'Adjust sentence count to persona requirements.'
        });
    }

    // Fallback generic issue
    if (issues.length === 0 && !validation.valid) {
        issues.push({
            type: 'generic_validation_failure',
            snippet: null,
            suggestion: reason
        });
    }

    return issues;
}

/**
 * Pokúsi sa extrahovať konkrétny snippet z reason stringu.
 * 
 * @param {string} reason - Validation reason
 * @param {Array<string>} patterns - Hľadané vzory
 * @returns {string|null} - Snippet alebo null
 */
function extractSnippet(reason, patterns) {
    for (const pattern of patterns) {
        if (reason.toLowerCase().includes(pattern.toLowerCase())) {
            // Try to extract quoted text from reason
            const match = reason.match(/"([^"]+)"/);
            if (match) return match[1];
            return pattern; // Return pattern itself as fallback
        }
    }
    return null;
}

/**
 * Multi-Agent Council Judge: validuje všetky 4 persony a vyberie najlepšiu.
 * 
 * @param {Array<Object>} candidates - Array of { mode, text } objects
 * @returns {Promise<Object>} - Best candidate with validation details
 */
export async function judgeCouncilCandidates(candidates) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
        return {
            error: 'No candidates provided',
            winner: null
        };
    }

    const validations = [];

    for (const candidate of candidates) {
        const validation = await debugValidate(candidate.text, candidate.mode);
        validations.push({
            mode: candidate.mode,
            text: candidate.text,
            ...validation
        });
    }

    // Sort by: valid first, then by score, then by lowest "softness" (fewer helper words)
    validations.sort((a, b) => {
        // Prioritize valid responses
        if (a.valid && !b.valid) return -1;
        if (!a.valid && b.valid) return 1;

        // If both valid or both invalid, sort by score
        if (a.score !== b.score) return b.score - a.score; // Higher score wins

        // If scores equal, calculate softness (prefer harder tone)
        const softnessA = calculateSoftness(a.text);
        const softnessB = calculateSoftness(b.text);
        return softnessA - softnessB; // Lower softness wins
    });

    const winner = validations[0];

    return {
        winner: {
            mode: winner.mode,
            text: winner.text,
            score: winner.score,
            valid: winner.valid
        },
        allValidations: validations,
        meta: {
            totalCandidates: candidates.length,
            validCandidates: validations.filter(v => v.valid).length,
            topScore: winner.score
        }
    };
}

/**
 * Vypočíta "softness" (mäkkosť) textu - vyššie číslo = mäkší tón.
 * 
 * @param {string} text - Text na analýzu
 * @returns {number} - Softness score
 */
function calculateSoftness(text) {
    const softPhrases = [
        'rozumiem',
        'cháp to',
        'môžem pomôcť',
        'je v poriadku',
        'nevadí',
        'možno',
        'skús',
        'ver v seba',
        'všetko bude dobre',
        'dá sa to',
        'neboj sa'
    ];

    let softness = 0;
    const lower = text.toLowerCase();

    for (const phrase of softPhrases) {
        if (lower.includes(phrase)) {
            softness += 10;
        }
    }

    // Penalty for excessive length (soft = wordy)
    if (text.length > 500) softness += 5;
    if (text.length > 1000) softness += 10;

    return softness;
}

/**
 * Formatuje validation report pre CLI output.
 * 
 * @param {Object} report - Report z debugValidate()
 * @returns {string} - Formatted string
 */
export function formatValidationReport(report) {
    const lines = [];

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`🔍 VALIDATOR DEBUG REPORT`);
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Mode: ${report.mode.toUpperCase()}`);
    lines.push(`Valid: ${report.valid ? '✅ PASS' : '❌ FAIL'}`);
    lines.push(`Score: ${report.score}/100`);
    lines.push('');

    if (report.issues.length > 0) {
        lines.push('Issues:');
        for (const issue of report.issues) {
            lines.push(`  ❌ ${issue.type}`);
            if (issue.snippet) {
                lines.push(`     Snippet: "${issue.snippet}"`);
            }
            lines.push(`     Fix: ${issue.suggestion}`);
        }
        lines.push('');
    }

    lines.push(`Meta: ${report.meta.sentences} sentences, ${report.meta.words} words, ${report.meta.length} chars`);
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return lines.join('\n');
}

export default {
    debugValidate,
    judgeCouncilCandidates,
    formatValidationReport
};
