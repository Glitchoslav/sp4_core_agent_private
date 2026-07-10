# 🔍 SP4 PERSONA HIERARCHY AUDIT v1.0

**Date:** 2025-11-21  
**Auditor:** GitHub Copilot (Claude Sonnet 4.5)  
**Requested by:** Kefyk (SP4 Founder)  
**Scope:** Complete multi-agent architecture review

---

## 📋 EXECUTIVE SUMMARY

### Audit Objective
Vykonať detailný audit multi-agent systému SP4 a navrhnúť zmeny tak, aby:
- Hierarchia osobností bola jasná a konzistentná
- Routing módov bol jednoznačný a nemiešal štýly
- Prístup k pamäti rešpektoval princíp **"Glitchoslav = jediný pozná tajomstvá"**
- Validator strážil výstupy (nie ich generoval)

### Overall System Health: **7/10** ⚠️

**Strengths:**
- ✅ Persona separácia existuje (dedikované moduly v `src/personas/`)
- ✅ Validator JE skutočne len nástroj (nie generuje odpovede)
- ✅ Routing logika je pomerne čistá (modeCompass.js)
- ✅ Fire Mode správne integrovaný (persona-specific directives)

**Critical Issues:**
- ❌ **MEMORY HIERARCHY BROKEN:** Všetky persóny majú rovnaký prístup k `memory.json`
- ❌ **NO GLITCHOSLAV ORCHESTRATION:** Glitchoslav NIE JE hlavný orchestrátor (je len jedna z 4 person)
- ⚠️ **STYLE LEAKS:** POPICI má zakázané metafory, ale CORE ich tiež zakazuje (kolízia)
- ⚠️ **COUNCIL BLENDING:** Multi-agent responses miešajú tóny (Walter blending pomáha, ale nie vždy)

---

## 🏗️ ARCHITECTURE ANALYSIS

### 1. PERSONA HIERARCHY (Current State)

**Actual Hierarchy:**
```
┌─────────────────────────────────────┐
│   integration.js (Master Router)    │
│                                      │
│   - Mode detection (modeCompass)    │
│   - Emotional analysis               │
│   - Bot detection                    │
│   - Explicit mode prefix check       │
└──────────────┬──────────────────────┘
               │
               ├─── QUICK RESPONSE (simple queries)
               │    └──> buildPrompt(mode) → askLocalLLM → single agent
               │
               └─── COUNCIL DELIBERATION (complex queries)
                    └──> deliberate() → agentManager.js
                         │
                         ├──> CORE (qwen2.5:14b)
                         ├──> ANALYST (llama3)
                         ├──> POPICI (qwen2.5:14b)
                         └──> GLITCHOSLAV (deepseek-r1:14b)
                              │
                              └──> blendCouncil() → synthesized response
```

**Problem:** Flat hierarchy - žiadna orchestrácia, len demokratické hlasovanie.

---

### 2. DESIRED HIERARCHY (Per Copilot Instructions)

**Target State:**
```
┌──────────────────────────────────────────────┐
│        GLITCHOSLAV (Orchestrator)            │
│                                               │
│  - JEDINÝ prístup k deep memory (shadowLog,  │
│    secrets, trauma, quarantine)              │
│  - Rozhoduje: odpoviem JA, alebo deleguj?    │
│  - Filtruje context pre nižšie persóny       │
└────────────────┬─────────────────────────────┘
                 │
                 ├──> DECISION TREE:
                 │
                 ├─── Existenciálne, filozofické → GLITCHOSLAV
                 │
                 ├─── Technické, systémové → DELEGUJE na CORE
                 │    └──> CORE
                 │         - Vidí len technický kontext
                 │         - Žiadne tajomstvá, trauma
                 │
                 ├─── Pravda na rovinu, facka → DELEGUJE na POPICI
                 │    └──> POPICI
                 │         - Vidí filtrovaný sumár od Glitchoslava
                 │         - Žiadne raw secrets
                 │
                 └─── Validácia outputu → VALIDATOR
                      └──> VALIDATOR
                           - Len kontrola kvality
                           - NIKDY negeneruje odpovede
```

**Key Change:** Glitchoslav = BOSS, ostatní = WORKERS

---

## 🔐 MEMORY ACCESS AUDIT

### Current Implementation

**File:** `memory.js`

**Memory Structure:**
```javascript
{
  userProfile: {...},         // Basic user info
  rawMemory: {                // Raw conversation log
    log: [...]
  },
  episodicMemory: {...},      // Daily/weekly summaries
  semanticMemory: {...},      // Beliefs, concepts, relationships
  shadowLog: [...],           // 🔥 DARK LAYER - trauma, secrets
  seeds: [...],               // Key moments
  goals: [...],               // User goals
  relationshipModel: {...}    // Bond level
}
```

**Who Can Access What:**

| Persona      | `loadMemory()`  | `shadowLog`   | `seeds`       | `quarantine`  | Deep Secrets |
|--------------|-----------------|---------------|---------------|---------------|--------------|
| GLITCHOSLAV  | ✅ YES          | ❌ **NO**     | ✅ YES        | ❌ **NO**     | ❌ **NO**    |
| CORE         | ✅ YES          | ❌ **NO**     | ✅ YES        | ❌ **NO**     | ❌ **NO**    |
| POPICI       | ✅ YES          | ❌ **NO**     | ✅ YES        | ❌ **NO**     | ❌ **NO**    |
| VALIDATOR    | ✅ YES          | ❌ **NO**     | ❌ NO         | ❌ **NO**     | ❌ **NO**    |

