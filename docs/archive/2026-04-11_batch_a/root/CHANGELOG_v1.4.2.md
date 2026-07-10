# 🔥 CHANGELOG - SP4_CORE_AGENT v1.4.2

> Historical release note for `v1.4.2`.
> Current runtime version source of truth is `src/version.js`, which currently resolves to `v1.4.0`.

## [1.4.2] - 2026-01-31 - POLICY/EXECUTION CLARITY PATCH

### 🎯 MISSION: Policy Intent vs Execution Reality Separation

**Priority:** HIGH (Truth in Logs)  
**Status:** ✅ COMPLETE (FINAL POLISH DONE)  
**Tests:** 11/11 PASSED  

---

## 🧠 **Core Philosophy: Honest Logs = Honest System**

v1.4.2 addresses **zavádzajúce logy** - rozdeľuje POLICY (čo systém dovolil) od EXECUTION (čo reálne bežalo).

**Before v1.4.2:**

```
🔒 FORCE LOCAL MODE: Cloud AI disabled
```

→ **PROBLEM**: Tento log sa zobrazoval aj keď `testMode=true` (nie `forceLocal`).

**After v1.4.2:**

```
🔒 POLICY: Force local mode (cloud execution blocked)  ← len pri policy.forceLocal=true
🧪 TEST MODE: Cloud execution disabled (contract test)  ← len pri testMode=true
```

→ **SOLUTION**: Každý log hovorí pravdu o svojom zdroji.

---

## ✅ **Changes**

### 1️⃣ Honest Logs (integration.js lines 255-269)

**Principle:** Log má hovoriť pravdu. Nie "FORCE LOCAL MODE" keď ide o testMode.

```javascript
// 🔥 v1.4.2: HONEST LOGS - Separate policy vs execution
if (policy.forceLocal) {
  console.log('🔒 POLICY: Force local mode (cloud execution blocked)');
}
if (testMode && !policy.forceLocal) {
  console.log('🧪 TEST MODE: Cloud execution disabled (contract test - local provider OK)');
}
if (testMode) {
  console.log('🧪 TEST MODE: Minimal pipeline (orchestration disabled, direct persona LLM)');
}
```

**Impact:**

- ✅ `forceLocal=true` → "POLICY: Force local"
- ✅ `testMode=true` (bez forceLocal) → "TEST MODE: Cloud execution disabled"
- ✅ Žiadne klamstvá v logoch

---

### 2️⃣ Metadata Contract: Policy vs Execution (integration.js lines 1828-1858)

**Principle:** Metadata musia rozlíšiť ÚMYSEL (policy) od REALITY (execution).

```javascript
// 🔥 v1.4.2: UNIFIED METADATA CONTRACT
const unifiedMetadata = {
  // === POLICY RESULT (intent from policy.js) ===
  policy: {
    cloudAllowed: true/false,        // Policy dovolila cloud?
    forceLocal: true/false,          // Hard local constraint?
    forceCloud: true/false,          // Hard cloud constraint?
    route: 'autonomous-cloud' | 'force-local' | 'local-first',
    reason: 'cloud-allowed-explicit' | 'force-local-test' | ...
  },
  
  // === EXECUTION RESULT (runtime reality) ===
  execution: {
    cloudUsed: true/false,           // Reálne použil cloud?
    provider: 'local_ollama' | 'cloud_groq' | ...,
    cloudDisabled: true/false,       // Zakázaný runtime?
    cloudDisabledReason: 'policy' | 'testMode' | null
  },
  
  // === LEGACY COMPAT (deprecated v1.4.2) ===
  provider: ...,  // Use execution.provider
  cloudAllowed: ..., // Use policy.cloudAllowed
  policyReason: ..., // Use policy.reason
  route: ... // Use policy.route
}
```

**Priority Logic (CRITICAL):**

```javascript
// 🔥 v1.4.2: PRIORITY - policy.forceLocal takes precedence over testMode
const cloudDisabledByPolicy = policy.forceLocal || (!policy.allowCloud && !policy.forceCloud);
const cloudDisabledByTest = testMode && !policy.forceCloud && !cloudDisabledByPolicy;

execution.cloudDisabledReason = cloudDisabledByPolicy ? 'policy' : (cloudDisabledByTest ? 'testMode' : null);
```

**Benefit:**

