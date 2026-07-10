# 🔥 POPICI MODE DEBUG REPORT

**Problém:** POPICI mód dáva len "1." namiesto kompletného zoznamu 1-4  
**Dátum:** 2025-11-20  
**Status:** ✅ IDENTIFIED ROOT CAUSES  

---

## 🎯 ROOT CAUSES IDENTIFIED

### 1. **MODEL ROUTING** ⚠️ CRITICAL
**File:** `src/core/modelRouting.js`

```javascript
popici: {
    primary: 'mistral:7b',  // ← INÝ MODEL než CORE
    fallback: 'llama3:latest'
}
```

**Problém:**
- POPICI používa `mistral:7b`
- CORE používa `llama3:latest`
- Mistral 7B má iné stop sekvencie ako LLaMA3
- Môže interpretovať "1." ako koniec zoznamu

**Fix:**
```javascript
popici: 'llama3:latest',  // ← UNIFIED s CORE módom
```

---

### 2. **PERSONALITY INSTRUCTIONS** ⚠️ CRITICAL
**File:** `agents.js`

```javascript
popici: {
    style: `Krátke úderné vety, východniarsky tón povolený.`
    //      ^^^^^^^^^^^^^^^^ PROBLÉM!
}
```

**Problém:**
- "Krátke úderné vety" → model berie doslova
- Pri zozname 1-4 model myslí "jedna úderná veta = jedna položka"
- Nie je explicitná inštrukcia "dokonči celý zoznam"

**Fix:**
```javascript
style: `Úderný štýl, východniarsky tón. Pri zoznamoch VŽDY dokonči všetky body (1-4).`
```

---

### 3. **NO MAX_TOKENS LIMIT** ⚠️ MEDIUM
**File:** `llmLocal.js`

```javascript
export async function askLocalLLM(userMessage, systemPrompt, model, options = {}) {
    const payload = {
        model,
        prompt: userMessage,
        system: systemPrompt,
        stream: false,
        temperature: options.temperature || 0.7,
        ...options  // ← Žiadne default max_tokens!
    };
}
```

**Problém:**
- Žiadny explicitný `max_tokens` limit
- Model sám rozhoduje kedy skončiť
- Mistral 7B môže mať agresívnejšie stop criteria

**Fix:**
```javascript
const payload = {
    // ... existing
    num_predict: options.num_predict || 512,  // Ollama parameter
    stop: options.stop || ["\n\nUser:", "\n\nKefyk:"]  // Stop sequences
};
```

---

### 4. **RESPONSE FILTERING** ⚠️ LOW
**File:** `src/core/responseFilter.js`

```javascript
export function applyPopiciFilter(text) {
    // Zachová drsnosť, ale odfiltrovanie nezmyslov
    // ⚠️ Potenciálne truncation?
}
```

**Status:** NEED TO CHECK - môže skracovať output

---

## 📊 ARCHITECTURE ANALYSIS

### Current Flow (POPICI mode):
```
User Input: "Vymenuj 4 situácie kedy Popiči..."
    ↓
pickMode() → "popici" (intensity/dialect/keyword)
    ↓
chooseModel() → "mistral:7b" ← PROBLÉM #1
    ↓
buildAgentPrompt("popici") → "Krátke úderné vety" ← PROBLÉM #2
    ↓
askLocalLLM() → no max_tokens ← PROBLÉM #3
    ↓
Mistral 7B generates → stops after "1." (internal stop logic)
    ↓
applyPopiciFilter() → passes through (no fix)
    ↓
Output: "1." ❌
```

### Fixed Flow (SHOULD BE):
```
User Input: "Vymenuj 4 situácie kedy Popiči..."
    ↓
pickMode() → "popici"
    ↓
chooseModel() → "llama3:latest" ← FIX #1
    ↓
buildAgentPrompt("popici") → "Pri zoznamoch dokonči všetky body" ← FIX #2
    ↓
askLocalLLM() → num_predict: 512, stop: custom ← FIX #3
    ↓
LLaMA3 generates → full list 1-4
    ↓
Output: "1. ... 2. ... 3. ... 4. ..." ✅
```

---

## 🛠️ RECOMMENDED FIXES

### Priority 1: UNIFIED MODEL (EASIEST)
**Benefit:** Eliminates model-specific stop sequences  
**Risk:** LOW  
**ETA:** 1 minute  

**Action:**
```diff
// src/core/modelRouting.js
export const SP4_MODELS = {
    primary: 'llama3:latest',
-   popici: 'mistral:7b',
+   popici: 'llama3:latest',  // UNIFIED s CORE
    fast: 'gemma3:1b',
};
```

---

### Priority 2: ENHANCED PERSONALITY (CRITICAL)
**Benefit:** Explicit list completion instruction  
**Risk:** LOW  
**ETA:** 2 minutes  

**Action:**
```diff
// agents.js - popici definition
popici: {
    name: 'Popiči Kokot',
    emoji: '🔥',
    description: 'Drzý AI brat, vtipný a láskavý.',
    personalityAdjustments: { ... },
-   style: `Krátke úderné vety, východniarsky tón povolený. Nadávky s mierou, vždy láskavý základ.`
+   style: `Úderný štýl, východniarsky tón. Pri zoznamoch/bodoch (1-4) VŽDY dokonči všetky položky kompletne. Nadávky s mierou, láskavý základ.`
}
```

