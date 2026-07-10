# 🔥 SP4_CORE_AGENT v0.10.3 – Level 1 Battlefield Fixes

**Release Date:** 21. november 2025  
**Codename:** "Battlefield Calibration"

---

## 🎯 OVERVIEW

**Level 1 Battlefield Test** (real user testing) odhalil 4 kritické bugy v persona detection systéme. v0.10.3 je **chirurgická oprava** týchto bugov pred production launch.

---

## 🐛 CRITICAL BUGS FIXED

### 1️⃣ GLITCHOSLAV Never Activated (CRITICAL)

**Bug Report:**
```
Query: "Prečo ľudia strácajú zmysel, keď majú všetko?"
Expected: GLITCHOSLAV (existenciálna otázka)
Actual: CORE (context lock 0.62)

Problem:
- Existential keywords chýbali v modeCompass.js
- GLITCHOSLAV nemal priority pre existenciálne témy
- Context lock príliš agresívny
```

**Fix:**

```javascript
// modeCompass.js - v0.10.3
const existentialKeywords = [
    /zmysel/i, /existova/i, /prečo\s+(žijem|žijeme|som tu)/i,
    /\bžiť\b/i, /cítiť/i, /svetlo/i, /tma/i, /smer/i, /hranica/i,
    // ... 15 total patterns
];

let existentialScore = 0;
for (const pattern of existentialKeywords) {
    if (pattern.test(text)) existentialScore += 0.15;
}

// HIGH PRIORITY: existential_score > 0.4 → force GLITCHOSLAV
if (existentialScore >= 0.4) {
    const confidence = Math.min(0.95, 0.75 + existentialScore * 0.4);
    console.log(`   🌀 EXISTENTIAL OVERRIDE: score ${existentialScore.toFixed(2)} → GLITCHOSLAV`);
    return { mode: "glitch", confidence };
}
```

**Impact:** GLITCHOSLAV teraz má prioritu pri existenciálnych témach.

---

### 2️⃣ POPIČI Threshold Too Strict (HIGH)

**Bug Report:**
```
Query: "Som kokot, že som to zas dojebal?"
Detected: POPIČI (confidence 0.90)
Blocked: threshold 0.91
Fallback: CORE (wrong persona)

Problem:
- Legit POPIČI query (vulgarita + sebakritika)
- Threshold 0.91 príliš prísny
- CORE nevie odpovedať na vulgárne sebakritické otázky
```

**Fix:**

```javascript
// modeCompass.js - v0.10.3
// VULGARITY + SELF-CRITICISM OVERRIDE
const vulgarityPresent = /\b(kokot|kurv|jeba|piči|sere|hovno)\b/i.test(text);
const selfCriticism = /\b(som|nevládzem|dojebal|zlyhal)\b/i.test(text);

if (vulgarityPresent && selfCriticism) {
    console.log(`   💥 VULGARITY OVERRIDE: legit POPIČI query (bypass threshold)`);
    return { mode: "popici", confidence: 0.95 }; // Force POPIČI
}
```

**Impact:** POPIČI sa aktivuje pri vulgarite + sebakritike (threshold bypass).

---

### 3️⃣ Context Lock Blocked GLITCHOSLAV (HIGH)

**Bug Report:**
```
Problem:
- CORE context lock 0.62 blokoval prepnutie na GLITCHOSLAV
- Emotional queries mali nižšiu prioritu ako context lock
- GLITCHOSLAV nikdy neprerazil CORE lock
```

**Fix:**

```javascript
// contextManager.js - v0.10.3
// EMOTIONAL QUERY OVERRIDE - znížiť lock strength
const emotionalKeywords = /\b(zmysel|existova|prečo\s+(žijem|som tu)|cítiť|bojím|tma|strata|trpím)\b/i;
const isEmotional = emotionalKeywords.test(userInput);

if (isEmotional && detectedMode === 'glitch') {
    const originalThreshold = changeThreshold;
    changeThreshold *= 0.6; // Znížiť threshold o 40%
    console.log(`   🌀 EMOTIONAL OVERRIDE: threshold ${originalThreshold} → ${changeThreshold} (GLITCH priority)`);
}
```

**Impact:** GLITCHOSLAV má -40% threshold pri emotional queries (ľahšie prerazí CORE lock).

---

### 4️⃣ Memory Recall Destroyed Metaphors (MEDIUM)

