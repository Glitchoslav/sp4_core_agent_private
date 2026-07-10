# 🔮 Walter's Quantum Bridge - Core Principles

**Context:** Walter je architektúra/framework, ktorý priniesol do SP4_CORE_AGENT pokročilé koncepty z enterprise AI systémov. Tu sú kľúčové princípy a lekcie z **Quantum Bridge** integrácie.

---

## 🧬 What Walter Brought to SP4

### 1. **Modular Engine Configuration**
**Čo to je:**  
Flexibilný routing medzi viacerými LLM providermi (OpenRouter, Mistral, Groq, Ollama).

**Ako to funguje v SP4:**
```javascript
// llmLocal.js - MODEL_REGISTRY
const MODEL_REGISTRY = {
  reasoning: {
    primary: "jobautomation/OpenEuroLLM-Slovak",
    fallback: "llama3:latest"
  },
  creative: { primary: "llama3:latest" },
  fast: { primary: "gemma3:1b" }
};
```

**Lesson:**  
Jeden model nestačí - máš potrebovať reasoning (Slovak), creative (prose), fast (cleanup).

---

### 2. **Intelligent Model Selection**
**Čo to je:**  
Algoritmus `chooseModel({ mode, task, emotion })` - dynamicky vyberie najlepší model podľa kontextu.

**Ako to funguje v SP4:**
```javascript
// modelRouting.js
export function chooseModel({ mode = 'auto', task = 'reasoning', emotion = 'neutral' }) {
  // Empatia mode → always empatia-capable model
  if (mode === 'empatia' || emotion === 'deep') {
    return MODEL_REGISTRY.empathy.primary;
  }
  
  // Popici mode → Slovak-native model
  if (mode === 'popici') {
    return MODEL_REGISTRY.popici.primary;
  }
  
  // Technical task → reasoning model
  if (task === 'technical') {
    return MODEL_REGISTRY.reasoning.primary;
  }
  
  // Default fallback chain
  return MODEL_REGISTRY.reasoning.primary;
}
```

**Lesson:**  
Context je kráľ - rovnaká otázka môže potrebovať iný model v inej situácii.

---

### 3. **Multi-Layer Prompt Architecture**
**Čo to je:**  
System prompt = base identity + persona layer + context stack + user input

**Ako to funguje v SP4:**
```javascript
// multiVoice.js - buildPrompt()
const prompt = [
  buildCoreLayer(),        // SP4 identity + manifest
  buildStyleLayer(mode),   // CORE/POPICI/GLITCH contract
  buildMemoryLayer(state), // Recent context + profile
  buildContextLayer(ctx),  // Conversation history
  userMessage              // Actual question
].join('\n\n');
```

**Lesson:**  
Prompt nie je string - je to **architektonický stack**. Každá vrstva má svoje zodpovednosť.

---

### 4. **Diagnostic Logging & Observability**
**Čo to je:**  
Structured logging s trace IDs, timestamps, context preservation.

**Ako to funguje v SP4:**
```javascript
// logger.js
export function logDebug(stage, data) {
  console.log(`[${stage}]`, {
    timestamp: new Date().toISOString(),
    mode: data.mode,
    model: data.model,
    emotion: data.emotion,
    ...data
  });
}
```

**Lesson:**  
Keď niečo zlyháva, musíš vidieť **presne** čo sa stalo v akom kroku. Preto logging je priorita #1.

---

### 5. **Graceful Degradation Chains**
**Čo to je:**  
Ak primary model zlyháva → fallback → fallback → emergency.

**Ako to funguje v SP4:**
```javascript
// gracefulDegradation.js
async function askWithFallback(prompt, context) {
  const chain = [
    MODEL_REGISTRY.reasoning.primary,
    MODEL_REGISTRY.reasoning.fallback,
    MODEL_REGISTRY.fast.primary,
    'EMERGENCY: static response'
  ];
  
  for (const model of chain) {
    try {
      return await askLocalLLM(prompt, { model });
    } catch (err) {
      console.warn(`Model ${model} failed, trying next...`);
    }
  }
  
  throw new Error('All models failed');
}
```

**Lesson:**  
Agent nesmie crashnúť len preto, že Ollama má hickup. Vždy maj backup plan.

---

