# 🌩️ SP4AIOS Integration v0.7 - Cloud AI Bridge

**Status**: ✅ INTEGRATED (Variant 1 - Safe Integration)  
**Date**: 2025-01-24  
**Version**: SP4 Core Agent v0.7 + SP4AIOS v1.0.0

---

## 📋 Overview

SP4AIOS Bridge je teraz integrovaný do SP4 Core Agent. Systém intelligent rozhoduje kedy použiť **cloud AI** (Groq, Google Gemini) a kedy zostať pri **lokálnych modeloch** (Ollama).

### Architecture

```
User Input
    ↓
SP4IntegratedAgent.processMessage()
    ↓
[Mode Detection] → pickMode() determines: core/popici/glitchoslav
    ↓
[Emotional Analysis] → emotionalProcessor analyzes intensity
    ↓
[Cloud AI Routing Check] → shouldUseCloudAI() evaluates:
    │
    ├─→ [YES: Cloud Path] → askCloudAI() → SP4AIOSBridge
    │       │
    │       ├─→ Groq: llama-3.3-70b-versatile ($0.59/M tokens, 673ms)
    │       ├─→ Google: gemini-2.5-flash (FREE, 3754ms)
    │       └─→ [Fallback on Cloud Error] → Local Orchestration
    │
    └─→ [NO: Local Path] → orchestrate() → Ollama models
            │
            └─→ llama3:8b, mistral:7b, qwen2.5:14b, etc.
```

---

## 🎯 Smart Routing Heuristics

### When Cloud AI is Used:

1. **Long/Complex Prompts** (> 2000 characters)
   ```javascript
   if (input.length > 2000) → Cloud
   ```

2. **Complex Reasoning Tasks** (English + Slovak patterns)
   - **Code**: `code|algorithm|implement|debug|vytvor.*server|kód`
   - **Analysis**: `analyze|compare|evaluate|analyzuj|porovnaj`
   - **Writing**: `write.*(article|essay)|napíš.*článok`
   - **Planning**: `plan|strategy|design|návrh|dizajn`

3. **High Priority Modes**
   - `mode=glitchoslav + priority=high`

4. **Explicit User Request**
   - `[cloud]`, `[quality]`, `[premium]` tags in message

5. **Local LLM Failure** (Emergency Fallback)
   - If Ollama fails/times out within last 5 minutes → force cloud

6. **Budget Available**
   - Daily budget: $5.00 max
   - Current spending tracked in `this.dailyCloudCost`

7. **Capability Level** 
   - NOT in SAFE degradation mode (SAFE = local only)

### When Local AI is Used:

- ✅ Simple greetings ("ahoj", "čo robíš")
- ✅ Short questions (< 2000 chars)
- ✅ Non-complex tasks
- ✅ Budget exceeded ($5/day limit)
- ✅ Cloud AI disabled (`cloudAIEnabled = false`)
- ✅ System in SAFE degradation mode

---

## 🔧 Configuration

### Constructor (integration.js)

```javascript
this.aiosBridge = new SP4AIOSBridge({
  groqKey: process.env.GROQ_API_KEY,          // c:\SP4KULT\SP4AIOS\.env
  googleKey: process.env.GOOGLE_API_KEY,      // c:\SP4KULT\SP4AIOS\.env
  cacheEnabled: true,
  costTracking: true,
  budgetLimit: 5.0  // $5/day max
});

this.cloudAIEnabled = true;  // Global cloud AI switch
this.maxDailyCloudCost = 5.0;
this.dailyCloudCost = 0;
this.lastLocalError = null;
```

### API Keys (.env location)

**Path**: `c:\SP4KULT\SP4AIOS\.env`

```env
GROQ_API_KEY=<set_in_environment>
GOOGLE_API_KEY=<set_in_environment>
```

**Security**: `.env` is in `.gitignore` (never committed)

---

## 💰 Cost Tracking

### Groq Pricing (llama-3.3-70b-versatile)

- **Input**: $0.59 per 1M tokens
- **Output**: $0.79 per 1M tokens
- **Speed**: ~673ms average latency
- **Quality**: Excellent for code generation

