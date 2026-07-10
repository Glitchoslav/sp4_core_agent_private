// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: modelCapabilities          │
// │  Layer: Core / Model Selection             │
// │  Role: Model capability scoring system     │
// │  API: getModelCapabilities(modelName)      │
// └─────────────────────────────────────────────┘

/**
 * 🧠 MODEL CAPABILITY MAP v1.0
 * 
 * Defines capability scores for each available model.
 * Used for intelligent model selection based on task requirements.
 * 
 * @module modelCapabilities
 */

/**
 * Model capability scores (0.0 - 1.0)
 * Higher = better at that capability
 */
export const MODEL_CAPABILITIES = {
    // 🏠 LOCAL OLLAMA MODELS
    'llama3:8b': {
        reasoning: 0.7,
        languageSK: 0.8,
        techAccuracy: 0.6,
        hallucinationRisk: 0.6,    // Higher = more prone to hallucination
        speed: 0.8,
        offline: true,
        costPerToken: 0,
        contextWindow: 8192,
        specialties: ['general', 'slovak', 'conversation']
    },

    'qwen2.5:14b': {
        reasoning: 0.85,
        languageSK: 0.7,
        techAccuracy: 0.8,
        hallucinationRisk: 0.4,
        speed: 0.6,
        offline: true,
        costPerToken: 0,
        contextWindow: 32768,
        specialties: ['reasoning', 'technical', 'analysis']
    },

    'gemma3:1b': {
        reasoning: 0.5,
        languageSK: 0.9,
        techAccuracy: 0.4,
        hallucinationRisk: 0.7,
        speed: 0.95,
        offline: true,
        costPerToken: 0,
        contextWindow: 8192,
        specialties: ['slovak', 'quick', 'lightweight']
    },

    // 🌐 CLOUD MODELS (opt-in only)
    'groq-llama3-70b': {
        reasoning: 0.9,
        languageSK: 0.7,
        techAccuracy: 0.9,
        hallucinationRisk: 0.3,
        speed: 0.95,
        offline: false,
        costPerToken: 0.0008,      // $0.80 per 1M tokens
        contextWindow: 8192,
        specialties: ['reasoning', 'technical', 'complex', 'accuracy']
    },

    'google-gemini-pro': {
        reasoning: 0.85,
        languageSK: 0.6,
        techAccuracy: 0.85,
        hallucinationRisk: 0.35,
        speed: 0.8,
        offline: false,
        costPerToken: 0.00125,     // $1.25 per 1M tokens
        contextWindow: 32768,
        specialties: ['multimodal', 'technical', 'analysis']
    }
};

/**
 * Get capability scores for a model
 * @param {string} modelName - Model identifier
 * @returns {Object|null} Capability object or null if not found
 */
export function getModelCapabilities(modelName) {
    // Normalize model name (handle variations)
    const normalized = normalizeModelName(modelName);
    return MODEL_CAPABILITIES[normalized] || null;
}

/**
 * Normalize model name to match capability map keys
 * @param {string} modelName - Raw model name
 * @returns {string} Normalized name
 */
function normalizeModelName(modelName) {
    if (!modelName) return 'llama3:8b'; // Default fallback

    const lower = modelName.toLowerCase();

    // Cloud provider prefixes
    if (lower.includes('groq') && lower.includes('70b')) return 'groq-llama3-70b';
    if (lower.includes('google') || lower.includes('gemini')) return 'google-gemini-pro';

    // Ollama local models
    if (lower.includes('qwen')) return 'qwen2.5:14b';
    if (lower.includes('gemma')) return 'gemma3:1b';
    if (lower.includes('llama3')) return 'llama3:8b';

    return modelName; // Return as-is if no match
}

/**
 * Score a model for specific task requirements
 * @param {string} modelName - Model identifier
 * @param {Object} requirements - Task requirements
 * @returns {number} Score 0.0-1.0 (higher = better fit)
 */
export function scoreModelForTask(modelName, requirements = {}) {
    const capabilities = getModelCapabilities(modelName);
    if (!capabilities) return 0;

    const {
        needsReasoning = 0.5,
        needsSlovak = 0.5,
        needsTechAccuracy = 0.5,
        avoidHallucination = 0.5,
        needsSpeed = 0.3,
        offlineOnly = false
    } = requirements;

    // Hard constraint: offline-only mode
    if (offlineOnly && !capabilities.offline) {
        return 0; // Disqualified
    }

    // Weighted score
    let score = 0;
    score += capabilities.reasoning * needsReasoning;
    score += capabilities.languageSK * needsSlovak;
    score += capabilities.techAccuracy * needsTechAccuracy;
    score += (1 - capabilities.hallucinationRisk) * avoidHallucination; // Invert hallucination risk
    score += capabilities.speed * needsSpeed;

    // Normalize to 0-1 range
    const totalWeight = needsReasoning + needsSlovak + needsTechAccuracy + avoidHallucination + needsSpeed;
    return totalWeight > 0 ? score / totalWeight : 0;
}

/**
 * Find best model for task requirements
 * @param {Object} requirements - Task requirements
 * @param {Array<string>} availableModels - Models to consider (default: all)
 * @returns {Object} { modelName, score, capabilities }
 */
export function findBestModelForTask(requirements = {}, availableModels = null) {
    const modelsToConsider = availableModels || Object.keys(MODEL_CAPABILITIES);

    let bestModel = null;
    let bestScore = -1;

    for (const modelName of modelsToConsider) {
        const score = scoreModelForTask(modelName, requirements);
        if (score > bestScore) {
            bestScore = score;
            bestModel = modelName;
        }
    }

    return {
        modelName: bestModel,
        score: bestScore,
        capabilities: getModelCapabilities(bestModel)
    };
}

/**
 * Get models by specialty
 * @param {string} specialty - Specialty type
 * @returns {Array<string>} Model names with that specialty
 */
export function getModelsBySpecialty(specialty) {
    return Object.entries(MODEL_CAPABILITIES)
        .filter(([_, caps]) => caps.specialties.includes(specialty))
        .map(([name, _]) => name);
}

/**
 * Check if model is available (offline check)
 * @param {string} modelName - Model identifier
 * @returns {boolean} True if model is local/available
 */
export function isModelAvailable(modelName) {
    const capabilities = getModelCapabilities(modelName);
    if (!capabilities) return false;

    // Local models always available (assume Ollama running)
    if (capabilities.offline) return true;

    // Cloud models require API keys (check in runtime)
    return false; // Conservative default
}
