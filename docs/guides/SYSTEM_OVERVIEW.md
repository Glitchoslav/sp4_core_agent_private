# SP4_CORE_AGENT v0.8.0 - System Overview

## 📋 Základné Informácie

**Názov:** SP4_CORE_AGENT  
**Verzia:** v0.8.0 (BAD Labs Edition)  
**Typ:** Lokálny offline AI asistent  
**Backend:** Ollama (localhost:11434)  
**Primárny jazyk:** Slovenčina  
**CLI:** index_v07.js  

---

## 🏗️ Architektúra - Súborová Štruktúra

```
sp4_core_agent/
├── index_v07.js              // CLI interface (384 lines)
├── integration.js            // SP4IntegratedAgent class (567 lines)
├── multiVoice.js             // System prompt builder (343 lines)
├── llmLocal.js               // Ollama komunikácia
├── memory.js                 // Pamäťový systém
├── memoryLayers.js           // Hierarchická pamäť (Seeds, Chapters)
├── rituals.js                // Príkazy (/mirror, /today, /trinity)
├── backup.js                 // Zálohovanie
├── scheduler.js              // Cron jobs (konsolidácia)
├── languageSanitizer.js      // Slovenská sanitácia + detekcia EN
├── emotionalProcessor.js     // Emocionálna analýza
├── supervisor.js             // Error monitoring
├── gracefulDegradation.js    // Fallback systém
├── identity.js               // Identity manager
├── fieldTactics.js           // Taktické moduly
│
├── src/
│   ├── core/
│   │   ├── contextManager.js        // Agent locking (v0.7)
│   │   ├── dialectAnalyzer.js       // Východoslovenská detekcia
│   │   ├── modeCompass.js           // Automatická detekcia módu
│   │   ├── intensityDetection.js    // Intenzita emócií
│   │   ├── quickAnalyzer.js         // Hybrid analyzer (50-100x rýchlejší)
│   │   ├── personas/
│   │   │   ├── popici.js            // POPIČI persona
│   │   │   ├── glitch.js            // Glitchoslav persona
│   │   │   ├── core.js              // SP4_CORE persona
│   │   │   └── empatia.js           // Empatia persona
│   │   └── sp4Core.js               // Core hodnoty
│   │
│   └── engine/
│       ├── integration.js           // Multi-agent orchestration
│       ├── memory.js                // Memory triggers (embeddings)
│       ├── relationship.js          // Relationship tracking
│       ├── prediction.js            // Predictive modeling
│       └── synthesis.js             // Response synthesis
│
└── data/
    ├── memory.json                  // Hlavná pamäť (7442 lines)
    ├── identity.json                // Identity profil
    └── backups/                     // Časové kapsuly
```

---

## 🔧 Hlavné Komponenty

### 1. **CLI Interface** (`index_v07.js`)

**Funkcia:** Interaktívne rozhranie pre používateľa  
**Vstupný bod:** `node index_v07.js`

**Hlavné funkcie:**
- `init()` - Inicializácia systému, agent.initialize(), scheduler
- `showBanner()` - Úvodná obrazovka
- `showHelp()` - Zobrazenie príkazov
- Event loop na `rl.on('line')` - Spracovanie user inputu

**Príkazy:**
```javascript
/help       - Nápoveda
/status     - Stav systému
/mode <x>   - Prepnutie módu (auto, core, popici, empatia, glitch, human)
/context    - Context manager stav
/unlock     - Force unlock context manager
/backup     - Záloha pamäte
/profile    - Profil užívateľa
/mirror     - Reflexia (3 dni default)
/today      - Denný rituál
/next       - Ďalší krok
/seeds      - Kľúčové momenty
/trinity    - 3 perspektívy
/goal       - Správa cieľov
/exit       - Ukončenie
```

**Flow:**
1. Načítanie pamäte (`loadMemory()`)
2. Detekcia módu (`pickMode()` z modeCompass)
3. Build prompt (`buildPrompt()` z multiVoice)
4. Agent call (`agent.ask(userMessage, {mode, systemPrompt})`)
5. Uloženie do `memory.json` → `rawMemory.log[]`

---

### 2. **SP4IntegratedAgent** (`integration.js`)

**Funkcia:** Hlavný orchestrátor, multi-agent council, processing pipeline

**Kľúčové metódy:**

#### `async initialize()`
- Inicializuje identity manager
- Načíta memory
- Vykoná identity audit
- Spustí supervisor monitoring
- Nastaví `this.initialized = true`

#### `async processMessage(userMessage, mode = 'core')`
**Processing Pipeline (9 krokov):**

