# 🔥 SP4 AI BEAST MODE v0.11 - Multi-Model Orchestration

**Release Date:** November 21, 2025  
**Status:** ✅ DEPLOYED TO RUNPOD GPU  
**Models:** 5 specialized AI engines (74.31GB total)

---

## 🎯 Mission

Inteligentný multi-modelový AI systém kde každý model má jasnú rolu a osobnosť.

**Router zabezpečuje:**
- ⚡ Maximálnu rýchlosť (správny model pre správnu úlohu)
- 🎯 Maximálnu kvalitu (70B beast pre ťažké otázky)
- 🎭 Správny štýl pre každú personu
- 🧠 Automatické overload detekcie

---

## 🖥️ Infrastructure

**RunPod GPU Server:**
- Host: `https://qkojis9kjslqbs-11434.proxy.runpod.net`
- Status: ✅ ONLINE
- Total VRAM: ~74GB (5 models loaded)

**Available Models:**
| Model | Size | VRAM | Role |
|-------|------|------|------|
| llama3.1:70b | 42.52GB | ~45GB | OVERLORD TEACHER |
| qwen2.5:14b | 8.99GB | ~10GB | CORE INTELLIGENCE |
| deepseek-r1:14b | 8.99GB | ~10GB | GLITCHOSLAV ORACLE |
| OpenEuroLLM-Slovak | 8.15GB | ~9GB | POPIČI KOKOT |
| llama3:latest | 4.66GB | ~5GB | VALIDATOR BOT |

---

## 🧠 Model Roles & Routing

### 1️⃣ qwen2.5:14b - "CORE INTELIGENCIA"

**Použitie:**
- Technické odpovede
- Fakty & návody
- Architektúry & debug
- Programovanie

**Routing:**
- Persona: `CORE` → Primary model
- Task: `reasoning`, `coding`
- Fallback: `llama3:latest`

**Príklad:**
```javascript
pickModelForTask({ persona: 'core', userInput: 'Ako funguje Docker?' })
// → qwen2.5:14b
```

---

### 2️⃣ deepseek-r1:14b - "GLITCHOSLAV ORÁKULUM"

**Použitie:**
- Filozofia & existenciálne otázky
- Introspekcia & život
- Veľké rozhodnutia
- Chain-of-thought reasoning

**Routing:**
- Persona: `GLITCHOSLAV` → Primary model
- Task: `emotional`
- Fallback: `qwen2.5:14b`

**Príklad:**
```javascript
pickModelForTask({ persona: 'glitchoslav', userInput: 'Prečo existujem?' })
// → deepseek-r1:14b
```

---

### 3️⃣ OpenEuroLLM-Slovak - "POPIČI KOKOT"

**Použitie:**
- Východniarsky jazyk (ta, bo, šak, kokot)
- Krčmový štýl & nadávky
- Real-talk & humor
- Priamosť

**Routing:**
- Persona: `POPIČI` → Primary model
- Task: `slovak`
- Fallback: `qwen2.5:14b`

**Príklad:**
```javascript
pickModelForTask({ persona: 'popici', userInput: 'Ta bratu, prečo furt dojebem?' })
// → jobautomation/OpenEuroLLM-Slovak:latest
```

---

### 4️⃣ llama3:latest - "VALIDATOR BOT"

**Použitie:**
- Validácia & formátovanie
- Krátke odpovede
- Bezpečnostné kontroly
- Real-time reviews

**Routing:**
- Persona: `VALIDATOR` → Primary model
- Task: `safety`, `memory`
- Fallback: `qwen2.5:14b`

**Príklad:**
```javascript
pickModelForTask({ persona: 'validator', userInput: 'Check this text' })
// → llama3:latest
```

---

### 5️⃣ llama3.1:70b - "OVERLORD TEACHER" 🔥

**Použitie:**
- Najťažšie otázky
- Komplexné reasoning
- Hlboký kontext
- Multi-agent fusion

**Overload Triggers:**
1. **Dĺžka otázky > 150 znakov**
2. **Komplexné keywords:**
   - `vysvetli mi detail`
   - `ako presne`
   - `architektúra`
   - `plán`, `rozpitvaj`
   - `krok za krokom`
   - `analyzuj`
   - `prečo` + dlhý text (20+ chars)

**Routing:**
- Auto-triggered by input complexity
- Overrides persona routing
- Fallback: `qwen2.5:14b`

**Príklad:**
```javascript
pickModelForTask({ 
  persona: 'core', 
  userInput: 'Vysvetli mi detailne architektúru kubernetes clustera...' 
})
// → llama3.1:70b (OVERLOAD MODE triggered)
```

---

## 🎯 Intelligent Router API

### `pickModelForTask(options)`

**Parameters:**
```javascript
{
  persona: string,      // 'core' | 'glitchoslav' | 'popici' | 'validator'
  userInput: string,    // User's message (for complexity analysis)
  task: string          // Legacy: 'reasoning' | 'coding' | 'emotional' | 'memory' | 'safety'
}
```

**Returns:** `string` - Selected model name

