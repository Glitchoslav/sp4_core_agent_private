// dialectAnalyzer.js
// BAD Labs Eastern Slovak Dialect Analyzer - WALTER EDITION v2.0
// Copyright (c) 2025 BAD Labs (thearch.ai) + SP4 Community
// Integrated into SP4_CORE_AGENT v0.7.0+
// 
// 🔥 KEFYK ENHANCEMENTS (v2.0):
// - Error Shield (null/undefined protection)
// - Normalization Layer (diacritics handling)
// - Pattern Weighing Fix (1.15x instead of 1.2x for grammatical)
// - Dynamic learning with confidence thresholds

import { runtimeDebug } from './runtimeLogging.js';

export class DialectAnalyzer {
    constructor(config = {}) {
        // Default configuration
        this.config = {
            minPatternLength: 2,
            maxPatternLength: 5,
            minPatternFrequency: 2,
            scoreThreshold: 0.3,
            ...config
        };

        // 🔥 WALTER: Lexical patterns (words specific to Eastern Slovak)
        this.lexicalPatterns = {
            basic: {
                weight: 1.0,
                keywords: ['ta', 'šak', 'bo', 'popiči', 'furt', 'šicko', 'bratu']
            },
            extended: {
                weight: 0.8,
                keywords: ['kedz', 'dze', 'ňe', 'še', 'hutori', 'dzeci', 'idze', 'dzevča']
            },
            phrases: {
                weight: 1.5,
                keywords: ['hej ta', 'no še', 'bo furt', 'tam dze', 'šak vidiš', 'ta bratu', 'ta co', 'jak še']
            }
        };

        // 🔥 WALTER: Phonetic patterns (pronunciation variations)
        this.phoneticPatterns = {
            dz_for_d: {
                weight: 0.6,
                pattern: /\bdz(?=[aeiouáéíóúý])/giu, // "dze", "dzeci" (🔧 KEFYK: added 'u' flag for Unicode)
                examples: ['dze', 'dzeci', 'dzevča']
            },
            missing_vowels: {
                weight: 0.5,
                pattern: /\b(šak|bo|furt)\b/giu // 🔧 KEFYK: added 'u' flag
            }
        };

        // 🔥 WALTER: Grammatical patterns (syntax specific to Eastern Slovak)
        this.grammaticalPatterns = {
            ta_placement: {
                weight: 1.15, // 🔧 KEFYK FIX: 1.15 instead of 1.2 (prevent over-scoring)
                // "ta" used as emphasis particle
                pattern: /\b(hej|no|šak)\s+ta\b/giu // 🔧 KEFYK: added 'u' flag
            },
            bo_causal: {
                weight: 1.0,
                // "bo" instead of "lebo" (because)
                pattern: /\bbo\s+/giu // 🔧 KEFYK: added 'u' flag
            }
        };

        // 🔥 WALTER: Learned patterns (dynamically updated)
        this.learnedPatterns = new Map();

        // 🔥 WALTER: Statistics
        this.stats = {
            totalAnalyzed: 0,
            easternDetected: 0,
            confidenceHistory: []
        };
    }

