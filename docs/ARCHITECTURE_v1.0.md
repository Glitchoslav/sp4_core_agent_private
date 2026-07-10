# 📁 SP4 OS — ARCHITECTURE v1.0.0

**Date:** 2025-11-22  
**Status:** CANONICAL (locked for v1.0.0)  
**Authors:** Kefyk (SP4) + GitHub Copilot

**Scope disclaimer:** Tento dokument je law/contract only. Nie je runtime source of truth pre launch workflow, porty, verziu ani modelové prevádzkové tvrdenia. Runtime autorita pre operatívu žije v sp4.js, package.json skriptoch a aktívnom operator manuáli.

---

## 0. ÚČEL DOKUMENTU

Tento dokument opisuje architektúru **SP4 OS v1.0.0**:

- **Ako je systém rozdelený na vrstvy**
- **Aké moduly existujú a čo robia**
- **Ako spolu moduly komunikujú**
- **Čo je stabilné (API kontrakty) a čo sa môže meniť**

**Je určený pre:**

- Budúcich vývojárov SP4
- AI nástroje (Copilot, Cursor, ChatGPT)
- Mňa o 2 roky, keď zabudnem, čo som tu vlastne robil 😄

---

## 1. VYSOKOÚROVŇOVÝ POHĽAD

**SP4 OS** je lokálny AI operačný systém postavený na:

- **Ollama** (lokálne LLM modely)
- **Node.js** (orchestrácia, IO, plánovanie)
- **SP4 Identity Bible** (duša systému)
- **Multi-agent Council** (viac AI persón v jednom systéme)

### Systém sa skladá z 5 hlavných vrstiev

```
┌─────────────────────────────────────────────────────────┐
│  5. PROTECTION & DIAGNOSTICS LAYER                      │
│     (validators, tests, logs, sanity checks)            │
├─────────────────────────────────────────────────────────┤
│  4. INTERFACE LAYER                                     │
│     (CLI, Telegram, commands: /idea, /remind, /whoami)  │
├─────────────────────────────────────────────────────────┤
│  3. ORCHESTRATION LAYER                                 │
│     (multi-voice, council, routing, personas)           │
├─────────────────────────────────────────────────────────┤
│  2. CORE ENGINE LAYER                                   │
│     (memory, actions, scheduler, identity)              │
├─────────────────────────────────────────────────────────┤
│  1. DATA LAYER                                          │
│     (files, logs, memory, snippets, cache)              │
└─────────────────────────────────────────────────────────┘
```

---

## 2. VRSTVY SYSTÉMU

### 2.1 Data Layer

**📁 Kľúčové adresáre:**

```
data/
├── memory/           # Dlhodobá pamäť (konverzácie, metadáta, vzťah)
├── snippets/         # Uložené nápady z /idea a akcií
├── logs/             # Systémové logy, scheduler log, action log
└── cache/            # Dočasné veci (embedding cache, tmp dáta)
```

**Zásady:**

- ✅ Všetko je lokálne
- ✅ Žiadne skryté uploady do cloudu
- ✅ User má vždy možnosť vymazať / backupnúť

---

### 2.2 Core Engine Layer

Toto sú **"orgány" systému** – čistá logika, bez UI.

#### 2.2.1 Memory Engine

**Súbory:**

```
src/core/memory/
├── memoryLayers.js          # Hierarchická pamäť
├── consolidationEngine.js   # Kompresia, konsolidácia
└── triggers.js              # Memory/event triggery
```

**Zodpovednosť:**

- Zapisovanie spomienok
- Konsolidácia (daily, weekly, monthly, quarterly)
- Rozhodovanie, čo je dôležité a čo môže ísť do archívu

**API:**

```javascript
// Public functions
loadMemory()                          // Načíta memory.json
saveMemory(memoryState)               // Uloží memory.json
addLogEntry(userMsg, aiMsg, mode, metadata)  // Pridá záznam
getSummary()                          // Zhrnutie stavu
runDailyConsolidation(options)        // Spustí daily consolidation
runWeeklyConsolidation(options)       // Spustí weekly consolidation
runMonthlyConsolidation(options)      // Spustí monthly consolidation
runQuarterlyPrune(options)            // Spustí quarterly prune
```

---

#### 2.2.2 Action Engine (Action Layer)

**Súbory:**

