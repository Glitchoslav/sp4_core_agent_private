// autonomousController.js
/**
 * 🧠 AUTONOMOUS CONTROLLER v1.0
 * 
 * Veliteľ mozgov - rozhoduje ktorý AI brain použiť a ako.
 * 
 * "Nie je to len AI, čo odpovedá. Je to AI, čo rozhoduje ako myslí."
 * 
 * Flow:
 * 1. ANALYZE → situácia, user, emócia, budget
 * 2. DECIDE → stratégia, brain, style
 * 3. EXECUTE → volanie zvoleného brain
 * 4. EVALUATE → self-check kvality
 * 5. LEARN → uložiť výsledok pre budúcnosť
 */

import fs from 'fs';
import { AUTONOMOUS_DECISIONS_FILE, AUTONOMOUS_LEARNING_FILE } from './config/paths.js';
import { runtimeWarn } from './src/core/runtimeLogging.js';
import { loadMemory } from './memory.js';


export class AutonomousController {
    constructor(integrationManager) {
        this.integration = integrationManager;
        this.decisionLog = [];
        this.learningData = this.loadLearningData();
        this.preferences = {
            // User-specific learned preferences
            preferredBrainByTask: {},
            responseStyleByEmotion: {},
            successfulPatterns: []
        };
    }

    /**
     * 🎯 MAIN DECISION POINT
     * Rozhodne celú stratégiu odpovede
     * 
     * @param {string} userMessage - User input
     * @param {object} context - Request context
     * @param {object} policy - Routing policy from resolvePolicy()
     */
    async decide(userMessage, context = {}, policy = null) {
        const decision = {
            timestamp: Date.now(),
            input: {
                message: userMessage,
                length: userMessage.length,
                context
            },
            policy: policy || { allowCloud: false, forceLocal: false, route: 'local-first', reason: 'no-policy-provided' },
            analysis: {},
            strategy: {},
            reasoning: []
        };

        // PHASE 1: ANALYZE SITUATION
        decision.analysis = await this.analyzeSituation(userMessage, context);

        // PHASE 2: DECIDE STRATEGY
        decision.strategy = await this.decideStrategy(decision.analysis, decision.policy);

        // Log decision
        this.logDecision(decision);

        return decision.strategy;
    }