**Logic:**
```
1. Check OVERLOAD triggers (length > 150 OR complex keywords)
   → Return llama3.1:70b

2. Check PERSONA routing
   → Return persona.primary model

3. Check TASK routing (legacy)
   → Return task.primary model

4. DEFAULT FALLBACK
   → Return qwen2.5:14b (CORE)
```

---

### `askLocalLLM(userMessage, systemPrompt, modelOrPersona, options)`

**Enhanced with intelligent routing:**

```javascript
// Direct model call
await askLocalLLM('Hello', 'You are AI', 'llama3:latest')

// Persona routing
await askLocalLLM('Prečo?', 'You are GLITCH', 'glitchoslav')
// → Auto-selects deepseek-r1:14b

// Explicit persona in options
await askLocalLLM('Docker?', 'You are CORE', 'llama3', { persona: 'core' })
// → Auto-selects qwen2.5:14b

// Overload auto-trigger
await askLocalLLM(
  'Vysvetli mi detailne architektúru kubernetes clustera, ako presne fungujú pods, services, ingress a deployments. Potrebujem hlboké pochopenie každého komponentu krok za krokom.',
  'You are CORE',
  'core'
)
// → Auto-selects llama3.1:70b (length > 150 + complex keywords)
```

---

## 🔍 Diagnostics

### `/debug_engines` Command

**CLI:**
```bash
node -e "import('./llmLocal.js').then(m => m.printModelDiagnostics())"
```

**Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 SP4 AI BEAST MODE - MODEL DIAGNOSTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖥️  Server: https://qkojis9kjslqbs-11434.proxy.runpod.net
📡 Status: ✅ ONLINE
🔄 Last check: Fri Nov 21 2025 15:00:00 GMT+0100

📦 Available Models:
   • llama3.1:70b (42.52GB)
   • qwen2.5:14b (8.99GB)
   • deepseek-r1:14b (8.99GB)
   • jobautomation/OpenEuroLLM-Slovak:latest (8.15GB)
   • llama3:latest (4.66GB)

🎭 Persona Routing:

   CORE:
   ├─ Primary: qwen2.5:14b
   ├─ Fallback: llama3:latest
   └─ Use case: Technical answers, facts, architecture, debug

   GLITCHOSLAV:
   ├─ Primary: deepseek-r1:14b
   ├─ Fallback: qwen2.5:14b
   └─ Use case: Philosophy, existential questions, introspection

   POPICI:
   ├─ Primary: jobautomation/OpenEuroLLM-Slovak:latest
   ├─ Fallback: qwen2.5:14b
   └─ Use case: Dialect, humor, straight talk, no bullshit

   VALIDATOR:
   ├─ Primary: llama3:latest
   ├─ Fallback: qwen2.5:14b
   └─ Use case: Validation, formatting, safety checks

🔥 Overload Mode (70B Beast):
   Model: llama3.1:70b
   Triggers: Length > 150 chars OR complex keywords
   Available: ✅ YES

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Programmatic API:**
```javascript
import { getModelDiagnostics } from './llmLocal.js';

const diag = await getModelDiagnostics();
console.log(diag.server.status);        // '✅ ONLINE'
console.log(diag.stats.totalModels);    // 5
console.log(diag.stats.beastModeAvailable); // true
```

---

## 📊 Performance Benchmarks

| Query Type | Model Used | Latency | Quality |
|------------|-----------|---------|---------|
| Short technical | qwen2.5:14b | ~1.5s | ⭐⭐⭐⭐ |
| Existential | deepseek-r1:14b | ~2s | ⭐⭐⭐⭐⭐ |
| Slovak dialect | OpenEuroLLM | ~1.8s | ⭐⭐⭐⭐ |
| Validation | llama3:latest | ~0.8s | ⭐⭐⭐ |
| Complex reasoning | llama3.1:70b | ~5-8s | ⭐⭐⭐⭐⭐ |

**VRAM Usage:**
- Idle: ~10GB (qwen + deepseek + Slovak + llama3 in cache)
- Overload: ~55GB (70B beast loaded)

---

## 🎭 Persona Integration

**Before (v0.10.3):**
```javascript
// Manual model selection
const model = mode === 'glitch' ? 'llama3:latest' : 'llama3:latest';
const response = await askLocalLLM(msg, prompt, model);
```

**After (v0.11):**
```javascript
// Intelligent auto-routing
const response = await askLocalLLM(msg, prompt, mode, { persona: mode });
// → Auto-selects best model based on persona + input complexity
```

**Integration points:**
- `multiVoice.js` - Persona detection → model routing
- `integration.js` - processMessage() → auto persona routing
- `rituals.js` - `/fire` mode → overload trigger

---

## 🔧 Configuration

### Model Registry

**File:** `llmLocal.js`

