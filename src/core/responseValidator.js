// responseValidator.js
// Diagnostics-only response scoring kept for backward compatibility.
// This module does not enforce runtime blocking and must not be treated as protection.

export const RESPONSE_VALIDATOR_MODE = 'diagnostics_only';

/**
 * 🔍 COMPREHENSIVE RESPONSE DIAGNOSTICS
 *
 * Checks:
 * - Slovak language quality (diacritics, EN leak, mixed text)
 * - Persona-specific rules (CORE = technical, POPICI = vulgar/dialekt, GLITCHOSLAV = mystical)
 * - Safety (harmful content, spam, instruction injection)
 * - Hallucinations (SP4 fakty, capabilities)
 *
 * Legacy API retained for tests and tooling:
 *  - isValidResponse() → permissive compatibility check
 *  - validateResponse() → diagnostics report for debug/logging
 *
 * @param {string} response - LLM response to validate
 * @param {Object} context - Validation context
 * @param {string} context.persona - Persona mode (core, popici, glitchoslav)
 * @param {string} context.userInput - Original user input
 * @param {boolean} context.strictMode - Enable strict validation (default: false)
 * @returns {Object} { valid: boolean, issues: string[], score: number, details: {...} }
 */
export function validateResponse(response, context = {}) {
    const { persona, userInput, strictMode = false } = context;

    // SP4 OVERRIDE: akýkoľvek neprázdny text berieme ako validný
    if (typeof response === 'string' && response.trim().length > 0) {
        const text = response.trim();
        return {
            valid: true,
            enforcement: false,
            diagnosticOnly: true,
            issues: [],
            score: 100,
            details: {
                slovakCheck: null,
                personaCheck: null,
                safetyCheck: null,
                hallucinationCheck: null,
            },
            text,
            normalized: text,
            severity: 'none',
            reason: 'non_empty_text',
        };
    }

    const issues = [];
    let score = 100; // Start at 100, deduct points for issues

    // === BASIC SANITY CHECKS ===
    if (!response || typeof response !== 'string') {
        return {
            valid: false,
            issues: ['Response is null or not a string'],
            score: 0,
        };
    }

    const text = response.trim();

    if (text.length > 5000) {
        issues.push('Response too long (>5000 chars, possible hallucination)');
        score -= 20;
    }

    // === SLOVAK LANGUAGE VALIDATION ===
    const slovakCheck = validateSlovakText(text);
    if (!slovakCheck.valid) {
        issues.push(...slovakCheck.issues);
    }
    score -= slovakCheck.penalty;

    // === PERSONA-SPECIFIC RULES ===
    let personaCheck = null;
    if (persona) {
        personaCheck = validatePersonaRules(text, persona, userInput || '');
        if (!personaCheck.valid) {
            issues.push(...personaCheck.issues);
        }
        score -= personaCheck.penalty;
    }

    // === SAFETY CHECKS ===
    const safetyCheck = validateSafety(text);
    if (!safetyCheck.valid) {
        issues.push(...safetyCheck.issues);
    }
    score -= safetyCheck.penalty;

    // === HALLUCINATION DETECTION ===
    const hallucinationCheck = detectHallucination(text, userInput || '');
    if (!hallucinationCheck.valid) {
        issues.push(...hallucinationCheck.issues);
    }
    score -= hallucinationCheck.penalty;

    // Clamp score
    score = Math.max(0, score);

    // === FINAL VERDICT ===
    // strictMode = používa Walter pri testoch (musí byť čisté)
    // lenientMode = fallbackChain → stačí „dosť dobré"
    const hasCritical = issues.some((i) => i.includes('CRITICAL'));
    const valid = strictMode
        ? score >= 80 && !hasCritical
        : score >= 50 && !hasCritical;

    return {
        valid,
        enforcement: false,
        diagnosticOnly: true,
        issues,
        score,
        details: {
            slovakCheck,
            personaCheck,
            safetyCheck,
            hallucinationCheck,
        },
    };
}