    /**
     * 📊 PHASE 1: ANALYZE SITUATION
     */
    async analyzeSituation(message, context) {
        const analysis = {
            complexity: this.analyzeComplexity(message),
            taskType: this.detectTaskType(message),
            emotionalState: context.emotion || 'neutral',
            urgency: this.detectUrgency(message),
            userProfile: await this.getUserProfile(),
            budgetStatus: this.checkBudget(),
            recentPerformance: this.getRecentPerformance(),
            timestamp: new Date().toISOString(),
            // 🔥 v1.4.2: Technical accuracy detection
            requiresTechAccuracy: this.detectTechAccuracyNeed(message),
            confidence: context.confidence || null // From modeCompass pattern matching
        };

        // Add reasoning
        analysis.reasoning = [
            `Message length: ${message.length} chars → ${analysis.complexity}`,
            `Detected task: ${analysis.taskType}`,
            `Emotional state: ${analysis.emotionalState}`,
            `Budget: $${analysis.budgetStatus.remaining.toFixed(2)}/${analysis.budgetStatus.limit}`
        ];

        if (analysis.requiresTechAccuracy) {
            analysis.reasoning.push(`🎯 Technical accuracy required`);
        }

        if (analysis.confidence !== null) {
            analysis.reasoning.push(`🧠 Model confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
        }

        return analysis;
    }

    /**
     * 🎲 PHASE 2: DECIDE STRATEGY
     * Hlavné rozhodnutie: ktorý brain + aký štýl
     * 
     * @param {object} analysis - Situation analysis
     * @param {object} policy - Routing policy (PHASE 0)
     */
    async decideStrategy(analysis, policy) {
        const strategy = {
            brain: 'local', // default
            model: null,
            provider: null,
            responseStyle: 'normal',
            useMemory: true,
            memoryDepth: 3,
            maxTokens: 2000,
            temperature: 0.7,
            reasoning: [],
            // Store metadata for evaluation
            taskType: analysis.taskType,
            complexity: analysis.complexity,
            // Policy metadata
            policy: {
                allowCloud: policy.allowCloud,
                route: policy.route,
                reason: policy.reason
            }
        };

        // ========== PHASE 0: POLICY ENFORCEMENT (HIGHEST PRIORITY) ==========
        // If policy blocks cloud, force local regardless of other rules
        if (!policy.allowCloud) {
            strategy.brain = 'local';
            strategy.reasoning.push(`🔒 POLICY: Cloud blocked (${policy.reason})`);
            // Skip all cloud routing rules below
            return this.finalizeStrategy(strategy, analysis);
        }

        // If forceLocal, hard block cloud
        if (policy.forceLocal) {
            strategy.brain = 'local';
            strategy.reasoning.push(`🔒 POLICY: Force local (${policy.reason})`);
            return this.finalizeStrategy(strategy, analysis);
        }

        // 🔥 v1.4.1: If forceCloud, hard require cloud (test-only)
        if (policy.forceCloud) {
            strategy.brain = 'cloud';
            strategy.provider = 'groq'; // Default to Groq for speed
            strategy.model = 'llama-3.3-70b-versatile';
            strategy.reasoning.push(`🔥 POLICY: Force cloud (${policy.reason}) - TEST MODE`);
            return this.finalizeStrategy(strategy, analysis);
        }

        // If we reach here, cloud is ALLOWED by policy
        strategy.reasoning.push(`✅ POLICY: Cloud allowed (${policy.reason})`);

        // 🔥 v1.4.2: HYBRID ACCURACY ROUTER (HIGH PRIORITY)
        // Use cloud for tech queries with low local confidence
        if (
            analysis.requiresTechAccuracy === true &&
            policy.allowCloud === true &&
            analysis.confidence !== null &&
            analysis.confidence < 0.7
        ) {
            strategy.brain = 'cloud';
            strategy.provider = 'groq';
            strategy.model = 'llama-3.3-70b-versatile';
            strategy.reasoning.push(`🎯 HYBRID ACCURACY: Tech query + low confidence (${(analysis.confidence * 100).toFixed(0)}%) → GROQ cloud`);
            strategy.accuracyFallback = true;
            strategy.fallbackReason = 'low-confidence-tech-query';

            // 🔥 CRITICAL: If SP4_TEST=true, simulate only (don't actually call cloud)
            if (process.env.SP4_TEST === 'true') {
                strategy.testModeSimulation = true;
                strategy.reasoning.push(`🧪 TEST MODE: Cloud call simulated (would use ${strategy.provider})`);
            }

            return this.finalizeStrategy(strategy, analysis);
        }

        // Rule 1: Budget check (hard limit)
        if (analysis.budgetStatus.exceeded) {
            strategy.brain = 'local';
            strategy.reasoning.push('💰 Budget exceeded → forcing LOCAL');
            return this.finalizeStrategy(strategy, analysis);
        }

        // Rule 2: Complexity routing
        if (analysis.complexity === 'expert' || analysis.complexity === 'complex') {
            // Complex queries → prefer cloud IF budget allows
            if (analysis.budgetStatus.remaining > 1.0) {
                strategy.brain = 'cloud';
                strategy.provider = 'groq'; // Fast + accurate
                strategy.model = 'llama-3.3-70b-versatile';
                strategy.reasoning.push('🌩️ Complex query + budget OK → GROQ cloud');
            } else {
                strategy.brain = 'local';
                strategy.reasoning.push('🏠 Complex but low budget → LOCAL with extended thinking');
                strategy.maxTokens = 3000; // Give local more space
            }
        }

        // Rule 3: Task-specific routing
        if (analysis.taskType === 'code' || analysis.taskType === 'analysis') {
            if (strategy.brain !== 'cloud' && analysis.budgetStatus.remaining > 0.5) {
                strategy.brain = 'cloud';
                strategy.provider = 'groq';
                strategy.model = 'llama-3.3-70b-versatile';
                strategy.reasoning.push('💻 Code/Analysis task → GROQ (best for technical)');
            }
        }

        // Rule 4: Emotional state adaptation
        if (analysis.emotionalState === 'stressed' || analysis.emotionalState === 'tired') {
            strategy.responseStyle = 'concise';
            strategy.maxTokens = 500;
            strategy.reasoning.push('😴 User stressed/tired → SHORT response');
        } else if (analysis.emotionalState === 'curious' || analysis.emotionalState === 'engaged') {
            strategy.responseStyle = 'detailed';
            strategy.maxTokens = 3000;
            strategy.reasoning.push('🤔 User curious → DETAILED response');
        }

        // Rule 5: Urgency routing
        if (analysis.urgency === 'high') {
            if (strategy.brain === 'cloud') {
                strategy.provider = 'groq'; // Groq is fastest
                strategy.reasoning.push('⚡ High urgency → GROQ (fastest cloud)');
            } else {
                strategy.reasoning.push('⚡ High urgency → LOCAL (instant)');
            }
        }

        // Rule 6: Learn from past successes
        const learnedPreference = this.getLearned(analysis.taskType);
        if (learnedPreference) {
            strategy.brain = learnedPreference.brain;
            strategy.provider = learnedPreference.provider;
            strategy.reasoning.push(`📚 Learned: ${analysis.taskType} → ${learnedPreference.brain} (${learnedPreference.successRate}% success)`);
        }

        return this.finalizeStrategy(strategy, analysis);
    }

    /**
     * 🎯 Finalize strategy with sanity checks
     */
    finalizeStrategy(strategy, analysis) {
        // Sanity check: If cloud selected but no provider, use Google (free)
        if (strategy.brain === 'cloud' && !strategy.provider) {
            strategy.provider = 'google';
            strategy.model = 'gemini-2.5-flash';
            strategy.reasoning.push('🌐 Cloud selected but no provider → Google (FREE)');
        }

        // Memory depth based on complexity
        if (analysis.complexity === 'simple') {
            strategy.memoryDepth = 1;
        } else if (analysis.complexity === 'expert') {
            strategy.memoryDepth = 5;
        }

        // Default reasoning if no rules triggered
        if (strategy.reasoning.length === 0) {
            if (strategy.brain === 'local') {
                strategy.reasoning.push(`🏠 Default: LOCAL brain (${analysis.complexity} complexity, ${analysis.taskType} task)`);
            } else {
                strategy.reasoning.push(`☁️  Default: CLOUD brain (${analysis.complexity} complexity, ${analysis.taskType} task)`);
            }
        }

        strategy.finalReasoning = strategy.reasoning.join('\n   ');
        return strategy;
    }

    /**
     * ✅ PHASE 4: SELF-EVALUATE
     * Hodnotí kvalitu odpovede
     */
    async evaluate(strategy, response, userMessage) {
        const evaluation = {
            timestamp: Date.now(),
            strategy,
            response: {
                length: response.length,
                hasCode: /```/.test(response),
                hasList: /[-•*]\s/.test(response),
                coherent: response.length > 50 // Basic check
            },
            quality: 'unknown',
            reasoning: []
        };

        // Check 1: Response length appropriate?
        if (strategy.responseStyle === 'concise' && response.length > 1000) {
            evaluation.quality = 'poor';
            evaluation.reasoning.push('❌ Requested CONCISE but got long response');
        } else if (strategy.responseStyle === 'detailed' && response.length < 200) {
            evaluation.quality = 'poor';
            evaluation.reasoning.push('❌ Requested DETAILED but got short response');
        } else {
            evaluation.quality = 'good';
            evaluation.reasoning.push('✅ Response length matches strategy');
        }

        // Check 2: Did it answer the question?
        // 🛡️ v1.3.0: SAFE STRING HANDLING - response môže byť object
        let responseText = response;
        if (typeof response === 'object' && response !== null) {
            if (typeof response.text === 'string') {
                responseText = response.text;
            } else {
                runtimeWarn('[SP4_WARN] autonomousController: response is not a string', typeof response);
                responseText = ''; // Fallback pre bezpečnosť
            }
        }

        const keywordsInQuestion = userMessage.toLowerCase().match(/\b\w{4,}\b/g) || [];
        const keywordsInResponse = (typeof responseText === 'string' ? responseText.toLowerCase() : '').match(/\b\w{4,}\b/g) || [];
        const overlap = keywordsInQuestion.filter(kw => keywordsInResponse.includes(kw));

        if (overlap.length > keywordsInQuestion.length * 0.3) {
            evaluation.reasoning.push('✅ Response addresses question keywords');
        } else {
            evaluation.quality = 'poor';
            evaluation.reasoning.push('❌ Response may be off-topic');
        }

        // Check 3: Brain performance
        if (strategy.brain === 'cloud') {
            evaluation.reasoning.push(`💰 Cloud cost incurred`);
        } else {
            evaluation.reasoning.push(`🏠 Local brain used (free)`);
        }

        // Store for learning
        this.storeEvaluation(evaluation);

        return evaluation;
    }

