# 🇸🇰 LANGUAGE ENFORCEMENT FIX - Summary

**Dátum:** 2025-11-20  
**Status:** ✅ IMPLEMENTED  
**Problém:** Agent odpovedal po anglicky napriek slovenskému vstupu  
**Riešenie:** Slovak-first policy s explicitnou výnimkou pre EN requesty  

---

## 🎯 ČO SA ZMENILO

### 1. **multiVoice.js** - Posilnená jazyková politika v core layer

**Súbor:** `multiVoice.js`  
**Funkcia:** `buildCoreLayer()`  
**Riadky:** ~78-125  

**Pridané:**
```javascript
🚨🚨🚨 ABSOLÚTNE KRITICKÉ - JAZYKOVÁ POLITIKA 🚨🚨🚨

PRIMÁRNY JAZYK: SLOVENČINA (SK)

TVRDÉ PRAVIDLÁ (PORUŠENIE = CHYBA):
1. Ak vstup je SLOVENSKY → odpovedaj VÝHRADNE PO SLOVENSKY
2. Ak vstup je ANGLICKY → odpovedaj VÝHRADNE PO SLOVENSKY (preložíš si otázku)
3. VÝNIMKA: Ak vstup obsahuje EXPLICITNÝ request:
   "reply in English" / "odpíš po anglicky" / "translate to English"
   → iba vtedy môžeš odpovedať po anglicky

PRÍKLADY SPRÁVNEHO SPRÁVANIA:
✅ "Čo je SP4?" → odpoveď po slovensky
✅ "What is SP4?" → odpoveď PO SLOVENSKY (nie po anglicky!)
✅ "Kto si?" → odpoveď po slovensky
✅ "Who are you?" → odpoveď PO SLOVENSKY
✅ "Tell me about SP4. Reply in English." → odpoveď po anglicky (explicitný request)

❌ ZAKÁZANÉ:
- Odpovedať po anglicky na anglickú otázku BEZ explicitného requestu
- Miešať slovenčinu + angličtinu v jednej odpovedi
- Používať "I'm SP4_CORE_AGENT" namiesto "Som SP4_CORE_AGENT"
```

**Dôvod:** LLM potrebuje explicitné príklady ✅/❌ namiesto abstraktných pravidiel

---

### 2. **languageSanitizer.js** - Soft detection namiesto hard replacement

**Súbor:** `languageSanitizer.js`  
**Funkcia:** `quickSanitize()`  
**Pridané:** Detection + monitoring namiesto automatických náhrad

**Pred:**
```javascript
if (enMatches >= 8 && skMarks <= 1 && wordCount >= 20) {
    console.warn('   ⚠️ Detekovaná prevažne anglická odpoveď (učí sa...)');
    // NENAHRADÍME - ponecháme originál
}
return out; // string
```

**Po:**
```javascript
if (enMatches >= 8 && skMarks <= 1 && wordCount >= 20) {
    console.warn('   ⚠️ Detekovaná prevažne anglická odpoveď (monitorujem...)');
    console.warn(`      EN words: ${enMatches}, SK diacritics: ${skMarks}, total words: ${wordCount}`);
    return { text: out, isEnglish: true, stats: { enMatches, skMarks, wordCount } };
}

return { text: out, isEnglish: false, stats: { enMatches, skMarks, wordCount } };
```

**Dôvod:** Monitoring namiesto tichého zlyhávania, pripravené na budúce rozšírenia (re-run LLM s lepším promptom)

---

### 3. **languageSanitizer.js** - Helper funkcie

**Súbor:** `languageSanitizer.js`  
**Pridané funkcie:**

```javascript
/**
 * Detekuje, či užívateľ explicitne požiadal o anglickú odpoveď
 */
export function hasExplicitEnglishRequest(input) {
  const lowerInput = input.toLowerCase();
  
  const enRequests = [
    'reply in english',
    'respond in english',
    'answer in english',
    'odpíš po anglicky',
    'odpovedz po anglicky',
    'translate to english',
    'preloť do angličtiny',
    'in english please',
    'po anglicky prosím'
  ];
  
  return enRequests.some(req => lowerInput.includes(req));
}

/**
 * Detekuje jazyk vstupu (sk/en/mixed)
 */
export function detectInputLanguage(input) {
  const commonEn = /(\b(the|and|of|to|in|is|that|with|as|for|which|who|are|on|this|from|by|an|be|it|was|at|or|we|you|have|has|will)\b)/gi;
  const enMatches = (input.match(commonEn) || []).length;
  
  const skDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi;
  const skMarks = (input.match(skDiacritics) || []).length;
  
  const wordCount = input.split(/\s+/).filter(Boolean).length;
  
  if (enMatches >= 5 && skMarks === 0 && wordCount >= 5) {
    return 'en';  // Prevažne anglický vstup
  }
  
  if (enMatches >= 3 && skMarks >= 1) {
    return 'mixed';  // Zmiešaný vstup
  }
  
  return 'sk';  // Default: slovenský
}
```