### Google Gemini 2.5 Flash

- **Input**: $0.00 (FREE tier)
- **Output**: $0.00 (FREE tier)
- **Speed**: ~3754ms average latency
- **Quality**: Good for general tasks

### Budget Enforcement

```javascript
if (this.dailyCloudCost >= this.maxDailyCloudCost) {
  console.log(`💰 Daily cloud budget exceeded`);
  return false; // Use local instead
}
```

**Cost Log**: `c:\SP4KULT\SP4AIOS\logs\aios_costs.jsonl`

Example:
```json
{"timestamp":"2025-01-24T23:15:42.123Z","provider":"groq","model":"llama-3.3-70b-versatile","inputTokens":150,"outputTokens":320,"cost":0.000341,"cacheHit":false}
```

---

## 📊 System Status API

### getSystemStatus() Enhancement

```javascript
const status = sp4Agent.getSystemStatus();
```

**New Cloud AI Metrics**:
```json
{
  "cloudAI": {
    "enabled": true,
    "dailyCost": 0.003456,
    "budgetLimit": 5.0,
    "budgetRemaining": 4.996544,
    "providers": {
      "groq": {
        "model": "llama-3.3-70b-versatile",
        "avgLatency": 673,
        "totalRequests": 5,
        "totalCost": 0.002103
      },
      "google": {
        "model": "gemini-2.5-flash",
        "avgLatency": 3754,
        "totalRequests": 2,
        "totalCost": 0.0
      }
    },
    "cacheStats": {
      "hits": 3,
      "misses": 7,
      "hitRate": 0.3,
      "estimatedSavings": 0.001234
    }
  }
}
```

---

## 🧪 Testing

### Test Script: `test_aios_integration.js`

**Location**: `c:\SP4KULT\sp4_core_agent\test_aios_integration.js`

```bash
cd c:\SP4KULT\sp4_core_agent
node test_aios_integration.js
```

**Tests**:
1. ✅ Simple greeting → LOCAL (Ollama)
2. ✅ Complex coding task → CLOUD (Groq/Google)
3. ✅ Cost tracking
4. ✅ Cache hit detection
5. ✅ System status with cloud metrics

### Expected Output:

```
TEST 1: Simple greeting (should use LOCAL)
📨 Input: "ahoj, ako sa mas?"
✅ Response: Ahoj! Mám sa dobre, ďakujem... (from Ollama llama3:8b)
🎯 Handled by: local orchestration
💰 Cost: $0

TEST 2: Complex coding task (should use CLOUD)
📨 Input: [Complex coding task, 642 chars]
🌩️ Using cloud AI - complex reasoning task
✅ Response preview: Here's a production-ready Express.js REST API... (from Groq)
🎯 Handled by: cloud_ai
☁️  Cloud provider: SP4AIOS
💰 Cost: $0.000341
⚡ Latency: 673ms
📊 Cache hit: NO
```

---

## 🔄 Fallback Logic

### Cloud → Local Fallback

```javascript
if (shouldUseCloud) {
  try {
    const cloudResponse = await this.askCloudAI(userMessage, mode, options);
    // Success: use cloud response
  } catch (cloudError) {
    console.error(`❌ Cloud AI failed, falling back to local: ${cloudError.message}`);
    this.lastLocalError = Date.now(); // Track failure
    
    // Fallback: use orchestrate()
    orchestrationResult = await orchestrate(userMessage, agentContext);
  }
}
```

### Local → Cloud Emergency

```javascript
// If local Ollama times out/fails repeatedly
if (this.lastLocalError && Date.now() - this.lastLocalError < 300000) {
  console.log('⚠️ Using cloud AI - local LLM failed recently');
  return true; // Force cloud for next 5 minutes
}
```

---

## 📈 Performance Benchmarks

