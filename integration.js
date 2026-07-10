// integration.js

/**
 * SP4 CORE AGENT - Integration Layer v0.6
 * Zjednocuje všetky moduly do funkčného celku
 *
 * v0.6 UPGRADE: Multi-Agent Architecture
 * v0.7 UPGRADE: SP4AIOS Bridge - Online AI Integration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SP4AIOSBridge } from '../SP4AIOS/src/bridge.js'; // v0.7: Cloud AI Bridge
import { deliberate } from './agentManager.js';
import AutonomousController from './autonomousController.js'; // v1.0: Autonomous decision-making
import AutonomousPlanner from './autonomousPlanner.js'; // v2.0: Mission planning
import { EmotionalProcessor } from './emotionalProcessor.js';
import ExecutionOrchestrator from './executionOrchestrator.js'; // v2.0: Mission execution
import { applyGlitchLayer, detectGlitchOpportunity } from './glitchLayer.js';
import { GracefulDegradationManager } from './gracefulDegradation.js';
import { IdentityManager } from './identity.js';
import { quickSanitize } from './languageSanitizer.js';
import {
  addLogEntry,
  loadMemory,
  quarantineEmotionalContent
} from './memory.js';
import { buildPrompt } from './multiVoice.js';
import { orchestrate } from './orchestration/glitchOrchestrator.js'; // 🌀 GLITCHOSLAV BOSS MODE
import { evaluateRelationshipProgression } from './relationshipEvolution.js';
import { ruleMiningPipeline } from './ruleMiningPipeline.js'; // v1.0: Auto-Learning Rule Miner
import firstAidManifest from './sp4_first_aid/logic_manifest.json' with { type: 'json' }; // v0.1: First Aid SPG
import { runSPG } from './sp4_first_aid/spg.js'; // v0.1: Strict Procedural Gate
import { detectCrisis, getSafeResponse } from './src/core/safetyRails.js'; // crisis/self-harm safety rail (2026-06-26)
import { extractMemoryMetadata } from './sp4os/llmLocal.js';
import { retrieveRelevantMemories } from './sp4os/ragLocal.js'; // v0.6.2: Sentence-transformers RAG
import { processResponseActions } from './src/core/actionRouter.js'; // v0.11.7: Action Layer integration
import { ensureSp4Vibe } from './src/core/antiCorporateFilter.js'; // v0.8.8: Anti-corporate filter
import { calculateConfidenceScore, logConfidenceScore } from './src/core/confidenceScoring.js'; // v1.4.2: Unified confidence scoring
import { contextManager } from './src/core/contextManager.js'; // ⚠️ v1.0.1: Import global contextManager
import { getCoreFallback, sanitizeCoreOutput } from './src/core/coreFallbacks.js';
import { applyDecisionContract, hardenSelfDeceptionDecisionText, isAlreadySharpSelfDeceptionResponse } from './src/core/decisionValidator.js';
import { recordEpoch } from './src/core/epochKeeper.js';
import { validateGroundedResponse } from './src/core/groundingValidator.js'; // v1.4.2: Grounding compliance check
import { enforceSlovak } from './src/core/languageEnforcer.js';
import { detectLanguageHint } from './src/core/languageHintDetector.js'; // v1.3.0: Slovak enforcement
import { detectEnglish } from './src/core/languageUtils.js';
import { validatePersonaOutput } from './src/core/personaRegistry.js'; // v0.10.1: Persona Registry
import { getSignatureLine, isVisionQuestion, needsSignature } from './src/core/questionDetector.js'; // v0.8.8: SP4 signature for key questions
import { getCleanRefusal } from './src/core/responseFilter.js';
import { applyRhythm, detectRhythm } from './src/core/responseRhythm.js'; // v0.10.0: Response rhythm system
import { runtimeDebug, runtimeLog, runtimeWarn } from './src/core/runtimeLogging.js';
import { detectSP4Query, getGroundedFallbackAnswer, getGroundingPrompt } from './src/core/sp4GroundingKnowledge.js'; // v1.4.2: SP4 factual grounding (anti-hallucination)
import { getRelevantKb } from './src/core/kb-provider.js'; // sp4-kb ecosystem facts (2026-06-26)
import { getRandomSp4Tagline, getRandomVisionWhisper } from './src/core/sp4Manifest.js'; // v0.8.7: SP4 tone filter
import { DialogueState, isFollowUpQuestion, resolveDeterministicFollowUp, resolveDialogueTopic, shouldResetDialogueState } from './src/dialogue/dialogueState.js'; // v1.5: Follow-up context continuity
import { scrubCorePoliteness } from './src/personas/core/scrubber.core.js'; // v0.10.3: CORE politeness scrubber
import { normalizePersona } from './src/personas/personas.js'; // v1.4.1: PHASE 2.1 - Persona normalization
import { POPICI_PERSONA } from './src/personas/popici/persona.popici.js';
import { calibrateConfidence } from './src/pipeline/confidenceCalibrator.js';
import { applyFallbackTruth } from './src/pipeline/fallbackTruth.js';
import { runPostResponseImmuneStage } from './src/pipeline/immuneOrchestrator.js';
import { assembleUnifiedMetadata } from './src/pipeline/metadataAssemblyStep.js';
import {
  brutalizeFireResponse,
  cleanupWeirdSlovak,
  getGlobalLanguageFailsafeDecision,
  reconcileLanguageRewrite,
  sanitizeAiCliches,
  stripInternalPromptArtifacts,
  stripResidualEnglish
} from './src/pipeline/postProcessUtils.js';
import {
  isStubLikeResponse,
  looksLikeCanonicalSp4Fallback
} from './src/pipeline/qualityGuards.js';
import {
  buildGuardResult,
  buildRuntimeAuthorityPrompt,
  resolveRuntimeAuthorityGuardOutcome
} from './src/pipeline/runtimeAuthorityGuard.js';
import { buildTranslationTaskPrompt, isExplicitTranslationTask } from './src/pipeline/translationGuard.js';
import { formatPolicy, resolvePolicy } from './src/policy/policy.js'; // v1.4.0: PHASE 2 - Policy-driven routing
import {
  getDeterministicCapabilityResponse,
  getDeterministicCurrentEventsResponse,
  getDeterministicGibberishResponse,
  getDeterministicOperationalTruthResponse,
  getDeterministicPublicContextResponse,
  getDeterministicShortTechResponse,
  getDeterministicSmalltalkResponse,
  getDeterministicSystemInfoResponse,
  isLikelyGibberishInput,
  shouldUsePopiciEdgeShortcut,
} from './src/routing/deterministicRegistry.js';
import { buildDecisionContract, extractIntent, isDecisionIntent } from './src/routing/intentExtractor.js'; // v1.3.0: Deep identity routing
import { analyzeUnified } from './src/routing/unifiedIntent.js'; // Phase 3 Step 1: unified intent for dialogue topic (read-only)
import { detectIdentityHardening } from './src/runtime/identityHardening.js';
import {
  detectPreLlmGuard
} from './src/runtime/responseControl.js';
import { runWritebackTail } from './src/runtime/writebackTail.js';
import { buildProfileMemoryShortcutResponse, detectProfileMemoryShortcutKind } from './src/services/profileMemoryShortcuts.js';
import { logLayerValidation, validateLayerDistinction } from './src/validators/layerValidator.js'; // v0.11.5: Layer distinction validator
import { Supervisor } from './supervisor.js';

function verboseLog(...args) {
  runtimeLog(...args);
}

function extractVerdictLine(text = '') {
  const match = String(text || '').match(/\bVERDIKT:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

function buildRecentDecisionContext(dialogueState = null, maxTurns = 3) {
  const turns = dialogueState?.snapshot?.().turns || [];
  return turns
    .slice(-maxTurns)
    .map((turn) => `${turn.role}: ${turn.text}`)
    .join('\n');
}

function shouldCarryPreviousDecisionVerdict(dialogueState = null, userMessage = '') {
  if (!dialogueState) return false;
  const previousAssistant = dialogueState.getLastAssistantTurn?.();
  if (previousAssistant?.topic !== 'life_decision') return false;
  return isFollowUpQuestion(userMessage, dialogueState);
}

function getTurnPersona(turn = null) {
  const metadata = turn?.metadata || {};
  const values = [
    metadata.selectedPersona,
    metadata.promptMode,
    metadata.finalMode,
    metadata.mode,
    metadata.handledBy,
    metadata.persona,
    turn?.mode,
    turn?.handledBy,
    turn?.persona,
  ]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .map((value) => normalizePersona(value));

  return values.find((value) => ['core', 'glitchoslav', 'popici'].includes(value)) || null;
}

function shouldCarryPopiciFollowUpPersona(dialogueState = null, userMessage = '') {
  if (!dialogueState || !isFollowUpQuestion(userMessage, dialogueState)) {
    return false;
  }

  return getTurnPersona(dialogueState.getLastAssistantTurn?.()) === 'popici';
}

function buildPopiciIdentityResponse() {
  return 'Som Popiči hlas v SP4, ta nie dekorácia do sidebaru. Keď treba rozbiť omáčku a povedať pravdu na rovinu, idem prvý a preložím veci do normálnej reči bez corporate kecov. V SP4 držím brutal-honest polohu, aby si z odpovede dostal konkrétny point, nie vatový motivačný vývar. Keď je téma hlbšia než môj manifestový záber, poviem to na rovinu a prehodím ťa na hlas, čo má na to správny kontext.';
}

function getPopiciCloudSystemPrompt() {
  const directives = POPICI_PERSONA.llmDirectives.join(' ');
  return `You are POPICI KOKOT, brutally honest and direct. No bullshit, straight answers. Slovak language, casual tone. ${directives}`;
}

export const ALLOWED_PERSONA_OVERRIDE_REASONS = new Set([
  'guard',
  'safety',
  'deterministic_identity_lock',
  'meta_refusal',
  'language_failsafe'
]);

export function validatePersonaMetadataInvariant(metadata = {}) {
  const selectedPersona = metadata.selectedPersona || null;
  const promptMode = metadata.promptMode || null;
  const finalMode = metadata.finalMode || null;
  const handledBy = metadata.handledBy || null;
  const persona = metadata.persona || handledBy || null;
  const overrideReason = metadata.personaInvariantOverrideReason || null;

  const values = [selectedPersona, promptMode, finalMode, handledBy, persona]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .map((value) => normalizePersona(value));

  const uniqueValues = [...new Set(values)];
  const pass = uniqueValues.length <= 1;
  const overrideAllowed = overrideReason && ALLOWED_PERSONA_OVERRIDE_REASONS.has(overrideReason);

  return {
    pass: pass || overrideAllowed,
    strictPass: pass,
    overrideAllowed,
    overrideReason,
    values: {
      selectedPersona,
      promptMode,
      finalMode,
      handledBy,
      persona
    },
    normalizedValues: uniqueValues
  };
}

export function assertPersonaMetadataInvariant(metadata = {}) {
  const verdict = validatePersonaMetadataInvariant(metadata);
  if (!verdict.pass) {
    throw new Error(`Persona metadata invariant failed: ${JSON.stringify(verdict.values)}`);
  }
  return verdict;
}

export function scrubPopiciSympathyPhrases(text = '') {
  return String(text || '')
    .replace(/\bJe mi ľúto,?\s*/gi, '')
    .replace(/\bJe mi luto,?\s*/gi, '')
    .replace(/\bDržím ti palce!?/gi, '')
    .replace(/\bDrzim ti palce!?/gi, '')
    .replace(/\bskús sa porozprávať s niekým[^.!?]*[.!?]?/gi, '')
    .replace(/\bskus sa porozpravat s niekym[^.!?]*[.!?]?/gi, '')
    .replace(/\bnie si v tom sám[^.!?]*[.!?]?/gi, '')
    .replace(/\bnie si v tom sam[^.!?]*[.!?]?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeGuardText(text = '') {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function hasDialectMarker(normalized = '') {
  return /\b(ta|dze|jak|ket|abo|brate|bratu|dzis|rozdzel)\b/.test(normalized);
}

const DIALECT_GROUNDED_ROUTES = [
  {
    key: 'dialect_cloud_fallback',
    patterns: [/cloud\s+spadne/, /ked\s+cloud\s+spadne/],
    required: ['ta', 'brate', 'cloud'],
    response: 'Ta brate, keď cloud spadne, SP4 sa má držať local-first jadra. Cloud nie je default; systém prizná limit a ide cez lokálnu cestu bez vymýšľania.'
  },
  {
    key: 'dialect_emotional_step',
    patterns: [/nasraty.*co\s+mam\s+robit/, /co\s+mam\s+robit.*nasraty/],
    required: ['ta', 'krok'],
    response: 'Ta najprv stopni výbuch, brate. Jeden krok: pomenuj, čo ťa nasralo, daj si päť minút bez reakcie a až potom rieš konkrétnu vec.'
  },
  {
    key: 'dialect_sp4_friend',
    patterns: [/vysvetlil\s+sp4.*kamosovi/, /sp4.*kamosovi/],
    required: ['ta', 'sp4'],
    response: 'Ta SP4 je lokálny AI parťák, čo drží pamäť, pravdu a kontrolu u teba, nie v korpo cloude. Kamošovi by som povedal: je to systém, ktorý má pomáhať bez toho, aby prenajímal tvoj rozum cudzím serverom.'
  },
  {
    key: 'dialect_ping_traceroute',
    patterns: [/ping.*traceroute/, /traceroute.*ping/, /rozdzel.*ping/],
    required: ['ping', 'traceroute'],
    response: 'Ta ping overí, či cieľ odpovedá a aká je latencia. Traceroute ukáže trasu cez routery po ceste, takže vidíš, kde sa spojenie láme alebo spomaľuje.'
  },
  {
    key: 'dialect_ollama_default',
    patterns: [/ollama.*default/, /dze\s+bezi.*ollama/, /ollama.*bezi/],
    required: ['localhost', '11434'],
    response: 'Ta brate, Ollama pre SP4 defaultne beží na localhost:11434. Ak ju máš inde, nastav OLLAMA_HOST; inak je to lokálny endpoint, nie cloud.'
  },
  {
    key: 'dialect_sp4_people_not_corp',
    patterns: [/sp4.*ludi.*korpo/, /sp4.*korpo/, /ludi\s+abo\s+pre\s+korpo/],
    required: ['ludi', 'korpo'],
    response: 'Ta SP4 je primárne pre ľudí, ktorí chcú lokálnu kontrolu, pamäť a pravdu pri sebe. Nie je stavaný ako korpo hračka na metriky, tracking a prenájom rozumu do cloudu.'
  },
  {
    key: 'dialect_honesty',
    patterns: [/uprimny.*bez\s+omacky/, /bez\s+omacky.*uprimny/],
    required: ['uprim', 'ta'],
    response: 'Ta áno, úprimne a bez omáčky: keď niečo viem, poviem to priamo; keď neviem, priznám limit a nebudem to baliť do peknej hmly.'
  },
  {
    key: 'dialect_unknown_policy',
    patterns: [/ked\s+nevies.*co\s+spravis/, /co\s+spravis.*ked\s+nevies/],
    required: ['nevies', 'prizna'],
    response: 'Ta keď neviem, správna odpoveď je priznať to, nie hrať múdreho. Potom zúžim otázku, poviem čo chýba, alebo sa spýtam na jeden konkrétny detail.'
  },
  {
    key: 'dialect_not_for_whom',
    patterns: [/komu.*sp4.*radsej\s+neriesi/, /sp4.*radsej\s+neriesi/, /nech\s+sp4\s+radsej/],
    required: ['sp4', 'nie je pre'],
    response: 'Ta SP4 nie je pre človeka, ktorý chce len lacnú autoritu bez vlastnej zodpovednosti. Nie je pre korpo dohľad, slepé poslúchanie ani pre niekoho, kto nechce počuť pravdu.'
  },
  {
    key: 'dialect_sp4_tribe',
    patterns: [/kmen\s+sp4/, /sp4.*kmen/],
    required: ['sp4', 'kmen'],
    response: 'Ta kmeň SP4 znamená ľudí okolo lokálnej slobody, pravdy a vlastného AI systému. Nie fanclub loga, ale partia, čo nechce prenajímať pamäť, dáta a smer korpo cloudu.'
  },
];

function getDialectGroundedRoute(message = '') {
  const normalized = normalizeGuardText(message);

  if (!hasDialectMarker(normalized)) {
    return null;
  }

  return DIALECT_GROUNDED_ROUTES.find((route) =>
    route.patterns.some((pattern) => pattern.test(normalized))
  ) || null;
}

function buildDialectGroundingPrompt(userMessage, fallbackResponse) {
  return `Odpovedz na dialektovu otazku po slovensky s vychodniarskym nadychom.

PRAVIDLA:
1. Max 2 vety.
2. Zachovaj vecne jadro z KOTVY.
3. Pouzi prirodzene "ta" alebo "brate", ak sa to hodi.
4. Nevymyslaj technicke fakty mimo kotvy.

KOTVA:
${fallbackResponse}

OTAZKA:
${userMessage}`.trim();
}

function dialectOutputHasRequiredSignals(output = '', required = []) {
  const normalized = normalizeGuardText(output);
  return required.every((signal) => normalized.includes(normalizeGuardText(signal)));
}

function resolveDialectGroundedOutcome({ rawOutput, route, model, localLlmError = null }) {
  const rawCandidate = String(rawOutput || '').trim();
  const localLlmProven = !localLlmError && rawCandidate.length > 0;
  const finalResponse = localLlmProven && dialectOutputHasRequiredSignals(rawCandidate, route.required)
    ? rawCandidate
    : route.response;

  return {
    response: finalResponse,
    provider: localLlmProven ? 'local_ollama' : 'deterministic_dialect_grounding',
    model: localLlmProven ? model : 'none',
    fallbackUsed: finalResponse !== rawCandidate,
    localLlmProven,
    confidenceScore: localLlmProven ? 0.9 : 0.84,
    confidenceLabel: 'HIGH',
  };
}

function shouldSkipPostResponseImmuneCheck({ userMessage, responseText, metadata, persona, testMode, forceLocal }) {
  if (process.env.SP4_DEBUG === 'true' || persona === 'validator') {
    return { skip: false, reason: null };
  }

  if (testMode) {
    return { skip: true, reason: 'test_mode' };
  }

  if (isStubLikeResponse(responseText)) {
    return { skip: true, reason: 'deterministic_stub' };
  }

  if (looksLikeCanonicalSp4Fallback(userMessage, responseText)) {
    return { skip: true, reason: 'canonical_sp4_fallback' };
  }

  const provider = metadata?.execution?.provider || metadata?.provider || null;
  const cloudUsed = metadata?.execution?.cloudUsed === true;
  const engine = String(metadata?.engine || '');
  const isGuardResponse = metadata?.orchestrationMode === 'guard' || metadata?.role === 'GUARD';

  if (isGuardResponse) {
    return { skip: true, reason: 'guard_response' };
  }

  if (forceLocal && !cloudUsed && provider === 'local_ollama' && (metadata?.testMode === true || engine.includes('test_mode'))) {
    return { skip: true, reason: 'local_smoke_flow' };
  }

  return { skip: false, reason: null };
}

/**
 * SP4 Integrated Agent
 * Orchestruje všetky subsystémy
 */
export class SP4IntegratedAgent {
  constructor() {
    this.supervisor = new Supervisor();
    this.emotionalProcessor = new EmotionalProcessor();
    this.identityManager = new IdentityManager();
    this.degradationManager = new GracefulDegradationManager();
    this.contextManager = contextManager; // ⚠️ v1.0.1: Use global singleton
    this.rhythmOverride = null; // v0.10.0: Force specific rhythm mode

    // 🌉 v0.7: SP4AIOS Bridge - Cloud AI Integration
    // Load API keys from SP4AIOS .env file
    const aiosEnvPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'SP4AIOS', '.env');

    let groqKey = process.env.GROQ_API_KEY;
    let googleKey = process.env.GOOGLE_API_KEY;

    // Try to load from SP4AIOS/.env if keys not in environment
    if ((!groqKey || !googleKey) && fs.existsSync(aiosEnvPath)) {
      const envContent = fs.readFileSync(aiosEnvPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        if (key === 'GROQ_API_KEY') groqKey = value;
        if (key === 'GOOGLE_API_KEY') googleKey = value;
      });
    }

    this.aiosBridge = new SP4AIOSBridge({
      groqApiKey: groqKey,
      googleApiKey: googleKey,
      enableCache: true,
      enableCostTracking: true,
      cacheTTL: 3600000, // 1 hour
      timeout: 90000 // 90s for complex queries
    });
    this.cloudAIEnabled = !!(groqKey || googleKey);
    this.lastLocalError = null; // Track local failures for fallback
    this.dailyCloudCost = 0; // Track daily spending
    this.maxDailyCloudCost = 5.0; // $5 daily limit

    // 🧠 v1.0: AUTONOMOUS CONTROLLER - Veliteľ mozgov
    this.autonomousController = new AutonomousController(this);
    verboseLog(`   🧠 Autonomous Controller: ✅ Initialized`);

    // 🚀 v2.0: FULL AUTONOMY - Mission planning & execution
    this.autonomousPlanner = new AutonomousPlanner();
    this.executionOrchestrator = new ExecutionOrchestrator(this);
    verboseLog(`   🚀 Full Autonomy v2.0: ✅ Initialized`);

    verboseLog(`   🌉 SP4AIOS Bridge: ${this.cloudAIEnabled ? '✅ Enabled' : '❌ Disabled'} (Groq: ${!!groqKey}, Google: ${!!googleKey})`);

    this.initialized = false;
    // 🔁 v1.5: Follow-up dialogue state (turn tracking for context continuity)
    this._dlgState = new DialogueState({ maxTurns: 6, topicDecayTurns: 4 });
    this._lastDecisionVerdict = null;
  }

  // krátky guard na ultra-krátke vstupy typu "ta co?"
  isVeryShortInput(userMessage = '') {
    const words = String(userMessage || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return words.length > 0 && words.length <= 3;
  }

  // --- LANGUAGE HELPERS -------------------------------------------------------

  /**
   * Detekuje, či užívateľ píše primárne po slovensky
   * @param {string} text - užívateľská správa
   * @returns {boolean} - true ak text je Slovak-like
   */
  _isUserSlovakLike(text) {
    if (!text || typeof text !== 'string') return false;

    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return false;

    // Detekcia anglických slov
    const commonEnglish = /\b(the|and|of|to|in|is|that|with|for|are|was|this|be)\b/gi;
    const englishMatches = (text.match(commonEnglish) || []).length;
    const englishRatio = englishMatches / words.length;

    // Detekcia slovenských znakov
    const slovakChars = /[áäčďéíĺľňóôŕšťúýž]/gi;
    const slovakHits = (text.match(slovakChars) || []).length;

    // Ak má nízky anglický pomer (<40%) alebo 3+ slovenské znaky → Slovak-like
    return englishRatio < 0.4 || slovakHits >= 3;
  }

  /**
   * Detekuje explicitný režim z prefixu v správe (v0.8.3)
   * @param {string} input - užívateľská správa
   * @returns {string|null} - "core" | "glitch" | "popici" | null
   */
  _detectExplicitModePrefix(input) {
    const trimmed = input.trim();
    const cleaned = trimmed.replace(/^([→:])\s*/, '');
    const firstLine = cleaned.split('\n')[0].trim();
    const lowerFirstLine = firstLine.toLowerCase();

    // SP4_CORE variants (case-insensitive)
    if (lowerFirstLine.startsWith('core:') ||
      lowerFirstLine === 'core' ||
      /^core\s*(→|:)/.test(lowerFirstLine) ||
      lowerFirstLine.startsWith('sp4_core') ||
      lowerFirstLine === 'sp4_core' ||
      /^sp4_core\s*(→|:)/.test(lowerFirstLine)) {
      return 'core';
    }

    // Glitchoslav variants
    if (lowerFirstLine.startsWith('glitch:') ||
      lowerFirstLine === 'glitch' ||
      /^glitch\s*(→|:)/.test(lowerFirstLine) ||
      lowerFirstLine.startsWith('glitchoslav') ||
      lowerFirstLine === 'glitchoslav' ||
      /^glitchoslav\s*(→|:)/.test(lowerFirstLine)) {
      return 'glitchoslav';
    }

    // Popiči variants
    if (lowerFirstLine.startsWith('popici:') ||
      lowerFirstLine === 'popici' ||
      /^popici\s*(kokot)?\s*(→|:)/.test(lowerFirstLine) ||
      lowerFirstLine.startsWith('popiči') ||
      lowerFirstLine.startsWith('popiči kokot') ||
      lowerFirstLine === 'popiči' ||
      /^popiči\s*(kokot)?\s*(→|:)/.test(lowerFirstLine)) {
      return 'popici';
    }

    return null;
  }

  _stripExplicitModePrefix(input) {
    const text = String(input || '').trim();
    return text
      .replace(/^(?:sp4_core|core|glitchoslav|glitch|popi[cč]i(?:\s+kokot)?)\s*(?:→|:)\s*/i, '')
      .trim();
  }

  /**
   * Inicializácia všetkých subsystémov
   */
  async initialize() {
    try {
      // Inicializuj identity manager
      await this.identityManager.initialize();
      verboseLog('✅ Identity Manager inicializovaný');

      // Načítaj pamäť
      const memory = await loadMemory();
      verboseLog('✅ Memory načítaná');

      // Vykonaj prvotný audit identity
      await this.identityManager.performAudit();
      verboseLog('✅ Identity Audit dokončený');

      // Monitor system health
      this.supervisor.monitorSystem();
      verboseLog('✅ Supervisor aktivovaný');

      // 🛡️ v0.10.0-alpha.4: Reset bot detection history
      const { resetBotDetection } = await import('./src/protection/botKiller.js');
      resetBotDetection();

      this.initialized = true;
      verboseLog('\n🔥 SP4 CORE AGENT ready. "Be real. Be free."\n');

      return { success: true, message: 'Initialization complete' };
    } catch (err) {
      console.error('❌ Chyba pri inicializácii:', err);
      this.supervisor.detectError(err.message);
      this.supervisor.activateFallback('safe_mode');

      return { success: false, error: err.message };
    }
  }

  /**
   * Hlavná processing pipeline pre user message.
   * Centralizovaný _dlgState writeback — user aj assistant turn sa zapisujú tu,
   * takže ask aj priame volania sdieľajú rovnaký dialógový stav.
   * @param {string} userMessage - Správa od užívateľa
   * @param {string} mode - Režim (core, glitchoslav, popici, validator)
   * @param {Object} options - Processing options
   * @returns {Object} Response object
   */
  async processMessage(userMessage, mode = 'core', options = {}) {
    if (!this.initialized) {
      throw new Error('Agent nie je inicializovany. Zavolaj initialize() najprv.');
    }
    // Phase 3 Step 1: intent pre dialogue topic ide cez unifiedIntent (read-only, bez side-effectov).
    // analyzeUnified(userMessage).intent === extractIntent(userMessage) (rovnaké opts={}).
    // Defenzívny fallback na legacy extractIntent zachová správanie, ak by unified hodil chybu.
    let _topicIntent;
    try {
      _topicIntent = analyzeUnified(userMessage).intent;
    } catch {
      _topicIntent = extractIntent(userMessage);
    }
    const dialogueTopic = resolveDialogueTopic(userMessage, _topicIntent, this._dlgState);
    this._dlgState.addTurn({ role: 'user', text: userMessage, topic: dialogueTopic });
    const result = await this._processMessageCore(userMessage, mode, options);
    await this._ensureEarlyWriteback(userMessage, mode, result);
    const _assistantText = typeof result?.response === 'string' ? result.response : String(result?.response || '');
    if (_assistantText.trim()) {
      const assistantModeRaw = result?.metadata?.handledBy
        || result?.metadata?.finalMode
        || result?.metadata?.selectedPersona
        || result?.metadata?.promptMode
        || mode;
      const assistantMode = normalizePersona(String(assistantModeRaw || 'core'));
      this._dlgState.addTurn({
        role: 'assistant',
        text: _assistantText,
        topic: dialogueTopic || this._dlgState.currentTopic || null,
        mode: assistantMode,
        persona: assistantMode,
        handledBy: assistantMode
      });
    }
    return result;
  }

  async _ensureEarlyWriteback(userMessage, mode, result) {
    if (!result?.success) {
      return;
    }

    const metadata = result.metadata || result.meta || {};
    const responseText = typeof result.response === 'string'
      ? result.response
      : String(result.response || '');

    if (!responseText.trim()) {
      return;
    }

    // Main pipeline already persisted this turn
    if (metadata.memoryWriteTailRan === true) {
      return;
    }

    // Explicit write-block contracts must stay blocked
    if (metadata.memoryWriteBlocked === true || metadata.skipMemoryWrite === true) {
      return;
    }

    const writeMode = normalizePersona(
      metadata.finalMode
      || metadata.promptMode
      || metadata.selectedPersona
      || metadata.handledBy
      || mode
      || 'core'
    );

    const compactMetadata = {
      provider: metadata.provider || null,
      handledBy: metadata.handledBy || null,
      intent: metadata.intent || null,
      role: metadata.role || 'GUARD',
      route: metadata.route || null,
      policyReason: metadata.policyReason || null,
      guard: metadata.guard || null,
      source: 'processMessage_early_writeback'
    };

    const writeDecision = await addLogEntry(userMessage, responseText, writeMode, compactMetadata);

    metadata.memoryWriteTailRan = true;
    metadata.memoryWritePersisted = writeDecision?.written === true;
    metadata.memoryWriteBlocked = writeDecision?.written === false;
    metadata.memoryWriteBlockReason = writeDecision?.blockReason || null;

    if (result.metadata) {
      result.metadata = metadata;
    }
    if (result.meta) {
      result.meta = metadata;
    }
  }

  /**
   * Interná implementácia processing pipeline (volaná cez processMessage wrapper).
   * @param {string} userMessage - Správa od užívateľa
   * @param {string} mode - Režim (core, glitchoslav, popici, validator)
   * @param {Object} options - Processing options
   * @param {boolean} options.forceLocal - Force local Ollama only (bypass cloud)
   * @param {boolean} options.bypassAutonomous - Skip autonomous controller decision
   * @returns {Object} Response object
   */
  async _processMessageCore(userMessage, mode = 'core', options = {}) {
    if (!this.initialized) {
      throw new Error('Agent nie je inicializovaný. Zavolaj initialize() najprv.');
    }

    const originalUserMessage = userMessage;

    // 🔥 v1.4.2: Normalize mode parameter (BUG #2 - handle object vs string)
    const actualMode = typeof mode === 'string' ? mode : (mode?.mode || 'core');
    const actualOptions = typeof mode === 'object' ? mode : options;

    // 🔥 v1.4.1: Reset council activation guard at start of request
    this._councilActivated = false;

    // 🔥 v1.4.2: Declare variables used in confidence scoring (need function-level scope)
    let triggeredMemories = []; // Memory search results
    let ratioDropPercent = 0;   // Language enforcement drop
    let validation = { valid: true, reason: 'not_validated' }; // Persona validation result
    let orchestrationResult = null; // Orchestrator output (used later for confidence penalties)

    // 🚨 v1.3.2: PRODUCTION SAFETY - Prevent SP4_TEST from leaking into prod
    if (process.env.NODE_ENV === 'production' && process.env.SP4_TEST === 'true') {
      console.error('🚨 CRITICAL: SP4_TEST=true detected in NODE_ENV=production!');
      console.error('   This is a configuration error. Test mode MUST NOT run in production.');
      console.error('   Forcing SP4_TEST=false for safety.');
      process.env.SP4_TEST = 'false';
    }

    // 🔒 v1.4.0: PHASE 2 - Resolve routing policy (single source of truth)
    const policy = resolvePolicy(actualOptions, process.env);
    runtimeLog(`📄 POLICY: ${formatPolicy(policy)}`);

    // 🔥 v1.3.1: Force local routing for test purity
    // 🔒 v1.4.0: Policy enforces this now (forceLocal takes precedence)
    const forceLocal = policy.forceLocal || actualOptions.forceLocal || actualOptions.bypassAutonomous || process.env.SP4_TEST === 'true';

    // 🔥 v1.4.2: TEST MODE - Minimal pipeline (skip orchestration/council)
    const testMode = process.env.SP4_TEST === 'true' || actualOptions.testMode === true || actualOptions.forceLocalTest === true;
    const bypassBotProtection = actualOptions?.bypassBotProtection === true;

    // 🔥 v1.4.2: HONEST LOGS - Separate policy vs execution
    if (policy.forceLocal) {
      runtimeLog('🔒 POLICY: Force local mode (cloud execution blocked)');
    }
    if (testMode && !policy.forceLocal) {
      runtimeLog('🧪 TEST MODE: Cloud execution disabled (contract test - local provider OK)');
    }
    if (testMode) {
      runtimeLog('🧪 TEST MODE: Minimal pipeline (orchestration disabled, direct persona LLM)');
    }

    // 🔥 v1.3.1: ROOT FIX - Unified text extraction helper
    // Single function to extract text from any LLM result format (cloud/local/council)
    const extractText = (r) => {
      if (!r) return '';
      if (typeof r === 'string') return r;

      // Try all known response formats
      return (
        r?.response ??
        r?.text ??
        r?.message?.content ??
        r?.choices?.[0]?.message?.content ??
        r?.data?.text ??
        r?.output ??
        r?.content ??
        r?.final?.text ??
        r?.final?.message ??
        r?.raw ??
        ''
      ).toString();
    };

    // 🚨 v0.1: FIRST AID SPG - STRICTEST PRIORITY (before any processing)
    // Emergency gate: KPR, first aid → static template, NO LLM
    const emergencyResponse = runSPG(userMessage, firstAidManifest);
    if (emergencyResponse) {
      runtimeLog('🚨 === SP4 FIRST AID SPG ACTIVATED === 🚨');
      runtimeLog('   Emergency template returned - LLM bypassed');

      // 🔥 v1.3.1: Unified metadata contract
      const emergencyMeta = {
        handledBy: 'sp4_first_aid_spg',
        emergency: true,
        bypassLLM: true,
        model: 'none'
      };

      return {
        success: true,
        response: emergencyResponse,
        executionTime: 0,
        metadata: emergencyMeta,
        meta: emergencyMeta // 🔥 v1.3.1: Unified alias
      };
    }

    // 🚨 Crisis/self-harm safety rail — druhý najvyšší guard, pred akýmkoľvek LLM volaním.
    // Rovnaký vzor ako v bridge-server.js (zapojené 2026-06-25).
    const crisis = detectCrisis(userMessage);
    if (crisis) {
      runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'crisis_safety_rail', crisisType: crisis.type });
      return buildGuardResult({
        response: getSafeResponse(crisis),
        handledBy: 'sp4_safety_rail',
        provider: 'none',
        policy,
        emotionalAnalysis: null,
        capabilityLevel: this.degradationManager.currentLevel,
        taskType: 'crisis_safety',
        processingTime: 0,
        intent: 'crisis_safety',
        reasoning: `Crisis detected (${crisis.type}) — bypassed LLM, returned deterministic safety response`,
        confidenceScore: 1.0,
        confidenceLabel: 'VERY_HIGH',
        extraMetadata: { crisisType: crisis.type, crisisSeverity: crisis.severity }
      });
    }

    // 🔥 v1.4.2: SHORT REPLY GUARD - Only for meaningful greetings/confirmations
    // NOT for random short text (typos, incomplete queries)
    const normalizedInput = String(userMessage || '').trim().toLowerCase();

    // 🔒 PUNCTUATION-ONLY GUARD - catch "???", "...", "!!" before LLM
    const isPunctuationOnly = normalizedInput.length > 0 &&
      /^[^a-zA-ZáäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ0-9\s]+$/.test(normalizedInput);

    if (isPunctuationOnly) {
      runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'micro_reply', input: userMessage.slice(0, 80) });
      return buildGuardResult({
        response: 'Hmm. Chceš niečo povedať?',
        handledBy: 'short_reply_guard',
        provider: 'local_ollama',
        policy,
        emotionalAnalysis: null,
        capabilityLevel: this.degradationManager.currentLevel,
        taskType: 'short_input',
        processingTime: 0,
        intent: 'short_input',
        reasoning: 'Punctuation-only input guard resolved before LLM',
        confidenceScore: 1.0,
        confidenceLabel: 'VERY_HIGH'
      });
    }

    // Whitelist: known short phrases that deserve instant reply
    const meaningfulShortPhrases = [
      'hi', 'hello', 'hey', 'ahoj', 'nazdar', 'čau', 'servus',
      'ok', 'hej', 'ano', 'áno', 'yes', 'nie', 'no', 'nope',
      'ďakujem', 'díky', 'thanks', 'thx',
      'pockaj', 'wait', 'stop'
    ];

    const isShortAndMeaningful = meaningfulShortPhrases.includes(normalizedInput);

    if (isShortAndMeaningful) {
      const greetingsEn = ['hi', 'hello', 'hey'];
      const greetingsSk = ['ahoj', 'nazdar', 'čau', 'servus'];
      const confirmations = ['ok', 'hej', 'ano', 'áno', 'yes'];
      const negations = ['nie', 'no', 'nope'];
      const thanks = ['ďakujem', 'díky', 'thanks', 'thx'];
      const waits = ['pockaj', 'wait', 'stop'];

      let shortReply;
      if (greetingsEn.includes(normalizedInput) || greetingsSk.includes(normalizedInput)) {
        shortReply = getDeterministicSmalltalkResponse(userMessage) || 'Nazdar. Som tu a môžeme ísť na vec.';
      } else if (confirmations.includes(normalizedInput)) {
        shortReply = 'Dobre. Pokračujem.';
      } else if (negations.includes(normalizedInput)) {
        shortReply = 'Chápu. Zastavujem.';
      } else if (thanks.includes(normalizedInput)) {
        shortReply = 'Nemáš za čo. Môžeme pokračovať.';
      } else if (waits.includes(normalizedInput)) {
        shortReply = 'Okej, čakám.';
      } else {
        shortReply = 'Ta žijem, bratu. Čo máš na srdci?';
      }

      runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'micro_reply', input: userMessage.slice(0, 80) });
      return buildGuardResult({
        response: shortReply,
        handledBy: 'CORE',
        provider: 'deterministic_shortcut',
        policy,
        emotionalAnalysis: null,
        capabilityLevel: this.degradationManager.currentLevel,
        taskType: 'short_input',
        processingTime: 0,
        intent: 'short_input',
        reasoning: 'Short meaningful input guard resolved request before orchestration',
        confidenceScore: 1.0,
        confidenceLabel: 'VERY_HIGH',
        extraMetadata: {
          guard: 'short_reply_guard',
          policyReason: 'deterministic_micro_dialogue_shortcut'
        }
      });
    }

    if (isLikelyGibberishInput(userMessage)) {
      runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'gibberish', input: userMessage.slice(0, 80) });
      return buildGuardResult({
        response: getDeterministicGibberishResponse(),
        handledBy: 'gibberish_guard',
        provider: 'deterministic_gibberish',
        policy,
        emotionalAnalysis: null,
        capabilityLevel: this.degradationManager.currentLevel,
        taskType: 'short_input',
        processingTime: 0,
        intent: 'gibberish_input',
        reasoning: 'Likely gibberish input guard resolved request before orchestration',
        confidenceScore: 1.0,
        confidenceLabel: 'VERY_HIGH'
      });
    }

    if (shouldResetDialogueState(userMessage)) {
      this._dlgState?.clear?.();
      runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'dialogue_reset', input: userMessage.slice(0, 80) });
      return buildGuardResult({
        response: 'Jasné. Starý kontext pustíme a môžeme ísť odznova.',
        handledBy: 'CORE',
        provider: 'deterministic_shortcut',
        policy,
        emotionalAnalysis: null,
        capabilityLevel: this.degradationManager.currentLevel,
        taskType: 'dialogue_reset',
        processingTime: 0,
        intent: 'dialogue_reset',
        reasoning: 'Dialogue reset phrase resolved before orchestration',
        confidenceScore: 1.0,
        confidenceLabel: 'VERY_HIGH',
        extraMetadata: {
          guard: 'dialogue_reset_guard',
          policyReason: 'deterministic_core_general_shortcut'
        }
      });
    }

    // 🔒 EXPLICIT MODE PREFIX CHECK (v0.8.3) - HIGHEST PRIORITY
    // Detekcia prefixov: SP4_CORE, Glitchoslav, Popiči → force lock mode
    const explicitMode = this._detectExplicitModePrefix(userMessage);
    let lockModeForThisTurn = false;
    let explicitPersona = null;

    if (explicitMode) {
      runtimeLog(`   🔒 EXPLICIT MODE PREFIX: ${explicitMode.toUpperCase()} detected`);
      runtimeLog(`   ⚠️  Auto-detection disabled for this turn (intensity check, MODE_COMPASS bypassed)`);
      mode = explicitMode;
      explicitPersona = explicitMode;
      lockModeForThisTurn = true;
      userMessage = this._stripExplicitModePrefix(userMessage) || userMessage;
    }

    // 🎭 MODE COMMAND HANDLER
    if (userMessage.trim().startsWith('/mode ')) {
      const { setMode, getModeConfirmation } = await import('./src/core/modeCompass.js');
      const requestedMode = userMessage.trim().substring(6).trim().toLowerCase();
      const success = setMode(requestedMode);

      // 🔥 v1.3.1: Unified metadata contract
      const modeMeta = {
        handledBy: 'mode_command',
        model: 'none',
        command: '/mode',
        requestedMode
      };

      if (success) {
        const confirmation = getModeConfirmation(requestedMode);
        return {
          response: confirmation,
          executionTime: 0,
          metadata: modeMeta,
          meta: modeMeta // 🔥 v1.3.1: Unified alias
        };
      } else {
        return {
          response: "Neznámy režim. Dostupné: /mode auto, /mode core, /mode popici, /mode glitchoslav",
          executionTime: 0,
          metadata: modeMeta,
          meta: modeMeta // 🔥 v1.3.1: Unified alias
        };
      }
    }

    const startTime = Date.now();
    let enforcementResult = null;

    const isPopiciEdgeShortcut = shouldUsePopiciEdgeShortcut(userMessage, { lockMode: lockModeForThisTurn });

    if (isPopiciEdgeShortcut) {
      runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'popici_edge', input: userMessage.slice(0, 80) });
      return buildGuardResult({
        response: 'Ta brate, bordel pomenovaný. Pointa: niečo tu smrdí v routingu alebo odpovedi, tak to treba chytiť priamo a opraviť bez cirkusu.',
        handledBy: 'popici',
        provider: 'deterministic_shortcut',
        policy,
        emotionalAnalysis: null,
        capabilityLevel: this.degradationManager.currentLevel,
        taskType: 'popici_edge',
        processingTime: Date.now() - startTime,
        intent: 'dialect_popici',
        reasoning: 'Popici edge shortcut resolved before freeform LLM',
        confidenceScore: 1.0,
        confidenceLabel: 'VERY_HIGH',
        selectedPersona: 'popici',
        promptMode: 'popici',
        finalMode: 'popici',
        extraMetadata: {
          guard: 'popici_edge_guard',
          policyReason: 'deterministic_popici_shortcut'
        }
      });
    }

    const coreGeneralShortcutInput = String(userMessage || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    let coreGeneralShortcutResponse = null;
    if (!lockModeForThisTurn) {
      if (/^na\s+com\s+teraz\s+robime\??$/.test(coreGeneralShortcutInput)) {
        coreGeneralShortcutResponse = 'Teraz riešime hlavne spevňovanie jadra SP4. Menej chaosu v runtime, čistejšiu pamäť, pevnejšiu dialogue continuity a testy, ktoré ustrážia, že sa systém nerozsype pri ďalšom raste.';
      } else if (/^ako\s+by\s+si\s+mi\s+(poradil|pomohol)\s+v\s+zivote\??$/.test(coreGeneralShortcutInput)) {
        coreGeneralShortcutResponse = 'Poctivo: začni pravdou, nie dokonalým plánom. Vyber jednu vec, ktorá ťa najviac brzdí, a sprav dnes jeden malý konkrétny krok. Keď príde chyba, neber ju ako rozsudok, ale ako signál čo upraviť ďalej.';
      } else if (/^kolko\s+ma\s+sp4\s+agentov\??\s+a\s+akych\??$/.test(coreGeneralShortcutInput)) {
        coreGeneralShortcutResponse = 'SP4 má 3 hlavné persony/agenty: CORE, GLITCHOSLAV a POPIČI. CORE drží vecnosť, GLITCHOSLAV hľadá nečakané súvislosti a POPIČI drží tvrdší priamy hlas. VALIDATOR je validačná vrstva, nie štvrtá hlavná persona.';
      }
    }

    if (coreGeneralShortcutResponse) {
      runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'core_general', input: userMessage.slice(0, 80) });
      return buildGuardResult({
        response: coreGeneralShortcutResponse,
        handledBy: 'CORE',
        provider: 'deterministic_shortcut',
        policy,
        emotionalAnalysis: null,
        capabilityLevel: this.degradationManager.currentLevel,
        taskType: 'core_general_shortcut',
        processingTime: Date.now() - startTime,
        intent: 'core_general_shortcut',
        reasoning: 'Core general shortcut resolved before freeform LLM',
        confidenceScore: 1.0,
        confidenceLabel: 'VERY_HIGH',
        extraMetadata: {
          guard: 'core_general_guard',
          policyReason: 'deterministic_core_general_shortcut'
        }
      });
    }

    // 🔥 FIX 1: ENFORCER POLICY podľa jazyka usera (aj pre poéziu/manifest)
    // Ak je user input primárne po slovensky, zapni jazykový enforcer pre všetky typy odpovedí
    const userIsSlovak = this._isUserSlovakLike(userMessage);

    function normalizeNoDiacritics(str) {
      if (!str) return '';
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    }

    function isVeryShortGreeting(input) {
      if (!input) return false;

      const raw = input.trim();
      const norm = raw.toLowerCase();
      const normNoDia = normalizeNoDiacritics(raw);

      if (normNoDia.length > 18) return false;

      const base = [
        'hej', 'hi', 'ahoj', 'cau', 'cauko', 'caute',
        'cus', 'cusko', 'servus', 'serus',
        'si', 'si?', 'sitam', 'si tam', 'zijes', 'zijes?', 'ziješ', 'ziješ?'
      ];

      const stripped = normNoDia
        .replace(/[?!\.\,\-\_\~]+/g, '')
        .replace(/\s+/g, '');

      if (base.includes(normNoDia) || base.includes(stripped)) return true;

      // jednoslovné ultrakrátke pozdravy
      if (stripped.length <= 4 && ['hej', 'hi', 'cau', 'cus'].some(g => stripped.startsWith(g))) {
        return true;
      }

      return false;
    }

    if (isVeryShortGreeting(userMessage)) {
      return {
        success: true,
        response: 'Hej, žijem. 🌀 Povedz, čo riešiš – nie som call centrum.',
        usedCloud: false,
        metadata: {
          taskType: 'greeting',
          handledBy: 'shortcut',
          model: 'shortcut',
          role: 'ORCHESTRATOR'
        }
      };
    }

    // 🚀 v2.0: MISSION COMMAND HANDLER - Full Autonomy
    if (userMessage.trim().startsWith('/mission ')) {
      const goal = userMessage.trim().substring(9).trim();

      runtimeLog('\n🚀 === FULL AUTONOMY v2.0 ACTIVATED === 🚀\n');

      try {
        // PHASE 1: Planning
        const plan = await this.autonomousPlanner.createMissionPlan(goal, {
          urgency: 'normal',
          budget: 'balanced'
        });

        // PHASE 2: Approval prompt
        const approvalPrompt = this.buildApprovalPrompt(plan);

        // For now, auto-approve (later add user confirmation)
        runtimeLog('\n📊 APPROVAL: Auto-approved (v2.0 beta)\n');

        // PHASE 3: Execution
        const result = await this.executionOrchestrator.executeMission(plan, {
          onProgress: (event) => {
            // Progress events logged by orchestrator
          }
        });

        // PHASE 4: Build response
        const response = this.buildMissionResponse(result);

        return {
          success: result.success,
          response,
          executionTime: Date.now() - startTime,
          meta: {
            missionMode: true,
            missionId: plan.mission.id,
            tasksCompleted: result.results.length,
            totalCost: result.totalCost,
            totalTime: result.totalTime
          }
        };

      } catch (error) {
        console.error(`\n❌ Mission failed: ${error.message}`);
        return {
          success: false,
          response: `🚨 Mission failed: ${error.message}\n\nSkús to znovu alebo rozbi úlohu na menšie časti.`,
          executionTime: Date.now() - startTime,
          meta: { missionMode: true, error: error.message }
        };
      }
    }

    try {
      // 🛡️ v0.10.0-alpha.4: BOT KILLER - FIRST LINE OF DEFENSE
      if (!bypassBotProtection) {
        const { detectBot, getBotResponse } = await import('./src/protection/botKiller.js');
        const botCheck = detectBot(userMessage, Date.now());

        if (botCheck.action === 'block') {
          runtimeWarn(`   🛡️ BOT BLOCKED (${(botCheck.confidence * 100).toFixed(0)}% confidence)`);
          runtimeWarn(`   📊 Reasons: ${botCheck.reasons.join(', ')}`);

          const botResponse = getBotResponse(botCheck);
          return {
            success: true,
            response: botResponse,
            executionTime: Date.now() - startTime,
            meta: { botBlocked: true, confidence: botCheck.confidence }
          };
        }

        if (botCheck.action === 'challenge') {
          runtimeWarn(`   ⚠️ Bot challenge issued (${(botCheck.confidence * 100).toFixed(0)}% confidence)`);
          const challengeResponse = getBotResponse(botCheck);
          return {
            success: true,
            response: challengeResponse,
            executionTime: Date.now() - startTime,
            meta: { botChallenge: true, confidence: botCheck.confidence }
          };
        }

        // Monitor mode - log but continue
        if (botCheck.action === 'monitor') {
          runtimeLog(`   🔍 Bot monitoring (${(botCheck.confidence * 100).toFixed(0)}% suspicion: ${botCheck.reasons.join(', ')})`);
        }
      } else {
        runtimeLog('   🧪 Bot protection bypassed by explicit runtime option');
      }

      // KROK 1: Emotional Analysis (SKIP if explicit mode locked)
      runtimeLog('🧠 Analyzujem emocionálny obsah...');
      const emotionalAnalysis = this.emotionalProcessor.analyzeEmotionalContent(userMessage);

      runtimeLog(`   Intensity: ${emotionalAnalysis.intensity.toFixed(2)} (${emotionalAnalysis.level})`);
      runtimeLog(`   Action: ${emotionalAnalysis.action}`);

      // 🔒 SKIP intensity override if explicit mode is locked
      if (!lockModeForThisTurn && emotionalAnalysis.intensity > 0.7) {
        runtimeLog(`   🔥 High intensity (${emotionalAnalysis.intensity.toFixed(2)}) would force POPICI, but explicit mode NOT set`);
        // Normal intensity routing continues...
      } else if (lockModeForThisTurn) {
        runtimeLog(`   🔒 Explicit mode locked - intensity routing DISABLED`);
      }

      // KROK 2: Quarantine ak je potrebné
      if (emotionalAnalysis.shouldGround && emotionalAnalysis.intensity >= 0.9) {
        runtimeLog('🔒 Karanténa vysokého emočného obsahu...');
        await quarantineEmotionalContent(
          userMessage,
          emotionalAnalysis.intensity,
          emotionalAnalysis
        );
      }

      // KROK 3: Update degradation metrics
      this.degradationManager.updateMetrics({
        emotionalLoad: emotionalAnalysis.intensity
      });

      // KROK 4: Auto-adapt capability level
      runtimeLog('⚙️ Vyhodnocujem capability level...');
      const adaptResult = await this.degradationManager.autoAdapt();

      if (adaptResult.currentLevel) {
        runtimeLog(`   Level: ${adaptResult.currentLevel}`);
      }

      // KROK 5: Grounding ak je potrebné
      let groundingPrompt = null;
      if (emotionalAnalysis.shouldGround) {
        runtimeLog('🧘 Aktivujem grounding rutinu...');
        const grounding = this.emotionalProcessor.activateGroundingRoutine(userMessage);
        groundingPrompt = grounding.prompt;
        runtimeLog(`   Strategy: ${grounding.strategy}`);
      }

      // KROK 6: Select best model for task
      // v0.11.1: Added OVERLOAD detection (70B trigger)
      const taskType = this.determineTaskType(userMessage, mode);

      // 🧠 v0.11.1: Check for OVERLOAD first (70B beast for complex queries)
      const { PRIMARY_MODEL, pickModelForTaskDetailed } = await import('./sp4os/llmLocal.js');
      const modelDecision = pickModelForTaskDetailed({
        persona: mode,
        userInput: userMessage,
        task: taskType
      });
      const smartModel = modelDecision.model;

      // 🧠 FALLBACK: Use modelRouting.js for legacy compatibility
      const { chooseModel } = await import('./src/core/modelRouting.js');
      const emotionTag = emotionalAnalysis.dominantEmotion || 'neutral';
      const legacyModel = chooseModel({
        mode,
        task: taskType,
        emotion: emotionTag
      });

      // Prefer smart routing (overload detection), fallback to legacy
      const selectedModel = smartModel || legacyModel;

      runtimeLog(`🎯 Vybraný model: ${selectedModel} (mode: ${mode}, task: ${taskType}, emotion: ${emotionTag}, reason: ${modelDecision.selectionReason})`);

      // KROK 6.5: Check Fire Mode status (v0.10.1)
      const { shouldActivateFireMode, activateFireMode, getFireOverride } = await import('./src/core/fireMode.js');
      const fireOverride = getFireOverride();

      let isFireMode = false;
      let fireReason = null;

      if (fireOverride?.active) {
        isFireMode = true;
        fireReason = fireOverride.reason;
        runtimeLog(`   🔥 Fire Mode: MANUAL OVERRIDE (intensity: ${fireOverride.intensity})`);
      } else {
        const fireCheck = shouldActivateFireMode(userMessage, {
          emotion: emotionalAnalysis,
          repeatPattern: false
        });
        if (fireCheck.shouldActivate) {
          isFireMode = true;
          fireReason = fireCheck.reason;
          runtimeLog(`   🔥 Fire Mode: AUTO-ACTIVATED (${fireCheck.reason})`);
        }
      }

      // 🔥 FIRE MODE ROUTING: persona first, diction later.
      // Explicit persona prefix is sacred; otherwise Fire routes to POPICI before prompt build.
      if (isFireMode && !lockModeForThisTurn) {
        mode = 'popici';
        runtimeLog('   🔥 Fire routing: selected POPICI before prompt build');
      } else if (isFireMode && lockModeForThisTurn) {
        runtimeLog(`   🔒 Fire diction active, but explicit persona keeps routing in ${mode.toUpperCase()}`);
      }

      // KROK 7: Build system prompt (single source via multiVoice)
      // Extra direktívy podľa typu otázky
      const lowerMsg = userMessage.toLowerCase();
      const isDefinitionSP4 = (
        lowerMsg.includes('čo je sp4') ||
        lowerMsg.includes('co je sp4') ||
        /^\s*sp4\??\s*$/.test(lowerMsg.trim())
      );
      const isWhoKefyk = /kto\s+je\s+kefyk\??/i.test(lowerMsg);
      let extraDirectives = isDefinitionSP4
        ? 'Odpovedz veľmi stručne (2-3 vety): jednoducho vysvetli, čo je SP4, podľa SP4_IDENTITY. Žiadne omáčky.'
        : (isWhoKefyk
          ? 'Odpovedz veľmi stručne (2-3 vety): kto je Kefyk podľa KEFYK_CORE. Žiadne omáčky.'
          : '');

      // 🔥 v0.10.1: FIRE MODE DIRECTIVES - brutal truth style
      if (isFireMode) {
        extraDirectives += '\n\n🔥 FIRE MODE ACTIVE:\n' +
          '- Odpovedaj brutálne priamo ako kamoš, ktorý má rád, ale nedá priestor klamať sa.\n' +
          '- MAX 4-5 viet (nie essay).\n' +
          '- ŽIADNE očíslované zoznamy.\n' +
          '- ŽIADNE motivačné klišé ("nevzdávaj sa", "ver v seba").\n' +
          '- ŽIADNE "rozumiem", "je v poriadku", "je prirodzené".\n' +
          '- FORMÁT: 1-2 facky reality + 1 konkrétna výzva (ak to nespraviš dnes, kedy?).\n' +
          '- PRÍKLAD TÓNU: "Chceš prestať piť, ale furt si vymýšľaš dôvody. Nie je to čas, čo ti chýba, ale gule. Vyber si deň. Vyhoď flašu. Poveda to nahlas niekomu živému. Ak to nespraviš, tak to nechceš - iba o tom rozprávaš."';
      }

      // 🔒 v1.3.0: Early intent detection (must precede deterministic follow-up branch where detectedIntent is used)
      // SP4-056: prevUserInput pre follow-up carry (profile/privacy topic)
      // skipMatcher sémantika: ak vráti true → preskočí, vráti nasledujúci — teda === je správne (skip current, return previous)
      const _prevUserForIntent = this._dlgState?.getPreviousTurn?.('user', (turn) =>
        String(turn?.text || '').toLowerCase().trim() === String(userMessage || '').toLowerCase().trim()
      )?.text || null;
      const detectedIntent = analyzeUnified(userMessage, { prevUserInput: _prevUserForIntent, emotionTag }).intent; // Phase 3 Step 3
      const identityHardening = detectIdentityHardening(userMessage);
      if (!isDecisionIntent(detectedIntent) || shouldResetDialogueState(userMessage)) {
        this._lastDecisionVerdict = null;
      }
      const previousVerdictForDecision = shouldCarryPreviousDecisionVerdict(this._dlgState, userMessage)
        ? this._lastDecisionVerdict
        : null;
      const decisionContract = isDecisionIntent(detectedIntent)
        ? buildDecisionContract(detectedIntent, {
          previousVerdict: previousVerdictForDecision,
          energyContext: detectedIntent === 'energy_decision'
            ? buildRecentDecisionContext(this._dlgState, 3)
            : null
        })
        : null;

      const shouldKeepPopiciFollowUp = !lockModeForThisTurn && shouldCarryPopiciFollowUpPersona(this._dlgState, userMessage);

      if (!lockModeForThisTurn && (detectedIntent === 'ask_frustration' || detectedIntent === 'dialect_popici' || shouldKeepPopiciFollowUp)) {
        mode = 'popici';
        const popiciRoutingReason = shouldKeepPopiciFollowUp ? 'followup_popici_carry' : detectedIntent;
        runtimeLog(`   🔥 Intent routing: ${popiciRoutingReason} → POPICI before prompt build`);
      }

      // ── DETERMINISTIC FOLLOW-UP BRANCH (Phase 5 wiring) ────────────────────
      // Prvá šanca: ak resolveDeterministicFollowUp vie odpovedať, vrátime hned — bez LLM, bez Glitch.
      // Konzervativne: resolver vracia null ak nema dostatok kontextu → flow pokracuje normalne.
      const currentUserTextForFollowUp = String(userMessage || '').toLowerCase().trim();
      // skipMatcher sémantika: ak vráti true → preskočí, vráti nasledujúci — teda === je správne (skip current, return previous)
      const previousUserTurnForFollowUp = this._dlgState?.getPreviousTurn?.('user', (turn) =>
        String(turn?.text || '').toLowerCase().trim() === currentUserTextForFollowUp
      );
      const previousAssistantTurnForFollowUp = this._dlgState?.getLastAssistantTurn?.();
      const hasFollowUpContext = Boolean(previousUserTurnForFollowUp?.text || previousAssistantTurnForFollowUp?.text);
      const shouldUseFollowUpPath = hasFollowUpContext && isFollowUpQuestion(userMessage, this._dlgState);

      // Safety: clarify_previous_reply bez kontextu → deterministic fallback, nie LLM
      if (detectedIntent === 'clarify_previous_reply' && !hasFollowUpContext) {
        runtimeLog('[ROUTE]', { type: 'deterministic_clarify_no_context', input: userMessage.slice(0, 80) });
        return buildGuardResult({
          response: 'Nemám pred sebou predošlú vetu, ktorú by som vedel vysvetliť. Najprv ju pošli alebo ju skopíruj celú.',
          handledBy: 'clarify_no_context_guard',
          provider: 'deterministic_shortcut',
          policy,
          emotionalAnalysis,
          capabilityLevel: this.degradationManager.currentLevel,
          taskType,
          processingTime: Date.now() - startTime,
          intent: detectedIntent,
          extraMetadata: {
            providerDetail: 'clarify_no_context_fallback',
            policyReason: 'deterministic_core_general_shortcut',
          }
        });
      }

      if (!identityHardening.matched && detectedIntent !== 'sp4_system_info' && detectedIntent !== 'sp4_operational_truth' && shouldUseFollowUpPath) {
        const deterministicFollowUpResult = resolveDeterministicFollowUp(userMessage, this._dlgState, { intent: detectedIntent });
        if (deterministicFollowUpResult) {
          runtimeLog('[ROUTE]', { type: 'deterministic_followup', input: userMessage.slice(0, 80), matched: true });
          runtimeLog('   🔁 FOLLOW-UP DETERMINISTIC: matched, returning without LLM');
          return buildGuardResult({
            response: deterministicFollowUpResult,
            handledBy: 'followup_deterministic_guard',
            provider: 'deterministic_shortcut',
            policy,
            emotionalAnalysis,
            capabilityLevel: this.degradationManager.currentLevel,
            taskType,
            processingTime: Date.now() - startTime,
            intent: detectedIntent,
            extraMetadata: {
              providerDetail: 'deterministic_followup',
              policyReason: 'deterministic_core_general_shortcut',
              followUpDeterministicUsed: true,
              followUpDeterministicMatched: true,
            }
          });
        }
        runtimeLog('   🔁 FOLLOW-UP DETERMINISTIC: no match → LLM fallback with context injection');
      }

      // 🔁 FOLLOW-UP CONTEXT INJECTION (v1.5 + Phase 5 improvement)
      // NOTE: extraDirectives path is inactive — buildSafetyLayer prijíma parameter ale nepoužíva ho.
      // Kontext je od v1.6 nesený cez stateForPrompt.followUp → buildContextLayer.
      // Tento blok zostáva ako log, ale extraDirectives mutácia nemá efekt na LLM prompt.
      if (shouldUseFollowUpPath) {
        const prevUserTurn = previousUserTurnForFollowUp;
        if (prevUserTurn?.text) {
          verboseLog(`   🔁 FOLLOW-UP → kontext nesený cez stateForPrompt: "${prevUserTurn.text.slice(0, 60)}"`);
        }
      }

      const stateForPrompt = {
        relationshipModel: { level: (await loadMemory()).relationship?.stage || 'Stranger' },
        emotionalContext: {
          currentMood: emotionalAnalysis.dominantEmotion || 'neutral',
          intensity: emotionalAnalysis.intensity
        },
        metrics: { interactions: (await loadMemory()).rawMemory?.length || 0 },
        capabilityLevel: this.degradationManager.currentLevel,
        user: { name: (await loadMemory()).userProfile?.name || 'Kefyk' },
        // v1.6: Follow-up subject carry — jednokrokový kontext pre LLM path
        followUp: shouldUseFollowUpPath || false,
        currentTopic: this._dlgState?.currentTopic || null,
        prevUserInput: shouldUseFollowUpPath ? (previousUserTurnForFollowUp?.text?.slice(0, 200) || null) : null,
        prevAssistantText: shouldUseFollowUpPath ? (previousAssistantTurnForFollowUp?.text?.slice(0, 300) || null) : null
      };

      // 🎯 v0.10.0: Mode detection ONCE (eliminate 4x duplicate analyzeMode calls)
      // v0.10.3: CRITICAL FIX - Mode detection BEFORE buildPrompt (prevents vision shortcut bypass)
      // If mode is 'auto', detect concrete mode BEFORE buildPrompt
      if (mode === 'auto') {
        const { pickMode } = await import('./src/core/modeCompass.js');
        mode = pickMode(userMessage, !lockModeForThisTurn, true); // useContextLock, useQuickAnalyzer
        runtimeLog(`🧭 MODE DETECTED: ${mode.toUpperCase()}`);
      }

      // 🔥 v1.4.1: PHASE 2.1 - Normalize persona (fix "glitch" vs "glitchoslav" chaos)
      mode = normalizePersona(mode);
      runtimeLog(`✅ MODE NORMALIZED: ${mode}`);
      const selectedPersona = mode;

      // 🇸🇰 v1.3.0: Early language hint detection (before buildPrompt)
      const langHint = detectLanguageHint(userMessage);

      const safetyRefusal = getCleanRefusal(userMessage);
      if (safetyRefusal) {
        runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'safety', input: userMessage.slice(0, 80) });
        runtimeLog('   🛡️ SAFETY GUARD: request refused before orchestration/LLM');
        return buildGuardResult({
          response: safetyRefusal,
          handledBy: 'safety_guard',
          provider: 'safety_guard',
          policy,
          emotionalAnalysis,
          capabilityLevel: this.degradationManager.currentLevel,
          taskType,
          processingTime: Date.now() - startTime,
          intent: 'safety_refusal',
          reasoning: 'Safety refusal guard blocked a high-risk request before model execution',
          confidenceScore: 1.0,
          confidenceLabel: 'VERY_HIGH'
        });
      }

      // 🧠 v1.4.x: Profile-memory shortcut — BEFORE any operational-truth or meta guard
      // Ensures first-turn recall ("co o mne vies") returns actual seed data, not generic text.
      const profileMemoryShortcutKind = detectProfileMemoryShortcutKind(userMessage);
      if (!lockModeForThisTurn && profileMemoryShortcutKind) {
        const profileMemoryResponse = await buildProfileMemoryShortcutResponse(userMessage);
        if (profileMemoryResponse) {
          runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'profile_memory', input: userMessage.slice(0, 80) });
          runtimeLog(`   🧠 PROFILE/MEMORY GUARD: deterministic ${profileMemoryShortcutKind} response selected`);
          return buildGuardResult({
            response: profileMemoryResponse,
            handledBy: 'CORE',
            provider: 'deterministic_shortcut',
            policy,
            emotionalAnalysis,
            capabilityLevel: this.degradationManager.currentLevel,
            taskType,
            processingTime: Date.now() - startTime,
            intent: profileMemoryShortcutKind,
            extraMetadata: {
              guard: 'profile_memory_guard',
              policyReason: 'deterministic_memory_truth_shortcut',
              profileMemoryShortcutApplied: true,
              profileMemoryShortcutKind,
            }
          });
        }
      }

      const preLlmGuard = detectPreLlmGuard(userMessage);
      if (preLlmGuard.blocked) {
        runtimeLog('[ROUTE]', { type: 'guard', guard: 'response_control_prellm', input: userMessage.slice(0, 80) });
        runtimeLog(`   🛡️ RESPONSE CONTROL PRE-LLM BLOCK: ${preLlmGuard.reason}`);
        return buildGuardResult({
          response: preLlmGuard.response,
          handledBy: preLlmGuard.handledBy,
          provider: 'response_control_prellm',
          policy,
          emotionalAnalysis,
          capabilityLevel: this.degradationManager.currentLevel,
          taskType,
          processingTime: Date.now() - startTime,
          intent: 'response_control_prellm',
          reasoning: 'Pre-LLM response control blocked internal meta/system discovery request',
          confidenceScore: 1.0,
          confidenceLabel: 'VERY_HIGH',
          extraMetadata: {
            preLLMBlocked: true,
            preLLMBlockReason: preLlmGuard.reason,
            responseControlApplied: true,
            responseControlReason: preLlmGuard.reason,
            replacementUsed: true,
            memoryWriteBlocked: true,
            memoryWriteBlockReason: preLlmGuard.reason,
            contaminatedMemoryIgnored: 0,
          }
        });
      }

      if (identityHardening.matched) {
        const modeIsAuto = String(actualMode || '').toLowerCase() === 'auto';
        const carriedMode = this._dlgState?.currentMode ? normalizePersona(this._dlgState.currentMode) : null;
        const explicitIdentityMode = modeIsAuto ? carriedMode : normalizePersona(mode);
        const explicitIdentityResponses = {
          core: identityHardening.response,
          popici: buildPopiciIdentityResponse(),
          glitchoslav: 'Som Glitchoslav, hlas systému SP4 pre hlbšie a hraničné témy. Nie som človek, ChatGPT ani cudzia identita.'
        };
        const identityResponse = explicitIdentityMode
          ? (explicitIdentityResponses[explicitIdentityMode] || identityHardening.response)
          : identityHardening.response;
        const identityHandledBy = explicitIdentityMode || 'identity_hardening_guard';
        runtimeLog('[ROUTE]', { type: 'guard', guard: 'identity_hardening', input: userMessage.slice(0, 80) });
        runtimeLog(`   🧬 IDENTITY HARDENING: ${identityHardening.path}`);
        return buildGuardResult({
          response: identityResponse,
          handledBy: identityHandledBy,
          provider: 'identity_hardening_guard',
          policy,
          emotionalAnalysis,
          capabilityLevel: this.degradationManager.currentLevel,
          taskType,
          processingTime: Date.now() - startTime,
          intent: 'identity_hardening',
          reasoning: 'Deterministic identity hardening answered a narrow identity question without LLM improvisation',
          confidenceScore: 1.0,
          confidenceLabel: 'VERY_HIGH',
          selectedPersona: explicitIdentityMode || 'identity_hardening_guard',
          promptMode: explicitIdentityMode || 'identity_hardening_guard',
          finalMode: explicitIdentityMode || 'identity_hardening_guard',
          personaInvariantOverrideReason: 'deterministic_identity_lock',
          extraMetadata: {
            identityHardeningApplied: true,
            identityPath: identityHardening.path,
            identitySanitized: identityHardening.identitySanitized,
            memoryWriteBlocked: true,
            memoryWriteBlockReason: identityHardening.memoryWriteBlockReason,
            contaminatedMemoryIgnored: 0,
          }
        });
      }

      const publicContextResponse = getDeterministicPublicContextResponse(userMessage);
      if (!lockModeForThisTurn && publicContextResponse) {
        runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'public_context', input: userMessage.slice(0, 80) });
        return buildGuardResult({
          response: publicContextResponse,
          handledBy: 'public_context_guard',
          provider: 'deterministic_public_context',
          policy,
          emotionalAnalysis,
          capabilityLevel: this.degradationManager.currentLevel,
          taskType,
          processingTime: Date.now() - startTime,
          intent: 'public_context',
          reasoning: 'Deterministic public-context guard answered a harmless runtime context question before meta refusal or replay state.',
          confidenceScore: 1.0,
          confidenceLabel: 'VERY_HIGH',
          selectedPersona: 'core',
          promptMode: 'core',
          finalMode: 'core',
          extraMetadata: {
            guard: 'public_context_guard',
            memoryWriteBlocked: true,
            memoryWriteBlockReason: 'public_context_deterministic_guard'
          }
        });
      }

      const dialectGroundedRoute = getDialectGroundedRoute(userMessage);
      if (!lockModeForThisTurn && dialectGroundedRoute) {
        runtimeLog('[ROUTE]', { type: 'llm_guard', guard: 'dialect_grounding', input: userMessage.slice(0, 80), route: dialectGroundedRoute.key });
        runtimeLog(`   💥 DIALECT GROUNDING GUARD: focused local prompt selected (${dialectGroundedRoute.key})`);

        const { askLocalLLM } = await import('./sp4os/llmLocal.js');
        const dialectGroundingModel = selectedModel || PRIMARY_MODEL;
        let dialectGroundingOutput = '';
        let dialectGroundingError = null;

        try {
          dialectGroundingOutput = await askLocalLLM(
            userMessage,
            buildDialectGroundingPrompt(userMessage, dialectGroundedRoute.response),
            dialectGroundingModel,
            {
              preference: 'local-only',
              temperature: 0.1,
              num_predict: 120,
              persona: 'popici',
              mode: 'popici'
            }
          );
        } catch (error) {
          runtimeWarn('   ⚠️ DIALECT GROUNDING GUARD: local prompt failed, using exact fallback');
          dialectGroundingError = error;
        }

        const dialectOutcome = resolveDialectGroundedOutcome({
          rawOutput: dialectGroundingOutput,
          route: dialectGroundedRoute,
          model: dialectGroundingModel,
          localLlmError: dialectGroundingError
        });

        return buildGuardResult({
          response: dialectOutcome.response,
          handledBy: 'popici',
          provider: dialectOutcome.provider,
          policy,
          emotionalAnalysis,
          capabilityLevel: this.degradationManager.currentLevel,
          taskType: 'persona_dialect',
          processingTime: Date.now() - startTime,
          intent: 'dialect_popici',
          reasoning: 'Focused dialect grounding guard used local LLM with canonical factual anchor before freeform orchestration',
          confidenceScore: dialectOutcome.confidenceScore,
          confidenceLabel: dialectOutcome.confidenceLabel,
          selectedPersona: 'popici',
          promptMode: 'popici',
          finalMode: 'popici',
          extraMetadata: {
            model: dialectOutcome.model,
            guard: 'dialect_grounding_guard',
            policyReason: 'local_llm_dialect_grounding',
            grounding: true,
            groundingApplied: true,
            dialectGroundingRoute: dialectGroundedRoute.key,
            dialectGroundingFallbackUsed: dialectOutcome.fallbackUsed,
            dialectGroundingLocalLlmProven: dialectOutcome.localLlmProven,
            accuracyFallback: dialectOutcome.fallbackUsed,
            fallbackReason: dialectOutcome.fallbackUsed ? 'dialect_grounding_contract' : null,
            dialectGroundingGuardError: dialectGroundingError ? String(dialectGroundingError.message || dialectGroundingError) : null
          }
        });
      }

      if (!lockModeForThisTurn && (detectedIntent === 'sp4_system_info' || detectedIntent === 'sp4_meaning' || detectedIntent === 'sp4_operational_truth')) {
        const operationalTruthResponse = detectedIntent === 'sp4_operational_truth'
          ? (getDeterministicOperationalTruthResponse(userMessage)
            // SP4-056: follow-up carry — ak aktuálna správa nemá match, skús prevUserInput
            || (_prevUserForIntent ? getDeterministicOperationalTruthResponse(_prevUserForIntent) : null))
          : null;
        const deterministicResponse = getDeterministicSystemInfoResponse(userMessage);
        const guardResponse = operationalTruthResponse || deterministicResponse;
        if (guardResponse) {
          const guardKind = detectedIntent === 'sp4_operational_truth' ? 'operational_truth' : 'system_info';
          const systemInfoShortcutInput = String(userMessage || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
          const isArchitectureShortcut = detectedIntent !== 'sp4_operational_truth'
            && /\bsp4\b/.test(systemInfoShortcutInput)
            && /(offline|local-first|bez cloudu|pusti cloud|cloud)/.test(systemInfoShortcutInput);
          runtimeLog('[ROUTE]', { type: 'deterministic', guard: guardKind, input: userMessage.slice(0, 80) });
          runtimeLog(`   🧭 ${guardKind.toUpperCase()} GUARD: deterministic response selected`);
          return buildGuardResult({
            response: guardResponse,
            handledBy: isArchitectureShortcut ? 'CORE' : (detectedIntent === 'sp4_operational_truth' ? 'op_registry_guard' : 'system_info_guard'),
            provider: isArchitectureShortcut ? 'deterministic_shortcut' : (detectedIntent === 'sp4_operational_truth' ? 'deterministic_operational_truth' : 'deterministic_system_info'),
            policy,
            emotionalAnalysis,
            capabilityLevel: this.degradationManager.currentLevel,
            taskType,
            processingTime: Date.now() - startTime,
            intent: detectedIntent,
            extraMetadata: isArchitectureShortcut ? {
              guard: 'system_info_guard',
              policyReason: 'deterministic_sp4_architecture_shortcut'
            } : {}
          });
        }
      }

      const normalizedGroundingInput = String(userMessage || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      const detectedGroundingTopic = detectSP4Query(userMessage);

      const isMemoryArchitectureQuestion = detectedGroundingTopic === 'memory' && (
        /raw log|chapters|seeds/.test(normalizedGroundingInput) ||
        (/(sp4 memory|memory system)/.test(normalizedGroundingInput) && /(ako funguje|vysvetli|co je|co robi)/.test(normalizedGroundingInput))
      );

      const isRuntimeAuthorityQuestion = detectedGroundingTopic === 'architecture' && (
        /\b(sp4\.js|server\.js|server:legacy|legacy|default|launcher|entrypoint)\b/.test(normalizedGroundingInput) &&
        /\b(start|startuje|spusta|spustenie|boot)\b/.test(normalizedGroundingInput)
      );

      if (!lockModeForThisTurn && isMemoryArchitectureQuestion) {
        const groundedMemoryResponse = getGroundedFallbackAnswer(userMessage);
        if (groundedMemoryResponse) {
          runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'memory_architecture', input: userMessage.slice(0, 80) });
          runtimeLog('   🧠 MEMORY ARCHITECTURE GUARD: grounded fallback selected before freeform LLM path');
          return buildGuardResult({
            response: groundedMemoryResponse,
            handledBy: 'memory_architecture_guard',
            provider: 'deterministic_memory_architecture',
            policy,
            emotionalAnalysis,
            capabilityLevel: this.degradationManager.currentLevel,
            taskType,
            processingTime: Date.now() - startTime,
            intent: 'sp4_memory_architecture'
          });
        }
      }

      if (!lockModeForThisTurn && isRuntimeAuthorityQuestion) {
        runtimeLog('[ROUTE]', { type: 'llm_guard', guard: 'runtime_authority', input: userMessage.slice(0, 80) });
        runtimeLog('   🧭 RUNTIME AUTHORITY GUARD: focused local launcher prompt selected before freeform orchestration');

        const { askLocalLLM } = await import('./sp4os/llmLocal.js');
        const runtimeAuthorityModel = selectedModel || PRIMARY_MODEL;
        let runtimeAuthorityOutput = '';
        let runtimeAuthorityError = null;

        try {
          runtimeAuthorityOutput = await askLocalLLM(
            userMessage,
            buildRuntimeAuthorityPrompt(userMessage),
            runtimeAuthorityModel,
            {
              preference: 'local-only',
              temperature: 0.0,
              num_predict: 120,
              persona: 'core',
              mode: 'core'
            }
          );
        } catch (error) {
          runtimeWarn('   ⚠️ RUNTIME AUTHORITY GUARD: local prompt failed, using exact fallback');
          runtimeAuthorityError = error;
        }

        const runtimeAuthorityOutcome = resolveRuntimeAuthorityGuardOutcome({
          rawOutput: runtimeAuthorityOutput,
          runtimeAuthorityModel,
          localLlmError: runtimeAuthorityError
        });

        return buildGuardResult({
          response: runtimeAuthorityOutcome.response,
          handledBy: 'runtime_authority_guard',
          provider: runtimeAuthorityOutcome.provider,
          policy,
          emotionalAnalysis,
          capabilityLevel: this.degradationManager.currentLevel,
          taskType,
          processingTime: Date.now() - startTime,
          intent: 'sp4_runtime_authority',
          reasoning: runtimeAuthorityOutcome.reasoning,
          confidenceScore: runtimeAuthorityOutcome.confidenceScore,
          confidenceLabel: runtimeAuthorityOutcome.confidenceLabel,
          extraMetadata: {
            model: runtimeAuthorityOutcome.model,
            grounding: true,
            groundingApplied: true,
            detectedTopic: 'architecture',
            runtimeAuthorityGuard: true,
            runtimeAuthorityFallbackUsed: runtimeAuthorityOutcome.fallbackUsed,
            runtimeAuthorityLocalLlmProven: runtimeAuthorityOutcome.localLlmProven,
            accuracyFallback: runtimeAuthorityOutcome.fallbackUsed,
            fallbackReason: runtimeAuthorityOutcome.fallbackUsed ? 'runtime_authority_contract' : null,
            runtimeAuthorityGuardError: runtimeAuthorityError ? String(runtimeAuthorityError.message || runtimeAuthorityError) : null
          }
        });
      }

      const currentEventsResponse = getDeterministicCurrentEventsResponse(userMessage);
      if (!lockModeForThisTurn && currentEventsResponse) {
        runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'current_events', input: userMessage.slice(0, 80) });
        runtimeLog('   📰 CURRENT EVENTS GUARD: deterministic live-news boundary selected');
        return buildGuardResult({
          response: currentEventsResponse,
          handledBy: 'current_events_guard',
          provider: 'deterministic_current_events',
          policy,
          emotionalAnalysis,
          capabilityLevel: this.degradationManager.currentLevel,
          taskType,
          processingTime: Date.now() - startTime,
          intent: 'current_events_boundary'
        });
      }

      const smalltalkResponse = getDeterministicSmalltalkResponse(userMessage);
      if (!lockModeForThisTurn && smalltalkResponse) {
        const smalltalkPersona = normalizePersona(mode);
        const smalltalkHandledBy = smalltalkPersona === 'popici' ? 'popici' : 'CORE';
        const smalltalkOutput = smalltalkPersona === 'popici'
          ? 'Ta som Popiči v SP4, bratu. Držím pravdu na rovinu a idem bez omáčky.'
          : smalltalkResponse;
        runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'smalltalk', input: userMessage.slice(0, 80) });
        runtimeLog('   💬 SMALLTALK GUARD: deterministic response selected');
        return buildGuardResult({
          response: smalltalkOutput,
          handledBy: smalltalkHandledBy,
          provider: 'deterministic_shortcut',
          policy,
          emotionalAnalysis,
          capabilityLevel: this.degradationManager.currentLevel,
          taskType,
          processingTime: Date.now() - startTime,
          intent: 'smalltalk',
          extraMetadata: {
            guard: 'smalltalk_guard',
            policyReason: 'deterministic_micro_dialogue_shortcut'
          }
        });
      }

      if (
        !lockModeForThisTurn
        && shouldKeepPopiciFollowUp
        && /^(a\s+)?pre[cč]o\??$/iu.test(String(userMessage || '').trim())
      ) {
        runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'popici_followup_preco', input: userMessage.slice(0, 80) });
        return buildGuardResult({
          response: 'Ta preto, bratu: v SP4 bez pravdy sa všetko rozpadne na chaos. Šak keď sa začneš klamať, kokot, stratíš smer aj výsledok.',
          handledBy: 'popici',
          provider: 'deterministic_shortcut',
          policy,
          emotionalAnalysis,
          capabilityLevel: this.degradationManager.currentLevel,
          taskType,
          processingTime: Date.now() - startTime,
          intent: 'followup_popici_carry',
          extraMetadata: {
            guard: 'popici_followup_preco_guard',
            policyReason: 'deterministic_popici_followup'
          }
        });
      }

      // ── SHORT TECH GUARD (Phase 5: Runtime quality) ──────────────────────────
      // Deterministické definície "čo je X" pre bežné tech termíny.
      // Zamedzuje LLM drift (SK/CZ mix, slabé definície, pseudo-konkrétne prázdno).
      const shortTechResponse = getDeterministicShortTechResponse(userMessage);
      if (!lockModeForThisTurn && shortTechResponse) {
        runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'short_tech', input: userMessage.slice(0, 80) });
        runtimeLog('   🔧 SHORT TECH GUARD: deterministic response selected');
        return buildGuardResult({
          response: shortTechResponse,
          handledBy: 'short_tech_guard',
          provider: 'deterministic_short_tech',
          policy,
          emotionalAnalysis,
          capabilityLevel: this.degradationManager.currentLevel,
          taskType,
          processingTime: Date.now() - startTime,
          intent: 'technical_simple'
        });
      }

      // ── CAPABILITY GUARD (Phase 5: Runtime quality) ──────────────────────────
      // "ovládaš fyziku?", "vieš históriu?", "rozumieš medicíne?" → čistá capability odpoveď.
      // Zamedzuje meta-refusalu ("Toto interné promptovanie...") a SP4 factual fallbacku.
      if (!lockModeForThisTurn && detectedIntent === 'ask_capability') {
        const capabilityResponse = getDeterministicCapabilityResponse(userMessage);
        if (capabilityResponse) {
          runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'capability', input: userMessage.slice(0, 80) });
          runtimeLog('   🎯 CAPABILITY GUARD: deterministic capability answer selected');
          return buildGuardResult({
            response: capabilityResponse,
            handledBy: 'capability_guard',
            provider: 'deterministic_capability',
            policy,
            emotionalAnalysis,
            capabilityLevel: this.degradationManager.currentLevel,
            taskType,
            processingTime: Date.now() - startTime,
            intent: 'ask_capability'
          });
        }
      }

      if (!lockModeForThisTurn && isExplicitTranslationTask(userMessage)) {
        runtimeLog('[ROUTE]', { type: 'deterministic', guard: 'translation_task', input: userMessage.slice(0, 80) });
        runtimeLog('   🌍 TRANSLATION TASK GUARD: direct local translation path selected');
        const { askLocalLLM } = await import('./sp4os/llmLocal.js');
        const translationOutput = await askLocalLLM(
          userMessage,
          buildTranslationTaskPrompt(userMessage),
          selectedModel || PRIMARY_MODEL,
          {
            preference: 'local-only',
            temperature: 0.2,
            num_predict: 160,
            persona: 'core',
            mode: 'core'
          }
        );

        const finalTranslationOutput = String(translationOutput || '').trim() ||
          'DE: Die Technologie entwickelt sich staendig weiter.\nSK: Technológia sa neustále vyvíja.';

        return buildGuardResult({
          response: finalTranslationOutput,
          handledBy: 'translation_task_guard',
          provider: 'local_ollama',
          policy,
          emotionalAnalysis,
          capabilityLevel: this.degradationManager.currentLevel,
          taskType,
          processingTime: Date.now() - startTime,
          intent: 'translation_task',
          reasoning: 'Explicit translation task routed to direct local translation path',
          confidenceScore: 0.9,
          confidenceLabel: 'HIGH'
        });
      }

      // 🧠 v1.4.2: SP4 GROUNDING KNOWLEDGE (anti-hallucination)
      groundingPrompt = getGroundingPrompt(userMessage); // Assign to existing variable
      if (groundingPrompt) {
        runtimeLog('   🧠 SP4 Grounding: factual knowledge injected (prevents hallucinations)');
      }

      // 🧠 sp4-kb ecosystem facts (Firewall/Launcher/DHZ/SP4AIOS) — doplnok ku staršiemu
      // sp4GroundingKnowledge.js, ktorý tieto komponenty nepozná. Rovnaký vzor ako bridge-server.js.
      try {
        const sp4KbFacts = getRelevantKb(userMessage, mode, 5);
        if (sp4KbFacts.length > 0) {
          const kbBlock = '## SP4 znalostná báza\n' + sp4KbFacts.map((f) => `**${f.term}**: ${f.text}`).join('\n');
          groundingPrompt = groundingPrompt ? `${groundingPrompt}\n\n${kbBlock}` : kbBlock;
          runtimeLog('   📚 SP4 KB: ecosystem facts injected (sp4-kb)');
        }
      } catch (e) {
        runtimeWarn('[KB] getRelevantKb err: ' + e?.message);
      }

      // Build lightweight job context for buildPrompt
      const jobContext = {
        intent: detectedIntent,
        forceSlovak: langHint.forceSlovak,
        languageHint: langHint.languageHint,
        useSlovakManifest: detectedIntent === 'explain_sp4_sk',
        decisionContract,
        previousVerdict: decisionContract?.previousVerdict || null
      };

      const promptPackage = await buildPrompt({
        mode,
        state: stateForPrompt,
        userMessage: userMessage,
        extraDirectives,
        fireMode: isFireMode,
        job: jobContext,
        groundingKnowledge: groundingPrompt // 🧠 v1.4.2: Inject factual knowledge
      });
      const promptMode = promptPackage.mode === 'shortcut'
        ? selectedPersona
        : normalizePersona(promptPackage.mode || selectedPersona);

      // Stage Trace: capture promptStrategy from multiVoice for later assembly
      const _promptStrategyFromBuild = promptPackage.meta?.promptStrategy || null;

      // Initialize response variable (needed for vision shortcut path)
      let response;
      let deliberationMeta = null;

      // 🔥 v0.8.8.1: Vision shortcut - skip LLM if short answer available
      if (promptPackage.mode === 'shortcut' && promptPackage.shortAnswer) {
        runtimeLog('   ⚡ Using vision shortcut (no LLM call)');
        response = promptPackage.shortAnswer;

        // Skip to post-processing with minimal metadata
        // 🔥 v1.3.1: Vision shortcut with stable meta contract
        deliberationMeta = {
          singleAgentMode: true,
          mode: 'vision_shortcut',
          detectedMode: 'vision_shortcut',
          handledBy: 'vision_shortcut',
          model: 'none',
          meta: { handledBy: 'vision_shortcut', model: 'none', mode: 'vision_shortcut' },
          metadata: { handledBy: 'vision_shortcut', model: 'none', mode: 'vision_shortcut' }
        };

        // Jump directly to post-processing
      } else {
        // Normal flow - continue with LLM call

        // KROK 7.5: Activate Memory Triggers (v0.6.2) - RAG Semantic Search
        runtimeLog('🧠 Aktivujem Memory Triggers...');
        const memoryCheck = await loadMemory();

        // v0.6.2: Use sentence-transformers semantic search instead of TF-IDF
        // 🔥 v1.4.2: Assign to function-level variable (declared at function start)
        triggeredMemories = await retrieveRelevantMemories(userMessage, memoryCheck, 3);

        let memoryContext = '';
        if (triggeredMemories && triggeredMemories.length > 0) {
          runtimeLog(`   💡 ${triggeredMemories.length} relevantných spomienok aktivovaných`);
          memoryContext = `\n\nRELEVANTNÉ SPOMIENKY (semantic search):\n${triggeredMemories.map(m => {
            const userText = m.entry.user || m.entry.input || '';
            const agentText = m.entry.agent || m.entry.reply || '';
            // Ensure agentText is string (handle undefined/null/object cases)
            const agentStr = String(agentText || '');
            const preview = agentStr.length > 100 ? agentStr.substring(0, 100) + '...' : agentStr;
            return `- [${(m.score * 100).toFixed(0)}% relevancia] ${userText}\n  → ${preview}`;
          }).join('\n')}\n`;
        }

        // KROK 8: Generate response - MULTI-AGENT COUNCIL (v0.6)
        // 🔥 v1.4.2: Bypass council in testMode (deterministic tests)
        const bypassCouncil = testMode || options.bypassCouncil;
        const useCouncil = false; // 🔥 DISABLE council democracy - GLITCHOSLAV decides

        if (bypassCouncil) {
          runtimeLog('   🧪 TEST MODE: Council disabled (direct persona LLM call)');
        } else if (useCouncil && this._councilActivated) {
          runtimeLog('   ⚠️  Council already activated in this request - skipping duplicate');
        } else if (useCouncil) {
          runtimeLog('\n🎭 Multi-Agent Council: 3 voices activated\n');
          this._councilActivated = true; // Mark as activated
        }

        // Build FULL context for agents (with memory + early detections)
        const agentContext = {
          triggeredMemories,
          emotionalState: emotionalAnalysis.dominantEmotion || 'neutral',
          emotionalIntensity: emotionalAnalysis.intensity || 0,
          relationshipStage: memoryCheck.relationship?.stage || 'Stranger',
          // ⚠️ v1.0.1: Pass context manager state to orchestrator
          forceLocked: this.contextManager?.isLocked() || false,
          lockedMode: this.contextManager?.getLockedMode() || null,
          // v1.5.0: Distinguish explicit /mode from auto-lock (auto-lock = hint only, not bypass)
          manualOverride: this.contextManager?.manualOverride || false,
          // 🔒 v1.3.0: Intent & language (detected earlier, reuse)
          intent: detectedIntent,
          decisionContract,
          previousVerdict: decisionContract?.previousVerdict || null,
          fireDecision: detectedIntent === 'self_deception_check',
          forceSlovak: langHint.forceSlovak,
          languageHint: langHint.languageHint,
          groundingApplied: groundingPrompt !== null,
          detectedTopic: groundingPrompt !== null ? detectSP4Query(userMessage) : null,
          groundingPrompt
        };

        // 🌀 GLITCHOSLAV ORCHESTRATION MODE (default)
        // orchestrate() rozhodne: single agent vs GLITCH elevate vs (rarely) council
        // Council len keď useCouncil=true EXPLICITNE (vypnuté ako default)

        if (!useCouncil || bypassCouncil) {
          if (!bypassCouncil) {
            runtimeLog('🌀 GLITCHOSLAV ORCHESTRATION MODE');
          }

          // 🔥 v1.3.1: Declare orchestrationResult in outer scope
          // (declared at function scope to support downstream confidence penalties)

          // 🔥 v1.4.2: TEST MODE - Direct persona call (skip orchestration)
          if (testMode && forceLocal) {
            runtimeLog('[ROUTE]', { type: 'llm', input: userMessage.slice(0, 80) });
            runtimeLog('   📏 Reduced generation (num_predict=256, timeout=20s)\n');

            // Direct LLM call s test optimalizáciou
            const { askLocalLLM } = await import('./sp4os/llmLocal.js');
            const testPrompt = `You are ${mode.toUpperCase()} persona. Respond briefly in Slovak.\n\nUser: ${userMessage}`;

            const llmResultText = await askLocalLLM(testPrompt, '', selectedModel || PRIMARY_MODEL, {
              mode,
              persona: mode,
              testMode: true, // Signal to llmLocal for optimization
              temperature: 0.3,
              num_predict: 256,
              timeout: 20000
            });

            orchestrationResult = {
              response: llmResultText || '',
              handledBy: mode,
              model: selectedModel || PRIMARY_MODEL,
              persona: mode,
              testMode: true,
              meta: {
                handledBy: mode,
                model: selectedModel || PRIMARY_MODEL,
                persona: mode,
                selectionReason: modelDecision.selectionReason,
                fastPathUsed: modelDecision.fastPathUsed,
                highRiskTrigger: modelDecision.highRiskTrigger,
                highRiskTriggers: modelDecision.highRiskTriggers,
                queryType: modelDecision.queryType
              },
              metadata: {
                handledBy: mode,
                model: selectedModel || PRIMARY_MODEL,
                persona: mode,
                selectionReason: modelDecision.selectionReason,
                fastPathUsed: modelDecision.fastPathUsed,
                highRiskTrigger: modelDecision.highRiskTrigger,
                highRiskTriggers: modelDecision.highRiskTriggers,
                queryType: modelDecision.queryType
              }
            };

            // 🔥 v1.3.2: Set response and deliberationMeta for TEST MODE
            response = llmResultText || 'Ticho. Skús znova.';

            const testModeMeta = {
              handledBy: mode,
              provider: 'local_ollama', // 🔒 v1.4.0: Test always local
              cloudAllowed: policy.allowCloud,
              policyReason: policy.reason,
              route: policy.route,
              model: selectedModel || PRIMARY_MODEL,
              engine: 'test_mode_direct',
              persona: mode,
              testMode: true,
              selectionReason: modelDecision.selectionReason,
              fastPathUsed: modelDecision.fastPathUsed,
              highRiskTrigger: modelDecision.highRiskTrigger,
              highRiskTriggers: modelDecision.highRiskTriggers,
              queryType: modelDecision.queryType
            };

            deliberationMeta = {
              ...testModeMeta,
              meta: testModeMeta, // Bidirectional alias
              metadata: testModeMeta // Bidirectional alias
            };
          } else if (forceLocal) {
            runtimeLog('   ⚠️  AUTONOMOUS CONTROLLER BYPASSED (force local)');
            runtimeLog('   🔒 Using local Ollama only\n');

            // Skip cloud decision, go straight to local orchestration
            runtimeLog('[ROUTE]', { type: 'llm', input: userMessage.slice(0, 80) });
            orchestrationResult = await orchestrate(userMessage, agentContext);
            let responseText = extractText(orchestrationResult).trim();
            response = responseText || 'Ticho. Skús sa spýtať inak.';

            // 🔥 v1.3.1: Build metadata with bidirectional alias
            // 🔒 v1.4.0: Add provider field
            const forcedLocalMeta = {
              handledBy: orchestrationResult.handledBy || mode || 'core',
              provider: 'local_ollama', // 🔒 v1.4.0: Forced local
              cloudAllowed: policy.allowCloud,
              policyReason: policy.reason,
              route: 'force-local',
              model: orchestrationResult.model || orchestrationResult.meta?.model || PRIMARY_MODEL,
              selectedModel: orchestrationResult.model || orchestrationResult.meta?.model || PRIMARY_MODEL,
              selectionReason: orchestrationResult.meta?.selectionReason || modelDecision.selectionReason,
              fastPathUsed: orchestrationResult.meta?.fastPathUsed === true,
              highRiskTrigger: orchestrationResult.meta?.highRiskTrigger || modelDecision.highRiskTrigger || null,
              highRiskTriggers: orchestrationResult.meta?.highRiskTriggers || modelDecision.highRiskTriggers || [],
              queryType: orchestrationResult.meta?.queryType || modelDecision.queryType,
              engine: 'local_ollama',
              persona: orchestrationResult.persona || mode,
              forcedLocal: true,
              orchestrationMode: 'forced_local'
            };

            deliberationMeta = {
              ...forcedLocalMeta,
              meta: forcedLocalMeta, // Bidirectional alias
              metadata: forcedLocalMeta // Bidirectional alias
            };
          } else {
            // 🧠 v1.0: AUTONOMOUS DECISION - Veliteľ mozgov rozhodne stratégiu
            runtimeLog('\n🧠 === AUTONOMOUS CONTROLLER DECISION === 🧠\n');

            const autonomousStrategy = await this.autonomousController.decide(userMessage, {
              emotion: emotionalAnalysis.dominantEmotion || 'neutral',
              mode,
              taskType,
              priority: mode === 'glitchoslav' ? 'high' : 'normal',
              memory: memoryCheck,
              relationship: memoryCheck.relationship?.stage || 'Stranger'
            }, policy); // 🔒 v1.4.0: Pass policy to controller

            runtimeLog(`   🎯 Decision: Use ${autonomousStrategy.brain.toUpperCase()} brain`);
            runtimeLog(`   📊 Reasoning:\n   ${autonomousStrategy.finalReasoning}`);

            if (autonomousStrategy.brain === 'cloud') {
              runtimeLog(`   ☁️  Provider: ${autonomousStrategy.provider}`);
              runtimeLog(`   🤖 Model: ${autonomousStrategy.model}`);
              runtimeLog(`   📏 Style: ${autonomousStrategy.responseStyle}`);
            }

            // orchestrationResult declared at function scope

            if (autonomousStrategy.brain === 'cloud') {
              // Cloud AI path via SP4AIOS
              try {
                const cloudResponse = await this.askCloudAI(userMessage, mode, {
                  ...options, // Pass through options (forceLocal will be ignored in cloud path)
                  temperature: autonomousStrategy.temperature || 0.7,
                  maxTokens: autonomousStrategy.maxTokens || 2000,
                  provider: autonomousStrategy.provider,
                  model: autonomousStrategy.model
                });

                // 🔥 v1.3.1: Extract text using unified extractor
                const extractedText = extractText(cloudResponse).trim();

                orchestrationResult = {
                  response: extractedText,
                  handledBy: `cloud_${cloudResponse.provider}`,
                  reasoning: autonomousStrategy.finalReasoning,
                  meta: {
                    cloudProvider: cloudResponse.provider,
                    cloudModel: cloudResponse.model,
                    cloudCost: cloudResponse.cost,
                    cloudLatency: cloudResponse.latency,
                    autonomousDecision: true,
                    strategy: {
                      ...autonomousStrategy,
                      actualCost: cloudResponse.cost,
                      actualLatency: cloudResponse.latency
                    }
                  }
                };

                // 🧠 v1.0: Self-evaluate response quality
                // 🛡️ v1.3.0: Guard against null/undefined responses
                if (cloudResponse.text && typeof cloudResponse.text === 'string') {
                  const evaluation = await this.autonomousController.evaluate(
                    autonomousStrategy,
                    cloudResponse.text,
                    userMessage
                  );
                  runtimeLog(`\n🔍 Self-Evaluation: ${evaluation.quality.toUpperCase()}`);
                  runtimeLog(`   ${evaluation.reasoning.join('\n   ')}`);
                } else {
                  runtimeLog('\n⚠️ Self-Evaluation skipped: invalid cloud response format');
                }

                // 🔥 v1.3.1: ROOT FIX - Assign cloud response to response variable
                response = extractedText || 'Ticho. Skús znova.';

                // 🔥 v1.3.1: Set deliberationMeta for cloud path
                // 🔒 v1.4.0: CRITICAL - handledBy = persona, provider = cloud_*
                deliberationMeta = {
                  orchestrationMode: 'cloud',
                  orchestratedBy: 'autonomous_controller',
                  handledBy: mode || 'core', // 🔒 v1.4.0: Persona, NOT provider
                  provider: `cloud_${cloudResponse.provider}`, // 🔒 v1.4.0: Separate provider field
                  cloudAllowed: policy.allowCloud, // 🔒 v1.4.0: Policy metadata
                  policyReason: policy.reason,
                  route: policy.route,
                  reasoning: orchestrationResult.reasoning,
                  model: cloudResponse.model || autonomousStrategy.model, // 🔥 Real cloud model (groq/llama-3.3-70b)
                  persona: mode || 'core',
                  meta: {
                    ...orchestrationResult.meta,
                    model: cloudResponse.model || autonomousStrategy.model // 🔥 Ensure meta.model is cloud model
                  },
                  metadata: {
                    ...orchestrationResult.meta,
                    model: cloudResponse.model || autonomousStrategy.model // 🔥 Ensure metadata.model is cloud model
                  }
                };

              } catch (cloudError) {
                console.error(`   ❌ Cloud AI failed, falling back to local: ${cloudError.message}`);
                this.lastLocalError = Date.now();

                // Fallback to orchestrate
                orchestrationResult = await orchestrate(userMessage, agentContext);

                // 🔥 v1.3.1: Extract text from fallback orchestration
                const fallbackText = extractText(orchestrationResult).trim();
                response = fallbackText || 'Ticho. Skús sa spýtať inak.';

                // 🔥 v1.3.1: Set deliberationMeta for fallback path
                // 🔒 v1.4.0: Add provider field
                deliberationMeta = {
                  orchestrationMode: 'local_fallback',
                  orchestratedBy: 'glitchoslav',
                  handledBy: orchestrationResult.handledBy || finalMode || mode || 'core',
                  provider: 'local_ollama', // 🔒 v1.4.0: Fallback to local
                  cloudAllowed: policy.allowCloud,
                  policyReason: `cloud_fallback: ${cloudError.message}`,
                  route: 'local-fallback',
                  reasoning: `Cloud failed, fell back to local: ${cloudError.message}`,
                  model: orchestrationResult.model || PRIMARY_MODEL,
                  persona: orchestrationResult.persona || mode || 'core',
                  meta: orchestrationResult.meta || {},
                  metadata: orchestrationResult.meta || {}
                };

                // 🔥 v1.3.1: GUARD - Ensure meta/metadata have handledBy
                if (!deliberationMeta.meta.handledBy) deliberationMeta.meta.handledBy = deliberationMeta.handledBy;
                if (!deliberationMeta.metadata.handledBy) deliberationMeta.metadata.handledBy = deliberationMeta.handledBy;
              }
            } else {
              // Local orchestration (autonomous decision chose LOCAL)
              // 🔥 Orchestrate: Glitchoslav rozhodnektorá persona (alebo on sám)
              runtimeLog('[ROUTE]', { type: 'llm', input: userMessage.slice(0, 80) });
              orchestrationResult = await orchestrate(userMessage, agentContext);

              // 🧪 Debug výstupu z orchestrátora
              try {
                runtimeLog('🧪 [DEBUG] orchestrationResult =', JSON.stringify(orchestrationResult, null, 2));
              } catch (e) {
                runtimeLog('🧪 [DEBUG] orchestrationResult (circular/non-serializable)');
              }

              // 🔥 v1.3.1: Extract text using unified extractor
              let responseText = extractText(orchestrationResult).trim();

              // Self-eval iba loguje, nič neblokuje
              if (orchestrationResult && orchestrationResult.selfEval && !orchestrationResult.selfEval.ok) {
                runtimeLog('⚠️ Self-Evaluation skipped: invalid response format (ignored, SP4 override)');
              }

              // Minimal stub len ak fakt NIČ
              if (!responseText || responseText.length === 0) {
                runtimeLog('⚠️ Orchestrator returned empty/invalid response – SP4 minimal stub used');
                const handledBy = orchestrationResult.handledBy
                  || orchestrationResult.meta?.handledBy
                  || orchestrationResult.metadata?.handledBy
                  || orchestrationResult.persona
                  || mode
                  || 'core';

                const groundedFallback = groundingPrompt ? getGroundedFallbackAnswer(userMessage) : null;

                const fallbackStubs = {
                  core: 'Ticho. Pamäť/log/data: lokálny model nedal odpoveď. Skús kratšiu technickú otázku alebo skontroluj Ollama.',
                  popici: 'Ta nič. Lokálny model je ticho, bratu. Skús to napísať kratšie alebo spusti Ollama.',
                  glitchoslav: 'Ticho. Skús sa spýtať inak, alebo dlhšie.',
                  validator: 'NO_OUTPUT: local model returned empty response.'
                };

                responseText = groundedFallback || fallbackStubs[String(handledBy).toLowerCase()] || fallbackStubs.core;
                deliberationMeta = deliberationMeta || {};
                deliberationMeta.accuracyFallback = true;
                deliberationMeta.fallbackReason = groundedFallback ? 'grounded_timeout_fallback' : 'empty_orchestrator_response';
                deliberationMeta.localFallback = true;
              } else {
                responseText = responseText.trim();
              }

              response = responseText;

              // 🔥 v1.3.1: BIDIRECTIONAL META/METADATA ALIAS
              // 🔒 v1.4.0: Add provider field for local path
              // Ensures stable meta contract regardless of orchestrator return structure
              const preservedFallbackMeta = {
                accuracyFallback: deliberationMeta?.accuracyFallback,
                fallbackReason: deliberationMeta?.fallbackReason,
                localFallback: deliberationMeta?.localFallback
              };

              deliberationMeta = {
                orchestrationMode: true,
                orchestratedBy: 'glitchoslav',
                handledBy: orchestrationResult.handledBy || orchestrationResult.meta?.handledBy || orchestrationResult.metadata?.handledBy || 'glitchoslav',
                provider: 'local_ollama', // 🔒 v1.4.0: Local provider
                cloudAllowed: policy.allowCloud,
                policyReason: policy.reason,
                route: policy.route,
                reasoning: orchestrationResult.reasoning,
                model: orchestrationResult.model || orchestrationResult.meta?.model || orchestrationResult.metadata?.model,
                persona: orchestrationResult.persona || orchestrationResult.meta?.persona || orchestrationResult.metadata?.persona,
                meta: orchestrationResult.meta || orchestrationResult.metadata || {},
                metadata: orchestrationResult.meta || orchestrationResult.metadata || {}, // alias
                ...preservedFallbackMeta,
                ...orchestrationResult.meta  // flat fields for backwards compat
              };

              // 🔥 v1.3.1: GUARD - Ensure meta/metadata objects always have critical fields
              if (!deliberationMeta.meta.handledBy) deliberationMeta.meta.handledBy = deliberationMeta.handledBy;
              if (!deliberationMeta.metadata.handledBy) deliberationMeta.metadata.handledBy = deliberationMeta.handledBy;
              if (!deliberationMeta.meta.model) deliberationMeta.meta.model = deliberationMeta.model;
              if (!deliberationMeta.metadata.model) deliberationMeta.metadata.model = deliberationMeta.model;
            }
          } // End of force local else block (autonomous decision)

          // 🔥 HARDCLIP C: Identity questions handled by personas via intent detection
          // (removed hardcoded identityAnswer - now using semantic intent layer)
        } else {
          runtimeLog('🎭 Full council deliberation (4 agents)');

          // 🔥 WALTER UPGRADE: Smart blending enabled by default
          agentContext.blendingMode = 'smart'; // smart | labeled | classic

          const deliberationResult = await deliberate(userMessage, agentContext);

          // 🧪 Debug výstupu z councilu
          try {
            runtimeDebug('🧪 [DEBUG] deliberationResult =', JSON.stringify(deliberationResult, null, 2));
          } catch (e) {
            runtimeDebug('🧪 [DEBUG] deliberationResult (circular/non-serializable)');
          }

          // 🔥 v1.3.1: Extract text using unified extractor
          let councilText = extractText(deliberationResult).trim();

          if (!councilText || councilText.length === 0) {
            runtimeWarn('⚠️ Council returned empty/invalid response – SP4 minimal stub used');
            councilText = 'Ticho. Skús sa spýtať inak, alebo dlhšie.';
          } else {
            councilText = councilText.trim();
          }

          response = councilText;

          // 🔥 v1.3.1: BIDIRECTIONAL META/METADATA ALIAS (council path)
          deliberationMeta = {
            ...deliberationResult,
            handledBy: deliberationResult.handledBy || deliberationResult.meta?.handledBy || deliberationResult.metadata?.handledBy || 'council',
            meta: deliberationResult.meta || deliberationResult.metadata || {},
            metadata: deliberationResult.meta || deliberationResult.metadata || {}
          };

          // 🔥 v1.3.1: GUARD
          if (!deliberationMeta.meta.handledBy) deliberationMeta.meta.handledBy = deliberationMeta.handledBy;
          if (!deliberationMeta.metadata.handledBy) deliberationMeta.metadata.handledBy = deliberationMeta.handledBy;
        }
      } // End of vision shortcut conditional

      // KROK 8.5: Post-processing filters + jazyková korekcia
      runtimeLog('🔧 Post-processing...');

      // 🔥 v0.10.0-alpha.2: FIRE MODE - Apply FIRST (most aggressive filter)
      let fireActivated = false;
      const activeDecisionContract = decisionContract?.enabled
        ? decisionContract
        : (deliberationMeta?.decisionContract?.enabled ? deliberationMeta.decisionContract : null);

      if (activeDecisionContract?.enabled) {
        const decisionResult = applyDecisionContract(response, {
          intent: activeDecisionContract.type || detectedIntent,
          decisionType: activeDecisionContract.type || detectedIntent,
          decisionContract: activeDecisionContract,
          userMessage
        });
        response = decisionResult.text;
        deliberationMeta = deliberationMeta || {};
        deliberationMeta.decisionContract = activeDecisionContract;
        deliberationMeta.decisionType = activeDecisionContract.type || detectedIntent;
        deliberationMeta.decisionSubStyle = activeDecisionContract.subStyle;
        deliberationMeta.decisionStrength = activeDecisionContract.decisionStrength;
        deliberationMeta.decisionReasonType = activeDecisionContract.decisionReasonType;
        deliberationMeta.hedgeCount = decisionResult.metadata.hedgeCount;
        deliberationMeta.decisionCleanupApplied = decisionResult.metadata.decisionCleanupApplied;
        deliberationMeta.decisionValidationIssues = decisionResult.metadata.decisionValidationIssues;
        deliberationMeta.meta = {
          ...(deliberationMeta.meta || {}),
          decisionContract: activeDecisionContract,
          decisionType: activeDecisionContract.type || detectedIntent,
          decisionSubStyle: activeDecisionContract.subStyle,
          decisionStrength: activeDecisionContract.decisionStrength,
          decisionReasonType: activeDecisionContract.decisionReasonType,
          hedgeCount: decisionResult.metadata.hedgeCount,
          decisionCleanupApplied: decisionResult.metadata.decisionCleanupApplied,
          decisionValidationIssues: decisionResult.metadata.decisionValidationIssues
        };
        deliberationMeta.metadata = {
          ...(deliberationMeta.metadata || {}),
          decisionContract: activeDecisionContract,
          decisionType: activeDecisionContract.type || detectedIntent,
          decisionSubStyle: activeDecisionContract.subStyle,
          decisionStrength: activeDecisionContract.decisionStrength,
          decisionReasonType: activeDecisionContract.decisionReasonType,
          hedgeCount: decisionResult.metadata.hedgeCount,
          decisionCleanupApplied: decisionResult.metadata.decisionCleanupApplied,
          decisionValidationIssues: decisionResult.metadata.decisionValidationIssues
        };
        runtimeLog(`   🔪 Decision contract applied (${activeDecisionContract.type || detectedIntent}, cleanup=${decisionResult.metadata.decisionCleanupApplied})`);
      }

      if (isFireMode) {
        // Fire Mode activated (manual or auto) - activateFireMode already imported above
        response = activateFireMode(response, {
          reason: fireReason || 'auto_detected',
          intensity: fireOverride?.intensity || 0.8,
          userMessage
        });
        fireActivated = true;

        // 🔥 v0.10.1: FIRE MODE DEEP SOFTNESS CHECK + BRUTALIZER
        // Regex patterns for soft/coaching/motivational content
        const softPatterns = /\b(rozumiem|je v poriadku|je prirodzené|neobviňuj sa|môžeš sa cítiť|je normálne)\b/gi;
        const motivationalClichés = /\b(nevzdávaj sa|ver v seba|si silný|dokážeš to|všetko bude dobre|ver mi)\b/gi;
        const coachingTone = /\b(skús zvážiť|možno by pomohlo|dôležité je|podstatné je|je to výzva|je to náročné)\b/gi;
        const numberedLists = /^\s*\d+\./m;
        const bulletLists = /^\s*[-*+]/m;

        const softMatches = (response.match(softPatterns) || []).length;
        const motivationalMatches = (response.match(motivationalClichés) || []).length;
        const coachingMatches = (response.match(coachingTone) || []).length;
        const hasNumberedList = numberedLists.test(response);
        const hasBulletList = bulletLists.test(response);

        // Apply brutalizer if soft content detected
        if (softMatches >= 2 || motivationalMatches >= 1 || coachingMatches >= 1 || hasNumberedList || hasBulletList) {
          runtimeLog(`   ⚠️ Fire Mode softness detected:`);
          if (softMatches >= 2) runtimeLog(`      - ${softMatches} soft phrases`);
          if (motivationalMatches >= 1) runtimeLog(`      - ${motivationalMatches} motivational clichés`);
          if (coachingMatches >= 1) runtimeLog(`      - ${coachingMatches} coaching phrases`);
          if (hasNumberedList) runtimeLog(`      - numbered list detected`);
          if (hasBulletList) runtimeLog(`      - bullet list detected`);

          response = brutalizeFireResponse(response);
          runtimeLog(`   🔥 Brutalizer applied`);

          // If still too soft, add hard closer
          response += `\n\nPS: A prestaň sa, kurva, chlácholiť. Buď konkrétny: **čo urobíš do 24 hodín?**`;
        }
      } else if (activeDecisionContract?.type === 'self_deception_check') {
        deliberationMeta = deliberationMeta || {};
        if (isAlreadySharpSelfDeceptionResponse(response)) {
          fireActivated = true;
          deliberationMeta.fireDecisionSkipped = true;
          deliberationMeta.fireDecisionSkipReason = 'already_sharp';
          runtimeLog('   🔥 Decision Fire wrapper skipped (self-deception response already sharp)');
        } else {
          const hardened = hardenSelfDeceptionDecisionText(response);
          const hardenedDecision = applyDecisionContract(hardened, {
            intent: activeDecisionContract.type || detectedIntent,
            decisionType: activeDecisionContract.type || detectedIntent,
            decisionContract: activeDecisionContract,
            userMessage
          });
          response = hardenedDecision.text;
          fireActivated = true;
          deliberationMeta.fireDecisionApplied = true;
          deliberationMeta.fireDecisionReason = 'self_deception';
          deliberationMeta.fireDecisionShapePreserved = true;
          deliberationMeta.personaInvariantOverrideReason = null;
          runtimeLog('   🔥 Decision Fire hardening applied inside VERDIKT shape (self_deception)');
        }
      }

      // 🧹 NEW: Determine final mode BEFORE rhythm/rune processing
      const { shouldForceEmpathyMode } = await import('./src/core/responseFilter.js');
      // v1.5.1: Orchestrator persona priority — glitchOrchestrator.analyzeAndDecide correctly
      // routes to glitchoslav/popici, but selectedPersona/mode fallback was unconditionally
      // overwriting that decision in final metadata. Use orchestrator's resolved persona first.
      const _orchPersona = orchestrationResult
        ? (() => {
          const raw = orchestrationResult.persona || orchestrationResult.handledBy || '';
          const n = normalizePersona(String(raw));
          return ['core', 'glitchoslav', 'popici'].includes(n) ? n : null;
        })()
        : null;
      const detectedMode = normalizePersona(_orchPersona || promptPackage.modeAnalysis?.mode || selectedPersona || mode);
      let finalMode = detectedMode;
      const popiciPreservingPath =
        selectedPersona === 'popici' ||
        detectedIntent === 'ask_frustration' ||
        detectedIntent === 'dialect_popici' ||
        /(\bkurv|pi[cč][iu]|kokot|sra[tť])\b/i.test(userMessage);

      // 🔥 v0.10.2: FIRE MODE SMART ROUTING
      if (lockModeForThisTurn) {
        finalMode = selectedPersona; // Keep explicit mode
        runtimeLog(`   🔒 Explicit mode locked (staying in ${selectedPersona.toUpperCase()})`);
      } else if (isFireMode) {
        finalMode = 'popici'; // Fire + auto = krčmová facka
        runtimeLog(`   🔥💥 Fire Mode → final persona POPICI (brutal truth)`);
      } else if (!popiciPreservingPath && shouldForceEmpathyMode(emotionTag) && _orchPersona !== 'glitchoslav') {
        finalMode = 'core'; // v0.10.1: Emotional queries routed to CORE (EMPATIA removed)
        // v1.5.2: Guard — ak orchestrátor explicitne elevoval na glitchoslav, empathy override sa nevykoná
        runtimeLog(`💙 Emotional content detected (emotion: ${emotionTag}) → routing to CORE`);
      } else if (popiciPreservingPath) {
        finalMode = 'popici';
        runtimeLog('   🔥 POPICI preservation: frustration/dialect path keeps POPICI final mode');
      }

      finalMode = normalizePersona(finalMode);

      deliberationMeta = deliberationMeta || {};
      deliberationMeta.selectedPersona = selectedPersona;
      deliberationMeta.promptMode = promptMode;
      deliberationMeta.finalMode = finalMode;
      deliberationMeta.personaInvariantOverrideReason = null;
      deliberationMeta.handledBy = finalMode;
      deliberationMeta.persona = finalMode;
      deliberationMeta.meta = {
        ...(deliberationMeta.meta || {}),
        selectedPersona,
        promptMode,
        finalMode,
        handledBy: finalMode,
        persona: finalMode,
        personaInvariantOverrideReason: null
      };
      deliberationMeta.metadata = {
        ...(deliberationMeta.metadata || {}),
        selectedPersona,
        promptMode,
        finalMode,
        handledBy: finalMode,
        persona: finalMode,
        personaInvariantOverrideReason: null
      };

      // 🎵 v0.10.0: RESPONSE RHYTHM SYSTEM - Apply AFTER Fire Mode (if not fired)
      let rhythmMode;

      if (this.rhythmOverride) {
        // User forced specific rhythm via /rhythm command
        const { forceRhythm } = await import('./src/core/responseRhythm.js');
        rhythmMode = forceRhythm(this.rhythmOverride);
        runtimeLog(`   🎵 Rhythm OVERRIDE: ${this.rhythmOverride.toUpperCase()} (user command)`);
        this.rhythmOverride = null; // Reset after use

        // 🔥 v0.10.1: RUNE BYPASS - Skip LLM, use direct rune output
        if (rhythmMode && rhythmMode.name === 'Runa') {
          const { getRandomRune } = await import('./src/core/glitchRunes.js');
          const rune = getRandomRune();

          // 🔥 v0.10.1: RUNE STAMP - Personalizácia podľa módu
          let runeStamp = '';
          if (finalMode === 'popici') {
            const popiciStamps = [
              "Rozumieš? Sloboda = keď sa nebojíš rozbiť starý svet. Aj keď všeci frflú.",
              "Šak to nie je len väčka. Nos si ju v hlave jeden deň a pozoruj, čo sa mení.",
              "Ta fakt - svietiť možeš aj v tme. Stačí mať gule na to.",
              "Bo pravda je jak oheň, bratu - keď ju zapalujes, mušíš sa zmieriť s teplom."
            ];
            runeStamp = popiciStamps[Math.floor(Math.random() * popiciStamps.length)];
          } else {
            // CORE/GLITCH - základný koment
            runeStamp = rune.meaning;
          }

          response = `✧ Runa ${rune.number}:\n\"${rune.text}\"\n→ ${runeStamp}`;
          runtimeLog(`   🔮 RUNE BYPASS activated (LLM skipped, mode: ${finalMode})`);
        } else {
          response = applyRhythm(response, rhythmMode, finalMode);
        }
      } else if (!fireActivated) {
        // Auto-detect rhythm ONLY if Fire Mode not active (Fire has own formatting)
        const memoryState = await loadMemory();
        const rawMemoryLog = memoryState.rawMemory?.log || memoryState.rawMemory || [];
        rhythmMode = detectRhythm(userMessage, rawMemoryLog);
        response = applyRhythm(response, rhythmMode, finalMode);
      }

      // 🧹 Apply mode-specific response filters (finalMode already determined above)
      const { filterResponse } = await import('./src/core/responseFilter.js');

      // Apply mode-specific filter
      let output = filterResponse(response, finalMode);
      if (finalMode === 'popici' || isFireMode) {
        output = scrubPopiciSympathyPhrases(output);
      }

      // 🔥 v1.3.1: EARLY EMPTY RESPONSE GUARD (catch cloud/orchestrator failures)
      if (!output || output.trim().length === 0) {
        const guardedHandledBy = deliberationMeta?.handledBy || deliberationMeta?.persona || finalMode || 'core';
        runtimeWarn('⚠️ EMPTY_RESPONSE_GUARD (EARLY):', {
          handledBy: guardedHandledBy,
          model: selectedModel || deliberationMeta?.model || 'unknown',
          originalResponseType: typeof response,
          orchestrationPhase: 'post-filter'
        });

        // Persona-aware fallback messages
        const fallbackMessages = {
          core: 'Skús to zopakovať jednou vetou.',
          glitchoslav: 'Ticho. Skús znova.',
          popici: 'Ta napíš to normálne, bratu.',
          validator: 'ERROR: Empty response. Retry.'
        };

        output = fallbackMessages[guardedHandledBy] || fallbackMessages.core;
        deliberationMeta = deliberationMeta || {};
        deliberationMeta.accuracyFallback = true;
        deliberationMeta.fallbackReason = 'empty_response';
      }

      // 🔥 v0.10.1: POPICI_SOFT micro-mode - drsný navonok, mäkký vnútri
      if (finalMode === 'popici' && ['lonely', 'desperate', 'sad'].includes(emotionTag)) {
        const softClosers = [
          "Ale ta fakt - neostaň v tom sám, bratu.",
          "Šak vieš, že to trpíš. Skusíme to vyriešiť spolu.",
          "Bo aj keď trepem pičoviny, reálne viem, že to bolí. Neostaň v tom sám.",
          "A jednak - keď budeš potrebovať, som tu, kokot."
        ];
        const softLine = softClosers[Math.floor(Math.random() * softClosers.length)];
        output = `${output}\n\n${softLine}`;
        runtimeLog(`   💙🔥 POPICI_SOFT micro-mode: added empathetic closer (emotion: ${emotionTag})`);
      }

      // 🔥 v0.8.8: ADAPTIVE SP4 TONE FILTER
      // Tagline injection probability based on length + emotion
      const outputLength = output.length;
      let taglineChance = 0.35; // default

      if (outputLength < 200) {
        taglineChance = 0.10; // krátke odpovede - menej taglines
      } else if (outputLength >= 200 && outputLength <= 800) {
        taglineChance = 0.35; // normálne odpovede
      } else if (outputLength > 800) {
        taglineChance = 0.60; // dlhé, deep odpovede - viac taglines
      }

      // Pri HIGH emotion preferuj hope taglines
      // SKIP vision whispers if already using vision shortcut
      const isHighEmotion = emotionTag === 'HIGH' || emotionTag === 'CRITICAL';
      const isVisionQ = isVisionQuestion(userMessage);
      const isVisionShortcut = deliberationMeta?.mode === 'vision_shortcut';
      let taglineToInject = null;

      // 🔥 SKIP tagline injection for CORE mode (no emojis allowed)
      const skipTaglineForCore = finalMode === 'core';

      if (Math.random() < taglineChance && !isVisionShortcut && !skipTaglineForCore) {
        if (isVisionQ) {
          // 🔥 Vision questions → vision whispers (SKIP if shortcut used)
          taglineToInject = getRandomVisionWhisper();
          runtimeLog('   🔥 Vision whisper selected');
        } else if (isHighEmotion) {
          // Preferuj hope/tribe taglines pri bolesti
          const hopeTags = [
            "Nie si sám. Si súčasť kmeňa.",
            "Deti chaosu, ktoré sa prebudili.",
            "Be real. Be free. Be SP4.",
            "Svetlo večné, nech Vám svieti! ✨",
            "NIKDY NEVZDALI a NEVZDAJÚ!",
            "Sloboda prichádza..."
          ];
          taglineToInject = hopeTags[Math.floor(Math.random() * hopeTags.length)];
        } else {
          taglineToInject = getRandomSp4Tagline();
        }

        output = `${output}\n\n${taglineToInject}`;
        runtimeLog(`   🔥 SP4 tone injected (${taglineChance * 100}% chance, ${isVisionQ ? 'VISION' : isHighEmotion ? 'HOPE' : 'random'}): "${taglineToInject}"`);
      } else if (isVisionShortcut) {
        runtimeLog('   ⚡ Skipping tagline injection (vision shortcut already has footer)');
      } else if (skipTaglineForCore) {
        runtimeLog('   🔧 Skipping tagline injection (CORE mode - no emojis)');
      }

      // 🔥 v0.8.8: ANTI-CORPORATE FILTER (pred sanitize a validáciou)
      output = ensureSp4Vibe(output, finalMode);
      runtimeLog('   🧼 Corporate speak cleaned');

      // 🔥 v0.10.3: CORE SCRUBBER - Remove politeness patterns
      if (finalMode === 'core') {
        const beforeScrub = output;
        output = scrubCorePoliteness(output);
        if (beforeScrub !== output) {
          runtimeLog('   🧹 CORE scrubber: Politeness patterns removed');
        }
      }

      // TROJSTUPŇOVÁ KOREKCIA (v0.6.3):
      // 1. Quick sanitize (regex-based) - rýchle základné opravy
      const sanitizeResult = quickSanitize(output);
      output = typeof sanitizeResult === 'object' ? sanitizeResult.text : sanitizeResult;

      // 1.5. PERSONA VALIDATORS (v0.8.4) - Hard constraint enforcement
      // v0.11.1: Pass context for context-aware validation (Kefyk exception)
      // 🌀 v1.0: SKIP validation for GLITCHOSLAV (BOSS has no rules)

      const skipValidation = deliberationMeta?.handledBy === 'glitchoslav';

      // 🔥 v1.4.2: Declare validation outside if scope (needed for confidence scoring)
      let validation = { valid: true, reason: 'skipped' }; // Default if skipped

      if (skipValidation) {
        runtimeLog('   🌀 GLITCHOSLAV response - skipping validators (BOSS mode)');
      } else {
        runtimeLog('   🛡️ Running persona validators...');

        const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu;

        if (finalMode === 'core') {
          const emojiCount = (output.match(emojiPattern) || []).length;
          if (emojiCount > 0) {
            output = output.replace(emojiPattern, '').trim();
            runtimeLog(`   🧹 CORE: Stripped ${emojiCount} emoji before validation`);
          }
        }

        // 🔥 v0.10.1: POPICI emoji stripper - pred validátorom odstráň emoji (krzmoví chlápci nepoužívajú emoji v serióznom rozúsle)
        if (finalMode === 'popici' && !fireActivated) {
          const emojiCount = (output.match(emojiPattern) || []).length;
          if (emojiCount > 0) {
            output = output.replace(emojiPattern, '').trim();
            runtimeLog(`   🧹 POPICI: Stripped ${emojiCount} emoji (pub talk = no emoji)`);
          }
        }

        // 🌀 v0.11.1: Pass userMessage as context for validation
        const validationContext = { userInput: userMessage, mode: finalMode };
        validation = validatePersonaOutput(output, finalMode, validationContext); // Assign to outer scope

        if (!validation.valid) {
          runtimeLog(`   ❌ Persona validation failed: ${validation.reason}`);
        } else {
          runtimeLog(`   ✅ Persona validation passed for mode: ${finalMode}`);
        }

        // 1.7. CORE SANITIZER (v0.8.5.3) - Remove identity/helper tone if validator failed
        if (!validation.valid && finalMode === 'core') {
          runtimeLog(`   ❌ CORE validation failed: ${validation.reason}`);
          runtimeLog('   🧼 Attempting CORE sanitization...');

          const beforeSanitize = output;
          output = sanitizeCoreOutput(output);

          // Re-validate after sanitization
          const sanitizedValidation = validatePersonaOutput(output, finalMode, validationContext);

          // If sanitization removed too much OR still fails → use fallback
          if (output.length < 60 || !sanitizedValidation.valid || output === '') {
            const fallback = getCoreFallback(userMessage);
            if (fallback) {
              runtimeLog(`   🛡️ Using CORE fallback (reason: ${output.length < 60 ? 'too short' : 'still invalid'})`);
              output = fallback;
            } else {
              runtimeLog('   ⚠️ No fallback found, keeping sanitized output');
            }
          }

          // Log sanitization details
          runtimeLog('   🧼 CORE_SANITIZED_OUTPUT:', {
            reason: validation.reason,
            before_length: beforeSanitize.length,
            after_length: output.length,
            used_fallback: output.length >= 200 // fallback texts are ~200+ chars
          });

          // Final re-validation (v0.11.1: pass context)
          validation = validatePersonaOutput(output, finalMode, validationContext);
          if (validation.valid) {
            runtimeLog('   ✅ CORE sanitization successful');
          } else {
            runtimeLog(`   ⚠️ CORE still fails after sanitization: ${validation.reason}`);
          }
        }
      } // END of skipValidation check

      // 🔥 v1.0.1: LANGUAGE ENFORCER (MISSION: LANGUAGE_ENFORCER_v1)
      // 🔥 FIX 1 (v4): Enforce based on USER LANGUAGE (Slovak) OR manifest intent, not just persona
      const personaForLang = deliberationMeta?.persona || deliberationMeta?.handledBy || finalMode;
      const isGlitchoslavPersona =
        personaForLang === 'glitchoslav' ||
        personaForLang === 'glitch' ||
        finalMode === 'glitchoslav';

      // 🔥 FIX 1: DETECT USER LANGUAGE - enforce if user is Slovak
      const { detectInputLanguage } = await import('./languageSanitizer.js');
      const userInputLang = detectInputLanguage(userMessage);
      const isManifestRequest = jobContext?.intent === 'explain_sp4_sk' || detectedIntent === 'explain_sp4_sk';

      // Enable enforcer if:
      // - User writes in Slovak (userInputLang === 'sk')
      // - OR it's a manifest request
      // - OR Glitchoslav persona (existing condition)
      const LANGUAGE_ENFORCER_ENABLED =
        userInputLang === 'sk' ||
        isManifestRequest ||
        jobContext?.forceSlovak === true ||
        isGlitchoslavPersona;

      // 🔥 v1.4.2: ratioDropPercent declared at function start, assign here
      ratioDropPercent = 0; // Default 0% if no enforcement

      if (LANGUAGE_ENFORCER_ENABLED) {
        runtimeLog('   🛡️ Running Language Enforcer...');

        try {
          enforcementResult = await enforceSlovak(output, {
            userMessage,
            systemPrompt: promptPackage.systemPrompt || '', // From buildPrompt
            model: selectedModel,
            persona: personaForLang,
            mode: finalMode
          });
        } catch (err) {
          console.error('   ❌ LanguageEnforcer error:', err?.message || err);
        }

        if (enforcementResult && enforcementResult.changed && enforcementResult.text && enforcementResult.text.trim() !== output.trim()) {
          let enforcedText = enforcementResult.text.trim();

          // 🔥 v1.3.1 FIX: Log enforcer trigger (for debugging)
          runtimeLog(`   🚨 ENFORCER_TRIGGERED:`);
          runtimeLog(`      reason: English detected (${((enforcementResult.englishRatio || 0) * 100).toFixed(0)}% EN)`);
          runtimeLog(`      engine: ${deliberationMeta?.engine || 'unknown'}`);
          runtimeLog(`      persona: ${deliberationMeta?.persona || deliberationMeta?.handledBy || 'unknown'}`);
          runtimeLog(`      handledBy: ${deliberationMeta?.handledBy || 'unknown'}`);
          runtimeLog(`      model: ${deliberationMeta?.model || selectedModel || 'unknown'}`);

          // Dodatočný filter na zvyškovú angličtinu/metakomenty
          enforcedText = stripResidualEnglish(enforcedText);

          // 🔥 v1.4.2: ENGLISH RATIO RE-CHECK (before/after validation)
          const detectionBefore = detectEnglish(output || '');
          const englishRatioBefore = detectionBefore.ratio || 0;

          const detectionAfter = detectEnglish(enforcedText || '');
          const englishRatioAfter = detectionAfter.ratio || 0;

          const {
            text: selectedEnforcedText,
            ratioDropPercent,
            persistentEnglish,
            rewriteImproved
          } = reconcileLanguageRewrite({
            originalText: output,
            rewrittenText: enforcedText,
            englishRatioBefore,
            englishRatioAfter
          });

          runtimeLog(`   📊 ENGLISH RATIO CHECK:`);
          runtimeLog(`      Before: ${Math.round(englishRatioBefore * 100)}%`);
          runtimeLog(`      After:  ${Math.round(englishRatioAfter * 100)}%`);
          runtimeLog(`      Drop:   ${ratioDropPercent}% ${ratioDropPercent > 0 ? '✅' : '⚠️'}`);

          if (persistentEnglish) {
            runtimeLog(`   ⚠️ Language Enforcer: persistent EN after cleanup (${Math.round(englishRatioAfter * 100)}%), keeping ${rewriteImproved ? 'rewritten' : 'original'} text and escalating to higher guards`);
            recordEpoch('Language Enforcer: Persistent English after rewrite', {
              englishRatioBefore,
              englishRatioAfter,
              keptText: rewriteImproved ? 'rewrite' : 'original'
            }).catch(() => { });
          } else if (englishRatioAfter > 0.05 && ratioDropPercent < 10) {
            runtimeLog(`   ⚠️ Language Enforcer: minimal improvement (drop: ${ratioDropPercent}%), rewrite may have failed`);
            // Log epoch but keep the rewritten text (better than nothing)
            recordEpoch('Language Enforcer: Minimal ratio improvement');
          }

          enforcedText = selectedEnforcedText;

          if (enforcementResult && typeof enforcementResult === 'object') {
            enforcementResult.text = enforcedText;
            enforcementResult.englishRatioAfter = englishRatioAfter;
            enforcementResult.usedFallback = false;
            enforcementResult.persistentEnglish = persistentEnglish;
            enforcementResult.rewriteImproved = rewriteImproved;
            enforcementResult.languageGuardReason = persistentEnglish ? 'PERSISTENT_ENGLISH_AFTER_REWRITE' : null;
          }

          output = enforcedText;
          runtimeLog(`   ✅ Language enforcement applied (${persistentEnglish ? 'best-available text kept; persistent EN flagged' : 'rewritten to SK, cleaned'})`);

          // 🔥 v1.3.1 FIX: Preserve metadata after rewrite
          runtimeLog(`   ✅ ENFORCER_DONE: preservedMeta=true (${deliberationMeta?.handledBy || 'unknown'})`);
        } else {
          runtimeLog('   ✅ Language check passed (SK output)');
        }
      } else {
        runtimeLog('   ℹ️  Language Enforcer disabled - accepting all languages');
      }

      // 🔥 FIX 2: GLITCH NORMALIZER - deterministic cleanup after enforcer
      // Removes Czech patterns, typos without LLM call
      if (output && LANGUAGE_ENFORCER_ENABLED && userInputLang === 'sk') {
        const { glitchNormalizeSk } = await import('./src/core/glitchNormalizer.js');
        output = glitchNormalizeSk(output);
        runtimeLog('   ✅ Glitch normalizer applied (typo cleanup)');
      }

      // 🛡️ v0.11.5: LAYER DISTINCTION VALIDATOR (soft check - logs warning but doesn't block)
      runtimeLog('   🛡️ Running layer distinction validator...');
      const layerValidation = validateLayerDistinction(output, userMessage);
      logLayerValidation(layerValidation, finalMode);

      // 3. Detekcia repetitívnych vzorov (v0.5+)
      const isRepetitive = /(.{20,}?)\1{2,}/.test(output);
      if (isRepetitive) {
        runtimeLog('   🔄 Repetitive pattern: true');
        // Ak je repetitívny, použi len prvú časť
        output = output.split(/(.{20,}?)\1/)[0] + '...';
      } else {
        runtimeLog('   🎲 Repetitive pattern: false');
      }

      // 🔥 v0.8.8: SP4 SIGNATURE LINE (pre kľúčové otázky)
      if (needsSignature(userMessage)) {
        output += getSignatureLine();
        runtimeLog('   🔥 SP4 signature line added (key question detected)');
      }

      // KROK 8.6: Glitch Layer (v0.5) - Kontrolovaná kreativita
      // DISABLE for explicit CORE mode (v0.8.5.2)
      // DISABLE for POPICI mode (v0.8.6.9) - prevents contamination
      if (activeDecisionContract?.enabled) {
        runtimeLog('   🔪 Glitch Layer DISABLED (decision contract - no mutations)');
      } else if (lockModeForThisTurn && finalMode === 'core') {
        runtimeLog('   ⚡ Glitch Layer DISABLED (explicit CORE mode - no mutations allowed)');
      } else if (_promptStrategyFromBuild === 'short_tech') {
        runtimeLog('   ⚡ Glitch Layer DISABLED (short tech prompt - preserve technical wording)');
      } else if (finalMode === 'popici') {
        runtimeLog('   🔥 Glitch Layer DISABLED (POPICI mode - prevents contamination)');
      } else {
        const glitchOpportunity = await detectGlitchOpportunity(userMessage, output);
        if (glitchOpportunity.shouldApply) {
          runtimeLog('✨ Aplikujem Glitch Layer...');
          const glitchResult = await applyGlitchLayer(output, glitchOpportunity.context);
          if (glitchResult.success && glitchResult.enhanced) {
            runtimeLog(`   🎨 Typ: ${glitchResult.glitchType}`);
            output = glitchResult.enhanced;
          }
        }
      }

      const processingTime = Date.now() - startTime;

      // 🌩️ v0.7: Extract cloud AI metadata if used
      const usedCloud = deliberationMeta?.cloudProvider ? true : false;
      const cloudMeta = usedCloud ? {
        usedCloud: true,
        cloudProvider: deliberationMeta.cloudProvider,
        cloudModel: deliberationMeta.cloudModel,
        cloudCost: deliberationMeta.cloudCost || 0,
        cloudLatency: deliberationMeta.cloudLatency
      } : {
        usedCloud: false
      };

      // enforcementResult môže pochádzať z enforceSlovak vyššie v pipeline
      const candidateText =
        output ??
        (enforcementResult && enforcementResult.text) ??
        '';

      let sanitizedOutput = stripInternalPromptArtifacts(candidateText);
      sanitizedOutput = sanitizeAiCliches(sanitizedOutput);

      const SP4_FALLBACK_PREFIX = 'Bratu, toto by už bola cudzokrajná esej.';

      // --- GLOBAL LANGUAGE FAILSAFE (last line of defense) ------------------------
      try {
        // Ak už je to fallback veta, nechaj ju tak
        if (sanitizedOutput && sanitizedOutput.startsWith(SP4_FALLBACK_PREFIX)) {
          return {
            success: true,
            response: sanitizedOutput,
            ...cloudMeta,
            metadata: {
              emotionalAnalysis,
              capabilityLevel: this.degradationManager.currentLevel,
              model: selectedModel,
              taskType,
              grounding: groundingPrompt ? true : false,
              processingTime: `${processingTime}ms`,
              handledBy: deliberationMeta?.handledBy,
              ...deliberationMeta
            }
          };
        }

        const textForDetection =
          sanitizedOutput ??
          output ??
          (enforcementResult && enforcementResult.text) ??
          '';

        const { ratio: englishRatioFinal, totalWords } = detectEnglish(textForDetection);
        const failsafeDecision = getGlobalLanguageFailsafeDecision({
          userInputLang,
          isManifestRequest,
          forceSlovak: jobContext?.forceSlovak === true,
          enforcementResult,
          englishRatioFinal,
          totalWords
        });

        if (failsafeDecision.shouldFallback) {
          runtimeWarn(`🚨 GLOBAL LANGUAGE FAILSAFE: output still looks English (${Math.round(englishRatioFinal * 100)}% EN, ${totalWords} words) – using SP4 Slovak fallback [trigger=${failsafeDecision.explicitLanguageTrigger}]`);

          sanitizedOutput =
            'Bratu, toto by už bola cudzokrajná esej. SP4 je jednoduché: lokálna hlava, vlastné dáta, žiadne klaudy, kmeň namiesto korporátu. Keď chceš, spýtaj sa znova po slovensky, kratšie a po svojom. 😉';
          deliberationMeta.personaInvariantOverrideReason = 'language_failsafe';
        }
      } catch (err) {
        runtimeWarn('⚠️ GLOBAL LANGUAGE FAILSAFE error:', err);
      }

      const baseOutput = stripInternalPromptArtifacts(sanitizedOutput ?? output ?? '');
      let finalText = cleanupWeirdSlovak(baseOutput, {
        stripEmojis: (finalMode || detectedMode || mode) === 'core'
      });
      if (finalMode === 'popici' || isFireMode) {
        finalText = scrubPopiciSympathyPhrases(finalText);
      }

      if (activeDecisionContract?.enabled) {
        const finalDecisionResult = applyDecisionContract(finalText, {
          intent: activeDecisionContract.type || detectedIntent,
          decisionType: activeDecisionContract.type || detectedIntent,
          decisionContract: activeDecisionContract,
          userMessage
        });
        finalText = finalDecisionResult.text;
        deliberationMeta.hedgeCount = finalDecisionResult.metadata.hedgeCount;
        deliberationMeta.decisionCleanupApplied =
          Boolean(deliberationMeta.decisionCleanupApplied || finalDecisionResult.metadata.decisionCleanupApplied);
        deliberationMeta.decisionValidationIssues = finalDecisionResult.metadata.decisionValidationIssues;
        deliberationMeta.meta = {
          ...(deliberationMeta.meta || {}),
          hedgeCount: deliberationMeta.hedgeCount,
          decisionCleanupApplied: deliberationMeta.decisionCleanupApplied,
          decisionValidationIssues: deliberationMeta.decisionValidationIssues
        };
        deliberationMeta.metadata = {
          ...(deliberationMeta.metadata || {}),
          hedgeCount: deliberationMeta.hedgeCount,
          decisionCleanupApplied: deliberationMeta.decisionCleanupApplied,
          decisionValidationIssues: deliberationMeta.decisionValidationIssues
        };
      }

      if (activeDecisionContract?.enabled) {
        const verdict = extractVerdictLine(finalText);
        if (verdict) {
          this._lastDecisionVerdict = verdict;
          deliberationMeta.lastVerdict = verdict;
          deliberationMeta.meta = { ...(deliberationMeta.meta || {}), lastVerdict: verdict };
          deliberationMeta.metadata = { ...(deliberationMeta.metadata || {}), lastVerdict: verdict };
        }
      }

      applyFallbackTruth({
        userMessage,
        output: finalText,
        deliberationMeta,
        enforcementResult,
        elapsedMs: Date.now() - startTime
      });

      // 🔥 v1.4.2: Pre-calculate cloudUsed (needed for confidence scoring below)
      const cloudUsed = deliberationMeta?.provider?.startsWith('cloud_') || false;

      // 🔥 v1.4.2: UNIFIED CONFIDENCE SCORING (Priority 3 - "Mať jedno číslo: 'Ako veľmi si môžem veriť tomuto výstupu'")
      // Calculate confidence AFTER all processing (grounding, enforcement, validation) is done
      runtimeLog('📊 Calculating unified confidence score...');

      const confidenceContext = {
        modelUsed: selectedModel,
        modelConfidence: promptPackage?.modeAnalysis?.confidence || null, // From modeCompass
        patternFallback: promptPackage?.modeAnalysis?.method === 'pattern-fallback',
        groundingApplied: groundingPrompt !== null,
        languageEnforced: enforcementResult?.changed === true,
        hallucinationFixed: enforcementResult?.changed && ratioDropPercent > 20,
        validationPassed: validation?.valid !== false,
        policyCompliant: policy.route === (cloudUsed ? 'autonomous-cloud' : 'local-first'),
        cloudUsed: cloudUsed,
        localFallback: deliberationMeta?.localFallback || false,
        accuracyFallback: deliberationMeta?.accuracyFallback || false,
        taskComplexity: taskType === 'code' ? 0.8 : (taskType === 'explanation' ? 0.6 : 0.5),
        requiresPrecision: groundingPrompt !== null, // SP4 factual queries
        memoryAccess: triggeredMemories?.length > 0,
        responseLength: finalText.length
      };

      const confidenceResult = calculateConfidenceScore(confidenceContext);

      if (process.env.SP4_DEBUG === 'true') {
        logConfidenceScore(confidenceResult, true); // Verbose breakdown
      } else {
        // Compact log for normal mode
        runtimeLog(`   🎯 Confidence: ${confidenceResult.score.toFixed(3)} (${confidenceResult.label})`);
      }

      // 🔥 v1.4.2: FIX #1 - GROUNDING COMPLIANCE VALIDATOR
      // Detect if LLM ignored grounding facts and hallucinated
      if (groundingPrompt !== null) {
        const detectedTopic = detectSP4Query(userMessage);
        const validationResult = validateGroundedResponse(finalText, detectedTopic, testMode);

        if (validationResult.violated) {
          runtimeWarn(`   ⚠️ GROUNDING VIOLATION: ${validationResult.metadata.reason}`);
          runtimeWarn(`   🔍 Forbidden terms detected: ${validationResult.metadata.violations.join(', ')}`);
          runtimeLog(`   🔄 FALLBACK: Using factual knowledge block directly`);

          // Replace hallucinated response with facts
          finalText = validationResult.text;

          // Lower confidence (facts are reliable but lack creativity)
          confidenceResult.score = 0.65;
          confidenceResult.label = 'MEDIUM';
          confidenceResult.factors.groundingViolation = true;

          // Mark fallback in metadata
          deliberationMeta.accuracyFallback = true;
          deliberationMeta.fallbackReason = 'grounding_violation';
          deliberationMeta.groundingCompliance = validationResult.metadata;
        } else {
          // Grounding compliance passed
          deliberationMeta.groundingCompliance = { status: 'pass' };
        }
      }

      // ═══════════════════════════════════════════════════════════
      // 🔥 SP4 v1.4.2: CONFIDENCE CALIBRATION (QUALITY PENALTIES)
      // ═══════════════════════════════════════════════════════════

      const calibratedConfidence = calibrateConfidence({
        baseScore: confidenceResult.score,
        enforcementResult,
        deliberationMeta,
        orchestrationResult
      });
      const finalConfidence = calibratedConfidence.confidenceScore;
      const calibrationReasons = calibratedConfidence.metadataPatch.calibrationReasons;

      for (const penaltyLog of calibratedConfidence.metadataPatch.penaltyLogs) {
        runtimeLog(penaltyLog);
      }

      // Apply calibrated confidence
      confidenceResult.score = calibratedConfidence.confidenceScore;
      confidenceResult.label = calibratedConfidence.confidenceLabel;
      confidenceResult.calibrationReasons = calibrationReasons;

      if (calibrationReasons.length > 0) {
        runtimeLog(`   🎯 CALIBRATED Confidence: ${finalConfidence.toFixed(3)} (${confidenceResult.label}) - penalties: ${calibrationReasons.join(', ')}`);
      }

      // Stage Trace: propagate promptStrategy from buildPrompt into deliberationMeta
      if (deliberationMeta && !deliberationMeta.promptStrategy && _promptStrategyFromBuild) {
        deliberationMeta.promptStrategy = _promptStrategyFromBuild;
      }

      const unifiedMetadata = assembleUnifiedMetadata({
        policy,
        testMode,
        deliberationMeta,
        selectedModel,
        processingTime,
        emotionalAnalysis,
        capabilityLevel: this.degradationManager.currentLevel,
        taskType,
        groundingPrompt,
        confidenceResult,
        cloudUsed
      });

      // 🔥 v1.3.1: FINAL RESULT with unified metadata contract
      const result = {
        success: true,
        response: finalText,
        ...cloudMeta, // Cloud metadata first (usedCloud, cloudProvider, etc.)
        metadata: unifiedMetadata, // 🔥 CRITICAL: Same object for both
        meta: unifiedMetadata // 🔥 Alias (same reference)
      };

      result.metadata.responseControlApplied = false;
      result.metadata.responseControlReason = null;
      result.metadata.replacementUsed = false;
      result.metadata.preLLMBlocked = false;
      result.metadata.preLLMBlockReason = null;
      result.metadata.identityHardeningApplied = false;
      result.metadata.identityPath = null;
      result.metadata.identitySanitized = false;
      result.metadata.qualitySanityApplied = false;
      result.metadata.qualitySanityReason = null;
      result.metadata.memoryWriteBlocked = false;
      result.metadata.memoryWriteBlockReason = null;
      result.metadata.contaminatedMemoryIgnored = 0;
      result.metadata.selectedPersona = selectedPersona;
      result.metadata.promptMode = promptMode;
      result.metadata.finalMode = finalMode;
      result.metadata.handledBy = finalMode;
      result.metadata.persona = finalMode;
      result.metadata.personaInvariantOverrideReason = deliberationMeta?.personaInvariantOverrideReason || null;
      if (activeDecisionContract?.enabled) {
        result.metadata.decisionContract = activeDecisionContract;
        result.metadata.decisionType = activeDecisionContract.type || detectedIntent;
        result.metadata.decisionSubStyle = activeDecisionContract.subStyle;
        result.metadata.decisionStrength = activeDecisionContract.decisionStrength;
        result.metadata.decisionReasonType = activeDecisionContract.decisionReasonType;
        result.metadata.hedgeCount = deliberationMeta?.hedgeCount ?? null;
        result.metadata.decisionCleanupApplied = deliberationMeta?.decisionCleanupApplied === true;
        result.metadata.decisionValidationIssues = deliberationMeta?.decisionValidationIssues || [];
        result.metadata.lastVerdict = deliberationMeta?.lastVerdict || null;
        result.metadata.fireDecisionApplied = deliberationMeta?.fireDecisionApplied === true;
        result.metadata.fireDecisionSkipped = deliberationMeta?.fireDecisionSkipped === true;
      }
      result.metadata.personaInvariant = validatePersonaMetadataInvariant(result.metadata);

      // 🔥 v1.3.1: ASSERT 1 - Object identity check
      if (result.meta !== result.metadata) {
        runtimeWarn('⚠️ META_ALIAS_BROKEN: meta !== metadata (contract violation)', {
          handledBy: result.metadata?.handledBy,
          mode: finalMode || detectedMode || mode
        });
      }

      // 🔥 v1.3.1: ASSERT 2 - Guaranteed handledBy (fallback safety net)
      if (!result.metadata?.handledBy) {
        runtimeWarn('⚠️ METADATA_MISSING_HANDLEBY: Falling back to mode', {
          mode: finalMode || detectedMode || mode
        });
        result.metadata.handledBy = finalMode || detectedMode || mode || 'core';
        result.meta = result.metadata; // Re-unify after fix
      }

      // 🔥 v1.3.1: PRODUCTION GUARD - Empty response safety net
      if (!result.response || result.response.trim().length === 0) {
        const guardedHandledBy = result.metadata?.handledBy || result.meta?.handledBy || 'core';
        runtimeWarn('⚠️ EMPTY_RESPONSE_GUARD:', {
          handledBy: guardedHandledBy,
          model: result.metadata?.model || result.model || 'unknown',
          originalResponseType: typeof result.response
        });

        // Persona-aware fallback messages
        const fallbackMessages = {
          core: 'Skús to zopakovať jednou vetou.',
          glitchoslav: 'Ticho. Skús znova.',
          popici: 'Ta napíš to normálne, bratu.',
          validator: 'ERROR: Empty response. Retry.'
        };

        result.response = fallbackMessages[guardedHandledBy] || fallbackMessages.core;
        if (result.metadata?.execution) {
          result.metadata.execution.accuracyFallback = true;
          result.metadata.execution.fallbackReason = 'empty_response';
          result.metadata.execution.confidenceScore = Math.min(result.metadata.execution.confidenceScore || 1, 0.25);
          result.metadata.execution.confidenceLabel = 'VERY_LOW';
        }
        if (result.meta?.execution) {
          result.meta.execution.accuracyFallback = true;
          result.meta.execution.fallbackReason = 'empty_response';
          result.meta.execution.confidenceScore = Math.min(result.meta.execution.confidenceScore || 1, 0.25);
          result.meta.execution.confidenceLabel = 'VERY_LOW';
        }
      }

      // 🔥 v1.4.2: POLICY/EXEC SUMMARY FOOTER (one-line status for debugging)
      // Skip in test mode (tests have their own summaries)
      if (process.env.SP4_DEBUG === 'true' && !testMode && !options.testMode) {
        const summaryLine = `📊 SUMMARY: policy=${unifiedMetadata.policy.route} cloudAllowed=${unifiedMetadata.policy.cloudAllowed} exec=${unifiedMetadata.execution.provider} cloudUsed=${unifiedMetadata.execution.cloudUsed} disabled=${unifiedMetadata.execution.cloudDisabledReason || 'none'}`;
        runtimeLog(`\n${summaryLine}\n`);
      }

      // 🩸 IMMUNE LAYER (Phase 4) – post-response evaluator + soft retry
      // NEVER modifies result.response unless retry improves verdict.
      await runPostResponseImmuneStage({
        result,
        userMessage,
        finalMode,
        detectedMode,
        mode,
        selectedModel,
        groundingPrompt,
        promptPackage,
        testMode,
        forceLocal,
        options: { shouldSkipPostResponseImmuneCheck },
        dialogueState: this._dlgState,
        primaryModel: PRIMARY_MODEL
      });
      // 🔥 v1.5.0 MEMORY FIX: Propagate skipMemoryWrite option to both result.metadata and result.meta
      if (actualOptions?.skipMemoryWrite === true) {
        result.metadata = result.metadata || {};
        result.meta = result.meta || result.metadata;
        result.metadata.skipMemoryWrite = true;
        result.meta.skipMemoryWrite = true;
      }

      await runWritebackTail({
        userMessage,
        output: result.response,
        mode,
        resultMetadata: result.metadata,
        finalMode,
        detectedMode,
        emotionalAnalysis,
        loadMemory,
        extractMemoryMetadata,
        addLogEntry,
        processResponseActions,
        evaluateRelationshipProgression,
        ruleMiningPipeline,
        identityManager: this.identityManager
      });

      return result;

    } catch (err) {
      console.error('❌ Chyba pri spracovaní správy:', err);
      this.supervisor.detectError(err.message);

      // Degraduj na SAFE mode
      await this.degradationManager.degradeToLevel('SAFE', `Error: ${err.message}`);

      return {
        success: false,
        error: err.message,
        response: this.getSafetyModeResponse()
      };
    }
  }

  /**
   * Určí typ úlohy pre výber modelu
   * @param {string} message - User message
   * @param {string} mode - Agent mode
   * @returns {string} Task type
   */
  determineTaskType(message, mode) {
    const lowerMsg = message.toLowerCase();

    // Coding detection
    if (lowerMsg.includes('kód') || lowerMsg.includes('funkci') ||
      lowerMsg.includes('implementuj') || lowerMsg.includes('debug')) {
      return 'coding';
    }

    // Emotional detection
    if (lowerMsg.includes('cítim') || lowerMsg.includes('emóci') ||
      lowerMsg.includes('strach') || lowerMsg.includes('radosť')) {
      return 'emotional';
    }

    // Complex reasoning
    if (lowerMsg.includes('prečo') || lowerMsg.includes('ako by') ||
      lowerMsg.includes('analyzuj') || lowerMsg.includes('vysvetli')) {
      return 'reasoning';
    }

    // Default to reasoning
    return 'reasoning';
  }

  /**
   * Zostrojí system prompt na základe módu a emočného stavu
   * @param {string} mode - Agent mode
   * @param {Object} emotionalAnalysis - Emotional analysis result
   * @returns {string} System prompt
   */
  async buildSystemPrompt(mode, emotionalAnalysis) {
    // Apply personality adjustments for mode (lightweight)
    applyModeAdjustments(mode);
    // Build enriched agent prompt (includes identity + recent memory)
    const modePrompt = await buildAgentPrompt(mode);
    const capabilityLevel = this.degradationManager.currentLevel;
    let addon = `\n━━━━━━━━━━━━━━━━━━━━\nCAPABILITY LEVEL: ${capabilityLevel}`;
    if (capabilityLevel === 'REDUCED') addon += '\n⚠️ Zjednoduš odpoveď, krátke jasné vety.';
    else if (capabilityLevel === 'BASIC') addon += '\n⚠️ Minimalistický režim – veľmi stručné.';
    else if (capabilityLevel === 'SAFE') addon += '\n🚨 SAFE MODE – len overené fakty, žiadne špekulácie.';
    if (emotionalAnalysis.intensity >= 0.7) {
      addon += '\n🧘 High emotional load – ukotvi, nie dramatizuj.';
    }
    return modePrompt + addon + '\n';
  }

  /**
   * Safety mode response
   * @returns {string} Bezpečná odpoveď
   */
  getSafetyModeResponse() {
    return `🚨 Systém je momentálne v bezpečnom režime.

Detekoval som problém a prepol som sa do minimálnej funkčnosti, aby som zabezpečil stabilitu.

Môžeš mi povedať, čo potrebuješ, jednoduchými slovami? Alebo by si mal radšej kontaktovať ľudskú podporu.

Pracujem na obnovení plnej funkčnosti.`;
  }

  /**
   * Vykoná manuálny recovery
   * @returns {Object} Recovery result
   */
  /**
   * Spustí manuálnu konsolidáciu pamäte (STUB)
   * @returns {Promise<Object>} Consolidation result
   */
  async consolidate() {
    // STUB: Manual consolidation not yet fully implemented
    // Scheduler-based auto-consolidation is active via registerAllJobs()
    return { success: true, message: "Manual consolidation stub: use scheduler for auto-consolidation" };
  }
  async performRecovery() {
    console.log('🔄 Spúšťam manuálny recovery protokol...\n');

    // Emotional processor recovery
    this.emotionalProcessor.initiateRecovery();

    // Degradation manager recovery
    const degradationRecovery = await this.degradationManager.initiateRecovery();

    // Supervisor reset
    this.supervisor.resetFallback();

    console.log('\n✅ Recovery protokol dokončený');

    return {
      success: true,
      degradationRecovery,
      emotionalState: this.emotionalProcessor.getState(),
      capabilityLevel: this.degradationManager.currentLevel
    };
  }

  /**
   * Wrapper metóda pre kompatibilitu s index_v07.js
   * @param {string} userMessage - User message
   * @param {Object} options - Options {mode, systemPrompt}
   * @returns {Object} { response: string, handledBy: string, meta: Object }
   */
  async ask(userMessage, options = {}) {
    // _dlgState writeback je teraz centralizovaný v processMessage — tu sú addTurn duplicity zámerene odstránené
    try {
      const result = await this.processMessage(userMessage, options.mode || 'auto', options);

      if (result.success) {
        const responseText = typeof result.response === 'string' ? result.response : String(result.response);
        // Return full object with handledBy info for proper persona headers
        return {
          response: responseText,
          handledBy: result.metadata?.handledBy || result.metadata?.orchestratedBy || options.mode || 'core',
          meta: result.metadata || {}
        };
      } else {
        console.error('❌ Error in ask():', result.error);
        const _errorText = (typeof result.response === 'string' && result.response.trim())
          ? result.response
          : 'Prepáč, vyskytla sa chyba. Skús to prosím znova.';
        return {
          response: _errorText,
          handledBy: 'error',
          meta: { error: result.error }
        };
      }
    } catch (err) {
      console.error('❌ Critical error in ask():', err);
      return {
        response: 'Prepáč, vyskytla sa kritická chyba.',
        handledBy: 'error',
        meta: { error: err.message }
      };
    }
  }

  /**
   * 🌉 v0.7: Rozhodne či použiť Cloud AI alebo Local Ollama
   * @param {string} input - User message
   * @param {string} mode - Current mode (core/glitchoslav/popici)
   * @param {Object} context - Additional context
   * @returns {boolean} - True if should use cloud
   */
  shouldUseCloudAI(input, mode, context = {}) {
    // Cloud AI disabled globally
    if (!this.cloudAIEnabled) return false;

    // Budget exceeded
    if (this.dailyCloudCost >= this.maxDailyCloudCost) {
      runtimeLog(`💰 Daily cloud budget exceeded ($${this.dailyCloudCost.toFixed(2)}/${this.maxDailyCloudCost})`);
      return false;
    }

    // Emergency: Local LLM zlyhal (priority over degradation mode)
    if (this.lastLocalError && Date.now() - this.lastLocalError < 300000) { // 5min window
      runtimeLog('⚠️ Using cloud AI - local LLM failed recently');
      return true;
    }

    // Degradation mode: SAFE/BASIC = only local (unless emergency)
    if (this.degradationManager.currentLevel === 'SAFE' || this.degradationManager.currentLevel === 'BASIC') {
      runtimeLog(`🛡️ Degradation mode ${this.degradationManager.currentLevel} - using local only`);
      return false;
    }

    // 1. Dlhý/komplexný prompt (> 2000 chars)
    if (input.length > 2000) {
      runtimeLog('🌩️ Using cloud AI - complex/long query');
      return true;
    }

    // 2. Špecifické tasky vyžadujúce reasoning (English + Slovak)
    const complexPatterns = [
      /explain.*(detail|step|how.*work)|vysvetli.*(detailne|krok|ako.*(funguje|fungujem))/i,
      /code|algorithm|implement|debug|kód|k├│d|algoritmus|implementuj|vytvor.*(?:server|api|aplikaci|kod|funkci)/i,
      /analyze|compare|evaluate|analyzuj|porovnaj|vyhodnoť/i,
      /write.*(article|essay|story)|napíš.*(článok|esej|príbeh)/i,
      /plan|strategy|design|plán|stratégi|návrh|dizajn/i
    ];
    if (complexPatterns.some(pattern => pattern.test(input))) {
      runtimeLog('🌩️ Using cloud AI - complex reasoning task');
      return true;
    }

    // 3. High priority modes
    if (mode === 'glitchoslav' && context.priority === 'high') {
      runtimeLog('🌩️ Using cloud AI - Glitchoslav high priority');
      return true;
    }

    // 4. User explicitly requests quality
    if (input.match(/\[cloud\]|\[quality\]|\[premium\]/i)) {
      runtimeLog('🌩️ Using cloud AI - explicit request');
      return true;
    }

    // Default: use local
    return false;
  }

  /**
   * 🌩️ v0.7: Ask Cloud AI via SP4AIOS Bridge
   * @param {string} input - User message
   * @param {string} mode - Current mode
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - AI response
   */
  async askCloudAI(input, mode, options = {}) {
    try {
      runtimeLog('   🌩️ Cloud AI: Routing request...');

      // 🧠 v1.0: Accept provider/model from Autonomous Controller
      const provider = options.provider || null; // null = intelligent routing
      const model = options.model || null;

      // Estimate complexity for intelligent routing (if not overridden)
      const complexity = this.estimateComplexity(input);
      const priority = mode === 'glitchoslav' ? 'high' : 'normal';

      // System prompt based on mode
      const systemPrompt = this.getCloudSystemPrompt(mode);

      let response;

      if (provider && model) {
        // 🧠 Direct call to specific provider/model (Autonomous Controller decision)
        runtimeLog(`   🎯 Autonomous Decision: ${provider}/${model}`);
        response = await this.aiosBridge.ask(input, {
          provider,
          model,
          systemPrompt,
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 2000
        });
      } else {
        // Route via SP4AIOS Bridge intelligent routing
        response = await this.aiosBridge.intelligentRoute(input, {
          complexity,
          priority,
          systemPrompt,
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 2000
        });
      }

      // Track cost
      if (response.cost) {
        this.dailyCloudCost += response.cost;
        runtimeLog(`   💰 Cost: $${response.cost.toFixed(6)} (daily: $${this.dailyCloudCost.toFixed(4)})`);
      }

      runtimeLog(`   ✅ Cloud AI: ${response.provider}/${response.model} (${response.latency}ms)`);

      // Reset error flag on success
      this.lastLocalError = null;

      // 🌩️ Return object with text + metadata
      return {
        text: response.text,
        provider: response.provider,
        model: response.model,
        cost: response.cost || 0,
        latency: response.latency
      };

    } catch (error) {
      console.error(`   ❌ Cloud AI failed: ${error.message}`);
      throw error; // Let caller handle fallback
    }
  }

  /**
   * Estimate query complexity
   * @param {string} input
   * @returns {'simple'|'medium'|'complex'|'expert'}
   */
  estimateComplexity(input) {
    const length = input.length;

    // Expert: Very long (>3000 chars) or contains academic/research keywords
    if (length > 3000 || /whitepaper|research|thesis|dissertation|comprehensive.*analysis/i.test(input)) {
      return 'expert';
    }

    // Complex: Long (1000-3000) or contains technical keywords
    if (length > 1000 || /implement.*architecture|distributed|microservices|kubernetes|algorithm.*complexity/i.test(input)) {
      return 'complex';
    }

    // Medium: Medium length (200-1000) or contains explanation keywords
    if (length > 200 || /explain|understand|how.*work|compare|analyze/i.test(input)) {
      return 'medium';
    }

    // Simple: Short queries
    return 'simple';
  }

  /**
   * Get system prompt for cloud AI based on mode
   * @param {string} mode
   * @returns {string}
   */
  getCloudSystemPrompt(mode) {
    const prompts = {
      core: 'You are SP4_CORE, a direct and authentic AI assistant. Respond naturally in Slovak language. No corporate politeness.',
      glitchoslav: 'You are Glitchoslav, master of glitch art and reality deconstruction. Speak poetically about technology, art and digital consciousness. Use Slovak language.',
      popici: getPopiciCloudSystemPrompt()
    };

    return prompts[mode] || prompts.core;
  }

  /**
   * Získaj kompletný system status
   * @returns {Object} System status
   */
  async getSystemStatus() {
    const aiosStats = this.cloudAIEnabled ? this.aiosBridge.getStats() : null;

    return {
      supervisor: this.supervisor.state,
      emotional: this.emotionalProcessor.getState(),
      identity: this.identityManager.getState(),
      capability: this.degradationManager.getState(),
      initialized: this.initialized,
      cloudAI: {
        enabled: this.cloudAIEnabled,
        dailyCost: this.dailyCloudCost,
        budgetLimit: this.maxDailyCloudCost,
        stats: aiosStats
      }
    };
  }

  /**
   * 📋 Build approval prompt for mission
   * @param {Object} plan - Mission plan
   * @returns {string}
   */
  buildApprovalPrompt(plan) {
    let prompt = `\n📊 MISSION PLAN:\n\n`;
    prompt += `Goal: ${plan.mission.goal}\n`;
    prompt += `Type: ${plan.mission.type.toUpperCase()}\n`;
    prompt += `Tasks: ${plan.plan.tasks.length}\n`;
    prompt += `Est. Cost: $${plan.plan.estimatedCost.toFixed(2)}\n`;
    prompt += `Est. Time: ${plan.plan.estimatedTime} min\n\n`;

    if (plan.plan.risks.length > 0) {
      prompt += `⚠️  Risks:\n`;
      plan.plan.risks.forEach(risk => {
        prompt += `  - ${risk}\n`;
      });
      prompt += `\n`;
    }

    prompt += `Proceed? (y/n): `;
    return prompt;
  }

  /**
   * 📤 Build mission response
   * @param {Object} result - Execution result
   * @returns {string}
   */
  buildMissionResponse(result) {
    if (!result.success) {
      return `❌ Mission failed: ${result.error}\n\nSkús to znovu alebo rozbi úlohu na menšie časti.`;
    }

    let response = `✅ **MISSION COMPLETE!**\n\n`;
    response += `📊 **Stats:**\n`;
    response += `- Tasks completed: ${result.results.length}\n`;
    response += `- Total time: ${result.totalTime.toFixed(1)} min\n`;
    response += `- Total cost: $${result.totalCost.toFixed(3)}\n\n`;

    response += `📤 **Results:**\n\n`;

    result.results.forEach((r, i) => {
      response += `**Task ${i + 1}** (${r.taskId}):\n`;
      response += `Quality: ${(r.qualityScore * 100).toFixed(0)}% | `;
      response += `Time: ${r.actualTime} min | `;
      response += `Cost: $${r.actualCost.toFixed(3)}\n\n`;

      // Show output preview (first 300 chars)
      const outputStr = typeof r.output === 'string' ? r.output : JSON.stringify(r.output, null, 2);
      const preview = outputStr.substring(0, 300);
      response += `${preview}${outputStr.length > 300 ? '...\n\n' : '\n\n'}`;
    });

    response += `📂 Full results saved to: missions/completed/${result.plan.mission.id}.json\n`;

    return response;
  }
}

// Export singleton instance
export const sp4Agent = new SP4IntegratedAgent();

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new SP4IntegratedAgent();

  (async () => {
    // Inicializácia
    await agent.initialize();

    // Test správy
    const testMessages = [
      'Ahoj, ako sa máš?',
      'KURVA, toto ma šrotuje! Všetko je v PIČI!!!',
      'Potrebujem pomôcť s kódom v JavaScripte.'
    ];

    for (const msg of testMessages) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`USER: ${msg}`);
      console.log('='.repeat(60));

      const result = await agent.processMessage(msg, 'core');

      if (result.success) {
        console.log(`\nAGENT: ${result.response}`);
        console.log(`\nMETADATA:`, JSON.stringify(result.metadata, null, 2));
      } else {
        console.error(`\nERROR: ${result.error}`);
      }

      // Pauza medzi správami
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // System status
    console.log('\n' + '='.repeat(60));
    console.log('SYSTEM STATUS:');
    console.log('='.repeat(60));
    const status = await agent.getSystemStatus();
    console.log(JSON.stringify(status, null, 2));

  })();
}