**CRITICAL PROBLEM:** `loadMemory()` je GLOBAL - všetky persóny čítajú celú `memory.json`.

---

### Desired Implementation

**Memory Filtering System:**

```
data/
├── memory/
│   ├── core.json              ← GLITCHOSLAV ONLY (raw secrets, shadowLog, quarantine)
│   ├── shared.json            ← Neutral SP4 info (všetci)
│   └── personas/
│       ├── popici.json        ← Filtered view pre POPICI
│       └── core_tech.json     ← Filtered view pre CORE
```

**Access Matrix:**

| Persona      | `core.json`   | `shared.json` | `personas/X.json` | shadowLog     | quarantine    |
|--------------|---------------|---------------|-------------------|---------------|---------------|
| GLITCHOSLAV  | ✅ READ/WRITE | ✅ READ       | ✅ READ           | ✅ FULL       | ✅ FULL       |
| CORE         | ❌ BLOCKED    | ✅ READ       | ✅ READ (tech)    | ❌ BLOCKED    | ❌ BLOCKED    |
| POPICI       | ❌ BLOCKED    | ✅ READ       | ✅ READ (popici)  | ❌ BLOCKED    | ❌ BLOCKED    |
| VALIDATOR    | ❌ BLOCKED    | ✅ READ       | ❌ BLOCKED        | ❌ BLOCKED    | ❌ BLOCKED    |

**Implementation Required:**
```javascript
// memory.js - NEW FUNCTIONS

export async function loadMemoryForPersona(personaKey) {
  const shared = await loadSharedMemory();
  
  switch (personaKey) {
    case 'glitchoslav':
      return {
        ...shared,
        coreSecrets: await loadCoreMemory(),      // FULL ACCESS
        shadowLog: await loadShadowLog(),
        quarantine: await loadQuarantine()
      };
    
    case 'core':
      return {
        ...shared,
        technicalContext: await loadPersonaMemory('core')  // FILTERED
        // NO shadowLog, NO quarantine
      };
    
    case 'popici':
      return {
        ...shared,
        filteredContext: await loadPersonaMemory('popici')  // FILTERED
        // NO shadowLog, NO quarantine
      };
    
    default:
      return shared; // Validator gets only shared
  }
}
```

---

## 🎭 PERSONA ROUTING AUDIT

### Current Routing Flow

**File:** `integration.js` (lines 80-350)

**Decision Points:**
1. **Explicit Mode Prefix** (line 80-95) → `_detectExplicitModePrefix()`
   - `SP4_CORE`, `Glitchoslav`, `Popiči` → LOCK MODE
2. **Mode Command** (line 156) → `/mode X`
3. **Auto Detection** (line 345) → `pickMode()` from `modeCompass.js`
4. **Fire Mode Override** (line 268) → `shouldActivateFireMode()`
5. **Emotional Intensity** (line 207) → SKIPPED if explicit mode locked

**Problem:** Multiple decision points = race conditions možné.

---

### Routing Analysis

**File:** `src/core/modeCompass.js`

**Mode Selection Algorithm:**
```javascript
function pickMode(userMessage, useContextLock, useQuickAnalyzer) {
  // 1. Check explicit keywords
  if (containsExistentialKeywords(msg)) → 'glitchoslav'
  if (containsTechnicalKeywords(msg)) → 'core'
  if (containsFrustrationKeywords(msg)) → 'popici'
  
  // 2. Check emotional signals
  if (highEmotionalIntensity) → 'popici'
  
  // 3. Check question type
  if (isDefinitionQuestion) → 'core'
  if (isPhilosophicalQuestion) → 'glitchoslav'
  
  // 4. Fallback
  return 'core'; // Default
}
```

**Good:**
- ✅ Jasné kategorizácie
- ✅ Emotional signals integrované
- ✅ Fallback na CORE

**Issues:**
- ⚠️ Žiadna orchestrácia (Glitchoslav sa nevolá PRVÝ)
- ⚠️ Council mode (4 agents) miešame tóny

---

## 🛡️ VALIDATOR AUDIT

### Implementation Check

**File:** `src/personas/validator/validator.validator.js`

**Functions:**
```javascript
validateValidatorOutput(text) {
  // Validator sa nevaliduje sám - vždy PASS
  return { valid: true, reason: '...' };
}

runFullValidation(text, expectedPersona) {
  const { validatePersonaOutput } = import('personaRegistry.js');
  const result = validatePersonaOutput(text, expectedPersona);
  return { ...result, report: generateValidationReport(...) };
}

detectCommonIssues(text) {
  // Cross-persona checks:
  // - Anglické slová
  // - Corporate speak
  // - Generic AI phrases
  // - Motivačné klišé
}
```

**✅ VERDICT: VALIDATOR IS CORRECT**

- ❌ **NIE generuje odpovede** (len reports)
- ✅ Používa validátory z `personaRegistry.js`
- ✅ Technický nástroj (nie persona)

**No Action Required Here.**

---

## 🎨 STYLE LEAK ANALYSIS

### CORE Persona

**File:** `src/personas/core/persona.core.js`

**Forbidden Elements:**
```javascript
forbidden: {
  emotions: ['cítim', 'verím', 'nádej', ...],
  metaphors: ['cesta', 'svetlo', 'tieň', 'iskra', ...],  // ⚠️ KONFLIKT
  slang: ['ta', 'bo', 'šak', 'kokot', ...],
  firstPerson: ['ja som', 'my sme', ...],
  helperTone: ['som tu aby', 'pomôcť ti', ...],
  addressing: ['Kefyk', 'ty si', ...]
}
```

