# 🚀 SP4 RELEASE CHECKLIST v1.4.2

**PURPOSE:** Protect production stability. Every PR/commit MUST pass this gate before merge.

---

## 🧪 PowerShell Encoding Setup (v1.4.2)

**BEFORE running tests in PowerShell:**

```powershell
chcp 65001
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
```

**Why:** Prevents emoji garbage ("­čôő Ôťů"). See `docs/TESTING_GUIDE.md` for details.

---

## 📋 RELEASE GATE TESTS (v1.4.2)

### ✅ REQUIRED (Blocking)

These tests MUST pass 100% before any release:

```bash
# Contract tests (policy validation)
node test_policy_local_default.js
node test_policy_allow_cloud_contract.js
node test_policy_force_local_contract.js
node test_persona_integrity.js
```

**Expected Results:**

```
✅ test_policy_local_default.js           3/3 PASSED
✅ test_policy_allow_cloud_contract.js    2/2 PASSED
✅ test_policy_force_local_contract.js    3/3 PASSED
✅ test_persona_integrity.js              3/3 PASSED
```

**Total:** 11/11 PASSED (100%)

**Key Validations (v1.4.2):**

1. **Policy vs Execution Separation**
   - `metadata.policy.*` = intent (cloudAllowed, forceLocal, route)
   - `metadata.execution.*` = reality (cloudUsed, provider, cloudDisabled)

2. **Honest Logs**
   - "POLICY: Force local" (policy.forceLocal=true)
   - "TEST MODE: Cloud execution disabled" (testMode=true)

3. **Deterministic Execution**
   - Council disabled in testMode (3x faster)
   - Timeout unchanged (20s hard limit, reveals flaky behavior)

4. **Priority Logic**
   - `cloudDisabledReason = 'policy'` when policy.forceLocal=true
   - `cloudDisabledReason = 'testMode'` when testMode=true (and no policy block)

**ACCEPTANCE CRITERIA:**

- All 4 tests: 11/11 PASSED (100%)
- Execution time: < 60s total (with v1.4.2 council bypass)
- No "cloudDisabledReason" priority failures
- Persona normalization working (no "unknown persona: glitch")

---

### ⚠️ SMOKE TEST (Cloud Execution - Requires API Keys)

**CRITICAL:** This test makes REAL cloud API calls.

```powershell
# MUST unset SP4_TEST first (guard prevents false positives)
$env:SP4_TEST = ""

# Run cloud execution smoke test
node test_cloud_execution_smoke.js
```

**Prerequisites:**

- Ollama running (`ollama serve`)
- `GROQ_API_KEY` or `GOOGLE_API_KEY` set
- Internet connection
- **SP4_TEST must NOT be 'true'** (guard will exit with error)

**Expected:**

```
✅ policy.forceCloud = true (intent)
✅ execution.cloudUsed = true (reality)
✅ execution.provider = cloud_groq OR cloud_google
✅ execution.cloudDisabled = false
```

**NOTE:** Smoke test is OPTIONAL for release (requires API keys, internet).

---

### 🏃 LEGACY TESTS (Pre-v1.4.2)

```bash
npm run test:gate     # Old gate tests (metadata, persona, enforcer)
npm run test:smoke    # Old smoke test (forceLocal health check)
```

**Status:** Still functional, but v1.4.2 policy tests are more comprehensive.

---

## 🚨 PRODUCTION SAFETY RULES (v1.4.2)

### 1. Test Mode Protection

**Rule:** `SP4_TEST=true` MUST NOT run in `NODE_ENV=production`

**Implementation:**

```javascript
// integration.js - Production safety guard
if (process.env.NODE_ENV === 'production' && process.env.SP4_TEST === 'true') {
  console.error('🚨 CRITICAL: SP4_TEST=true detected in NODE_ENV=production!');
  console.error('   Forcing SP4_TEST=false for safety.');
  process.env.SP4_TEST = 'false';
}
```

**Rationale:**

- TEST MODE uses minimal pipeline (bypasses orchestration)
- TEST MODE uses reduced token generation (256 vs 4096)
- TEST MODE has aggressive timeouts (20s vs 90s)
- These optimizations are ONLY safe for deterministic tests, NOT live users

### 2. Local-First Default

**Rule:** Production MUST default to local Ollama unless explicitly allowed

**Options:**

```javascript
// Force local (hard disable cloud)
{ forceLocal: true }

// Allow cloud routing (opt-in)
{ allowCloud: true }

// Bypass autonomous controller
{ bypassAutonomous: true }

// Test mode (minimal pipeline)
{ testMode: true }
```

