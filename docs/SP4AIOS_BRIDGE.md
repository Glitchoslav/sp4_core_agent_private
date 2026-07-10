# SP4AIOS Bridge 🌉

Most medzi SP4 Core Agent a online AI modelmi (OpenAI, Anthropic, Google AI, Mistral).

## 🚀 Vlastnosti

- **Multi-Provider Support**: OpenAI, Anthropic (Claude), Google AI (Gemini), Mistral AI
- **Inteligentný Routing**: Automaticky vyberie najlepší model podľa complexity a priority
- **Cost Tracking**: Sleduje náklady na každé API volanie
- **Smart Caching**: LRU cache pre úsporu nákladov
- **Fallback to Local**: Pri zlyhaní cloud API automaticky použije lokálny Ollama
- **Rate Limiting**: Ochrana pred prekročením limitov
- **Detailed Metrics**: Latency, token usage, cache hit rate

## 📦 Inštalácia

```bash
# SP4AIOS Bridge je už súčasťou SP4 Core
# Potrebuješ len nastaviť API keys
```

## 🔑 Konfigurácia API Keys

### Windows PowerShell
```powershell
# Nastaviť environment variables
$env:OPENAI_API_KEY="sk-..."
$env:ANTHROPIC_API_KEY="sk-ant-..."
$env:GOOGLE_API_KEY="..."
$env:MISTRAL_API_KEY="..."

# Alebo uložiť do .env súboru (odporúčané)
```

### Linux/Mac
```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="..."
export MISTRAL_API_KEY="..."
```

### .env súbor (odporúčané)
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
MISTRAL_API_KEY=...
```

## 💡 Základné použitie

```javascript
import SP4AIOSBridge from './SP4AIOSBridge.js';

const bridge = new SP4AIOSBridge({
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  googleApiKey: process.env.GOOGLE_API_KEY
});

// Jednoduchý query
const response = await bridge.ask(
  'Vysvetli mi koncept kvantového počítania',
  { 
    provider: 'openai',
    model: 'gpt-4o-mini'
  }
);

console.log(response.text);
console.log(`Cost: $${response.cost.toFixed(6)}`);
console.log(`Latency: ${response.latency}ms`);
```

## 🎯 Inteligentný Routing

Bridge automaticky vyberie najlepší model:

```javascript
// Pre jednoduché queries → použije lokálny model (zadarmo)
const simple = await bridge.intelligentRoute(
  'Ahoj, ako sa máš?',
  { complexity: 'low' }
);

// Pre komplexné queries → použije Claude Sonnet
const complex = await bridge.intelligentRoute(
  'Napíš mi detailnú analýzu kvantovej kryptografie',
  { complexity: 'high', priority: 'high' }
);

// Pre medium queries → použije GPT-4o-mini (cost-effective)
const medium = await bridge.intelligentRoute(
  'Aké sú výhody TypeScript?',
  { complexity: 'medium' }
);
```

## 🌐 Podporované Providery

### OpenAI
```javascript
const response = await bridge.ask(prompt, {
  provider: 'openai',
  model: 'gpt-4o',              // Najlepší model
  // model: 'gpt-4o-mini',       // Cost-effective
  // model: 'gpt-4-turbo',       // Legacy
  temperature: 0.7,
  maxTokens: 2000
});
```

**Pricing:**
- `gpt-4o`: $2.50/$10.00 per 1M tokens (input/output)
- `gpt-4o-mini`: $0.15/$0.60 per 1M tokens
- `gpt-4-turbo`: $10.00/$30.00 per 1M tokens

### Anthropic (Claude)
```javascript
const response = await bridge.ask(prompt, {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',  // Najlepší pre reasoning
  // model: 'claude-3-5-haiku-20241022', // Najrýchlejší
  // model: 'claude-3-opus-20240229',    // Legacy powerhouse
  systemPrompt: 'Si expert na AI',
  temperature: 0.7
});
```

**Pricing:**
- `claude-3-5-sonnet`: $3.00/$15.00 per 1M tokens
- `claude-3-5-haiku`: $0.80/$4.00 per 1M tokens
- `claude-3-opus`: $15.00/$75.00 per 1M tokens

### Google AI (Gemini)
```javascript
const response = await bridge.ask(prompt, {
  provider: 'google',
  model: 'gemini-1.5-pro',       // Najlepší multimodal
  // model: 'gemini-1.5-flash',  // Rýchly a lacný
  // model: 'gemini-2.0-flash-exp', // Experimental (FREE!)
  temperature: 0.7
});
```

**Pricing:**
- `gemini-1.5-pro`: $1.25/$5.00 per 1M tokens
- `gemini-1.5-flash`: $0.075/$0.30 per 1M tokens
- `gemini-2.0-flash-exp`: **FREE** (experimental)

### Mistral AI
```javascript
const response = await bridge.ask(prompt, {
  provider: 'mistral',
  model: 'mistral-large-latest',
  // model: 'mistral-small-latest',
  temperature: 0.7
});
```

**Pricing:**
- `mistral-large`: $2.00/$6.00 per 1M tokens
- `mistral-small`: $0.20/$0.60 per 1M tokens

## 📊 Cost Tracking

```javascript
const bridge = new SP4AIOSBridge({
  enableCostTracking: true,
  costLogPath: './logs/aios_costs.jsonl'
});