```javascript
// KROK 1: Validácia inicializácie
if (!this.initialized) throw new Error('Agent nie je inicializovaný');

// KROK 2: Mode detection (ak mode === 'auto')
const detectedMode = pickMode(userMessage);

// KROK 3: Emotional analysis
const emotionalAnalysis = this.emotionalProcessor.analyzeMessage(userMessage);

// KROK 4: Capability level (FULL, REDUCED, SAFE)
const capabilityLevel = this.supervisor.determineCapability();

// KROK 5: Model selection
const selectedModel = selectModel(mode, 'reasoning', emotionalAnalysis.dominantEmotion);

// KROK 6: Memory check
const memoryCheck = await loadMemory();

// KROK 7: Memory triggers (semantic search - embeddings)
const triggeredMemories = await retrieveRelevantMemories(userMessage, memoryCheck, 3);

// KROK 8: Multi-Agent Council
// Simple query → single agent (quick response)
// Complex query → full council deliberation (CORE, POPICI, GLITCH, EMPATIA)

// KROK 9: Post-processing
// - Language sanitization (quickSanitize)
// - Repetition detection
// - Memory save
```

#### `async ask(userMessage, options = {})`
**Wrapper pre index_v07.js kompatibilitu**

```javascript
async ask(userMessage, options = {}) {
  const result = await this.processMessage(userMessage, options.mode || 'auto');
  if (result.success) {
    return typeof result.response === 'string' ? result.response : String(result.response);
  } else {
    return 'Prepáč, vyskytla sa chyba. Skús to prosím znova.';
  }
}
```

---

### 3. **Multi-Voice System** (`multiVoice.js`)

**Funkcia:** Generovanie system promptov pre rôzne módy

#### Hlavné funkcie:

**`buildPrompt({mode, state, userMessage, extraDirectives})`**
- Auto mode detection (`analyzeMode()`)
- Zostavenie finálneho promptu
- Return object: `{systemPrompt, userMessage, mode, modeAnalysis, meta}`

**`buildSystemPrompt(mode, state, extraDirectives, userMessage)`**
- Kompozícia 5 vrstiev:
  1. `buildCoreLayer()` - Jazyková politika + identita Kefyk
  2. `buildAgentLayer(profile)` - Agent mód (CORE/POPICI/GLITCH/EMPATIA)
  3. `buildStyleLayer(mode)` - Persona-specific prompt
  4. `buildContextLayer(state)` - Vzťah, emócie, capability
  5. `buildSafetyLayer(state, extraDirectives)` - Bezpečnostné pravidlá

#### Vrstvy promptu:

**1. Core Layer - Jazyková politika:**
```
🚨 ABSOLÚTNE KRITICKÉ - JAZYKOVÁ POLITIKA 🚨

PRIMÁRNY JAZYK: SLOVENČINA (SK)

TVRDÉ PRAVIDLÁ:
1. SK vstup → SK odpoveď
2. EN vstup → SK odpoveď (preložíš otázku)
3. VÝNIMKA: "reply in English" → EN povolená

PRÍKLADY:
✅ "What is SP4?" → odpoveď PO SLOVENSKY
✅ "Tell me about SP4. Reply in English." → EN OK

❌ ZAKÁZANÉ:
- Odpovedať EN bez explicitného requestu
- Miešať SK + EN
```

**2. Agent Layer - Profil:**
```javascript
const AGENT_PROFILES = {
  core: { name: "SP4_CORE", emoji: "🔥", style: "vyvážený, praktický" },
  popici: { name: "POPIČI", emoji: "💥", style: "drzý východniar, max 2 vety" },
  empatia: { name: "EMPATIA", emoji: "❤️", style: "empatický, podporujúci" },
  glitch: { name: "GLITCHOSLAV", emoji: "🌀", style: "mystický, metaforický" }
};
```

**3. Style Layer - Persona prompt:**
- POPICI: `src/core/personas/popici.js` (max 2 vety, východniarčina)
- GLITCH: `src/core/personas/glitch.js` (metafory, symboly)
- CORE: `src/core/personas/core.js` (praktický, pravdivý)
- EMPATIA: `src/core/personas/empatia.js` (empatie, podpora)

**4. Context Layer:**
```javascript
Vzťah: ${relationshipStage}
Emócia: ${currentMood} (intensity: ${intensity})
Capability: ${capabilityLevel}
```

**5. Safety Layer:**
- Graceful degradation pravidlá
- Zakázané témy (ak existujú)
- Extra directives

---

### 4. **Ollama Communication** (`llmLocal.js`)

**Funkcia:** Low-level komunikácia s Ollama API