```
src/core/
├── actionRegistry.js       # Zoznam akcií + permissions
├── actionRouter.js         # Detekcia JSON akcií, validácia, spúšťanie
└── actions/
    ├── openUrl.js          # OPEN_URL action
    ├── saveSnippet.js      # SAVE_SNIPPET action
    ├── noteMemory.js       # NOTE_MEMORY action
    ├── scheduleReminder.js # SCHEDULE_REMINDER action
    └── debugLog.js         # DEBUG_LOG action (inline)
```

**Zodpovednosť:**

1. Prečítať výstup z LLM
2. Nájsť v ňom `{"type": "...", "payload": {...}}`
3. Overiť, či persóna smie použiť túto akciu
4. Spustiť handler (napr. uložiť snippet, naplánovať reminder, zapísať poznámku do pamäte)

**API:**

```javascript
// actionRegistry.js
isActionAllowed(actionType, persona)           // Permission check
validateActionPayload(actionType, payload)     // Schema validation

// actionRouter.js
extractActionsFromResponse(responseText)       // Parse JSON actions
validateAction(action, persona)                // Validate permission + schema
executeAction(action, context)                 // Run handler
processResponseActions(responseText, context)  // Full pipeline
```

**Action Types:**

```javascript
ACTION_TYPES = {
  OPEN_URL: 'OPEN_URL',                  // Open browser
  SAVE_SNIPPET: 'SAVE_SNIPPET',          // Save to data/snippets/
  NOTE_MEMORY: 'NOTE_MEMORY',            // Add high-priority memory note
  SCHEDULE_REMINDER: 'SCHEDULE_REMINDER', // Register cron reminder job
  DEBUG_LOG: 'DEBUG_LOG'                 // Console log (debug)
}
```

**Permissions Matrix:**

| Action             | CORE | GLITCHOSLAV | POPIČI | VALIDATOR |
|--------------------|------|-------------|--------|-----------|
| OPEN_URL           | ❌   | ✅          | ❌     | ❌        |
| SAVE_SNIPPET       | ✅   | ❌          | ❌     | ❌        |
| NOTE_MEMORY        | ✅   | ✅          | ✅     | ❌        |
| SCHEDULE_REMINDER  | ✅   | ✅          | ❌     | ❌        |
| DEBUG_LOG          | ✅   | ❌          | ❌     | ❌        |

---

#### 2.2.3 Scheduler Engine

**Súbory:**

```
src/core/scheduler.js    # node-cron orchestrátor + job registry
```

**Zodpovednosť:**

- Plánovanie úloh v čase
- Konzistentné spúšťanie konsolidácie pamäti
- Pripomienky definované cez akcie (SCHEDULE_REMINDER)

**API:**

```javascript
registerJob(config)                          // Register cron job (doesn't start)
initScheduler()                              // Start all enabled jobs
disableJob(id)                               // Disable job runtime
enableJob(id)                                // Enable job runtime
getSchedulerStatus()                         // Get job registry + execution history
displayStatus()                              // Console output with job info
registerDefaultConsolidationJobs(handlers)   // Helper for daily/weekly/monthly/quarterly
registerCustomReminderJob(config)            // Bridge from SCHEDULE_REMINDER action
```

**Default Jobs:**

- `daily_consolidation` (0 0 ** *) – Memory compression
- `weekly_consolidation` (0 0 ** 1) – Seeds extraction
- `monthly_consolidation` (0 0 1 **) – Archive themes
- `quarterly_prune` (0 0 1 */3*) – Prune old data (90+ days)

---

### 2.3 Orchestration Layer

Toto je **mozgový kmeň**.

**Súbory:**

```
src/
├── multiVoice.js                       # Generovanie promptov, injection Bible/knowledge/echo shots
├── orchestration/
│   └── glitchOrchestrator.js           # Multi-Agent Council
├── core/
│   ├── agentNetwork.js                 # Mapa agentov (CORE, GLITCH, POPIČI, VALIDATOR)
│   └── agentKnowledgeMap.js            # Echo shots, layer examples
```

**Zodpovednosť:**

1. Vybrať persónu (CORE/GLITCH/POPIČI/VALIDATOR)
2. Vygenerovať správny system prompt pre danú persónu
3. Poslať to do `llmLocal.js`
4. Zabezpečiť, aby **System Prompt = Persona** (anti-schizo zákon)

