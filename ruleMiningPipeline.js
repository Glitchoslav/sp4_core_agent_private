// ruleMiningPipeline.js - End-to-End Pipeline for Rule Learning
// Orchestrates: Cleanup → Feature Extraction → Pattern Detection → Rule Update → Validation → Audit

import { RULE_BACKUPS_DIR, RULEBOOK_FILE, USER_BEHAVIOR_LOG } from './config/paths.js';
import { ruleMiner } from './ruleMiner.js';
import { runtimeLog, runtimeWarn } from './src/core/runtimeLogging.js';

/**
 * 🔥 RULE MINING PIPELINE
 * 
 * Flow:
 * 1. CLEANUP - Sanitize conversation data
 * 2. FEATURE EXTRACTION - Extract signals (dialect, intensity, triggers)
 * 3. PATTERN DETECTION - Identify recurring patterns
 * 4. RULE UPDATE - Generate and apply new rules
 * 5. VALIDATION - Verify rulebook integrity
 * 6. AUDIT TRAIL - Log all changes
 */

export class RuleMiningPipeline {
    constructor() {
        this.miner = ruleMiner;
        this.initialized = false;
    }

    /**
     * Initialize pipeline
     */
    async initialize() {
        runtimeLog('🔧 Initializing Rule Mining Pipeline...');

        if (!this.miner.initialized) {
            await this.miner.initialize();
        }

        this.initialized = true;
        runtimeLog('✅ Pipeline ready');

        return { success: true };
    }

    /**
     * 🔥 MAIN PIPELINE ENTRY POINT
     * Process single conversation
     * 
     * @param {string} userMessage - User input
     * @param {string} agentResponse - AI response
     * @param {string} detectedMode - Mode used (core, popici, glitch)
     * @param {Object} emotionalAnalysis - Emotional analysis result
     * @returns {Object} Pipeline result
     */
    async processConversation(userMessage, agentResponse, detectedMode, emotionalAnalysis = {}) {
        if (!this.initialized) {
            throw new Error('Pipeline not initialized');
        }

        runtimeLog('🔄 Rule Mining Pipeline: Processing conversation...');

        const result = {
            success: false,
            signals: null,
            rulesUpdated: false,
            updateResult: null,
            errors: []
        };

        try {
            // STEP 1: CLEANUP
            const cleaned = await this.cleanup(userMessage, agentResponse);
            runtimeLog('   ✅ 1/6 Cleanup complete');

            // STEP 2: FEATURE EXTRACTION
            const signals = await this.miner.analyzeConversation(
                cleaned.userMessage,
                cleaned.agentResponse,
                detectedMode,
                emotionalAnalysis
            );
            result.signals = signals;
            runtimeLog('   ✅ 2/6 Feature extraction complete');

            // STEP 3: PATTERN DETECTION (built into updateRules)
            runtimeLog('   ⏭️  3/6 Pattern detection (deferred to update cycle)');

            // STEP 4: RULE UPDATE (every N conversations)
            const updateResult = await this.miner.updateRules();
            result.updateResult = updateResult;

            if (updateResult.updated) {
                runtimeLog('   ✅ 4/6 Rule update applied');
                result.rulesUpdated = true;

                // STEP 5: VALIDATION
                const validationResult = await this.validateRulebook();
                runtimeLog('   ✅ 5/6 Validation complete');

                if (!validationResult.valid) {
                    runtimeWarn('   ⚠️ Validation failed, rolling back...');
                    await this.rollback();
                    result.errors.push('Validation failed, changes rolled back');
                }

                // STEP 6: AUDIT TRAIL
                await this.auditTrail({
                    type: 'rule_update',
                    changes: updateResult.changes,
                    summary: updateResult.summary,
                    timestamp: Date.now()
                });
                runtimeLog('   ✅ 6/6 Audit trail logged');

            } else {
                runtimeLog(`   ⏭️  4/6 Rule update skipped (${updateResult.reason})`);
                runtimeLog('   ⏭️  5/6 Validation skipped (no changes)');
                runtimeLog('   ⏭️  6/6 Audit skipped (no changes)');
            }

            result.success = true;
            return result;

        } catch (err) {
            console.error('❌ Pipeline error:', err.message);
            result.errors.push(err.message);
            return result;
        }
    }

    /**
     * STEP 1: CLEANUP
     * Sanitize conversation data
     */
    async cleanup(userMessage, agentResponse) {
        // Remove excessive whitespace
        const cleanUser = userMessage.trim().replace(/\s+/g, ' ');
        const cleanAgent = agentResponse.trim().replace(/\s+/g, ' ');

        // Remove system prompts leakage (if any)
        const agentCleaned = cleanAgent
            .replace(/^(SP4_CORE|Glitchoslav|Popiči Kokot):\s*/i, '')
            .replace(/━━━━━.*?━━━━━/g, '');

        return {
            userMessage: cleanUser,
            agentResponse: agentCleaned
        };
    }

