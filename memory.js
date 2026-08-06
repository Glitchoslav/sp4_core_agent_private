// memory.js – Živá pamäť SP4
// Ukladá profil, poznámky, log, onboarding stav
// v0.8.7: SP4 manifest integration - long-term facts

import fs from "fs/promises";
import { DATA_DIR, MEMORY_FILE, QUARANTINE_FILE } from "./config/paths.js";
import { runtimeDebug } from "./src/core/runtimeLogging.js";
import { SP4_VERSION } from "./src/version.js";
import { SP4_CORE_FACTS } from "./src/core/sp4Manifest.js";
import { assessMemoryContamination, auditMemoryState } from "./src/runtime/memoryHygiene.js";


const DEFAULT_MEMORY = {
  userProfile: {
    id: "kefyk",
    name: "Kefyk",
    language: "sk",
    style: "popici-filozof",
    generation: "1994",
    identity: "SP4 founder, firefighter, chaos survivor",
    tags: ["SP4", "firefighter", "creator", "rebel"],
    createdAt: new Date().toISOString()
  },
  sp4Context: {
    manifest: "SP4 je iskra v človeku, ktorý odmieta skapat v klietke",
    philosophy: "be real. be free.",
    vision: "AI ako spojenie človeka a jeho života",
    currentPhase: `V${SP4_VERSION} - aktívny vývoj`
  },
  preferences: {
    defaultMode: "core",
    maxLogEntries: 500,
    shortReplies: false,
    allowVulgar: true
  },
  notes: [],
  // V0.3.1 → nová pamäťová architektúra (BAD Labs: psychologická + temná vrstva)
  // WALTER UPGRADE: rawMemory teraz s metadátami
  // každý záznam: { ts, mode, input, reply, metadata: { tags, emotion, context, vectorEmbedding, importance } }
  rawMemory: [],           // nahradilo log - surový vstup/výstup s metadátami

  episodicMemory: {        // epizodická pamäť
    daily: {},             // denné zhrnutia { "YYYY-MM-DD": { date, entryCount, topics, emotionalProfile, keyMoments, summary, consolidatedAt } }
    weekly: {},            // týždenné { "YYYY-Www": { weekKey, days, topics, emotionalTrend, summary, consolidatedAt } }
    chapters: []           // veľké periódy/zmeny
  },

  semanticMemory: {        // sémantická pamäť - koncepty, vzory (WALTER UPGRADE)
    beliefs: [],           // { belief, confidence, sources, updatedAt }
    concepts: [],          // { concept, definition, relatedTopics, frequency }
    relationships: [],     // { entity1, entity2, relationType, strength }
    selfConcept: {         // Sebakoncept agenta
      coreTraits: [],      // ["empathetic", "direct", "practical"]
      values: [],          // ["privacy", "freedom", "authenticity"]
      evolution: []        // Timeline zmien identity
    },
    // 🔥 v0.8.7: SP4 CORE FACTS - long-term background knowledge
    sp4CoreFacts: SP4_CORE_FACTS || []  // vždy prítomné fakty o SP4 identity
  },
  relationshipModel: {     // 5-stupňový model vzťahu (nahradilo ourBond)
    level: "stranger",     // stranger→acquaintance→companion→confidant→symbiote
    metrics: {
      interactionCount: 0,
      deepConversations: 0,
      ritualsCompleted: 0,
      vulnerabilityMoments: 0
    },
    milestones: []         // kľúčové momenty vo vzťahu
  },
  goals: [],               // 🎯 v0.8.6.9 - Goals tracking (goalsModel.js)
  shadowLog: [],           // temná vrstva - zraniteľný obsah (później šifrovaný)
  seeds: [],               // kľúčové momenty (z memoryLayers.js)

  // 🔥 v1.0 MEMORY SYSTEM UPGRADE
  archivedMemory: [],      // archivované low-importance memories

  metaReflection: {        // AI sebareflexia
    lastSelfAudit: null,
    lastConsolidation: null,  // v1.0: timestamp of last consolidation
    pendingArchival: [],      // v1.0: timestamps flagged for archival
    pendingPruning: [],       // v1.0: timestamps flagged for pruning
    notes: [],             // ako sa AI zmenil, čo si všimol
    userFeedback: []       // spätná väzba na zmeny
  },
  // Legacy (dočasne zachované pre spätnú kompatibilitu)
  emotionalContext: {
    currentMood: "determined",
    energyLevel: 7,
    lastSupport: null
  },
  onboarding: {
    stage: 0,
    completed: false,
    discoveries: {}
  }
};

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function loadMemory() {
  await ensureDataDir();
  let memoryFileRead = false;
  try {
    const raw = await fs.readFile(MEMORY_FILE, "utf-8");
    memoryFileRead = true;
    const mem = JSON.parse(raw);

    // V0.3.1 migrácia: log → rawMemory, ourBond → relationshipModel
    if (mem.log && !mem.rawMemory) {
      mem.rawMemory = mem.log;
      delete mem.log;
    }

    // 🔥 v1.4.2: Migrácia array → object structure { log: [], stats: {} }
    if (Array.isArray(mem.rawMemory)) {
      mem.rawMemory = {
        log: mem.rawMemory, // Starý array sa stáva .log property
        stats: {
          totalInteractions: mem.rawMemory.length
        }
      };
    }

    // V0.6 canonical structure: relationship instead of relationshipModel
    if (!mem.relationship && mem.relationshipModel) {
      mem.relationship = {
        stage: mem.relationshipModel.level,
        metrics: { ...mem.relationshipModel.metrics },
        milestones: mem.relationshipModel.milestones || []
      };
    }
    if (!mem.relationship) {
      mem.relationship = {
        stage: 'stranger',
        metrics: {
          interactionCount: 0,
          deepConversations: 0,
          ritualsCompleted: 0,
          vulnerabilityMoments: 0
        },
        milestones: []
      };
    }
    if (mem.ourBond && !mem.relationshipModel) {
      mem.relationshipModel = {
        level: "acquaintance", // už sme sa stretli
        metrics: {
          interactionCount: mem.log?.length || 0,
          deepConversations: 0,
          ritualsCompleted: 0,
          vulnerabilityMoments: 0
        },
        milestones: mem.ourBond.sharedExperiences || []
      };
      delete mem.ourBond;
    }

    // pridaj chýbajúce štruktúry (WALTER UPGRADE)
    if (!mem.episodicMemory) mem.episodicMemory = { daily: {}, weekly: {}, chapters: [] };
    if (!mem.semanticMemory) {
      mem.semanticMemory = {
        beliefs: [],
        concepts: [],
        relationships: [],
        selfConcept: { coreTraits: [], values: [], evolution: [] }
      };
    }
    // Pridaj selfConcept ak chýba
    if (!mem.semanticMemory.selfConcept) {
      mem.semanticMemory.selfConcept = { coreTraits: [], values: [], evolution: [] };
    }
    if (!mem.shadowLog) mem.shadowLog = [];
    if (!mem.seeds) mem.seeds = [];
    if (!mem.metaReflection) mem.metaReflection = { lastSelfAudit: null, notes: [], userFeedback: [] };

    // 🔥 v1.4.2: Ensure rawMemory.stats.totalInteractions is synced with log length
    if (!mem.rawMemory) mem.rawMemory = { log: [], stats: {} };
    if (!mem.rawMemory.log) mem.rawMemory.log = [];
    if (!mem.rawMemory.stats) mem.rawMemory.stats = {};
    mem.rawMemory.stats.totalInteractions = mem.rawMemory.log.length;

    const auditResult = auditMemoryState(mem);
    if (auditResult.changed) {
      await saveMemory(auditResult.memory);
    }

    return mem;
  } catch (error) {
    if (!memoryFileRead && error?.code === "ENOENT") {
      // prvý štart → použijeme default
      return JSON.parse(JSON.stringify(DEFAULT_MEMORY));
    }

    console.error("CRITICAL: Failed to load memory file:", MEMORY_FILE, error);
    throw error;
  }
}

