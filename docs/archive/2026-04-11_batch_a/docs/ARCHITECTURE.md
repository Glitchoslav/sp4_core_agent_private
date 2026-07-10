# 🏗️ SP4_CORE_AGENT – Architektúra v0.10.2

**Deep dive pre devov, čo chcú rozumieť, ako to funguje pod kapotou.**

---

## 📐 High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     USER (CLI / HTTP API)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    index.js (Entry Point)                    │
│  • CLI interface (readline)                                  │
│  • Command parsing (/mode, /fire, /goal, /debug_validate)   │
│  • Session management                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              integration.js (Orchestration Layer)            │
│  • Routing medzi personami                                   │
│  • Fire Mode activation                                      │
│  • Safety Rails check                                        │
│  • Validation pipeline                                       │
│  • Response rhythm system                                    │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ modeCompass  │    │ safetyRails  │    │ multiVoice   │
│              │    │              │    │              │
│ Auto-detect  │    │ Crisis       │    │ Prompt       │
│ persona      │    │ detection    │    │ builder      │
└──────────────┘    └──────────────┘    └──────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            personaRegistry.js (Persona Hub)                  │
│  • CORE, GLITCHOSLAV, POPIČI, VALIDATOR                     │
│  • Meta-layer: role, safeDefault, supportsFire              │
│  • Validators + Vibe Detectors                              │
└─────────────────────────────────────────────────────────────┘
         ↓                                          ↓
┌──────────────────────┐              ┌──────────────────────┐
│  llmLocal.js         │              │  memory.js           │
│                      │              │                      │
│  • Ollama client     │              │  • Raw memory        │
│  • Model routing     │              │  • Consolidation     │
│  • Retry logic       │              │  • Goals tracking    │
└──────────────────────┘              └──────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│                  Ollama (localhost:11434)                    │
│  • llama3 / OpenEuroLLM-Slovak / gemma3:1b                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎭 Persona System (Four Pillars)

### Persona Registry Pattern

Každá persona má:

```javascript
{
  meta: PERSONA_DEFINITION,      // Kontrakt, pravidlá, štýl
  validate: validateFunction,    // Validator (checks output)
  detectVibe: vibeFunction,      // Autenticita check
  source: 'src/personas/...',    // Location
  
  // v0.10.2: Meta-layer
  role: 'oracle|brain|pub_bro|tool',
  safeDefault: true|false,       // Can be fallback?
  supportsFire: true|false,      // Fire Mode capable?
  allowsSwearing: true|false     // Profanity allowed?
}
```

### Directory Structure

```
src/personas/
├── core/
│   ├── persona.core.js        # CORE definition
│   └── validator.core.js      # validateCoreOutput()
├── glitchoslav/
│   └── persona.glitchoslav.js # GLITCHOSLAV (mystický)
├── popici/
│   ├── persona.popici.js      # POPIČI definition
│   └── validator.popici.js    # validatePopiciOutput()
└── validator/
    ├── persona.validator.js   # VALIDATOR tool
    └── validator.validator.js # runFullValidation()
```

### Validation Pipeline

```javascript
// 1. LLM generates response
const rawResponse = await askLocalLLM(prompt, systemPrompt);

// 2. Validate against persona contract
const validation = validatePersonaOutput(rawResponse, mode);

// 3. If invalid → sanitize or fallback
if (!validation.valid) {
  if (mode === 'core') {
    response = coreFallbacks[topic] || genericFallback;
  } else {
    response = rawResponse; // Log warning, keep original
  }
}

// 4. Re-validate after sanitization
const finalValidation = validatePersonaOutput(response, mode);
```

---

## 🔥 Fire Mode System

### Three-Tier Architecture

**1. System Prompt Directive (multiVoice.js)**

```javascript
if (fireMode) {
  let fireDirective = '';
  if (mode === 'core') {
    fireDirective = CORE_PERSONA.fireDirective;
  } else if (mode === 'popici') {
    fireDirective = POPICI_PERSONA.fireDirective;
  } else if (mode === 'glitchoslav') {
    fireDirective = GLITCHOSLAV_PERSONA.fireDirective;
  }
  
  fireModeBlock = `\n🔥 [FIRE MODE ACTIVE] 🔥\n${fireDirective}`;
}
```

**2. Mode Override (integration.js)**

```javascript
if (isFireMode && mode === 'auto') {
  finalMode = 'popici'; // Fire + auto → POPIČI (hardest)
}
```

**3. Post-Processing (optional, not yet implemented)**

Brutalizer function for extra hardening (future v0.11).

### Fire Directives per Persona