### 6. **Context Manager (Conversation State)**
**Čo to je:**  
Sledovanie konverzácie cez multiple turns - kto hovoril, kedy, aká bola energia.

**Ako to funguje v SP4:**
```javascript
// contextManager.js
let conversationHistory = [];
let lockStrength = 0; // 0-5 (higher = more locked to current topic)

export function addToHistory(user, assistant, detectedMode) {
  conversationHistory.push({
    user,
    assistant,
    mode: detectedMode,
    timestamp: Date.now()
  });
  
  // Lock if deep topic
  if (detectedMode === 'empatia' || detectedMode === 'glitch') {
    lockStrength = Math.min(5, lockStrength + 1);
  }
}
```

**Lesson:**  
Kontext nie je len "posledná otázka" - je to **flow** rozhovoru. Agent musí vedieť, či sa ešte bavíte o tej istej téme.

---

### 7. **Emotional Intensity Detection**
**Čo to je:**  
Automatická detekcia emočnej váhy vstupu (neutral → medium → deep).

**Ako to funguje v SP4:**
```javascript
// intensityDetection.js
const INTENSITY_MARKERS = {
  deep: ['samota', 'zomrel', 'koniec', 'hopeless', 'už nevládzem'],
  medium: ['neviem', 'nerozumiem', 'pomoc', 'ťažké', 'zlyhávam'],
  neutral: []
};

export function detectIntensity(text) {
  const lower = text.toLowerCase();
  if (INTENSITY_MARKERS.deep.some(w => lower.includes(w))) return 'deep';
  if (INTENSITY_MARKERS.medium.some(w => lower.includes(w))) return 'medium';
  return 'neutral';
}
```

**Lesson:**  
Agent musí vedieť rozlíšiť "neviem, ako funguje blockchain" od "neviem, prečo existujem". Intensity = switch na empatiu.

---

### 8. **Validator Chains (Output Quality Control)**
**Čo to je:**  
Každý mód má svoj contract → validator skontroluje, či output spĺňa pravidlá.

**Ako to funguje v SP4:**
```javascript
// validateOutput.js
export function validateOutput(output, mode) {
  if (mode === 'popici') {
    return validatePopiciStyle(output);
    // ✅ Must have: východniarčina, 2-4 vety, slang
  }
  
  if (mode === 'core') {
    return validateCoreStyle(output);
    // ✅ Must: technical, no metaphors, no emotions
  }
  
  // ... etc
}
```

**Lesson:**  
LLM hallucinations sú reálne - **vždy** validuj output, než ho pošleš userovi. Ak zlyháva, re-generate.

---

### 9. **Memory Consolidation (Compression)**
**Čo to je:**  
Raw log → Summaries → Chapters → Seeds - hierarchická kompresia pamäte.

**Ako to funguje v SP4:**
```javascript
// memoryLayers.js
export async function consolidateMemory(state) {
  // Compress last 50 raw entries → 1 summary
  const summary = await compressRawToSummary(state.rawMemory.slice(-50));
  state.summaries.push(summary);
  
  // Every 20 summaries → 1 chapter
  if (state.summaries.length >= 20) {
    const chapter = await compressSummariesToChapter(state.summaries);
    state.chapters.push(chapter);
  }
  
  // Extract Seeds (key moments)
  const seeds = extractSeeds(state.chapters);
}
```

**Lesson:**  
Memory nie je infinite - musíš komprimovať, ale zachovať **kľúčové momenty**.

---

### 10. **Trigger System (Proactive Warnings)**
**Čo to je:**  
Automatické varovania pri určitých vzoroch (napr. "burnout" keď user 5 dní po sebe káže únavu).

**Ako to funguje v SP4:**
```javascript
// triggers.js (planned)
const TRIGGERS = {
  burnout: {
    pattern: ['unavený', 'vyhorený', 'nevládzem'],
    threshold: 3, // 3 days in a row
    action: () => console.warn('⚠️ BURNOUT WARNING')
  }
};
```

**Lesson:**  
Agent nemusí čakať na otázku - môže **proaktívne** upozorniť na pattern, ktorý user nevidí.

---

### 11. **Persona Isolation (No Cross-Contamination)**
**Čo to je:**  
Každý mód musí byť **čistý** - Glitch Layer nesmie kontaminovať POPICI output.