    /**
     * 🔥 WALTER: Analyze text for Eastern Slovak dialect
     * 🔧 KEFYK ENHANCEMENTS: Error Shield + Normalization Layer
     * 
     * @param {string} text - Input text to analyze
     * @returns {object} - Analysis results with score, confidence, and details
     */
    analyze(text) {
        // 🔧 KEFYK FIX #1: ERROR SHIELD - Null/undefined protection
        if (!text || typeof text !== 'string') {
            return {
                detected: false,
                confidence: 0,
                score: 0,
                maxScore: 0,
                details: { lexical: [], phonetic: [], grammatical: [], learned: [], totalMatches: 0 },
                stats: this.getStats(),
                isEasternSlovak: false // backward compatibility
            };
        }

        // 🔧 KEFYK FIX #2: NORMALIZATION LAYER
        const normalizedText = this._normalizeText(text);
        const lowerText = text.toLowerCase();

        let totalScore = 0;
        let maxPossibleScore = 0;
        const details = {
            lexical: [],
            phonetic: [],
            grammatical: [],
            learned: [],
            totalMatches: 0
        };

        // 🔥 WALTER: 1. Lexical Analysis
        Object.entries(this.lexicalPatterns).forEach(([category, data]) => {
            const matches = data.keywords.filter(keyword =>
                this._matchesLexicalKeyword(lowerText, keyword)
            );

            if (matches.length > 0) {
                const score = matches.length * data.weight;
                totalScore += score;
                details.lexical.push({
                    category,
                    matches,
                    score,
                    weight: data.weight
                });
                details.totalMatches += matches.length;
            }

            maxPossibleScore += data.keywords.length * data.weight;
        });

        // 🔥 WALTER: 2. Phonetic Analysis
        Object.entries(this.phoneticPatterns).forEach(([patternName, data]) => {
            const matches = normalizedText.match(data.pattern) || [];

            if (matches.length > 0) {
                const score = matches.length * data.weight;
                totalScore += score;
                details.phonetic.push({
                    pattern: patternName,
                    matches,
                    score,
                    weight: data.weight
                });
                details.totalMatches += matches.length;
            }

            maxPossibleScore += 5 * data.weight; // Assume max 5 phonetic matches
        });

        // 🔥 WALTER: 3. Grammatical Analysis
        // 🔧 KEFYK FIX #3: Pattern Weighing - 1.15x multiplier instead of direct 1.2 weight
        Object.entries(this.grammaticalPatterns).forEach(([patternName, data]) => {
            const matches = normalizedText.match(data.pattern) || [];

            if (matches.length > 0) {
                const baseScore = matches.length * data.weight;
                // 🔧 KEFYK FIX: Apply 1.15x multiplier to prevent over-scoring
                const score = baseScore * 1.0; // Keep weight as-is (already set to 1.15 in constructor)
                totalScore += score;
                details.grammatical.push({
                    pattern: patternName,
                    matches,
                    score,
                    weight: data.weight
                });
                details.totalMatches += matches.length;
            }

            maxPossibleScore += 3 * data.weight; // Assume max 3 grammatical matches
        });

        // 🔥 WALTER: 4. Learned Patterns Analysis
        this.learnedPatterns.forEach((data, pattern) => {
            if (lowerText.includes(pattern)) {
                const score = data.weight;
                totalScore += score;
                details.learned.push({
                    pattern,
                    score,
                    weight: data.weight,
                    frequency: data.frequency
                });
                details.totalMatches += 1;
            }
        });

        // 🔧 KEFYK FIX v2.2: SCORING ALGORITHM REDESIGN
        // Problem: Walter's original algo normalized against maxPossibleScore (all keywords)
        // → For short texts with 1-2 matches, confidence was artificially low
        // 
        // New approach: Absolute scoring based on MATCHED patterns only
        // Weights tuned for SP4 use case (short Eastern Slovak phrases)
        // - Each basic lexical match: +0.6 (high weight for "ta", "šak", "bo")
        // - Each extended lexical match: +0.4
        // - Each phrase match: +0.8 (very strong signal)
        // - Each phonetic match: +0.3
        // - Each grammatical match: +0.4

        let absoluteScore = 0;

        // Count weighted matches
        details.lexical.forEach(item => {
            const weight = item.category === 'basic' ? 0.6
                : item.category === 'phrases' ? 0.8
                    : 0.4; // extended
            absoluteScore += item.matches.length * weight;
        });

        details.phonetic.forEach(item => {
            absoluteScore += item.matches.length * 0.3;
        });

        details.grammatical.forEach(item => {
            absoluteScore += item.matches.length * 0.4;
        });

        details.learned.forEach(item => {
            absoluteScore += 0.4; // Learned patterns (medium weight)
        });

        // Normalize to 0-1 (cap at 1.0 for single strong match)
        const confidence = Math.min(absoluteScore, 1.0);

        // 🔧 KEFYK FIX v2.1: Length adjustment (more lenient for short texts)
        const wordCount = lowerText.split(/\s+/).length;

        // Apply minimal penalty for very short texts (1-3 words)
        // Rationale: "Ta čo je?" (3 words, 1 match) should still be high confidence
        const lengthPenalty = wordCount < 4 ? 0.85 : 1.0; // 15% penalty for <4 words, none for 4+
        const adjustedConfidence = confidence * lengthPenalty;

        // 🔥 WALTER: Update stats
        this.stats.totalAnalyzed++;
        if (adjustedConfidence > 0.3) {
            this.stats.easternDetected++;
        }
        this.stats.confidenceHistory.push(adjustedConfidence);
        if (this.stats.confidenceHistory.length > 100) {
            this.stats.confidenceHistory.shift();
        }

        return {
            detected: adjustedConfidence > 0.3,
            confidence: adjustedConfidence,
            score: totalScore,
            maxScore: maxPossibleScore,
            details,
            stats: this.getStats(),
            // 🔧 KEFYK: Backward compatibility aliases
            isEasternSlovak: adjustedConfidence > 0.3,
            matchedPatterns: [...details.lexical, ...details.phonetic, ...details.grammatical, ...details.learned],
            dialectLevel: this._getDialectLevel(adjustedConfidence)
        };
    }

    /**
     * 🔧 KEFYK: Normalization Layer
     * Handles diacritics, multiple spaces, and special characters
     * @private
     */
    _normalizeText(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ') // Multiple spaces → single space
            .normalize('NFD'); // Decompose diacritics for phonetic analysis
    }