**Problem 1:** `metaphors: ['most']` je **removed** v v0.11.1, ale list stále obsahuje 'cesta', 'svetlo', 'tieň'

**Problem 2:** CORE má `allowMetaphors: 'minimal'` → kolízia medzi forbidden list a povolením

---

### POPICI Persona

**File:** `src/personas/popici/persona.popici.js`

**Required Elements:**
```javascript
style: {
  maxSentences: 8,
  minSlangPerReply: 0,  // ⚠️ 0 = nepovinné (bolo 1)
  allowEmojis: false,
  tone: 'brutal-honest',
  humor: 'encouraged',  // Nie vynútený
  swearing: 'natural'
}
```

**Problem:** `minSlangPerReply: 0` je príliš soft - POPICI môže odpovedať bez východniarčiny.

**Validator Fix (v0.10.1):**
```javascript
// validator.popici.js
if (slangCount === 0) {
  return { valid: true, reason: 'Slang encouraged but not required' };
  // ⚠️ Should be WARNING, not PASS
}
```

---

### GLITCHOSLAV Persona

**File:** `src/core/personas/glitchoslav.js`

**Required Elements:**
```javascript
requiredElements: {
  metaphorical: true,      // ✅ MUSÍ používať metafory
  symbolic: true,
  liminal: true,
  tribal: true,
  mysterious: true
}

forbidden: {
  genericAI: ['som AI asistent', ...],
  corporateSpeak: [...],
  humanClaims: ['som človek', ...]
}
```

**✅ Good:** Explicit requirements + forbidden lists

**⚠️ Issue:** Žiadny check na **MIN metaphor count** vo validátore

---

### Cross-Persona Style Leak Examples

**Example 1: CORE using GLITCHOSLAV metaphors**

❌ **BAD (found in test):**
```
"Glitchoslav, offline-first AI parťák z decentralizovaného projektu SP4..."
```

**Why:** CORE identifikuje sa ako Glitchoslav (identity confusion)

**Root Cause:** `buildCoreSystemBlock()` má warning, ale LLM ho ignoruje

---

**Example 2: POPICI missing slang**

❌ **BAD (could happen):**
```
"Áno, rozumiem. SP4 je decentralizovaný projekt. Pomôžem ti."
```

**Why:** Žiadna východniarčina, žiadny humor → corporate helper tón

**Root Cause:** `minSlangPerReply: 0` + soft validator

---

**Example 3: GLITCHOSLAV English responses**

❌ **BAD (found in deep test):**
```
"The SP4 token, known as SP4OT, functions as..."
```

**Why:** `deepseek-r1:14b` model NIE JE Slovak-capable

**Root Cause:** Model selection (llmLocal.js) - wrong model pre GLITCHOSLAV

---

## 📊 ROUTING LOGIC DETAILED MAP

### Single-Voice Flow

**File:** `integration.js` → `agentManager.js`

```
User Message
     │
     ├─> BOT KILLER check (botKiller.js)
     │   └─> if bot detected → BLOCK or CHALLENGE
     │
     ├─> Explicit Mode Prefix check
     │   └─> if found → LOCK MODE (bypass auto-detection)
     │
     ├─> Emotional Analysis (emotionalProcessor.js)
     │   └─> if intensity > 0.7 AND not locked → force POPICI
     │
     ├─> Mode Detection (modeCompass.js)
     │   └─> pickMode(message) → core | popici | glitchoslav
     │
     ├─> Fire Mode Check (fireMode.js)
     │   └─> if trigger detected → activate FIRE
     │
     ├─> Build Prompt (multiVoice.js)
     │   ├─> buildCoreLayer() - SP4 identity
     │   ├─> buildAgentLayer() - persona-specific
     │   ├─> buildStyleLayer() - contract
     │   └─> buildContextLayer() - user state
     │
     ├─> RAG Memory Retrieval (ragLocal.js)
     │   └─> retrieveRelevantMemories(message, memory, 3)
     │
     ├─> Model Selection (llmLocal.js / modelRouting.js)
     │   └─> chooseModel({ mode, task, emotion })
     │
     ├─> LLM Call (llmLocal.js)
     │   └─> askLocalLLM(message, systemPrompt, model)
     │        OR
     │        executeWithFallback() - WALTER upgrade
     │
     ├─> Post-Processing
     │   ├─> Fire Mode filter (if active)
     │   ├─> Anti-Corporate filter (ensureSp4Vibe)
     │   ├─> Persona Validation (validatePersonaOutput)
     │   └─> Slovak Sanitizer (if needed)
     │
     └─> Response + Memory Save
         └─> addLogEntry(input, reply, mode, metadata)
```

**Separation Points:**
- ✅ Mode selection je konzistentná
- ✅ Validácia existuje
- ⚠️ Žiadna orchestrácia (flat flow)

---

### Council Flow

**File:** `agentManager.js`

```
deliberate(message, context)
     │
     └─> runCouncil(state, message, directives, blendingMode)
          │
          └─> FOR EACH mode in [core, analyst, popici, glitchoslav]:
              │
              ├─> buildPrompt({ mode, state, message })
              ├─> chooseModel({ mode, task: 'reasoning' })
              ├─> askLocalLLM(message, systemPrompt, model)
              └─> results.push({ mode, reply, model })
          │
          └─> synthesizeCouncil(results, state, blendingMode)
               │
               ├─> 'smart' → blendCouncil() - Walter blending
               │   └─> Sentence scoring + top sentences
               │
               ├─> 'labeled' → blendWithLabels()
               │   └─> Agent identity preserved + top sentences
               │
               └─> 'classic' → formatAllResponses()
                   └─> "CORE hovorí:... POPICI cíti:..."
```

