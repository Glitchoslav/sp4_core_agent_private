# 🌉 SP4AIOS Bridge - Quick Start Guide

## Rýchly Setup (5 minút)

### 1. Získaj API Keys

#### OpenAI (odporúčané pre začiatok)
1. Choď na https://platform.openai.com/api-keys
2. Vytvor nový API key
3. Skopíruj ho (začína `sk-...`)

#### Anthropic (Claude) - najlepší reasoning
1. Choď na https://console.anthropic.com/
2. Vytvor API key
3. Skopíruj ho (začína `sk-ant-...`)

#### Google AI (Gemini) - zadarmo pre testing!
1. Choď na https://aistudio.google.com/app/apikey
2. Vytvor API key
3. Skopíruj ho

### 2. Nastav Environment Variables

**PowerShell:**
```powershell
# Dočasne (platí len v tejto session)
$env:OPENAI_API_KEY="sk-..."
$env:ANTHROPIC_API_KEY="sk-ant-..."
$env:GOOGLE_API_KEY="..."

# Trvalé (pre PowerShell profil)
Add-Content $PROFILE "`n`$env:OPENAI_API_KEY='sk-...'"
```

**Alebo vytvor `.env` súbor:** (odporúčané)
```bash
# c:\SP4KULT\sp4_core_agent\.env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

### 3. Test Connection

```powershell
# Spusti test príklad
node examples/aios_examples.js
```

## Použitie v Kóde

### Minimálny Príklad
```javascript
import SP4AIOSBridge from './SP4AIOSBridge.js';

const bridge = new SP4AIOSBridge({
  openaiApiKey: process.env.OPENAI_API_KEY
});

const response = await bridge.ask('Ahoj, ako funguje AI?');
console.log(response.text);
```

### Smart Príklad (odporúčaný)
```javascript
import SP4AIOSBridge from './SP4AIOSBridge.js';

const bridge = new SP4AIOSBridge({
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  googleApiKey: process.env.GOOGLE_API_KEY,
  fallbackToLocal: true,  // Fallback na Ollama
  enableCache: true       // Šetrí náklady
});

// Inteligentný routing - automaticky vyberie najlepší model
const response = await bridge.intelligentRoute(
  'Napíš mi báseň o technológii',
  { 
    complexity: 'medium',
    priority: 'normal'
  }
);

console.log(response.text);
console.log(`Provider: ${response.provider}`);
console.log(`Cost: $${response.cost?.toFixed(6) || 0}`);
console.log(`Cached: ${response.cached}`);
```

## Cenové Hladiny

### 💰 FREE
- **Local Ollama** - 0€ (ale pomalý)
- **Gemini 2.0 Flash Exp** - 0€ (experimental, ale dobrý!)

### 💵 CHEAP (< $0.001 per request)
- **GPT-4o-mini** - $0.15/$0.60 per 1M tokens
- **Gemini 1.5 Flash** - $0.075/$0.30 per 1M tokens
- **Claude 3.5 Haiku** - $0.80/$4.00 per 1M tokens

### 💎 PREMIUM (pre dôležité tasky)
- **Claude 3.5 Sonnet** - $3.00/$15.00 per 1M tokens (najlepší reasoning)
- **GPT-4o** - $2.50/$10.00 per 1M tokens (silný all-rounder)
- **Gemini 1.5 Pro** - $1.25/$5.00 per 1M tokens (multimodal)

## Odporúčaná Stratégia

```javascript
// 1. Jednoduché queries → LOCAL (zadarmo)
if (query.length < 100) {
  response = await bridge.askLocal(query);
}

// 2. Medium queries → GPT-4o-mini (lacné)
else if (query.length < 1000) {
  response = await bridge.ask(query, {
    provider: 'openai',
    model: 'gpt-4o-mini'
  });
}

// 3. Komplexné reasoning → Claude Sonnet (kvalita)
else {
  response = await bridge.ask(query, {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022'
  });
}

// ALEBO použij intelligent routing (robí to automaticky):
response = await bridge.intelligentRoute(query, {
  complexity: determineComplexity(query),
  priority: 'normal'
});
```

## Typické Náklady

**Realistický denný usage:**
- 100 simple queries → local → **$0**
- 50 medium queries → GPT-4o-mini → **~$0.02**
- 10 complex queries → Claude Sonnet → **~$0.10**
- **TOTAL: ~$0.12/deň** (s cachingom ešte menej)

**S cache hit rate 30%:**
- Reálny cost: **~$0.08/deň**
- Mesačne: **~$2.40**

## Monitoring Costs

```javascript
// Štatistiky
const stats = bridge.getStats();
console.log(`Total cost today: $${stats.totalCost.toFixed(4)}`);
console.log(`Cache savings: ${stats.cacheHitRate}`);

// Denný report
console.log('Cost breakdown:');
console.log(`  OpenAI: $${costs.openai.toFixed(4)}`);
console.log(`  Anthropic: $${costs.anthropic.toFixed(4)}`);
console.log(`  Google: $${costs.google.toFixed(4)}`);
```

## Troubleshooting

### "API key not configured"
→ Nastav environment variable alebo .env súbor

### "Timeout" errors
→ Zvýš timeout:
```javascript
const bridge = new SP4AIOSBridge({
  timeout: 120000  // 2 minúty
});
```

### "Rate limit exceeded"
→ Zapni fallback:
```javascript
const bridge = new SP4AIOSBridge({
  fallbackToLocal: true,
  maxRetries: 3
});
```

### Vysoké náklady
→ Zapni caching a intelligent routing:
```javascript
const bridge = new SP4AIOSBridge({
  enableCache: true,
  cacheTTL: 3600000  // 1 hodina
});

// Používaj intelligent routing namiesto direct calls
await bridge.intelligentRoute(query, { complexity: 'low' });
```

## Best Practices

✅ **DO:**
- Používaj intelligent routing
- Zapni caching
- Monitoruj costs pravidelne
- Používaj lacné modely pre testing
- Nastav fallback na local

❌ **DON'T:**
- Necommituj API keys do git
- Nepoužívaj GPT-4o pre všetko (drahé)
- Nezabudni na rate limits
- Nevypíň caching

## Next Steps

1. ✅ Nastav API keys
2. ✅ Test connection (`node examples/aios_examples.js`)
3. 📚 Prečítaj si [`docs/SP4AIOS_BRIDGE.md`](./SP4AIOS_BRIDGE.md)
4. 🔧 Integruj do svojho projektu
5. 📊 Monitoruj costs

## Odkazy

- [Full Documentation](./SP4AIOS_BRIDGE.md)
- [Examples](../examples/aios_examples.js)
- [Config File](../config/aios.config.json)
- [OpenAI Pricing](https://openai.com/pricing)
- [Anthropic Pricing](https://www.anthropic.com/pricing)
- [Google AI Pricing](https://ai.google.dev/pricing)

---

Máš otázky? Pozri [SP4AIOS_BRIDGE.md](./SP4AIOS_BRIDGE.md) alebo vytvor issue!