export async function saveMemory(mem) {
  await ensureDataDir();
  await fs.writeFile(MEMORY_FILE, JSON.stringify(mem, null, 2), "utf-8");
}

// ──────────────────────────────
// Poznámky a log
// ──────────────────────────────

export async function addNote(text) {
  const mem = await loadMemory();
  mem.notes.push({
    id: `note-${Date.now()}`,
    text,
    createdAt: new Date().toISOString()
  });
  await saveMemory(mem);
}

// 🔥 v1.5.0 MEMORY FIX: Strip pipeline debug fields before long-term storage
function stripMetaDebugFields(meta) {
  if (!meta || typeof meta !== 'object') return {};
  const compact = { ...meta };

  // immuneVerdict: 113 kB → ponechaj len 3 polia
  if (compact.immuneVerdict && typeof compact.immuneVerdict === 'object') {
    const iv = compact.immuneVerdict;
    compact.immuneVerdict = {
      pass: iv.pass,
      severity: iv.severity,
      reason_codes: iv.reason_codes || iv.reasonCodes || iv.reasons || []
    };
  }
  // execution: 53 kB → debug pipeline data, do pamäte nepatrí
  delete compact.execution;

  // emotionalAnalysis: 42 kB → len summary; zachovaj oba known shapes
  if (compact.emotionalAnalysis && typeof compact.emotionalAnalysis === 'object') {
    const ea = compact.emotionalAnalysis;
    compact.emotionalAnalysis = {
      // shape A: user/agent
      user: ea.user ? { type: ea.user.type, intensity: ea.user.intensity } : undefined,
      agent: ea.agent ? { type: ea.agent.type, intensity: ea.agent.intensity } : undefined,
      // shape B: flat
      dominantEmotion: ea.dominantEmotion,
      intensity: ea.intensity,
      level: ea.level,
      action: ea.action
    };
    // uprac undefined kľúče
    Object.keys(compact.emotionalAnalysis).forEach(
      k => compact.emotionalAnalysis[k] === undefined && delete compact.emotionalAnalysis[k]
    );
  }
  // memoryContext: 29 kB → redundantné
  delete compact.memoryContext;

  // pipeline-interné príznaky nepatria do long-term storage
  delete compact.skipMemoryWrite;
  delete compact.memoryWriteBlocked;
  delete compact.memoryWriteBlockReason;
  delete compact.contaminatedMemoryIgnored;

  return compact;
}

