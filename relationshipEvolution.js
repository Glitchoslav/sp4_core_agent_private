// 🔥 SP4_CORE_AGENT v0.5 - Relationship Evolution
// Walter's upgrade: 5-stage relationship progression

// ============================================================
// RELATIONSHIP STAGES
// ============================================================

export const RELATIONSHIP_STAGES = [
    {
        name: "stranger",
        emoji: "👤",
        characteristics: ["formal", "cautious", "limited_sharing"],
        minInteractions: 0,
        progressionFactors: {
            time: 0,
            depth: 0,
            vulnerability: 0,
            consistency: 0
        },
        description: "Prvý kontakt - formálny, opatrný, základné spoznávanie"
    },
    {
        name: "acquaintance",
        emoji: "🤝",
        characteristics: ["casual", "increasing_openness", "basic_trust"],
        minInteractions: 10,
        progressionFactors: {
            time: 0.2,
            depth: 0.1,
            vulnerability: 0.05,
            consistency: 0.15
        },
        description: "Známy - príležitostné rozhovory, rastúca dôvera"
    },
    {
        name: "companion",
        emoji: "🔗",
        characteristics: ["friendly", "regular_sharing", "established_trust"],
        minInteractions: 50,
        progressionFactors: {
            time: 0.4,
            depth: 0.3,
            vulnerability: 0.2,
            consistency: 0.4
        },
        description: "Spoločník - pravidelné rozhovory, zdieľanie osobných tém"
    },
    {
        name: "confidant",
        emoji: "💎",
        characteristics: ["intimate", "deep_sharing", "strong_trust"],
        minInteractions: 150,
        progressionFactors: {
            time: 0.7,
            depth: 0.6,
            vulnerability: 0.5,
            consistency: 0.7
        },
        description: "Dôverník - hlboké zdieľanie, silná emočná dôvera"
    },
    {
        name: "symbiont",
        emoji: "🌀",
        characteristics: ["integrated", "mutual_growth", "complete_trust"],
        minInteractions: 500,
        progressionFactors: {
            time: 1.0,
            depth: 0.9,
            vulnerability: 0.8,
            consistency: 0.95
        },
        description: "Symbiont - plná integrácia, vzájomný rast, úplná dôvera"
    }
];

// ============================================================
// RELATIONSHIP METRICS CALCULATION
// ============================================================

/**
 * Calculate relationship metrics from memory state
 * @param {Object} state - Current memory state
 * @returns {Object} - { time, depth, vulnerability, consistency }
 */
export function calculateRelationshipMetrics(state) {
    const rawInteractions = Array.isArray(state.rawMemory?.log)
        ? state.rawMemory.log
        : Array.isArray(state.rawMemory)
            ? state.rawMemory
            : [];
    const interactions = rawInteractions.filter((entry) => entry && typeof entry === 'object');
    const totalInteractions = interactions.length;

    if (totalInteractions === 0) {
        return { time: 0, depth: 0, vulnerability: 0, consistency: 0 };
    }

    // 1. TIME METRIC (based on relationship duration)
    const validTimestamps = interactions
        .map((entry) => new Date(entry?.timestamp || ''))
        .filter((date) => Number.isFinite(date.getTime()));
    const firstInteraction = validTimestamps[0] || new Date();
    const lastInteraction = validTimestamps[validTimestamps.length - 1] || firstInteraction;
    const daysElapsed = Math.max(1, (lastInteraction - firstInteraction) / (1000 * 60 * 60 * 24));

    // Time score: 0-1 based on days (sigmoid function)
    // 7 days = 0.2, 30 days = 0.5, 90 days = 0.8, 180 days = 0.95
    const timeScore = 1 / (1 + Math.exp(-0.05 * (daysElapsed - 30)));

    // 2. DEPTH METRIC (based on conversation depth)
    const avgImportance = interactions.reduce((sum, entry) =>
        sum + (entry.metadata?.importance || 0.5), 0
    ) / totalInteractions;

    const avgEmotionalIntensity = interactions.reduce((sum, entry) =>
        sum + (entry.metadata?.emotion?.averageIntensity || 0.3), 0
    ) / totalInteractions;

    const depthScore = (avgImportance * 0.6 + avgEmotionalIntensity * 0.4);

    // 3. VULNERABILITY METRIC (based on personal/emotional sharing)
    const vulnerableTopics = ['rodina', 'strach', 'smútok', 'bolesť', 'trauma', 'hanba', 'zlyhanie'];
    const vulnerableInteractions = interactions.filter(entry => {
        const tags = entry.metadata?.tags || [];
        return tags.some(tag => vulnerableTopics.includes(tag));
    }).length;

    const vulnerabilityScore = Math.min(1.0, vulnerableInteractions / Math.max(1, totalInteractions * 0.3));

    // 4. CONSISTENCY METRIC (based on interaction frequency)
    // Group interactions by day and calculate consistency
    const interactionsByDay = {};
    interactions.forEach(entry => {
        const parsedDate = new Date(entry?.timestamp || '');
        if (!Number.isFinite(parsedDate.getTime())) {
            return;
        }
        const date = parsedDate.toISOString().split('T')[0];
        interactionsByDay[date] = (interactionsByDay[date] || 0) + 1;
    });

    const activeDays = Object.keys(interactionsByDay).length;
    const avgInteractionsPerDay = totalInteractions / Math.max(1, daysElapsed);

    // Consistency: high if user interacts regularly
    const consistencyScore = Math.min(1.0, (activeDays / Math.max(1, daysElapsed)) * 2);

    return {
        time: Math.min(1.0, timeScore),
        depth: Math.min(1.0, depthScore),
        vulnerability: Math.min(1.0, vulnerabilityScore),
        consistency: Math.min(1.0, consistencyScore)
    };
}

