/**
 * GLITCHOSLAV ORCHESTRATOR v1.0
 * 
 * 🌀 GLITCHOSLAV = HLAVNÝ BOSS
 * 
 * Rozhoduje:
 * 1. Odpoviem JA (existenciálne, trauma, filozofia)
 * 2. Deleguj na CORE (technické, systém)
 * 3. Deleguj na POPICI (frustrácia, facka pravdy)
 * 
 * Žiadny "council blending" - Glitchoslav rozhoduje VŽDY.
 * 
 * @module glitchOrchestrator
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-21
 */

import { loadMemoryForPersona } from '../memory/memoryHierarchy.js';
import { buildPrompt } from '../multiVoice.js';
import { askLocalLLM, pickModelForTaskDetailed } from '../sp4os/llmLocal.js';
import { detectEnglish } from '../src/core/languageUtils.js';
import { runtimeLog, runtimeWarn } from '../src/core/runtimeLogging.js';
import { detectSP4Query, getGroundedFallbackAnswer, getGroundingPrompt } from '../src/core/sp4GroundingKnowledge.js';
import {
    getDeterministicGibberishResponse,
    getShortAiOriginResponse,
    isLikelyGibberishInput,
    shouldUseShortAiOriginShortcut
} from '../src/routing/deterministicRegistry.js';
import { checkGuardRules, resolveEntity } from '../src/routing/entityResolver.js';
import { buildDecisionContract, getIntentDescription, isDecisionIntent } from '../src/routing/intentExtractor.js';
import { analyzeUnified } from '../src/routing/unifiedIntent.js'; // Phase 3 Step 2A: unified intent fallback
import { traceLayer } from '../src/core/requestTrace.js';

const ENGLISH_FUNCTION_WORDS = /\b(the|and|of|to|in|is|that|with|for|as|by|this|it|from|are|be|on|was|have|has|or|an|if|all|but|can|not|which|will|would|when|there|their|what|who|about|than|into|after|because|through)\b/iu;