export async function addLogEntry(input, reply, mode = "core", metadata = null) {
  // 🔥 v0.11.2 LAJFHEK 9: Normalize text (remove hidden chars, Unicode spaces)
  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .normalize('NFC')  // Canonical decomposition + composition (fix diacritics)
      .replace(/\s+/g, ' ')  // Collapse multiple spaces
      .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Remove zero-width spaces
      .trim();
  };

  const normalizedInput = normalizeText(input);
  const normalizedReply = normalizeText(reply);

  // 🔥 v1.5.0 MEMORY FIX: Bucket/test run skip
  if (metadata?.skipMemoryWrite === true) {
    return { written: false, blockReason: 'skipMemoryWrite', contaminated: false };
  }

  const mem = await loadMemory();

  // V0.6: Use canonical rawMemory.log[] structure
  if (!mem.rawMemory) mem.rawMemory = { log: [], stats: {} };
  if (!mem.rawMemory.log) mem.rawMemory.log = [];

  // V0.4 WALTER UPGRADE: rawMemory with full metadata from memoryHelpers.js
  // v1.0 UPGRADE: Enhanced metadata with importance, tags, reasonKept, lastUsed
  const enrichedMetadata = metadata || {
    tags: [],            // autoTagMessage() alebo manual
    emotion: {           // detectEmotions()
      user: { type: "neutral", intensity: 0.5 },
      agent: { type: "neutral", intensity: 0.5 }
    },
    context: {},         // buildContext()
    vectorEmbedding: null, // generateEmbedding() (zatiaľ null)
    importance: 0.5,      // calculateImportance()
    // v1.0 NEW FIELDS:
    lastUsed: new Date().toISOString(),
    reasonKept: 'standard'  // default reason
  };

  const memoryDecision = assessMemoryContamination({
    input: normalizedInput,
    reply: normalizedReply,
    metadata: enrichedMetadata
  });

  if (memoryDecision.blocked) {
    return {
      written: false,
      blockReason: memoryDecision.reason,
      contaminated: memoryDecision.contaminated === true,
    };
  }

  // 🔥 v1.5.0 MEMORY FIX: Dedup — nezapisuj ak rovnaký input+reply je v posledných 50 záznamoch
  const recentWindow = mem.rawMemory.log.slice(-50);
  const isDupe = recentWindow.some(
    e => String(e.input || '').trim() === normalizedInput &&
      String(e.reply || '').trim() === normalizedReply
  );
  if (isDupe) {
    return { written: false, blockReason: 'dedup', contaminated: false };
  }

  mem.rawMemory.log.push({
    ts: new Date().toISOString(),
    mode,
    input: normalizedInput,
    reply: normalizedReply,
    metadata: stripMetaDebugFields(enrichedMetadata)
  });

  const max = mem.preferences?.maxLogEntries ?? 500;
  if (mem.rawMemory.log.length > max) {
    mem.rawMemory.log = mem.rawMemory.log.slice(-max);
  }

  // 🔥 v1.4.2: Update totalInteractions counter from actual log length
  if (!mem.rawMemory.stats) mem.rawMemory.stats = {};
  mem.rawMemory.stats.totalInteractions = mem.rawMemory.log.length;

  // 🔥 v1.4.2: Debug log path (only in SP4_DEBUG mode)
  runtimeDebug(`   💾 Memory write path: ${MEMORY_FILE}`);
  runtimeDebug(`   💾 Total interactions after write: ${mem.rawMemory.stats.totalInteractions}`);

  // inkrementuj metriky vzťahu (canonical + backward compatibility)
  if (mem.relationship?.metrics) {
    mem.relationship.metrics.interactionCount++;
  } else if (mem.relationshipModel?.metrics) {
    mem.relationshipModel.metrics.interactionCount++;
  }

  await saveMemory(mem);

  return {
    written: true,
    blockReason: null,
    contaminated: false,
  };
}