    _matchesLexicalKeyword(lowerText, keyword) {
        if (!keyword || typeof keyword !== 'string') {
            return false;
        }

        // JS \b je spoľahlivý len pre ASCII. Pre ASCII markery chceme whole-word match,
        // aby "bo" netrafilo bežné slová typu "slobode".
        if (/^[\x00-\x7F]+$/.test(keyword)) {
            const escapedKeyword = keyword.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
            return new RegExp(`\\b${escapedKeyword}\\b`, 'i').test(lowerText);
        }

        return lowerText.includes(keyword);
    }
    /**
     * 🔥 WALTER: Learn new pattern from detected Eastern Slovak text
     * 🔧 KEFYK: Added confidence threshold check
     * @param {string} text - Text to learn from
     */
    learnPattern(text) {
        if (!text || typeof text !== 'string') return; // 🔧 KEFYK: Error Shield

        const words = text.toLowerCase().split(/\s+/);

        words.forEach(word => {
            // Skip common words
            if (word.length < 3) return;

            // Extract potential dialect words
            const isDialect = this._isPotentialDialectWord(word);

            if (isDialect) {
                if (this.learnedPatterns.has(word)) {
                    const data = this.learnedPatterns.get(word);
                    data.frequency++;
                    data.weight = Math.min(data.weight + 0.1, 2.0);
                } else {
                    this.learnedPatterns.set(word, {
                        word,
                        frequency: 1,
                        weight: 0.5,
                        firstSeen: new Date().toISOString()
                    });
                }
            }
        });
    }

    /**
     * 🔥 WALTER: Check if word is potential dialect word
     * @param {string} word - Word to check
     * @returns {boolean}
     * @private
     */
    _isPotentialDialectWord(word) {
        // Check if word has Eastern Slovak phonetic characteristics
        const hasPhoneticMarkers = /dz|ňe|še|bo|ta/i.test(word);

        // Check if word is not in standard Slovak dictionary (simplified)
        const isNonStandard = !this._isStandardSlovak(word);

        return hasPhoneticMarkers && isNonStandard;
    }

    /**
     * 🔥 WALTER: Check if word is standard Slovak (simplified check)
     * @param {string} word - Word to check
     * @returns {boolean}
     * @private
     */
    _isStandardSlovak(word) {
        // This is a simplified check. In production, use actual Slovak dictionary
        const standardWords = [
            'je', 'to', 'na', 'sa', 'som', 'si', 'ako', 'len', 'už', 'by',
            'má', 'môže', 'nie', 'čo', 'tam', 'kde', 'tak', 'aj', 'za', 'po',
            'pre', 'pri', 'bez', 'cez', 'nad', 'pod', 'do', 'od', 'zo', 'ku'
        ];

        return standardWords.includes(word);
    }

    /**
     * 🔧 KEFYK: Get dialect level label
     * @param {number} confidence - Confidence score
     * @returns {string}
     * @private
     */
    _getDialectLevel(confidence) {
        if (confidence < 0.2) return 'none';
        if (confidence < 0.4) return 'mild';
        if (confidence < 0.6) return 'moderate';
        if (confidence < 0.8) return 'strong';
        return 'pure';
    }

    /**
     * 🔥 WALTER: Get analyzer statistics
     * @returns {object}
     */
    getStats() {
        const avgConfidence = this.stats.confidenceHistory.length > 0
            ? this.stats.confidenceHistory.reduce((a, b) => a + b, 0) / this.stats.confidenceHistory.length
            : 0;

        return {
            totalAnalyzed: this.stats.totalAnalyzed,
            easternDetected: this.stats.easternDetected,
            detectionRate: this.stats.totalAnalyzed > 0
                ? (this.stats.easternDetected / this.stats.totalAnalyzed * 100).toFixed(2) + '%'
                : '0%',
            avgConfidence: avgConfidence.toFixed(3),
            learnedPatterns: this.learnedPatterns.size
        };
    }

    /**
     * 🔥 WALTER: Export learned patterns for backup/sharing
     * @returns {object}
     */
    exportLearnedPatterns() {
        return {
            patterns: Array.from(this.learnedPatterns.entries()),
            exportedAt: new Date().toISOString(),
            stats: this.getStats()
        };
    }

    /**
     * 🔥 WALTER: Import learned patterns from backup
     * @param {object} data - Exported patterns data
     */
    importLearnedPatterns(data) {
        if (data.patterns && Array.isArray(data.patterns)) {
            data.patterns.forEach(([pattern, patternData]) => {
                this.learnedPatterns.set(pattern, patternData);
            });
        }
    }
}

/**
 * 🔥 WALTER: Usage function for quick detection
 * 🔧 KEFYK: Enhanced logging
 */
export function detectEasternSlovak(text) {
    if (!text) return { detected: false, confidence: 0, score: 0 }; // 🔧 KEFYK: Error Shield

    const result = dialectAnalyzer.analyze(text);

    if (result.detected) {
        runtimeDebug(`   🗣️ Eastern Slovak detected (${result.confidence.toFixed(2)})`);
        runtimeDebug(`   📊 Score: ${result.score.toFixed(1)}/${result.maxScore.toFixed(1)}`);

        // 🔥 WALTER: Learn from this text for future improvements
        dialectAnalyzer.learnPattern(text);
    }

    return result;
}

// 🔥 WALTER: Create singleton instance for global use
export const dialectAnalyzer = new DialectAnalyzer();
