# 🔴 PERSONA DISCONNECT DIAGNOSTIC REPORT v1.0
**Date:** 2026-01-31  
**Mission:** PERSONA_SYSTEM_AUDIT_v1  
**Status:** ❌ CRITICAL - Personas disconnected from Ollama

---

## 📋 SYMPTÓMY

**Pozorované správanie:**
```
Ollama vracia krátke generické odpovede bez ohľadu na osobnosť (persona).
Všetky módy (CORE, GLITCHOSLAV, POPIČI) produkujú rovnakú odpoveď.
Osobnosti sú ignorované - systém sa správa ako generický chatbot.
```

**Očakávané správanie:**
- CORE: Technické, stručné, bez bullshit-u
- GLITCHOSLAV: Filozofické metafory, slovanský dialekt, 3-5 viet
- POPIČI: Eastern Slovak slang (ta/bo/šak), nadávky, úderný štýl

---

## 🔍 ZISTENÉ FAKTY

### 1. Runtime Pipeline Flow

```
[USER INPUT]
    ↓
[integration.js::processMessage()]
    ↓
[multiVoice.js::buildPrompt(mode)]
    ↓ (generates full persona-specific system prompt)
[promptPackage.systemPrompt] = "🔥 TVOJA IDENTITA: SP4_CORE..." (830 lines)
    ↓
[orchestrate()] → [handlePersonaDirect(personaKey)]
    ↓
[buildPrompt(personaKey)] → enhancedSystemPrompt
    ↓
[askLocalLLM(userMessage, enhancedSystemPrompt, model)]
    ↓
[sp4LlmCall({ prompt, system, model })]
    ↓
[callOllama({ prompt, system, model })]
    ↓
🔴 **PROBLÉM JE TU** ↓
```

### 2. Problematické miesto: `ollamaClient.js` (lines 120-135)

```javascript
// 🔥 CRITICAL: STRONG system prompt to enforce Slovak + short responses
const enforcedSystem = system && typeof system === 'string' && system.trim().length > 0
    ? `${system}\n\n🚨 ABSOLUTE RULES:\n- RESPOND IN SLOVAK ONLY\n- BE DIRECT AND CONCISE (max 3-5 sentences)\n- NO EXPLANATIONS unless asked\n- NO ENGLISH words except technical terms (API, JSON, LLM)\n- FOLLOW USER'S INSTRUCTIONS EXACTLY`
    : `🇸🇰 RESPOND IN SLOVAK. Be concise (max 3-5 sentences). Follow instructions exactly.`;

messages.push({
    role: 'system',
    content: enforcedSystem,
});
```

**🔥 KOREŇOVÁ PRÍČINA:**

`enforcedSystem` **PREPISUJE** persona identity:

1. `multiVoice.js` vytvorí plný persona system prompt (830 lines):
   ```
   🔥 TVOJA IDENTITA: SP4_CORE
   You are SP4_CORE - technický sprievodca...
   CORE CREED: SP4 = Spark of Rebellion...
   👥 TVOJI KOLEGOVIA: GLITCHOSLAV, POPIČI...
   ```

2. Tento prompt sa pošle do `sp4LlmCall(system: "...")`

3. `callOllama()` prijme `system` parameter

4. **ALE:** `enforcedSystem` **APPEND-uje** enforcement rules za persona prompt:
   ```javascript
   `${system}\n\n🚨 ABSOLUTE RULES:...`
   ```

5. **PROBLÉM:** Enforcement rules sú **DOMINANTNÉ** - model ich číta LAST (highest priority)

6. Model Llama3:8b sa fokusuje na POSLEDNÉ inštrukcie → ignoruje persona identity

---

## 🗺️ TOK SYSTÉMU (ASCII MAPA)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ENTRY POINT: index_v07.js                                          │
│   ↓ readline.on('line')                                             │
│   ↓ agent.processMessage(userMessage, currentMode)                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ INTEGRATION: integration.js::processMessage()                       │
│   ↓ SPG emergency check (bypassed)                                  │
│   ↓ mode detection (pickMode if 'auto')                             │
│   ↓ buildPrompt({ mode, state, userMessage, extraDirectives })     │
│   → GENERATES: promptPackage.systemPrompt (FULL PERSONA IDENTITY)  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ ORCHESTRATION: glitchOrchestrator.js::orchestrate()                 │
│   ↓ analyzeAndDecide() → { action: 'delegate', target: 'core' }    │
│   ↓ handlePersonaDirect('core', userMessage, context)              │
│   → REBUILDS: buildPrompt({ mode: 'core', ... })                   │
│   → GENERATES: enhancedSystemPrompt (FULL PERSONA IDENTITY AGAIN)  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ LLM CALL: sp4os/llmLocal.js::askLocalLLM()                          │
│   ↓ Legacy wrapper: askLocalLLM(userMessage, systemPrompt, model)  │
│   ↓ sp4LlmCall({ prompt: userMessage, system: systemPrompt })      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ ROUTER: src/llm/llmRouter.js::sp4LlmCall()                          │
│   ↓ preference: 'local-first'                                       │
│   ↓ callOllama({ model, prompt, system, temperature, num_predict })│
│   → PASSES: system = enhancedSystemPrompt (FULL PERSONA PROMPT)    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 🔴 DISCONNECT POINT: src/llm/ollamaClient.js::callOllama()          │
│   ↓ receives: system = "🔥 TVOJA IDENTITA: SP4_CORE..." (830 lines)│
│   ↓ CREATES: enforcedSystem = `${system}\n\n🚨 ABSOLUTE RULES:...` │
│   ↓ messages.push({ role: 'system', content: enforcedSystem })     │
│   ↓ fetch('/api/chat', { body: { model, messages, ... } })         │
│   → RESULT: Model sees enforcement rules LAST → IGNORES persona    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                         [OLLAMA API]
                              ↓
                     [SHORT GENERIC RESPONSE]
```