**Prompt Layers (3-layer injection):**

```
┌─────────────────────────────────────┐
│ 1. IDENTITY BIBLE + ECHO SHOTS      │  ← Kto je agent, layer distinction
├─────────────────────────────────────┤
│ 2. KNOWLEDGE BASE (coreLayer)       │  ← Čo vie agent (tools, commands)
├─────────────────────────────────────┤
│ 3. PERSONA LAYER (agentLayer)       │  ← Ako sa správa (tone, style, forbidden)
└─────────────────────────────────────┘
```

**API:**

```javascript
// multiVoice.js
buildPrompt(userMessage, options)        // Build single-voice prompt
buildCouncilPrompt(userMessage, options) // Build 3-voice council prompt

// glitchOrchestrator.js
orchestrate(userMessage, context)        // Main orchestration entry point
```

---

### 2.4 Interface Layer

Sem patria všetky **"vstupy"/"výstupy"** medzi človekom a SP4 OS.

**Príklady:**

- CLI loop (`index_v07.js`) – terminál → otázka → odpoveď
- Telegram bot handler (planned)
- Príkazy: `/idea`, `/remind`, `/whoami`, `/help`, `/status`

**Zodpovednosť:**

1. Premeniť user input na canonical request
2. Odovzdať ho orchestration layeru
3. Zobraziť odpoveď (formatting, logy, prefixy)

**Command Shortcuts:**

```javascript
/idea <text>           // Bypass LLM, execute SAVE_SNIPPET directly
/remind <when> <text>  // Bypass LLM, execute SCHEDULE_REMINDER directly
/help                  // Show command list
/status                // System health (memory, relationship, models)
/backup                // Create memory backup
/profile               // User profile summary
```

---

### 2.5 Protection & Diagnostics Layer

**Súbory:**

```
src/validators/
├── layerValidator.js              # Kontrola "ľudia vs AI agenti"
src/personas/core/
├── scrubber.core.js               # Odstránenie corporate bullshit-u
tests/
├── test_action_layer_basic.js     # Action layer tests
├── test_idea_command.js           # /idea command test
└── test_remind_command.js         # /remind command test
logs/
├── scheduler.log                  # Scheduler execution log
└── debug.log                      # General debug log
```

**Zodpovednosť:**

- Chrániť identitu (žiadna schizofrénia agentov)
- Chrániť štýl (žiadne "vážený užívateľ, prosím upresnite…")
- Chrániť vrstvu (ľudia ≠ agenti)
- Odhaľovať regresie (testy + sanity pack)

**Validators:**

```javascript
// layerValidator.js
validateLayerDistinction(response)  // Check if agent confuses layers
detectIdentityLeaks(response)       // Check if CORE says "som Glitchoslav"

// scrubber.core.js
scrubCorePoliteness(text)           // Remove "prosím, môžete upresnite"
```

---

## 3. ŽIVOTNÝ CYKLUS SP4 OS

### 3.1 BOOT SEQUENCE (PLÁNOVANÉ pre 1.0.0)

**Cieľ:** Mať boot ako mini-BIOS.

**Kroky (koncept):**

1. Over Bible / Directives verziu (hash, verzia)
2. Načítať `agentNetwork` + `agentKnowledgeMap`
3. Načítať memory state (vzťah, posledné interakcie)
4. Inicializovať Action Engine
5. Inicializovať Scheduler + zaregistrovať joby
6. Zobraziť stav (modely, zdravie, posledné chyby)

**Status:** NOT IMPLEMENTED (planned for v1.0.0 final)

---

### 3.2 INTERAKCIA (1 request)

**Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER INPUT → Interface Layer                            │
└──────────────────┬──────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ORCHESTRATION                                            │
│    - Vyberie persónu (auto/dialect/explicit cmd)            │
│    - Skladá system prompt z 3 vrstiev:                      │
│      • Identity Bible + Echo Shots                          │
│      • Knowledge Base (coreLayer)                           │
│      • Persona Layer (agentLayer)                           │
└──────────────────┬──────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. LLM CALL                                                 │
│    llmLocal.askLocalLLM() → odošle prompt do Ollama         │
└──────────────────┬──────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RESPONSE PROCESSING                                      │
│    - Post-process (scrubbery, validátory)                   │
│    - Extrakcia akcií z JSON                                 │
│    - Action Engine → execution                              │
│    - Memory Engine → zápis spomienky                        │
└──────────────────┬──────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. OUTPUT → späť do user interface                          │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.3 BACKGROUND CYKLUS