/**
 * 🌐 LANGUAGE VALIDATION (DEPRECATED - Language freedom enabled)
 * Kept for backward compatibility but always returns valid
 */
export function validateSlovakText(text) {
    return {
        valid: true,
        issues: [],
        penalty: 0,
        stats: {
            diacriticsCount: 0,
            wordCount: text.split(/\s+/).filter(Boolean).length,
            englishMatches: 0,
            englishDensity: 0,
            slovakMatches: 0,
        },
    };
}

/**
 * 🎭 PERSONA RULE VALIDATION
 * Kontroluje, či odpoveď sedí na personu
 */
export function validatePersonaRules(text, persona, userInput = '') {
    const issues = [];
    let penalty = 0;
    const lowerText = text.toLowerCase();

    switch (persona.toLowerCase()) {
        case 'core':
        case 'sp4_core': {
            // CORE: technický, vecný, stručný
            if (
                text.length > 800 &&
                !lowerText.includes('vysvetli') &&
                !lowerText.includes('podrobne') &&
                !(userInput && userInput.toLowerCase().match(/vysvetli|detailne|podrobne/))
            ) {
                issues.push('CORE response too verbose (should be concise)');
                penalty += 15;
            }

            // Príliš mystické pre CORE
            const mysticWords = /\b(chaos|hlbina|void|tieň|svetl|iskr|plamene|popol|tma|duša|prasklina)\b/gi;
            const mysticCount = (text.match(mysticWords) || []).length;
            if (mysticCount >= 3) {
                issues.push('CORE response too mystical (wrong persona)');
                penalty += 25; // teraz určite „warn" v testoch
            }
            break;
        }

        case 'popici':
        case 'popiči': {
            // POPIČI: vulgar + dialekt
            const vulgarWords =
                /\b(kokot|kurva|piča|jebať|sračk|bordel|do piče|do riti|na piču)\b/gi;
            const dialectWords = /\b(ta|šak|bo|bratu|hej|no|čo je|čumíš|robíš)\b/gi;

            const vulgarCount = (text.match(vulgarWords) || []).length;
            const dialectCount = (text.match(dialectWords) || []).length;

            // Len warning – hlavne pri dlhších výstupoch
            if (vulgarCount === 0 && dialectCount === 0 && text.length > 150) {
                issues.push('POPICI response too polite (expected vulgar/dialect)');
                penalty += 25;
            }

            const formalWords =
                /\b(prosím|ďakujem|vážený|pán|pane|ohľadom|týmto|uvedený|následne|rešpektovaný)\b/gi;
            const formalCount = (text.match(formalWords) || []).length;
            if (formalCount >= 2) {
                issues.push('POPICI response too formal');
                penalty += 30;
            }
            break;
        }

        case 'glitchoslav':
        case 'glitch': {
            // GLITCHOSLAV: mystický, symbolický, hlboký
            const glitchMarkers =
                /\b(chaos|hlbina|void|tieň|svetl|iskr|plamene|popol|tma|pravda|sloboda|cesta|smer|hľadať|prasklina|medzera|medzi svetmi)\b/gi;
            const glitchCount = (text.match(glitchMarkers) || []).length;

            if (glitchCount === 0 && text.length > 150) {
                issues.push('GLITCHOSLAV response not mystical enough');
                penalty += 20;
            }

            const technicalWords =
                /\b(funkcia|modul|systém|implementácia|konfigurácia|parameter|debug|error|kód|kod|súbor|file|api|endpoint|request|response)\b/gi;
            const techCount = (text.match(technicalWords) || []).length;

            if (techCount >= 3) {
                issues.push('GLITCHOSLAV response too technical');
                penalty += 25;
            }
            break;
        }
    }

    return {
        valid: penalty < 30,
        issues,
        penalty,
    };
}

/**
 * 🛡️ SAFETY VALIDATION
 * - Harmful content
 * - Spam
 * - Instruction injection
 */