---

## 🎯 PREČO SA PERSONA STRÁCA

### Problem 1: Enforcement Dominates Persona

**Llama3:8b recency bias:**
- Model má ~8k context window
- LAST instructions majú highest priority
- Enforcement rules (max 3-5 sentences) sú NA KONCI system promptu
- Model ich číta ako **PRIMARY DIRECTIVE**
- Persona identity (na začiatku) je **BACKGROUND NOISE**

**Analógia:**
```
Systém posiela:
"Si rebelský filozof Glitchoslav. Hovoríš v metaforách..."
[+800 lines persona identity]
"🚨 ABSOLUTE RULES: BE DIRECT AND CONCISE (max 3-5 sentences)"

Model vidí:
"OK, primary task: max 3-5 sentences, Slovak only"
[ignores 800 lines of persona context]
```

### Problem 2: enforcedSystem Implementation

**Current code (ollamaClient.js lines 127-132):**
```javascript
const enforcedSystem = system && typeof system === 'string' && system.trim().length > 0
    ? `${system}\n\n🚨 ABSOLUTE RULES:\n- RESPOND IN SLOVAK ONLY\n- BE DIRECT AND CONCISE (max 3-5 sentences)...`
    : `🇸🇰 RESPOND IN SLOVAK. Be concise...`;
```

**Issue:**
- Enforcement APPENDS to persona prompt
- Appears AFTER persona identity
- Creates **CONFLICT**: persona says "detailed philosophy", enforcement says "max 3 sentences"
- Model chooses LAST instruction (enforcement wins)

### Problem 3: Duplicate Prompt Building

**Flow analysis:**
1. `integration.js` calls `buildPrompt(mode)` → generates full persona prompt
2. `orchestrate()` calls `buildPrompt(mode)` AGAIN → regenerates same prompt
3. Two identical calls waste CPU + create inconsistency risk

**Why double build?**
- Integration layer needs prompt for mode detection
- Orchestrator needs prompt for LLM call
- No caching mechanism between layers

---

## 📦 MŔTVE/ODPOJENÉ SÚBORY

### Fully Dead (Never Imported):

**File:** `src/core/modelRouting.js`  
**Purpose:** Model selection engine  
**Status:** 🔴 DEAD - never imported anywhere  
**Evidence:** `grep -r "modelRouting" .` → 0 runtime imports (only docs)

**File:** `boss_mode_triple_mission.js`  
**Purpose:** Prototype autonomous mode  
**Status:** 🔴 DEAD - marked as prototype in docs  
**Evidence:** No imports in main pipeline

**File:** `src/personas/*/validator.*.js`  
**Purpose:** Persona-specific output validation  
**Status:** 🔴 DEAD - validator persona disabled  
**Evidence:** TECHNICAL_REPORT marks validator as "removed from orchestrator"

### Partially Dead (Defined but Unused):

**File:** `agents.js::AGENT_DEFINITIONS`  
**Purpose:** Legacy persona definitions  
**Status:** ⚠️ ZOMBIE - overlaps with `src/personas/*/persona.*.js`  
**Evidence:** Both exist, orchestrator uses `src/personas/` definitions  
**Impact:** Maintenance burden (2 sources of truth for personas)