**Default behavior:**

- `allowCloud: false` (unless explicitly set)
- Autonomous controller can propose cloud, but MUST respect `allowCloud` flag

---

## 📊 TEST METRICS BASELINE

**Stable Performance Targets (SP4_TEST=true):**

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Total execution time | < 60s | ~37s | ✅ |
| Metadata contract | 4/4 | 4/4 | ✅ |
| Persona integrity | 3/3 | 3/3 | ✅ |
| Enforcer scenarios | 3/3 | 3/3 | ✅ |
| Smoke test | 6/6 | 6/6 | ✅ |
| Ollama timeout rate | < 10% | ~0% | ✅ |

---

## 🔄 CI/CD INTEGRATION

### GitHub Actions Example

```yaml
name: SP4 Release Gate

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

jobs:
  test-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run release gate tests
        run: npm run test:gate
        env:
          SP4_TEST: 'true'
      
      - name: Run smoke test
        run: npm run test:smoke
```

---

## 🚦 RELEASE DECISION TREE

```
┌─────────────────────────────┐
│ npm run test:gate           │
└─────────────┬───────────────┘
              │
              ├─ PASS (10/10) ─┐
              │                 │
              └─ FAIL ──────────┼─► ❌ BLOCK RELEASE
                                │
                                ▼
              ┌─────────────────────────────┐
              │ npm run test:smoke          │
              └─────────────┬───────────────┘
                            │
                            ├─ PASS (6/6) ─┐
                            │               │
                            └─ FAIL ────────┼─► ⚠️ INVESTIGATE
                                            │
                                            ▼
              ┌─────────────────────────────────┐
              │ Manual verification:            │
              │ - Ollama healthy?               │
              │ - Recent code changes reviewed? │
              │ - Production env vars set?      │
              └─────────────┬───────────────────┘
                            │
                            ├─ ALL GOOD ───┐
                            │               │
                            └─ ISSUES ──────┼─► ⚠️ FIX FIRST
                                            │
                                            ▼
                            ┌───────────────────┐
                            │ ✅ APPROVED       │
                            │    Deploy to prod │
                            └───────────────────┘
```

---

## 📝 RELEASE NOTES TEMPLATE

```markdown
## SP4 v1.3.x Release

**Release Date:** YYYY-MM-DD

### ✅ Test Results
- Metadata contract: 4/4 PASSED
- Persona integrity: 3/3 PASSED
- Enforcer scenarios: 3/3 PASSED
- Smoke test: 6/6 PASSED
- Total execution time: XXs

### 🔧 Changes
- [List changes here]

### 🐛 Known Issues
- [List any known issues]

### 📊 Performance
- Ollama timeout rate: X%
- Average latency: XXXms
- Fallback rate: X%
```

---

## 🆘 TROUBLESHOOTING

### Test Gate Fails

1. **Check Ollama health:**

   ```bash
   ollama list
   curl http://localhost:11434/api/tags
   ```

2. **If `cross-env` not recognized:**

   ```bash
   npm install -D cross-env
   ```

   **Alternative (Windows without cross-env):**

   ```bash
   npm run test:gate:win
   ```

3. **Run tests individually:**

   ```bash
   node test_metadata_contract.js
   node test_persona_integrity.js
   SP4_TEST=true node test_enforcer_scenario.js
   ```

4. **Check for infrastructure issues:**
   - Look for `INFRA_OLLAMA_TIMEOUT` in logs
   - Check if tests fail with "AbortError" or "ETIMEDOUT"
   - Verify Ollama model loaded: `ollama ps`

5. **Review recent code changes:**
   - Did orchestration logic change?
   - Did metadata contract change?
   - Did persona definitions change?

### Smoke Test Fails

1. **Quick diagnostic:**

   ```bash
   node test_smoke.js
   ```

2. **Check logs for:**
   - `EMPTY_RESPONSE_GUARD` activation
   - `handledBy="unknown"` (metadata loss)
   - High English ratio (> 20%)

3. **Verify environment:**

   ```bash
   echo $NODE_ENV
   echo $SP4_TEST
   echo $SP4_ALLOW_CLOUD
   ```

---

## 📚 RELATED DOCUMENTATION

- **Architecture:** `docs/ARCHITECTURE_v1.0.md`
- **Identity Bible:** `docs/SP4_IDENTITY_BIBLE.md`
- **Copilot Directives:** `docs/SP4_COPILOT_DIRECTIVES.md`
- **Test Strategy:** This document

---

**Last Updated:** 2026-01-31
**Maintained By:** SP4 Core Team
