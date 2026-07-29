// ┌─────────────────────────────────────────────┐
// │  SP4 CONSTITUTION LOADER                    │
// │  Layer: Core / Governance                   │
// │  Role: can()/mayEgress() — single source    │
// │        of truth for governed decisions      │
// │  Design: C:\SP4\plans\constitution-v1-plan.md│
// │          sekcie 1, 3, 14.5 (DEC-001..004)   │
// └─────────────────────────────────────────────┘
//
// Fail-closed contract (binding): any unknown action_type, unknown persona,
// unknown actorType, unknown category, unknown sink, missing/false
// policyAllowCloud, or a manifest that fails to load/validate — all resolve
// to BLOCK. There is no fail-open branch anywhere in this file.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MANIFEST_PATH = process.env.SP4_CONSTITUTION_PATH
    || path.resolve(__dirname, '../../sp4.constitution.yaml');

const DECISIONS_LOG_PATH = process.env.SP4_CONSTITUTION_LOG_PATH
    || path.resolve(__dirname, '../../logs/constitution_decisions.jsonl');

const VALID_GATES = new Set(['auto', 'never']);
const VALID_REVERSIBILITY = new Set(['full', 'partial', 'none']);
const VALID_ACTOR_TYPES = new Set(['interactive-human', 'automation', 'agent', 'subprocess']);

function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
    }
    return value;
}

function validateManifest(m) {
    const requiredTop = [
        'schema_version', 'metadata', 'git_baseline', 'external_sinks',
        'data_categories', 'egress_policies', 'action_capabilities',
        'admin_privileges', 'reversibility_defaults', 'emergency_rules',
        'exit_export_paths'
    ];
    for (const key of requiredTop) {
        if (!(key in m)) {
            throw new Error(`constitution manifest missing required field: ${key}`);
        }
    }
    if (!Array.isArray(m.action_capabilities)) {
        throw new Error('action_capabilities must be an array');
    }
    for (const row of m.action_capabilities) {
        if (!row.action_type) throw new Error('action_capabilities row missing action_type');
        if (!VALID_GATES.has(row.gate)) throw new Error(`action_capabilities[${row.action_type}] invalid gate: ${row.gate}`);
        if (!Array.isArray(row.allowed_personas)) throw new Error(`action_capabilities[${row.action_type}] missing allowed_personas array`);
        if (!VALID_REVERSIBILITY.has(row.reversibility)) throw new Error(`action_capabilities[${row.action_type}] invalid reversibility`);
    }
    if (!Array.isArray(m.egress_policies)) {
        throw new Error('egress_policies must be an array');
    }
    for (const row of m.egress_policies) {
        if (!row.category || !row.sink) throw new Error('egress_policies row missing category/sink');
        if (typeof row.allow !== 'boolean') throw new Error(`egress_policies[${row.category}->${row.sink}] allow must be boolean`);
        if (row.allow === true && !VALID_GATES.has(row.gate)) {
            throw new Error(`egress_policies[${row.category}->${row.sink}] allow:true requires valid gate`);
        }
    }
    if (!Array.isArray(m.external_sinks)) {
        throw new Error('external_sinks must be an array');
    }
    for (const row of m.external_sinks) {
        if (!row.sink_id || !row.host) throw new Error('external_sinks row missing sink_id/host');
        if (!VALID_REVERSIBILITY.has(row.reversibility) && row.reversibility !== 'n/a') {
            throw new Error(`external_sinks[${row.sink_id}] invalid reversibility`);
        }
    }
    if (!Array.isArray(m.data_categories)) {
        throw new Error('data_categories must be an array');
    }
    for (const row of m.data_categories) {
        if (!row.id) throw new Error('data_categories row missing id');
    }
    if (!m.reversibility_defaults || m.reversibility_defaults.unspecified !== 'none') {
        throw new Error('reversibility_defaults.unspecified must be "none" (fail-closed default)');
    }
}

function loadManifestFromDisk() {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const parsed = yaml.load(raw);
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('constitution manifest did not parse to an object');
    }
    validateManifest(parsed);
    return deepFreeze(parsed);
}

let manifest = null;
let manifestError = null;

try {
    manifest = loadManifestFromDisk();
} catch (err) {
    manifestError = err;
    manifest = null;
    // Deliberately no throw here — a crashed import would take down the whole
    // process. Fail-closed instead means: process keeps running, but every
    // can()/mayEgress() call below returns BLOCK for as long as manifest is null.
    console.error(`[constitution] manifest failed to load — every governed decision will BLOCK: ${err.message}`);
}

function logDecision(entry) {
    try {
        fs.mkdirSync(path.dirname(DECISIONS_LOG_PATH), { recursive: true });
        // No prompt/message content is ever included here — structural fields only.
        fs.appendFileSync(
            DECISIONS_LOG_PATH,
            JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n'
        );
    } catch (_) {
        // Logging must never throw or block a decision path.
    }
}

/**
 * can(actionType, ctx) — governs whether an action (e.g. OPEN_URL) may execute.
 * @param {string} actionType
 * @param {{persona: string, actorType: string, requestId?: string}} ctx
 * @returns {{decision: "ALLOW"|"BLOCK", reason: string, matchedRule: string|null}}
 */