// Po niekoľkých queries
const stats = bridge.getStats();
console.log(stats);
// {
//   totalRequests: 10,
//   cachedResponses: 3,
//   failedRequests: 1,
//   totalCost: 0.001234,
//   cacheHitRate: '30.00%',
//   failureRate: '10.00%'
// }
```

## 💾 Smart Caching

```javascript
const bridge = new SP4AIOSBridge({
  enableCache: true,
  cacheTTL: 3600000  // 1 hodina
});

// Prvé volanie - platené
const r1 = await bridge.ask('Čo je AI?');
console.log(r1.cached);  // false

// Druhé volanie - cached, zadarmo!
const r2 = await bridge.ask('Čo je AI?');
console.log(r2.cached);  // true
```

## 🔄 Fallback na Lokálny Model

```javascript
const bridge = new SP4AIOSBridge({
  fallbackToLocal: true,
  localLLMPath: './llmLocal.js'
});

// Ak OpenAI zlyhá, automaticky skúsi lokálny Ollama
const response = await bridge.ask(prompt, {
  provider: 'openai'  // Skúsi OpenAI, pri zlyhaní → Ollama
});

if (response.fallback) {
  console.log('Using local model as fallback');
}
```

## 🎭 Integrácia s SP4 Personas

```javascript
const personas = {
  glitchoslav: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'Si Glitchoslav, majster glitch umenia.',
    temperature: 0.9
  },
  popici: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    systemPrompt: 'Si POPIČI, priamy asistent.',
    temperature: 0.7
  }
};

const userQuery = 'Vysvetli mi AI';

for (const [name, config] of Object.entries(personas)) {
  const response = await bridge.ask(userQuery, config);
  console.log(`[${name}]: ${response.text}`);
}
```

## 🔍 Multi-Model Consensus

```javascript
const models = [
  { provider: 'openai', model: 'gpt-4o-mini' },
  { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
  { provider: 'google', model: 'gemini-1.5-flash' }
];

const responses = await Promise.all(
  models.map(config => bridge.ask(prompt, config))
);

// Porovnaj odpovede z rôznych modelov
responses.forEach(r => {
  console.log(`[${r.provider}]: ${r.text}`);
  console.log(`Cost: $${r.cost.toFixed(6)}\n`);
});
```

## 📈 Príklady použitia

Pozri `examples/aios_examples.js` pre kompletné príklady:

```bash
# Spusti príklady
node examples/aios_examples.js
```

Príklady zahŕňajú:
1. Základné použitie
2. Inteligentný routing
3. Porovnanie providerov
4. Cache a štatistiky
5. SP4 integrácia
6. Cost tracking
7. Multi-model consensus

## ⚙️ Konfigurácia

Uprav `config/aios.config.json`:

```json
{
  "routing": {
    "strategy": "intelligent",
    "fallbackToLocal": true,
    "rules": {
      "simple": { "preferLocal": true },
      "complex": { "preferredProvider": "anthropic" }
    }
  },
  "costManagement": {
    "budgets": {
      "daily": 10.0,
      "monthly": 200.0
    }
  },
  "caching": {
    "enabled": true,
    "ttl": 3600000
  }
}
```

## 💰 Cost Optimization Tips

1. **Používaj cache** - až 30% úspora
2. **Intelligent routing** - jednoduché queries → local model
3. **GPT-4o-mini** namiesto GPT-4o pre väčšinu taskov
4. **Gemini Flash** - veľmi lacný, dobrý na experimenty
5. **Gemini 2.0 Flash Exp** - FREE pre testing!

## 🚨 Error Handling

```javascript
try {
  const response = await bridge.ask(prompt, { 
    provider: 'openai',
    maxRetries: 3  // Automatické retry
  });
} catch (error) {
  console.error('All providers failed:', error);
  // Fallback na lokálny model je automatický ak je enabled
}
```

## 📝 Logging

```javascript
// Cost log (JSONL format)
// logs/aios_costs.jsonl
{"provider":"openai","model":"gpt-4o-mini","cost":0.000123,"timestamp":"2024-11-24T..."}
{"provider":"anthropic","model":"claude-3-5-sonnet","cost":0.001234,"timestamp":"2024-11-24T..."}

// Metrics
const stats = bridge.getStats();
console.log(`Total spent: $${stats.totalCost.toFixed(4)}`);
console.log(`Cache savings: ${stats.cacheHitRate}`);
```

## 🔐 Bezpečnosť

- **NIKDY** necommituj API keys do git
- Používaj environment variables alebo `.env` súbor
- Pridaj `.env` do `.gitignore`
- Nastav rate limiting v `config/aios.config.json`
- Monitoruj costs pravidelne

## 🎯 Odporúčania pre SP4AIOS

### Pre Development
- Používaj **Gemini 1.5 Flash** alebo **GPT-4o-mini** (lacné)
- Zapni caching
- Fallback na local model

### Pre Production
- Používaj **Claude 3.5 Sonnet** pre critical reasoning
- Používaj **GPT-4o-mini** pre majority of queries
- Strict cost budgets
- Monitoring alerts

### Pre Experimenty
- **Gemini 2.0 Flash Exp** - FREE!
- Multi-model consensus
- A/B testing

## 📞 Podpora

Issues: [GitHub Issues](https://github.com/Glitchoslav/sp4_core_agent_private/issues)

## 📄 Licencia

Private - SP4KULT Project

---

**Made with 🌀 by Glitchoslav**