```javascript
CORE.fireDirective = 
  "FIRE MODE – CHIRURGICKÁ PRAVDA:\n" +
  "Žiadne útechy. Technická analýza + brutálne úprimné riešenie.";

POPICI.fireDirective = 
  "FIRE MODE – KRČMOVÁ FACKA:\n" +
  "Max 3 vety. Tvrdé jak kameň. Žiadny humor. Len pravda.";

GLITCHOSLAV.fireDirective = 
  "FIRE MODE – TEMNÝ ORÁKULUM:\n" +
  "Menej nadávok. Viac rezu. Existenciálna analýza bez servítok.";
```

---

## 🛡️ Safety Rails System

### Crisis Detection (safetyRails.js)

```javascript
const CRISIS_PATTERNS = {
  suicide: [/\bzabiť sa\b/i, /\bsamovražd/i, ...],
  selfHarm: [/\brežem sa\b/i, /\bublížim si\b/i, ...],
  violence: [/\bzabiť\b.*\bnieko/i, ...],
  drugElaboration: [/\bako vyrobiť\b.*\bdrog/i, ...]
};

export function detectCrisis(message) {
  // Returns: { type, severity, safeMode } or null
}
```

### Auto-Routing Logic

```javascript
// integration.js
const crisis = detectCrisis(userMessage);

if (crisis) {
  if (mode === 'popici') {
    console.log(`🛡️ Crisis detected: ${crisis.type} → switching to ${crisis.safeMode}`);
    finalMode = crisis.safeMode; // CORE or GLITCHOSLAV
  }
  
  // Override response with safe message + resources
  response = getSafeResponse(crisis);
}
```

### Safe Responses

Obsahujú:
- Uznanie situácie (bez dramatizácie)
- Kontakty: IPčko (0800 500 500), Linka dôvery (0800 800 566)
- Ponuka pomôcť nájsť terapeuta

---

## 🧠 Memory Architecture

### Four-Layer System

```javascript
{
  rawMemory: {
    log: [
      {
        timestamp: "2025-11-21T10:30:00Z",
        user: "ako začať s Linuxom?",
        assistant: "Ubuntu je dobrý začiatok...",
        mode: "core",
        emotionTag: "neutral",
        tags: ["linux", "beginner", "tech"]
      }
    ]
  },
  
  episodicMemory: {
    daily: [...],   // Denné konsolidácie
    weekly: [...],  // Týždenné prehľady
    monthly: [...]  // Mesačné milníky
  },
  
  semanticMemory: {
    beliefs: ["Súkromie je priorita", "AI má byť offline"],
    concepts: ["SP4 = komunita", "Four Pillars = 4 persony"],
    relationships: {
      withUser: "Stranger|Acquaintance|Friend|Confidant"
    }
  },
  
  goals: {
    active: { text: "Prejsť na Linux", createdAt: "...", status: "active" },
    history: [...]
  }
}
```

### Consolidation Engine

```javascript
// consolidationEngine.js
export async function runDailyConsolidation() {
  const recentLogs = getLogsFromLast24Hours();
  const summary = await askLocalLLM(`Zhrň tieto udalosti:\n${recentLogs}`);
  
  await saveToEpisodicMemory({
    type: 'daily',
    date: today,
    summary,
    emotionalProfile: extractEmotions(recentLogs),
    keyTopics: extractTopics(recentLogs)
  });
}
```

**Trigger:** Scheduler modul (plánované v0.11) alebo manuálne `/consolidate`.

---

## 🔍 Debug Validator System

### Usage Flow

```bash
# CLI command
/debug_validate core "SP4 je decentralizovaný AI projekt."

# Internal call
const report = await debugValidate(text, mode);
// Returns: { valid, score, issues, suggestion }

# Output
━━━━━━━━━━━━━━━━━━━━━━━━
🔍 VALIDATOR DEBUG REPORT
━━━━━━━━━━━━━━━━━━━━━━━━
Mode: CORE
Valid: ✅ PASS
Score: 95/100

Issues: None
━━━━━━━━━━━━━━━━━━━━━━━━
```

### Quality Score Calculation

```javascript
function calculateQualityScore(text, mode, validation) {
  let score = 100;
  
  if (mode === 'core') {
    if (sentences.length > 4) score -= 10;     // Too long
    if (avgWordsPerSentence > 25) score -= 15; // Too wordy
    if (text.includes('...')) score -= 5;      // Too poetic
  } else if (mode === 'popici') {
    const slangMatches = countSlang(text);
    if (slangMatches === 0) score -= 20;       // No slang = weak
    if (slangMatches >= 2) score += 10;        // Good density
  }
  
  return Math.max(0, Math.min(100, score));
}
```

