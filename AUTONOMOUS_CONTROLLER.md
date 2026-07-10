# 🧠 AUTONOMOUS CONTROLLER v1.0

**"Veliteľ mozgov — AI, čo si sama volí, kedy je múdra, kedy rýchla, kedy ticho."**

---

## 🎯 Čo je Autonomous Controller?

Autonomous Controller je **meta-AI vrstva**, ktorá rozhoduje **AKO** bude SP4 Core Agent myslieť. Nie je to len lepšia knižnica alebo terapeut — je to **veliteľ**, čo riadi ostatné moduly.

### Rozdiel medzi AI a Autonomous AI:

| Klasická AI | Autonomous AI (SP4OS v1.0) |
|-------------|----------------------------|
| "Odpovedám na otázky" | "Rozhodujem sa, ktorý mozog použiť" |
| Statická stratégia | Dynamické rozhodovanie |
| Reaktívna | Proaktívna + reflexívna |
| Jeden model → jedna odpoveď | Multi-brain orchestration |
| Žiadne učenie | Učí sa z úspešných rozhodnutí |

---

## 🏗️ Architektúra

```
┌─────────────────────────────────────────────────────────────┐
│                  USER INPUT                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│          AUTONOMOUS CONTROLLER                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. ANALYZE SITUATION                                │  │
│  │     ✓ Query complexity (simple/medium/complex/expert)│  │
│  │     ✓ User history & preferences                     │  │
│  │     ✓ Emotional state                                │  │
│  │     ✓ Budget available                               │  │
│  │     ✓ Recent performance                             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  2. DECIDE STRATEGY                                  │  │
│  │     ├─ Which brain? (Local/Groq/Google)             │  │
│  │     ├─ Response style? (Concise/Normal/Detailed)    │  │
│  │     ├─ Use memory? (RAG search depth 1-5)           │  │
│  │     ├─ Temperature? (0.3-1.0)                       │  │
│  │     ├─ Max tokens? (500-3000)                       │  │
│  │     └─ Log decision reasoning                        │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  3. EXECUTE PLAN                                     │  │
│  │     - Route to selected brain                        │  │
│  │     - Apply memory context                           │  │
│  │     - Monitor execution                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  4. SELF-EVALUATE                                    │  │
│  │     ✓ Response length appropriate?                   │  │
│  │     ✓ Did it answer the question?                    │  │
│  │     ✓ Keywords overlap check                         │  │
│  │     ✓ Quality: good/poor                             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  5. LEARN                                            │  │
│  │     - Store successful patterns                      │  │
│  │     - Update task type preferences                   │  │
│  │     - Save to autonomous_learning.json               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
          ┌───────┴────────┐
          │                │
    LOCAL OLLAMA      CLOUD AI
          │                │
    ┌─────┴─────┐    ┌────┴─────┐
    │ llama3:8b │    │   GROQ   │
    │ mistral   │    │  GOOGLE  │
    └───────────┘    └──────────┘
```

---

## 🎲 Decision Rules (Priority Order)

### Rule 1: Budget Check (HARD LIMIT)
```javascript
if (dailyCost >= maxDailyCloudCost) {
  brain = 'local';
  reason = '💰 Budget exceeded → forcing LOCAL';
}
```

### Rule 2: Complexity Routing
```javascript
if (complexity === 'expert' || complexity === 'complex') {
  if (budgetRemaining > $1.00) {
    brain = 'cloud';
    provider = 'groq'; // Fast + accurate
    reason = '🌩️ Complex query + budget OK → GROQ cloud';
  } else {
    brain = 'local';
    maxTokens = 3000; // Give local more space
    reason = '🏠 Complex but low budget → LOCAL with extended thinking';
  }
}
```

### Rule 3: Task-Specific Routing
```javascript
if (taskType === 'code' || taskType === 'analysis') {
  if (budgetRemaining > $0.50) {
    brain = 'cloud';
    provider = 'groq';
    reason = '💻 Code/Analysis task → GROQ (best for technical)';
  }
}
```