- ✅ Jasne vidieť: "policy allowed, but testMode blocked execution"
- ✅ Debugging: `policy.cloudAllowed=true && execution.cloudUsed=false → check cloudDisabledReason`
- ✅ Audit trail: Who/what blocked cloud execution?

---

### 3️⃣ Council Disabled in TestMode (integration.js lines 754-765)

**Principle:** Testy musia byť **deterministické** a **rýchle**. Council pridáva non-determinism + 3s loading time.

```javascript
// 🔥 v1.4.2: Bypass council in testMode (deterministic tests)
const bypassCouncil = testMode || options.bypassCouncil;

if (bypassCouncil) {
  console.log('   🧪 TEST MODE: Council disabled (direct persona LLM call)');
} else if (this._councilActivated) {
  console.log('   ⚠️  Council already activated in this request - skipping duplicate');
} else {
  console.log('\n🎭 Multi-Agent Council: 3 voices activated\n');
  this._councilActivated = true;
}
```

**Impact:**

- ✅ Test run time: ~45s → ~15s (3x rýchlejšie)
- ✅ Deterministické výsledky (no council voting chaos)
- ✅ Jasné logy: "Council disabled" vs "Council activated"

---

### 4️⃣ SP4_TEST Guard in Smoke Test (test_cloud_execution_smoke.js lines 23-32)

**Principle:** Smoke test má testovať **reálne cloud** execution. Ak `SP4_TEST=true`, cloud je tichо zablokovaný → test klame.

```javascript
// 🔥 v1.4.2: GUARD - Prevent SP4_TEST from silently blocking cloud
if (process.env.SP4_TEST === 'true') {
    console.error('❌ ERROR: SP4_TEST=true blocks cloud execution!');
    console.error('   This smoke test requires REAL cloud calls.');
    console.error('   Unset SP4_TEST before running:');
    console.error('   \n   $env:SP4_TEST=""; node test_cloud_execution_smoke.js\n');
    process.exit(1);
}
```

**Benefit:**

- ✅ Prevents false positives (test says "PASSED" but no cloud call happened)
- ✅ Clear error message with fix instructions
- ✅ CI/CD safety (fail early, fail loud)

---

### 5️⃣ Updated Test Assertions (all policy tests)

**Updated files:**

- `test_policy_allow_cloud_contract.js` - checks `policy.cloudAllowed` + `execution.cloudDisabled`
- `test_policy_force_local_contract.js` - validates `cloudDisabledReason='policy'` (not 'testMode')
- `test_cloud_execution_smoke.js` - validates `execution.cloudUsed=true` + `execution.provider='cloud_*'`

**Example (cloud contract test):**

```javascript
// 🔥 v1.4.2: Validate NEW metadata contract
const policy = result.metadata?.policy || result.meta?.policy;
const execution = result.metadata?.execution || result.meta?.execution;

const checks = [
  {
    name: 'policy.cloudAllowed = true (policy intent)',
    pass: policy?.cloudAllowed === true
  },
  {
    name: 'execution.cloudDisabled = true (testMode)',
    pass: execution?.cloudDisabled === true
  },
  {
    name: 'execution.cloudDisabledReason = testMode',
    pass: execution?.cloudDisabledReason === 'testMode'
  }
];
```

**Benefit:**

- ✅ Testy validujú správnu vec (policy intent vs execution reality)
- ✅ Jasné failure messages: "Expected policy, got testMode"
- ✅ Self-documenting: Test assertion = systém dokumentácia

---

## 🧪 **Test Results (v1.4.2)**

```bash
# Contract Tests (policy validation, testMode blocks cloud)
✅ test_policy_allow_cloud_contract.js    2/2 PASSED
   - policy.cloudAllowed = true
   - execution.cloudDisabled = true (testMode)
   - execution.provider = local_ollama

✅ test_policy_force_local_contract.js    3/3 PASSED
   - policy.forceLocal = true
   - execution.cloudDisabled = true (policy)  ← PRIORITY CORRECT
   - execution.cloudDisabledReason = 'policy' (not 'testMode')

✅ test_policy_local_default.js           3/3 PASSED
   - policy.cloudAllowed = false
   - execution.provider = local_ollama

✅ test_persona_integrity.js              3/3 PASSED
   - No "unknown persona: glitch" errors
   - Normalization working

# Smoke Test (real cloud execution)
⏳ test_cloud_execution_smoke.js          (requires API keys, manual run)
   - Validates execution.cloudUsed = true
   - Validates execution.provider = cloud_*
   - Has SP4_TEST guard (blocks false positives)
```

