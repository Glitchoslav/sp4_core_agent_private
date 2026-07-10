// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: policy.js                  │
// │  Layer: Core / Orchestration               │
// │  Role: Single Source of Truth for routing │
// │  API: resolvePolicy(options, env)          │
// │  Version: v1.4.0 (PHASE 2)                 │
// └─────────────────────────────────────────────┘

/**
 * @module policy
 * @description
 * Centralizované rozhodovanie o routing politike:
 * - Local-first default (production safe)
 * - Cloud opt-in cez explicitné flagy
 * - Unifikovaná logika pre tests, production, dev
 * 
 * **CORE PRINCIPLE**: Offline sovereignty - cloud je opt-in, nie default.
 */

/**
 * Resolve routing policy from options and environment.
 * 
 * @param {object} options - User-provided options
 * @param {boolean} [options.allowCloud] - Explicitly allow cloud LLMs
 * @param {boolean} [options.forceLocal] - Force local-only (test/dev)
 * @param {boolean} [options.forceCloud] - Force cloud-only (test/dev - HIGHEST PRIORITY)
 * @param {boolean} [options.bypassAutonomous] - Skip autonomous controller
 * @param {number} [options.cloudBudgetUsd] - Max cloud spend (future)
 * @param {object} [env=process.env] - Environment variables
 * 
 * @returns {object} Resolved policy
 * @returns {boolean} allowCloud - Cloud LLMs allowed
 * @returns {boolean} forceLocal - Force local-only routing
 * @returns {boolean} bypassAutonomous - Skip autonomous controller
 * @returns {number|undefined} cloudBudgetUsd - Max cloud spend
 * @returns {string} reason - Human-readable policy reason
 * @returns {string} route - Routing strategy identifier
 * 
 * @example
 * // Default (production safe)
 * const policy = resolvePolicy({});
 * // → { allowCloud: false, forceLocal: false, reason: "local-first-default", ... }
 * 
 * @example
 * // Test mode (force local)
 * const policy = resolvePolicy({ forceLocal: true });
 * // → { allowCloud: false, forceLocal: true, reason: "force-local-test", ... }
 * 
 * @example
 * // Cloud opt-in
 * const policy = resolvePolicy({ allowCloud: true });
 * // → { allowCloud: true, forceLocal: false, reason: "cloud-allowed-explicit", ... }
 */
export function resolvePolicy(options = {}, env = process.env) {
    // ========== PRIORITY 0: FORCE CLOUD (test-only override) ==========
    // CRITICAL: This is ONLY for testing cloud execution path
    if (options.forceCloud === true) {
        return {
            allowCloud: true,
            forceLocal: false,
            forceCloud: true, // Test-only flag
            bypassAutonomous: false, // Let autonomous decide cloud provider
            cloudBudgetUsd: options.cloudBudgetUsd || 0.05, // Small budget for test
            reason: 'force-cloud-test',
            route: 'force-cloud'
        };
    }

    // ========== PRIORITY 1: FORCE LOCAL (test/dev override) ==========
    if (options.forceLocal === true) {
        return {
            allowCloud: false,
            forceLocal: true,
            bypassAutonomous: options.bypassAutonomous ?? true, // Usually bypass with forceLocal
            cloudBudgetUsd: undefined,
            reason: 'force-local-test',
            route: 'force-local'
        };
    }

    // ========== PRIORITY 2: EXPLICIT CLOUD ALLOW ==========
    // User explicitly requests cloud (via options or env var)
    const explicitCloudAllow = options.allowCloud === true || env.SP4_ALLOW_CLOUD === 'true';

    if (explicitCloudAllow) {
        return {
            allowCloud: true,
            forceLocal: false,
            bypassAutonomous: options.bypassAutonomous ?? false, // Let autonomous decide
            cloudBudgetUsd: options.cloudBudgetUsd,
            reason: 'cloud-allowed-explicit',
            route: 'autonomous-cloud'
        };
    }

    // ========== PRIORITY 3: LOCAL-FIRST DEFAULT (production safe) ==========
    // Default policy: offline sovereignty, no cloud unless explicitly requested
    return {
        allowCloud: false,
        forceLocal: false,
        bypassAutonomous: options.bypassAutonomous ?? false,
        cloudBudgetUsd: undefined,
        reason: 'local-first-default',
        route: 'local-first'
    };
}

/**
 * Validate policy object structure.
 * 
 * @param {object} policy - Policy object to validate
 * @returns {boolean} True if valid
 * @throws {Error} If policy structure invalid
 */
export function validatePolicy(policy) {
    if (!policy || typeof policy !== 'object') {
        throw new Error('Policy must be an object');
    }

    const required = ['allowCloud', 'forceLocal', 'bypassAutonomous', 'reason', 'route'];
    for (const key of required) {
        if (!(key in policy)) {
            throw new Error(`Policy missing required field: ${key}`);
        }
    }

    if (typeof policy.allowCloud !== 'boolean') {
        throw new Error('policy.allowCloud must be boolean');
    }

    if (typeof policy.forceLocal !== 'boolean') {
        throw new Error('policy.forceLocal must be boolean');
    }

    if (policy.forceLocal && policy.allowCloud) {
        throw new Error('Policy conflict: forceLocal=true but allowCloud=true');
    }

    return true;
}

/**
 * Get human-readable policy summary for logging.
 * 
 * @param {object} policy - Resolved policy
 * @returns {string} Summary string
 */
export function formatPolicy(policy) {
    const parts = [
        `route=${policy.route}`,
        `allowCloud=${policy.allowCloud}`,
        `forceLocal=${policy.forceLocal}`,
        `reason=${policy.reason}`
    ];

    if (policy.cloudBudgetUsd) {
        parts.push(`budget=$${policy.cloudBudgetUsd}`);
    }

    return parts.join(', ');
}

// ========== EXPORTS ==========
export default {
    resolvePolicy,
    validatePolicy,
    formatPolicy
};