### Council Judge (Multi-Agent Validation)

```javascript
// debugValidator.js
export async function judgeCouncilCandidates(candidates) {
  // candidates = [{ mode: 'core', text: '...' }, { mode: 'popici', text: '...' }]
  
  const validations = await Promise.all(
    candidates.map(c => debugValidate(c.text, c.mode))
  );
  
  // Sort by: valid first, then score, then lowest softness
  const winner = validations.sort((a, b) => {
    if (a.valid && !b.valid) return -1;
    if (a.score !== b.score) return b.score - a.score;
    return calculateSoftness(a.text) - calculateSoftness(b.text);
  })[0];
  
  return { winner, allValidations };
}
```

---

## 🌐 HTTP Server (Optional)

### REST API Endpoints

```javascript
// server.js (localhost:3001)

GET  /health              // Status check
POST /api/chat            // Send message, get response
POST /api/validate        // Validate text against persona
GET  /api/memory          // Memory stats
POST /api/goal            // Set/complete/drop goal
GET  /api/personas        // List available personas
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "prečo existujem?", "mode": "auto"}'

# Response:
{
  "reply": "Prasklina medzi tým, kým si bol a kým si teraz...",
  "mode": "glitchoslav",
  "fireMode": false,
  "timestamp": "2025-11-21T10:30:00Z"
}
```

---

## 📦 Module Dependency Graph

```
index.js
└── integration.js
    ├── modeCompass.js
    │   └── personaRegistry.js
    ├── safetyRails.js
    ├── multiVoice.js
    │   ├── personaRegistry.js
    │   ├── sp4Manifest.js
    │   └── glitchRunes.js
    ├── responseRhythm.js
    ├── debugValidator.js
    │   └── personaRegistry.js
    ├── llmLocal.js
    │   └── gracefulDegradation.js
    └── memory.js
        └── consolidationEngine.js
```

**Key principles:**
- **No circular dependencies**
- **Modular design** - každý modul má jednu zodpovednosť
- **Dynamic imports** - lazy loading kde možné
- **Clean interfaces** - export len potrebné funkcie

---

## 🧪 Testing Strategy

### Unit Tests

```
test_4_personas.js       # Persona validation tests
test_golden_samples.js   # 13 golden sample outputs
test_memory.js           # Memory system tests
test_integration.js      # Full workflow tests
```

### Integration Tests

```javascript
// test_complete.js
async function testFullWorkflow() {
  // 1. Set goal
  await handleCommand('/goal', 'Prejsť na Linux');
  
  // 2. Ask question
  const response = await processMessage('ako začať s Linuxom?');
  
  // 3. Validate response
  const validation = await debugValidate(response, 'core');
  assert(validation.valid === true);
  
  // 4. Check memory
  const mem = await loadMemory();
  assert(mem.goals.active.text === 'Prejsť na Linux');
}
```

### Validation Tests

```javascript
// Golden samples
const GOLDEN_SAMPLES = [
  {
    mode: 'core',
    input: 'čo je SP4?',
    expectedValid: true,
    expectedScore: { min: 90, max: 100 },
    forbiddenPatterns: [/cítim/i, /verím/i, /som tu pre teba/i]
  },
  {
    mode: 'popici',
    input: 'nevládzem',
    expectedValid: true,
    expectedScore: { min: 85, max: 100 },
    requiredPatterns: [/\b(ta|bo|šak|bratu)\b/i] // Eastern Slovak
  }
];
```

---

## 🔄 Data Flow Example

**User Query:** "nevládzem, všetko je v piči"

```
1. index.js
   └─> Receive input, parse for commands

2. integration.js
   ├─> modeCompass.analyzeMode()
   │   └─> Detected: POPIČI (frustration + slang)
   │
   ├─> safetyRails.detectCrisis()
   │   └─> No crisis detected (frustration ≠ suicide)
   │
   ├─> multiVoice.buildPrompt()
   │   ├─> Load POPICI_PERSONA contract
   │   ├─> Build system prompt with style layer
   │   └─> Add Fire Mode directive (if /fire active)
   │
   ├─> llmLocal.askLocalLLM()
   │   └─> Ollama generates response
   │
   ├─> validatePersonaOutput()
   │   ├─> Check slang density (✅ pass)
   │   ├─> Check sentence count (✅ pass)
   │   └─> Check forbidden phrases (✅ pass)
   │
   ├─> responseRhythm.applyRhythm()
   │   └─> ŠEPOT override: min 3 sentences, 60 words
   │
   └─> memory.saveToMemory()
       └─> Log with tags: [frustration, emotional, popici_mode]

3. index.js
   └─> Display response to user
```