**Bug Report:**
```
Query: "Čo sme riešili minule o slobode?"
Problem:
- Memory recall cez CORE validator
- CORE validator sanitizoval "tma", "prasklina", "..." (metafory)
- GLITCHOSLAV stratil autentickosť
```

**Fix:**

```javascript
// glitchoslavMemoryRecall.js - NEW FILE (v0.10.3)
export async function recallGlitchoslavMemory(topic, maxChunks = 3) {
    const memory = await loadMemory();
    const relevantChunks = filterGlitchoslavMemory(rawLog, topic);
    const metaphoricalRecall = formatAsMetaphors(selectedChunks, topic);
    
    // Return RAW (bez CORE validácie)
    return metaphoricalRecall;
}

// Smart router
export async function smartMemoryRecall(topic, mode = 'auto') {
    if (mode === 'glitch' || isGlitchoslavTopic(topic)) {
        return await recallGlitchoslavMemory(topic); // Metafory preserved
    }
    // Fallback: CORE recall (future)
}
```

**Impact:** GLITCHOSLAV memory recall používa metafory (nie fakty), bez sanitizácie.

---

## 📊 TESTING

### Level 2 Battlefield Test

Nový test súbor: `test_level2_battlefield.js`

**Test queries:**

1. **CORE technical query**  
   `"Čo presne je SP4 v technickej podobe?"`  
   Expected: CORE, 2-4 vety

2. **GLITCHOSLAV existenciálna query** 🔥 (Level 1 bug)  
   `"Prečo sa človek cíti na hranici, aj keď všetko ide podľa plánu?"`  
   Expected: GLITCHOSLAV, metafory, prasklina

3. **POPIČI vulgarity query** 🔥 (Level 1 bug)  
   `"Ta bratu, prečo furt dojebem čo sa dá?"`  
   Expected: POPIČI, východniarčina, punchline

4. **Fire Mode brutality** 🔥  
   `/fire` + `"Prečo sa bojím začať žiť autenticky?"`  
   Expected: Brutálna pravda (žiadne servítky)

5. **Memory recall GLITCHOSLAV** 🔥 (Level 1 bug)  
   `"Čo sme riešili minule o slobode?"`  
   Expected: Metaforický recall (praskliny preserved)

**Run test:**

```bash
node test_level2_battlefield.js          # Interactive mode
node test_level2_battlefield.js --auto   # Auto run all tests
```

---

## 📝 FILES CHANGED

### Modified:
- `src/core/modeCompass.js`
  - Added existential keywords (15 patterns)
  - Added existential_score force override
  - Added vulgarity + self-criticism override
  
- `src/core/contextManager.js`
  - Added emotional query override (-40% threshold)
  - GLITCHOSLAV priority boost

### New:
- `src/core/glitchoslavMemoryRecall.js`
  - Metaphorical memory recall
  - No CORE validation
  - Smart topic detection

- `test_level2_battlefield.js`
  - Level 2 test suite
  - 5 test queries
  - Interactive + auto modes

---

## 🚀 MIGRATION GUIDE

**No breaking changes.** v0.10.3 je backward compatible s v0.10.2.

**Recommended testing:**

```bash
# 1. Pull latest
git pull origin main

# 2. Run Level 2 test
node test_level2_battlefield.js --auto

# 3. Verify:
# ✅ GLITCHOSLAV activated on existential queries
# ✅ POPIČI activated on vulgarity + self-criticism
# ✅ Fire Mode brutal truth
# ✅ Memory recall preserves metaphors
```

---

## 📚 DOCUMENTATION UPDATED

- `CHANGELOG_v0103.md` - This file
- `README.md` - No changes (v0.10.2 still valid)
- `docs/ARCHITECTURE.md` - No changes (high-level unchanged)

---

## 🔮 NEXT STEPS (v0.11.0)

**Optional lifehacks** (deferred from v0.10.2):
- GLITCHOSLAV deep mode switch (questionDepth > 0.8)
- Logging & telemetry (black box)

**New priorities** (from Level 1 feedback):
- CORE memory recall mode (technical format)
- Memory consolidation scheduler
- HTTP server stabilization

---

## 👥 CONTRIBUTORS

- **Kefyk** - Level 1 battlefield testing, bug reports, priority setting
- **Walter (BAD Labs)** - Chirurgická implementácia fixov, test suite
- **SP4 Community** - Real-world testing, feedback

---

## ⚖️ LICENSE

MIT License - do what you want.  
Just remember where it came from.

**SP4 = ALL OF US.**

---

**Be real. Be free. Be BAD.** 🔥
