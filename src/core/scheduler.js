/**
 * ⏰ SP4 SCHEDULER MODULE
 * 
 * Orchestrates scheduled jobs using node-cron.
 * 
 * Job types:
 * - daily_consolidation (memory compression)
 * - weekly_consolidation (seeds extraction)
 * - quarterly_prune (old data cleanup)
 * - custom_user_reminder (user-defined reminders)
 * 
 * @module scheduler
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-22
 * @version 0.11.6-alpha
 */

import fs from 'fs';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const LOGS_DIR = path.join(PROJECT_ROOT, 'logs');
const SCHEDULER_LOG = path.join(LOGS_DIR, 'scheduler.log');

/**
 * Active cron jobs registry (jobId → jobConfig + runtime info)
 */
const jobRegistry = new Map();

/**
 * Scheduler initialization flag
 */
let schedulerInitialized = false;

/**
 * Ensure logs directory exists
 */
function ensureLogsDir() {
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
}

/**
 * Log scheduler event
 * 
 * @param {string} line - log message
 */
function log(line) {
    ensureLogsDir();

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${line}\n`;

    fs.appendFile(SCHEDULER_LOG, logEntry, (err) => {
        if (err) console.error('❌ SCHEDULER LOG ERROR:', err);
    });

    // Also console log
    console.log('🕐 [SCHEDULER]', line);
}

/**
 * Register a scheduled job
 * 
 * DOES NOT start the cron - job is only registered.
 * Call initScheduler() to start all enabled jobs.
 * 
 * @param {Object} config - Job configuration
 * @param {string} config.id - Unique job identifier
 * @param {string} config.cron - Cron expression (e.g., '0 0 * * *')
 * @param {Function} config.handler - Async function to execute
 * @param {string} config.description - Human-readable description
 * @param {boolean} config.enabled - If false, job won't be scheduled
 * @param {Object} config.meta - Optional metadata
 */
export function registerJob(config) {
    const {
        id,
        cron: cronExpr,
        handler,
        description = '',
        enabled = true,
        meta = {}
    } = config;

    if (!id || !cronExpr || typeof handler !== 'function') {
        throw new Error(`registerJob: missing required fields (id, cron, handler)`);
    }

    // Validate cron expression
    if (!cron.validate(cronExpr)) {
        throw new Error(`Invalid cron expression for job ${id}: ${cronExpr}`);
    }

    // Check if job already exists
    if (jobRegistry.has(id)) {
        log(`⚠️ Job '${id}' už existuje – prepisujem konfiguráciu.`);
    }

    // Register job (NOT started yet)
    jobRegistry.set(id, {
        id,
        cronExpr,
        handler,
        description,
        enabled,
        meta,
        // runtime fields:
        task: null,
        lastRun: null,
        lastStatus: null,
        lastError: null
    });

    log(`📌 Registered job '${id}' (${cronExpr}) – ${description || 'bez popisu'}`);
}

/**
 * Initialize scheduler - start all enabled jobs
 * 
 * Call ONCE at app startup (after all jobs are registered).
 */
export function initScheduler() {
    if (schedulerInitialized) {
        log('⚠️ Scheduler už bol inicializovaný, preskakujem initScheduler()');
        return;
    }

    schedulerInitialized = true;
    log('🚀 Initializing SP4 Scheduler...');

    for (const job of jobRegistry.values()) {
        if (!job.enabled) {
            log(`⏸️ Job '${job.id}' je DISABLED – nebude plánovaný.`);
            continue;
        }

        try {
            job.task = cron.schedule(job.cronExpr, async () => {
                const start = Date.now();
                log(`▶️ Job '${job.id}' START`);

                try {
                    const maybePromise = job.handler();
                    if (maybePromise && typeof maybePromise.then === 'function') {
                        await maybePromise;
                    }
                    const duration = Date.now() - start;
                    job.lastRun = new Date();
                    job.lastStatus = 'OK';
                    job.lastError = null;
                    log(`✅ Job '${job.id}' DONE (${duration}ms)`);
                } catch (err) {
                    const duration = Date.now() - start;
                    job.lastRun = new Date();
                    job.lastStatus = 'ERROR';
                    job.lastError = err?.message || String(err);
                    log(`❌ Job '${job.id}' FAILED after ${duration}ms → ${job.lastError}`);
                }
            });

            // Auto-start job
            job.task.start();
            log(`⏱️ Scheduled job '${job.id}' (${job.cronExpr})`);

        } catch (err) {
            job.lastStatus = 'SCHEDULE_ERROR';
            job.lastError = err?.message || String(err);
            log(`❌ Failed to schedule job '${job.id}': ${job.lastError}`);
        }
    }

    log('✅ Scheduler active. All enabled jobs scheduled.');
}

/**
 * Disable job at runtime (stop cron, keep config)
 * 
 * @param {string} id - Job identifier
 * @returns {boolean} True if job was found and disabled
 */
export function disableJob(id) {
    const job = jobRegistry.get(id);
    if (!job) return false;
    if (job.task) job.task.stop();
    job.enabled = false;
    log(`⏸️ Job '${id}' DISABLED at runtime.`);
    return true;
}

/**
 * Enable job at runtime (restart cron if initialized)
 * 
 * @param {string} id - Job identifier
 * @returns {boolean} True if job was found and enabled
 */
export function enableJob(id) {
    const job = jobRegistry.get(id);
    if (!job) return false;
    job.enabled = true;
    if (job.task) {
        job.task.start();
    }
    log(`▶️ Job '${id}' ENABLED at runtime.`);
    return true;
}

/**
 * Get scheduler status (for debug, /status commands)
 * 
 * @returns {Object} Scheduler status with all jobs
 */
export function getSchedulerStatus() {
    const jobs = [];

    for (const job of jobRegistry.values()) {
        jobs.push({
            id: job.id,
            cron: job.cronExpr,
            description: job.description,
            enabled: job.enabled,
            lastRun: job.lastRun,
            lastStatus: job.lastStatus,
            lastError: job.lastError
        });
    }

    return {
        initialized: schedulerInitialized,
        jobCount: jobs.length,
        jobs
    };
}

/**
 * Display scheduler status on startup
 */
export function displayStatus() {
    console.log('\n⏰ ═══════════════════════════════════════════════════════════════');
    console.log('⏰ SCHEDULER STATUS');
    console.log('⏰ ═══════════════════════════════════════════════════════════════');

    const status = getSchedulerStatus();

    if (status.jobCount === 0) {
        console.log('   No jobs registered');
        console.log('⏰ ═══════════════════════════════════════════════════════════════\n');
        return;
    }

    for (const job of status.jobs) {
        const enabledIcon = job.enabled ? '✅' : '⏸️';
        console.log(`\n   ${enabledIcon} Job: ${job.id}`);
        console.log(`      Schedule: ${job.cron}`);
        console.log(`      Description: ${job.description || 'N/A'}`);

        if (job.lastRun) {
            const lastRunDate = new Date(job.lastRun).toLocaleString();
            const statusIcon = job.lastStatus === 'OK' ? '✅' : '❌';
            const statusText = job.lastStatus === 'OK' ? 'Success' : `Failed: ${job.lastError}`;
            console.log(`      Last run: ${lastRunDate} - ${statusIcon} ${statusText}`);
        } else {
            console.log(`      Last run: Never`);
        }
    }

    console.log('\n⏰ ═══════════════════════════════════════════════════════════════\n');
}

/**
 * Register default SP4 consolidation jobs
 * 
 * Call before initScheduler() to set up daily/weekly/monthly/quarterly jobs.
 * 
 * @param {Object} options
 * @param {Function} options.runDaily - Daily consolidation handler
 * @param {Function} options.runWeekly - Weekly consolidation handler
 * @param {Function} options.runMonthly - Monthly consolidation handler (optional)
 * @param {Function} options.runQuarterlyPrune - Quarterly pruning handler (optional)
 */
export function registerDefaultConsolidationJobs({
    runDaily,
    runWeekly,
    runMonthly,
    runQuarterlyPrune
}) {
    if (runDaily) {
        registerJob({
            id: 'daily_consolidation',
            cron: '0 0 * * *', // každý deň o 00:00
            handler: runDaily,
            description: 'Daily memory consolidation (SP4)'
        });
    }

    if (runWeekly) {
        registerJob({
            id: 'weekly_consolidation',
            cron: '0 0 * * 1', // pondelok 00:00
            handler: runWeekly,
            description: 'Weekly memory consolidation (SP4)'
        });
    }

    if (runMonthly) {
        registerJob({
            id: 'monthly_consolidation',
            cron: '0 0 1 * *', // prvý deň v mesiaci 00:00
            handler: runMonthly,
            description: 'Monthly memory consolidation (SP4)'
        });
    }

    if (runQuarterlyPrune) {
        registerJob({
            id: 'quarterly_prune',
            cron: '0 0 1 */3 *', // 1. deň každého 3. mesiaca
            handler: runQuarterlyPrune,
            description: 'Quarterly memory pruning/archiving (SP4)'
        });
    }
}

/**
 * Register custom user reminder job
 * 
 * Bridge between Action Layer (SCHEDULE_REMINDER) and Scheduler.
 * 
 * @param {Object} options
 * @param {string} options.id - Unique job ID (e.g., 'reminder_123_2025-11-22')
 * @param {string} options.cronExpr - Cron expression (already parsed from "when")
 * @param {Function} options.handler - What to do when reminder triggers
 * @param {Object} options.meta - Extra info (userId, text, etc.)
 */
export function registerCustomReminderJob({ id, cronExpr, handler, meta = {} }) {
    registerJob({
        id,
        cron: cronExpr,
        handler,
        description: `Custom user reminder (${meta?.userId || 'unknown user'})`,
        meta
    });
}
