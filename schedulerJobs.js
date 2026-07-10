/**
 * ┌─────────────────────────────────────────────┐
 * │  SP4 OS MODULE: schedulerJobs              │
 * │  Layer: Orchestration                      │
 * │  Role: Registry všetkých plánovaných jobov │
 * │  API: registerAllJobs()                    │
 * │  Dependencies: scheduler, consolidation    │
 * └─────────────────────────────────────────────┘
 * 
 * @module schedulerJobs
 * @author SP4 AUTO_CONSOLIDATION_v1
 * @date 2025-11-25
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { archiveRawLogs, consolidateWeek, runDaily, runMonthly, runQuarterly } from './consolidationEngine.js';
import { registerJob } from './scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EPOCH_LOG_PATH = path.join(__dirname, 'data', 'epochs.json');

function verboseLog(...args) {
    if (process.env.SP4_VERBOSE === '1' || process.env.SP4_DEBUG === 'true') {
        console.log(...args);
    }
}

/**
 * Log job execution to EPOCH_KEEPER
 * 
 * @param {string} jobName - Job identifier
 * @param {Object} data - Job execution data
 */
async function epochLog(jobName, data) {
    try {
        let epochs = { jobs: [] };
        try {
            const content = await fs.readFile(EPOCH_LOG_PATH, 'utf-8');
            epochs = JSON.parse(content);
        } catch (err) {
            // File doesn't exist yet, use empty structure
        }

        if (!Array.isArray(epochs.jobs)) {
            epochs.jobs = [];
        }

        epochs.jobs.push({
            jobName,
            timestamp: new Date().toISOString(),
            ...data
        });

        // Keep only last 1000 job records
        if (epochs.jobs.length > 1000) {
            epochs.jobs = epochs.jobs.slice(-1000);
        }

        await fs.writeFile(EPOCH_LOG_PATH, JSON.stringify(epochs, null, 2), 'utf-8');
    } catch (err) {
        console.error(`❌ epochLog failed: ${err.message}`);
    }
}

/**
 * Weekly consolidation job
 * 
 * Runs every Sunday at 03:33
 * Consolidates raw logs → chapters + archives processed files
 */
async function runWeeklyConsolidation() {
    const started = Date.now();
    console.log('\n🔄 [WEEKLY_CONSOLIDATION] Starting...');

    try {
        // 1. Consolidate week
        const result = await consolidateWeek();

        if (result.skipped) {
            console.log('   ℹ️  No data to consolidate this week');
            await epochLog('weekly_consolidation', {
                ok: true,
                duration_ms: Date.now() - started,
                skipped: true
            });
            return;
        }

        // 2. Archive raw logs
        const archiveResult = await archiveRawLogs(result.archiveList || []);

        const duration = Date.now() - started;

        // 3. Log to EPOCH_KEEPER
        await epochLog('weekly_consolidation', {
            ok: true,
            duration_ms: duration,
            chapter_id: result.chapterId,
            raw_count: result.rawCount,
            archived_count: archiveResult.archived,
            summary: result.summary
        });

        console.log(`✅ [WEEKLY_CONSOLIDATION] Done in ${duration}ms`);
        console.log(`   Chapter: ${result.chapterId}`);
        console.log(`   Processed: ${result.rawCount} entries`);
        console.log(`   Archived: ${archiveResult.archived} files`);

    } catch (err) {
        const duration = Date.now() - started;
        console.error(`❌ [WEEKLY_CONSOLIDATION] FAILED: ${err.message}`);

        await epochLog('weekly_consolidation', {
            ok: false,
            duration_ms: duration,
            error: String(err)
        });
    }
}

/**
 * Daily consolidation job wrapper
 * 
 * Runs every day at 00:00
 */
async function runDailyConsolidation() {
    const started = Date.now();
    console.log('\n🔄 [DAILY_CONSOLIDATION] Starting...');

    try {
        await runDaily();

        const duration = Date.now() - started;
        await epochLog('daily_consolidation', {
            ok: true,
            duration_ms: duration
        });

        console.log(`✅ [DAILY_CONSOLIDATION] Done in ${duration}ms`);
    } catch (err) {
        const duration = Date.now() - started;
        console.error(`❌ [DAILY_CONSOLIDATION] FAILED: ${err.message}`);

        await epochLog('daily_consolidation', {
            ok: false,
            duration_ms: duration,
            error: String(err)
        });
    }
}

/**
 * Monthly consolidation job wrapper
 * 
 * Runs on 1st day of month at 00:00
 */
async function runMonthlyConsolidation() {
    const started = Date.now();
    console.log('\n🔄 [MONTHLY_CONSOLIDATION] Starting...');

    try {
        await runMonthly();

        const duration = Date.now() - started;
        await epochLog('monthly_consolidation', {
            ok: true,
            duration_ms: duration
        });

        console.log(`✅ [MONTHLY_CONSOLIDATION] Done in ${duration}ms`);
    } catch (err) {
        const duration = Date.now() - started;
        console.error(`❌ [MONTHLY_CONSOLIDATION] FAILED: ${err.message}`);

        await epochLog('monthly_consolidation', {
            ok: false,
            duration_ms: duration,
            error: String(err)
        });
    }
}

/**
 * Quarterly pruning job wrapper
 * 
 * Runs on 1st day of each quarter at 00:00
 */
async function runQuarterlyPruning() {
    const started = Date.now();
    console.log('\n🔄 [QUARTERLY_PRUNING] Starting...');

    try {
        await runQuarterly();

        const duration = Date.now() - started;
        await epochLog('quarterly_pruning', {
            ok: true,
            duration_ms: duration
        });

        console.log(`✅ [QUARTERLY_PRUNING] Done in ${duration}ms`);
    } catch (err) {
        const duration = Date.now() - started;
        console.error(`❌ [QUARTERLY_PRUNING] FAILED: ${err.message}`);

        await epochLog('quarterly_pruning', {
            ok: false,
            duration_ms: duration,
            error: String(err)
        });
    }
}

/**
 * Register all SP4 consolidation jobs
 * 
 * Call BEFORE initScheduler() in startup sequence
 */
export function registerAllJobs() {
    verboseLog('📋 Registering SP4 consolidation jobs...');

    // Daily consolidation (00:00)
    registerJob({
        id: 'daily_consolidation',
        cron: '0 0 * * *',
        handler: runDailyConsolidation,
        description: 'Daily memory consolidation (raw → episodic)',
        enabled: true
    });

    // Weekly consolidation (Sunday 03:33)
    // 🔥 AUTO_CONSOLIDATION_v1: raw log → chapters + archive
    registerJob({
        id: 'weekly_consolidation',
        cron: '33 3 * * 0',
        handler: runWeeklyConsolidation,
        description: 'Weekly raw log → chapters + archiving (AUTO_CONSOLIDATION_v1)',
        enabled: true
    });

    // Monthly consolidation (1st day 00:00)
    registerJob({
        id: 'monthly_consolidation',
        cron: '0 0 1 * *',
        handler: runMonthlyConsolidation,
        description: 'Monthly memory consolidation (episodic → semantic)',
        enabled: true
    });

    // Quarterly pruning (1st day of quarter 00:00)
    registerJob({
        id: 'quarterly_pruning',
        cron: '0 0 1 */3 *',
        handler: runQuarterlyPruning,
        description: 'Quarterly memory pruning/archiving',
        enabled: true
    });

    verboseLog('✅ Registered 4 consolidation jobs (daily, weekly, monthly, quarterly)');
}