**Použitie:** Budúce rozšírenia pre dynamické language routing

---

### 4. **src/debug/testLanguageEnforcement.js** - Test suite (NOVÝ SÚBOR)

**Súbor:** `src/debug/testLanguageEnforcement.js`  
**Účel:** Automatizované testovanie language enforcement  
**Test cases:** 8 scenárov

**Test cases:**
1. ✅ Slovak input → Slovak output
2. ✅ Slovak input (identity) → Slovak output
3. ⚠️ English input WITHOUT explicit request → Slovak output **(očakáva SK, testuje policy)**
4. ✅ English input WITH explicit request → English output
5. ✅ Slovak input WITH explicit EN request → English output
6. ✅ Mixed input → Slovak output
7. ⚠️ English greeting WITHOUT request → Slovak output **(očakáva SK, testuje policy)**
8. ✅ Technical question in SK → Slovak output

**Spustenie:**
```bash
node src/debug/testLanguageEnforcement.js
```

**Očakávaný výstup:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🇸🇰 LANGUAGE ENFORCEMENT TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 TEST 1/8: Slovak input → Slovak output
Input: "Čo je SP4?"
Expected language: SK
...
✅ PASS - Output matches expected language (SK)

[... 8 tests ...]

📊 TEST SUMMARY
Total tests: 8
✅ Passed: 8 (100%)
❌ Failed: 0 (0%)

🎉 ALL TESTS PASSED! Language enforcement working correctly.
```

---

## 📊 OČAKÁVANÉ SPRÁVANIE

### Scenár 1: Slovak input
```
Input:  "Čo je SP4?"
Output: "SP4 je komunita založená na pravde, slobode a tvorbe..."
✅ Po slovensky
```

### Scenár 2: English input BEZ requestu
```
Input:  "What is SP4?"
Output: "SP4 je komunita založená na pravde, slobode a tvorbe..."
✅ Po slovensky (preložil si otázku!)
```

### Scenár 3: English input S requestom
```
Input:  "What is SP4? Reply in English."
Output: "SP4 is a community based on truth, freedom and creativity..."
✅ Po anglicky (explicitný request)
```

### Scenár 4: Mixed input
```
Input:  "Ako funguje SP4 system a jeho architecture?"
Output: "SP4 systém je postavený na multi-agent architektúre..."
✅ Po slovensky
```

---

## 🛠️ TECHNICKÁ IMPLEMENTÁCIA

### Prečo prompt engineering namiesto post-processingu?

**Pred (zlé):**
```javascript
// Post-processing replacement
if (isEnglish(output)) {
  output = translateToSlovak(output);  // ❌ Quality loss
}
```

**Teraz (dobré):**
```javascript
// Prompt-level enforcement
const prompt = `
🚨 TVRDÉ PRAVIDLÁ:
1. Ak vstup je ANGLICKY → odpovedaj PO SLOVENSKY
2. Výnimka: "reply in English" → môžeš EN

PRÍKLADY:
✅ "What is SP4?" → odpoveď PO SLOVENSKY
❌ "What is SP4?" → EN odpoveď (CHYBA!)
`;
```

**Dôvody:**
1. **Kvalita:** LLM generuje priamo v správnom jazyku, nie cez translation
2. **Kontext:** LLM rozumie otázke a odpovie prirodzene
3. **Flexibilita:** Môže použiť tech termíny (API, JSON) kde potrebuje
4. **Učenie:** Model sa naučí pattern z príkladov ✅/❌

---

## 🧪 TESTOVANIE

### Manuálne testovanie (CLI):
```bash
npm start

> Čo je SP4?
# Očakávaná odpoveď: PO SLOVENSKY

> What is SP4?
# Očakávaná odpoveď: PO SLOVENSKY (nie EN!)

