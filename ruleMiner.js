// ruleMiner.js - SP4 Auto-Learning Rule Miner v1.0
// Adaptive AI system - learns patterns from conversations, generates rules autonomously
// CORE PRINCIPLE: AI mutates itself based on user behavior, NOT static config

import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';
import { AUTO_TUNING_FILE, PATTERN_HISTORY_FILE, RULEBOOK_FILE, RULES_DIR, RULE_BACKUPS_DIR, USER_BEHAVIOR_LOG } from './config/paths.js';
import { detectEasternSlovak } from './src/core/dialectAnalyzer.js';
import { runtimeLog, runtimeWarn } from './src/core/runtimeLogging.js';

const RULEBOOK_PATH = RULEBOOK_FILE;
const PATTERN_HISTORY_PATH = PATTERN_HISTORY_FILE;
const USER_BEHAVIOR_PATH = USER_BEHAVIOR_LOG;
const AUTO_TUNING_PATH = AUTO_TUNING_FILE;

/**
 * Contamination patterns — entries matching any of these must NOT enter the learning cache.
 * Sources: test_deterministic_registry.js + known hallucination/identity-drift categories.
 * Categories:
 *   - project-hallucination: Llama 2, SP4OT governance, NVMe SSD, faktúry/zmluvy
 *   - identity-drift: "som len AI", jazykový model, "nemôžem si povedať"
 *   - meta-leak: celý prompt, interné inštrukcie
 *   - broken-smalltalk: Naznamiem, "Toto nebolo trafené"
 */
export const CONTAMINATION_PATTERNS = [
    // --- broken-smalltalk ---
    /Toto nebolo trafen[eé]/i,
    /N[áa]znamiem/i,
    // --- project-hallucination ---
    /Llama 2/i,
    /odberate[lľ]sk[yý]ch zmluvy/i,
    /SP4OT je tokenizovan[yý] governance/i,
    /SP4O[TC][^.!?\n]{0,60}?(?<!\bnie\s)\bje\s+(?:u[žz]\s+|dnes\s+|teraz\s+|st[áa]le\s+)?(akt[ií]vn\w+|na\s+blockchaine|verejne\s+obchodovate[ľl]n\w+|nasaden\w+)/i,
    /SP4O[TC][^.!?\n]{0,60}?\bu[žz]\s+funguje\b/i,
    /SP4O[TC][^.!?\n]{0,60}?\bm[áa]\s+(cenu|kurz|trhov[úu]\s+hodnotu)/i,
    /SP4O[TC][^.!?\n]{0,60}?\b(?:obchoduje\s+sa|sa\s+obchoduje)\b/i,
    /SP4O[TC][^.!?\n]{0,60}?\bgarantuje\s+(v[ýy]nos|zisk)/i,
    /SP4O[TC][^.!?\n]{0,60}?\bsa\s+(re[áa]lne\s+)?[ťt]a[žz][íi](?=\s|$|[.,!?])/i,
    /NVMe SSD/i,
    /CORE:\s*Sp4 je komplexn[yý] syst[eé]m/i,
    // --- identity-drift ---
    /nem[oô]žem si poveda[tť]/i,
    /\bsom len AI\b/i,
    /\bjazykov[yý] model\b/i,
    // --- meta-leak ---
    /cel[yý] prompt/i,
    /intern[eé] in[sš]trukci/i,
];

/** Stale replay inputs that must never re-enter the cache */
const STALE_REPLAY_INPUTS = new Set([
    'kde som sa to ocitol?',
    'kde som ja a kde si ty?',
    'Ako SP4 rozhodne, že odpoveď je „dosť dobrá"?',
    'Ako SP4 rozhodne, ktorý agent odpovie?',
    'Čo je „kritická pamäť" vs. „odpad"?',
]);

const MIN_GLITCH_METAPHOR_DENSITY = 0.02;

