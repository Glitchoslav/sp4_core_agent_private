/**
 * ┌─────────────────────────────────────────────┐
 * │  SP4 OS CONFIG: paths                      │
 * │  Layer: Data                               │
 * │  Role: Centrálne cesty pre dáta            │
 * │  API: RAW_LOG_DIR, CHAPTERS_DIR, etc.      │
 * │  Dependencies: žiadne                      │
 * └─────────────────────────────────────────────┘
 * 
 * @module config/paths
 * @author SP4 AUTO_CONSOLIDATION_v1
 * @date 2025-11-25
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const hasEnv = (name) => Object.prototype.hasOwnProperty.call(process.env, name);

function resolveExplicitPath(name) {
    const rawValue = process.env[name];
    if (typeof rawValue !== "string" || rawValue.trim() === "") {
        throw new Error(name + " must be a non-empty path");
    }
    return path.resolve(rawValue);
}

function assertInsideRuntime(candidate, label, runtimeRoot) {
    if (!runtimeRoot) return candidate;
    const relative = path.relative(runtimeRoot, candidate);
    if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
        throw new Error(label + " escapes SP4_RUNTIME_ROOT: " + candidate);
    }
    return candidate;
}

function resolveConfiguredPath(envName, fallback, runtimeRoot) {
    const resolved = hasEnv(envName) ? resolveExplicitPath(envName) : path.resolve(fallback);
    return assertInsideRuntime(resolved, envName, runtimeRoot);
}

const RUNTIME_ROOT = hasEnv("SP4_RUNTIME_ROOT") ? resolveExplicitPath("SP4_RUNTIME_ROOT") : null;
if (RUNTIME_ROOT) {
    fs.mkdirSync(RUNTIME_ROOT, { recursive: true });
    const stat = fs.statSync(RUNTIME_ROOT);
    if (!stat.isDirectory()) throw new Error("SP4_RUNTIME_ROOT is not a directory: " + RUNTIME_ROOT);
    fs.accessSync(RUNTIME_ROOT, fs.constants.R_OK | fs.constants.W_OK);
}

const defaultDataDir = RUNTIME_ROOT ? path.join(RUNTIME_ROOT, "data") : path.join(PROJECT_ROOT, "data");
export const DATA_DIR = hasEnv("SP4_DATA_ROOT")
    ? assertInsideRuntime(resolveExplicitPath("SP4_DATA_ROOT"), "SP4_DATA_ROOT", RUNTIME_ROOT)
    : path.resolve(defaultDataDir);

if (RUNTIME_ROOT && hasEnv("SP4_DATA_ROOT")) {
    const expectedDataDir = path.resolve(RUNTIME_ROOT, "data");
    if (DATA_DIR !== expectedDataDir) {
        throw new Error("SP4_DATA_ROOT must equal " + expectedDataDir + " when SP4_RUNTIME_ROOT is set");
    }
}

export const MEMORY_FILE = assertInsideRuntime(path.join(DATA_DIR, "memory.json"), "MEMORY_FILE", RUNTIME_ROOT);
export const IDENTITY_FILE = assertInsideRuntime(path.join(DATA_DIR, "identity.json"), "IDENTITY_FILE", RUNTIME_ROOT);
export const EPOCH_FILE = resolveConfiguredPath("SP4_EPOCH_LOG", path.join(DATA_DIR, "epochs.json"), RUNTIME_ROOT);
export const IMMUNE_LOG_FILE = assertInsideRuntime(path.join(DATA_DIR, "immune_log.jsonl"), "IMMUNE_LOG_FILE", RUNTIME_ROOT);
export const AUTONOMOUS_LEARNING_FILE = assertInsideRuntime(path.join(DATA_DIR, "autonomous_learning.json"), "AUTONOMOUS_LEARNING_FILE", RUNTIME_ROOT);
export const QUARANTINE_FILE = assertInsideRuntime(path.join(DATA_DIR, "quarantine.json"), "QUARANTINE_FILE", RUNTIME_ROOT);
export const MEMORY_HIERARCHY_DIR = assertInsideRuntime(path.join(DATA_DIR, "memory"), "MEMORY_HIERARCHY_DIR", RUNTIME_ROOT);
export const SNIPPETS_DIR = assertInsideRuntime(path.join(DATA_DIR, "snippets"), "SNIPPETS_DIR", RUNTIME_ROOT);

export const LOGS_DIR = assertInsideRuntime(path.join(RUNTIME_ROOT || PROJECT_ROOT, "logs"), "LOGS_DIR", RUNTIME_ROOT);
export const AUTONOMOUS_DECISIONS_FILE = assertInsideRuntime(path.join(LOGS_DIR, "autonomous_decisions.jsonl"), "AUTONOMOUS_DECISIONS_FILE", RUNTIME_ROOT);
export const SCHEDULER_LOG_FILE = assertInsideRuntime(path.join(LOGS_DIR, "scheduler.log"), "SCHEDULER_LOG_FILE", RUNTIME_ROOT);
export const AGENT_LOG_FILE = assertInsideRuntime(path.join(LOGS_DIR, "agent.log"), "AGENT_LOG_FILE", RUNTIME_ROOT);
export const AIOS_COST_LOG_FILE = assertInsideRuntime(path.join(LOGS_DIR, "aios_costs.jsonl"), "AIOS_COST_LOG_FILE", RUNTIME_ROOT);

export const RULES_DIR = assertInsideRuntime(path.join(RUNTIME_ROOT || PROJECT_ROOT, "rules"), "RULES_DIR", RUNTIME_ROOT);
export const PATTERN_HISTORY_FILE = assertInsideRuntime(path.join(RULES_DIR, "pattern-history.json"), "PATTERN_HISTORY_FILE", RUNTIME_ROOT);
export const RULEBOOK_FILE = assertInsideRuntime(path.join(RULES_DIR, "rulebook.yml"), "RULEBOOK_FILE", RUNTIME_ROOT);
export const AUTO_TUNING_FILE = assertInsideRuntime(path.join(RULES_DIR, "auto-tuning.yml"), "AUTO_TUNING_FILE", RUNTIME_ROOT);
export const USER_BEHAVIOR_LOG = assertInsideRuntime(path.join(RULES_DIR, "user-behavior.log"), "USER_BEHAVIOR_LOG", RUNTIME_ROOT);
export const RULE_BACKUPS_DIR = assertInsideRuntime(path.join(RULES_DIR, "backups"), "RULE_BACKUPS_DIR", RUNTIME_ROOT);

/**
 * RAW LOG DIRECTORY
 * Nefiltrovaný log všetkých interakcií (čierna skrinka systému)
 */