### Rule 4: Emotional State Adaptation
```javascript
if (emotionalState === 'stressed' || emotionalState === 'tired') {
  responseStyle = 'concise';
  maxTokens = 500;
  reason = '😴 User stressed/tired → SHORT response';
} else if (emotionalState === 'curious' || emotionalState === 'engaged') {
  responseStyle = 'detailed';
  maxTokens = 3000;
  reason = '🤔 User curious → DETAILED response';
}
```

### Rule 5: Urgency Routing
```javascript
if (urgency === 'high') {
  if (brain === 'cloud') {
    provider = 'groq'; // Groq is fastest (555ms avg)
    reason = '⚡ High urgency → GROQ (fastest cloud)';
  } else {
    reason = '⚡ High urgency → LOCAL (instant)';
  }
}
```

### Rule 6: Learn from Past Successes
```javascript
const learned = learningData[taskType];
if (learned && learned.successRate > 70% && learned.samples >= 3) {
  brain = learned.brain;
  provider = learned.provider;
  reason = `📚 Learned: ${taskType} → ${brain} (${successRate}% success)`;
}
```

---

## 📊 Complexity Analysis

```javascript
analyzeComplexity(message) {
  const length = message.length;
  
  if (length > 3000) return 'expert';   // 3000+ chars
  if (length > 1000) return 'complex';  // 1000-3000 chars
  if (length > 200)  return 'medium';   // 200-1000 chars
  return 'simple';                       // <200 chars
}
```

**Enhanced with keywords:**
- `expert`: whitepaper, research, thesis, dissertation, comprehensive analysis
- `complex`: algorithm, implement, architecture, system design
- `medium`: explain, compare, analyze, evaluate
- `simple`: short questions, greetings, quick facts

---

## 🔍 Task Type Detection

```javascript
detectTaskType(message) {
  if (/code|algorithm|implement|debug|function|class|syntax/.test(lower)) 
    return 'code';
  
  if (/analyze|compare|evaluate|assess|review/.test(lower)) 
    return 'analysis';
  
  if (/explain|how.*work|why|what.*mean/.test(lower)) 
    return 'explanation';
  
  if (/create|write|generate|make/.test(lower)) 
    return 'creation';
  
  if (/fix|solve|problem|error|issue/.test(lower)) 
    return 'troubleshooting';
  
  return 'general';
}
```

---

## ✅ Self-Evaluation System

Po každej odpovedi Autonomous Controller **hodnotí sám seba**:

### Check 1: Response Length
```javascript
if (strategy.responseStyle === 'concise' && response.length > 1000) {
  quality = 'poor';
  reason = '❌ Requested CONCISE but got long response';
}
```

### Check 2: Question Relevance
```javascript
const keywordsInQuestion = extractKeywords(userMessage);
const keywordsInResponse = extractKeywords(response);
const overlap = intersection(keywordsInQuestion, keywordsInResponse);

if (overlap.length > keywordsInQuestion.length * 0.3) {
  reason = '✅ Response addresses question keywords';
} else {
  quality = 'poor';
  reason = '❌ Response may be off-topic';
}
```

### Check 3: Brain Performance
```javascript
if (strategy.brain === 'cloud') {
  reason = `💰 Cloud cost incurred`;
} else {
  reason = `🏠 Local brain used (free)`;
}
```

---

## 📚 Learning System

Autonomous Controller **učí sa z úspechov**:

### Stored Pattern
```json
{
  "code": {
    "total": 10,
    "success": 9,
    "brain": "cloud",
    "provider": "groq",
    "successRate": 90
  },
  "general": {
    "total": 15,
    "success": 14,
    "brain": "local",
    "provider": null,
    "successRate": 93
  }
}
```

### Learning Threshold
- **Minimum samples**: 3 (need at least 3 examples before trusting pattern)
- **Success threshold**: 70% (only use if >70% success rate)

