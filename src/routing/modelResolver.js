// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: modelResolver              │
// │  Layer: Core / Routing                     │
// │  Role: classify tier -> lokalny model      │
// │  API: resolveTierModel(tier, ctx)          │
// └─────────────────────────────────────────────┘

/**
 * Prepojenie classify.js <-> localModelRegistry v ADVISORY rezime.
 *
 * Served model je VZDY PRIMARY_MODEL. Registry len radi — divergencia
 * (registry odporuca iny model) sa loguje, nikdy sa neservuje.
 * Rovnako chybajuci PRIMARY_MODEL sa len hlasi (wouldFallbackTo), neprepina.
 * Promocia registry odporucania vyzaduje explicitny productionThreshold
 * + viditelny .env commit — nie tento modul.
 */

import { PRIMARY_MODEL, FALLBACK_MODEL } from '../config/models.js';
import {
    REGISTRY_MODE,
    buildRuntimeModelStates,
    resolveModelForRole,
} from '../core/localModelRegistry.js';
import { ollamaHealthCheck } from '../llm/ollamaClient.js';

const TIER_ROLES = Object.freeze({ local: 'general' });

const REFRESH_MS = process.env.SP4_MODEL_TAGS_REFRESH_MS !== undefined
    ? Number(process.env.SP4_MODEL_TAGS_REFRESH_MS)
    : 5 * 60 * 1000;

let runtimeStates = buildRuntimeModelStates(null);
let installedModels = null; // null = nevieme (ziadny autoritativny /api/tags snapshot)
let refreshedAt = 0;
let refreshTimer = null;
let lastLoggedSignature = null;

/**
 * Ulozi /api/tags snapshot (tvar ako ollamaHealthCheck()). Volane z health checku
 * v llmLocal (scheduler kazdych 5 min) aj z refreshRuntimeStates().
 */
export function recordTagsSnapshot(snapshot) {
    runtimeStates = buildRuntimeModelStates(snapshot);
    installedModels = snapshot?.healthy === true && Array.isArray(snapshot.models)
        ? new Set(snapshot.models.map((m) => m.name).filter(Boolean))
        : null;
    refreshedAt = Date.now();
}

export async function refreshRuntimeStates({ healthCheck = ollamaHealthCheck, force = false } = {}) {
    if (!force && refreshedAt && Date.now() - refreshedAt < REFRESH_MS) return runtimeStates;
    try {
        recordTagsSnapshot(await healthCheck());
    } catch {
        recordTagsSnapshot(null);
    }
    return runtimeStates;
}

function ensureBackgroundRefresh() {
    if (refreshTimer || !(REFRESH_MS > 0)) return;
    refreshTimer = setInterval(() => {
        refreshRuntimeStates().catch(() => {});
    }, REFRESH_MS);
    refreshTimer.unref?.();
}

export function resetModelResolverCache() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
    runtimeStates = buildRuntimeModelStates(null);
    installedModels = null;
    refreshedAt = 0;
    lastLoggedSignature = null;
}

/**
 * @param {string} tier - classify engine: 'local' | 'budget' | 'quality'
 * @param {object} [ctx]
 * @returns {{ model: string|undefined, tier, role, mode, recommendedModel, divergence,
 *             primaryInstalled, wouldFallbackTo, registryDecision }}
 */
export function resolveTierModel(tier, ctx = {}) {
    const role = TIER_ROLES[tier];
    if (!role) {
        return { model: undefined, tier, role: null, mode: REGISTRY_MODE.ADVISORY, divergence: false };
    }

    if (ctx.backgroundRefresh !== false) ensureBackgroundRefresh();

    const legacyModel = PRIMARY_MODEL;
    const registryDecision = resolveModelForRole(role, {
        runtimeStates,
        legacyModel,
        mode: REGISTRY_MODE.ADVISORY, // natvrdo — SP4_MODEL_REGISTRY_MODE tu neplati
    });

    const recommendedModel = registryDecision.recommendedModel || null;
    const divergence = Boolean(recommendedModel && recommendedModel !== legacyModel);
    const primaryInstalled = installedModels ? installedModels.has(legacyModel) : null;
    const wouldFallbackTo = primaryInstalled === false ? FALLBACK_MODEL : null;

    const signature = `${tier}|${recommendedModel}|${primaryInstalled}`;
    if ((divergence || wouldFallbackTo) && signature !== lastLoggedSignature) {
        lastLoggedSignature = signature;
        console.log([
            '[MODEL-RESOLVER]',
            `tier=${tier}`,
            `role=${role}`,
            `mode=${REGISTRY_MODE.ADVISORY}`,
            `served=${legacyModel}`,
            `recommended=${recommendedModel || 'none'}`,
            `qualification=${registryDecision.qualification || 'none'}`,
            `primaryInstalled=${primaryInstalled}`,
            ...(wouldFallbackTo ? [`wouldFallbackTo=${wouldFallbackTo}`] : []),
            'action=log_only',
        ].join(' '));
    }

    return {
        model: legacyModel,
        tier,
        role,
        mode: REGISTRY_MODE.ADVISORY,
        recommendedModel,
        divergence,
        primaryInstalled,
        wouldFallbackTo,
        registryDecision,
    };
}