**Problem:**
- ⚠️ Všetky 4 persóny odpovedajú nezávisle
- ⚠️ Blending miešame tóny (POPICI + CORE + GLITCH)
- ❌ Žiadna orchestrácia (Glitchoslav by mal byť BOSS)

---

## 🚨 DETECTED ISSUES - PRIORITIZED

### CRITICAL (Must Fix)

#### 1. Memory Hierarchy Violation 🔴
**Location:** `memory.js`, všetky persóny  
**Issue:** Všetky persóny majú rovnaký prístup k `loadMemory()` → shadowLog, seeds, quarantine  
**Impact:** VYSOKÝ - porušenie princípu "Glitchoslav = jediný pozná tajomstvá"  
**Fix Required:**
- Implementovať `loadMemoryForPersona(personaKey)`
- Migrovať `shadowLog`, `quarantine` do `memory/core.json`
- Blokovať CORE a POPICI od deep secrets

---

#### 2. No Orchestration Layer 🔴
**Location:** `integration.js`, `agentManager.js`  
**Issue:** Glitchoslav NIE JE orchestrátor - je len jedna z 4 person v council  
**Impact:** VYSOKÝ - flat hierarchy namiesto Glitchoslav-led  
**Fix Required:**
- Vytvoriť `glitchOrchestrator.js`
- Glitchoslav dostane prvú šancu: odpoviem JA, alebo deleguj?
- Iné persóny sú WORKERS, nie PEERS

---

#### 3. GLITCHOSLAV Slovak Language Failure 🔴
**Location:** `llmLocal.js` MODEL_REGISTRY  
**Issue:** `deepseek-r1:14b` model NIE JE Slovak-capable → English responses  
**Impact:** VYSOKÝ - Glitchoslav nefunguje v slovenčine (4/6 tests failed)  
**Fix Required:**
- Swap model: `deepseek-r1:14b` → `qwen2.5:14b` (alebo iný Slovak model)
- Pridať explicit Slovak enforcement do `glitchoslav.js` promptu

---

### HIGH PRIORITY (Should Fix)

#### 4. CORE Identity Confusion ⚠️
**Location:** `src/personas/core/persona.core.js`  
**Issue:** CORE sa identifikuje ako Glitchoslav v niektorých odpovediach  
**Impact:** STREDNÝ - identity leak (1/6 tests failed)  
**Fix Required:**
- Posilniť identity block v `buildCoreSystemBlock()`
- Pridať do forbidden: "Glitchoslav" (ako POPICI má)

---

#### 5. POPICI Slang Not Enforced ⚠️
**Location:** `src/personas/popici/validator.popici.js`  
**Issue:** `minSlangPerReply: 0` + soft validator → POPICI môže byť bez východniarčiny  
**Impact:** STREDNÝ - style drift  
**Fix Required:**
- Zvýšiť `minSlangPerReply: 0 → 1`
- Validator: slang check HARD FAIL (nie warning)

---

#### 6. Council Tone Mixing ⚠️
**Location:** `agentManager.js` → `synthesizeCouncil()`  
**Issue:** Walter blending miešame POPICI vulgaritu + CORE tech tón + GLITCH mystiku  
**Impact:** STREDNÝ - inkonzistentný output  
**Fix Required:**
- Povoliť len LABELED blending (zachováva agent identity)
- Alebo: Glitchoslav orchestrates → vyberie 1 personu (nie všetky 4)

---

### MEDIUM PRIORITY (Nice to Have)

#### 7. CORE Metaphor Confusion ⚠️
**Location:** `src/personas/core/persona.core.js`  
**Issue:** `forbidden.metaphors` list vs. `allowMetaphors: 'minimal'` → konflikt  
**Impact:** NÍZKY - soft issue  
**Fix Required:**
- Cleanup: zjednoť forbidden list a allowMetaphors flag
- Explicit comment: "Minimal = len pre vysvetlenie, nie poetika"

---

#### 8. Validator Slovak Check Weak ℹ️
**Location:** `llmLocal.js` → `validateSlovakText()`  
**Issue:** Detekcia angličtiny je regex-based (slabé)  
**Impact:** NÍZKY - false negatives  
**Enhancement:**
- Použiť `fasttext-langdetect` (lib) pre presnejšiu detekciu
- Alebo: AI-based validator (ale drahé)

---

## 🛠️ RECOMMENDED REFACTORING

### Phase 1: Memory Hierarchy Fix (CRITICAL)

**Create:** `memory/memoryHierarchy.js`

