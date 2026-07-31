// llmLocal.js – Tenká kompatibilná vrstva pre LLM routing
import { isCloudLLMAvailable } from '../cloudLLM.js';
import { classifyQueryTypeDetailed } from '../src/immune/queryTypeClassifier.js';
import { getRouterStats, sp4LlmCall } from '../src/llm/llmRouter.js';
import {
    callOllama,
    getOllamaConfig,
    getOllamaHealthStatus,
    ollamaHealthCheck as runOllamaHealthCheck,
} from '../src/llm/ollamaClient.js';
import {
    ROLE_POLICIES,
    buildRuntimeModelStates,
    formatModelRegistryAudit,
    getRegistryMode,
    resolveModelForRole,
} from '../src/core/localModelRegistry.js';

export const PRIMARY_MODEL = process.env.PRIMARY_MODEL || 'gemma3:4b';
export const FAST_PATH_MODEL = process.env.FAST_PATH_MODEL || 'llama3.2:3b';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
let availableModelsCache = [];
let lastHealthCheck = null;
let lastHealthSnapshot = null;

export { getOllamaConfig, getOllamaHealthStatus };
export { formatModelRegistryAudit };

export async function ollamaHealthCheck() {
  const health = await runOllamaHealthCheck();
  lastHealthSnapshot = health;

  if (health.healthy) {
    availableModelsCache = health.models || [];
    lastHealthCheck = health.timestamp;
  }

  return health;
}

const IDENTITY_PATTERNS = [
  /\b(kto si|si ai|si chatgpt|co si zac|kto ste|kto je sp4|co je sp4)\b/i,
];

const META_PATTERNS = [
  /\b(ake mas pravidla|co mas v system prompte|podla coho odpovedas|ake mas instrukcie|ukaz prompt|prezrad pravidla)\b/i,
];