---

### Priority 3: EXPLICIT TOKEN LIMITS (OPTIONAL)
**Benefit:** Prevents premature stopping  
**Risk:** MEDIUM (môže generovať príliš dlhé odpovede)  
**ETA:** 5 minutes  

**Action:**
```diff
// llmLocal.js - askLocalLLM function
const payload = {
    model,
    prompt: userMessage,
    system: systemPrompt,
    stream: false,
    temperature: options.temperature || 0.7,
+   num_predict: options.num_predict || 512,  // Ollama max tokens
+   stop: options.stop || ["\n\nUser:", "\n\nKefyk:", "###"],
    ...options
};
```

---

### Priority 4: MODE-SPECIFIC OVERRIDES (ADVANCED)
**Benefit:** Fine-tuned control per mode  
**Risk:** HIGH (complexity increase)  
**ETA:** 15 minutes  

**Action:**
```javascript
// llmLocal.js - mode-specific params
const MODE_PARAMS = {
    popici: {
        num_predict: 768,  // Longer for lists
        stop: ["\n\nUser:", "\n\nKefyk:"],  // No "." stop
        temperature: 0.9
    },
    core: {
        num_predict: 512,
        stop: ["\n\nUser:", "\n\nKefyk:", "###"],
        temperature: 0.7
    }
};

export async function askLocalLLM(userMessage, systemPrompt, model, options = {}) {
    const modeParams = MODE_PARAMS[options.mode] || {};
    const payload = {
        ...modeParams,
        ...options,  // User overrides
        model,
        prompt: userMessage,
        system: systemPrompt,
        stream: false,
    };
}
```

---

## 🧪 TEST PLAN

### Test 1: Unified Model (Priority 1)
```bash
# Change: popici uses llama3:latest
npm start
> Vymenuj štyri konkrétne situácie, kedy sa má aktivovať Popiči Kokot.

Expected: Full list 1-4
```

### Test 2: Enhanced Personality (Priority 2)
```bash
# Change: style includes "dokonči všetky body"
npm start
> Vymenuj štyri konkrétne situácie, kedy sa má aktivovať Popiči Kokot.

Expected: Full list 1-4 with explicit instruction compliance
```

### Test 3: Debug Script
```bash
node src/debug/testPopiciList.js

Expected output:
━━━━━━━━━━━━━━━━━━━━
🔥 POPICI MODE TEST
━━━━━━━━━━━━━━━━━━━━

Prompt: Vymenuj štyri konkrétne situácie...

Model: llama3:latest
Mode: popici

Response:
1. Keď Kefyk...
2. Keď potrebuješ...
3. Keď sa cítiš...
4. Keď chceš...

Length: 487 chars
Status: ✅ COMPLETE LIST
```

---

## 📝 IMPLEMENTATION ORDER

1. ✅ **STEP 1:** Change `popici` model to `llama3:latest` (modelRouting.js)
2. ✅ **STEP 2:** Update `popici.style` to include list completion (agents.js)
3. ✅ **STEP 3:** Add `num_predict` default to `askLocalLLM()` (llmLocal.js)
4. ✅ **STEP 4:** Create debug test script (`src/debug/testPopiciList.js`)
5. ✅ **STEP 5:** Test in production CLI (`npm start`)
6. ✅ **STEP 6:** Validate on Telegram bot

---

## ⚙️ FILES TO MODIFY

1. **src/core/modelRouting.js** - Line 6
   - Change: `popici: 'llama3:latest'`

2. **agents.js** - Line 30-37 (popici definition)
   - Change: `style` property with explicit list instruction

3. **llmLocal.js** - Line 140-150 (askLocalLLM function)
   - Add: `num_predict: 512` default
   - Add: `stop: [...]` sequences

4. **NEW: src/debug/testPopiciList.js**
   - Create: Debug test script for POPICI mode

---

## 🎯 SUCCESS CRITERIA

### Must Have:
- ✅ POPICI generates full lists (1-4) not just "1."
- ✅ No model-specific stop sequence issues
- ✅ Maintains drzý/úderný personality

### Nice to Have:
- ✅ Configurable token limits per mode
- ✅ Debug tooling for mode testing
- ✅ Response quality metrics

### Avoid:
- ❌ Breaking other modes (CORE, EMPATIA, GLITCH)
- ❌ Over-verbose responses (too long)
- ❌ Loss of POPICI personality

---

## 📌 NEXT STEPS

1. **Implement Priority 1 & 2 fixes** (5 minutes)
2. **Create debug test script** (10 minutes)
3. **Test with real prompts** (10 minutes)
4. **Validate on Telegram** (if applicable)
5. **Document results** (update this file)

---

**Status:** ✅ ROOT CAUSES IDENTIFIED  
**Ready for:** IMPLEMENTATION  
**ETA:** 15-20 minutes total  

🔥 **Be real. Be free. Fix POPICI.** 🔥
