/**
 * SP4 TRIGGER ENGINE v1.0
 * Proaktívny pattern detection a varovanie
 * 
 * Implementuje Walterov Trigger System:
 * - Burnout warning
 * - Self-attack pattern
 * - Tech overload
 * - Repetitive problems
 * - Fire mode activation
 * 
 * @module memory/triggerEngine
 */

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load trigger configuration
let TRIGGER_CONFIG = null;
const TRIGGER_HISTORY = new Map(); // Cooldown tracking

/**
 * Load triggers.yml configuration
 */
function loadTriggerConfig() {
    if (TRIGGER_CONFIG) return TRIGGER_CONFIG;

    try {
        const configPath = path.join(__dirname, '../config/triggers.yml');
        const fileContents = fs.readFileSync(configPath, 'utf8');
        TRIGGER_CONFIG = yaml.load(fileContents);
        return TRIGGER_CONFIG;
    } catch (error) {
        console.error('❌ Failed to load triggers.yml:', error.message);
        return { triggers: {}, settings: { enabled: false } };
    }
}

/**
 * Main trigger evaluation function
 * @param {Object} context
 * @param {string} context.message - Current user message
 * @param {Object} context.emotion - Emotion analysis { type, intensity }
 * @param {number} context.intensity - Message intensity 0-1
 * @param {Array} context.recentHistory - Last N messages
 * @param {Object} context.patterns - Detected patterns
 * @returns {Array<Object>} Triggered events
 */
export function evaluateTriggers({ message, emotion, intensity, recentHistory = [], patterns = {} }) {
    const config = loadTriggerConfig();

    if (!config.settings?.enabled) {
        return [];
    }

    const events = [];
    const now = Date.now();

    for (const [name, rule] of Object.entries(config.triggers)) {
        // Check cooldown
        if (isInCooldown(name, now, config.settings.cooldown_hours)) {
            continue;
        }

        // Evaluate rule
        if (matchesRule(rule, { message, emotion, intensity, recentHistory, patterns })) {
            events.push({
                name,
                action: rule.action,
                persona: rule.persona,
                message: rule.message,
                timestamp: new Date().toISOString()
            });

            // Set cooldown
            TRIGGER_HISTORY.set(name, now);

            // Max triggers per session limit
            if (events.length >= (config.settings.max_triggers_per_session || 3)) {
                break;
            }
        }
    }

    return events;
}

/**
 * Check if trigger is in cooldown period
 */
function isInCooldown(triggerName, now, cooldownHours = 24) {
    const lastTriggered = TRIGGER_HISTORY.get(triggerName);
    if (!lastTriggered) return false;

    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    return (now - lastTriggered) < cooldownMs;
}

/**
 * Match rule conditions against context
 */
function matchesRule(rule, context) {
    const { conditions } = rule;
    const { message, emotion, intensity, recentHistory, patterns } = context;

    // BURNOUT WARNING
    if (conditions.minSadness !== undefined) {
        if (emotion?.type !== 'negative' || emotion?.intensity < conditions.minSadness) {
            return false;
        }
        if (intensity < conditions.minIntensity) {
            return false;
        }
        // Check occurrences in recent history
        const occurrences = countPatternOccurrences(recentHistory, ['unavený', 'vyhorený', 'nevládzem']);
        if (occurrences < conditions.minOccurrences) {
            return false;
        }
    }

    // KEYWORD-BASED TRIGGERS (self-attack, fire mode)
    if (conditions.keywords && Array.isArray(conditions.keywords)) {
        const occurrences = countKeywordOccurrences(
            [message, ...recentHistory],
            conditions.keywords,
            conditions.withinMessages || 10
        );
        if (occurrences < (conditions.minOccurrences || 1)) {
            return false;
        }
    }

    // TECH OVERLOAD
    if (conditions.techQuestionsInRow !== undefined) {
        const techCount = countTechQuestions(recentHistory, conditions.techQuestionsInRow);
        if (techCount < conditions.techQuestionsInRow) {
            return false;
        }
    }

    // REPETITIVE PROBLEM
    if (conditions.sameTopicCount !== undefined) {
        const repetitions = detectTopicRepetition(recentHistory, conditions.withinMessages || 15);
        if (repetitions < conditions.sameTopicCount) {
            return false;
        }
    }

    // INTENSITY THRESHOLD (for fire mode)
    if (conditions.intensity !== undefined) {
        if (intensity < conditions.intensity) {
            return false;
        }
    }

    // LONG SILENCE
    if (conditions.daysSinceLastMessage !== undefined) {
        const daysSince = patterns.daysSinceLastMessage || 0;
        if (daysSince < conditions.daysSinceLastMessage) {
            return false;
        }
    }

    return true;
}

/**
 * Count pattern occurrences in recent history
 */
function countPatternOccurrences(history, patterns) {
    let count = 0;
    const recentMessages = history.slice(-10).map(h => h.user || h.input || '').join(' ').toLowerCase();

    for (const pattern of patterns) {
        if (recentMessages.includes(pattern.toLowerCase())) {
            count++;
        }
    }

    return count;
}

/**
 * Count keyword occurrences across messages
 */
function countKeywordOccurrences(messages, keywords, withinMessages) {
    const relevantMessages = messages.slice(-withinMessages);
    let count = 0;

    for (const msg of relevantMessages) {
        const text = (typeof msg === 'string' ? msg : msg.user || msg.input || '').toLowerCase();
        for (const keyword of keywords) {
            if (text.includes(keyword.toLowerCase())) {
                count++;
                break; // Count once per message
            }
        }
    }

    return count;
}

/**
 * Count consecutive technical questions
 */
function countTechQuestions(history, limit) {
    const techPatterns = /\b(kód|code|bug|error|chyba|function|modul|systém|architektúra|implementácia)\b/i;
    let count = 0;

    const recent = history.slice(-limit);
    for (const msg of recent) {
        const text = msg.user || msg.input || '';
        if (techPatterns.test(text)) {
            count++;
        } else {
            break; // Not consecutive
        }
    }

    return count;
}

/**
 * Detect topic repetition
 */
function detectTopicRepetition(history, withinMessages) {
    const topicExtractors = [
        /\b(SP4|komunita|manifest)\b/i,
        /\b(peniaze|dlh|finančn)\b/i,
        /\b(práca|job|burnout)\b/i,
        /\b(AI|model|kód)\b/i
    ];

    const topics = new Map();
    const recent = history.slice(-withinMessages);

    for (const msg of recent) {
        const text = msg.user || msg.input || '';
        for (let i = 0; i < topicExtractors.length; i++) {
            if (topicExtractors[i].test(text)) {
                topics.set(i, (topics.get(i) || 0) + 1);
            }
        }
    }

    return Math.max(...topics.values(), 0);
}

/**
 * Handle triggered event
 * @param {Object} event - Triggered event
 * @param {Function} logger - Logger function
 */
export function handleTriggerEvent(event, logger = console.log) {
    logger(`\n⚠️ TRIGGER ACTIVATED: ${event.name}`);
    logger(`   Action: ${event.action}`);
    logger(`   Persona: ${event.persona}`);

    if (event.message) {
        logger(`   Message: ${event.message}`);
    }

    return event;
}

/**
 * Clear trigger cooldown (for testing or manual reset)
 */
export function clearTriggerCooldown(triggerName) {
    if (triggerName) {
        TRIGGER_HISTORY.delete(triggerName);
    } else {
        TRIGGER_HISTORY.clear();
    }
}

export default {
    evaluateTriggers,
    handleTriggerEvent,
    clearTriggerCooldown
};