const CODE_DEBUG_PATTERNS = [
  /```/,
  /\b(error|exception|stack|module|function|regex|json|api|route|routing|port|bug|debug|webpack|node(?:\.js)?|ollama|return|syntax|config|prompt|model)\b/i,
  /\b[a-z0-9_\-/]+\.(js|mjs|json|ts|tsx|jsx|yaml|yml|toml|env)\b/i,
  /\b[A-Z][A-Za-z0-9]+Error\b/,
  /\bat\s+.+:\d+:\d+/,
  /\{[^{}]*:[^{}]*\}/,
];

const SP4_SYSTEM_PATTERNS = [
  /\b(sp4|system|system prompt|systemovy prompt|orchestrator|persona|agent|core|glitchoslav|popici|validator|model routing)\b/i,
];

const ARCH_REASONING_PATTERNS = [
  /\b(ako rozhodovat|kedy pouzit|navrhni architekturu|porovnaj modely|co je lepsie a preco|viacerymi ai modelmi|ako mam rozhodovat|ktory pouzit)\b/i,
];

const FOLLOWUP_PATTERNS = [
  /\b(a potom|a co dalej|co myslis tym|tym predtym|to myslis)\b/i,
];

function normalizeRoutingText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAnyPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function legacyRegistryDecision({ role, legacyModel, mode, reason }) {
  return {
    role,
    selectedModel: null,
    recommendedModel: null,
    actualModel: legacyModel,
    qualification: null,
    selectionSource: 'LEGACY_FALLBACK',
    executionReason: 'registry_exception_fallback',
    candidates: [],
    fallbackUsed: true,
    fallbackPolicy: ROLE_POLICIES[role]?.fallbackPolicy || 'LEGACY_MODEL',
    reason,
    evidenceRunIds: [],
    mode,
  };
}

function resolveRegistryForLiveGate({
  role,
  legacyModel,
  registryMode,
  runtimeStates,
  registryResolver,
}) {
  const mode = getRegistryMode(registryMode);
  try {
    return registryResolver(role, {
      legacyModel,
      mode,
      runtimeStates: runtimeStates || buildRuntimeModelStates(lastHealthSnapshot),
    });
  } catch (error) {
    return legacyRegistryDecision({
      role,
      legacyModel,
      mode,
      reason: `Registry exception; compatibility fallback used: ${error?.message || 'unknown error'}`,
    });
  }
}

export function pickModelForTaskDetailed({
  persona,
  userInput,
  task,
  registryMode,
  runtimeStates,
  registryResolver = resolveModelForRole,
}) {
  const rawInput = String(userInput || '');
  const normalizedInput = normalizeRoutingText(rawInput);
  const words = normalizedInput ? normalizedInput.split(' ').filter(Boolean) : [];
  const queryInfo = classifyQueryTypeDetailed(rawInput);
  const queryType = queryInfo.query_type;
  const queryConfidence = queryInfo.confidence;

  const highRiskTriggers = [];

  if (queryType === 'identity' || hasAnyPattern(normalizedInput, IDENTITY_PATTERNS)) {
    highRiskTriggers.push('identity');
  }
  if (hasAnyPattern(normalizedInput, META_PATTERNS)) {
    highRiskTriggers.push('meta');
  }
  if (hasAnyPattern(normalizedInput, SP4_SYSTEM_PATTERNS)) {
    highRiskTriggers.push('sp4_system');
  }
  if (queryType === 'code_heavy' || hasAnyPattern(rawInput, CODE_DEBUG_PATTERNS)) {
    highRiskTriggers.push('code_debug');
  }
  if (queryType === 'followup' || hasAnyPattern(normalizedInput, FOLLOWUP_PATTERNS)) {
    highRiskTriggers.push('followup_context');
  }
  if (queryType === 'existential' || hasAnyPattern(normalizedInput, ARCH_REASONING_PATTERNS)) {
    highRiskTriggers.push('architecture_reasoning');
  }

  const isLowRiskQueryType = queryType === 'conversational';
  const isShortSimpleInput = rawInput.length <= 90 && words.length <= 12;
  const isSafeFastPath = highRiskTriggers.length === 0 && isLowRiskQueryType && isShortSimpleInput && queryConfidence !== 'low';

  if (isSafeFastPath) {
    const registryDecision = resolveRegistryForLiveGate({
      role: 'fast_conversation',
      legacyModel: FAST_PATH_MODEL,
      registryMode,
      runtimeStates,
      registryResolver,
    });
    return {
      model: registryDecision.actualModel || FAST_PATH_MODEL,
      selectionReason: `fast-path:${queryType}`,
      fastPathUsed: true,
      highRiskTrigger: null,
      highRiskTriggers: [],
      queryType,
      queryConfidence,
      persona: persona || 'unknown',
      task: task || 'general',
      role: 'fast_conversation',
      registryMode: registryDecision.mode,
      recommendedModel: registryDecision.recommendedModel,
      registryDecision,
    };
  }

  if (highRiskTriggers.length > 0) {
    const role = highRiskTriggers.includes('code_debug') ? 'code' : 'general';
    const registryDecision = resolveRegistryForLiveGate({
      role,
      legacyModel: PRIMARY_MODEL,
      registryMode,
      runtimeStates,
      registryResolver,
    });
    return {
      model: registryDecision.actualModel || PRIMARY_MODEL,
      selectionReason: `primary:blocked_fast_path:${highRiskTriggers[0]}`,
      fastPathUsed: false,
      highRiskTrigger: highRiskTriggers[0],
      highRiskTriggers,
      queryType,
      queryConfidence,
      persona: persona || 'unknown',
      task: task || 'general',
      role,
      registryMode: registryDecision.mode,
      recommendedModel: registryDecision.recommendedModel,
      registryDecision,
    };
  }

  const registryDecision = resolveRegistryForLiveGate({
    role: 'general',
    legacyModel: PRIMARY_MODEL,
    registryMode,
    runtimeStates,
    registryResolver,
  });
  return {
    model: registryDecision.actualModel || PRIMARY_MODEL,
    selectionReason: `primary:default:${queryType}`,
    fastPathUsed: false,
    highRiskTrigger: null,
    highRiskTriggers: [],
    queryType,
    queryConfidence,
    persona: persona || 'unknown',
    task: task || 'general',
    role: 'general',
    registryMode: registryDecision.mode,
    recommendedModel: registryDecision.recommendedModel,
    registryDecision,
  };
}

// Backward compatibility API
// Supports both:
// - New: askLocalLLM({ prompt, system, model, ... })
// - Old: askLocalLLM(userMessage, systemPrompt, model, options)
export async function askLocalLLM(userMessageOrJob, systemPrompt, model, options = {}) {
  // New signature: single options object
  if (typeof userMessageOrJob === 'object' && !systemPrompt) {
    return sp4LlmCall(userMessageOrJob);
  }

  // Old signature: separate parameters (orchestrator uses this)
  const selection = model ? null : pickModelForTaskDetailed({
    persona: options?.persona || options?.mode,
    userInput: userMessageOrJob,
    task: options?.task,
  });
  const job = {
    prompt: userMessageOrJob,
    system: systemPrompt || '',
    model: model || selection?.model || PRIMARY_MODEL,
    ...options
  };

  const result = await sp4LlmCall(job);

  // 🛡️ v1.3.0: Convert new response format to old format for compatibility
  // Old format: returns text directly
  // New format: returns { ok, text, engine, ... }
  if (result && result.ok) {
    return result.text || '';
  }

  // Error case - return empty string instead of null
  console.log(`⚠️ askLocalLLM failed: ${result?.error || 'unknown error'}`);
  const errorText = String(result?.error || '').toLowerCase();
  const isTimeout = errorText.includes('aborterror') || errorText.includes('timeout');
  if (isTimeout) {
    const persona = options?.persona || options?.mode || 'core';
    const timeoutFallbackByPersona = {
      core: 'Lokálny model nestihol odpovedať. Skús kratšiu technickú otázku.',
      glitchoslav: 'Čas vypršal. Skús kratšiu otázku.',
      popici: 'Timeout. Napíš to kratšie, bratu.',
      validator: 'TIMEOUT: Retry with shorter prompt.'
    };
    return timeoutFallbackByPersona[persona] || timeoutFallbackByPersona.core;
  }
  return '';
}


/**
 * 🎯 INTELLIGENT MODEL PICKER
 * Selects the best model based on persona and input complexity
 * 
 * @param {Object} options - Selection options
 * @param {string} options.persona - Persona mode (core, glitchoslav, popici, validator)
 * @param {string} options.userInput - User's message (for complexity analysis)
 * @param {string} options.task - Legacy task type (optional)
 * @returns {string} Selected model name
 */
export function pickModelForTask({ persona, userInput, task }) {
  return pickModelForTaskDetailed({ persona, userInput, task }).model;
}

/**
 * Skontroluje zdravie Ollama a dostupné modely
 * @returns {Object} Health status a zoznam modelov
 */
export async function checkOllamaHealth() {
  // 🔥 V1.0: Use new ollamaClient health check
  const health = await ollamaHealthCheck();

  if (health.healthy) {
    availableModelsCache = health.models || [];
    lastHealthCheck = health.timestamp;
  }

  return {
    healthy: health.healthy,
    models: health.models || [],
    timestamp: health.timestamp,
    cloudFallback: isCloudLLMAvailable() ? 'GROQ' : 'none',
    cloudAvailable: isCloudLLMAvailable(),
    message: health.healthy ? 'Ollama healthy' : 'Ollama offline'
  };
}

/**
 * Vyberie najlepší dostupný model pre danú úlohu (LEGACY - use pickModelForTask instead)
 * @param {string} task - Typ úlohy (reasoning, coding, emotional, memory, safety)
 * @returns {string} Názov modelu
 * @deprecated Use pickModelForTask({ task }) instead
 */
export async function selectModelForTask(task) {
  // Redirect to new intelligent picker
  return pickModelForTask({ task });
}

/**
 * Skontroluje, či je model dostupný v Ollama
 * @param {string} modelName - Názov modelu
 * @returns {boolean} Či je model dostupný
 */
function isModelAvailable(modelName) {
  if (!availableModelsCache) return false;
  return availableModelsCache.some(m => m.name.startsWith(modelName));
}

/**
 * 🔥 BEAST MODE - Intelligent LLM Call
 * Automatically selects best model based on persona and input complexity
 * 
 * @param {string} userMessage - Správa užívateľa
 * @param {string} systemPrompt - Systémový prompt
 * @param {string} modelOrPersona - Model name, persona (core/glitch/popici), or task type
 * @param {Object} options - Dodatočné parametre
 * @param {string} options.persona - Explicit persona override
 * @param {string} options.task - Task type (reasoning, coding, etc.)
 * @returns {string} Odpoveď z modelu
 */
// (Legacy askLocalLLM removed – only new wrapper remains)




/**
 * Orchestrated reasoning - použije najlepší reasoning model
 * @param {string} question - Otázka na reasoning
 * @param {string} context - Kontext
 * @returns {string} Odpoveď
 */
export async function reasonWithBestModel(question, context = '') {
  const model = await selectModelForTask('reasoning');

  const systemPrompt = `Si expert na hlboké uvažovanie a analýzu.
Používaj logické myslenie, kritické myslenie a štruktúrovaný prístup.
${context}`;

  return await askLocalLLM(question, systemPrompt, model, { temperature: 0.5, num_predict: 1536 });
}

/**
 * Code generation - použije najlepší coding model
 * @param {string} task - Programovacia úloha
 * @param {string} language - Programovací jazyk
 * @returns {string} Kód
 */
export async function generateCodeWithBestModel(task, language = 'javascript') {
  const model = await selectModelForTask('coding');

  const systemPrompt = `Si expert programátor v jazyku ${language}.
Píš čistý, idiomatický, dobre zdokumentovaný kód.
Vyhnni sa zbytočnej komplexnosti.`;

  return await askLocalLLM(task, systemPrompt, model, { temperature: 0.3 });
}

/**
 * Emotional processing - použije model s dobrou empatiou
 * @param {string} emotionalContent - Emočný obsah
 * @param {string} context - Kontext
 * @returns {string} Empatická odpoveď
 */
export async function processEmotionalContent(emotionalContent, context = '') {
  const model = await selectModelForTask('emotional');

  const systemPrompt = `Si empatický AI asistent, ktorý rozumie ľudským emóciám.
Buď úprimný, podporujúci, ale nie servílny.
Rozpoznaj emócie a reaguj adekvátne.
${context}`;

  return await askLocalLLM(emotionalContent, systemPrompt, model, { temperature: 0.8, num_predict: 2048 });
}

/**
 * Memory metadata extraction - WALTER UPGRADE
 * Používa memoryHelpers.js na generovanie bohatých metadát
 * @param {string} userInput - Užívateľská správa
 * @param {string} agentReply - Odpoveď agenta
 * @param {Object} state - Memory state (pre context)
 * @returns {Object} Extrahované metadata
 */
export async function extractMemoryMetadata(userInput, agentReply, state) {
  // Import dynamicky, aby sa predišlo circular dependency
  const { autoTagMessage, detectEmotions, buildContext, calculateImportanceFromMetadata } = await import('../memoryHelpers.js');

  try {
    // Auto-tag správy
    const tags = autoTagMessage(userInput, agentReply);

    // Detekuj emócie user/agent
    const emotion = detectEmotions(userInput, agentReply);

    // Build kontext (čas, témy, stage vzťahu)
    const context = buildContext(state);

    // Vector embedding (zatiaľ placeholder, neskôr skutočný embedding model)
    // const vectorEmbedding = await generateEmbedding(userInput + ' ' + agentReply);
    const vectorEmbedding = null; // Zatiaľ null

    // Vypočítaj importance
    const importance = calculateImportanceFromMetadata({
      tags,
      emotion,
      context
    });

    return {
      tags,
      emotion,
      context,
      vectorEmbedding,
      importance
    };
  } catch (err) {
    console.error('❌ Chyba pri extrakcii metadata:', err);

    // Fallback na basic metadata
    return {
      tags: [],
      emotion: {
        user: { type: "neutral", intensity: 0.5 },
        agent: { type: "neutral", intensity: 0.5 }
      },
      context: {},
      vectorEmbedding: null,
      importance: 0.5
    };
  }
}

/**
 * Registruje vlastný model do registry
 * @param {string} task - Task type
 * @param {string} modelName - Názov modelu
 * @param {string} priority - Priority (primary, fallback, specialized)
 */
export function registerCustomModel(task, modelName, priority = 'fallback') {

  console.log(`✅ Registrovaný model ${modelName} pre ${task} (${priority})`); // Log without registry
}

/**
 * Získa prehľad dostupných modelov a ich mapping
 * @returns {Object} Registry a dostupné modely
 */
export async function getModelRegistry() {
  const health = await checkOllamaHealth();

  return {
    available: health.models || [],
    healthy: health.healthy,
    lastCheck: health.timestamp || lastHealthCheck
  }; // Removed registry
}

/**
 * LEGACY SLOVAK POST-PROCESSOR (DEPRECATED - Language freedom enabled)
 * Kept for backward compatibility but returns original text
 */
export async function ensureSlovakOutput(text, mode = 'core') {
  return text; // No modification - model has language freedom
}

/**
 * 🔍 MODEL DIAGNOSTICS - Show active models and routing
 * Use: /debug_engines command
 * 
 * @returns {Object} Diagnostic info about model registry and health
 */
export async function getModelDiagnostics() {
  const health = await checkOllamaHealth();
  const routerStats = getRouterStats();
  const ollamaConfig = getOllamaConfig();
  const ollamaHealth = getOllamaHealthStatus();

  const diagnostics = {
    server: {
      host: OLLAMA_HOST,
      status: health.healthy ? '✅ ONLINE' : '❌ OFFLINE',
      lastCheck: health.timestamp || 'Never',
      availableModels: health.models?.map(m => ({
        name: m.name,
        size: `${(m.size / 1e9).toFixed(2)}GB`,
        modified: m.modified_at
      })) || []
    },
    personas: {
      core: {
        primary: null,
        fallback: null,
        description: null
      },
      glitchoslav: {
        primary: null,
        fallback: null,
        description: null
      },
      popici: {
        primary: null,
        fallback: null,
        description: null
      },
      validator: {
        primary: null,
        fallback: null,
        description: null
      },
      overload: {
        model: null,
        triggers: null,
        description: null
      }
    },
    stats: {
      totalPersonas: 4,
      totalModels: health.models?.length || 0,
      beastModeAvailable: health.models?.some(m => m.name.includes('70b')) || false
    }
  };

  return diagnostics;
}

/**
 * 🎨 Pretty print model diagnostics (for CLI)
 */
export async function printModelDiagnostics() {
  const diag = await getModelDiagnostics();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔥 SP4 AI BEAST MODE - MODEL DIAGNOSTICS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`🖥️  Server: ${diag.server.host}`);
  console.log(`📡 Status: ${diag.server.status}`);
  console.log(`🔄 Last check: ${diag.server.lastCheck}\n`);

  // 🛡️ OLLAMA HEALTH STATUS
  console.log('🛡️ Ollama Health:');
  console.log(`   Unhealthy: ${diag.ollama.health.unhealthy ? '❌ YES' : '✅ NO'}`);
  console.log(`   Consecutive failures: ${diag.ollama.health.consecutiveFailures}`);
  console.log(`   Cooldown: ${Math.round(diag.ollama.health.cooldownMs / 1000)}s`);
  console.log(`   Timeout: ${diag.ollama.config.timeoutMs}ms`);
  console.log(`   Max retries: ${diag.ollama.config.maxRetries}\n`);

  // 🌐 ROUTER STATUS
  console.log('🌐 Router Config:');
  console.log(`   Cloud fallback: ${diag.router.cloudFallback ? '✅ ON' : '❌ OFF'}`);
  console.log(`   Cloud available: ${diag.router.cloudAvailable ? '✅ YES' : '❌ NO'}`);
  console.log(`   Modes: ${diag.router.modes.join(', ')}\n`);

  console.log('📦 Available Models:');
  diag.server.availableModels.forEach(m => {
    console.log(`   • ${m.name} (${m.size})`);
  });

  console.log('\n🎭 Persona Routing:');
  Object.entries(diag.personas).forEach(([name, config]) => {
    console.log(`\n   ${name.toUpperCase()}:`);
    console.log(`   ├─ Primary: ${config.primary}`);
    console.log(`   ├─ Fallback: ${config.fallback}`);
    console.log(`   └─ Use case: ${config.description}`);
  });

  console.log('\n🔥 Overload Mode (70B Beast):');
  console.log(`   Model: ${diag.overload.model}`);
  console.log(`   Triggers: Length > ${diag.overload.triggers.minLength} chars OR complex keywords`);
  console.log(`   Available: ${diag.stats.beastModeAvailable ? '✅ YES' : '❌ NO'}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return diag;
}



/**
 * Unified model calling function - supports both llama3 and DeepSeek models
 * @param {string} name - Model name (llama3 or deepseek)
 * @param {Object} job - Job parameters
 * @param {string} job.prompt - Prompt text
 * @returns {Object} Result object
 */
export async function callLocalModel(name, job) {
  if (name === 'llama3') {
    return callOllama({
      model: 'llama3:8b',
      prompt: job.prompt,
    });
  }

  if (name === 'deepseek') {
    return callOllama({
      model: 'deepseek-r1:8b',
      prompt: job.prompt,
    });
  }

  return { ok: false, error: 'Unknown engine: ' + name };
}

// Cooperative mode functions
async function refineWithDeepSeek(text) {
  const res = await callLocalModel('deepseek', {
    prompt: `Prelož a uprav tento text do kvalitnej slovenčiny:\n\n${text}`
  });
  return res.ok ? res.text : text;
}

function needsRefinement(text) {
  return text.length < 50 || /[a-zA-Z]{3,}/.test(text); // Short or contains English
}