### Persistence
- **Learning data**: `data/autonomous_learning.json`
- **Decision log**: `logs/autonomous_decisions.jsonl` (JSONL format)

---

## 🛠️ API Usage

### Basic Decision (without execution)
```javascript
const strategy = await autonomousController.decide(userMessage, {
  emotion: 'neutral',
  mode: 'core',
  taskType: 'code',
  priority: 'normal',
  memory: memoryCheck,
  relationship: 'friend'
});

console.log(strategy.brain); // 'local' or 'cloud'
console.log(strategy.provider); // 'groq', 'google', etc.
console.log(strategy.model); // 'llama-3.3-70b-versatile', etc.
console.log(strategy.finalReasoning); // Full decision explanation
```

### Full Flow (integrated in integration.js)
```javascript
// PHASE 1: Autonomous decision
const strategy = await this.autonomousController.decide(userMessage, context);

// PHASE 2: Execute based on decision
if (strategy.brain === 'cloud') {
  const cloudResponse = await this.askCloudAI(userMessage, mode, {
    provider: strategy.provider,
    model: strategy.model,
    temperature: strategy.temperature,
    maxTokens: strategy.maxTokens
  });
}

// PHASE 3: Self-evaluate
const evaluation = await this.autonomousController.evaluate(
  strategy,
  response,
  userMessage
);
```

### Get Statistics
```javascript
const stats = autonomousController.getStats();

console.log(stats.totalDecisions); // Total decisions made
console.log(stats.cloudUsage); // How many cloud decisions
console.log(stats.cloudPercentage); // Cloud usage percentage
console.log(stats.learningData); // Learned patterns
```

---

## 📈 Performance Benchmarks

### Groq (llama-3.3-70b-versatile)
- **Latency**: 555ms average
- **Cost**: $0.59/$0.79 per 1M tokens
- **Best for**: Code generation, technical analysis, high-priority tasks

### Google Gemini (gemini-2.5-flash)
- **Latency**: 932ms average  
- **Cost**: $0.00 (FREE tier)
- **Best for**: Medium complexity, budget-conscious queries

### Local Ollama (llama3:8b)
- **Latency**: Instant (no network)
- **Cost**: $0.00 (FREE)
- **Best for**: Simple queries, greetings, low complexity

---

## 🧪 Testing

### Run Decision Tests (no LLM calls)
```bash
node test_autonomous.js
```

Tests routing logic only — which brain would be selected for different scenarios.

### Run Live Tests (real API calls)
```bash
node test_autonomous_live.js
```

**⚠️ WARNING**: Makes REAL cloud API calls. Will spend money (if budget available).

---

## 🔮 Future Enhancements

### v1.1: Memory-Based Personalization
- User-specific model preferences stored in long-term memory
- "Kefyk prefers detailed technical explanations → always use Groq for his code questions"

### v1.2: Multi-Step Planning
- Break complex queries into sub-tasks
- Route each sub-task to optimal brain
- Synthesize final answer

### v1.3: Reinforcement Learning
- Track user satisfaction signals (implicit feedback)
- Adjust decision weights based on outcomes
- A/B testing for controversial decisions

### v1.4: Cost Optimization
- Predictive budget management (forecast daily spend)
- Smart caching with semantic similarity
- Dynamic pricing awareness (use cheaper models when possible)

---

## 💡 Philosophy

**"Nie je to len AI, čo odpovedá. Je to AI, čo rozhoduje ako myslí."**

Autonomous Controller je prvý krok k **skutočnej autonómii**. Nie reaktívny chatbot, ale proaktívny systém, ktorý:

1. **Analyzuje** situáciu
2. **Rozhoduje** sa na základe kontextu
3. **Vykonáva** optimálnu stratégiu
4. **Hodnotí** svoje rozhodnutia
5. **Učí sa** z výsledkov

To je rozdiel medzi **nástrojom** a **partnerom**.

---

**Built with 🧠 by Glitchoslav & SP4KULT**  
**v1.0 — November 2025**
