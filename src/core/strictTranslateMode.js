// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: strictTranslateMode        │
// │  Layer: Core / Language Control            │
// │  Role: Force English → Slovak translation  │
// │  Mission: LANGUAGE_ENFORCER_v2             │
// │  API: strictTranslate(text, context)       │
// └─────────────────────────────────────────────┘

/**
 * 🔥 STRICT TRANSLATE MODE v2.0
 * 
 * Trigger: englishRatio >= 25% OR detectedEnglish=true
 * Action:
 *   - Call local model with translation-only prompt
 *   - temp=0.15 (deterministic), same max_tokens, timeout unchanged
 *   - Re-check english ratio after translation
 *   - If still >10% → use deterministic SK fallback templates
 * 
 * @module strictTranslateMode
 */

import { sp4LlmCall } from '../llm/llmRouter.js';
import { detectEnglish } from './languageUtils.js';
import { runtimeLog } from './runtimeLogging.js';

const TRANSLATOR_MODEL = 'gemma3:4b';
const STRICT_TEMP = 0.15; // Very deterministic
const EN_THRESHOLD_TRIGGER = 0.25; // 25% english triggers strict mode
const EN_THRESHOLD_RECHECK = 0.10; // 10% english after translation = still bad

/**
 * Strict translate: English → Slovak with zero tolerance
 * 
 * @param {string} text - English or mixed text
 * @param {Object} context - Translation context
 * @param {string} context.persona - Persona (core, glitchoslav, popici)
 * @param {string} context.userMessage - Original user query
 * @param {number} context.maxTokens - Max tokens (default: same as original)
 * @returns {Promise<Object>} { translatedText, success, method, stats }
 */
export async function strictTranslate(text, context = {}) {
    const { persona = 'core', userMessage = '', maxTokens = 512 } = context;

    runtimeLog('   🔥 STRICT TRANSLATE MODE activated');
    runtimeLog(`   📊 Original text length: ${text.length} chars`);

    // Calculate english ratio
    const enMatches = (text.match(/\b(the|and|of|to|in|is|that|with|for|as|by|this|it|from|are|be|on|was|at|have|has|or|an|if|all|but|can|not|which|will|would|when|there|their|what|so|up|out|who|get|my|me|they|we|more|your|do|about|than|into|after|because|through)\b/gi) || []).length;
    const totalWords = text.split(/\s+/).filter(Boolean).length;
    const enRatio = totalWords > 0 ? enMatches / totalWords : 0;

    runtimeLog(`   📊 English ratio: ${(enRatio * 100).toFixed(1)}%`);

    if (enRatio < EN_THRESHOLD_TRIGGER) {
        // Not enough English - skip translation
        return {
            translatedText: text,
            success: true,
            method: 'skip',
            stats: { enRatio, skipped: true }
        };
    }

    // Build strict translation prompt
    const systemPrompt = buildStrictTranslationPrompt(persona);

    runtimeLog(`   🎯 Calling LLM for translation (temp=${STRICT_TEMP})...`);

    try {
        const result = await sp4LlmCall({
            prompt: text,
            system: systemPrompt,
            model: TRANSLATOR_MODEL,
            temperature: STRICT_TEMP,
            num_predict: maxTokens,
            preference: 'local-only', // Never use cloud for translation
            testMode: false
        });

        if (!result.ok) {
            console.error(`   ❌ Translation failed: ${result.error}`);
            return {
                translatedText: generateDeterministicFallback(persona, userMessage),
                success: false,
                method: 'fallback',
                stats: { enRatio, error: result.error }
            };
        }

        const translated = result.text.trim();

        // Re-check english ratio
        const enMatchesAfter = (translated.match(/\b(the|and|of|to|in|is|that|with|for|as|by|this|it|from|are|be|on|was|at|have|has|or|an|if|all|but|can|not|which|will|would|when|there|their|what|so|up|out|who|get|my|me|they|we|more|your|do|about|than|into|after|because|through)\b/gi) || []).length;
        const totalWordsAfter = translated.split(/\s+/).filter(Boolean).length;
        const enRatioAfter = totalWordsAfter > 0 ? enMatchesAfter / totalWordsAfter : 0;

        runtimeLog(`   📊 English ratio after translation: ${(enRatioAfter * 100).toFixed(1)}%`);

        if (enRatioAfter > EN_THRESHOLD_RECHECK) {
            // Translation failed - still too much English
            console.warn(`   ⚠️ Translation quality bad (${(enRatioAfter * 100).toFixed(1)}% EN), preserving original content`);
            return {
                translatedText: text,
                success: false,
                method: 'preserve_original_quality',
                stats: { enRatio, enRatioAfter, failedTranslation: true, preservedOriginal: true }
            };
        }

        runtimeLog(`   ✅ Translation successful (${(enRatioAfter * 100).toFixed(1)}% EN remaining)`);

        return {
            translatedText: translated,
            success: true,
            method: 'strict_translate',
            stats: { enRatio, enRatioAfter }
        };

    } catch (error) {
        console.error(`   ❌ Translation error: ${error.message}`);
        return {
            translatedText: generateDeterministicFallback(persona, userMessage),
            success: false,
            method: 'fallback_error',
            stats: { enRatio, error: error.message }
        };
    }
}