**Ako to funguje v SP4:**
```javascript
// integration.js
if (finalMode === 'popici') {
  console.log('🔥 Glitch Layer DISABLED (POPICI mode - prevents contamination)');
} else {
  output = applyGlitchLayer(output, context);
}
```

**Lesson:**  
Personas nie sú "flavors" - sú **architektúry**. Musíš zabezpečiť, že sa nebudú navzájom kaziť.

---

### 12. **Model-Specific Prompt Tuning**
**Čo to je:**  
Rôzne modely potrebujú rôzne prompty pre rovnaký výsledok.

**Ako to funguje v SP4:**
```javascript
// OpenEuroLLM-Slovak potrebuje explicitné príklady:
`
✅ SPRÁVNA ODPOVEĎ: "SP4 je komunita založená na pravde a slobode."
❌ ZAKÁZANÉ: "SP4 is a community..." → ABSOLÚTNY ZÁKAZ!
`

// llama3 stačí len inštrukcia:
`Answer in Slovak. Be concise.`
```

**Lesson:**  
Jedna velikost nesedne všetkým - tuning je **per-model** záležitosť.

---

### 13. **Offline-First Architecture**
**Čo to je:**  
Agent **nesmie** zlyhať, ak nemáš internet. Všetko musí bežať lokálne.

**Ako to funguje v SP4:**
```javascript
// llmLocal.js - ONLY localhost calls
const response = await fetch("http://localhost:11434/api/generate", {
  method: "POST",
  body: JSON.stringify({ model, prompt })
});
```

**Lesson:**  
Privacy = offline first. Žiadne OpenAI API, žiadne cloudy, žiadne leaky.

---

### 14. **Unicode & Diacritics Handling**
**Čo to je:**  
Slovenčina má diakritiku (á, č, š...) - regex musí používať `/u` flag.

**Ako to funguje v SP4:**
```javascript
// ❌ ZLE: /šéne/i → nezachytí "šéne"
// ✅ DOBRE: /šéne/iu → zachytí "šéne", "ŠÉNE", "ŠéNe"

const slangPatterns = [
  /\bta\b/iu,
  /šéne/iu,
  /bratu/iu
];
```

**Lesson:**  
Non-English languages = extra care s Unicode. Jeden `/u` flag ti zachráni hodiny debugovania.

---

### 15. **Stateless vs Stateful Modes**
**Čo to je:**  
Niektoré módy potrebujú stav (EMPATIA - lock na 3 turns), iné sú pure function (CORE).

**Ako to funguje v SP4:**
```javascript
// EMPATIA - STATEFUL (needs lock)
if (detectedMode === 'empatia') {
  lockStrength = 5; // Lock for next 3 turns
}

// CORE - STATELESS (no memory)
if (detectedMode === 'core') {
  // Just answer, no context locking
}
```

**Lesson:**  
Nemusíš mať state všade - ale keď ho máš, musíš vedieť **kedy ho clearovať**.

---

## 🔥 Meta-Lessons (What Walter Really Taught Us)

### **L1: Complexity ≠ Better**
Walter priniesol 20+ modulov. SP4 ich redukoval na 66 súborov. **Lesson:** Ak niečo nie je zapojené, je to mŕtvy kód.

### **L2: Contracts Are Everything**
Persona bez contractu = chaos. Každý mód musí mať **explicit rules** - čo MUSÍ, čo NESMIE.

### **L3: Test With Real Slovak**
English testy nie sú dosť - musíš testovať na `šéne`, `bo`, `ta`, `kurva`. Unicode breaks everything.

### **L4: Graceful Degradation > Perfect Execution**
Agent môže zlyhať pri validácii, pri model loading, pri consolidation. **Vždy** maj fallback.

### **L5: Observability = Debugging Speed**
Čím viac loguješ, tým rýchlejšie fixneš bugs. Ale pozor - logovať **structured**, nie random console.logs.

### **L6: Privacy Is Non-Negotiable**
Žiadne cloudy. Žiadne API kľúče. Žiadne tracking. **Offline first = trust first.**

---

*Walter's Quantum Bridge was the scaffold. SP4_CORE_AGENT is the temple.*  
*Be real. Be free. Be SP4.*