// ──────────────────────────────
// Profil užívateľa
// ──────────────────────────────

export async function getProfileSummary() {
  const mem = await loadMemory();
  const { userProfile, notes, sp4Context } = mem;

  const lastNotes = notes.slice(-5).map(n => "- " + n.text).join("\n");
  return `
[MENO]: ${userProfile.name}
[IDENTITA]: ${userProfile.identity}
[ŠTÝL]: ${userProfile.style}
[TAGY]: ${userProfile.tags.join(", ")}

[SP4 KONTEXT]:
- Filozofia: ${sp4Context.philosophy}
- Fáza: ${sp4Context.currentPhase}

[POSLEDNÉ POZNÁMKY]:
${lastNotes || "- (nič zatiaľ)"}
`.trim();
}

export async function updateUserProfile(fields = {}) {
  const mem = await loadMemory();
  mem.userProfile = {
    ...mem.userProfile,
    ...fields
  };
  await saveMemory(mem);
}

export async function updateEmotionalContext(fields = {}) {
  const mem = await loadMemory();
  mem.emotionalContext = {
    ...mem.emotionalContext,
    ...fields,
    lastUpdate: new Date().toISOString()
  };
  await saveMemory(mem);
}

// ──────────────────────────────
// Onboarding / spovednica
// ──────────────────────────────

export async function getOnboardingState() {
  const mem = await loadMemory();
  if (!mem.onboarding) {
    mem.onboarding = { stage: 0, completed: false, discoveries: {} };
    await saveMemory(mem);
  }
  return mem.onboarding;
}

export async function setOnboardingState(newState) {
  const mem = await loadMemory();
  mem.onboarding = {
    ...mem.onboarding,
    ...newState
  };
  await saveMemory(mem);
}

export async function recordDiscovery(key, value) {
  const mem = await loadMemory();
  if (!mem.onboarding.discoveries) {
    mem.onboarding.discoveries = {};
  }
  mem.onboarding.discoveries[key] = {
    value,
    discoveredAt: new Date().toISOString()
  };
  await saveMemory(mem);
}