    /**
     * 📚 PHASE 5: LEARN from outcomes
     */
    storeEvaluation(evaluation) {
        // Store successful patterns
        if (evaluation.quality === 'good') {
            const pattern = {
                taskType: evaluation.strategy.taskType,
                brain: evaluation.strategy.brain,
                provider: evaluation.strategy.provider,
                timestamp: evaluation.timestamp
            };

            this.preferences.successfulPatterns.push(pattern);

            // Update learned preferences
            const key = pattern.taskType;
            if (!this.learningData[key]) {
                this.learningData[key] = { total: 0, success: 0, brain: pattern.brain, provider: pattern.provider };
            }
            this.learningData[key].total++;
            this.learningData[key].success++;

            this.saveLearningData();
        }
    }

    /**
     * 🔍 Helper: Analyze complexity
     */
    analyzeComplexity(message) {
        const length = message.length;
        const lower = message.toLowerCase();

        // EXPERT triggers (academic, research, comprehensive)
        if (length > 2500 || /whitepaper|research|thesis|dissertation|comprehensive.*analysis|systematic.*review/i.test(message)) {
            return 'expert';
        }

        // COMPLEX triggers (multi-step, architectural, advanced concepts)
        // Include Slovak: vytvor, implementuj, napíš, server, API, databáza
        if (length > 800 ||
            /algorithm|architecture|system.*design|implement.*(?:server|api|application)|rest.*api|authentication|database|microservice|comprehensive|detailed.*analysis/i.test(message) ||
            /vytvor|implementuj|nap├ş┼í|server|databáz|autentifik|komplet|rest.*api/i.test(message)) {
            return 'complex';
        }

        // MEDIUM triggers (analysis, comparison, explanation)
        // Include Slovak: analyzuj, porovnaj, vysvetli, výhody, nevýhody
        if (length > 300 ||
            /analyze|compare|evaluate|assess|review|explain.*(?:how|why)|advantages.*disadvantages|pros.*cons/i.test(message) ||
            /analyzuj|porovnaj|vyhodnot|vysvetli|v├Żhod|nev├Żhod/i.test(message)) {
            return 'medium';
        }

        return 'simple';
    }