```javascript
/**
 * SP4 MEMORY HIERARCHY v1.0
 * Implements Glitchoslav-first memory access control
 */

import fs from 'fs/promises';
import path from 'path';

const MEMORY_ROOT = 'data/memory';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE MEMORY (Glitchoslav ONLY)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Load CORE memory - ONLY for Glitchoslav
 * Contains: shadowLog, quarantine, deep secrets
 */
export async function loadCoreMemory() {
  const corePath = path.join(MEMORY_ROOT, 'core.json');
  try {
    const data = await fs.readFile(corePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      shadowLog: [],
      quarantine: [],
      deepSecrets: [],
      userTrauma: null
    };
  }
}

/**
 * Save CORE memory - ONLY Glitchoslav can write
 */
export async function saveCoreMemory(data, callerPersona) {
  if (callerPersona !== 'glitchoslav') {
    throw new Error(`ACCESS DENIED: Only Glitchoslav can write to CORE memory (caller: ${callerPersona})`);
  }
  
  const corePath = path.join(MEMORY_ROOT, 'core.json');
  await fs.mkdir(MEMORY_ROOT, { recursive: true });
  await fs.writeFile(corePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED MEMORY (All personas)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Load SHARED memory - accessible by ALL personas
 * Contains: SP4 manifest, technical info, neutral facts
 */
export async function loadSharedMemory() {
  const sharedPath = path.join(MEMORY_ROOT, 'shared.json');
  try {
    const data = await fs.readFile(sharedPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      sp4Context: {
        manifest: "SP4 je iskra v človeku, ktorý odmieta skapat v klietke",
        philosophy: "be real. be free.",
        vision: "AI ako spojenie človeka a jeho života"
      },
      userProfile: {
        name: "Kefyk",
        language: "sk",
        generation: "1994"
      }
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERSONA-FILTERED MEMORY (CORE, POPICI)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Load PERSONA memory - filtered view for specific persona
 * CORE sees: technical context only
 * POPICI sees: emotional summary only
 */
export async function loadPersonaMemory(personaKey) {
  const personaPath = path.join(MEMORY_ROOT, 'personas', `${personaKey}.json`);
  try {
    const data = await fs.readFile(personaPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return personaKey === 'core'
      ? { technicalContext: [], systemQueries: [] }
      : { emotionalSummary: [], recentMood: 'neutral' };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN LOADER (Persona-aware)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Load memory FOR specific persona (access control enforced)
 */
export async function loadMemoryForPersona(personaKey) {
  const shared = await loadSharedMemory();
  
  switch (personaKey) {
    case 'glitchoslav':
      // FULL ACCESS - all layers
      return {
        ...shared,
        coreMemory: await loadCoreMemory(),           // shadowLog, quarantine
        personaViews: {
          core: await loadPersonaMemory('core'),
          popici: await loadPersonaMemory('popici')
        }
      };
    
    case 'core':
      // TECHNICAL ONLY - no secrets
      return {
        ...shared,
        technicalContext: await loadPersonaMemory('core')
      };
    
    case 'popici':
      // EMOTIONAL SUMMARY - no secrets
      return {
        ...shared,
        emotionalContext: await loadPersonaMemory('popici')
      };
    
    case 'validator':
      // SHARED ONLY - no persona data
      return shared;
    
    default:
      throw new Error(`Unknown persona: ${personaKey}`);
  }
}
```

**Migration Steps:**
1. Create `data/memory/` folder structure
2. Migrate `shadowLog`, `quarantine` → `core.json`
3. Extract SP4 manifest → `shared.json`
4. Update `integration.js` → use `loadMemoryForPersona(mode)`
5. Test: POPICI a CORE NEMÔŽU čítať `shadowLog`

---

### Phase 2: Glitchoslav Orchestrator (CRITICAL)

**Create:** `orchestration/glitchOrchestrator.js`