#### Model Registry:
```javascript
const MODEL_REGISTRY = {
  reasoning: {
    primary: "llama3:latest",
    fallback: "gemma3:1b"
  },
  creative: {
    primary: "mistral:7b",
    fallback: "llama3:8b"
  },
  validation: {
    primary: "mythomax:13b",  // Slovak validator (voliteľný)
    fallback: null
  }
};
```

#### Model Routing (mode-specific):
```javascript
const MODEL_ROUTING = {
  core: "llama3:latest",
  popici: "llama3:latest",  // Pôvodne mistral:7b (zjednotené)
  empatia: "llama3:latest",
  glitch: "llama3:latest"
};
```

#### Hlavné funkcie:

**`async askLocalLLM(systemPrompt, userMessage, options = {})`**
```javascript
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: options.model || 'llama3:latest',
    prompt: userMessage,
    system: systemPrompt,
    stream: false,
    options: {
      temperature: options.temperature || 0.7,
      num_predict: options.num_predict || 512,
      stop: options.stop || []
    }
  })
});
```

**`async getModelRegistry()`**
- Fetchne dostupné modely z Ollama
- Return: `{available: [...], unavailable: [...]}`

**`selectModel(mode, taskType, emotionalState)`**
- Inteligentný výber modelu podľa kontextu
- TaskType: `reasoning`, `creative`, `validation`
- EmotionalState: `neutral`, `sad`, `angry`, `happy`

---

### 5. **Memory System** (`memory.js`, `memoryLayers.js`)

#### Štruktúra `memory.json`:
```json
{
  "userProfile": {
    "id": "kefyk",
    "name": "Kefyk",
    "language": "sk",
    "style": "popici-filozof",
    "generation": "1994",
    "identity": "SP4 founder, firefighter, chaos survivor",
    "tags": ["SP4", "firefighter", "creator", "rebel"]
  },
  
  "sp4Context": {
    "manifest": "SP4 je iskra v človeku, ktorý odmieta skapat v klietke",
    "philosophy": "be real. be free.",
    "vision": "AI ako spojenie človeka a jeho života"
  },
  
  "preferences": {
    "defaultMode": "auto",
    "maxLogEntries": 200,
    "shortReplies": false,
    "allowVulgar": true
  },
  
  "rawMemory": {
    "log": [
      {
        "ts": "2025-11-16T12:09:33.787Z",
        "mode": "core",
        "input": "User message",
        "reply": "Agent response",
        "metadata": {
          "tags": ["general"],
          "emotion": {...},
          "context": {...}
        }
      }
    ]
  },
  
  "relationship": {
    "stage": "Stranger",
    "metrics": {
      "interactionCount": 289,
      "trustLevel": 0.3,
      "engagementScore": 0.5
    }
  },
  
  "notes": [],
  "goals": [],
  "seeds": []
}
```

#### Memory Layers (hierarchická pamäť):

**1. Raw Log** (`rawMemory.log[]`)
- Všetky konverzácie (timestamped)
- Max entries: 200 (rolling window)

**2. Summaries** (kompresované zhrnutia)
- AI-generated summaries každých 50 interakcií

**3. Chapters** (veľké periódy)
- Týždenné/mesačné kapitoly
- Kľúčové témy, progress

**4. Seeds** (kľúčové momenty)
- Manuálne `/seed <text>` príkaz
- Automatická detekcia breakthrough momentov

**5. Triggers** (aktivačné prahy)
- Varovania pri zmienke konkrétnych tém
- Semantický search (embeddings)

#### Funkcie:

**`async loadMemory()`**
- Načíta `data/memory.json`
- Validuje štruktúru
- Return memory object

**`async saveMemory(mem)`**
- Atomický zápis do `data/memory.json`
- Backup pred zápisom

**`async retrieveRelevantMemories(query, memory, topK = 3)`**
- Sentence transformers (all-MiniLM-L6-v2)
- Cosine similarity search
- Return top K matches

**`getProfileSummary()`**
- Zhrnutie profilu pre prompt injection

---

### 6. **Language Sanitizer** (`languageSanitizer.js`)

**Funkcia:** Detekcia angličtiny, czechizmy removal, language enforcement

#### Hlavné funkcie:

**`quickSanitize(text)`** → `{text, isEnglish, stats}`
```javascript
// Czechism removal
const czechisms = {
  'ú': ['účet', 'účast'],  // Ignore these
  'mluvit': 'hovoriť',
  'jste': 'ste',
  'mně': 'mne'
};

// English detection
const commonEn = /\b(the|and|of|to|in|is|that|with)\b/gi;
const enMatches = (text.match(commonEn) || []).length;
const skDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi;
const skMarks = (text.match(skDiacritics) || []).length;

// Threshold: >= 8 EN words, <= 1 SK diacritic, >= 20 total words
if (enMatches >= 8 && skMarks <= 1 && wordCount >= 20) {
  return { text: fallbackMessage, isEnglish: true, stats: {...} };
}

return { text: sanitized, isEnglish: false, stats: {...} };
```

**`hasExplicitEnglishRequest(input)`**
```javascript
const enRequests = [
  'reply in english',
  'respond in english',
  'odpíš po anglicky',
  'translate to english',
  'in english please'
];
return enRequests.some(req => input.toLowerCase().includes(req));
```

**`detectInputLanguage(input)`** → `'sk'` | `'en'` | `'mixed'`
```javascript
const enWords = /\b(the|and|is|are|what|how|why)\b/gi;
const skDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi;

const enCount = (input.match(enWords) || []).length;
const skCount = (input.match(skDiacritics) || []).length;

if (enCount >= 5 && skCount === 0) return 'en';
if (enCount >= 3 && skCount >= 1) return 'mixed';
return 'sk';
```

**`sanitizeSlovak(text)`** → `string` (backward compatibility)
```javascript
const result = quickSanitize(text);
return typeof result === 'object' ? result.text : result;
```

---

### 7. **Context Manager** (`src/core/contextManager.js`)

**Funkcia:** Agent locking - zabráni náhlym preskokom medzi módmi

#### Mechanizmus:

```javascript
class ContextManager {
  constructor() {
    this.currentMode = null;
    this.lockStrength = 0.0;  // 0.0 - 1.0
    this.changeThreshold = 0.9;  // Potrebná confidence pre zmenu
    this.history = [];  // Last 20 interactions
  }

  shouldLockMode(newMode, confidence) {
    if (!this.currentMode) return false;
    
    // Lock strength decay: 0.85^n
    this.lockStrength *= 0.85;
    
    // Same mode → strengthen lock
    if (newMode === this.currentMode) {
      this.lockStrength = Math.min(1.0, this.lockStrength + 0.1);
      return true;
    }
    
    // Different mode → check if confidence > threshold
    if (confidence < this.changeThreshold) {
      return true;  // Keep locked
    }
    
    // Unlock and switch
    this.currentMode = newMode;
    this.lockStrength = 0.5;
    return false;
  }
}
```

#### Príklad:
```
User: "ta čo bráško?"       → POPICI (conf 0.85) → Lock strength: 0.5
User: "ako sa máš?"          → HUMAN (conf 0.50) → LOCKED (keep POPICI, strength 0.62)
User: "povedz mi o SP4"      → HUMAN (conf 0.50) → LOCKED (keep POPICI, strength 0.54)
User: "explain the project" → CORE (conf 0.95)  → UNLOCK → Switch to CORE
```

---

### 8. **Mode Compass** (`src/core/modeCompass.js`)

**Funkcia:** Automatická detekcia módu z user inputu

#### Detekčné metódy:

**1. Keyword matching** (rýchle, 0.5-3ms)
```javascript
const KEYWORDS = {
  popici: ['ta', 'čo', 'máš', 'popiči', 'kurva', 'nasratý'],
  empatia: ['bolí', 'smutný', 'ťažko', 'pomôž', 'neviem'],
  glitch: ['prečo existujem', 'zmysel', 'večnosť', 'duša'],
  human: ['kto si', 'čo si', 'ako funguje', 'vysvetli']
};
```

**2. Pattern fallback** (stredne rýchle, 5-10ms)
```javascript
// Regex-based detection
if (/\b(ta|čo|máš|šéne)\b/i.test(input)) return 'popici';
if (/\b(bolí|smutný|ťažko)\b/i.test(input)) return 'empatia';
```

**3. LLM analysis** (pomalé, 500-2000ms, len pre neistotu)
```javascript
// Fallback iba ak confidence < 0.6
const prompt = `Analyze sentiment: "${input}"`;
const result = await askLocalLLM(prompt, '');
```

#### Quick Analyzer Integration (v0.8):
```javascript
// Hybrid approach: keyword → pattern → LLM (iba ak nutné)
function pickMode(input, useContextLock = true) {
  console.time('modeDetection');
  
  // Try quick keyword match (50-100x faster)
  const quickResult = quickKeywordMatch(input);
  if (quickResult.confidence >= 0.8) {
    console.timeEnd('modeDetection');
    return quickResult.mode;
  }
  
  // Fallback to pattern matching
  const patternResult = patternMatch(input);
  if (patternResult.confidence >= 0.7) {
    console.timeEnd('modeDetection');
    return patternResult.mode;
  }
  
  // Last resort: LLM (slow)
  return await llmAnalysis(input);
}
```