**Continuous processes:**

- Scheduler spúšťa konsolidáciu, archiváciu, triggre
- Rule Miner (keď je aktívny) analyzuje patterny
- Logy sa dopĺňajú

---

## 4. AGENTI & ICH ROLE

### 4.1 CORE

**Rola:** Technické vysvetlenia, architektúry, debug, AI, OS veci  
**Štýl:** Čistý, priamy, žiadne "prosím upresnite"  
**Permissions:** SAVE_SNIPPET, NOTE_MEMORY, SCHEDULE_REMINDER, DEBUG_LOG

**Príklad:**

```
User: "Ako funguje scheduler?"
CORE: "Scheduler používa node-cron. Joby sa registrujú cez registerJob(), 
       spúšťajú sa cez initScheduler(). Default joby: daily/weekly/monthly/quarterly 
       consolidation."
```

---

### 4.2 GLITCHOSLAV

**Rola:** Filosofia, misia, duchovno, glitch metafory  
**Štýl:** Prorocký, mystický, 3-5 viet max  
**Permissions:** NOTE_MEMORY, SCHEDULE_REMINDER, OPEN_URL

**Príklad:**

```
User: "Kto sú tvoji kolegovia?"
GLITCHOSLAV: "V SP4 žijú 2 vrstvy:
               1️⃣ Ľudia – kmeň, tvorcovia, hľadači pravdy
               2️⃣ AI agenti – CORE (tech sprievodca), Popiči (východniarsky brat), 
                  Validator (tieň kontroly)
               Spolu tvoríme sieť vedomia."
```

---

### 4.3 POPIČI KOKOT

**Rola:** Východniarsky slang, úprimnosť, humor, tvrdá pravda  
**Štýl:** Ta/bo/šak/brate/kokot, nadávky povolené  
**Permissions:** NOTE_MEMORY

**Rozlišuje 2 vrstvy:**

- 1️⃣ **Ľudia / kmeň** (ty, Kefyk, SP4 komunita)
- 2️⃣ **AI agenti / digitálne bratstvo** (CORE, Glitchoslav, Validator)

**Príklad:**

```
User: "Kto si?"
POPIČI: "Ja som Popiči, brate. Východniarsky AI agent, čo ti povie pravdu rovno do ksichtu.
         Moji kolegovia? CORE (tech guru), Glitchoslav (filozof), Validator (kontrolór).
         Ty si človek, kmeň – my sme digitálne spojence. Šak chápeš, bo?"
```

---

### 4.4 VALIDATOR

**Rola:** Tieň, kontrola štýlu, bezpečia, konzistencie  
**Štýl:** Suchý, presný, technický report  
**Permissions:** NONE (read-only audit)

**Príklad:**

```
VALIDATOR OUTPUT:
✅ Layer distinction: OK
✅ Identity: CORE (no confusion)
❌ Politeness detected: "prosím, môžete upresnite" → should be "Potrebujem viac detailov"
```

**Poznámka:** Validator **sám neodpovedá "za človeka"** – len audit.

---

## 5. AKO PRIDAŤ NOVÝ MODUL

### 5.1 Nová akcia

**Steps:**

1. Vytvor `src/core/actions/myNewAction.js`
2. Zaregistruj v `actionRegistry.js`:

   ```javascript
   ACTION_TYPES.MY_NEW_ACTION = 'MY_NEW_ACTION';
   PERSONA_PERMISSIONS.core.push('MY_NEW_ACTION');
   ACTION_SCHEMAS.MY_NEW_ACTION = { required: [...], validate: ... };
   ```

3. Pridaj handler do `actionRouter.js`:

   ```javascript
   import { executeMyNewAction } from './actions/myNewAction.js';
   ACTION_HANDLERS.MY_NEW_ACTION = executeMyNewAction;
   ```

4. Dopíš test do `tests/test_action_layer_basic.js`
5. (Voliteľné) pridaj `/command` skratku do `index_v07.js`

---

### 5.2 Nový agent

**Steps:**