    /**
     * STEP 5: VALIDATION
     * Verify rulebook integrity
     */
    async validateRulebook() {
        const rulebook = this.miner.getRulebook();
        const errors = [];

        // Check structure
        if (!rulebook.personas) {
            errors.push('Missing personas section');
        }

        if (!rulebook.personas?.popici) {
            errors.push('Missing popici persona');
        }

        if (!rulebook.personas?.glitchoslav) {
            errors.push('Missing glitchoslav persona');
        }

        // Check dangerous patterns
        const dangerous = this.miner.autoTuning.dangerous_patterns || [];

        for (const persona of Object.keys(rulebook.personas || {})) {
            const triggers = rulebook.personas[persona].trigger_words || [];

            for (const trigger of triggers) {
                if (dangerous.some(d => trigger.includes(d))) {
                    errors.push(`Dangerous pattern detected in ${persona}: ${trigger}`);
                }
            }
        }

        // Check intensity thresholds
        if (rulebook.personas?.popici?.min_intensity !== undefined) {
            const intensity = rulebook.personas.popici.min_intensity;
            if (intensity < 0 || intensity > 1) {
                errors.push(`Invalid popici intensity: ${intensity} (must be 0-1)`);
            }
        }

        // Check metaphor density
        if (rulebook.personas?.glitchoslav?.poetic_density !== undefined) {
            const density = rulebook.personas.glitchoslav.poetic_density;
            if (density < 0 || density > 1) {
                errors.push(`Invalid glitch poetic density: ${density} (must be 0-1)`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * STEP 5.5: ROLLBACK
     * Restore from backup if validation fails
     */
    async rollback() {
        console.log('🔄 Rolling back to previous rulebook...');

        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const files = await fs.readdir(RULE_BACKUPS_DIR);

            // Find most recent backup
            const backups = files
                .filter(f => f.startsWith('rulebook_'))
                .sort()
                .reverse();

            if (backups.length === 0) {
                throw new Error('No backups available');
            }

            const latestBackup = path.join(RULE_BACKUPS_DIR, backups[0]);
            const rulebookPath = RULEBOOK_FILE;

            // Restore backup
            await fs.copyFile(latestBackup, rulebookPath);

            // Reload rulebook
            await this.miner.loadRulebook();

            console.log(`✅ Rolled back to: ${backups[0]}`);

        } catch (err) {
            console.error('❌ Rollback failed:', err.message);
            throw err;
        }
    }

    /**
     * STEP 6: AUDIT TRAIL
     * Log all rule changes
     */
    async auditTrail(entry) {
        try {
            const fs = await import('fs/promises');
            const auditPath = USER_BEHAVIOR_LOG;

            const logEntry = `[${new Date().toISOString()}] ${JSON.stringify(entry)}\n`;
            await fs.appendFile(auditPath, logEntry, 'utf8');

        } catch (err) {
            runtimeWarn('⚠️ Audit trail failed:', err.message);
        }
    }

    /**
     * Get pipeline statistics
     */
    getStats() {
        return {
            patternStats: this.miner.getPatternStats(),
            rulebook: this.miner.getRulebook(),
            updateCounter: this.miner.updateCounter,
            nextUpdate: this.miner.autoTuning.update_interval - this.miner.updateCounter
        };
    }

    /**
     * Force rule update (bypass interval check)
     */
    async forceUpdate() {
        console.log('🔥 Forcing rule update...');

        // Temporarily set counter to trigger update
        const oldCounter = this.miner.updateCounter;
        this.miner.updateCounter = this.miner.autoTuning.update_interval;

        const result = await this.miner.updateRules();

        // Restore counter if update failed
        if (!result.updated) {
            this.miner.updateCounter = oldCounter;
        }

        return result;
    }

    /**
     * Reset to default rules (emergency)
     */
    async resetToDefaults() {
        console.log('🚨 Resetting rulebook to defaults...');

        const defaultRulebook = this.miner.getDefaultRulebook();
        await this.miner.saveRulebook(defaultRulebook);

        // Clear pattern history
        this.miner.patternHistory = [];
        await this.miner.savePatternHistory();

        // Reload
        this.miner.rulebook = await this.miner.loadRulebook();

        console.log('✅ Reset complete');

        return { success: true };
    }
}

// Singleton instance
export const ruleMiningPipeline = new RuleMiningPipeline();

// CLI test
if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        const pipeline = new RuleMiningPipeline();
        await pipeline.initialize();

        console.log('\n📊 Pipeline Stats:');
        console.log(JSON.stringify(pipeline.getStats(), null, 2));

        // Test conversation processing
        const testResult = await pipeline.processConversation(
            'kokot, ta mi poraď, ako sa s tým vysporiadať?',
            'Popiči, bratu, máš to jasné - prestaň váhať a urob to. Bez servítok.',
            'popici',
            { intensity: 0.75, dominantEmotion: 'frustration' }
        );

        console.log('\n🔥 Test Result:');
        console.log(JSON.stringify(testResult, null, 2));

        // Force update test
        console.log('\n🔧 Testing forced update...');
        const updateResult = await pipeline.forceUpdate();
        console.log(JSON.stringify(updateResult, null, 2));

    })();
}