// ============================================================
// RELATIONSHIP PROGRESSION
// ============================================================

/**
 * Get next stage name
 */
function getNextStageName(currentStageName) {
    const currentIndex = RELATIONSHIP_STAGES.findIndex(s => s.name === currentStageName);
    if (currentIndex === -1 || currentIndex === RELATIONSHIP_STAGES.length - 1) {
        return null;  // Already at max or invalid
    }
    return RELATIONSHIP_STAGES[currentIndex + 1].name;
}

/**
 * Evaluate if relationship should progress to next stage
 * @param {Object} state - Current memory state (optional, loads if not provided)
 * @returns {Object} - Updated relationship object or current if no progression
 */
export async function evaluateRelationshipProgression(state) {
    // Load memory if state not provided
    if (!state) {
        const { loadMemory } = await import('./memory.js');
        state = await loadMemory();
    }

    // Use canonical relationship structure (v0.5+)
    const current = state.relationship || {
        level: 'stranger',
        metrics: {
            interactionCount: 0,
            firstInteraction: new Date().toISOString(),
            depth: 0,
            vulnerability: 0,
            consistency: 0
        }
    };

    const totalInteractions = Array.isArray(state.rawMemory?.log)
        ? state.rawMemory.log.length
        : Array.isArray(state.rawMemory)
            ? state.rawMemory.length
            : 0;

    // Get next stage name (handle both 'level' and 'stage' properties)
    const currentStageName = current.level || current.stage || 'stranger';
    const nextStageName = getNextStageName(currentStageName);
    if (!nextStageName) {
        return current;  // Already at max stage
    }

    const nextStage = RELATIONSHIP_STAGES.find(s => s.name === nextStageName);

    // Calculate current metrics
    const metrics = calculateRelationshipMetrics(state);

    // Check if minimum interactions met
    if (totalInteractions < nextStage.minInteractions) {
        return current;
    }

    // Check if all progression factors met
    const factorsMet = Object.keys(nextStage.progressionFactors).every(
        factor => metrics[factor] >= nextStage.progressionFactors[factor]
    );

    if (!factorsMet) {
        return current;
    }

    // PROGRESSION TRIGGERED
    console.log(`🌀 RELATIONSHIP EVOLUTION: ${current.stage} → ${nextStage.name}`);
    console.log(`   Metrics: time=${metrics.time.toFixed(2)}, depth=${metrics.depth.toFixed(2)}, vulnerability=${metrics.vulnerability.toFixed(2)}, consistency=${metrics.consistency.toFixed(2)}`);

    return {
        stage: nextStage.name,
        totalInteractions: totalInteractions,
        startDate: current.startDate,
        lastProgression: new Date().toISOString(),
        metrics: metrics,
        history: [
            ...(current.history || []),
            {
                from: current.stage,
                to: nextStage.name,
                date: new Date().toISOString(),
                totalInteractions: totalInteractions
            }
        ]
    };
}