export function can(actionType, ctx = {}) {
    const { persona, actorType, requestId } = ctx;
    const base = {
        check: 'action',
        actionType: actionType || null,
        persona: persona || null,
        actorType: actorType || null,
        requestId: requestId || null
    };

    if (!manifest) {
        const result = { decision: 'BLOCK', reason: 'manifest_unavailable', matchedRule: null };
        logDecision({ ...base, ...result });
        return result;
    }

    if (!actorType || !VALID_ACTOR_TYPES.has(actorType)) {
        const result = { decision: 'BLOCK', reason: 'unknown_actor_type', matchedRule: null };
        logDecision({ ...base, ...result });
        return result;
    }

    if (!persona || typeof persona !== 'string' || persona.trim() === '') {
        const result = { decision: 'BLOCK', reason: 'unknown_persona', matchedRule: null };
        logDecision({ ...base, ...result });
        return result;
    }

    const rule = manifest.action_capabilities.find((r) => r.action_type === actionType);
    if (!rule) {
        const result = { decision: 'BLOCK', reason: 'unknown_action_type', matchedRule: null };
        logDecision({ ...base, ...result });
        return result;
    }

    if (rule.gate === 'never') {
        const result = { decision: 'BLOCK', reason: 'gate_never', matchedRule: rule.action_type };
        logDecision({ ...base, ...result });
        return result;
    }

    if (!rule.allowed_personas.includes(persona)) {
        const result = { decision: 'BLOCK', reason: 'persona_not_allowed', matchedRule: rule.action_type };
        logDecision({ ...base, ...result });
        return result;
    }

    const result = { decision: 'ALLOW', reason: 'gate_auto_persona_match', matchedRule: rule.action_type };
    logDecision({ ...base, ...result });
    return result;
}

/**
 * mayEgress(category, sink, ctx) — governs whether data may leave the node to
 * an external sink. DEC-001: ctx.policyAllowCloud is checked first, before the
 * manifest is even consulted — resolvePolicy()'s runtime result and the static
 * manifest are two independent layers, both must allow.
 * @param {string} category
 * @param {string} sink
 * @param {{actorType: string, policyAllowCloud: boolean|undefined, requestId?: string, callerFile?: string}} ctx
 * @returns {{decision: "ALLOW"|"BLOCK", reason: string, matchedPolicy: object|null}}
 */
export function mayEgress(category, sink, ctx = {}) {
    const { actorType, policyAllowCloud, requestId, callerFile } = ctx;
    const base = {
        check: 'egress',
        category: category || null,
        sink: sink || null,
        actorType: actorType || null,
        requestId: requestId || null,
        callerFile: callerFile || null
    };

    if (!manifest) {
        const result = { decision: 'BLOCK', reason: 'manifest_unavailable', matchedPolicy: null };
        logDecision({ ...base, ...result });
        return result;
    }

    // DEC-001: checked first, strictest gate. Distinguish "explicitly false"
    // from "caller forgot to pass policy at all" for debuggability — both BLOCK.
    if (policyAllowCloud === undefined) {
        const result = { decision: 'BLOCK', reason: 'policy_context_missing', matchedPolicy: null };
        logDecision({ ...base, ...result });
        return result;
    }
    if (policyAllowCloud !== true) {
        const result = { decision: 'BLOCK', reason: 'policy_disallows_cloud', matchedPolicy: null };
        logDecision({ ...base, ...result });
        return result;
    }

    if (!actorType || !VALID_ACTOR_TYPES.has(actorType)) {
        const result = { decision: 'BLOCK', reason: 'unknown_actor_type', matchedPolicy: null };
        logDecision({ ...base, ...result });
        return result;
    }

    const sinkExists = manifest.external_sinks.some((s) => s.sink_id === sink);
    if (!sinkExists) {
        const result = { decision: 'BLOCK', reason: 'unknown_sink', matchedPolicy: null };
        logDecision({ ...base, ...result });
        return result;
    }

    const categoryExists = manifest.data_categories.some((c) => c.id === category);
    if (!categoryExists) {
        const result = { decision: 'BLOCK', reason: 'unknown_category', matchedPolicy: null };
        logDecision({ ...base, ...result });
        return result;
    }

    const policyRow = manifest.egress_policies.find((p) => p.category === category && p.sink === sink);
    if (!policyRow) {
        const result = { decision: 'BLOCK', reason: 'no_policy_for_pair', matchedPolicy: null };
        logDecision({ ...base, ...result });
        return result;
    }

    if (policyRow.allow !== true) {
        const result = { decision: 'BLOCK', reason: 'policy_denies', matchedPolicy: policyRow };
        logDecision({ ...base, ...result });
        return result;
    }

    if (policyRow.gate !== 'auto') {
        const result = { decision: 'BLOCK', reason: 'allow_true_but_gate_never', matchedPolicy: policyRow };
        logDecision({ ...base, ...result });
        return result;
    }

    const result = { decision: 'ALLOW', reason: 'policy_allows_auto', matchedPolicy: policyRow };
    logDecision({ ...base, ...result });
    return result;
}

export function isManifestLoaded() {
    return manifest !== null;
}

export function getManifestLoadError() {
    return manifestError;
}

export class ConstitutionalBlockError extends Error {
    constructor(reason, details = {}) {
        super(`Constitutional block: ${reason}`);
        this.name = 'ConstitutionalBlockError';
        this.reason = reason;
        this.details = details;
    }
}

export default { can, mayEgress, isManifestLoaded, getManifestLoadError, ConstitutionalBlockError };
