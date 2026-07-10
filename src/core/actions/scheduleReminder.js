/**
 * ⏰ SCHEDULE_REMINDER Action Handler
 * 
 * Creates scheduled reminder using SP4 Scheduler.
 * Converts relative time ("2h", "1d") or absolute time (ISO8601) to cron expression.
 * 
 * @module actions/scheduleReminder
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-22
 */

import { addLogEntry } from '../../../memory.js';
import { initScheduler, registerCustomReminderJob } from '../scheduler.js';

/**
 * Parse relative time to cron expression or Date
 * 
 * Supported formats:
 * - "2h" → 2 hours from now
 * - "30m" → 30 minutes from now
 * - "1d" → 1 day from now
 * - "2025-11-22T15:00:00Z" → specific time (ISO8601)
 * 
 * @param {string} when - Time specification
 * @returns {Object} { cronExpr?: string, date?: Date, error?: string }
 */
function parseWhen(when) {
    // ISO8601 format - specific time
    if (/^\d{4}-\d{2}-\d{2}/.test(when)) {
        try {
            const date = new Date(when);
            if (isNaN(date.getTime())) {
                return { error: 'Invalid ISO8601 date format' };
            }

            // Convert to cron: minute hour day month *
            const minute = date.getMinutes();
            const hour = date.getHours();
            const day = date.getDate();
            const month = date.getMonth() + 1;

            const cronExpr = `${minute} ${hour} ${day} ${month} *`;
            return { cronExpr, date };
        } catch (err) {
            return { error: `Failed to parse date: ${err.message}` };
        }
    }

    // Relative time format (e.g., "2h", "30m", "1d")
    const relativeMatch = /^(\d+)([smhd])$/.exec(when);
    if (!relativeMatch) {
        return { error: 'Invalid time format (use ISO8601 or relative like "2h", "1d")' };
    }

    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2];

    const now = new Date();
    let targetDate;

    switch (unit) {
        case 's': // seconds
            targetDate = new Date(now.getTime() + amount * 1000);
            break;
        case 'm': // minutes
            targetDate = new Date(now.getTime() + amount * 60 * 1000);
            break;
        case 'h': // hours
            targetDate = new Date(now.getTime() + amount * 60 * 60 * 1000);
            break;
        case 'd': // days
            targetDate = new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
            break;
        default:
            return { error: `Unknown time unit: ${unit}` };
    }

    // Convert to cron expression
    const minute = targetDate.getMinutes();
    const hour = targetDate.getHours();
    const day = targetDate.getDate();
    const month = targetDate.getMonth() + 1;

    const cronExpr = `${minute} ${hour} ${day} ${month} *`;
    return { cronExpr, date: targetDate };
}

/**
 * Execute SCHEDULE_REMINDER action
 * 
 * @param {Object} payload - { when: string, payload: string, type?: string }
 * @param {Object} context - { persona: string, userMessage: string }
 * @returns {Promise<Object>} { success: boolean, result?: any, error?: string }
 */
export async function executeScheduleReminder(payload, context = {}) {
    const { when, payload: reminderText, type = 'reminder' } = payload;
    const { persona = 'unknown', userMessage = '' } = context;

    try {
        // Parse time specification
        const parsed = parseWhen(when);
        if (parsed.error) {
            return {
                success: false,
                error: parsed.error
            };
        }

        const { cronExpr, date } = parsed;

        // Generate unique job ID
        const timestamp = Date.now();
        const jobId = `reminder_${timestamp}_${persona}`;

        // Create reminder handler
        const reminderHandler = async () => {
            console.log(`🔔 [REMINDER] Triggered: ${reminderText}`);

            // Add reminder to memory as important note
            await addLogEntry(
                `[SCHEDULED REMINDER]`,
                `🔔 REMINDER:\n${reminderText}`,
                persona,
                {
                    type: 'scheduled_reminder',
                    importance: 7,
                    originalSchedule: when,
                    triggeredAt: new Date().toISOString(),
                    jobId
                }
            );

            console.log(`   📝 Reminder added to memory: ${reminderText.substring(0, 80)}...`);
        };

        // Register job in scheduler
        registerCustomReminderJob({
            id: jobId,
            cronExpr,
            handler: reminderHandler,
            meta: {
                userId: persona,
                text: reminderText,
                type,
                scheduledAt: new Date().toISOString(),
                targetDate: date.toISOString()
            }
        });

        // Ensure scheduler is initialized (idempotent)
        initScheduler();

        console.log(`⏰ [${persona.toUpperCase()}] Scheduled reminder: ${when}`);
        console.log(`   📅 Target time: ${date.toLocaleString()}`);
        console.log(`   🆔 Job ID: ${jobId}`);
        console.log(`   💬 Text: ${reminderText.substring(0, 80)}...`);

        return {
            success: true,
            result: {
                jobId,
                scheduledFor: date.toISOString(),
                scheduledForLocal: date.toLocaleString(),
                cronExpr,
                reminderText,
                persona
            }
        };
    } catch (error) {
        console.error(`❌ [SCHEDULE_REMINDER] Failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

export default executeScheduleReminder;