---

### 9. **Dialect Analyzer** (`src/core/dialectAnalyzer.js`)

**Funkcia:** Detekcia východoslovenčiny → boost POPICI módu

#### Detekčné vzory:
```javascript
const EASTERN_SLOVAK_PATTERNS = {
  pure: ['ta', 'čo', 'máš', 'šéne', 'fajn'],
  strong: ['bráško', 'ľakko', 'dakde', 'niečo'],
  moderate: ['popiči', 'normálne', 'jasné']
};

function detectDialect(input) {
  let score = 0;
  
  // Pure forms (+1.0 each)
  EASTERN_SLOVAK_PATTERNS.pure.forEach(word => {
    if (input.toLowerCase().includes(word)) score += 1.0;
  });
  
  // Strong forms (+0.5 each)
  EASTERN_SLOVAK_PATTERNS.strong.forEach(word => {
    if (input.toLowerCase().includes(word)) score += 0.5;
  });
  
  // Normalize to 0-1 range
  const dialectLevel = Math.min(1.0, score / 3);
  
  if (dialectLevel >= 0.8) return { level: 'pure', boost: 1.0 };
  if (dialectLevel >= 0.5) return { level: 'strong', boost: 0.63 };
  if (dialectLevel >= 0.3) return { level: 'moderate', boost: 0.3 };
  return { level: 'none', boost: 0.0 };
}
```

#### Integrácia s modeCompass:
```javascript
const dialect = detectDialect(input);
if (dialect.boost > 0.5) {
  console.log(`🗣️ Eastern Slovak boost: ${dialect.boost.toFixed(2)} → POPICI`);
  return 'popici';
}
```

---

### 10. **Emotional Processor** (`emotionalProcessor.js`)

**Funkcia:** Analýza emocionálneho obsahu správy

#### Detekcia:
```javascript
const EMOTION_KEYWORDS = {
  anger: ['nasratý', 'kurva', 'hate', 'fuck', 'wth'],
  sadness: ['smutný', 'bolí', 'ťažko', 'neviem', 'stratený'],
  joy: ['super', 'krásne', 'happy', 'love', 'ďakujem'],
  fear: ['strach', 'bojím', 'afraid', 'scary', 'risk']
};

function analyzeMessage(text) {
  const emotions = {};
  
  Object.keys(EMOTION_KEYWORDS).forEach(emotion => {
    const keywords = EMOTION_KEYWORDS[emotion];
    const matches = keywords.filter(kw => text.toLowerCase().includes(kw));
    emotions[emotion] = matches.length / keywords.length;
  });
  
  const dominantEmotion = Object.keys(emotions).reduce((a, b) => 
    emotions[a] > emotions[b] ? a : b
  );
  
  const intensity = emotions[dominantEmotion];
  
  return {
    dominantEmotion: intensity > 0.2 ? dominantEmotion : 'neutral',
    intensity,
    breakdown: emotions
  };
}
```

#### Intensity Detection (`src/core/intensityDetection.js`):
```javascript
const INTENSITY_MARKERS = {
  high: ['kurva', '!!!', 'WTF', 'nasratý', '💥', '🔥'],
  medium: ['popiči', '!!', 'dosť', 'fakt'],
  low: ['trochu', 'asi', 'možno']
};

function detectIntensity(text) {
  let score = 0;
  
  INTENSITY_MARKERS.high.forEach(marker => {
    if (text.includes(marker)) score += 1.0;
  });
  
  INTENSITY_MARKERS.medium.forEach(marker => {
    if (text.includes(marker)) score += 0.5;
  });
  
  if (score >= 2.0) return { level: 'EXTREME', action: 'empatia_boost' };
  if (score >= 1.0) return { level: 'HIGH', action: 'popici_mode' };
  if (score >= 0.3) return { level: 'MODERATE', action: 'normal' };
  return { level: 'MINIMAL', action: 'normal' };
}
```

---

### 11. **Supervisor & Graceful Degradation** (`supervisor.js`, `gracefulDegradation.js`)

**Funkcia:** Error monitoring, fallback systém

#### Capability Levels:
```javascript
const CAPABILITY_LEVELS = {
  FULL: {
    features: ['multi-agent', 'embeddings', 'council', 'memory-triggers'],
    fallback: 'REDUCED'
  },
  REDUCED: {
    features: ['single-agent', 'basic-memory', 'simple-prompts'],
    fallback: 'BASIC'
  },
  BASIC: {
    features: ['direct-llm', 'no-memory'],
    fallback: 'SAFE'
  },
  SAFE: {
    features: ['hardcoded-responses'],
    fallback: null
  }
};
```

