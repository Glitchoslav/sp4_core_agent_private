# 🧪 SP4 OS - Testing Guide (v1.4.2)

## 📋 PowerShell Encoding Setup

**Problem:** PowerShell môže zobrazovať emoji ako "­čôő Ôťů" garbage.

**Solution:** Pred spustením testov nastav UTF-8 encoding:

```powershell
# Set console to UTF-8
chcp 65001

# Set PowerShell output encoding
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
```

**Verify it works:**

```powershell
node test_policy_local_default.js
# Should show: ✅ 🧪 🔒 emojis correctly
```

---

## 🛠️ Working Directory Auto-Correction (v1.4.2)

### Problem: "Cannot find path 'sp4_core_agent/sp4_core_agent'"

**Cause:** Running from wrong directory:

```powershell
# ❌ Common mistake:
cd C:\SP4KULT
node sp4_core_agent/quick_test.js  # ← Fails with nested path error
```

**Solution:** All tests now auto-correct via `scripts/cwdGuard.js`

```javascript
// Automatic in all test files:
import { ensureProjectRoot } from './scripts/cwdGuard.js';
ensureProjectRoot(); // ✅ Auto-fixes CWD if needed
```

**What it does:**

- Detects if you're in `SP4KULT/` (too high) → moves to `sp4_core_agent/`
- Detects if you're in `tests/` (too deep) → moves to project root
- Validates via `package.json` name check

**Manual fix (if needed):**

```powershell
cd C:\SP4KULT\sp4_core_agent  # Always run from project root
node quick_test.js
```

---

## 📋 PowerShell Encoding Setup

## 🚀 Running Tests

### Important: Working Directory

**CRITICAL:** Always run tests from project root (`C:\SP4KULT\sp4_core_agent`).

```powershell
# ✅ If in SP4KULT root:
cd sp4_core_agent

# ✅ If already in sp4_core_agent:
# Do nothing, you're in the right place!

# ❌ NEVER do this:
# cd sp4_core_agent; node test.js  ← WRONG if already in sp4_core_agent
```

### Contract Tests (Fast, Deterministic)

```powershell
# Run tests (assumes you're already in sp4_core_agent):
# Local default policy
node test_policy_local_default.js

# Cloud opt-in policy (contract validation, no real cloud calls)
node test_policy_allow_cloud_contract.js

# Force local policy (precedence test)
node test_policy_force_local_contract.js

# Persona integrity (normalization working)
node test_persona_integrity.js
```

**Expected:** All tests should PASS with clear logs:

- ✅ Green checkmarks for passing validations
- 📊 Policy contract blocks (intent)
- 📊 Execution blocks (reality)

### Smoke Test (Requires API Keys)

```powershell
# CRITICAL: Unset SP4_TEST first (guard prevents false positives)
$env:SP4_TEST = ""

# Run real cloud execution test
node test_cloud_execution_smoke.js
```

**Prerequisites:**

- Ollama running (`ollama serve`)
- `GROQ_API_KEY` or `GOOGLE_API_KEY` set
- Internet connection
- **SP4_TEST must NOT be 'true'** (guard will exit with error)

---

## 🔍 Filtering Test Output

### First 100 Lines (Recommended)

```powershell
node test_policy_local_default.js 2>&1 | Out-String -Stream | Select-Object -First 100
```

### Grep-Style Filtering

```powershell
# Show only critical lines
node test_policy_force_local_contract.js 2>&1 | Select-String -Pattern "(TEST:|POLICY CONTRACT|EXECUTION:|cloudDisabledReason|PASSED|FAILED|TEST SUMMARY)" -Context 0,1
```

### 🔥 v1.4.2: Clean Test Output Filter

**Problem:** Too much noise (debug logs, warnings, internal traces)

**Solution:** Filter for test-relevant lines only:

```powershell
# UTF-8 + filter only test results
chcp 65001
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
node test_sp4_grounding.js 2>&1 | Select-String -Pattern "(TEST:|PASS|FAIL|SUMMARY)"
```

**What it shows:**

- `TEST:` - Test case names
- `✅ PASS` / `❌ FAIL` - Results
- `🏁 SUMMARY` - Final counts

**What it hides:**

- LLM model selection logs
- Prompt building traces
- Memory access logs
- Internal reasoning

### Save to File (Full Output)

```powershell
node test_policy_allow_cloud_contract.js 2>&1 | Out-File -Encoding UTF8 test_output.txt
```

---

## 🧬 Test Structure (v1.4.2)

### Contract Tests

**Purpose:** Validate policy fields (intent), NOT execution.

**Key Validations:**

```javascript
✅ policy.cloudAllowed = true/false     // Policy intent
✅ policy.route = 'autonomous-cloud'    // Routing decision
✅ execution.cloudDisabled = true       // Runtime reality
✅ execution.cloudDisabledReason = 'testMode' | 'policy'
```

**Behavior:**

- `testMode=true` → cloud execution disabled (local_ollama used)
- Validates metadata contract (policy vs execution split)
- Council disabled (deterministic, fast)

### Smoke Tests

**Purpose:** Validate REAL cloud execution (Groq/Google API calls).

**Key Validations:**

```javascript
✅ policy.forceCloud = true             // Force cloud policy
✅ execution.cloudUsed = true           // Actually used cloud
✅ execution.provider = 'cloud_groq'    // Real cloud provider
✅ execution.cloudDisabled = false      // NOT blocked
```