/**
 * Build strict translation system prompt
 * 
 * @private
 * @param {string} persona - Persona mode
 * @returns {string} System prompt
 */
function buildStrictTranslationPrompt(persona) {
    const basePrompt = `Prelož tento text do prirodzenej slovenčiny.

PRAVIDLÁ:
1. Zachovaj význam presne
2. Nepreklád aj technické termíny (SP4, API, JSON, LLM, HTTP)
3. Nepridávaj fakty ani vysvetlenia
4. Nepíš meta komentáre ("Tu je preklad:", "Preložené:")
5. Vráť len čistú slovenskú odpoveď

ZAKÁZANÉ ANGLICKÉ SLOVÁ:
- the, and, of, to, in, is, that, with, for, as, by, this, it, from
- are, be, on, was, at, have, has, or, an, if, all, but, can, not
- which, will, would, when, there, their, what, so, up, out
- (okrem tech termínov ako SP4, API, atď.)

`;

    // Persona-specific tone instructions
    const toneInstructions = {
        core: 'Tón: technický, jasný, stručný.',
        glitchoslav: 'Tón: filozofický, metaforický, poetický.',
        popici: 'Tón: priamy, východniarsky slang (bratu, ta, bo, šak).',
        validator: 'Tón: formálny, presný, technický.'
    };

    return basePrompt + (toneInstructions[persona] || toneInstructions.core);
}

/**
 * Generate deterministic Slovak fallback
 * 
 * Used when translation fails completely.
 * Short, safe responses that acknowledge the issue.
 * 
 * @private
 * @param {string} persona - Persona mode
 * @param {string} userMessage - Original user query
 * @returns {string} Fallback Slovak text
 */
function generateDeterministicFallback(persona, userMessage) {
    const fallbacks = {
        core: 'Odpoveď bola technicky správna, ale jazyk zlyhal. Chceš preformulovať otázku?',
        glitchoslav: 'Slová sa stratili medzi jazykmi. Opýtaj sa znovu, hľadajúci.',
        popici: 'Model mi vrátil anglický bordel. Skús znova, bratu.',
        validator: 'VALIDATION FAILED: Output language EN. Retry recommended.'
    };

    return fallbacks[persona] || fallbacks.core;
}

/**
 * Check if strict translate mode should be triggered
 * 
 * @param {string} text - Text to check
 * @returns {boolean} True if strict translate needed
 */
export function shouldTriggerStrictTranslate(text) {
    const enMatches = (text.match(/\b(the|and|of|to|in|is|that|with|for|as|by|this|it|from|are|be|on|was|at|have|has|or|an|if|all|but|can|not|which|will|would|when|there|their|what|so|up|out|who|get|my|me|they|we|more|your|do|about|than|into|after|because|through)\b/gi) || []).length;
    const totalWords = text.split(/\s+/).filter(Boolean).length;
    const enRatio = totalWords > 0 ? enMatches / totalWords : 0;
    const englishSignal = detectEnglish(text);
    const detectedEnglish = typeof englishSignal === 'boolean'
        ? englishSignal
        : (englishSignal?.ratio || 0) >= EN_THRESHOLD_TRIGGER;

    return enRatio >= EN_THRESHOLD_TRIGGER || detectedEnglish;
}

export default {
    strictTranslate,
    shouldTriggerStrictTranslate
};