#### Error Detection:
```javascript
function detectError(errorMessage) {
  const errorTypes = {
    'ECONNREFUSED': 'ollama_offline',
    'Agent nie je inicializovaný': 'initialization_failed',
    'push is not a function': 'memory_corruption',
    'substring is not a function': 'type_error'
  };
  
  const errorType = Object.keys(errorTypes).find(key => 
    errorMessage.includes(key)
  );
  
  if (errorType) {
    console.error(`❌ Error detected: ${errorMessage}`);
    activateFallback(errorTypes[errorType]);
  }
}

function activateFallback(errorType) {
  const currentLevel = this.capabilityLevel;
  const nextLevel = CAPABILITY_LEVELS[currentLevel].fallback;
  
  if (nextLevel) {
    console.warn(`⬇️ Degradácia: ${currentLevel} → ${nextLevel}`);
    this.capabilityLevel = nextLevel;
  } else {
    console.error('🚨 SAFE MODE - hardcoded responses only');
  }
}
```

---

### 12. **Backup System** (`backup.js`)

**Funkcia:** Automatické zálohovanie `memory.json`

#### Stratégia:
```javascript
async function createBackup() {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = `data/backups/memory_${timestamp}.json`;
  
  const memory = await loadMemory();
  const metadata = {
    timestamp,
    version: '0.8.0',
    interactionCount: memory.rawMemory?.log?.length || 0,
    relationshipStage: memory.relationship?.stage || 'Stranger'
  };
  
  const backupData = {
    ...memory,
    _backup_metadata: metadata
  };
  
  await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`✅ Backup created: ${backupPath}`);
}
```

#### Automatické backupy:
- Pred každým `/exit`
- Každý deň o polnoci (cron job)
- Pred major memory consolidation

---

### 13. **Scheduler** (`scheduler.js`)

**Funkcia:** Cron jobs pre automatizáciu

#### Jobs:
```javascript
import cron from 'node-cron';

export function initializeScheduler() {
  const jobs = {};
  
  // Daily consolidation (00:00)
  jobs.daily = cron.schedule('0 0 * * *', async () => {
    console.log('🕐 Daily consolidation triggered');
    await consolidateMemory('daily');
    await createBackup();
  });
  
  // Weekly consolidation (Monday 00:00)
  jobs.weekly = cron.schedule('0 0 * * 1', async () => {
    console.log('📅 Weekly consolidation triggered');
    await consolidateMemory('weekly');
  });
  
  // Monthly consolidation (1st day 00:00)
  jobs.monthly = cron.schedule('0 0 1 * *', async () => {
    console.log('📆 Monthly consolidation triggered');
    await consolidateMemory('monthly');
  });
  
  // Quarterly pruning (every 3 months)
  jobs.quarterly = cron.schedule('0 0 1 */3 *', async () => {
    console.log('🗑️ Quarterly pruning triggered');
    await pruneOldMemories();
  });
  
  return jobs;
}
```

---

### 14. **Rituals** (`rituals.js`)

**Funkcia:** Špeciálne príkazy pre reflexiu, plánovanie

#### Príkazy:

**`/mirror [days]`** - Reflexia minulosti
```javascript
async function handleMirror(days = 3) {
  const mem = await loadMemory();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const recentLogs = mem.rawMemory.log.filter(entry => 
    new Date(entry.ts) >= since
  );
  
  const summary = await askLocalLLM(
    'Si reflexívny AI. Zhrň hlavné témy a progress.',
    `Konverzácie za ${days} dni:\n${JSON.stringify(recentLogs, null, 2)}`
  );
  
  return `🪞 MIRROR - ${days} dni späť:\n\n${summary}`;
}
```

**`/today`** - Denný rituál
```javascript
async function handleToday() {
  const mem = await loadMemory();
  const todayGoals = mem.goals?.filter(g => g.deadline === 'today') || [];
  
  const prompt = `
Užívateľ: ${mem.userProfile.name}
Ciele na dnes: ${todayGoals.length ? todayGoals.map(g => g.title).join(', ') : 'žiadne'}
Nálada: ${mem.relationship?.lastMood || 'neutrálna'}

Čo dnes potrebuje vyriešiť?
`;
  
  const response = await askLocalLLM('Si motivačný coach.', prompt);
  return `🌅 TODAY:\n\n${response}`;
}
```