**Summary:** 11/11 contract tests PASSED, smoke test ready with guard.

---

## 📦 **Files Changed (v1.4.2)**

### Core Logic

- ✅ `integration.js` (lines 255-269, 754-765, 1828-1858)
  - Honest logs (policy vs testMode)
  - Council bypass in testMode
  - New metadata contract (policy + execution objects)

### Test Suite

- ✅ `test_policy_allow_cloud_contract.js` - updated assertions (v1.4.2 metadata)
- ✅ `test_policy_force_local_contract.js` - updated assertions + cloudDisabledReason priority
- ✅ `test_cloud_execution_smoke.js` - added SP4_TEST guard

### Scripts

- ✅ `package.json` - added `test:policy:force:local` script

---

## 🔮 **Future Work (Roadmap)**

### PHASE 3: Accuracy Strategy (Hybrid Local/Cloud)

**Concept:** Tech accuracy via cloud opt-in (low confidence + allowCloud=true → cloud provider)

**Not implemented in v1.4.2** (by design - needs careful capability detector tuning).

```javascript
// Future: autonomousController.js - PHASE 1 expansion
if (analysis.requiresTechAccuracy && policy.allowCloud && analysis.confidence < 0.7) {
  strategy.reasoning.push('⚡ Low confidence + tech query → cloud provider');
  strategy.brain = 'cloud';
  strategy.provider = 'groq';
}
```

**Benefit:** Local-first stays default, cloud only when accuracy critical + user allowed.

---

## 🎯 **Key Principles (v1.4.2)**

1. **Logy musia hovoriť pravdu**
   - "POLICY" = rozhodnutie policy.js
   - "TEST MODE" = sandbox override
   - Nie "FORCE LOCAL MODE" keď ide o testMode

2. **Metadata = úmysel vs realita**
   - `policy.*` = čo systém dovolil
   - `execution.*` = čo reálne bežalo
   - Jasné: "policy allowed, testMode blocked"

3. **Testy = kontrakty, nie simulácie**
   - Contract test = validuje policy fields
   - Smoke test = validuje real execution
   - Council OFF v testMode (deterministickosť)

4. **Fail early, fail loud**
   - SP4_TEST guard v smoke teste
   - Jasné error messages s fix instructions
   - Žiadne false positives

5. **Priority hierarchia**
   - `policy.forceLocal` > `testMode`
   - `cloudDisabledReason` = primary dôvod (policy, potom testMode)

---

## 🔥 **v1.4.2 - Truth in Logs. Truth in System.**

**Before:** "FORCE LOCAL MODE" (ale testMode)  
**After:** "TEST MODE: Cloud execution disabled (contract test)"

**Before:** `cloudAllowed=true`, provider='local_ollama' (WTF?)  
**After:** `policy.cloudAllowed=true`, `execution.cloudDisabled=true`, `cloudDisabledReason='testMode'` (CLEAR!)

**Before:** Council loading model... (v testoch, 3s delay)  
**After:** "TEST MODE: Council disabled" (instant)

**Result:** Systém, ktorému sa dá veriť. 🔥🧠✅

---

## 🧪 **v1.4.2 Refinements (Post-Implementation)**

### Encoding Fix (PowerShell)

**Problem:** Emoji zobrazované ako "­čôő Ôťů" garbage v PowerShell.

**Solution:** UTF-8 encoding setup v `README.md` a `docs/TESTING_GUIDE.md`:

```powershell
chcp 65001
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
```

### Deduplicated Logs

**Problem:** Contract validation block sa vypísal viackrát v jednom test case.

**Solution:** Comment "Print validation results only once per test case" v test files.

### Warmup Helper (Optional)

**File:** `test_warmup_helper.js`

**Purpose:** Minimize first-test cold start (Ollama loading model).

**Behavior:**