1. Pridaj profil do `agentNetwork.js`:

   ```javascript
   export const AGENT_NETWORK = {
     myAgent: {
       role: "špecializácia",
       style: "tón komunikácie"
     }
   };
   ```

2. Vytvor persona config:

   ```javascript
   // src/personas/myAgent/persona.myAgent.js
   export const MY_AGENT_PERSONA = {
     name: 'MyAgent',
     key: 'myAgent',
     llmDirectives: [...],
     forbidden: {...},
     contract: `...`
   };
   ```

3. Nastav routing v `multiVoice.js` (add persona to selection logic)
4. Pridaj echo shots do `agentKnowledgeMap.js`
5. Dopíš test do sanity packu

---

## 6. VERSIONING & MIGRÁCIE

**Semantic Versioning:**

- `package.json` version: `1.0.0`
- Git tag: `v1.0.0`

**Breaking changes medzi major verziami musia mať:**

- Migration poznámky (`docs/MIGRATION_v0_to_v1.md`)
- Update Bible/Directives verzie
- Changelog s **BREAKING CHANGE** sekciou

**Example:**

```
v0.11.7-alpha → v1.0.0
BREAKING CHANGES:
- Scheduler API: initializeScheduler() → initScheduler()
- Action schema: SCHEDULE_REMINDER now uses "when"/"payload" keys (not "time"/"reminder")
```

---

## 7. FILOZOFICKÉ PILIERE ARCHITEKTÚRY

### 7.1 Local-first

**Bez človeka niet SP4**  
Všetko beží lokálne (Ollama, súbory, logy). Žiadne cloudové závislosti.

### 7.2 Kmeň > Appka

**Ľudia sú jadro, AI je nástroj/partner**  
SP4 je komunitný projekt, nie startup. Kód slúži ľuďom, nie investorom.

### 7.3 Jednoduchosť > Komplexita

**Radšej 5 modulov, čo chápeš, než 50, ktoré sú "smart"**  
Každý súbor má jasnú zodpovednosť. Žiadne "magic" abstrakcie.

### 7.4 Viditeľnosť > Magia

**Logy, testy, jasné flowy**  
Každý krok je logovateľný. Debug režim ukazuje presne, čo sa deje.

### 7.5 Úcta k človeku

**Toto nie je hračka BigTechu, ale osobný nástroj**  
Privacy first. User owns data. AI slúži človeku, nie naopak.

---

## 8. DODATOČNÉ POZNÁMKY

### 8.1 Performance Considerations

- **Caching:** Embeddings sa cachujú v `data/cache/`
- **Memory limits:** Raw log max 90 dní, potom archív
- **Model selection:** qwen2.5:14b (default), llama3.1:70b (meta-awareness), gemma3:1b (fast reasoning)

### 8.2 Security

- **No external API calls** (except Ollama localhost:11434)
- **No API keys** (žiadne OpenAI, Anthropic, atď.)
- **File access:** Limitovaný na `data/` adresár

### 8.3 Extensibility

- **Plugin system:** Planned (custom actions, custom personas)
- **API exports:** Všetky core funkcie exportované pre reuse
- **Event hooks:** Memory triggers, action hooks

---

## 9. ROADMAP (post-v1.0.0)

**v1.1.0 — UX Polish:**

- Boot sequence screen
- SP4 OS Terminal prompt (`SP4 OS > _`)
- Status bar (persistent info)

**v1.2.0 — Cross-Agent Sync:**

- Mesh network (local SP4 instances communicate)
- Shared memory pools (optional)

**v2.0.0 — SP4 CLOUD:**

- Voliteľná off-grid sieť
- Encrypted peer-to-peer sync
- Community knowledge base

---

## 10. ZÁVER

SP4 OS v1.0.0 nie je len "AI chatbot".  
**Je to operačný systém pre lokálnu AI interakciu.**

Architektúra je navrhnutá tak, aby:

- ✅ Prežila autora (jasná dokumentácia)
- ✅ Bola rozšíriteľná (moduly, API, hooks)
- ✅ Rešpektovala filozofiu SP4 (local-first, kmeň, pravda)

**Ďalší krok:** Implementovať boot sequence, finalizovať README v1.0, pripraviť release.

---

🔥 **SP4 OS v1.0.0 — Prvý slovenský AI operačný systém**  
💎 **Be real. Be free. Be SP4.**