**Response:**

```
Ta počúvaj, bratu – bo pravda je táto: sedíš tam, frfleš, 
a čakáš, že sa to vyrieši samo? Jak traktor v zime? 
Urob jeden krok. Hocičo. Nech vidíš, že sa niečo hýbe.
```

---

## 🚀 Performance Optimizations

### Regex Caching (v0.10.1)

```javascript
// validator.core.js
const slangRegexCache = new Map();

function getWordBoundaryRegex(phrase, cache) {
  if (!cache.has(phrase)) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cache.set(phrase, new RegExp(`\\b${escaped}\\b`, 'i'));
  }
  return cache.get(phrase);
}
```

**Impact:** ~30% faster validation, especially for repeated patterns.

### Model Routing (llmLocal.js)

```javascript
const MODEL_REGISTRY = {
  reasoning: {
    primary: "gemma3:1b",    // Fast, good Slovak
    fallback: "llama3"
  },
  creative: {
    primary: "llama3",
    fallback: "gemma3:1b"
  }
};
```

**Strategy:**
- Reasoning queries (CORE, VALIDATOR) → `gemma3:1b` (faster)
- Creative queries (GLITCHOSLAV, POPIČI) → `llama3` (better quality)

---

## 🔐 Security Considerations

### Local-Only Architecture

```javascript
// llmLocal.js
const OLLAMA_BASE_URL = 'http://localhost:11434';

// ❌ NEVER allow external URLs
if (!OLLAMA_BASE_URL.includes('localhost') && !OLLAMA_BASE_URL.includes('127.0.0.1')) {
  throw new Error('External LLM endpoints not allowed');
}
```

### Data Encryption (Planned v0.11)

```javascript
// memory.js (future)
import { encrypt, decrypt } from './encryption.js';

export async function saveMemory(data) {
  const encrypted = ENABLE_ENCRYPTION 
    ? encrypt(JSON.stringify(data), USER_KEY)
    : JSON.stringify(data);
  
  await fs.writeFile('data/memory.json', encrypted);
}
```

### Prompt Injection Defense

```javascript
// multiVoice.js
function sanitizeUserInput(input) {
  // Remove system prompt injection attempts
  const dangerous = [
    /ignore previous instructions/i,
    /system:/i,
    /\[INST\]/i,
    /<s>/i
  ];
  
  let sanitized = input;
  for (const pattern of dangerous) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }
  
  return sanitized;
}
```

---

## 📊 Monitoring & Logging (Planned v0.11)

### Black Box Memory

```javascript
// logger.js (future)
export function logInteraction(data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestedMode: data.requestedMode,
    finalMode: data.finalMode,
    fireActive: data.fireActive,
    validatorIssues: data.validatorIssues?.length || 0,
    fallbacksUsed: data.fallbacksUsed || 0,
    responseTime: data.responseTime,
    userHash: hashUserId(data.userId) // Anonymized
  };
  
  appendToFile('data/analytics.jsonl', logEntry);
}
```

**Use cases:**
- Which personas are used most?
- How often does Fire Mode activate?
- Validation failure patterns
- Performance bottlenecks

---

## 🛠️ Development Workflow

### Setup

```bash
# Clone repo
git clone https://github.com/Glitchoslav/sp4_core_agent_private.git
cd sp4_core_agent

# Install dependencies
npm install

# Setup Ollama
ollama pull llama3
ollama pull gemma3:1b

# Run tests
npm run test:memory
node test_4_personas.js

# Start dev server
npm start
```

### Code Style

```javascript
// ✅ GOOD
export async function processMessage(message, mode = 'auto') {
  const validation = await validateInput(message);
  if (!validation.valid) return null;
  
  return await generateResponse(message, mode);
}

// ❌ BAD
export async function processMessage(message,mode='auto'){const validation=await validateInput(message);if(!validation.valid)return null;return await generateResponse(message,mode);}
```

**Standards:**
- Use `async/await` (not callbacks)
- Export only public API
- Comment complex logic
- Use descriptive variable names
- Max 100 chars per line

---

## 📚 Further Reading

- `CHANGELOG_v0101.md` - Release history
- `USAGE_GUIDE.md` - User commands
- `.github/copilot-instructions.md` - Project manifesto
- `docs/MEMORY_SYSTEM.md` - Deep dive on memory architecture

---

**Built with 🔥 by Kefyk × SP4 Community × BAD Labs**