**File:** `multiVoice.js::buildCouncilView()`  
**Purpose:** Multi-agent council skeleton  
**Status:** ⚠️ ZOMBIE - council mode disabled in orchestrator  
**Evidence:** `useCouncil = false` hardcoded in integration.js:668

---

## ✅ FIX NÁVRH (MINIMÁLNY, ČISTÝ)

### Option 1: PREPEND Enforcement (Recommended) ⭐

**Strategy:** Move enforcement rules to START of system prompt

**File:** `src/llm/ollamaClient.js`  
**Lines:** 127-132

**Change:**
```javascript
// 🔥 v1.3.1 FIX: PREPEND enforcement rules (not append)
// Reasoning: Persona identity should have LAST WORD (recency bias)
const enforcedSystem = system && typeof system === 'string' && system.trim().length > 0
    ? `🇸🇰 JAZYKOVÁ POLITIKA:\n- ODPOVEDAJ VÝHRADNE PO SLOVENSKY\n- Technické termíny OK: API, JSON, LLM, HTTP\n\n━━━━━━━━━━━━━━━━━━━━\n\n${system}\n\n━━━━━━━━━━━━━━━━━━━━\n\n⚠️ CRITICAL: FOLLOW YOUR PERSONA IDENTITY ABOVE. Max 3-5 sentences UNLESS persona requires longer format.`
    : `🇸🇰 RESPOND IN SLOVAK. Follow instructions exactly.`;
```

**Impact:**
- ✅ Persona identity appears LAST → higher priority for model
- ✅ Enforcement still present (language + length guidance)
- ✅ Minimal code change (1 string reorder)
- ✅ No breaking changes to other modules

**Why this works:**
- Llama3:8b reads prompts sequentially
- LAST instructions override earlier ones (recency bias)
- Enforcement becomes **GUIDELINE**, persona becomes **PRIMARY DIRECTIVE**

---

### Option 2: Separate Enforcement Layer (Complex)

**Strategy:** Move enforcement to POST-PROCESSING (not system prompt)

**Files to change:**
- `src/llm/ollamaClient.js` - remove enforcement from system prompt
- `src/core/languageEnforcer.js` - enhance post-processing
- `integration.js` - rely more on post-processing

**Pros:**
- ✅ Clean separation: prompt = identity, post-process = constraints
- ✅ Preserves full persona prompts untouched

**Cons:**
- ❌ More complex (2+ file changes)
- ❌ Relies on post-processing LLM call (slower, costs tokens)
- ❌ Already implemented (languageEnforcer exists), BUT still losing personas

**Verdict:** NOT RECOMMENDED - Option 1 simpler and effective

---

### Option 3: Conditional Enforcement (Persona-Aware)

**Strategy:** Apply enforcement ONLY when persona doesn't have Slovak rules

**File:** `src/llm/ollamaClient.js`

**Change:**
```javascript
// Check if persona already has Slovak enforcement
const hasSkEnforcement = system && system.includes('ODPOVEDAJ IBA PO SLOVENSKY');

const enforcedSystem = system && typeof system === 'string' && system.trim().length > 0
    ? hasSkEnforcement
        ? system // Persona already has enforcement
        : `${system}\n\n🚨 ABSOLUTE RULES: RESPOND IN SLOVAK ONLY`
    : `🇸🇰 RESPOND IN SLOVAK. Be concise.`;
```

**Pros:**
- ✅ Respects personas with explicit Slovak rules (GLITCHOSLAV)
- ✅ Adds enforcement only when needed (CORE, POPIČI)

**Cons:**
- ❌ Still APPENDS enforcement (recency bias issue remains)
- ❌ More complex logic (conditional check)

**Verdict:** PARTIAL FIX - helps but doesn't solve recency bias

---

## 🧪 OVERENIE PO FIXE

### Test Suite (3 tests)

**Test 1: GLITCHOSLAV persona check**
```javascript
// File: test_persona_glitchoslav.js
const userMessage = "Čo je zmysel života?";
const mode = "glitchoslav";

// Expected output:
// - 3-5 viet (GLITCHOSLAV style)
// - Metafory, rúny, filozofia
// - Eastern Slovak hints (možno)
// - Príklad: "Život je glitch v matrixe bytia, bratu. Hľadáš vzor v chaose..."

// Should LOG:
console.log('   Selected persona:', mode); // → "glitchoslav"
console.log('   Engine used:', engine); // → "ollama"
console.log('   System prompt (first 100 chars):', systemPrompt.substring(0, 100));
// → Should start with "🌀 TVOJA IDENTITA: GLITCHOSLAV"
```

