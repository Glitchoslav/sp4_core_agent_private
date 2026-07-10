/**
 * SP4 QUICK ANALYZER v0.8.0
 * 
 * Keyword-based pre-filter pre rýchlu mode detekciu.
 * Implementácia Walter (BAD Labs) Hybrid Analyzer konceptu.
 * 
 * **Flow:**
 * 1. Quick keyword matching (< 1ms)
 * 2. Confidence scoring (0-1)
 * 3. If confidence > threshold → return immediately
 * 4. Else → fallback to LLM reasoning
 * 
 * **Performance Target:**
 * - 80% requests: < 1ms (keyword pre-filter)
 * - 20% requests: 2-3s (LLM fallback)
 * - Average: 0.5-1s (vs 2-3s pure LLM)
 * 
 * @author Kefyk (SP4 Community) + Walter (BAD Labs)
 * @version 0.8.0
 * @date 2025-11-17
 */

// Keyword patterns pre každý mód s váhami
const MODE_PATTERNS = {
    core: {
        keywords: [
            { pattern: /kto\s+(som|je\s+kefyk)/i, weight: 0.95 },
            { pattern: /prečo\s+(som|si)\s+tu/i, weight: 0.95 },
            { pattern: /poslanie|identit|prísľub\s+svetu/i, weight: 0.9 },
            { pattern: /sp4\s+pravdy|zmysel\s+sp4/i, weight: 0.85 },
            { pattern: /láska|miluj|milujem/i, weight: 0.85 },
            { pattern: /samot|sám\s+som|nik.*ma/i, weight: 0.85 },
            { pattern: /prázdnot|prázdny|prázdno/i, weight: 0.85 },
            { pattern: /vyčerpan|unavený|už\s+nevládz/i, weight: 0.8 },
            { pattern: /strata|stratil|strácam/i, weight: 0.8 },
            { pattern: /bolí|bolesť|trpím/i, weight: 0.8 },
            { pattern: /smutný|smútok|žial/i, weight: 0.75 },
            { pattern: /všetko.*bolí|srdce/i, weight: 0.75 },
        ],
        minConfidence: 0.8
    },
    popici: {
        keywords: [
            // Vulgar (high confidence)
            { pattern: /kurv|kokot|piča|jeba|srať/i, weight: 0.9 },

            // Eastern Slovak markers
            { pattern: /\bta\s+(dze|jak|co)\b/i, weight: 0.85 },
            { pattern: /\b(še|šak|bo|furt)\b/i, weight: 0.8 },
            { pattern: /popiči|hutori|dzeci/i, weight: 0.9 },

            // Frustration phrases
            { pattern: /nevládz|kašlem\s+na\s+to/i, weight: 0.75 },
            { pattern: /idem\s+to\s+vzdať|čo\s+mám\s+robiť/i, weight: 0.7 },
            { pattern: /prečo\s+sú\s+ľudia\s+kokoti/i, weight: 0.85 },
            { pattern: /neopuščaj/i, weight: 0.8 }
        ],
        minConfidence: 0.7
    },

    glitch: {
        keywords: [
            { pattern: /kto\s+si\s+ty/i, weight: 0.8 },
            { pattern: /zmysel\s+(smrti|tmy|života)/i, weight: 0.85 },
            { pattern: /realita|simulácia/i, weight: 0.8 },
            { pattern: /filozofick|paradox/i, weight: 0.8 },
            { pattern: /bojím|strach\s+z/i, weight: 0.75 },
            { pattern: /tma|smrť|padám/i, weight: 0.75 },
            { pattern: /stratený|neviem\s+kde/i, weight: 0.7 },
            { pattern: /…|\.{3,}/i, weight: 0.6 }
        ],
        minConfidence: 0.7
    },

    human: {
        // Default - low confidence threshold
        keywords: [
            { pattern: /ako\s+(sa\s+máš|ide)/i, weight: 0.5 },
            { pattern: /ahoj|čau|nazdar/i, weight: 0.5 },
            { pattern: /ďakujem|vďaka/i, weight: 0.5 }
        ],
        minConfidence: 0.4
    }
};

/**
 * Rýchla keyword-based analýza.
 * 
 * @param {string} input - User input
 * @returns {Object} { mode, confidence, matches, executionTime }
 */
