/**
 * SP4 MEMORY HIERARCHY v1.0
 * 
 * GLITCHOSLAV = BOSS
 * Implements strict access control for memory layers.
 * 
 * PRAVIDLÁ:
 * - GLITCHOSLAV: FULL access (core.json, shadowLog, quarantine)
 * - CORE: FILTERED access (technical context only)
 * - POPICI: FILTERED access (emotional summary only)
 * - VALIDATOR: SHARED only (no persona data)
 * 
 * @module memoryHierarchy
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-21
 */

import fs from 'fs/promises';
import path from 'path';
import { MEMORY_HIERARCHY_DIR } from '../config/paths.js';
import { runtimeLog, runtimeWarn } from '../src/core/runtimeLogging.js';

const MEMORY_ROOT = MEMORY_HIERARCHY_DIR;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Initialize memory hierarchy structure
 */
async function ensureMemoryStructure() {
    await fs.mkdir(MEMORY_ROOT, { recursive: true });
    await fs.mkdir(path.join(MEMORY_ROOT, 'personas'), { recursive: true });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE MEMORY (GLITCHOSLAV ONLY) 🔒
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Load CORE memory - ONLY for Glitchoslav
 * Contains: shadowLog, quarantine, deep secrets, trauma
 * 
 * @returns {Promise<Object>} Core memory object
 * @throws {Error} If called by non-Glitchoslav persona (via saveCoreMemory)
 */
export async function loadCoreMemory() {
    await ensureMemoryStructure();

    const corePath = path.join(MEMORY_ROOT, 'core.json');

    try {
        const data = await fs.readFile(corePath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        // First time - return default structure
        const defaultCore = {
            shadowLog: [],           // Trauma, secrets, vulnerable content
            quarantine: [],          // High-intensity emotional content
            deepSecrets: [],         // User's deep personal info
            userTrauma: null,        // Trauma markers
            sacredKnowledge: [],     // Things only Glitchoslav should know
            metadata: {
                createdAt: new Date().toISOString(),
                lastAccess: null,
                accessCount: 0
            }
        };

        // Save default
        await fs.writeFile(corePath, JSON.stringify(defaultCore, null, 2), 'utf-8');
        return defaultCore;
    }
}

/**
 * Save CORE memory - ONLY Glitchoslav can write
 * 
 * @param {Object} data - Core memory data
 * @param {string} callerPersona - Persona attempting to write
 * @throws {Error} If caller is not Glitchoslav
 */
export async function saveCoreMemory(data, callerPersona) {
    if (callerPersona !== 'glitchoslav' && callerPersona !== 'glitch') {
        throw new Error(
            `🔒 ACCESS DENIED: Only Glitchoslav can write to CORE memory (caller: ${callerPersona})`
        );
    }

    await ensureMemoryStructure();

    // Update metadata
    data.metadata = {
        ...data.metadata,
        lastAccess: new Date().toISOString(),
        accessCount: (data.metadata?.accessCount || 0) + 1
    };

    const corePath = path.join(MEMORY_ROOT, 'core.json');
    await fs.writeFile(corePath, JSON.stringify(data, null, 2), 'utf-8');

    runtimeLog(`   🌀 CORE memory updated by Glitchoslav`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED MEMORY (All personas)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Load SHARED memory - accessible by ALL personas
 * Contains: SP4 manifest, technical info, neutral facts, user profile (basic)
 * 
 * @returns {Promise<Object>} Shared memory object
 */
export async function loadSharedMemory() {
    await ensureMemoryStructure();

    const sharedPath = path.join(MEMORY_ROOT, 'shared.json');

    try {
        const data = await fs.readFile(sharedPath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        // Default shared memory
        // ⚠️  ONLY PUBLIC DATA - no intimate details, no specific memories, no trauma
        // Safe: SP4 manifest, user name, language, generation, high-level preferences
        // UNSAFE: konkrétne spomienky, mená rodiny, detaily traumy → core.json ONLY
        const defaultShared = {
            sp4Context: {
                manifest: "SP4 je iskra v človeku, ktorý odmieta skapat v klietke",
                philosophy: "be real. be free.",
                vision: "AI ako spojenie človeka a jeho života",
                currentPhase: "v1.0 - Glitchoslav orchestration"
            },
            userProfile: {
                id: "kefyk",
                name: "Kefyk",
                language: "sk",
                generation: "1994",
                identity: "SP4 founder, firefighter, chaos survivor"
            },
            preferences: {
                defaultMode: "auto",
                allowVulgar: true,
                shortReplies: false
            },
            relationshipModel: {
                level: "stranger",
                metrics: {
                    interactionCount: 0,
                    deepConversations: 0,
                    ritualsCompleted: 0,
                    vulnerabilityMoments: 0
                },
                milestones: []
            },
            metadata: {
                createdAt: new Date().toISOString(),
                version: "1.0"
            }
        };

        await fs.writeFile(sharedPath, JSON.stringify(defaultShared, null, 2), 'utf-8');
        return defaultShared;
    }
}

/**
 * Save SHARED memory - all personas can write (neutral data only)
 * 
 * @param {Object} data - Shared memory data
 */
export async function saveSharedMemory(data) {
    await ensureMemoryStructure();

    const sharedPath = path.join(MEMORY_ROOT, 'shared.json');
    await fs.writeFile(sharedPath, JSON.stringify(data, null, 2), 'utf-8');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERSONA-FILTERED MEMORY (CORE, POPICI)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Load PERSONA memory - filtered view for specific persona
 * 
 * CORE sees: technical context, system queries, architecture notes
 * POPICI sees: emotional summary, recent mood, frustration triggers
 * 
 * @param {string} personaKey - Persona identifier (core, popici)
 * @returns {Promise<Object>} Filtered memory for persona
 */
export async function loadPersonaMemory(personaKey) {
    await ensureMemoryStructure();

    const personaPath = path.join(MEMORY_ROOT, 'personas', `${personaKey}.json`);

    try {
        const data = await fs.readFile(personaPath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        // Default based on persona type
        const defaultPersonaMemory = personaKey === 'core'
            ? {
                // CORE = Technical worker (structured)
                technical_context: {
                    projects: ["SP4_CORE_AGENT", "Glitchoslav orchestration"],
                    stack: ["Node.js", "Ollama", "OpenEuroLLM-Slovak", "qwen2.5:14b"],
                    constraints: {
                        offline_first: true,
                        privacy_first: true,
                        no_cloud_api: true
                    }
                },
                systemQueries: [],
                codeSnippets: [],
                architectureNotes: [],
                metadata: {
                    role: "TECHNICAL_WORKER",
                    accessLevel: "FILTERED",
                    canSee: ["shared.json", "personas/core.json"],
                    cannotSee: ["core.json", "shadowLog", "quarantine"]
                }
            }
            : {
                // POPICI = Emotional worker (structured)
                emotional_summary: {
                    baseline: "tvrdý ale milý",
                    humor_style: "krčmový, východniarsky",
                    dialect: "Eastern Slovak (šak, bo, bože)",
                    sensitivity: "stredná",
                    vulgar_allowed: true,
                    donot_touch: ["hlboké traumy (shadowLog only)", "rodina details (core.json only)"]
                },
                recentMood: 'neutral',
                frustrationTriggers: [],
                humorAttempts: [],
                slangLibrary: ["piča", "kokot", "sere ma", "nevládzem", "šak", "bo"],
                metadata: {
                    role: "EMOTIONAL_WORKER",
                    accessLevel: "FILTERED",
                    canSee: ["shared.json", "personas/popici.json"],
                    cannotSee: ["core.json", "shadowLog", "quarantine"]
                }
            };

        await fs.writeFile(personaPath, JSON.stringify(defaultPersonaMemory, null, 2), 'utf-8');
        return defaultPersonaMemory;
    }
}

/**
 * Save PERSONA memory - Glitchoslav updates filtered views for workers
 * 
 * @param {string} personaKey - Persona identifier
 * @param {Object} data - Filtered memory data
 * @param {string} callerPersona - Who is writing (should be Glitchoslav)
 */
export async function savePersonaMemory(personaKey, data, callerPersona) {
    // Only Glitchoslav should update persona views (filtering from core)
    if (callerPersona !== 'glitchoslav' && callerPersona !== 'glitch') {
        runtimeWarn(`   ⚠️  Non-Glitchoslav persona (${callerPersona}) writing to ${personaKey} memory - allowed but logged`);
    }

    await ensureMemoryStructure();

    const personaPath = path.join(MEMORY_ROOT, 'personas', `${personaKey}.json`);
    await fs.writeFile(personaPath, JSON.stringify(data, null, 2), 'utf-8');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN LOADER (Persona-aware with ACL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Load memory FOR specific persona (access control enforced)
 * 
 * ACL MATRIX:
 * ┌─────────────┬──────────┬───────────┬────────────┬────────┬──────────┐
 * │ Persona     │ core.json│ shadowLog │ quarantine │ shared │ filtered │
 * ├─────────────┼──────────┼───────────┼────────────┼────────┼──────────┤
 * │ GLITCHOSLAV │ ✅ R/W   │ ✅ FULL   │ ✅ FULL    │ ✅ YES │ ✅ YES   │
 * │ CORE        │ ❌       │ ❌        │ ❌         │ ✅ YES │ ✅ CORE  │
 * │ POPICI      │ ❌       │ ❌        │ ❌         │ ✅ YES │ ✅ POPICI│
 * │ VALIDATOR   │ ❌       │ ❌        │ ❌         │ ✅ YES │ ❌       │
 * └─────────────┴──────────┴───────────┴────────────┴────────┴──────────┘
 * 
 * @param {string} personaKey - Persona requesting memory (glitchoslav, core, popici, validator)
 * @returns {Promise<Object>} Memory object tailored for persona
 * @throws {Error} If unknown persona
 */
export async function loadMemoryForPersona(personaKey) {
    // Normalize persona key
    const normalizedKey = personaKey === 'glitch' ? 'glitchoslav' : personaKey;

    const shared = await loadSharedMemory();

    switch (normalizedKey) {
        case 'glitchoslav':
            // 🌀 FULL ACCESS - BOSS MODE
            runtimeLog('   🌀 Loading FULL memory for Glitchoslav (BOSS)');
            return {
                ...shared,
                coreMemory: await loadCoreMemory(),           // shadowLog, quarantine, secrets
                personaViews: {
                    core: await loadPersonaMemory('core'),
                    popici: await loadPersonaMemory('popici')
                },
                accessLevel: 'FULL',
                role: 'ORCHESTRATOR'
            };

        case 'core':
            // 🔥 TECHNICAL ONLY - NO SECRETS
            runtimeLog('   🔥 Loading TECHNICAL memory for CORE (worker)');
            return {
                ...shared,
                technicalContext: await loadPersonaMemory('core'),
                // ❌ NO coreMemory, NO shadowLog, NO quarantine
                accessLevel: 'FILTERED',
                role: 'TECHNICAL_WORKER'
            };

        case 'popici':
            // 💥 EMOTIONAL SUMMARY - NO SECRETS
            runtimeLog('   💥 Loading EMOTIONAL memory for POPICI (worker)');
            return {
                ...shared,
                emotionalContext: await loadPersonaMemory('popici'),
                // ❌ NO coreMemory, NO shadowLog, NO quarantine
                accessLevel: 'FILTERED',
                role: 'EMOTIONAL_WORKER'
            };

        case 'validator':
            // 🛡️ SHARED ONLY - MINIMAL ACCESS
            runtimeLog('   🛡️ Loading SHARED memory for VALIDATOR (tool)');
            return {
                ...shared,
                // ❌ NO persona data, NO core memory
                accessLevel: 'SHARED_ONLY',
                role: 'VALIDATION_TOOL'
            };

        case 'analyst':
            // 📊 SHARED + TECHNICAL (same as CORE for now)
            runtimeLog('   📊 Loading memory for ANALYST (deprecated - use CORE)');
            return {
                ...shared,
                technicalContext: await loadPersonaMemory('core'),
                accessLevel: 'FILTERED',
                role: 'ANALYST_WORKER'
            };

        default:
            throw new Error(`❌ Unknown persona: ${personaKey}`);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEGACY COMPATIBILITY (for gradual migration)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Legacy loadMemory() - for backward compatibility
 * Now routes to loadMemoryForPersona('glitchoslav') by default
 * 
 * @deprecated Use loadMemoryForPersona(personaKey) instead
 * @returns {Promise<Object>}
 */
export async function loadMemory() {
    runtimeWarn('   ⚠️  DEPRECATED: loadMemory() called without persona - defaulting to Glitchoslav');
    return await loadMemoryForPersona('glitchoslav');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HARD GUARDS (Privacy Protection)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Read deepSecrets - GLITCHOSLAV ONLY
 * 
 * @param {string} caller - Persona requesting access
 * @returns {Promise<Array>} Deep secrets array
 * @throws {Error} If caller is not Glitchoslav
 */
export async function readDeepSecrets(caller) {
    if (caller !== 'glitchoslav' && caller !== 'glitch') {
        throw new Error(
            `🔒 UNAUTHORIZED_MEMORY_READ: Only Glitchoslav can read deepSecrets (caller: ${caller})`
        );
    }

    const coreMemory = await loadCoreMemory();
    return coreMemory.deepSecrets || [];
}

/**
 * Read shadowLog - GLITCHOSLAV ONLY
 * 
 * @param {string} caller - Persona requesting access
 * @returns {Promise<Array>} Shadow log array (trauma, secrets)
 * @throws {Error} If caller is not Glitchoslav
 */
export async function readShadowLog(caller) {
    if (caller !== 'glitchoslav' && caller !== 'glitch') {
        throw new Error(
            `🔒 UNAUTHORIZED_MEMORY_READ: Only Glitchoslav can read shadowLog (caller: ${caller})`
        );
    }

    const coreMemory = await loadCoreMemory();
    return coreMemory.shadowLog || [];
}

/**
 * Read quarantine - GLITCHOSLAV ONLY
 * 
 * @param {string} caller - Persona requesting access
 * @returns {Promise<Array>} Quarantine array (high-intensity emotions)
 * @throws {Error} If caller is not Glitchoslav
 */
export async function readQuarantine(caller) {
    if (caller !== 'glitchoslav' && caller !== 'glitch') {
        throw new Error(
            `🔒 UNAUTHORIZED_MEMORY_READ: Only Glitchoslav can read quarantine (caller: ${caller})`
        );
    }

    const coreMemory = await loadCoreMemory();
    return coreMemory.quarantine || [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITY FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Check if persona has access to specific memory layer
 * 
 * @param {string} personaKey - Persona to check
 * @param {string} memoryLayer - Layer to check (core, shadowLog, quarantine, shared, filtered)
 * @returns {boolean} True if persona has access
 */
export function hasAccess(personaKey, memoryLayer) {
    const normalizedKey = personaKey === 'glitch' ? 'glitchoslav' : personaKey;

    const ACL_MATRIX = {
        glitchoslav: ['core', 'shadowLog', 'quarantine', 'shared', 'filtered'],
        core: ['shared', 'filtered'],
        popici: ['shared', 'filtered'],
        validator: ['shared'],
        analyst: ['shared', 'filtered']
    };

    return ACL_MATRIX[normalizedKey]?.includes(memoryLayer) || false;
}

/**
 * Get access level summary for persona
 * 
 * @param {string} personaKey - Persona to check
 * @returns {Object} Access summary
 */
export function getAccessSummary(personaKey) {
    const normalizedKey = personaKey === 'glitch' ? 'glitchoslav' : personaKey;

    return {
        persona: normalizedKey,
        canAccessCore: hasAccess(normalizedKey, 'core'),
        canAccessShadowLog: hasAccess(normalizedKey, 'shadowLog'),
        canAccessQuarantine: hasAccess(normalizedKey, 'quarantine'),
        canAccessShared: hasAccess(normalizedKey, 'shared'),
        canAccessFiltered: hasAccess(normalizedKey, 'filtered'),
        role: normalizedKey === 'glitchoslav' ? 'ORCHESTRATOR' :
            normalizedKey === 'validator' ? 'TOOL' : 'WORKER'
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default {
    // Primary API
    loadMemoryForPersona,

    // Core memory (Glitchoslav only)
    loadCoreMemory,
    saveCoreMemory,

    // Shared memory (all personas)
    loadSharedMemory,
    saveSharedMemory,

    // Persona memory (filtered views)
    loadPersonaMemory,
    savePersonaMemory,

    // Utilities
    hasAccess,
    getAccessSummary,

    // Legacy (deprecated)
    loadMemory
};