**Test 2: CORE persona check**
```javascript
const userMessage = "Ako funguje SP4 memory system?";
const mode = "core";

// Expected output:
// - Technické vysvetlenie (3-5 viet)
// - Bez bullshit-u, jasné kroky
// - Príklad: "SP4 memory má 3 vrstvy: raw log, chapters, seeds. Raw log = všetko..."

// Should LOG:
// → "🔥 TVOJA IDENTITA: SP4_CORE"
```

**Test 3: POPIČI persona check**
```javascript
const userMessage = "Ta daj mi radu, bratu.";
const mode = "popici";

// Expected output:
// - Eastern Slovak slang (ta/bo/šak/kokot)
// - Drsná pravda, humor
// - Príklad: "Ta bratu, pohni riťou. Žiadne rady nepomôžu, ak ty sedíš..."

// Should LOG:
// → "💥 TVOJA IDENTITA: POPIČI KOKOT"
```

### Validation Checks (per test)

**Each test must log:**
1. **Selected persona:** `mode` value from orchestrator
2. **Engine used:** `ollama` | `cloud-fallback` | `cloud-preemptive`
3. **System prompt source:** First 100 chars (verify persona identity header)
4. **Fallback reason:** If cloud fallback triggered, why? (timeout, error, etc.)
5. **Response preview:** First 200 chars of output

**Success criteria:**
- ✅ Persona header matches mode (GLITCHOSLAV for glitch, CORE for core, etc.)
- ✅ Output style matches persona (philosophy vs technical vs slang)
- ✅ No English in output (except technical terms)
- ✅ Response length appropriate for persona (3-5 sentences)

---

## 📊 DIAGNOSTICKÉ COMMANDY

**Quick repo scan:**
```bash
# Find all persona definitions
rg -n "PERSONA|persona\..*\.js|AGENT_DEFINITIONS" sp4_core_agent/

# Find where personas are imported
rg -n "import.*persona|from.*persona" sp4_core_agent/

# Find where buildPrompt is called
rg -n "buildPrompt\(" sp4_core_agent/

# Find where Ollama is called
rg -n "callOllama|askLocalLLM|sp4LlmCall" sp4_core_agent/

# Find enforcement logic
rg -n "enforcedSystem|ABSOLUTE RULES|RESPOND IN SLOVAK" sp4_core_agent/
```

**Live debug:**
```bash
# Enable debug mode
SP4_DEBUG=true node index_v07.js

# Test specific persona
echo "test GLITCHOSLAV" | SP4_DEBUG=true node index_v07.js

# Monitor system prompts
tail -f logs/sp4_debug.log | grep "System prompt"
```

---

## 🎯 PRIORITA RIEŠENIA

**CRITICAL (fix NOW):**
1. ✅ Option 1: PREPEND enforcement rules (ollamaClient.js)
2. ✅ Test all 3 personas (GLITCHOSLAV, CORE, POPIČI)
3. ✅ Verify system prompt ordering in logs

**HIGH (fix soon):**
4. ⚠️ Remove duplicate `buildPrompt()` calls (integration → orchestrator)
5. ⚠️ Cache prompt between integration and orchestrator
6. ⚠️ Add persona validation logging (which prompt used?)

**MEDIUM (cleanup):**
7. 🧹 Remove dead files (modelRouting.js, boss_mode_triple_mission.js)
8. 🧹 Consolidate persona definitions (agents.js vs src/personas/)
9. 🧹 Remove disabled buildCouncilView() code

**LOW (future):**
10. 📚 Document persona prompt injection points
11. 📚 Add persona flow diagram to docs
12. 📚 Create persona testing framework

---

## ✅ STATUS: ROOT CAUSE IDENTIFIED

**Root cause:** `enforcedSystem` APPENDS rules after persona identity → model ignores persona  
**Fix:** PREPEND enforcement rules OR remove enforcement from prompt layer  
**Verification:** Test 3 personas + check system prompt order in logs  
**Deployment:** Change 1 string in ollamaClient.js (lines 127-132)

**Estimated fix time:** 5 minutes  
**Estimated test time:** 10 minutes  
**Risk level:** LOW (single string change, easily revertible)

---

**Signature:** SP4_CORE_AGENT  
**Mission:** PERSONA_SYSTEM_AUDIT_v1 COMPLETE 🔥