export async function appendNoteFromOnboarding(text, stageIndex) {
  // špeciálna poznámka označená ako onboarding
  const mem = await loadMemory();
  mem.notes.push({
    id: `onb-${Date.now()}`,
    text,
    createdAt: new Date().toISOString(),
    source: "onboarding",
    stage: stageIndex
  });
  await saveMemory(mem);
}

// ──────────────────────────────
// V0.3.1 - Psychologická vrstva (BAD Labs)
// ──────────────────────────────

/** 
 * Pridá záznam do temnej vrstvy (shadow log)
 * Pre zraniteľný obsah, traumy, spúšťače
 */
export async function addToShadowLog(text) {
  const mem = await loadMemory();
  mem.shadowLog.push({
    id: `shadow-${Date.now()}`,
    text,
    createdAt: new Date().toISOString(),
    // TODO V0.4: encrypted: true + crypto šifrovanie
  });

  // detekcia zraniteľnosti → inkrementuj metriku
  mem.relationshipModel.metrics.vulnerabilityMoments++;

  await saveMemory(mem);
}

/**
 * Inkrementuj metriku vzťahu (rituály, hlboké konverzácie)
 */
export async function incrementRelationshipMetric(metricName) {
  const mem = await loadMemory();
  if (mem.relationshipModel.metrics[metricName] !== undefined) {
    mem.relationshipModel.metrics[metricName]++;

    // kontrola progresu stupňa vzťahu
    const { interactionCount, deepConversations, ritualsCompleted } = mem.relationshipModel.metrics;

    if (interactionCount >= 50 && deepConversations >= 5 && mem.relationshipModel.level === "stranger") {
      mem.relationshipModel.level = "acquaintance";
      mem.relationshipModel.milestones.push({
        level: "acquaintance",
        reachedAt: new Date().toISOString(),
        note: "Prešli sme zo stranger na acquaintance"
      });
    }

    if (interactionCount >= 100 && ritualsCompleted >= 10 && mem.relationshipModel.level === "acquaintance") {
      mem.relationshipModel.level = "companion";
      mem.relationshipModel.milestones.push({
        level: "companion",
        reachedAt: new Date().toISOString(),
        note: "Vzťah prerástol do companion - pravidelné používanie rituálov"
      });
    }

    // TODO: confidant, symbiote úrovne s prísnejšími podmienkami
  }
  await saveMemory(mem);
}

/**
 * Pridá AI sebareflexiu (meta-reflexia)
 */
export async function addMetaReflection(note) {
  const mem = await loadMemory();
  mem.metaReflection.notes.push({
    ts: new Date().toISOString(),
    note
  });
  mem.metaReflection.lastSelfAudit = new Date().toISOString();
  await saveMemory(mem);
}

/**
 * Uloží užívateľovu spätnú väzbu na AI zmenu
 */
export async function addUserFeedbackOnAI(feedback) {
  const mem = await loadMemory();
  mem.metaReflection.userFeedback.push({
    ts: new Date().toISOString(),
    feedback
  });
  await saveMemory(mem);
}

// ──────────────────────────────
// Summary – rýchly prehľad pre /status
// ──────────────────────────────

export async function getSummary() {
  const mem = await loadMemory();
  return {
    interactions:
      mem?.relationshipModel?.metrics?.interactionCount
      ?? mem?.rawMemory?.length
      ?? 0,
    relationshipLevel:
      mem?.relationshipModel?.level
      ?? 'stranger',
  };
}

// ──────────────────────────────
// V0.3.1 - Memory Quarantine (Emotional Stability)
// ──────────────────────────────

/**
 * Karanténa pamäte pre vysoko emočný obsah
 * Izoluje nebezpečne emočný obsah s kontrolovaným prístupom
 */


/**
 * Inicializuje quarantine storage
 */
async function ensureQuarantine() {
  await ensureDataDir();
  try {
    await fs.access(QUARANTINE_FILE);
  } catch {
    await fs.writeFile(QUARANTINE_FILE, JSON.stringify({
      items: [],
      metadata: {
        createdAt: new Date().toISOString(),
        totalQuarantined: 0
      }
    }, null, 2), "utf-8");
  }
}

