// ┌─────────────────────────────────────────────┐
// │  SP4 OS v1.4.2 - GROUNDING VALIDATOR       │
// │  Detects hallucinations in grounded output │
// │  Priority 1: Anti-hallucination guard      │
// └─────────────────────────────────────────────┘

/**
 * Forbidden patterns for SP4 factual topics
 * These indicate LLM ignored grounding knowledge and hallucinated
 */
const HALLUCINATION_PATTERNS = {
    memory: {
        patterns: [
            /\b(L[1234]|cache|AMD|Ryzen|Intel|procesor|CPU|processor)\b/gi,
            /\b(RAM|hardware|chip|silicon)\b/gi
        ],
        description: 'CPU/hardware terms (memory ≠ computer memory)'
    },
    policy: {
        patterns: [
            /\b(government|legislation|regulation|law|legal)\b/gi
        ],
        description: 'Legal/government terms (policy ≠ government policy)'
    },
    integration: {
        patterns: [
            /\b(calculus|mathematics|integral|derivative)\b/gi
        ],
        description: 'Math terms (integration ≠ mathematical integration)'
    },
    architecture: {
        patterns: [
            /\b(building|construction|blueprint|floor plan)\b/gi
        ],
        description: 'Physical architecture terms (architecture ≠ building design)'
    }
};

/**
 * Detect if response contains hallucinated content
 * (i.e., ignored grounding knowledge)
 * 
 * @param {string} response - LLM response text
 * @param {string} topic - Detected topic (memory, policy, integration, architecture)
 * @returns {object} { violated: boolean, violations: string[], reason: string }
 */
export function detectGroundingViolation(response, topic) {
    if (!response || !topic) {
        return { violated: false, violations: [], reason: null };
    }

    const topicPatterns = HALLUCINATION_PATTERNS[topic];
    if (!topicPatterns) {
        return { violated: false, violations: [], reason: null };
    }

    const violations = [];

    for (const pattern of topicPatterns.patterns) {
        const matches = response.match(pattern);
        if (matches && matches.length > 0) {
            violations.push(...matches.map(m => m.toLowerCase()));
        }
    }

    if (violations.length > 0) {
        return {
            violated: true,
            violations: [...new Set(violations)], // Unique violations
            reason: `Hallucination detected: ${topicPatterns.description}`,
            topic
        };
    }

    return { violated: false, violations: [], reason: null };
}

/**
 * Generate fallback response from grounding knowledge
 * Used when LLM hallucinates despite grounding
 * 
 * @param {string} topic - SP4 topic (memory, policy, integration, architecture)
 * @returns {string} Direct factual response
 */
export function generateGroundingFallback(topic) {
    const fallbacks = {
        memory: `SP4 memory má 3 hlavné vrstvy:

1. **Raw Log** - Surové záznamy všetkých interakcií (user ↔ agent)
2. **Compressed Summaries** - Zhustené zhrnutia (daily, weekly, monthly)
3. **Seeds** - Kľúčové momenty a insights (extrahované z log)

Všetko beží lokálne v \`data/memory.json\`. Žiadne cloudové úložisko.`,

        policy: `SP4 policy má 3 hlavné režimy:

1. **local-first** (default) - Preferuje lokálne modely (Ollama)
2. **autonomous-cloud** - Povoluje cloud (Groq, Google) s kontrolou
3. **force-local** - Tvrdý zákaz cloudu (test mode, privacy mode)

Policy je intent (čo chceš), execution je realita (čo sa stalo). Metadata contract ich oddeľuje.`,

        integration: `SP4 integration layer spája všetky komponenty:

- **integration.js** - Main orchestrator (processMessage)
- **autonomousController.js** - Brain selection (local vs cloud)
- **multiVoice.js** - Prompt builder (persona-specific)
- **memory.js** - Persistent storage layer
- **llmLocal.js** - Ollama communication

Všetky vrstvy komunikujú cez čisté API (pure functions, async/await).`,

        architecture: `SP4 architektúra má 5 vrstiev:

1. **Data Layer** - JSON files (\`data/\`)
2. **Core Engine** - memory, actions, scheduler
3. **Orchestration** - multi-voice, council, routing
4. **Interface** - CLI, commands, server
5. **Protection** - validators, tests, guards

Offline-first design, modulárne, bez externých závislostí.`
    };

    return fallbacks[topic] || `SP4 ${topic}: Faktické informácie z dokumentácie.`;
}

/**
 * Validate grounded response and apply fallback if needed
 * 
 * @param {string} response - LLM response
 * @param {string} topic - Detected SP4 topic
 * @param {boolean} testMode - If true, use deterministic fallback
 * @returns {object} { text: string, violated: boolean, corrected: boolean, metadata: object }
 */
export function validateGroundedResponse(response, topic, testMode = false) {
    const violation = detectGroundingViolation(response, topic);

    if (!violation.violated) {
        return {
            text: response,
            violated: false,
            corrected: false,
            metadata: { groundingCompliance: 'pass' }
        };
    }

    // Hallucination detected - apply fallback
    const fallbackText = generateGroundingFallback(topic);

    return {
        text: fallbackText,
        violated: true,
        corrected: true,
        metadata: {
            groundingCompliance: 'fail',
            violations: violation.violations,
            reason: violation.reason,
            fallbackApplied: true,
            originalLength: response.length,
            fallbackLength: fallbackText.length
        }
    };
}