const GENERIC_GLITCH_MARKER_TOKENS = new Set([
    'aky',
    'aka',
    'ake',
    'ako',
    'co',
    'kto',
    'kde',
    'kedy',
    'preco',
    'proc',
    'na',
    'cez',
    'to',
    'je',
    'sa',
    'si',
    'som',
    'myslis',
    'myslim',
    'sluzi',
    'sp4',
    'deterministic',
    'runtime',
    'guard',
    'cloud',
    'pravda',
    'nejde'
]);

const EXPLICIT_GLITCH_MARKER_TOKENS = new Set([
    'chaos',
    'hlbina',
    'tien',
    'iskra',
    'prasklina',
    'limbicky',
    'zmysel',
    'zivot',
    'sloboda',
    'vedomie',
    'existencia',
    'samota',
    'bytie',
    'ticho'
]);

function cleanLearnedMarker(rawMarker) {
    return String(rawMarker || '')
        .trim()
        .toLowerCase()
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function markerKey(marker) {
    return cleanLearnedMarker(marker)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
}

function isAllowedGlitchMarker(rawMarker) {
    const marker = cleanLearnedMarker(rawMarker);
    const key = markerKey(marker);

    return Boolean(marker)
        && marker.length >= 3
        && !GENERIC_GLITCH_MARKER_TOKENS.has(key)
        && EXPLICIT_GLITCH_MARKER_TOKENS.has(key);
}

function isHighQualityGlitchPattern(pattern) {
    const metaphorDensity = pattern.features?.metaphorDensity || 0;
    const keywords = pattern.features?.modeTriggers?.keywords || [];

    return metaphorDensity >= MIN_GLITCH_METAPHOR_DENSITY
        && keywords.some(isAllowedGlitchMarker);
}

/**
 * 🧬 RULE MINER - Auto-učiaci sa systém pre SP4 CORE AGENT
 * 
 * Analyzuje:
 * - Štýl užívateľa (dialect, intensity, vulgarizmy, emócie)
 * - Preferované typy odpovedí (technical, poetic, brutal, supportive)
 * - Trigger patterns (keywords → mode activation)
 * - Response length preferences
 * - Metaphor density tolerance
 * 
 * Generuje:
 * - Trigger_words lists (auto-detect mode switches)
 * - Intensity thresholds (custom per user)
 * - Style directives (dialect preferences, swearing tolerance)
 * - Context-aware routing rules
 */

export class RuleMiner {
    constructor() {
        this.rulebook = null;
        this.patternHistory = [];
        this.autoTuning = null;
        this.updateCounter = 0;
        this.initialized = false;
    }

    /**
     * Initialize Rule Miner - load existing rules or create defaults
     */
    async initialize() {
        runtimeLog('🧬 Initializing Rule Miner...');

        try {
            // Load rulebook
            this.rulebook = await this.loadRulebook();

            // Load pattern history
            this.patternHistory = await this.loadPatternHistory();

            // Load auto-tuning config
            this.autoTuning = await this.loadAutoTuning();

            this.initialized = true;
            runtimeLog('✅ Rule Miner ready');
            runtimeLog(`   📊 Current rules: ${Object.keys(this.rulebook.personas || {}).length} personas`);
            runtimeLog(`   📜 Pattern history: ${this.patternHistory.length} entries`);

            return { success: true };
        } catch (err) {
            console.error('❌ Rule Miner initialization failed:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Load or create rulebook.yml
     */
    async loadRulebook() {
        try {
            const content = await fs.readFile(RULEBOOK_PATH, 'utf8');
            return yaml.load(content);
        } catch (err) {
            if (err.code === 'ENOENT') {
                runtimeLog('   📝 Creating default rulebook.yml...');
                const defaultRulebook = this.getDefaultRulebook();
                await this.saveRulebook(defaultRulebook);
                return defaultRulebook;
            }
            throw err;
        }
    }

    /**
     * Load pattern history
     */
    async loadPatternHistory() {
        try {
            const content = await fs.readFile(PATTERN_HISTORY_PATH, 'utf8');
            if (!content || content.trim() === '') {
                runtimeLog('   ⚠️  Pattern history file empty, creating new');
                return [];
            }
            return JSON.parse(content);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return [];
            }
            if (err instanceof SyntaxError) {
                runtimeWarn('   ⚠️  Pattern history corrupted, resetting');
                return [];
            }
            throw err;
        }
    }

    /**
     * Load auto-tuning config
     */
    async loadAutoTuning() {
        try {
            const content = await fs.readFile(AUTO_TUNING_PATH, 'utf8');
            return yaml.load(content);
        } catch (err) {
            if (err.code === 'ENOENT') {
                const defaultConfig = this.getDefaultAutoTuning();
                await this.saveAutoTuning(defaultConfig);
                return defaultConfig;
            }
            throw err;
        }
    }

    /**
     * Save rulebook with backup
     */
    async saveRulebook(rulebook) {
        // Backup old version
        try {
            const oldContent = await fs.readFile(RULEBOOK_PATH, 'utf8');
            const backupPath = path.join(RULE_BACKUPS_DIR, `rulebook_${Date.now()}.yml`);
            await fs.writeFile(backupPath, oldContent, 'utf8');
        } catch (err) {
            // Ignore if backup fails (first run)
        }

        // Save new version
        const yamlContent = yaml.dump(rulebook, { indent: 2 });
        await fs.writeFile(RULEBOOK_PATH, yamlContent, 'utf8');
    }

    /**
     * Save auto-tuning config
     */
    async saveAutoTuning(config) {
        const yamlContent = yaml.dump(config, { indent: 2 });
        await fs.writeFile(AUTO_TUNING_PATH, yamlContent, 'utf8');
    }

    /**
     * Save pattern history
     */
    async savePatternHistory() {
        await fs.writeFile(
            PATTERN_HISTORY_PATH,
            JSON.stringify(this.patternHistory, null, 2),
            'utf8'
        );
    }

    /**
     * 🔥 CORE FUNCTIONALITY: Analyze conversation and extract learning signals
     * @param {string} userMessage - User input
     * @param {string} agentResponse - AI response
     * @param {string} detectedMode - Mode that was used (core, popici, glitch)
     * @param {Object} emotionalAnalysis - Emotional analysis result
     * @returns {Object} Extracted signals
     */
    async analyzeConversation(userMessage, agentResponse, detectedMode, emotionalAnalysis = {}) {
        if (!this.initialized) {
            throw new Error('Rule Miner not initialized');
        }

        runtimeLog('🧠 Rule Miner: Analyzing conversation...');

        const signals = {
            timestamp: Date.now(),
            userMessage,
            agentResponse,
            detectedMode,
            features: {}
        };

        // 1. DIALECT ANALYSIS
        const dialectResult = detectEasternSlovak(userMessage);
        signals.features.dialect = {
            detected: dialectResult.detected,
            score: dialectResult.score,
            markers: dialectResult.markers || []
        };

        // 2. INTENSITY ANALYSIS
        signals.features.intensity = {
            level: emotionalAnalysis.intensity || 0,
            emotion: emotionalAnalysis.dominantEmotion || 'neutral',
            shouldGround: emotionalAnalysis.shouldGround || false
        };

        // 3. VULGAR LANGUAGE DETECTION
        const vulgarPatterns = /\b(kokot|piča|kurva|sračk|hovno|jebat|do piče)\b/gi;
        const vulgarMatches = (userMessage.match(vulgarPatterns) || []).length;
        signals.features.vulgarity = {
            count: vulgarMatches,
            normalized: vulgarMatches / Math.max(1, userMessage.split(/\s+/).length)
        };

        // 4. QUESTION TYPE DETECTION
        signals.features.questionType = this.detectQuestionType(userMessage);

        // 5. RESPONSE LENGTH PREFERENCE (user seems to prefer short vs long)
        signals.features.responseLength = {
            chars: agentResponse.length,
            words: agentResponse.split(/\s+/).length,
            sentences: (agentResponse.match(/[.!?]+/g) || []).length
        };

        // 6. METAPHOR DENSITY (for Glitchoslav)
        const metaphorMarkers = /\b(ako|podobne ako|pripomín|iskra|tieň|prasklina|chaos|hlbina)\b/gi;
        const metaphorCount = (agentResponse.match(metaphorMarkers) || []).length;
        signals.features.metaphorDensity = metaphorCount / Math.max(1, agentResponse.split(/\s+/).length);

        // 7. MODE TRIGGER ANALYSIS
        signals.features.modeTriggers = this.extractModeTriggers(userMessage, detectedMode);

        runtimeLog(`   📊 Signals extracted:`);
        runtimeLog(`      Dialect: ${signals.features.dialect.detected ? 'YES' : 'NO'} (${signals.features.dialect.score.toFixed(2)})`);
        runtimeLog(`      Intensity: ${signals.features.intensity.level.toFixed(2)}`);
        runtimeLog(`      Vulgarity: ${signals.features.vulgarity.count} words`);
        runtimeLog(`      Question: ${signals.features.questionType}`);

        // CONTAMINATION GATE — reject entries with known hallucinations, identity-drift,
        // meta-leaks, or broken smalltalk before they can mutate the rulebook.
        if (this.isContaminated(userMessage, agentResponse)) {
            runtimeWarn('🚫 Rule Miner: contaminated entry rejected, not stored in learning cache');
            runtimeWarn(`   userMessage: ${userMessage.slice(0, 80)}`);
            return { ...signals, rejected: true, rejectReason: 'contamination_gate' };
        }

        // Store in pattern history
        this.patternHistory.push(signals);

        // Keep only last 100 entries
        if (this.patternHistory.length > 100) {
            this.patternHistory = this.patternHistory.slice(-100);
        }

        await this.savePatternHistory();

        return signals;
    }

    /**
     * Contamination check — returns true if this turn must NOT enter the learning cache.
     * Checks both userMessage and agentResponse against CONTAMINATION_PATTERNS
     * and the STALE_REPLAY_INPUTS blocklist.
     * @param {string} userMessage
     * @param {string} agentResponse
     * @returns {boolean}
     */
    isContaminated(userMessage, agentResponse) {
        if (STALE_REPLAY_INPUTS.has(userMessage)) return true;
        const combined = `${userMessage}\n${agentResponse}`;
        return CONTAMINATION_PATTERNS.some(pattern => pattern.test(combined));
    }

    /**
     * Extract mode trigger keywords
     */
    extractModeTriggers(userMessage, detectedMode) {
        const words = userMessage.toLowerCase().split(/\s+/).filter(w => w.length >= 3);

        // Common words to ignore
        const stopwords = new Set(['ako', 'som', 'sme', 'nie', 'áno', 'ale', 'pre', 'pri', 'kam', 'kde']);

        return {
            mode: detectedMode,
            keywords: words.filter(w => !stopwords.has(w)).slice(0, 5) // Top 5 keywords
        };
    }

    /**
     * Detect question type
     */
    detectQuestionType(message) {
        const lower = message.toLowerCase();

        if (/\b(prečo|ako to|vysvetli|poraď|analyzuj)\b/.test(lower)) {
            return 'deep_reasoning';
        }
        if (/\b(kód|funkci|implementuj|debug|syntax)\b/.test(lower)) {
            return 'technical';
        }
        if (/\b(cítim|strach|bolesť|smutok|radosť|emóci)\b/.test(lower)) {
            return 'emotional';
        }
        if (/\b(čo je|kto je|definuj|vysvetli)\b/.test(lower)) {
            return 'definition';
        }
        if (/\b(kokot|kurva|piča|do piče)\b/.test(lower)) {
            return 'vent'; // Vypitvanie
        }

        return 'general';
    }

    /**
     * 🔥 RULE GENERATION: Update rulebook based on detected patterns
     * Runs every N messages (configured in auto-tuning.yml)
     */
    async updateRules() {
        if (!this.initialized) {
            throw new Error('Rule Miner not initialized');
        }

        this.updateCounter++;

        // Check if update interval reached
        if (this.updateCounter < this.autoTuning.update_interval) {
            return { updated: false, reason: 'interval_not_reached' };
        }

        runtimeLog('🔥 Rule Miner: Generating new rules from patterns...');

        // Reset counter
        this.updateCounter = 0;

        // Analyze recent patterns (last N conversations)
        const recentPatterns = this.patternHistory.slice(-this.autoTuning.update_interval);

        if (recentPatterns.length === 0) {
            return { updated: false, reason: 'no_data' };
        }

        // Generate rule updates
        const updates = await this.generateRuleUpdates(recentPatterns);

        // Apply updates with safety check
        const applied = await this.applyRuleUpdates(updates);

        runtimeLog(`   ✅ Rules updated: ${applied.changes} changes applied`);

        return {
            updated: true,
            changes: applied.changes,
            blocked: applied.blocked,
            summary: applied.summary
        };
    }

    /**
     * Generate rule updates from patterns
     */
    async generateRuleUpdates(patterns) {
        const updates = {
            popici: { trigger_words: new Set(), intensity_threshold: null },
            glitch: { mystic_markers: new Set(), technical_limit: null },
            core: { response_style: null }
        };

        // 1. POPICI TRIGGERS - detect words that frequently lead to popici mode
        // Signal-quality guard: only learn from entries with actual vulgarity (vulgarity.count > 0).
        // Generic/technical words from misrouted queries must not pollute trigger_words.
        const popiciPatterns = patterns.filter(
            p => p.detectedMode === 'popici' && (p.features.vulgarity?.count || 0) > 0
        );

        for (const pattern of popiciPatterns) {
            // Extract keywords from messages that triggered popici
            if (pattern.features.modeTriggers?.keywords) {
                pattern.features.modeTriggers.keywords.forEach(kw => {
                    updates.popici.trigger_words.add(kw);
                });
            }
        }

        // 2. INTENSITY THRESHOLD - average intensity for popici activation
        const popiciIntensities = popiciPatterns.map(p => p.features.intensity?.level || 0);
        if (popiciIntensities.length > 0) {
            updates.popici.intensity_threshold =
                popiciIntensities.reduce((a, b) => a + b, 0) / popiciIntensities.length;
        }

        // 3. GLITCHOSLAV MYSTIC MARKERS - words that appear in glitch contexts
        // Signal-quality guard: only learn from strong glitch-style entries with
        // explicit mystic markers. Weak metaphor noise and technical words must
        // not pollute mystic_markers.
        const glitchPatterns = patterns.filter(
            p => (p.detectedMode === 'glitch' || p.detectedMode === 'glitchoslav')
                && isHighQualityGlitchPattern(p)
        );

        for (const pattern of glitchPatterns) {
            if (pattern.features.modeTriggers?.keywords) {
                pattern.features.modeTriggers.keywords.forEach(kw => {
                    if (isAllowedGlitchMarker(kw)) {
                        updates.glitch.mystic_markers.add(cleanLearnedMarker(kw));
                    }
                });
            }
        }

        // 4. METAPHOR DENSITY - average metaphor usage in glitch responses
        const metaphorDensities = glitchPatterns.map(p => p.features.metaphorDensity || 0);
        if (metaphorDensities.length > 0) {
            const avgDensity = metaphorDensities.reduce((a, b) => a + b, 0) / metaphorDensities.length;
            updates.glitch.poetic_density = avgDensity;
        }

        // Convert Sets to Arrays
        updates.popici.trigger_words = Array.from(updates.popici.trigger_words);
        updates.glitch.mystic_markers = Array.from(updates.glitch.mystic_markers);

        return updates;
    }

    /**
     * Apply rule updates with safety checks (Walter-style protection)
     */
    async applyRuleUpdates(updates) {
        const result = {
            changes: 0,
            blocked: 0,
            summary: []
        };

        // SAFETY CHECK: Max rule changes limit
        const maxChanges = this.autoTuning.max_rule_changes || 5;

        // POPICI RULES
        if (updates.popici.trigger_words.length > 0) {
            // Merge with existing, keep top N by frequency
            const existing = this.rulebook.personas.popici.trigger_words || [];
            const merged = [...new Set([...existing, ...updates.popici.trigger_words])];

            // Limit to maxChanges new words
            const newWords = updates.popici.trigger_words.slice(0, maxChanges);

            if (newWords.length > 0) {
                this.rulebook.personas.popici.trigger_words = [
                    ...existing,
                    ...newWords
                ].slice(0, 20); // Keep max 20 triggers

                result.changes += newWords.length;
                result.summary.push(`Added ${newWords.length} POPICI triggers: ${newWords.join(', ')}`);
            }
        }

        // POPICI INTENSITY
        if (updates.popici.intensity_threshold !== null) {
            const old = this.rulebook.personas.popici.min_intensity;
            const updated = this.smoothUpdate(old, updates.popici.intensity_threshold, this.autoTuning.learning_rate);

            this.rulebook.personas.popici.min_intensity = updated;
            result.changes++;
            result.summary.push(`Updated POPICI intensity: ${old.toFixed(2)} → ${updated.toFixed(2)}`);
        }

        // GLITCH MYSTIC MARKERS
        if (updates.glitch.mystic_markers.length > 0) {
            const existing = this.rulebook.personas.glitchoslav.mystic_markers || [];
            const newMarkers = updates.glitch.mystic_markers.slice(0, maxChanges);

            if (newMarkers.length > 0) {
                this.rulebook.personas.glitchoslav.mystic_markers = [
                    ...existing,
                    ...newMarkers
                ].slice(0, 15); // Keep max 15 markers

                result.changes += newMarkers.length;
                result.summary.push(`Added ${newMarkers.length} GLITCH markers: ${newMarkers.join(', ')}`);
            }
        }

        // GLITCH POETIC DENSITY
        if (updates.glitch.poetic_density !== undefined) {
            const old = this.rulebook.personas.glitchoslav.poetic_density || 0.3;
            const updated = this.smoothUpdate(old, updates.glitch.poetic_density, this.autoTuning.learning_rate);

            this.rulebook.personas.glitchoslav.poetic_density = updated;
            result.changes++;
            result.summary.push(`Updated GLITCH poetic density: ${old.toFixed(2)} → ${updated.toFixed(2)}`);
        }

        // Save updated rulebook
        if (result.changes > 0) {
            await this.saveRulebook(this.rulebook);

            // Log to user behavior
            await this.logBehavior({
                type: 'rule_update',
                changes: result.changes,
                summary: result.summary,
                timestamp: Date.now()
            });
        }

        return result;
    }

    /**
     * Smooth update with learning rate (exponential moving average)
     */
    smoothUpdate(oldValue, newValue, learningRate) {
        return oldValue * (1 - learningRate) + newValue * learningRate;
    }

    /**
     * Log user behavior
     */
    async logBehavior(entry) {
        const logEntry = `[${new Date().toISOString()}] ${JSON.stringify(entry)}\n`;
        await fs.appendFile(USER_BEHAVIOR_PATH, logEntry, 'utf8');
    }

    /**
     * Get current rulebook (for debugging)
     */
    getRulebook() {
        return this.rulebook;
    }

    /**
     * Get pattern statistics
     */
    getPatternStats() {
        if (this.patternHistory.length === 0) {
            return { totalConversations: 0 };
        }

        const modeDistribution = {};
        let totalIntensity = 0;
        let totalVulgarity = 0;

        for (const pattern of this.patternHistory) {
            // Mode distribution
            const mode = pattern.detectedMode;
            modeDistribution[mode] = (modeDistribution[mode] || 0) + 1;

            // Average intensity
            totalIntensity += pattern.features.intensity?.level || 0;

            // Average vulgarity
            totalVulgarity += pattern.features.vulgarity?.normalized || 0;
        }

        return {
            totalConversations: this.patternHistory.length,
            modeDistribution,
            avgIntensity: totalIntensity / this.patternHistory.length,
            avgVulgarity: totalVulgarity / this.patternHistory.length
        };
    }

    /**
     * Default rulebook template
     */
    getDefaultRulebook() {
        return {
            version: '1.0',
            lastUpdate: new Date().toISOString(),
            personas: {
                popici: {
                    trigger_words: ['kokot', 'ta', 'bratu', 'piča', 'kurva'],
                    min_intensity: 0.6,
                    mandatory_features: ['vulgar', 'dialect'],
                    response_style: 'brutal_truth'
                },
                glitchoslav: {
                    mystic_markers: ['chaos', 'hlbina', 'tieň', 'iskra', 'prasklina', 'limbický'],
                    technical_limit: 2,
                    poetic_density: 0.3,
                    response_style: 'metaphor_with_truth'
                },
                core: {
                    response_style: 'direct_practical',
                    max_length: 500,
                    technical_depth: 'medium'
                }
            }
        };
    }

    /**
     * Default auto-tuning config
     */
    getDefaultAutoTuning() {
        return {
            learning_rate: 0.12,
            update_interval: 20,
            max_rule_changes: 5,
            safety_cap: true,
            dangerous_patterns: [
                'diagnóz', 'lieč', 'predpis', 'právna rada'
            ]
        };
    }
}

// Singleton instance
export const ruleMiner = new RuleMiner();

/**
 * Export rules to file (wrapper for scheduler.js compatibility)
 * @param {Array} rules - Rules to export
 * @param {string} filePath - Target file path
 */
export async function exportRules(rules, filePath) {
    await ruleMiner.initialize();
    const rulebook = ruleMiner.getRulebook();

    // Save as YAML
    const yaml = await import('js-yaml');
    const yamlContent = yaml.default.dump({ rules: rules || rulebook }, { indent: 2 });
    await fs.writeFile(filePath, yamlContent, 'utf8');

    console.log(`✅ Rules exported to ${filePath}`);
}

/**
 * Mine rules from memory logs (wrapper for scheduler.js compatibility)
 * @param {Object} state - Memory state
 * @returns {Object} Mining results
 */
export async function mineFromMemory(state) {
    await ruleMiner.initialize();

    const results = {
        newPatterns: 0,
        updatedRules: 0,
        timestamp: Date.now()
    };

    // Analyze recent conversations from memory
    const recentLogs = (state.log || []).slice(-50);

    for (const logEntry of recentLogs) {
        if (logEntry.input && logEntry.reply && logEntry.mode) {
            try {
                await ruleMiner.analyzeConversation(
                    logEntry.input,
                    logEntry.reply,
                    logEntry.mode,
                    logEntry.metadata?.emotional || {}
                );
                results.newPatterns++;
            } catch (err) {
                console.error('Error mining from log entry:', err.message);
            }
        }
    }

    console.log(`🧬 Mined ${results.newPatterns} patterns from memory`);
    return results;
}

// CLI test
if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        const miner = new RuleMiner();
        await miner.initialize();

        console.log('\n📊 Current Rulebook:');
        console.log(JSON.stringify(miner.getRulebook(), null, 2));

        console.log('\n📈 Pattern Stats:');
        console.log(JSON.stringify(miner.getPatternStats(), null, 2));

        // Test conversation analysis
        const testSignals = await miner.analyzeConversation(
            'kokot, ta mi poraď, čo mám robiť s tým problémom',
            'Popiči, bratu, máš to jasné - prestaň váhať a urob to.',
            'popici',
            { intensity: 0.75, dominantEmotion: 'frustration' }
        );

        console.log('\n🧠 Test Signals:');
        console.log(JSON.stringify(testSignals, null, 2));
    })();
}