/**
 * Pridá vysoko emočný obsah do karantény
 * @param {string} text - Pôvodný text
 * @param {number} intensity - Emocionálna intenzita (0-1)
 * @param {Object} analysis - Analýza z emotionalProcessor
 */
export async function quarantineEmotionalContent(text, intensity, analysis = {}) {
  await ensureQuarantine();

  const data = JSON.parse(await fs.readFile(QUARANTINE_FILE, "utf-8"));

  data.items.push({
    id: `quarantine-${Date.now()}`,
    text,
    intensity,
    analysis,
    quarantinedAt: new Date().toISOString(),
    accessCount: 0,
    released: false
  });

  data.metadata.totalQuarantined++;

  await fs.writeFile(QUARANTINE_FILE, JSON.stringify(data, null, 2), "utf-8");

  console.log(`🔒 Karanténa: obsah s intenzitou ${intensity.toFixed(2)} izolovaný`);
}

/**
 * Získa obsah z karantény s tlmením (dampening)
 * @param {string} id - ID karanténového záznamu
 * @returns {Object} Tlmený obsah
 */
export async function getQuarantinedContent(id) {
  await ensureQuarantine();

  const data = JSON.parse(await fs.readFile(QUARANTINE_FILE, "utf-8"));
  const item = data.items.find(i => i.id === id);

  if (!item) {
    return null;
  }

  // Inkrementuj počítadlo prístupov
  item.accessCount++;
  await fs.writeFile(QUARANTINE_FILE, JSON.stringify(data, null, 2), "utf-8");

  // Aplikuj tlmenie - pridaj kontext a perspektívu
  const dampenedText = `
[⚠️ OBSAH S VYSOKOU EMOČNOU INTENZITOU]
[Pôvodná intenzita: ${item.intensity.toFixed(2)}]
[Čas karantény: ${item.quarantinedAt}]

${item.text}

[💡 PERSPEKTÍVA]
Tento obsah bol vytvorený v momente vysokej emocionálnej intenzity.
Emócie sú dočasné. Fakty zostávajú.
Čo z toho je stále relevantné teraz?
  `.trim();

  return {
    id: item.id,
    original: item.text,
    dampened: dampenedText,
    intensity: item.intensity,
    accessCount: item.accessCount,
    quarantinedAt: item.quarantinedAt
  };
}

/**
 * Uvoľní obsah z karantény (po stabilizácii)
 * @param {string} id - ID karanténového záznamu
 */
export async function releaseFromQuarantine(id) {
  await ensureQuarantine();

  const data = JSON.parse(await fs.readFile(QUARANTINE_FILE, "utf-8"));
  const item = data.items.find(i => i.id === id);

  if (item && !item.released) {
    item.released = true;
    item.releasedAt = new Date().toISOString();

    await fs.writeFile(QUARANTINE_FILE, JSON.stringify(data, null, 2), "utf-8");

    console.log(`🔓 Uvoľnený z karantény: ${id}`);
  }
}

/**
 * Získa zoznam karanténových záznamov
 * @param {boolean} includingReleased - Zahrnúť aj uvoľnené záznamy
 * @returns {Array} Zoznam záznamov
 */
export async function getQuarantineList(includingReleased = false) {
  await ensureQuarantine();

  const data = JSON.parse(await fs.readFile(QUARANTINE_FILE, "utf-8"));

  return includingReleased
    ? data.items
    : data.items.filter(i => !i.released);
}

/**
 * Vyčistí staré uvoľnené záznamy z karantény
 * @param {number} daysOld - Vek v dňoch
 */
export async function cleanOldQuarantine(daysOld = 30) {
  await ensureQuarantine();

  const data = JSON.parse(await fs.readFile(QUARANTINE_FILE, "utf-8"));
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const originalCount = data.items.length;
  data.items = data.items.filter(item => {
    if (!item.released) return true;
    return new Date(item.releasedAt) > cutoffDate;
  });

  const removed = originalCount - data.items.length;

  if (removed > 0) {
    await fs.writeFile(QUARANTINE_FILE, JSON.stringify(data, null, 2), "utf-8");
    console.log(`🧹 Vyčistených ${removed} starých karanténových záznamov`);
  }

  return removed;
}