- Silent warmup call (`warmupOllama()`)
- If fails, continues (doesn't block tests)
- Timeout unchanged (intentionally hard to reveal flaky behavior)

**Usage:**

```javascript
import { warmupOllama } from './test_warmup_helper.js';
await warmupOllama(); // Before first test case (optional)
```

### Testing Guide

**File:** `docs/TESTING_GUIDE.md`

**Contents:**

- PowerShell encoding setup
- Running contract vs smoke tests
- Filtering test output
- Test structure explanation (v1.4.2)
- Troubleshooting common issues
- Expected results (11/11 PASSED)

### Updated RELEASE_CHECKLIST

**File:** `RELEASE_CHECKLIST.md`

**Changes:**

- v1.4.2 gate tests (policy contract tests)
- PowerShell encoding instructions
- Smoke test with SP4_TEST guard warning
- Legacy tests still functional

---

## 📦 **v1.4.2 Complete Deliverables**

### Core Logic (3 files)

- ✅ `integration.js` - honest logs, council bypass, metadata contract
- ✅ `src/policy/policy.js` - policy priorities (unchanged, validated)
- ✅ `autonomousController.js` - forceCloud enforcement (unchanged, validated)

### Test Suite (5 files)

- ✅ `test_policy_allow_cloud_contract.js` - v1.4.2 metadata assertions
- ✅ `test_policy_force_local_contract.js` - v1.4.2 metadata + priority test
- ✅ `test_policy_local_default.js` - existing (compatible with v1.4.2)
- ✅ `test_cloud_execution_smoke.js` - SP4_TEST guard
- ✅ `test_persona_integrity.js` - existing (validates normalization)

### Documentation (4 files)

- ✅ `CHANGELOG_v1.4.2.md` - complete changelog (this file)
- ✅ `docs/TESTING_GUIDE.md` - comprehensive testing guide
- ✅ `README.md` - encoding fix instructions
- ✅ `RELEASE_CHECKLIST.md` - v1.4.2 gate tests

### Helpers (1 file)

- ✅ `test_warmup_helper.js` - optional warmup (minimizes cold start)

### Scripts

- ✅ `package.json` - added `test:policy:force:local` script

**Total:** 14 files modified/created

---

## 🎯 **v1.4.2 Validation Results**

```bash
✅ test_policy_local_default.js           3/3 PASSED
✅ test_policy_allow_cloud_contract.js    2/2 PASSED
✅ test_policy_force_local_contract.js    3/3 PASSED
✅ test_persona_integrity.js              3/3 PASSED
```

**Total:** 11/11 contract tests PASSED (100%)

**Key Achievements:**

- ✅ Honest logs (policy vs testMode separation)
- ✅ Metadata contract (intent vs reality split)
- ✅ Deterministic tests (council OFF, 3x faster)
- ✅ Safety guards (SP4_TEST check in smoke test)
- ✅ Priority logic (policy.forceLocal > testMode)
- ✅ PowerShell encoding (emoji čitateľné)
- ✅ Deduplicated logs (contract printed once)
- ✅ **FINAL POLISH:**
  - Supervisor test-mode awareness (no false alarms)
  - cloudDisabledReason enum builder (consistency)
  - One-line case summaries (grep-friendly)

---

## 🔧 **v1.4.2 FINAL POLISH (2026-01-31)**

**Goal:** Production readiness - clean logs, consistent enums, grep-friendly output

### A) Supervisor Test-Mode Awareness

**Problem:** Test errors logged as system incidents

**Solution:** `supervisor.js` detectError() checks SP4_TEST

```javascript
if (isTestMode && error === 'Test error') {
  console.log('🧪 TEST: Supervisor injected error (expected)');
}
```

**Result:** Test errors no longer trigger false alarms

### B) cloudDisabledReason Enum Builder

**Problem:** Hardcoded strings in 3+ places

**Solution:** Centralized builder with priority order

```javascript
const getCloudDisabledReason = () => {
  if (policy.forceLocal) return 'policy';
  if (testMode && !policy.forceCloud) return 'testMode';
  // Future: 'budget', 'missingKey', 'providerDown'
  return null;
};
```

**Enum:** `'policy'` | `'testMode'` | `'budget'` | `'missingKey'` | `'providerDown'` | `null`

### C) One-Line Case Summaries

**Problem:** 6-8 line validation blocks hard to grep

**Solution:** Single-line summary per test case

```
✅ CASE SUMMARY: route=force-local cloudAllowed=false cloudUsed=false cloudDisabledReason=policy provider=local_ollama
```

**Grep usage:**

```powershell
node test_policy_force_local_contract.js | Select-String "CASE SUMMARY"
```

**Files Modified (Final Polish):**

1. supervisor.js - test-mode awareness
2. integration.js - enum builder
3. test_policy_force_local_contract.js - summaries
4. test_policy_allow_cloud_contract.js - summaries
5. CHANGELOG_v1.4.2.md - documentation

**Total v1.4.2:** 19 files (core + refinement + polish)

- One-line case summaries (grep-friendly)

---