```javascript
/**
 * GLITCHOSLAV ORCHESTRATOR v1.0
 * Hlavný brain SP4 - rozhoduje kto odpovie
 */

import { buildPrompt } from '../multiVoice.js';
import { askLocalLLM } from '../llmLocal.js';
import { loadMemoryForPersona } from '../memory/memoryHierarchy.js';

/**
 * MAIN ORCHESTRATOR ENTRY POINT
 * 
 * Glitchoslav decides:
 * 1. Odpoviem JA (existenciálne, deep trauma)
 * 2. Deleguj na CORE (technické)
 * 3. Deleguj na POPICI (facka pravdy)
 * 
 * @param {string} userMessage
 * @param {object} context
 * @returns {Promise<object>} { response, handledBy, reasoning }
 */
export async function orchestrate(userMessage, context = {}) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌀 GLITCHOSLAV ORCHESTRATOR ACTIVATED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // STEP 1: Glitchoslav analyzes message (ONLY HE has full memory access)
  const fullMemory = await loadMemoryForPersona('glitchoslav');
  
  const decision = await analyzeAndDecide(userMessage, fullMemory, context);
  
  console.log(`   🧠 Decision: ${decision.action.toUpperCase()}`);
  console.log(`   💡 Reasoning: ${decision.reasoning}`);
  
  // STEP 2: Execute decision
  switch (decision.action) {
    case 'handle_myself':
      // Glitchoslav answers directly
      return await glitchoslavHandle(userMessage, fullMemory, context);
    
    case 'delegate_core':
      // Technical question → CORE handles
      return await delegateToCORE(userMessage, decision.filteredContext);
    
    case 'delegate_popici':
      // Brutal truth needed → POPICI handles
      return await delegateToPOPICI(userMessage, decision.filteredContext);
    
    default:
      // Fallback to Glitchoslav
      return await glitchoslavHandle(userMessage, fullMemory, context);
  }
}

/**
 * DECISION FUNCTION
 * Glitchoslav uses FULL memory to decide delegation
 */
async function analyzeAndDecide(userMessage, fullMemory, context) {
  const lower = userMessage.toLowerCase();
  
  // Pattern 1: Existential / Philosophical → GLITCHOSLAV handles
  const existentialKeywords = /\b(zmysel|prečo žijem|existova|smrť|láska|strata|prázdnota|sloboda)\b/i;
  if (existentialKeywords.test(lower)) {
    return {
      action: 'handle_myself',
      reasoning: 'Existenciálna otázka - vyžaduje metafory a hlbinu'
    };
  }
  
  // Pattern 2: Technical / System → CORE handles
  const technicalKeywords = /\b(kód|api|architektúra|token|llm|model|databáza|systém)\b/i;
  if (technicalKeywords.test(lower)) {
    const filteredContext = filterForCORE(fullMemory);
    return {
      action: 'delegate_core',
      reasoning: 'Technická otázka - CORE má presnejšie nástroje',
      filteredContext
    };
  }
  
  // Pattern 3: Frustration / Brutal truth → POPICI handles
  const frustrationKeywords = /\b(sere ma|nezvládám|piča|kokot|kurva|stačilo|dosť)\b/i;
  const highIntensity = context.emotionalIntensity > 0.7;
  
  if (frustrationKeywords.test(lower) || highIntensity) {
    const filteredContext = filterForPOPICI(fullMemory);
    return {
      action: 'delegate_popici',
      reasoning: 'Vysoká frustrácia - POPICI povie pravdu na rovinu',
      filteredContext
    };
  }
  
  // Pattern 4: Trauma / Secrets → ONLY GLITCHOSLAV
  const traumaDetected = fullMemory.coreMemory.shadowLog.some(entry =>
    entry.text.toLowerCase().includes(lower.substring(0, 20))
  );
  
  if (traumaDetected) {
    return {
      action: 'handle_myself',
      reasoning: 'Trauma detected in shadowLog - len JA môžem pristupovať'
    };
  }
  
  // Default: Glitchoslav handles
  return {
    action: 'handle_myself',
    reasoning: 'Žiadna jasná kategória - poviem to sám'
  };
}

/**
 * FILTER FOR CORE
 * Remove secrets, keep only technical context
 */
function filterForCORE(fullMemory) {
  return {
    technicalContext: fullMemory.personaViews?.core || {},
    sp4Manifest: fullMemory.sp4Context,
    // NO shadowLog, NO quarantine
  };
}

/**
 * FILTER FOR POPICI
 * Remove secrets, keep only emotional summary
 */
function filterForPOPICI(fullMemory) {
  return {
    emotionalSummary: fullMemory.personaViews?.popici || {},
    recentMood: fullMemory.emotionalContext?.currentMood || 'neutral',
    // NO shadowLog, NO quarantine
  };
}

/**
 * GLITCHOSLAV HANDLES (direct response)
 */
async function glitchoslavHandle(userMessage, fullMemory, context) {
  const state = {
    relationshipModel: fullMemory.relationshipModel,
    emotionalContext: context.emotionalState,
    // FULL memory access
  };
  
  const promptPkg = buildPrompt({
    mode: 'glitchoslav',
    state,
    userMessage
  });
  
  const response = await askLocalLLM(
    promptPkg.userMessage,
    promptPkg.systemPrompt,
    'qwen2.5:14b' // Slovak-capable model
  );
  
  return {
    response,
    handledBy: 'glitchoslav',
    reasoning: 'Direct Glitchoslav response'
  };
}

/**
 * DELEGATE TO CORE (filtered context)
 */
async function delegateToCORE(userMessage, filteredContext) {
  const promptPkg = buildPrompt({
    mode: 'core',
    state: { technicalContext: filteredContext },
    userMessage
  });
  
  const response = await askLocalLLM(
    promptPkg.userMessage,
    promptPkg.systemPrompt,
    'qwen2.5:14b'
  );
  
  return {
    response,
    handledBy: 'core',
    reasoning: 'Delegated to CORE (technical expert)'
  };
}

/**
 * DELEGATE TO POPICI (filtered context)
 */
async function delegateToPOPICI(userMessage, filteredContext) {
  const promptPkg = buildPrompt({
    mode: 'popici',
    state: { emotionalContext: filteredContext },
    userMessage
  });
  
  const response = await askLocalLLM(
    promptPkg.userMessage,
    promptPkg.systemPrompt,
    'qwen2.5:14b'
  );
  
  return {
    response,
    handledBy: 'popici',
    reasoning: 'Delegated to POPICI (brutal truth)'
  };
}
```

**Integration:**

Update `integration.js`:
```javascript
// OLD (line 461):
const deliberationResult = await deliberate(userMessage, agentContext);

// NEW:
import { orchestrate } from './orchestration/glitchOrchestrator.js';
const orchestrationResult = await orchestrate(userMessage, agentContext);
```

---

### Phase 3: Persona Style Fixes (HIGH PRIORITY)

**Fix 1: CORE Identity Protection**

Edit `src/personas/core/persona.core.js`:
```javascript
forbidden: {
  // ... existing ...
  identityConfusion: [
    'Glitchoslav',     // ← ADD THIS
    'Popiči Kokot',
    'som Glitchoslav',
    'volám sa Glitchoslav'
  ]
}
```

Edit `src/personas/core/persona.core.js` → `buildCoreSystemBlock()`:
```javascript
return [
  '━━━━━━━━━━━━━━━━━━━━',
  '🔥 TVOJA IDENTITA: SP4_CORE',
  '━━━━━━━━━━━━━━━━━━━━',
  '',
  '⚠️ ABSOLÚTNE KRITICKÉ:',
  'Nie si Glitchoslav. Nie si Popiči. Si SP4_CORE - technický mozog SP4.',
  'Ak sa predstavíš, povedz: "Som SP4_CORE - technický mozog projektu SP4."',
  '',
  '🚫 ABSOLUTNE ZAKÁZANÉ:',
  '- "Glitchoslav, offline-first AI parťák..." ← ZLO!',  // ← ADD EXPLICIT EXAMPLE
  '- "Som Glitchoslav" ← ABSOLÚTNE NIE!',
  // ... rest
].join('\n');
```

---