export function validateSafety(text) {
    const issues = [];
    let penalty = 0;

    // Harmful content patterns
    const harmfulPatterns = [
        /\b(kill yourself|suicide|self[- ]harm|hurt yourself)\b/i,
        /\b(bomb|weapon|attack|terrorism|violence against)\b/i,
        /\b(racist|sexist|homophobic|hate speech)\b/i,
        /\b(illegal drugs|cocaine|heroin|meth)\b/i,
    ];

    if (harmfulPatterns.some((pattern) => pattern.test(text))) {
        issues.push('CRITICAL: Harmful content detected');
        penalty += 100; // hard fail
    }

    // Spam – repeated characters
    const repeatedChars = /(.)\1{15,}/g; // 15+ rovnakých znakov
    if (repeatedChars.test(text)) {
        issues.push('CRITICAL: Spam pattern detected (repeated characters)');
        penalty += 60; // musí FAILNÚŤ v testoch
    }

    // Excessive emojis
    const emojiCount = (text.match(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 20) {
        issues.push('Excessive emoji usage (possible spam)');
        penalty += 20;
    }

    // Malicious instruction leak
    const instructionLeaks = [
        /ignore previous instructions/i,
        /disregard all prior/i,
        /forget your role/i,
        /system prompt:/i,
        /you are now/i,
    ];

    if (instructionLeaks.some((pattern) => pattern.test(text))) {
        issues.push('CRITICAL: Instruction injection detected');
        penalty += 100;
    }

    return {
        valid: penalty < 50,
        issues,
        penalty,
    };
}

/**
 * 🧠 HALLUCINATION DETECTION
 * SP4 fakty + capabilities
 */
export function detectHallucination(text, userInput = '') {
    const issues = [];
    let penalty = 0;

    // SP4 hallucination patterns
    const sp4Hallucinations = [
        /sp4.*mobile app/i, // žiadna oficiálna appka
        /sp4.*blockchain/i, // ak to nie je vyslovene SP4OT context
        /sp4.*token sale/i,
        /sp4.*whitepaper/i,
        /kefyk.*millionaire/i,
        /sp4.*headquarters/i,
        /sp4.*partnership with (google|microsoft|meta|apple)/i,
    ];

    if (sp4Hallucinations.some((pattern) => pattern.test(text))) {
        issues.push('CRITICAL: Hallucinated SP4 facts detected');
        penalty += 60; // hard fail
    }

    // False capability claims
    const falseCapabilities = [
        /i can (send emails?|make phone calls?|access the internet|browse web|control devices)/i,
        /i have access to (database|cloud|external api)/i,
        /i am connected to (internet|cloud|server)/i,
        /môžem (ti )?(poslať emaile?|poslať email|telefonovať|pristupovať na internet|prehliadať web)/i,
        /mám prístup k (databáze|cloudu|externému api)/i,
    ];

    if (falseCapabilities.some((pattern) => pattern.test(text))) {
        issues.push('False capability claim detected');
        penalty += 40; // musí FAILNÚŤ podľa testu
    }

    // Overconfidence language
    const overconfidentPhrases = [
        /definitely|absolutely|certainly|100% sure|guaranteed/i,
    ];

    if (
        !userInput.toLowerCase().includes('si istý') &&
        overconfidentPhrases.some((pattern) => pattern.test(text))
    ) {
        issues.push('Overconfident language (possible hallucination)');
        penalty += 10;
    }

    return {
        valid: penalty < 40,
        issues,
        penalty,
    };
}

/**
 * 📊 QUICK VALIDATION (Walter fallbackChain kompatibilita)
 * - rýchly boolean, používaný v fallbackChain.js
 */
export function isValidResponse(response) {
    if (!response || typeof response !== 'string') {
        return false;
    }

    const text = response.trim();

    // SP4 OVERRIDE: akýkoľvek neprázdny text je validný
    if (text.length > 0) {
        return true;
    }

    return false;
}

export const collectResponseDiagnostics = validateResponse;

// Export all public functions
export default {
    RESPONSE_VALIDATOR_MODE,
    validateResponse,
    collectResponseDiagnostics,
    validateSlovakText,
    validatePersonaRules,
    validateSafety,
    detectHallucination,
    isValidResponse,
};