export const RAW_LOG_DIR = resolveConfiguredPath("SP4_RAW_LOG_DIR", path.join(DATA_DIR, "raw_log"), RUNTIME_ROOT);

/**
 * CHAPTERS DIRECTORY
 * Týždenné / mesačné zhrnutia z raw logov (AI summary)
 */
export const CHAPTERS_DIR = resolveConfiguredPath("SP4_CHAPTERS_DIR", path.join(DATA_DIR, "chapters"), RUNTIME_ROOT);

/**
 * ARCHIVE DIRECTORY
 * Spracované raw logy (po konsolidácii)
 */
export const ARCHIVE_DIR = resolveConfiguredPath("SP4_ARCHIVE_DIR", path.join(DATA_DIR, "archive_raw"), RUNTIME_ROOT);

/**
 * SEEDS DIRECTORY
 * Kľúčové momenty extraované z chapters (long-term memory)
 */
export const SEEDS_DIR = resolveConfiguredPath("SP4_SEEDS_DIR", path.join(DATA_DIR, "seeds"), RUNTIME_ROOT);

/**
 * EPOCH LOG
 * Denník autonómnych jobov (scheduler, konsolidácia, atď.)
 */
export const EPOCH_LOG_PATH = EPOCH_FILE;

/**
 * Všetky cesty v jednom objekte (pre debugging / logging)
 */
export const ALL_PATHS = {
    ROOT: DATA_DIR,
    RUNTIME_ROOT,
    PROJECT_ROOT,
    DATA_DIR,
    MEMORY_FILE,
    IDENTITY_FILE,
    EPOCH_FILE,
    IMMUNE_LOG_FILE,
    AUTONOMOUS_LEARNING_FILE,
    QUARANTINE_FILE,
    MEMORY_HIERARCHY_DIR,
    SNIPPETS_DIR,
    LOGS_DIR,
    AUTONOMOUS_DECISIONS_FILE,
    SCHEDULER_LOG_FILE,
    AGENT_LOG_FILE,
    AIOS_COST_LOG_FILE,
    RULES_DIR,
    PATTERN_HISTORY_FILE,
    RULEBOOK_FILE,
    AUTO_TUNING_FILE,
    USER_BEHAVIOR_LOG,
    RULE_BACKUPS_DIR,
    RAW_LOG_DIR,
    CHAPTERS_DIR,
    ARCHIVE_DIR,
    SEEDS_DIR,
    EPOCH_LOG_PATH
};