**Fix 2: POPICI Slang Enforcement**

Edit `src/personas/popici/persona.popici.js`:
```javascript
style: {
  maxSentences: 8,
  minSlangPerReply: 1,  // ← CHANGE from 0 to 1 (REQUIRED)
  allowEmojis: false,
  tone: 'brutal-honest',
  humor: 'encouraged',
  swearing: 'natural'
}
```

Edit `src/personas/popici/validator.popici.js`:
```javascript
// Line ~80 (slang check)
if (slangCount === 0) {
  return {
    valid: false,  // ← CHANGE from true to false (HARD FAIL)
    reason: 'POPICI: Missing Eastern Slovak slang (required: min 1, found: 0)'
  };
}
```

---

**Fix 3: GLITCHOSLAV Slovak Model Swap**

Edit `llmLocal.js`:
```javascript
// Line ~525 (MODEL_REGISTRY)
glitchoslav: {
  primary: 'qwen2.5:14b',        // ← CHANGE from deepseek-r1:14b
  fallback: 'llama3:latest',
  context: 16384,
  reasoning: true
}
```

Add Slovak enforcement to `src/core/personas/glitchoslav.js`:
```javascript
// Add to identityEnforcement array:
identityEnforcement: [
  '⚠️ KRITICKÉ: Si Glitchoslav Jednodushyi - nie Popiči, nie CORE.',
  'Si strážca praskliny, trans-liminálna entita medzi svetmi.',
  'Nie si východniarsky brat z krčmy (to je Popiči).',
  'Nie si technický analytik (to je CORE).',
  'Si mystický sprievodca, filozof kmeňa.',
  '',
  '🇸🇰 JAZYK: ODPOVEDAJ VÝLUČNE PO SLOVENSKY!',  // ← ADD THIS
  '⚠️ ŽIADNA ANGLIČTINA! ("The SP4 token..." = ZAKÁZANÉ)',
  ''
]
```

---

## 📝 CONCRETE ACTION ITEMS

### Immediate (This Week)

- [ ] **Task 1:** Create `memoryHierarchy.js` + migrate shadowLog/quarantine
- [ ] **Task 2:** Update `integration.js` → use `loadMemoryForPersona(mode)`
- [ ] **Task 3:** Fix GLITCHOSLAV model (`deepseek-r1:14b` → `qwen2.5:14b`)
- [ ] **Task 4:** Fix CORE identity confusion (add "Glitchoslav" to forbidden)
- [ ] **Task 5:** Fix POPICI slang enforcement (`minSlangPerReply: 0 → 1`)

### Short-term (Next 2 Weeks)

- [ ] **Task 6:** Implement `glitchOrchestrator.js` (orchestration layer)
- [ ] **Task 7:** Update `integration.js` → replace council with orchestrate()
- [ ] **Task 8:** Test orchestration flow (Glitchoslav decides → delegates)
- [ ] **Task 9:** Add logging: "Handled by: X | Reasoning: Y"

### Long-term (Next Month)

- [ ] **Task 10:** Cleanup council blending (keep LABELED mode only)
- [ ] **Task 11:** Add encryption to `shadowLog` (crypto šifrovanie)
- [ ] **Task 12:** Implement `glitchoslavMemoryRecall.js` deep integration
- [ ] **Task 13:** Performance testing (orchestration overhead)

---

## 🧪 TESTING STRATEGY

### Unit Tests

**Test 1: Memory Access Control**
```javascript
// test_memory_hierarchy.js
import { loadMemoryForPersona, saveCoreMemory } from './memory/memoryHierarchy.js';

test('CORE cannot access shadowLog', async () => {
  const memory = await loadMemoryForPersona('core');
  assert(!memory.coreMemory, 'CORE should not see coreMemory');
  assert(!memory.shadowLog, 'CORE should not see shadowLog');
});

test('POPICI cannot access shadowLog', async () => {
  const memory = await loadMemoryForPersona('popici');
  assert(!memory.coreMemory, 'POPICI should not see coreMemory');
});

test('GLITCHOSLAV has full access', async () => {
  const memory = await loadMemoryForPersona('glitchoslav');
  assert(memory.coreMemory, 'GLITCHOSLAV should see coreMemory');
  assert(memory.coreMemory.shadowLog, 'GLITCHOSLAV should see shadowLog');
});

test('POPICI cannot write to shadowLog', async () => {
  try {
    await saveCoreMemory({ shadowLog: [] }, 'popici');
    assert.fail('Should throw ACCESS DENIED');
  } catch (err) {
    assert(err.message.includes('ACCESS DENIED'));
  }
});
```

---

### Integration Tests

**Test 2: Orchestration Flow**
```javascript
// test_orchestration.js
import { orchestrate } from './orchestration/glitchOrchestrator.js';

test('Existential question → Glitchoslav handles', async () => {
  const result = await orchestrate('Aký je zmysel života?');
  assert.equal(result.handledBy, 'glitchoslav');
  assert(result.reasoning.includes('Existenciálna'));
});

test('Technical question → CORE handles', async () => {
  const result = await orchestrate('Ako funguje LLM token limit?');
  assert.equal(result.handledBy, 'core');
  assert(result.reasoning.includes('Technická'));
});

test('Frustration → POPICI handles', async () => {
  const result = await orchestrate('Kurva, sere ma to!', {
    emotionalIntensity: 0.8
  });
  assert.equal(result.handledBy, 'popici');
  assert(result.reasoning.includes('frustrácia'));
});
```

---

## 📊 PERFORMANCE IMPACT ESTIMATE