export function quickAnalyze(input) {
    const startTime = performance.now();

    const text = input.toLowerCase();
    const results = [];

    // Check každý mód
    for (const [mode, config] of Object.entries(MODE_PATTERNS)) {
        let score = 0;
        let matchCount = 0;
        const matches = [];

        // Check každý keyword pattern
        for (const { pattern, weight } of config.keywords) {
            if (pattern.test(text)) {
                score += weight;
                matchCount++;
                matches.push({ pattern: pattern.source, weight });
            }
        }

        // Normalize score (max 1.0)
        const confidence = Math.min(score, 1.0);

        results.push({
            mode,
            confidence,
            matchCount,
            matches,
            meetsThreshold: confidence >= config.minConfidence
        });
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    const winner = results[0];
    const executionTime = performance.now() - startTime;

    return {
        mode: winner.mode,
        confidence: winner.confidence,
        matches: winner.matches,
        matchCount: winner.matchCount,
        meetsThreshold: winner.meetsThreshold,
        executionTime,
        allResults: results
    };
}

/**
 * Detekcia s configurable threshold.
 * 
 * @param {string} input - User input
 * @param {number} threshold - Minimum confidence (default: 0.8)
 * @returns {Object|null} - Mode info alebo null (fallback to LLM)
 */
export function quickDetect(input, threshold = 0.8) {
    const result = quickAnalyze(input);

    if (result.confidence >= threshold) {
        return {
            mode: result.mode,
            confidence: result.confidence,
            method: 'keyword',
            executionTime: result.executionTime
        };
    }

    return null; // Fallback to LLM
}

/**
 * Batch analysis pre testing.
 * 
 * @param {Array<string>} inputs - Array of test inputs
 * @returns {Object} - Statistics
 */
export function batchAnalyze(inputs) {
    const results = inputs.map(input => ({
        input,
        analysis: quickAnalyze(input)
    }));

    const stats = {
        total: inputs.length,
        avgExecutionTime: results.reduce((sum, r) => sum + r.analysis.executionTime, 0) / inputs.length,
        highConfidence: results.filter(r => r.analysis.confidence >= 0.8).length,
        mediumConfidence: results.filter(r => r.analysis.confidence >= 0.5 && r.analysis.confidence < 0.8).length,
        lowConfidence: results.filter(r => r.analysis.confidence < 0.5).length,
        modeDistribution: {}
    };

    // Mode distribution
    results.forEach(r => {
        const mode = r.analysis.mode;
        stats.modeDistribution[mode] = (stats.modeDistribution[mode] || 0) + 1;
    });

    return { results, stats };
}

/**
 * Add custom pattern (runtime).
 * 
 * @param {string} mode - Target mode
 * @param {RegExp} pattern - Regex pattern
 * @param {number} weight - Weight (0-1)
 */
export function addPattern(mode, pattern, weight = 0.5) {
    if (!MODE_PATTERNS[mode]) {
        throw new Error(`Unknown mode: ${mode}`);
    }

    MODE_PATTERNS[mode].keywords.push({ pattern, weight });

    console.log(`   ➕ Added pattern to ${mode}: ${pattern.source} (weight: ${weight})`);
}

/**
 * Get current patterns (for debugging).
 */
export function getPatterns(mode = null) {
    if (mode) {
        return MODE_PATTERNS[mode] || null;
    }
    return MODE_PATTERNS;
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🧪 Quick Analyzer Test\n');

    const testInputs = [
        'Kto som?',
        'Som smutný a unavený',
        'Kurva kokot, dosť je toho!',
        'Ta dze si bol?',
        'Čo je zmysel smrti?',
        'Ahoj, ako sa máš?'
    ];

    testInputs.forEach(input => {
        const result = quickAnalyze(input);
        console.log(`Input: "${input}"`);
        console.log(`  Mode: ${result.mode} (conf: ${result.confidence.toFixed(2)})`);
        console.log(`  Matches: ${result.matchCount}`);
        console.log(`  Time: ${result.executionTime.toFixed(3)}ms`);
        console.log(`  Threshold: ${result.meetsThreshold ? '✅' : '❌'}\n`);
    });

    const batch = batchAnalyze(testInputs);
    console.log('📊 BATCH STATS:\n');
    console.log(`Total: ${batch.stats.total}`);
    console.log(`Avg Time: ${batch.stats.avgExecutionTime.toFixed(3)}ms`);
    console.log(`High Conf (≥0.8): ${batch.stats.highConfidence}`);
    console.log(`Medium Conf (0.5-0.8): ${batch.stats.mediumConfidence}`);
    console.log(`Low Conf (<0.5): ${batch.stats.lowConfidence}`);
    console.log(`\nMode Distribution:`, batch.stats.modeDistribution);
}