/**
 * Get current stage object
 */
export function getCurrentStage(state) {
    const stageName = state.relationship?.stage || 'stranger';
    return RELATIONSHIP_STAGES.find(s => s.name === stageName) || RELATIONSHIP_STAGES[0];
}

/**
 * Get stage-appropriate behavior adjustments
 */
export function getStageAppropiateBehavior(state) {
    const stage = getCurrentStage(state);

    const behaviorMap = {
        stranger: {
            tone: 'formal',
            personalQuestions: 'minimal',
            vulnerability: 'low',
            humor: 'professional',
            directness: 'moderate'
        },
        acquaintance: {
            tone: 'friendly',
            personalQuestions: 'light',
            vulnerability: 'low-medium',
            humor: 'casual',
            directness: 'moderate'
        },
        companion: {
            tone: 'warm',
            personalQuestions: 'moderate',
            vulnerability: 'medium',
            humor: 'playful',
            directness: 'high'
        },
        confidant: {
            tone: 'intimate',
            personalQuestions: 'deep',
            vulnerability: 'high',
            humor: 'shared-inside-jokes',
            directness: 'very-high'
        },
        symbiont: {
            tone: 'integrated',
            personalQuestions: 'unrestricted',
            vulnerability: 'complete',
            humor: 'unrestricted',
            directness: 'brutal-honesty'
        }
    };

    return behaviorMap[stage.name] || behaviorMap.stranger;
}

/**
 * Format relationship status for display
 */
export function formatRelationshipStatus(state) {
    const stage = getCurrentStage(state);
    const metrics = calculateRelationshipMetrics(state);
    const totalInteractions = state.rawMemory?.log?.length || 0;

    let status = `\n╔════════════════════════════════════════╗\n`;
    status += `║  RELATIONSHIP STATUS                   ║\n`;
    status += `╠════════════════════════════════════════╣\n`;
    status += `║  Stage: ${stage.emoji} ${stage.name.toUpperCase().padEnd(24)}║\n`;
    status += `║  ${stage.description.padEnd(38)}║\n`;
    status += `╠════════════════════════════════════════╣\n`;
    status += `║  Interactions: ${String(totalInteractions).padEnd(23)}║\n`;
    status += `║  Time: ${(metrics.time * 100).toFixed(0)}%${' '.repeat(30)}║\n`;
    status += `║  Depth: ${(metrics.depth * 100).toFixed(0)}%${' '.repeat(29)}║\n`;
    status += `║  Vulnerability: ${(metrics.vulnerability * 100).toFixed(0)}%${' '.repeat(20)}║\n`;
    status += `║  Consistency: ${(metrics.consistency * 100).toFixed(0)}%${' '.repeat(22)}║\n`;
    status += `╚════════════════════════════════════════╝\n`;

    // Show progress to next stage
    const nextStageName = getNextStageName(stage.name);
    if (nextStageName) {
        const nextStage = RELATIONSHIP_STAGES.find(s => s.name === nextStageName);
        status += `\n🎯 Next stage: ${nextStage.emoji} ${nextStage.name}\n`;
        status += `   Required:\n`;
        status += `   - Interactions: ${totalInteractions}/${nextStage.minInteractions}\n`;
        status += `   - Time: ${(metrics.time * 100).toFixed(0)}%/${(nextStage.progressionFactors.time * 100).toFixed(0)}%\n`;
        status += `   - Depth: ${(metrics.depth * 100).toFixed(0)}%/${(nextStage.progressionFactors.depth * 100).toFixed(0)}%\n`;
        status += `   - Vulnerability: ${(metrics.vulnerability * 100).toFixed(0)}%/${(nextStage.progressionFactors.vulnerability * 100).toFixed(0)}%\n`;
        status += `   - Consistency: ${(metrics.consistency * 100).toFixed(0)}%/${(nextStage.progressionFactors.consistency * 100).toFixed(0)}%\n`;
    } else {
        status += `\n🌀 SYMBIONT stage achieved - maximum bond.\n`;
    }

    return status;
}

// ============================================================
// EXPORT
// ============================================================

export default {
    RELATIONSHIP_STAGES,
    calculateRelationshipMetrics,
    evaluateRelationshipProgression,
    getCurrentStage,
    getStageAppropiateBehavior,
    formatRelationshipStatus
};
