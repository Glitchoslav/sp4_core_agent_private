/**
 * SP4 MEMORY SCHEDULER v1.0
 * Automated memory consolidation jobs
 * 
 * Implementuje Walterov Scheduler System:
 * - Hodinový tick pre kontrolu scheduled jobs
 * - Daily/Weekly/Monthly/Quarterly consolidation
 * - Pre-job backups
 * - Error handling + admin notifications
 * 
 * @module scheduler/memoryScheduler
 */

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';
import { runDaily, runMonthly, runQuarterly, runWeekly } from '../consolidationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let SCHEDULER_CONFIG = null;
let LAST_RUN = {
    daily: null,
    weekly: null,
    monthly: null,
    quarterly: null
};

/**
 * Load consolidation configuration
 */
function loadConfig() {
    if (SCHEDULER_CONFIG) return SCHEDULER_CONFIG;

    try {
        const configPath = path.join(__dirname, '../config/memory.consolidation.yml');
        const fileContents = fs.readFileSync(configPath, 'utf8');
        SCHEDULER_CONFIG = yaml.load(fileContents);
        return SCHEDULER_CONFIG;
    } catch (error) {
        console.error('❌ Failed to load memory.consolidation.yml:', error.message);
        return { consolidation: {} };
    }
}

/**
 * Initialize memory scheduler
 * @param {Object} options
 * @param {Function} options.logger - Logger function
 * @returns {NodeJS.Timeout} Interval ID for cleanup
 */
export function initMemoryScheduler({ logger = console.log } = {}) {
    const config = loadConfig();

    logger('\n🕐 Memory Scheduler initialized');
    logger('   Checking jobs every hour...\n');

    // Run check immediately on startup
    checkAndRunJobs(config, logger);

    // Set interval to check every hour (60 minutes)
    const intervalId = setInterval(() => {
        try {
            checkAndRunJobs(config, logger);
        } catch (err) {
            logger('❌ Memory scheduler error:', err);
            notifyAdmin('scheduler_error', err, logger);
        }
    }, 60 * 60 * 1000); // 1 hour

    return intervalId;
}

/**
 * Check and run scheduled jobs based on time
 */
function checkAndRunJobs(config, logger) {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDate();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const month = now.getMonth();

    // DAILY consolidation (00:00)
    if (config.consolidation?.daily?.enabled && hour === 0 && !ranToday('daily', now)) {
        logger('\n🌅 Running DAILY consolidation...');
        runDailyJob(config, logger);
    }

    // WEEKLY consolidation (Monday 00:00)
    if (config.consolidation?.weekly?.enabled && dayOfWeek === 1 && hour === 0 && !ranToday('weekly', now)) {
        logger('\n📅 Running WEEKLY consolidation...');
        runWeeklyJob(config, logger);
    }

    // MONTHLY consolidation (1st day 00:00)
    if (config.consolidation?.monthly?.enabled && day === 1 && hour === 0 && !ranToday('monthly', now)) {
        logger('\n📆 Running MONTHLY consolidation...');
        runMonthlyJob(config, logger);
    }

    // QUARTERLY pruning (Jan/Apr/Jul/Oct 1st, 00:00)
    const isQuarterStart = (month === 0 || month === 3 || month === 6 || month === 9) && day === 1;
    if (config.consolidation?.quarterly?.enabled && isQuarterStart && hour === 0 && !ranToday('quarterly', now)) {
        logger('\n🗂️  Running QUARTERLY pruning...');
        runQuarterlyJob(config, logger);
    }
}

/**
 * Check if job already ran today
 */
function ranToday(jobType, now) {
    const lastRun = LAST_RUN[jobType];
    if (!lastRun) return false;

    const lastRunDate = new Date(lastRun);
    return lastRunDate.toDateString() === now.toDateString();
}

/**
 * Run daily consolidation job
 */
async function runDailyJob(config, logger) {
    try {
        await runDaily(config.consolidation.daily);
        LAST_RUN.daily = new Date().toISOString();
        logger('   ✅ Daily consolidation complete');
    } catch (error) {
        logger('   ❌ Daily consolidation failed:', error.message);
        notifyAdmin('daily_consolidation', error, logger);
    }
}

/**
 * Run weekly consolidation job
 */
async function runWeeklyJob(config, logger) {
    try {
        await runWeekly(config.consolidation.weekly);
        LAST_RUN.weekly = new Date().toISOString();
        logger('   ✅ Weekly consolidation complete');
    } catch (error) {
        logger('   ❌ Weekly consolidation failed:', error.message);
        notifyAdmin('weekly_consolidation', error, logger);
    }
}

/**
 * Run monthly consolidation job
 */
async function runMonthlyJob(config, logger) {
    try {
        await runMonthly(config.consolidation.monthly);
        LAST_RUN.monthly = new Date().toISOString();
        logger('   ✅ Monthly consolidation complete');
    } catch (error) {
        logger('   ❌ Monthly consolidation failed:', error.message);
        notifyAdmin('monthly_consolidation', error, logger);
    }
}

/**
 * Run quarterly pruning job
 */
async function runQuarterlyJob(config, logger) {
    try {
        await runQuarterly(config.consolidation.quarterly);
        LAST_RUN.quarterly = new Date().toISOString();
        logger('   ✅ Quarterly pruning complete');
    } catch (error) {
        logger('   ❌ Quarterly pruning failed:', error.message);
        notifyAdmin('quarterly_pruning', error, logger);
    }
}

/**
 * Notify admin of job failure
 */
function notifyAdmin(jobType, error, logger) {
    const message = `⚠️ CONSOLIDATION FAILED: ${jobType}
Error: ${error.message}
Stack: ${error.stack}
Time: ${new Date().toISOString()}`;

    logger('\n🚨 ADMIN NOTIFICATION');
    logger(message);

    // TODO: Send email/notification to admin
    // For now, just log to console + file
    try {
        const logPath = path.join(__dirname, '../logs/scheduler-errors.log');
        fs.appendFileSync(logPath, message + '\n\n');
    } catch (logError) {
        logger('❌ Failed to write error log:', logError.message);
    }
}

/**
 * Shutdown scheduler (cleanup)
 */
export function shutdownScheduler(intervalId, logger = console.log) {
    if (intervalId) {
        clearInterval(intervalId);
        logger('\n🛑 Memory scheduler shutdown');
    }
}

/**
 * Manual trigger for testing
 */
export async function runManualConsolidation(jobType, logger = console.log) {
    const config = loadConfig();

    logger(`\n🔧 Manual consolidation: ${jobType}\n`);

    switch (jobType) {
        case 'daily':
            await runDailyJob(config, logger);
            break;
        case 'weekly':
            await runWeeklyJob(config, logger);
            break;
        case 'monthly':
            await runMonthlyJob(config, logger);
            break;
        case 'quarterly':
            await runQuarterlyJob(config, logger);
            break;
        default:
            logger('❌ Unknown job type:', jobType);
    }
}

export default {
    initMemoryScheduler,
    shutdownScheduler,
    runManualConsolidation
};