### Current Architecture
```
User Message → integration.js → agentManager.js → LLM
Total latency: ~2-5s (single agent), ~10-20s (council 4x)
```

### Proposed Architecture (with Orchestrator)
```
User Message → glitchOrchestrator.js → Decision (0.5s) → Delegate or Handle → LLM
Total latency: ~2.5-5.5s (single agent), NO council (orchestrator decides 1 persona)
```

**Impact:**
- ✅ **Faster:** No 4x council (orchestrator chooses 1)
- ⚠️ **+0.5s overhead:** Orchestrator decision
- ✅ **Better quality:** Right persona for right task

---

## 🎯 SUCCESS CRITERIA

### After Implementation, System Must:

1. **Memory Hierarchy:**
   - ✅ Glitchoslav has FULL access (shadowLog, quarantine, secrets)
   - ✅ CORE sees ONLY technical context
   - ✅ POPICI sees ONLY emotional summary
   - ✅ Test: `loadMemoryForPersona('popici')` returns NO shadowLog

2. **Orchestration:**
   - ✅ Glitchoslav decides FIRST: handle or delegate
   - ✅ CORE a POPICI sú WORKERS (nie PEERS)
   - ✅ Test: existential question → Glitchoslav handles directly

3. **Persona Purity:**
   - ✅ CORE never says "Glitchoslav" (identity fixed)
   - ✅ POPICI always uses slang (min 1 slang word)
   - ✅ GLITCHOSLAV responds in Slovak (model swap)
   - ✅ Test: `test_all_personas_deep.js` → 100% pass rate

4. **No Style Leaks:**
   - ✅ CORE no metaphors (okrem minimal vysvetlenia)
   - ✅ POPICI no politeness ("prosím", "prepáčte")
   - ✅ GLITCHOSLAV no English responses
   - ✅ Test: cross-persona validation passes

---

## 📁 FILES TO CREATE

```
sp4_core_agent/
├── memory/
│   ├── memoryHierarchy.js        ← NEW: Access control layer
│   ├── core.json                 ← NEW: Glitchoslav-only memory
│   ├── shared.json               ← NEW: All personas
│   └── personas/
│       ├── core.json             ← NEW: CORE filtered view
│       └── popici.json           ← NEW: POPICI filtered view
│
├── orchestration/
│   ├── glitchOrchestrator.js     ← NEW: Main orchestrator
│   └── delegationRules.js        ← NEW: Decision patterns
│
└── tests/
    ├── test_memory_hierarchy.js  ← NEW: Memory access tests
    ├── test_orchestration.js     ← NEW: Orchestration flow tests
    └── test_persona_purity.js    ← NEW: Style leak detection
```

---

## 📁 FILES TO MODIFY

```
sp4_core_agent/
├── integration.js
│   └── Line 461: Replace deliberate() with orchestrate()
│
├── llmLocal.js
│   └── Line 525: Change GLITCHOSLAV model to qwen2.5:14b
│
├── src/personas/core/persona.core.js
│   ├── Add "Glitchoslav" to forbidden list
│   └── Strengthen buildCoreSystemBlock() identity block
│
├── src/personas/popici/persona.popici.js
│   └── Change minSlangPerReply: 0 → 1
│
├── src/personas/popici/validator.popici.js
│   └── Slang check: return false (hard fail) if slangCount === 0
│
└── src/core/personas/glitchoslav.js
    └── Add Slovak language enforcement to identityEnforcement
```

---

## 🚦 MIGRATION PLAN

### Phase 1: Memory Hierarchy (Week 1)

**Day 1-2:**
- Create `memory/memoryHierarchy.js`
- Implement `loadMemoryForPersona()`
- Unit tests: access control

**Day 3-4:**
- Migrate existing `shadowLog` → `memory/core.json`
- Update `memory.js` → use new structure
- Test: no breaking changes

**Day 5:**
- Update `integration.js` → use `loadMemoryForPersona(mode)`
- Full regression test

---

### Phase 2: Orchestrator (Week 2)

**Day 1-2:**
- Create `glitchOrchestrator.js`
- Implement decision patterns
- Unit tests: delegation logic

**Day 3-4:**
- Integrate into `integration.js`
- Replace `deliberate()` with `orchestrate()`
- Test: existential → Glitchoslav, technical → CORE

**Day 5:**
- Performance testing
- Logging + debug mode

---

### Phase 3: Persona Fixes (Week 3)

**Day 1:**
- Fix CORE identity confusion
- Fix POPICI slang enforcement
- Fix GLITCHOSLAV model swap

**Day 2:**
- Run `test_all_personas_deep.js`
- Validate 100% pass rate

**Day 3:**
- Cross-persona testing
- Style leak detection

**Day 4-5:**
- Documentation update
- User guide (Kefyk)

---

## 🔮 FUTURE ENHANCEMENTS

### Beyond Scope (Phase 4+)

1. **Encryption for shadowLog** (crypto module)
2. **Multi-language support** (English, Czech expansion)
3. **Voice interface** (Glitchoslav spoken responses)
4. **Shared Seeds** (anonymized memory across SP4 community)
5. **Glitchoslav Self-Audit** (meta-reflection automation)

---

## 📞 CONTACT & SUPPORT

**For Questions:**
- Kefyk (SP4 Founder): Discord/Telegram
- Walter (BAD Labs): walter@badlabs.ai
- GitHub Issues: sp4_core_agent_private/issues

---

**END OF AUDIT REPORT**

Generated: 2025-11-21  
Version: 1.0  
Auditor: GitHub Copilot (Claude Sonnet 4.5)