| Metric | Groq (llama-3.3-70b) | Google (gemini-2.5) | Ollama (llama3:8b) |
|--------|----------------------|---------------------|--------------------|
| **Latency** | 673ms | 3754ms | 2000-8000ms (varies) |
| **Cost** | $0.000341/req | $0.00 (FREE) | $0.00 (local) |
| **Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Code Gen** | Excellent | Good | Fair |
| **Slovak** | Good | Good | **Excellent** |
| **Privacy** | Cloud ⚠️ | Cloud ⚠️ | **100% Local** ✅ |

---

## 🛡️ Security Notes

### Privacy Considerations

- **Cloud AI**: Data sent to Groq/Google servers (encrypted HTTPS)
- **Local AI**: 100% offline, no data leaves your machine
- **API Keys**: Stored in `.env`, never committed to git
- **Cost Limit**: $5/day prevents unexpected charges

### Recommended Settings

**For Privacy-First Users**:
```javascript
this.cloudAIEnabled = false; // Disable cloud entirely
```

**For Performance Users**:
```javascript
this.cloudAIEnabled = true;
this.maxDailyCloudCost = 10.0; // Increase budget
```

**For Budget-Conscious Users**:
```javascript
this.maxDailyCloudCost = 1.0; // Tight budget
// Use Groq sparingly, prefer Google (free)
```

---

## 🚀 Future Enhancements

### Planned for v0.8:

- [ ] **User-configurable routing** via `/cloud on|off|auto` command
- [ ] **Per-mode budgets** (glitchoslav: $2, popici: $1, core: $0.50)
- [ ] **Cost analytics dashboard** (daily/weekly/monthly stats)
- [ ] **Model selection UI** (let user pick Groq vs Google)
- [ ] **Cache warmup** (preload frequent queries)
- [ ] **A/B testing** (compare cloud vs local quality)

### Planned for v1.0:

- [ ] **OpenAI GPT-4 integration** (premium tier)
- [ ] **Anthropic Claude integration** (best reasoning)
- [ ] **Mistral AI integration** (Europe-based)
- [ ] **Auto-scaling budget** (increase limit when needed)
- [ ] **Cost prediction** (estimate before sending)

---

## 📝 Changelog

### v0.7.0 (2025-01-24)

- ✅ Integrated SP4AIOS bridge into `integration.js`
- ✅ Added `shouldUseCloudAI()` with 7 routing heuristics
- ✅ Added `askCloudAI()` intelligent wrapper
- ✅ Added `estimateComplexity()` 4-tier system
- ✅ Added `getCloudSystemPrompt()` mode-specific prompts
- ✅ Enhanced `getSystemStatus()` with cloud metrics
- ✅ Added cloud→local fallback on errors
- ✅ Added local→cloud emergency mode (5min window)
- ✅ Added budget tracking ($5/day default)
- ✅ Added Slovak language pattern matching
- ✅ Created `test_aios_integration.js` test suite

### Known Issues

- ⚠️ Ollama sometimes slow (90s timeout on complex queries)
  - **Workaround**: Cloud AI fallback activates automatically
- ⚠️ Google Gemini rate limits (60 requests/minute free tier)
  - **Workaround**: Groq used as primary, Google as backup

---

## 🤝 Credits

- **SP4AIOS Bridge**: Built with ❤️ by GitHub Copilot + kefyk
- **Provider APIs**: Groq, Google AI Studio, OpenAI, Anthropic, Mistral
- **Integration**: Safe Variant 1 approach (preserves SP4 Core architecture)
- **Testing**: Real-world testing with Groq + Google providers

---

## 📞 Support

**Issues?** Check:
1. API keys in `.env` (correct format)
2. Budget not exceeded (`dailyCloudCost < 5.0`)
3. Cloud AI enabled (`cloudAIEnabled = true`)
4. Network connectivity (cloud providers require internet)
5. Ollama running (`ollama list` to verify local models)

**Debug Mode**:
```javascript
console.log(this.aiosBridge.getStats()); // Check cloud stats
console.log(this.getSystemStatus()); // Full system status
```

---

**🔥 SP4 CORE AGENT v0.7 - Now with Cloud AI Superpowers! 🌩️**

*"Be real. Be free. Be fast."*
