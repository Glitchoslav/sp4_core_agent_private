// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: providerPolicy             │
// │  Layer: Core / LLM Engine                  │
// │  Role: tier -> provider (fail-closed)      │
// │  API: selectProvider(request)              │
// └─────────────────────────────────────────────┘

/**
 * Jediny rozhodovaci bod local vs cloud. Kazda cloud cesta v llmRouter.js
 * (vratane fallbacku Ollama -> cloud) sa pyta selectProvider() znova.
 *
 * Default je local pre kazdy tier. Cloud len ak VSETKO plati:
 *   - SP4_ALLOW_CLOUD === 'true'      (operator capability)
 *   - sensitivity === 'public'        (explicitne; chybajuca/neznama = private)
 *   - policy.allowCloud === true      (request consent)
 *   - policy.forceLocal !== true
 * sensitivity 'private' (retrieved memory, action-layer context, persona-private
 * state) nejde na cloud nikdy — ani ako fallback.
 *
 * Constitution mayEgress() v cloudLLM.askCloudLLM ostava dalsia, nezavisla brana.
 */

export const PROVIDER = Object.freeze({ LOCAL: 'local', CLOUD: 'cloud' });
export const SENSITIVITY = Object.freeze({ PUBLIC: 'public', PRIVATE: 'private' });

export const TIER_PROVIDER = Object.freeze({
    local: PROVIDER.LOCAL,
    budget: PROVIDER.LOCAL,
    quality: PROVIDER.LOCAL,
});

function decide({ tier, requested, sensitivity, policy }) {
    if (!Object.hasOwn(TIER_PROVIDER, tier)) return 'unknown_tier';
    if (requested !== PROVIDER.CLOUD) return 'tier_default_local';
    if (process.env.SP4_ALLOW_CLOUD !== 'true') return 'cloud_capability_disabled';
    if (sensitivity === SENSITIVITY.PRIVATE) return 'private_never_cloud';
    if (sensitivity !== SENSITIVITY.PUBLIC) return 'sensitivity_unknown_fail_closed';
    if (policy?.forceLocal === true) return 'force_local';
    if (policy?.allowCloud !== true) return 'cloud_consent_required';
    return 'cloud_allowed';
}

/**
 * @param {object} request
 * @param {string} request.tier - classify engine: 'local' | 'budget' | 'quality'
 * @param {string} [request.requested] - provider, ktory volajuci chce; default z TIER_PROVIDER
 * @param {string} [request.sensitivity] - 'public' | 'private'; inak fail-closed
 * @param {object} [request.policy] - { allowCloud, forceLocal }
 * @param {string} [request.requestId]
 * @param {string} [request.model]
 * @returns {{ provider: 'local'|'cloud', reason: string }}
 */
export function selectProvider({ tier, requested, sensitivity, policy, requestId = null, model = null } = {}) {
    const reason = decide({
        tier,
        requested: requested ?? TIER_PROVIDER[tier] ?? PROVIDER.LOCAL,
        sensitivity,
        policy,
    });
    const provider = reason === 'cloud_allowed' ? PROVIDER.CLOUD : PROVIDER.LOCAL;

    // Bez payloadu — ziadny prompt/system/pamat v logu.
    console.log(`[PROVIDER-POLICY] ${JSON.stringify({ requestId, tier, provider, reason, model })}`);

    return { provider, reason };
}

export default { selectProvider, TIER_PROVIDER, PROVIDER, SENSITIVITY };