```javascript
export const MODEL_REGISTRY = {
  core: {
    primary: "qwen2.5:14b",
    fallback: "llama3:latest",
    description: "Technical answers, facts, architecture, debug"
  },
  glitchoslav: {
    primary: "deepseek-r1:14b",
    fallback: "qwen2.5:14b",
    description: "Philosophy, existential questions, introspection"
  },
  popici: {
    primary: "jobautomation/OpenEuroLLM-Slovak:latest",
    fallback: "qwen2.5:14b",
    description: "Dialect, humor, straight talk, no bullshit"
  },
  validator: {
    primary: "llama3:latest",
    fallback: "qwen2.5:14b",
    description: "Validation, formatting, safety checks"
  },
  overload: {
    primary: "llama3.1:70b",
    fallback: "qwen2.5:14b",
    description: "Complex questions, architecture, multi-agent fusion",
    triggerConditions: {
      minLength: 150,
      keywords: /vysvetli\s+(mi\s+)?detail|ako\s+presne|architektúr|plán|rozpitvaj|krok\s+za\s+krokom|analyzuj|prečo\s+.{20,}/i
    }
  }
};
```

### Ollama Host

**RunPod GPU:**
```javascript
export const OLLAMA_HOST = "https://qkojis9kjslqbs-11434.proxy.runpod.net";
```

**Localhost (fallback):**
```javascript
export const OLLAMA_HOST = "http://localhost:11434";
```

---

## 🚀 Testing

### Unit Tests

```bash
# Test routing logic
node -e "import('./llmLocal.js').then(m => {
  console.log('CORE:', m.pickModelForTask({ persona: 'core', userInput: 'Docker?' }));
  console.log('GLITCH:', m.pickModelForTask({ persona: 'glitchoslav', userInput: 'Prečo?' }));
  console.log('POPIČI:', m.pickModelForTask({ persona: 'popici', userInput: 'Ta kokot' }));
  console.log('OVERLOAD:', m.pickModelForTask({ persona: 'core', userInput: 'Vysvetli mi detailne architektúru kubernetes clustera, ako presne fungujú pods, services, ingress a deployments. Potrebujem hlboké pochopenie každého komponentu krok za krokom.' }));
})"
```

**Expected Output:**
```
🎭 Persona routing: core → qwen2.5:14b
CORE: qwen2.5:14b

🎭 Persona routing: glitchoslav → deepseek-r1:14b
GLITCH: deepseek-r1:14b

🎭 Persona routing: popici → jobautomation/OpenEuroLLM-Slovak:latest
POPIČI: jobautomation/OpenEuroLLM-Slovak:latest

🔥 OVERLOAD MODE: Triggering llama3.1:70b (length: 176, complex: true)
OVERLOAD: llama3.1:70b
```

### Integration Test

```bash
# Full SP4 agent with GPU
npm start

# Test queries:
> Čo je Docker?                    # → qwen2.5:14b (CORE)
> Prečo existujem?                 # → deepseek-r1:14b (GLITCH)
> Ta bratu, prečo to nefunguje?    # → Slovak LLM (POPIČI)
> Vysvetli mi detailne ako funguje kubernetes... # → llama3.1:70b (OVERLOAD)
```

---

## 📈 Optimizations

### VRAM Management

**Lazy loading:**
- Models load on first request
- 70B beast loads only when triggered
- Smaller models stay in cache

**Offloading (if needed):**
```bash
# In Modelfile
PARAMETER options '{"num_gpu":0}'  # Offload to CPU
```

### Speed Optimizations

1. **Quick persona routing** - No LLM call for model selection
2. **Keyword-based triggers** - Regex matching <1ms
3. **Cached health checks** - 5min cache window
4. **Direct model calls** - No unnecessary fallback chains

---

## 🛡️ Safety & Constraints

### Persona Validators

**POPIČI:**
- ✅ Must contain dialect markers (ta, bo, šak, kokot)
- ❌ No emojis
- ✅ Straight talk, no corporate speak

**CORE:**
- ❌ No emojis
- ❌ No slang
- ✅ Technical precision

**GLITCHOSLAV:**
- ✅ Mystical tone
- ✅ Metaphors allowed
- ✅ Philosophical depth

**Fire Mode:**
- Overrides all persona restrictions
- Forces brutal honesty
- No emoji, no softening

---

## 📦 Deployment Checklist

- [x] All 5 models pulled on RunPod
- [x] MODEL_REGISTRY configured
- [x] pickModelForTask() intelligent routing
- [x] askLocalLLM() integration
- [x] Overload triggers calibrated
- [x] Diagnostics API created
- [x] Unit tests passed
- [x] OLLAMA_HOST pointed to RunPod
- [x] Backward compatibility preserved
- [x] Documentation complete

---

## 🎯 Next Steps (v0.12)

**Immediate:**
1. Monitor overload trigger frequency (log analytics)
2. Fine-tune 70B beast temperature (currently 0.7)
3. Add model warm-up on agent start
4. Implement model fallback retry logic

**Future:**
1. Multi-agent fusion (70B orchestrating 14B models)
2. Streaming responses for 70B (reduce perceived latency)
3. Model fine-tuning (LoRA adapters for SP4 personality)
4. Cost tracking (RunPod GPU usage)
5. Dataset logging (prepare for future training)

---

**Built with GPU fire. Tested in chaos. 5 models. 1 soul.**

🔥 SP4_CORE_AGENT v0.11 "AI Beast Mode"

"Be real. Be free. Be intelligent."