    /**
     * 🔍 Helper: Detect task type
     */
    detectTaskType(message) {
        const lower = message.toLowerCase();

        if (/code|algorithm|implement|debug|function|class|syntax/.test(lower)) return 'code';
        if (/analyze|compare|evaluate|assess|review/.test(lower)) return 'analysis';
        if (/explain|how.*work|why|what.*mean/.test(lower)) return 'explanation';
        if (/create|write|generate|make/.test(lower)) return 'creation';
        if (/fix|solve|problem|error|issue/.test(lower)) return 'troubleshooting';

        return 'general';
    }

    /**
     * 🎯 v1.4.2: Detect if query requires technical accuracy
     * @param {string} message - User message
     * @returns {boolean} True if technical precision needed
     */
    detectTechAccuracyNeed(message) {
        const lower = message.toLowerCase();

        // Technical domain keywords
        const techKeywords = [
            'algorithm', 'architecture', 'database', 'api', 'protocol',
            'implementation', 'memory system', 'policy', 'integration',
            'performance', 'optimization', 'security', 'authentication',
            'encryption', 'cache', 'threading', 'async', 'synchronous',
            // Slovak equivalents
            'algoritmus', 'architektúra', 'databáza', 'pamäť', 'systém',
            'implementácia', 'politika', 'integrácia', 'výkon', 'bezpečnosť'
        ];

        // Check for technical keywords
        const hasTechKeyword = techKeywords.some(keyword => lower.includes(keyword));

        // Check for "how does X work" pattern (technical explanation)
        const isTechExplanation = /(?:how|ako).*(?:work|funguje|fungovať)/.test(lower) &&
            /(?:system|memory|policy|integration|module|engine)/.test(lower);

        // Check for SP4 internal queries (requires factual accuracy)
        const isSP4Internal = /sp4.*(?:memory|policy|integration|architecture|system)/.test(lower);

        return hasTechKeyword || isTechExplanation || isSP4Internal;
    }