**Behavior:**

- `forceCloud=true` → MUST use cloud (no local fallback)
- SP4_TEST guard prevents false positives
- Validates end-to-end cloud path

---

## 🔥 v1.4.2 Changes Summary

### Honest Logs

```javascript
// BEFORE v1.4.2 (misleading):
🔒 FORCE LOCAL MODE: Cloud AI disabled

// AFTER v1.4.2 (truthful):
🔒 POLICY: Force local mode (cloud execution blocked)  ← policy.forceLocal=true
🧪 TEST MODE: Cloud execution disabled (contract test)  ← testMode=true
```

### Metadata Contract

```javascript
metadata: {
  policy: {
    cloudAllowed: true,      // What policy allowed (intent)
    route: 'autonomous-cloud'
  },
  execution: {
    cloudUsed: false,        // What actually ran (reality)
    cloudDisabled: true,
    cloudDisabledReason: 'testMode'  // Why it didn't run
  }
}
```

### Test Determinism

- **Council OFF in testMode** → 3x faster (45s → 15s)
- **SP4_TEST guard in smoke test** → prevents silent cloud blocking
- **Deduplicated logs** → contract validation printed once per case

---

## 🐛 Troubleshooting

### Issue: Duplicate Test Output (v1.4.2 FIX)

**Symptom:**

```
TEST: "Ako je postavený SP4?"
TEST: "Ako je postavený SP4?"  ← Appears 2-3 times
🏁 === TEST SUMMARY ===
🏁 === TEST SUMMARY ===          ← Duplicate summary
```

**Cause:** Test file executed multiple times (import side-effect + direct call)

**Fix (Applied):** All tests now use ES module guard:

```javascript
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
}
```

**Status:** ✅ Fixed in `test_sp4_grounding.js` (v1.4.2+)

---

### Issue: Memory Counters Don't Update (v1.4.2 FIX)

**Symptom:**

```
✅ Memory log entry added
Total interactions: 0  ← Should be 1+
```

**Cause:** In-memory cache not refreshed after write

**Fix (Applied):**

```javascript
await addLogEntry(user, assistant, mode, metadata);
// 🔥 v1.4.2: Reload memory to refresh counters
const updated = await loadMemory();
console.log(`Total interactions after reload: ${updated.totalInteractions}`);
```

**Status:** ✅ Fixed in `quick_test.js` (v1.4.2+)

---

### Issue: LLM Responds "Ok." (Too Short)

**Symptom:**

```
✅ LLM response: "Ok."  ← Expected longer answer
```

**Cause:**

- Model: `gemma3:1b` (small, terse responses)
- Temperature: 0.3 (low creativity)
- Prompt: "Odpovedz len 'OK'" (literally asks for brevity)

**Status:** ⚠️ NOT A BUG - Expected behavior for quick test

**Optional improvements:**

```javascript
// Option A: Better prompt (forces full sentence)
const response = await askLocalLLM(
  'V jednej vete popíš SP4.',
  { model: 'gemma3:1b', temperature: 0.7, maxTokens: 100 }
);

// Option B: Use bigger model (better Slovak)
const response = await askLocalLLM(
  'Čo je SP4?',
  { model: 'qwen2.5:14b', temperature: 0.7 }
);
```

---

### Issue: Garbage Characters in Output

```powershell
# Run encoding setup again
chcp 65001
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
```

### Issue: Test Hangs on First Run

**Cause:** Ollama loading model (cold start).

**Solution:** Warmup is automatic in v1.4.2+ (silent pre-call before tests).

### Issue: Smoke Test Exits Immediately

```
❌ ERROR: SP4_TEST=true blocks cloud execution!
```

**Solution:** Unset SP4_TEST environment variable:

```powershell
$env:SP4_TEST = ""
# Then run smoke test again
```

### Issue: Tests Fail with "cloudDisabledReason = testMode (expected: policy)"

**Cause:** Priority logic issue (testMode taking precedence over policy.forceLocal).

**Solution:** v1.4.2 fixed this - policy.forceLocal now has priority.

---

## 📊 Expected Test Results (v1.4.2)

```bash
✅ test_policy_local_default.js           3/3 PASSED
✅ test_policy_allow_cloud_contract.js    2/2 PASSED
✅ test_policy_force_local_contract.js    3/3 PASSED
✅ test_persona_integrity.js              3/3 PASSED
⏳ test_cloud_execution_smoke.js          (requires API keys)
```

**Total:** 11/11 contract tests PASSED

---

## 🔒 Test Isolation Rules

1. **Contract tests** run with `testMode=true` → local provider, no cloud calls
2. **Smoke tests** run with `forceCloud=true` → real cloud calls, testMode=false
3. **SP4_TEST=true** blocks cloud → used only in contract tests, NOT smoke tests
4. **Council disabled** in testMode → deterministic, fast execution
5. **Timeout unchanged** (20s) → intentionally hard, reveals flaky behavior

---

## 🧠 Testing Philosophy (v1.4.2)

> **"Testy nemajú simulovať realitu. Testy majú overiť kontrakt."**

- **Contract test** = validates policy fields (intent)
- **Smoke test** = validates execution (reality)
- **Logs must tell truth** = policy ≠ testMode
- **Fail early, fail loud** = guards prevent false positives
- **Determinism first** = council OFF, timeout hard

---

**v1.4.2 - Truth in Logs. Truth in System. 🔥**