**`/next`** - Ďalší krok
```javascript
async function handleNext() {
  const mem = await loadMemory();
  const activeGoals = mem.goals?.filter(g => g.status === 'active') || [];
  
  if (activeGoals.length === 0) {
    return '🎯 Žiadne aktívne ciele. Nastav si cieľ: /goal set <popis>';
  }
  
  const nextGoal = activeGoals[0];
  return `🎯 NEXT STEP:\n\n"${nextGoal.title}"\n\nAký je prvý konkrétny krok?`;
}
```

**`/trinity <otázka>`** - Tri perspektívy (CORE, POPICI, GLITCH)
```javascript
async function handleTrinity(question) {
  const perspectives = {};
  
  // CORE perspective
  const corePrompt = buildSystemPrompt('core', {}, '', question);
  perspectives.core = await askLocalLLM(corePrompt, question);
  
  // POPICI perspective
  const popiciPrompt = buildSystemPrompt('popici', {}, '', question);
  perspectives.popici = await askLocalLLM(popiciPrompt, question);
  
  // GLITCH perspective
  const glitchPrompt = buildSystemPrompt('glitch', {}, '', question);
  perspectives.glitch = await askLocalLLM(glitchPrompt, question);
  
  return `
🔥 TRINITY - 3 PERSPECTIVES:

━━━ CORE ━━━
${perspectives.core}

━━━ POPIČI ━━━
${perspectives.popici}

━━━ GLITCHOSLAV ━━━
${perspectives.glitch}
`;
}
```

**`/seed <text>`** - Zapíš kľúčový moment
```javascript
async function handleSeed(text) {
  const mem = await loadMemory();
  if (!mem.seeds) mem.seeds = [];
  
  mem.seeds.push({
    timestamp: new Date().toISOString(),
    text,
    context: 'manual'
  });
  
  await saveMemory(mem);
  return `🌱 Seed uložený: "${text}"`;
}
```

---

## 🔄 Data Flow - Request Lifecycle

```
1. USER INPUT
   ↓
2. index_v07.js - Event loop rl.on('line')
   ↓
3. Mode Detection (modeCompass.pickMode)
   ├─ Quick keyword match (0.5-3ms)
   ├─ Pattern fallback (5-10ms)
   └─ LLM analysis (500-2000ms)
   ↓
4. Context Manager Check (shouldLockMode)
   ├─ Same mode → strengthen lock
   ├─ Different mode, low confidence → keep locked
   └─ Different mode, high confidence → unlock & switch
   ↓
5. Dialect Analyzer (if eastern Slovak → POPICI boost)
   ↓
6. buildPrompt(mode, state, userMessage)
   ├─ buildCoreLayer() - Language policy + identity
   ├─ buildAgentLayer() - Agent profile
   ├─ buildStyleLayer() - Persona prompt
   ├─ buildContextLayer() - Relationship, emotion, capability
   └─ buildSafetyLayer() - Fallback rules
   ↓
7. agent.ask(userMessage, {mode, systemPrompt})
   ↓
8. SP4IntegratedAgent.processMessage()
   ├─ Emotional analysis
   ├─ Capability check (FULL/REDUCED/BASIC/SAFE)
   ├─ Model selection (llama3/mistral/gemma)
   ├─ Memory triggers (semantic search)
   ├─ Multi-agent council (if complex query)
   │  ├─ CORE perspective
   │  ├─ POPICI perspective
   │  ├─ GLITCH perspective
   │  └─ Synthesis
   └─ Single agent (if simple query)
   ↓
9. askLocalLLM(systemPrompt, userMessage, {model})
   ↓
10. Ollama API (localhost:11434/api/generate)
    ↓
11. LLM Response
    ↓
12. Post-processing
    ├─ quickSanitize() - Language check, czechism removal
    ├─ Repetition detection
    └─ English fallback (if detected EN → SK replacement)
    ↓
13. Save to memory.json (rawMemory.log[])
    ├─ Timestamp
    ├─ Mode
    ├─ Input
    ├─ Reply
    └─ Metadata (emotion, tags, context)
    ↓
14. Display to user
    ↓
15. Context Manager Update (lock strength decay/boost)
```

---

## 🐛 Known Issues & Fixes

### Issue #1: `[object Object]` Display Bug
**Symptom:** CLI zobrazuje `[object Object]` namiesto textu  
**Cause:** `quickSanitize()` vracia objekt `{text, isEnglish, stats}` namiesto stringu  
**Fix:** `integration.js` lines 279-283, 491-503 (object handling)