    /**
     * 🔍 Helper: Detect urgency
     */
    detectUrgency(message) {
        const lower = message.toLowerCase();

        if (/urgent|asap|quickly|now|immediately|hurry/.test(lower)) return 'high';
        if (/when.*time|later|eventually/.test(lower)) return 'low';

        return 'normal';
    }

    /**
     * 📊 Helper: Get user profile
     */
    async getUserProfile() {
        const memory = await loadMemory();
        return {
            name: memory.userProfile?.name || 'User',
            interactions: memory.rawMemory?.length || 0,
            relationship: memory.relationshipState?.stage || 'stranger'
        };
    }

    /**
     * 💰 Helper: Check budget
     */
    checkBudget() {
        return {
            spent: this.integration.dailyCloudCost || 0,
            limit: this.integration.maxDailyCloudCost || 5.0,
            remaining: (this.integration.maxDailyCloudCost || 5.0) - (this.integration.dailyCloudCost || 0),
            exceeded: (this.integration.dailyCloudCost || 0) >= (this.integration.maxDailyCloudCost || 5.0)
        };
    }

    /**
     * 📈 Helper: Recent performance
     */
    getRecentPerformance() {
        const recent = this.decisionLog.slice(-10);
        return {
            totalDecisions: this.decisionLog.length,
            recentCloud: recent.filter(d => d.strategy?.brain === 'cloud').length,
            recentLocal: recent.filter(d => d.strategy?.brain === 'local').length
        };
    }

    /**
     * 📚 Helper: Get learned preference
     */
    getLearned(taskType) {
        const learned = this.learningData[taskType];
        if (!learned || learned.total < 3) return null; // Need at least 3 samples

        const successRate = (learned.success / learned.total) * 100;
        if (successRate < 70) return null; // Only use if >70% success

        return {
            brain: learned.brain,
            provider: learned.provider,
            successRate: successRate.toFixed(0)
        };
    }

    /**
     * 📝 Log decision for analysis
     */
    logDecision(decision) {
        this.decisionLog.push(decision);

        // Keep only last 100 decisions in memory
        if (this.decisionLog.length > 100) {
            this.decisionLog.shift();
        }

        // Optional: Save to file for long-term analysis
        this.saveDecisionLog();
    }

    /**
     * 💾 Persistence
     */
    loadLearningData() {
        try {
            const dataPath = AUTONOMOUS_LEARNING_FILE;
            if (fs.existsSync(dataPath)) {
                return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load learning data:', error.message);
        }
        return {};
    }

    saveLearningData() {
        try {
            const dataPath = AUTONOMOUS_LEARNING_FILE;
            fs.writeFileSync(dataPath, JSON.stringify(this.learningData, null, 2));
        } catch (error) {
            console.error('Failed to save learning data:', error.message);
        }
    }

    saveDecisionLog() {
        try {
            const logPath = AUTONOMOUS_DECISIONS_FILE;
            const logEntry = JSON.stringify(this.decisionLog[this.decisionLog.length - 1]) + '\n';
            fs.appendFileSync(logPath, logEntry);
        } catch (error) {
            // Silent fail - logging is not critical
        }
    }

    /**
     * 📊 Get statistics
     */
    getStats() {
        const cloudDecisions = this.decisionLog.filter(d => d.strategy?.brain === 'cloud').length;
        const localDecisions = this.decisionLog.filter(d => d.strategy?.brain === 'local').length;

        return {
            totalDecisions: this.decisionLog.length,
            cloudUsage: cloudDecisions,
            localUsage: localDecisions,
            cloudPercentage: this.decisionLog.length > 0 ? ((cloudDecisions / this.decisionLog.length) * 100).toFixed(1) : 0,
            learningData: this.learningData,
            preferences: this.preferences
        };
    }
}

export default AutonomousController;