> What is SP4? Reply in English.
# Očakávaná odpoveď: PO ANGLICKY (explicitný request)
```

### Automatizované testovanie:
```bash
node src/debug/testLanguageEnforcement.js
```

**Metriky:**
- Pass rate: cieľ 100% (8/8 testov)
- Test coverage: SK input, EN input, mixed input, explicit request
- Duration: ~2-3 min (8 LLM calls @ ~20s each)

---

## 📝 SÚBORY ZMENENÉ

### Modifikované súbory (2):
1. **multiVoice.js**
   - Funkcia: `buildCoreLayer()`
   - Zmena: Pridaná 🚨 jazyková politika s explicitnými príkladmi
   - Riadky: ~78-125

2. **languageSanitizer.js**
   - Funkcia: `quickSanitize()` - zmenený return type (object namiesto string)
   - Funkcia: `sanitizeSlovak()` - backward compatibility wrapper
   - Pridané: `hasExplicitEnglishRequest(input)`
   - Pridané: `detectInputLanguage(input)`
   - Riadky: ~5-50

### Nové súbory (1):
3. **src/debug/testLanguageEnforcement.js**
   - Test suite pre language enforcement
   - 8 test cases
   - Auto-validation
   - Riadky: ~150

---

## 🔮 BUDÚCE ROZŠÍRENIA

### Fáza 1: Re-run na EN detection (voliteľné)
```javascript
// integration.js - processMessage()
const { text, isEnglish } = quickSanitize(response);

if (isEnglish && !hasExplicitEnglishRequest(userMessage)) {
  console.warn('⚠️ EN output detected, re-running with stronger prompt...');
  
  const retryPrompt = buildPrompt({
    mode,
    userMessage,
    state,
    extraDirectives: '🚨 KRITICKÉ: Odpoveď MUSÍ byť po slovensky! Preložil si otázku do SK a odpovedal po SK.'
  });
  
  response = await askLocalLLM(userMessage, retryPrompt.systemPrompt, model);
}
```

**Pros:** Automatická korekcia bez user friction  
**Cons:** 2x LLM calls (slower), vyššia cena  

### Fáza 2: MythoMax validator (už implementované v languageSanitizer.js)
```javascript
// Ak je dostupný MythoMax (lepší Slovak support)
const refined = await refineSlovakText(response, mode);
```

**Pros:** Lepšia kvalita slovenčiny  
**Cons:** Potrebuje MythoMax model (ollama pull mythomax:13b)  

---

## ✅ CHECKLIST

- [x] **multiVoice.js** - Pridaná Slovak-first policy s príkladmi
- [x] **languageSanitizer.js** - Soft detection namiesto hard replacement
- [x] **languageSanitizer.js** - Helper funkcie (hasExplicitEnglishRequest, detectInputLanguage)
- [x] **testLanguageEnforcement.js** - Automatizovaný test suite (8 testov)
- [x] **POPICI truncation** - Vyriešené (POPICI_FIX_SUMMARY.md)
- [ ] **Manuálne testovanie** - Spustiť CLI a overiť správanie
- [ ] **Automatizované testovanie** - Spustiť test suite
- [ ] **Git commit** - Commit zmeny s popisným message

---

## 🎯 COMMIT MESSAGE

```
fix(language): Enforce Slovak-first policy with explicit EN exception

CHANGES:
- multiVoice.js: Added 🚨 language policy with ✅/❌ examples in buildCoreLayer()
- languageSanitizer.js: Changed quickSanitize() to return {text, isEnglish, stats}
- languageSanitizer.js: Added hasExplicitEnglishRequest() + detectInputLanguage()
- testLanguageEnforcement.js: Created test suite (8 cases)

POLICY:
1. Slovak input → Slovak output (always)
2. English input → Slovak output (unless explicit "reply in English")
3. Mixed input → Slovak output

EXAMPLES:
✅ "Čo je SP4?" → SK response
✅ "What is SP4?" → SK response (translates question)
✅ "What is SP4? Reply in English." → EN response (explicit request)

TEST SUITE:
- 8 test cases covering SK/EN/mixed input
- Auto-validation of output language
- Usage: node src/debug/testLanguageEnforcement.js

Related: POPICI truncation fix (POPICI_FIX_SUMMARY.md)
```

---

## 🏁 ZÁVER

**Pôvodný problém:**
- ❌ POPICI truncation (len "1." namiesto zoznamu 1-4)
- ❌ English output napriek Slovak input

**Riešenie:**
- ✅ POPICI truncation: Unified model (llama3:latest), enhanced personality
- ✅ Language enforcement: Slovak-first policy s explicitnou EN výnimkou

**Status:**
- POPICI: ✅ FIXED (1/4 tests PASS s SK output, 3/4 FAIL kvôli EN)
- Language: ✅ IMPLEMENTED (čaká na testovanie)

**Next steps:**
1. Spustiť `node src/debug/testLanguageEnforcement.js`
2. Overiť pass rate (cieľ: 8/8 = 100%)
3. Ak < 100%: Ďalšie posilnenie promptu
4. Git commit + push

---

*Be real. Be free. Speak Slovak.* 🇸🇰🔥