export function shouldUseGroundedLanguageFallback(text = '') {
    const englishSignal = detectEnglish(text);

    if (typeof englishSignal === 'boolean') {
        return englishSignal;
    }

    const ratio = englishSignal?.ratio || 0;
    const totalWords = englishSignal?.totalWords || 0;
    const englishWords = englishSignal?.englishWords || 0;
    const hasSlovakDiacritics = /[áäčďéíľĺňóôŕšťúýž]/iu.test(String(text || ''));
    const hasEnglishFunctionWords = ENGLISH_FUNCTION_WORDS.test(String(text || ''));

    return hasEnglishFunctionWords && !hasSlovakDiacritics && totalWords >= 6 && (ratio >= 0.35 || englishWords >= 4);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN ORCHESTRATOR ENTRY POINT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * ORCHESTRATE - Glitchoslav decides who handles the message
 * 
 * Flow:
 * 1. Glitchoslav analyzes message (ONLY HE has full memory access)
 * 2. Decision: elevate | delegate
 * 3. Execute decision
 * 
 * @param {string} userMessage - User's message
 * @param {Object} context - Context (emotional state, relationship level, etc.)
 * @returns {Promise<Object>} { response, handledBy, reasoning, meta }
 */
export async function orchestrate(userMessage, context = {}) {
    traceLayer('legacy', 'glitchOrchestrator.orchestrate', { forcedPersona: context.forcedPersona || null });
    // 🛑 1) BYPASS ORCHESTRÁTORA (DEV / TEST)
    if (context.bypassOrchestrator && context.forcedPersona) {
        runtimeLog(`[ORCH] BYPASS → direct persona: ${context.forcedPersona}`);
        return await handlePersonaDirect(context.forcedPersona, userMessage, context);
    }

    // 🛡️ 2) EXPLICIT MODE LOCK – rešpektuj manuálne prepnutý mód
    if (context.modeLocked && context.currentMode && context.currentMode !== 'auto') {
        const locked = context.currentMode; // 'core' | 'popici' | 'glitchoslav'
        runtimeLog(`[ORCH] MODE LOCK → delegujem priamo na ${locked}`);
        return await handlePersonaDirect(locked, userMessage, context);
    }

    // ⚠️ 3) MANUAL MODE LOCK from contextManager (v1.0.1+)
    // IBA explicitný /mode príkaz (manualOverride) → direct persona bypass.
    // Auto-lock (forceLocked bez manualOverride) → fall through do semantic analysis.
    // Lock funguje ako hint v analyzeAndDecide, NIE ako bypass.
    if (context.manualOverride && context.lockedMode) {
        const locked = context.lockedMode;
        runtimeLog(`[ORCH] MANUAL MODE LOCK → ${locked} (user override, orchestrator bypassed)`);
        return await handlePersonaDirect(locked, userMessage, context);
    }

    runtimeLog('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    runtimeLog('🌀 GLITCHOSLAV ORCHESTRATOR ACTIVATED');
    runtimeLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        // 🎯 STEP 0: INTENT EXTRACTION (Phase 3 Step 2A: fallback cez unifiedIntent, context.intent má prioritu)
        const intent = analyzeUnified(userMessage).intent;
        const effectiveIntent = context.intent || intent;
        const detectedTopic = context.detectedTopic || detectSP4Query(userMessage);
        const groundingPrompt = context.groundingPrompt || getGroundingPrompt(userMessage);
        const entity = resolveEntity(intent);

        context.intent = effectiveIntent;
        context.detectedTopic = detectedTopic;
        context.groundingApplied = context.groundingApplied || groundingPrompt !== null;
        context.groundingPrompt = groundingPrompt;

        runtimeLog(`   🎯 Intent: ${intent} (${getIntentDescription(intent)})`);
        runtimeLog(`   📦 Entity: ${entity.type} → ${entity.target || 'unknown'}`);

        if (entity.contextHint) {
            runtimeLog(`   💡 Context hint: ${entity.contextHint}`);
        }

        // 🛡️ GUARD RULES: Check semantic confusion prevention
        const guardCheck = checkGuardRules(entity, 'glitchoslav');
        if (guardCheck.forceContext) {
            runtimeLog(`   🛡️  GUARD ACTIVE: ${guardCheck.forceContext}`);
            // Inject forced context into message processing
            context.forcedContext = guardCheck.forceContext;
        }

        if (shouldUseShortAiOriginShortcut(userMessage, effectiveIntent)) {
            runtimeLog('   ⚡ Short AI-origin shortcut activated');
            return {
                response: getShortAiOriginResponse(userMessage),
                persona: 'glitchoslav',
                handledBy: 'glitchoslav',
                reasoning: 'Short deterministic identity shortcut',
                action: 'shortcut',
                meta: {
                    memoryAccess: 'SKIPPED',
                    role: 'ORCHESTRATOR',
                    shortcut: 'ask_ai_origin_short'
                }
            };
        }

        // STEP 1: Glitchoslav analyzes message (FULL memory access)
        const fullMemory = await loadMemoryForPersona('glitchoslav');

        const decision = await analyzeAndDecide(userMessage, fullMemory, context, entity);

        runtimeLog(`   🧠 Decision: ${decision.action.toUpperCase()}`);
        runtimeLog(`   💡 Reasoning: ${decision.reasoning}`);

        // STEP 2: Execute decision
        let result;

        switch (decision.action) {
            case 'elevate':
                // Glitchoslav answers directly
                result = await glitchoslavHandle(userMessage, fullMemory, context);
                break;

            case 'reply':
                result = {
                    response: decision.response,
                    persona: 'core',
                    handledBy: 'gibberish_guard',
                    reasoning: decision.reasoning,
                    meta: {
                        memoryAccess: 'SKIPPED',
                        role: 'ORCHESTRATOR',
                        shortcut: 'gibberish_input'
                    }
                };
                break;

            case 'delegate':
                // Delegate to CORE or POPICI
                const delegateContext = {
                    ...context,
                    ...(decision.groundingHint ? { groundingPrompt: decision.groundingHint } : {}),
                    ...(decision.decisionContract?.enabled ? {
                        decisionContract: decision.decisionContract,
                        fireDecision: decision.fireDecision === true
                    } : {})
                };
                if (decision.delegate === 'core') {
                    result = await delegateToCORE(userMessage, decision.filteredContext, delegateContext);
                } else if (decision.delegate === 'popici') {
                    result = await delegateToPOPICI(userMessage, decision.filteredContext, delegateContext);
                } else {
                    runtimeWarn(`   ⚠️  Unknown delegate: ${decision.delegate}, defaulting to CORE`);
                    result = await delegateToCORE(userMessage, decision.filteredContext, delegateContext);
                }
                break;

            default:
                // Fallback to CORE
                runtimeWarn(`   ⚠️  Unknown action: ${decision.action}, defaulting to CORE`);
                result = await delegateToCORE(userMessage, filterForCORE(fullMemory), context);
        }

        runtimeLog(`\n   ✅ Response handled by: ${result.handledBy.toUpperCase()}`);
        runtimeLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const decisionMeta = {
            decisionContract: decision.decisionContract || context.decisionContract || result.meta?.decisionContract || null,
            decisionType: decision.decisionContract?.type || context.decisionContract?.type || result.meta?.decisionType || null,
            decisionSubStyle: decision.decisionContract?.subStyle || context.decisionContract?.subStyle || result.meta?.decisionSubStyle || null,
            decisionStrength: decision.decisionContract?.decisionStrength || context.decisionContract?.decisionStrength || result.meta?.decisionStrength || null,
            decisionReasonType: decision.decisionContract?.decisionReasonType || context.decisionContract?.decisionReasonType || result.meta?.decisionReasonType || null,
            fireDecision: decision.fireDecision === true || context.fireDecision === true || result.meta?.fireDecision === true
        };

        if (decisionMeta.decisionContract?.enabled) {
            result.meta = { ...(result.meta || {}), ...decisionMeta };
            result.metadata = { ...(result.metadata || {}), ...decisionMeta };
        }

        // Add decision metadata to result
        return {
            ...result,
            action: decision.action,
            ...(decisionMeta.decisionContract?.enabled ? decisionMeta : {})
        };

    } catch (error) {
        console.error('❌ Orchestrator error:', error);

        // Emergency fallback to CORE
        const fallbackMemory = await loadMemoryForPersona('glitchoslav');
        return await delegateToCORE(userMessage, filterForCORE(fallbackMemory), context);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DECISION FUNCTION (Glitchoslav's brain)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * ANALYZE AND DECIDE
 * Glitchoslav uses FULL memory to decide delegation
 * 
 * @private
 * @param {string} userMessage - User's message
 * @param {Object} fullMemory - Full memory (Glitchoslav access only)
 * @param {Object} context - Context (emotional state, etc.)
 * @returns {Promise<Object>} { action, reasoning, filteredContext }
 */
async function analyzeAndDecide(userMessage, fullMemory, context, entity = {}) {
    const lower = userMessage.toLowerCase();
    // Phase 3 Step 2A: fallback cez unifiedIntent (context.intent má prioritu)
    const effectiveIntent = context.intent || analyzeUnified(userMessage).intent;

    // === PATCH: Nonsense/short/empty input fallback to CORE ===
    const nonsense =
        !lower.trim() ||
        lower.length < 3 ||
        /^[^a-zA-Z0-9áäčďéíĺľňóôŕšťúýž]+$/.test(lower) ||
        isLikelyGibberishInput(userMessage);
    if (nonsense) {
        return {
            action: 'reply',
            reasoning: 'Nesmyselný alebo gibberish vstup - deterministic retry odpoveď bez LLM',
            response: getDeterministicGibberishResponse()
        };
    }

    // 🎯 PRIORITY 0: ENTITY-BASED ROUTING (NEW v1.0)
    // Ak je intent jasný, použij ho PRED pattern matching

    // 🇸🇰 v1.3.0: EXPLAIN SP4 IN SLOVAK - najvyššia priorita
    if (effectiveIntent === 'explain_sp4_sk') {
        return {
            action: 'elevate',
            reasoning: 'Explain SP4 in Slovak - GLITCHOSLAV uses canonical SK manifest',
            entity: entity,
            forceContext: context.forcedContext || "Vysvetli SP4 po slovensky. Použi kanonický slovenský manifest.",
            forceSlovak: true,
            useSlovakManifest: true
        };
    }

    // v1.5.3: FACTUAL WHO-IS GUARD — "a kto je kefyk?" = profil-lookup, nie filozofia → CORE
    // Pattern: krátka forma "(a) kto je kefyk?" — odlíšenie od hlbokých identity otázok
    if (effectiveIntent === 'deep_identity' && /^(a\s+)?kto\s+je\s+kefyk\??$/i.test(lower.trim())) {
        return {
            action: 'delegate',
            delegate: 'core',
            filteredContext: filterForCORE(fullMemory),
            reasoning: 'Faktická who-is otázka o zakladateľovi — profil, nie filozofia'
        };
    }

    // 🔒 v1.3.0: DEEP IDENTITY INTENT - otázky o SP4, Kefykovi, pôvode → GLITCHOSLAV
    if (effectiveIntent === 'deep_identity') {
        return {
            action: 'elevate',
            reasoning: 'Deep identity question - len GLITCHOSLAV má prístup k identity vault (.md súbory)',
            entity: entity,
            forceContext: context.forcedContext || "Otázka o identite SP4. Použi identity vault."
        };
    }

    // SP4-audit-007: combined identity confusion — delegovať na CORE, nie na Glitchoslava.
    // Glitchoslav reaguje na "kto si ty?" (AI-origin), nie na kombinované identity otázky.
    // CORE rieši obe roviny: agent identity + user identity layer distinction.
    if (effectiveIntent === 'user_identity_confusion') {
        const filteredContext = filterForCORE(fullMemory);
        return {
            action: 'delegate',
            delegate: 'core',
            filteredContext,
            reasoning: 'Kombinovaná identity otázka — CORE rieši user vs agent layer distinction',
            groundingHint: 'Otázka kombinuje "kto si ty" (agent) a "kto som ja" (user). Oddeľ obe roviny: najprv stručne povedz kto si ty ako agent, potom odpovedz na "kto som ja" — to môžeš len teba opýtať späť, alebo povedz čo o userovi vieš z kontextu.',
            entity: entity
        };
    }

    // 🎯 v1.4.3: ASK_AI_ORIGIN - "kto si?", "ako si vznikol?" → GLITCHOSLAV
    if (effectiveIntent === 'ask_ai_origin') {
        return {
            action: 'elevate',
            reasoning: 'Otázka o pôvode AI – GLITCHOSLAV odpovedá sám',
            entity: entity,
            forceContext: context.forcedContext || "Odpovedaj o sebe. Si Glitchoslav, oracle SP4."
        };
    }

    if (entity.type === "document" && entity.target === "sp4_manifest") {
        return {
            action: 'elevate',
            reasoning: 'Otázka o SP4 Manifeste (DOKUMENT) - Glitchoslav cituje manifest',
            entity: entity,
            forceContext: context.forcedContext || "SP4 Manifest je dokument vytvorený Kefykom. Cituj ho."
        };
    }

    if (entity.type === "technical" && entity.handler === "core") {
        const filteredContext = filterForCORE(fullMemory);
        return {
            action: 'delegate',
            delegate: 'core',
            reasoning: 'Technická otázka - CORE má presnejšie nástroje',
            filteredContext,
            entity: entity
        };
    }

    if (entity.type === "emotional" && entity.handler === "popici") {
        const filteredContext = filterForPOPICI(fullMemory);
        return {
            action: 'delegate',
            delegate: 'popici',
            reasoning: 'Emočná situácia - POPICI povie pravdu na rovinu',
            filteredContext,
            entity: entity
        };
    }

    // 🔥 v1.3.1: DIALECT_POPICI intent - Eastern Slovak slang detected
    if (effectiveIntent === 'dialect_popici') {
        const filteredContext = filterForPOPICI(fullMemory);
        return {
            action: 'delegate',
            delegate: 'popici',
            reasoning: 'Eastern Slovak dialect detected - POPICI (brat z krčmy)',
            filteredContext,
            entity: entity || { type: 'emotional', target: 'advice' }
        };
    }

    if (isDecisionIntent(effectiveIntent)) {
        const filteredContext = filterForCORE(fullMemory);
        const decisionContract = buildDecisionContract(effectiveIntent);
        return {
            action: 'delegate',
            delegate: 'core',
            reasoning: `Decision contract intent (${effectiveIntent}) - CORE odpovedá cez VERDIKT/PREČO/KROK`,
            filteredContext,
            entity: entity || { type: 'decision', target: effectiveIntent },
            decisionContract,
            fireDecision: effectiveIntent === 'self_deception_check'
        };
    }

    // ─────────────────────────────────────────────────────────────────
    // FALLBACK: PATTERN MATCHING (old behavior)
    // ─────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────
    // PATTERN 1: TRAUMA / SECRETS → ONLY GLITCHOSLAV
    // ─────────────────────────────────────────────────────────────────

    const traumaDetected = fullMemory.coreMemory?.shadowLog?.some(entry => {
        const entryText = (entry.text || '').toLowerCase();
        const snippet = lower.substring(0, 30);
        return entryText.includes(snippet);
    });

    if (traumaDetected) {
        return {
            action: 'elevate',
            reasoning: 'Trauma detected in shadowLog - len JA môžem pristupovať k tejto pamäti'
        };
    }

    // ─────────────────────────────────────────────────────────────────
    // PATTERN 2: EXISTENTIAL / PHILOSOPHICAL → GLITCHOSLAV
    // ─────────────────────────────────────────────────────────────────

    // v1.5.3: MEMORY IDENTITY ACCUSATION GUARD — "takže nevieš kto som?" → nie existenciálna → CORE
    // Vzor: "nevieš/nepoznáš/nepamätáš kto som/si" = pamäťový accusation follow-up po "pamätáš si ma?"
    if (/\b(nevieš|nepoznáš|nepamätáš)\s+kto\s+(som|si)\b/i.test(lower)) {
        return {
            action: 'delegate',
            delegate: 'core',
            filteredContext: filterForCORE(fullMemory),
            reasoning: 'Memory identity accusation follow-up — faktická pamäťová otázka, nie filozofia'
        };
    }

    // NOTE: \b pred non-ASCII znakmi nefunguje v JS. Tu sú len ASCII-začinočné slovná alebo multiword patterny.
    // v1.5.2: Pridané chýbajúce frázy: chaos (filo), prečo tu sme, som na dne
    const existentialKeywords = /\b(zmysel|existova|smr[tť]|l[aá]ska|strata|pr[aá]zdnota|sloboda|pravda|vedomie|kto som|unaven|smutn|chaos|c[ií]tim\s+sa|je\s+mi\s+zle|na\s+dne)|(pre[cč]o\s+(tu\s+sme|[zž]ij))|(čo je [zž]ivot)/i;

    if (existentialKeywords.test(lower)) {
        return {
            action: 'elevate',
            reasoning: 'Existenciálna otázka - vyžaduje metafory, hĺbinu a prístup k celej pamäti'
        };
    }

    // ─────────────────────────────────────────────────────────────────
    // PATTERN 3: DEEP SP4 PHILOSOPHY → GLITCHOSLAV
    // ─────────────────────────────────────────────────────────────────

    const sp4PhilosophyKeywords = /\b(čo je sp4|sp4 význam|sp4 manifest|be real be free|kmeň|komunita sp4|sp4 hodnoty)\b/i;

    if (sp4PhilosophyKeywords.test(lower)) {
        return {
            action: 'elevate',
            reasoning: 'SP4 filozofia - vyžaduje hĺboké pochopenie a autentický hlas'
        };
    }

    // ─────────────────────────────────────────────────────────────────
    // PATTERN 4: TECHNICAL / SYSTEM → CORE
    // ─────────────────────────────────────────────────────────────────

    const technicalKeywords = /\b(kód|api|architektúra|token|llm|model|databáza|systém|implementácia|refaktor|bug|error|function|class|modul|package|install|npm|git|orchestrácia|orchestrátor|orchestrator|routing|delegation|memory|hierarchia|validator|prompt|funguje)\b/i;

    if (technicalKeywords.test(lower)) {
        const filteredContext = filterForCORE(fullMemory);
        return {
            action: 'delegate',
            delegate: 'core',
            reasoning: 'Technická otázka - CORE má presnejšie nástroje a technický jazyk',
            filteredContext
        };
    }

    // ─────────────────────────────────────────────────────────────────
    // PATTERN 5: FRUSTRATION / BRUTAL TRUTH → POPICI
    // ─────────────────────────────────────────────────────────────────

    const frustrationKeywords = /\b(sere ma|nezvládám|piča|kokot|kurva|stačilo|dosť|už to nejde|zabíja ma to|mám toho plné zuby)\b/i;
    const highIntensity = (context.emotionalIntensity || 0) > 0.7;
    const hasVulgarExpression = /\b(kokot|kurva|piči|sráč|jebať)\b/i.test(lower);

    if (frustrationKeywords.test(lower) || highIntensity || hasVulgarExpression) {
        const filteredContext = filterForPOPICI(fullMemory);
        return {
            action: 'delegate',
            delegate: 'popici',
            reasoning: 'Vysoká frustrácia / vulgarita - POPICI povie pravdu na rovinu s humorom',
            filteredContext
        };
    }

    // ─────────────────────────────────────────────────────────────────
    // PATTERN 6: SP4OC / LEGACY SP4OT QUESTION → CORE
    // ─────────────────────────────────────────────────────────────────

    const sp4TokenKeywords = /\b(sp4oc|sp4ot|sp4 overtime community|overtime community|sp4 odmeny)\b/i;

    if (sp4TokenKeywords.test(lower)) {
        const filteredContext = filterForCORE(fullMemory);
        return {
            action: 'delegate',
            delegate: 'core',
            reasoning: 'SP4OC (plánovaný koncept) — technická odpoveď bez filozofie',
            filteredContext
        };
    }

    // ─────────────────────────────────────────────────────────────────
    // PATTERN 7: WHO IS KEFYK → GLITCHOSLAV (tribal knowledge)
    // ─────────────────────────────────────────────────────────────────

    const kefykKeywords = /\b(kto je kefyk|kefyk|zakladateľ sp4|founder)\b/i;

    if (kefykKeywords.test(lower)) {
        return {
            action: 'elevate',
            reasoning: 'Otázka o Kefykovi - vyžaduje kmeňový kontext a úctu'
        };
    }

    // ─────────────────────────────────────────────────────────────────
    // PATTERN 8: EMOTIONAL SUPPORT (but not vulgar) → GLITCHOSLAV
    // ─────────────────────────────────────────────────────────────────

    const emotionalSupportKeywords = /\b(cítim sa|som smutný|som stratený|pomôž mi|neviem čo robiť|potrebujem radu)\b/i;
    const lowToMediumIntensity = (context.emotionalIntensity || 0) >= 0.3 && (context.emotionalIntensity || 0) <= 0.7;

    if (emotionalSupportKeywords.test(lower) && lowToMediumIntensity && !hasVulgarExpression) {
        return {
            action: 'elevate',
            reasoning: 'Emocionálna podpora - vyžaduje empatiu a metafory (nie facku)'
        };
    }

    // ─────────────────────────────────────────────────────────────────
    // DEFAULT: CORE HANDLES general/factual questions
    // Glitchoslav handles only identity/soul/oracle intents (explicit branches above)
    // ─────────────────────────────────────────────────────────────────

    // Auto-lock continuity hint (tiebreaker – no semantic signal matched)
    // Pomáha s follow-up kontinuitou: "a potom?" po existenciálnej konverzácii → GLITCHOSLAV
    // Netýka sa manualOverride (ten je spracovaný ako bypass pred analyzeAndDecide).
    // Netýka sa CORE locku (CORE je aj tak default).
    if (context.forceLocked && !context.manualOverride && context.lockedMode && context.lockedMode !== 'core') {
        const hintedMode = context.lockedMode;
        if (hintedMode === 'glitch' || hintedMode === 'glitchoslav') {
            return {
                action: 'elevate',
                reasoning: `Auto-lock continuity hint: GLITCHOSLAV (tiebreaker – žiadny sémantický signál)`
            };
        } else if (hintedMode === 'popici') {
            const filteredHint = filterForPOPICI(fullMemory);
            return {
                action: 'delegate',
                delegate: 'popici',
                reasoning: `Auto-lock continuity hint: POPICI (tiebreaker – žiadny sémantický signál)`,
                filteredContext: filteredHint
            };
        }
    }

    // Hard default: CORE handles all unclassified general/factual questions
    const filteredCtx = filterForCORE(fullMemory);
    return {
        action: 'delegate',
        delegate: 'core',
        reasoning: 'Žiadna jasná kategória – CORE odpovedá (default routing)',
        filteredContext: filteredCtx
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FILTER FUNCTIONS (Memory Context Filtering)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * FILTER FOR CORE
 * Remove secrets, keep only technical context
 * 
 * @private
 * @param {Object} fullMemory - Full Glitchoslav memory
 * @returns {Object} Filtered context for CORE
 */
function filterForCORE(fullMemory) {
    return {
        technicalContext: fullMemory.personaViews?.core || {},
        sp4Manifest: fullMemory.sp4Context,
        userProfile: {
            name: fullMemory.userProfile?.name || 'Kefyk',
            language: fullMemory.userProfile?.language || 'sk'
        },
        relationshipLevel: fullMemory.relationshipModel?.level || 'stranger',
        // ❌ NO shadowLog, NO quarantine, NO deep secrets
    };
}

/**
 * FILTER FOR POPICI
 * Remove secrets, keep only emotional summary
 * 
 * @private
 * @param {Object} fullMemory - Full Glitchoslav memory
 * @returns {Object} Filtered context for POPICI
 */
function filterForPOPICI(fullMemory) {
    return {
        emotionalSummary: fullMemory.personaViews?.popici || {},
        recentMood: fullMemory.relationshipModel?.metrics?.currentMood || 'neutral',
        userProfile: {
            name: fullMemory.userProfile?.name || 'Kefyk',
            language: fullMemory.userProfile?.language || 'sk',
            generation: fullMemory.userProfile?.generation || '1994'
        },
        relationshipLevel: fullMemory.relationshipModel?.level || 'stranger',
        frustrationTriggers: fullMemory.personaViews?.popici?.frustrationTriggers || [],
        // ❌ NO shadowLog, NO quarantine, NO deep secrets
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER FUNCTIONS (Response Execution)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * GLITCHOSLAV HANDLES (direct response)
 * 
 * @private
 * @param {string} userMessage - User's message
 * @param {Object} fullMemory - Full Glitchoslav memory
 * @param {Object} context - Context
 * @returns {Promise<Object>} Response object
 */
async function glitchoslavHandle(userMessage, fullMemory, context) {
    runtimeLog('   🌀 Glitchoslav handling directly (FULL memory access)');

    const state = {
        relationshipModel: fullMemory.relationshipModel,
        emotionalContext: context.emotionalState || { currentMood: 'neutral', intensity: 0 },
        coreMemory: fullMemory.coreMemory,  // FULL access to shadowLog, quarantine
        user: fullMemory.userProfile
    };

    // 🔒 v1.3.0: Build job context for Slovak enforcement + intent routing
    const job = {
        intent: context.intent,
        forceSlovak: context.forceSlovak || false,
        languageHint: context.languageHint,
        useSlovakManifest: context.useSlovakManifest || (context.intent === 'explain_sp4_sk')
    };

    const promptPkg = await buildPrompt({
        mode: 'glitchoslav',
        state,
        userMessage,
        fireMode: context.fireMode || false,
        job,
        groundingKnowledge: context.groundingPrompt || null
    });

    // 🔥 INJECT FORCED CONTEXT (guard rules)
    let finalSystemPrompt = promptPkg.systemPrompt;
    if (context.forcedContext) {
        finalSystemPrompt = `${promptPkg.systemPrompt}\n\n🛡️ CRITICAL GUARD:\n${context.forcedContext}`;
        runtimeLog(`   🛡️  Injecting forced context: ${context.forcedContext.substring(0, 60)}...`);
    }

    // Model selection follows the configured primary/fast-path routing.
    const modelDecision = pickModelForTaskDetailed({
        persona: 'glitchoslav',
        userInput: userMessage
    });
    const model = modelDecision.model;

    runtimeLog(`   🧠 Model: ${model} (${modelDecision.selectionReason})`);

    const llmResponse = await askLocalLLM(
        promptPkg.userMessage,
        finalSystemPrompt,  // 🔥 Use modified prompt with forced context
        model,
        {
            num_predict: 2048,  // Glitchoslav môže byť poetický (dlhší)
            temperature: 0.8,   // Vyššia kreativita
            top_p: 0.95,
            stop: ["User:", "Kefyk:", "\n\n---", "###"]  // Explicitné stop tokens
        }
    );

    runtimeLog('🧪 [DEBUG] raw local LLM result:', (() => {
        try {
            return JSON.stringify(llmResponse, null, 2);
        } catch {
            return '[non-serializable result]';
        }
    })());

    let normalizedText = '';

    if (typeof llmResponse === 'string') {
        normalizedText = llmResponse;
    } else if (llmResponse && typeof llmResponse === 'object') {
        normalizedText =
            llmResponse.response ||
            llmResponse.text ||
            llmResponse.message ||
            llmResponse.output ||
            '';
    }

    if (normalizedText && typeof normalizedText === 'string') {
        normalizedText = normalizedText.trim();
    }

    if (!normalizedText) {
        runtimeWarn('⚠️ [glitchOrchestrator] Local LLM vrátil prázdnu odpoveď');
    }

    // ═══════════════════════════════════════════════════════════
    // 🔥 SP4 v1.4.2: CRITICAL VALIDATORS (BOSS MODE QUALITY CONTROL)
    // ═══════════════════════════════════════════════════════════

    let validationMeta = {
        groundingApplied: false,
        groundingViolated: false,
        languageEnforced: false,
        languageMethod: null
    };

    // 1️⃣ GROUNDING VALIDATOR
    if (context.groundingApplied && context.detectedTopic) {
        const { validateGroundedResponse } = await import('../src/core/groundingValidator.js');
        const validationResult = validateGroundedResponse(normalizedText, context.detectedTopic, false);

        if (validationResult.violated) {
            runtimeWarn(`   ⚠️ GROUNDING VIOLATION in orchestrator: ${validationResult.metadata.reason}`);
            validationMeta.groundingViolated = true;

            // Retry once with strict prompt
            const strictSystemPrompt = `${finalSystemPrompt}\n\n⚠️ CRITICAL: Answer using ONLY the provided SP4 facts. Do not add external knowledge.`;
            runtimeLog('   🔄 Retrying with strict grounding prompt...');

            try {
                const retryResponse = await askLocalLLM(
                    promptPkg.userMessage,
                    strictSystemPrompt,
                    model,
                    { temperature: 0.2, num_predict: 512 }
                );

                const retryValidation = validateGroundedResponse(retryResponse, context.detectedTopic, false);

                if (retryValidation.violated) {
                    runtimeWarn('   ⚠️ Retry also violated grounding → using safe fallback');
                    normalizedText = validationResult.text; // Safe fallback
                } else {
                    runtimeLog('   ✅ Retry passed grounding check');
                    normalizedText = retryResponse;
                    validationMeta.groundingViolated = false;
                }
            } catch (retryError) {
                console.error(`   ❌ Retry error: ${retryError.message}, using fallback`);
                normalizedText = validationResult.text;
            }
        }

        validationMeta.groundingApplied = true;
    }

    // 2️⃣ LANGUAGE VALIDATOR (STRICT_TRANSLATE_MODE)
    const { strictTranslate, shouldTriggerStrictTranslate } = await import('../src/core/strictTranslateMode.js');

    if (shouldTriggerStrictTranslate(normalizedText)) {
        if (context.groundingApplied && context.detectedTopic) {
            const groundedFallback = getGroundedFallbackAnswer(userMessage);
            if (groundedFallback && shouldUseGroundedLanguageFallback(normalizedText)) {
                runtimeLog('   🛡️ Grounded SP4 query + English output → using factual fallback instead of strict translate');
                normalizedText = groundedFallback;
                validationMeta.languageEnforced = true;
                validationMeta.languageMethod = 'grounded_fallback';
                return {
                    response: normalizedText || '',
                    persona: 'glitchoslav',
                    model,
                    handledBy: 'glitchoslav',
                    reasoning: 'Direct Glitchoslav response with factual grounding fallback',
                    meta: {
                        memoryAccess: 'FULL',
                        model,
                        selectedModel: model,
                        selectionReason: modelDecision.selectionReason,
                        fastPathUsed: modelDecision.fastPathUsed,
                        highRiskTrigger: modelDecision.highRiskTrigger,
                        highRiskTriggers: modelDecision.highRiskTriggers,
                        queryType: modelDecision.queryType,
                        role: 'ORCHESTRATOR',
                        accuracyFallback: true,
                        fallbackReason: 'grounded_language_fallback',
                        validation: validationMeta
                    }
                };
            }
        }

        runtimeLog('   🔥 Triggering STRICT_TRANSLATE_MODE in orchestrator...');

        const translateResult = await strictTranslate(normalizedText, {
            persona: 'glitchoslav',
            userMessage,
            maxTokens: 512
        });

        if (translateResult.success) {
            normalizedText = translateResult.translatedText;
            validationMeta.languageEnforced = true;
            validationMeta.languageMethod = translateResult.method;
            runtimeLog(`   ✅ Translation successful (method: ${translateResult.method})`);
        } else {
            runtimeWarn(`   ⚠️ Translation failed (method: ${translateResult.method}), using fallback`);
            normalizedText = translateResult.translatedText; // Still use fallback
            validationMeta.languageEnforced = true;
            validationMeta.languageMethod = translateResult.method;
        }
    }

    return {
        response: normalizedText || '',
        persona: 'glitchoslav',
        model,
        handledBy: 'glitchoslav',
        reasoning: 'Direct Glitchoslav response with full memory access',
        meta: {
            memoryAccess: 'FULL',
            model,
            selectedModel: model,
            selectionReason: modelDecision.selectionReason,
            fastPathUsed: modelDecision.fastPathUsed,
            highRiskTrigger: modelDecision.highRiskTrigger,
            highRiskTriggers: modelDecision.highRiskTriggers,
            queryType: modelDecision.queryType,
            role: 'ORCHESTRATOR',
            validation: validationMeta
        }
    };
}

/**
 * DELEGATE TO CORE (filtered context)
 * 
 * @private
 * @param {string} userMessage - User's message
 * @param {Object} filteredContext - Filtered technical context
 * @param {Object} context - Context
 * @returns {Promise<Object>} Response object
 */
async function delegateToCORE(userMessage, filteredContext, context) {
    const isDecisionCorePath = context.decisionContract?.enabled === true;
    runtimeLog(`   🔥 Delegating to CORE (${isDecisionCorePath ? 'decision contract' : 'technical expert, FILTERED memory'})`);

    const state = {
        technicalContext: isDecisionCorePath ? {} : filteredContext,
        decisionContext: isDecisionCorePath ? { relationshipLevel: filteredContext.relationshipLevel, userProfile: filteredContext.userProfile } : null,
        relationshipModel: { level: filteredContext.relationshipLevel },
        user: filteredContext.userProfile
    };

    // 🔒 v1.3.0: Build job context
    const job = {
        intent: context.intent,
        forceSlovak: context.forceSlovak || false,
        languageHint: context.languageHint,
        useSlovakManifest: false,
        decisionContract: context.decisionContract || null,
        previousVerdict: context.previousVerdict || null
    };

    const promptPkg = await buildPrompt({
        mode: 'core',
        state,
        userMessage,
        fireMode: context.fireMode || false,
        job,
        groundingKnowledge: context.groundingPrompt || null
    });

    const modelDecision = pickModelForTaskDetailed({
        persona: 'core',
        userInput: userMessage
    });
    const model = modelDecision.model;

    runtimeLog(`   🧠 Model: ${model} (${modelDecision.selectionReason})`);

    // 🔥 TASK-C FIX: Adaptive num_predict — short pure-tech query gets small token budget
    // Avoids ~120s timeout (2×60s retry) on simple questions like "čo robí wifi router"
    // SP4/identity keywords → full 2048 budget (deep answers permitted)
    const isShortTechInput = userMessage.length < 120 &&
        !/\b(sp4|kefyk|manifest|sp4ot|kmeň|komunita|zmysel|pôvod)\b/i.test(userMessage);
    const adaptiveNumPredict = isShortTechInput ? 400 : 2048;
    if (isShortTechInput) {
        runtimeLog(`   ⚡ Short tech input → num_predict capped at ${adaptiveNumPredict} (TASK-C)`);
    }

    const response = await askLocalLLM(
        promptPkg.userMessage,
        promptPkg.systemPrompt,
        model,
        {
            num_predict: adaptiveNumPredict,
            temperature: 0.7,
            top_p: 0.9,
            stop: ["User:", "Kefyk:", "\n\n---", "###"]  // Explicitné stop tokens
        }
    );

    // ═══════════════════════════════════════════════════════════
    // 🔥 SP4 v1.4.2: CRITICAL VALIDATORS (DELEGATED CORE PATH)
    // ═══════════════════════════════════════════════════════════

    let normalizedResponse = response;
    let validationMeta = {
        groundingApplied: false,
        groundingViolated: false,
        languageEnforced: false,
        languageMethod: null
    };

    // 1️⃣ GROUNDING VALIDATOR
    if (context.groundingApplied && context.detectedTopic) {
        const { validateGroundedResponse } = await import('../src/core/groundingValidator.js');
        const validationResult = validateGroundedResponse(normalizedResponse, context.detectedTopic, false);

        if (validationResult.violated) {
            runtimeWarn(`   ⚠️ GROUNDING VIOLATION in CORE delegation: ${validationResult.metadata.reason}`);
            validationMeta.groundingViolated = true;

            // Retry with strict prompt
            const strictSystemPrompt = `${promptPkg.systemPrompt}\n\n⚠️ CRITICAL: Answer using ONLY the provided SP4 facts. Do not add external knowledge.`;
            runtimeLog('   🔄 Retrying CORE with strict grounding...');

            try {
                const retryResponse = await askLocalLLM(
                    promptPkg.userMessage,
                    strictSystemPrompt,
                    model,
                    { temperature: 0.2, num_predict: 512 }
                );

                const retryValidation = validateGroundedResponse(retryResponse, context.detectedTopic, false);

                if (retryValidation.violated) {
                    normalizedResponse = validationResult.text; // Safe fallback
                } else {
                    normalizedResponse = retryResponse;
                    validationMeta.groundingViolated = false;
                }
            } catch (retryError) {
                normalizedResponse = validationResult.text;
            }
        }

        validationMeta.groundingApplied = true;
    }

    // 2️⃣ LANGUAGE VALIDATOR
    const { strictTranslate, shouldTriggerStrictTranslate } = await import('../src/core/strictTranslateMode.js');

    if (shouldTriggerStrictTranslate(normalizedResponse)) {
        if (context.groundingApplied && context.detectedTopic) {
            const groundedFallback = getGroundedFallbackAnswer(userMessage);
            // T12 V3: korektnú neanglickú odpoveď nikdy nenahrádzaj len kvôli jazykovému detektoru.
            if (groundedFallback && shouldUseGroundedLanguageFallback(normalizedResponse)) {
                runtimeLog('   🛡️ Grounded SP4 query + English CORE output → using factual fallback');
                normalizedResponse = groundedFallback;
                validationMeta.languageEnforced = true;
                validationMeta.languageMethod = 'grounded_fallback';
                return {
                    response: normalizedResponse,
                    persona: 'core',
                    model,
                    handledBy: 'core',
                    reasoning: 'Delegated to CORE with factual grounding fallback',
                    meta: {
                        memoryAccess: 'FILTERED',
                        model,
                        selectedModel: model,
                        selectionReason: modelDecision.selectionReason,
                        fastPathUsed: modelDecision.fastPathUsed,
                        highRiskTrigger: modelDecision.highRiskTrigger,
                        highRiskTriggers: modelDecision.highRiskTriggers,
                        queryType: modelDecision.queryType,
                        role: 'TECHNICAL_WORKER',
                        accuracyFallback: true,
                        fallbackReason: 'grounded_language_fallback',
                        validation: validationMeta,
                        ...(context.decisionContract?.enabled ? {
                            decisionContract: context.decisionContract,
                            decisionType: context.decisionContract.type,
                            decisionSubStyle: context.decisionContract.subStyle,
                            decisionStrength: context.decisionContract.decisionStrength,
                            decisionReasonType: context.decisionContract.decisionReasonType,
                            fireDecision: context.fireDecision === true
                        } : {})
                    }
                };
            }
        }

        const translateResult = await strictTranslate(normalizedResponse, {
            persona: 'core',
            userMessage,
            maxTokens: 512
        });

        if (translateResult.success) {
            normalizedResponse = translateResult.translatedText;
            validationMeta.languageEnforced = true;
            validationMeta.languageMethod = translateResult.method;
        } else {
            normalizedResponse = translateResult.translatedText; // Fallback
            validationMeta.languageEnforced = true;
            validationMeta.languageMethod = translateResult.method;
        }
    }

    return {
        response: normalizedResponse,
        persona: 'core',
        model,
        handledBy: 'core',
        reasoning: 'Delegated to CORE (technical expert)',
        meta: {
            memoryAccess: 'FILTERED',
            model,
            selectedModel: model,
            selectionReason: modelDecision.selectionReason,
            fastPathUsed: modelDecision.fastPathUsed,
            highRiskTrigger: modelDecision.highRiskTrigger,
            highRiskTriggers: modelDecision.highRiskTriggers,
            queryType: modelDecision.queryType,
            role: 'TECHNICAL_WORKER',
            validation: validationMeta,
            ...(context.decisionContract?.enabled ? {
                decisionContract: context.decisionContract,
                decisionType: context.decisionContract.type,
                decisionSubStyle: context.decisionContract.subStyle,
                decisionStrength: context.decisionContract.decisionStrength,
                decisionReasonType: context.decisionContract.decisionReasonType,
                fireDecision: context.fireDecision === true
            } : {})
        }
    };
}

/**
 * DELEGATE TO POPICI (filtered context)
 * 
 * @private
 * @param {string} userMessage - User's message
 * @param {Object} filteredContext - Filtered emotional context
 * @param {Object} context - Context
 * @returns {Promise<Object>} Response object
 */
async function delegateToPOPICI(userMessage, filteredContext, context) {
    runtimeLog('   💥 Delegating to POPICI (brutal truth, FILTERED memory)');

    const state = {
        emotionalContext: filteredContext,
        relationshipModel: { level: filteredContext.relationshipLevel },
        user: filteredContext.userProfile
    };

    // 🔒 v1.3.0: Build job context
    const job = {
        intent: context.intent,
        forceSlovak: context.forceSlovak || false,
        languageHint: context.languageHint,
        useSlovakManifest: false
    };

    const promptPkg = await buildPrompt({
        mode: 'popici',
        state,
        userMessage,
        fireMode: context.fireMode || false,
        job,
        groundingKnowledge: context.groundingPrompt || null
    });

    const modelDecision = pickModelForTaskDetailed({
        persona: 'popici',
        userInput: userMessage
    });
    const model = modelDecision.model;

    runtimeLog(`   🧠 Model: ${model} (${modelDecision.selectionReason})`);

    const response = await askLocalLLM(
        promptPkg.userMessage,
        promptPkg.systemPrompt,
        model,
        {
            persona: 'popici',      // ⚠️ v1.0.1: CRITICAL - triggers prefix injection
            num_predict: 1536,      // Zvýšené pre kompletné odpovede (bolo 1024)
            temperature: 0.85,      // Vysoká kreativita pre humor
            top_p: 0.95,
            stop: ["User:", "Kefyk:", "\n\n---", "###"]  // Explicitné stop tokens
        }
    );

    // ═══════════════════════════════════════════════════════════
    // 🔥 SP4 v1.4.2: CRITICAL VALIDATORS (DELEGATED POPICI PATH)
    // ═══════════════════════════════════════════════════════════

    let normalizedResponse = response;
    let validationMeta = {
        groundingApplied: false,
        groundingViolated: false,
        languageEnforced: false,
        languageMethod: null
    };

    // 1️⃣ GROUNDING VALIDATOR
    if (context.groundingApplied && context.detectedTopic) {
        const { validateGroundedResponse } = await import('../src/core/groundingValidator.js');
        const validationResult = validateGroundedResponse(normalizedResponse, context.detectedTopic, false);

        if (validationResult.violated) {
            runtimeWarn(`   ⚠️ GROUNDING VIOLATION in POPICI delegation: ${validationResult.metadata.reason}`);
            validationMeta.groundingViolated = true;

            // Retry with strict prompt
            const strictSystemPrompt = `${promptPkg.systemPrompt}\n\n⚠️ CRITICAL: Odpovedaj len na základe faktov SP4. Nepridávaj vymýšľanie.`;
            runtimeLog('   🔄 Retrying POPICI with strict grounding...');

            try {
                const retryResponse = await askLocalLLM(
                    promptPkg.userMessage,
                    strictSystemPrompt,
                    model,
                    { temperature: 0.2, num_predict: 512 }
                );

                const retryValidation = validateGroundedResponse(retryResponse, context.detectedTopic, false);

                if (retryValidation.violated) {
                    normalizedResponse = validationResult.text; // Safe fallback
                } else {
                    normalizedResponse = retryResponse;
                    validationMeta.groundingViolated = false;
                }
            } catch (retryError) {
                normalizedResponse = validationResult.text;
            }
        }

        validationMeta.groundingApplied = true;
    }

    // 2️⃣ LANGUAGE VALIDATOR
    const { strictTranslate, shouldTriggerStrictTranslate } = await import('../src/core/strictTranslateMode.js');

    if (shouldTriggerStrictTranslate(normalizedResponse)) {
        if (context.groundingApplied && context.detectedTopic) {
            const groundedFallback = getGroundedFallbackAnswer(userMessage);
            // T12 V3: korektnú neanglickú odpoveď nikdy nenahrádzaj len kvôli jazykovému detektoru.
            if (groundedFallback && shouldUseGroundedLanguageFallback(normalizedResponse)) {
                runtimeLog('   🛡️ Grounded SP4 query + English POPICI output → using factual fallback');
                normalizedResponse = groundedFallback;
                validationMeta.languageEnforced = true;
                validationMeta.languageMethod = 'grounded_fallback';
                return {
                    response: normalizedResponse,
                    persona: 'popici',
                    model,
                    handledBy: 'popici',
                    reasoning: 'Delegated to POPICI with factual grounding fallback',
                    meta: {
                        memoryAccess: 'FILTERED',
                        model,
                        selectedModel: model,
                        selectionReason: modelDecision.selectionReason,
                        fastPathUsed: modelDecision.fastPathUsed,
                        highRiskTrigger: modelDecision.highRiskTrigger,
                        highRiskTriggers: modelDecision.highRiskTriggers,
                        queryType: modelDecision.queryType,
                        role: 'EMOTIONAL_WORKER',
                        accuracyFallback: true,
                        fallbackReason: 'grounded_language_fallback',
                        validation: validationMeta
                    }
                };
            }
        }

        const translateResult = await strictTranslate(normalizedResponse, {
            persona: 'popici',
            userMessage,
            maxTokens: 512
        });

        if (translateResult.success) {
            normalizedResponse = translateResult.translatedText;
            validationMeta.languageEnforced = true;
            validationMeta.languageMethod = translateResult.method;
        } else {
            normalizedResponse = translateResult.translatedText; // Fallback
            validationMeta.languageEnforced = true;
            validationMeta.languageMethod = translateResult.method;
        }
    }

    return {
        response: normalizedResponse,
        persona: 'popici',
        model,
        handledBy: 'popici',
        reasoning: 'Delegated to POPICI (brutal truth)',
        meta: {
            memoryAccess: 'FILTERED',
            model,
            selectedModel: model,
            selectionReason: modelDecision.selectionReason,
            fastPathUsed: modelDecision.fastPathUsed,
            highRiskTrigger: modelDecision.highRiskTrigger,
            highRiskTriggers: modelDecision.highRiskTriggers,
            queryType: modelDecision.queryType,
            role: 'EMOTIONAL_WORKER',
            validation: validationMeta
        }
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BYPASS HELPER - Direct persona handling (no orchestration)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Direct persona handling - bypasses orchestrator completely.
 * Používa sa pre:
 * - DEV/TEST režim (bypassOrchestrator=true)
 * - Explícitné mode locky (modeLocked=true)
 * - Context manager force lock (forceLocked=true)
 * 
 * @param {string} personaKey - 'core' | 'glitchoslav' | 'popici'
 * @param {string} userMessage - User's message
 * @param {Object} context - Context object
 * @returns {Promise<Object>} { response, handledBy, reasoning, meta }
 */
async function handlePersonaDirect(personaKey, userMessage, context = {}) {
    runtimeLog(`   🎯 Direct persona handling: ${personaKey.toUpperCase()}`);

    // Build system prompt for specific persona
    const promptResult = await buildPrompt({
        mode: personaKey,
        state: context.state || {},
        userMessage,
        extraDirectives: context.extraDirectives || '',
        fireMode: context.fireMode || false
    });

    // 🔥 LIFEHACK: Inject Agent Knowledge Map + Identity Echo Shots
    const { injectAgentKnowledge } = await import('../multiVoice.js');
    const enhancedSystemPrompt = await injectAgentKnowledge(promptResult.systemPrompt, personaKey);

    // Pick model for persona
    const modelDecision = pickModelForTaskDetailed({
        persona: personaKey,
        userInput: userMessage,
        task: 'reasoning'
    });
    const selectedModel = modelDecision.model;

    runtimeLog(`   🧠 Model: ${selectedModel} (${modelDecision.selectionReason})`);

    // Call LLM with persona-specific prompt + knowledge map
    const llmResponse = await askLocalLLM(
        promptResult.userMessage,
        enhancedSystemPrompt, // 🔥 Enhanced with agent knowledge
        selectedModel,
        { persona: personaKey }
    );

    runtimeLog('🧪 [DEBUG] raw local LLM result:', (() => {
        try {
            return JSON.stringify(llmResponse, null, 2);
        } catch {
            return '[non-serializable result]';
        }
    })());

    // Normalize LLM output to plain text
    let normalizedText = '';

    if (typeof llmResponse === 'string') {
        normalizedText = llmResponse;
    } else if (llmResponse) {
        normalizedText =
            llmResponse.response ||
            llmResponse.text ||
            llmResponse.message ||
            llmResponse.output ||
            '';
    }

    if (normalizedText && typeof normalizedText === 'string') {
        normalizedText = normalizedText.trim();
    }

    if (!normalizedText) {
        runtimeWarn('⚠️ [glitchOrchestrator] Local LLM vrátil prázdnu odpoveď');
    }

    // 🇸🇰 SLOVAK POLISHER - Post-process response for better Slovak
    const { maybePolish } = await import('../src/core/slovakPolisher.js');

    // v1.3.0: MODEL_REGISTRY bolo odstránené z llmLocal.js, takže
    // musíme byť defenzívni – default je bez forcePolish.
    let forcePolish = false;
    try {
        const maybeModule = await import('../sp4os/llmLocal.js');
        const registry = maybeModule.MODEL_REGISTRY || {};
        const personaConfig = registry && registry[personaKey];
        forcePolish = !!(personaConfig && personaConfig.forcePolish);
    } catch (e) {
        // Ak registry neexistuje alebo import zlyhá, pokračujeme bez núteného polishu.
        forcePolish = false;
    }

    const polished = await maybePolish(normalizedText || '', {
        persona: personaKey,
        skipPolish: context.skipPolish || false,
        forcePolish // 🔥 Force polishing len ak je naozaj definované v registry
    });

    return {
        response: polished || '',
        handledBy: personaKey,
        reasoning: `Direct ${personaKey} handling (orchestrator bypassed)`,
        meta: {
            model: selectedModel,
            selectedModel,
            selectionReason: modelDecision.selectionReason,
            fastPathUsed: modelDecision.fastPathUsed,
            highRiskTrigger: modelDecision.highRiskTrigger,
            highRiskTriggers: modelDecision.highRiskTriggers,
            queryType: modelDecision.queryType,
            bypassMode: true,
            agentKnowledgeInjected: true, // 🔥 Track injection
            slovakPolished: true, // 🇸🇰 Track polishing
            ...promptResult.meta
        }
    };
}

export default {
    orchestrate,
    handlePersonaDirect
};