### Issue #2: Agent Not Initialized
**Symptom:** `Agent nie je inicializovaný. Zavolaj initialize() najprv.`  
**Cause:** `index_v07.js` nevola `agent.initialize()`  
**Fix:** Added `await agent.initialize()` in `init()` function

### Issue #3: `rawMemory.push is not a function`
**Symptom:** Memory save fails  
**Cause:** `rawMemory` je objekt `{log: []}`, nie array  
**Fix:** Changed `mem.rawMemory.push()` → `mem.rawMemory.log.push()`

### Issue #4: `agentText.substring is not a function`
**Symptom:** Memory context generation fails  
**Cause:** `agentText` môže byť undefined/null  
**Fix:** Added `String(agentText || '')` wrapper

### Issue #5: English Responses Despite Slovak Policy
**Symptom:** LLM odpovedá v EN napriek SK promptu  
**Cause:** Slabý model (llama3) ignoruje SK inštrukcie  
**Attempted Fixes:**
- Enhanced `buildCoreLayer()` - 🚨 language policy with examples
- Enhanced POPICI persona - 🇸🇰 explicit SK enforcement
- `quickSanitize()` fallback replacement
**Status:** Partial fix - validator disabled (mythomax unavailable)

---

## 📊 Performance Metrics

### v0.8.0 Improvements (BAD Labs Edition):

| Feature | v0.7 | v0.8 | Speedup |
|---------|------|------|---------|
| Mode detection | 500-2000ms (LLM) | 0.5-3ms (keyword) | **50-100x** |
| Dialect analysis | N/A | 1-2ms | NEW |
| Context locking | N/A | 0.3-1ms | NEW |
| Memory triggers | 200-500ms | 150-300ms (cached) | 1.5x |

### Mode Detection Methods:

| Method | Speed | Accuracy | Usage |
|--------|-------|----------|-------|
| Quick keyword | 0.5-3ms | 85% | Default |
| Pattern fallback | 5-10ms | 70% | Low confidence |
| LLM analysis | 500-2000ms | 95% | Last resort |

---

## 🔐 Privacy & Security

**ABSOLÚTNE KRITICKÉ:**
- ✅ **Žiadne cloudové API** - všetko lokálne (Ollama)
- ✅ **Žiadne sieťové volania** mimo localhost
- ✅ **Žiadne API keys** v kóde/pamäti
- ✅ **Encrypted backups** (voliteľné, nie implementované)
- ✅ **Local embeddings** (all-MiniLM-L6-v2, transformers.js)

---

## 🚀 Quick Start Commands

```bash
# Start CLI
node index_v07.js

# Check Ollama connection
curl http://localhost:11434/api/tags

# Run tests
node src/debug/testLanguageEnforcement.js
node src/debug/testPopiciList.js

# Create backup
node -e "import('./backup.js').then(m => m.createBackup())"

# Consolidate memory
node -e "import('./memoryLayers.js').then(m => m.consolidateMemory('manual'))"
```

---

## 📝 TODO / Roadmap

### v0.8.1 (Next)
- [ ] Fix EN responses (validator re-enable alebo gemma3 switch)
- [ ] Test suite expansion (52 tests)
- [ ] Git commit language fixes
- [ ] Update WALTER_COLLABORATION_FINAL_REPORT.md

### v0.9 (Future)
- [ ] HTTP REST API (`server.js`)
- [ ] Telegram bot integration
- [ ] Action hooks (open_url, save_snippet)
- [ ] Encryption module (optional)
- [ ] Plugin system (command extensions)

---

## 🧑‍💻 Developer Notes

**Kľúčové súbory pri debugovaní:**
1. `index_v07.js` - Vstupný bod, event loop
2. `integration.js` - Hlavná logika, processing pipeline
3. `multiVoice.js` - System prompts, language policy
4. `llmLocal.js` - Ollama komunikácia
5. `languageSanitizer.js` - SK enforcement, detekcia EN

**Common debugging patterns:**
```javascript
// Trace mode detection
console.log('🧭 MODE COMPASS:', selectedMode, modeAnalysis);

// Trace memory triggers
console.log('💡 Triggered memories:', triggeredMemories.length);

// Trace LLM calls
console.log('🎯 Model:', selectedModel, 'Temp:', temperature);

// Trace language sanitization
console.log('⚠️ Language stats:', {enMatches, skMarks, isEnglish});
```

**Testing strategy:**
- Unit tests: `src/debug/test*.js`
- Integration tests: Manual CLI testing
- Language tests: `testLanguageEnforcement.js` (8 cases)
- POPICI tests: `testPopiciList.js` (4 cases)

---

**END OF SYSTEM OVERVIEW**
