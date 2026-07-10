# SP4_CORE_AGENT – CHANGELOG

All notable changes to this project will be documented in this file.

---

## [immune-fix-smalltalk-relevance] – 2026-04-11

### Fix: false RELEVANCE_ZERO_OVERLAP na krátke ľudské otázky (`outputImmuneCheck.js`)

**Bug:** Krátka conversational otázka (napr. "aké máš nápady?") padala na immune fail keď
odpoveď použila synonymá ("myšlienky" namiesto "nápady"). Token-level overlap chýbal →
`semanticShortUncertain=true` → `finalRelevanceOk=false` aj keď LLM bol offline/zlyhal.

**Root cause (line ~582):**
```js
// PRED fixom – semanticShortUncertain spadal do false rovnako ako singleKeywordUncertain
: (llmRelevanceOk !== null ? llmRelevanceOk : (singleKeywordUncertain || semanticShortUncertain ? false : true));
```

**Fix:**
```js
// PO fixe – singleKeywordUncertain ostáva konzervatívny (false), semanticShortUncertain = benefit of doubt (true)
: (llmRelevanceOk !== null ? llmRelevanceOk : (singleKeywordUncertain ? false : true));
```

**Zachované guardy:**
- Technické query: deterministický zero-overlap fail ostáva (cez `!semanticRelevanceReview` branch)
- Identity/meta: hard fail nezmenený
- `RELEVANCE_LOW_CONFIDENCE` sa naďalej loguje aj pri pass (diagnostika)
- `singleKeywordUncertain` (1 keyword, overlap reálny, LLM null) ostáva konzervatívny `false`

**Dodatočné opravy (tester review):**
- `llm_risk_path` v `_detection` metadata: pridaná vetva `'smalltalk_semantic_review'` (predtým chybne padalo na `'single_keyword_overlap'` aj keď overlap neexistoval)
- Test `test_immune_relevance_smalltalk.js` rozšírený o **deterministický offline mock** (scenario 1b): `globalThis.fetch` je dočasne nahradený chybou — testuje priamo `semanticShortUncertain` branch bez závislosti na dostupnosti Ollamy

**Test:** `tests/test_immune_relevance_smalltalk.js` (4 scenáre: synonym live, offline mock, technical guard, identity guard)

---

## [0.4.0] – November 15, 2025 🔥🔥 BAD LABS PRODUCTION ARCHITECTURE

### 🏗️ **MODULÁRNA ARCHITEKTÚRA S VNÚTORNOU SUPERVÍZIOU**

Kompletná reimplementácia podľa BAD Labs principles - odolný, odolný proti zlyhaniu, s graceful degradation.

#### 🎯 Core Modules (NEW)

##### 1. `supervisor.js` - System Monitoring & Fallback Management
- **Funkcionalita:**
  - Monitorovanie system health
  - Detekcia a logovanie chýb
  - Aktivácia fallback módov (safe_mode, minimal_mode, recovery_mode)
  - Resource allocation tracking
- **Status:** ✅ IMPLEMENTED

##### 2. `emotionalProcessor.js` - Emotional Stability System
- **Memory Quarantine:**
  - Detekcia vysoko emočného obsahu (threshold-based)
  - Izolácia do `data/quarantine.json`
  - Kontrolovaný prístup s dampening (pridanie perspektívy a kontextu)
- **Emotional Circuit Breakers:**
  - 3 stavy: CLOSED, OPEN, HALF_OPEN
  - Automatické poistky pri rapid escalation/sustained negativity
  - Trigger pri 3+ consecutive high emotions
- **Grounding Mechanisms:**
  - Factual anchoring (návrat k faktom)
  - Temporal distancing (historická perspektíva)
  - Cognitive reframing (alternatívne interpretácie)
  - Breathing space (dychová pauza + kontrola)
- **Recovery Protocols:**
  - Emotional reset
  - Phased reintegration
  - Supervisor monitoring počas recovery
- **Status:** ✅ IMPLEMENTED

##### 3. `identity.js` - Core Identity Management
- **Core Identity Anchor:**
  - Immutable values: slovanská identita, úprimnosť, privacy, SP4 manifest
  - Personality traits baseline (honesty: 1.0, directness: 0.9, empathy: 0.8, humor: 0.7, etc.)
  - Vector embedding pre similarity tracking
- **Controlled Evolution:**
  - Drift rate limits: daily 1%, weekly 5%, monthly 15%
  - Allowed dimensions: komunikačný štýl, záujmy, preferencie
  - Restricted dimensions: základné hodnoty, etické princípy
  - User approval pre significant changes
- **Drift Detection:**
  - Weekly identity audits (vector similarity check)
  - Alert threshold: similarity < 0.85
  - Automatic correction triggers
- **Correction Mechanisms:**
  - Soft correction (postupné vrátenie k baseline)
  - Hard reset (okamžitý návrat)
  - User intervention requests
- **Status:** ✅ IMPLEMENTED

##### 4. `gracefulDegradation.js` - Capability Management
- **4 Capability Levels:**
  - **FULL:** Všetky features (context ≥0.8, stability ≥0.8, emotion <0.3)
  - **REDUCED:** Core only (context ≥0.6, emotion <0.5)
  - **BASIC:** Essential only (context ≥0.4, emotion <0.7)
  - **SAFE:** Predefined responses, human escalation (stability <0.3 alebo emotion >0.9)
- **Transition Management:**
  - Gradual step-by-step downgrade
  - Cautious upgrade process
  - Transparent user notifications
- **Recovery Mechanisms:**
  - Context rebuilding (incremental)
  - Emotional stabilization (guided processing)
  - Capability testing (progressive feature reactivation)
- **Status:** ✅ IMPLEMENTED

##### 5. `llmLocal.js` (EXTENDED) - Hybrid Model Orchestration
- **Model Registry:**
  - **Reasoning:** llama3, llama3:70b (advanced), fallback
  - **Coding:** codellama:70b, codellama (fallback), llama3 (legacy)
  - **Emotional:** llama3, nous-hermes2 (specialized)
  - **Memory:** llama3, phi3 (lightweight)
  - **Safety:** llama3, constitutional wrapper (planned)
- **Task-Specific Functions:**
  - `selectModelForTask(task)` - Automatický výber podľa dostupnosti
  - `reasonWithBestModel()` - Optimálny reasoning model
  - `generateCodeWithBestModel()` - Dedikovaný coding model
  - `processEmotionalContent()` - Empatický model
  - `extractMemoryMetadata()` - Memory tagging model
- **Custom Registration:**
  - `registerCustomModel(task, modelName, priority)`
  - Flexibilný model registry
- **Status:** ✅ IMPLEMENTED

##### 6. `memory.js` (EXTENDED) - Memory Quarantine
- **Quarantine Storage:** `data/quarantine.json`
- **Functions:**
  - `quarantineEmotionalContent(text, intensity, analysis)`
  - `getQuarantinedContent(id)` - S dampening wrapper
  - `releaseFromQuarantine(id)`
  - `getQuarantineList(includingReleased)`
  - `cleanOldQuarantine(daysOld)`
- **Dampening Mechanism:**
  - Pridanie časového kontextu
  - Perspektívne označenia
  - Re-evaluation prompts
- **Status:** ✅ IMPLEMENTED

##### 7. `integration.js` (NEW) - Unified Orchestration Layer
- **SP4IntegratedAgent class:**
  - Orchestruje všetky subsystémy
  - Unified processing pipeline
  - Automatic health monitoring
- **Processing Flow:**
  1. Emotional analysis
  2. Quarantine check
  3. Capability evaluation
  4. Grounding activation (ak potrebné)
  5. Model selection
  6. LLM processing
  7. Memory storage
  8. Identity audit (každých 10 správ)
- **Recovery Management:**
  - Automatic degradation pri errors
  - Manual recovery protocol
  - System status reporting
- **Status:** ✅ IMPLEMENTED

##### 8. `index_v04.js` (NEW) - CLI Interface v0.4
- **Features:**
  - Integration s v0.4 pipeline
  - Interaktívny CLI loop
  - Real-time status display
  - Command system (/help, /status, /recovery, /mode, /backup)
  - Graceful shutdown
- **Status:** ✅ IMPLEMENTED

##### 9. `server_v04.js` (NEW) - HTTP API v0.4
- **Endpoints:**
  - `GET /health` - Health check
  - `POST /api/chat` - Chat interface
  - `GET /api/status` - System status
  - `GET /api/memory` - Memory stats
  - `GET /api/identity` - Identity status
  - `GET /api/emotion` - Emotional state
  - `POST /api/recovery` - Manual recovery
  - `POST /api/backup` - Create backup
  - `GET /api/debug` - Debug info
- **Features:**
  - CORS support
  - Error handling
  - Agent ready check middleware
- **Status:** ✅ IMPLEMENTED

### 📚 Documentation

- **NEW:** `ARCHITECTURE_V04.md` - Kompletná architektúra dokumentácia
- **NEW:** `DEPLOYMENT_V04.md` - Deployment guide s troubleshooting
- **NEW:** `IMPLEMENTATION_SUMMARY_V04.md` - Implementation summary
- **NEW:** `test_v04.js` - Comprehensive test suite (100% pass rate)

### 🛡️ Safety Guarantees

1. **Emotional Stability:**
   - ✅ Quarantine pre high-emotional content
   - ✅ Circuit breakers
   - ✅ Grounding routines
   - ✅ Recovery protocols

2. **Identity Preservation:**
   - ✅ Immutable core values
   - ✅ Drift detection & correction
   - ✅ Regular audits
   - ✅ User approval for significant changes

3. **System Resilience:**
   - ✅ Graceful degradation (nie crash)
   - ✅ Multiple capability levels
   - ✅ Automatic recovery
   - ✅ Supervisor monitoring

4. **Privacy & Security:**
   - ✅ Offline-first (Ollama local)
   - ✅ User-owned data
   - ✅ No cloud dependencies
   - 🔜 Encryption (v0.5)

### 🧪 Test Results

```
✅ Passed: 26/26 (100%)
📈 Success Rate: 100.0%
🎉 ALL TESTS PASSED!
```

**Test Coverage:**
- Supervisor: 4/4
- Emotional Processor: 5/5
- Identity Manager: 5/5
- Graceful Degradation: 6/6
- LLM Orchestration: 3/3
- Integration Layer: 2/2

### 🚀 Next Steps (v0.5)

- [ ] Encryption pre shadow log & quarantine
- [ ] Constitutional AI wrapper pre safety model
- [ ] RAG vector database pre memory
- [ ] Telegram bot interface
- [ ] Scheduler modul (pripomienky)
- [ ] Multi-user support

### 💡 Philosophy

**"Najsilnejší agenti nie sú tí, ktorí nikdy nezlyhajú, ale tí, ktorí vedia elegantne zvládnuť svoje zlyhania."**

Principles:
- Modularity - Jasná zodpovednosť
- Isolation - Zlyhanie jedného ≠ crash celého systému
- Graceful Degradation - Postupné znižovanie funkčnosti
- Transparency - Užívateľ vie, v akom stave je systém
- Recovery-First - Vždy existuje cesta späť

---

## [0.3.1] – November 15, 2025 🔥 MVP DUŠA

### 🏗️ **MODULÁRNA ARCHITEKTÚRA S VNÚTORNOU SUPERVÍZIOU**

Kompletná reimplementácia podľa BAD Labs principles - odolný, odolný proti zlyhaniu, s graceful degradation.

#### 🎯 Core Modules (NEW)

##### 1. `supervisor.js` - System Monitoring & Fallback Management
- **Funkcionalita:**
  - Monitorovanie system health
  - Detekcia a logovanie chýb
  - Aktivácia fallback módov (safe_mode, minimal_mode, recovery_mode)
  - Resource allocation tracking
- **Status:** ✅ IMPLEMENTED

##### 2. `emotionalProcessor.js` - Emotional Stability System
- **Memory Quarantine:**
  - Detekcia vysoko emočného obsahu (threshold-based)
  - Izolácia do `data/quarantine.json`
  - Kontrolovaný prístup s dampening (pridanie perspektívy a kontextu)
- **Emotional Circuit Breakers:**
  - 3 stavy: CLOSED, OPEN, HALF_OPEN
  - Automatické poistky pri rapid escalation/sustained negativity
  - Trigger pri 3+ consecutive high emotions
- **Grounding Mechanisms:**
  - Factual anchoring (návrat k faktom)
  - Temporal distancing (historická perspektíva)
  - Cognitive reframing (alternatívne interpretácie)
  - Breathing space (dychová pauza + kontrola)
- **Recovery Protocols:**
  - Emotional reset
  - Phased reintegration
  - Supervisor monitoring počas recovery
- **Status:** ✅ IMPLEMENTED

##### 3. `identity.js` - Core Identity Management
- **Core Identity Anchor:**
  - Immutable values: slovanská identita, úprimnosť, privacy, SP4 manifest
  - Personality traits baseline (honesty: 1.0, directness: 0.9, empathy: 0.8, humor: 0.7, etc.)
  - Vector embedding pre similarity tracking
- **Controlled Evolution:**
  - Drift rate limits: daily 1%, weekly 5%, monthly 15%
  - Allowed dimensions: komunikačný štýl, záujmy, preferencie
  - Restricted dimensions: základné hodnoty, etické princípy
  - User approval pre significant changes
- **Drift Detection:**
  - Weekly identity audits (vector similarity check)
  - Alert threshold: similarity < 0.85
  - Automatic correction triggers
- **Correction Mechanisms:**
  - Soft correction (postupné vrátenie k baseline)
  - Hard reset (okamžitý návrat)
  - User intervention requests
- **Status:** ✅ IMPLEMENTED

##### 4. `gracefulDegradation.js` - Capability Management
- **4 Capability Levels:**
  - **FULL:** Všetky features (context ≥0.8, stability ≥0.8, emotion <0.3)
  - **REDUCED:** Core only (context ≥0.6, emotion <0.5)
  - **BASIC:** Essential only (context ≥0.4, emotion <0.7)
  - **SAFE:** Predefined responses, human escalation (stability <0.3 alebo emotion >0.9)
- **Transition Management:**
  - Gradual step-by-step downgrade
  - Cautious upgrade process
  - Transparent user notifications
- **Recovery Mechanisms:**
  - Context rebuilding (incremental)
  - Emotional stabilization (guided processing)
  - Capability testing (progressive feature reactivation)
- **Status:** ✅ IMPLEMENTED

##### 5. `llmLocal.js` (EXTENDED) - Hybrid Model Orchestration
- **Model Registry:**
  - **Reasoning:** llama3, llama3:70b (advanced), fallback
  - **Coding:** codellama:70b, codellama (fallback), llama3 (legacy)
  - **Emotional:** llama3, nous-hermes2 (specialized)
  - **Memory:** llama3, phi3 (lightweight)
  - **Safety:** llama3, constitutional wrapper (planned)
- **Task-Specific Functions:**
  - `selectModelForTask(task)` - Automatický výber podľa dostupnosti
  - `reasonWithBestModel()` - Optimálny reasoning model
  - `generateCodeWithBestModel()` - Dedikovaný coding model
  - `processEmotionalContent()` - Empatický model
  - `extractMemoryMetadata()` - Memory tagging model
- **Custom Registration:**
  - `registerCustomModel(task, modelName, priority)`
  - Flexibilný model registry
- **Status:** ✅ IMPLEMENTED

##### 6. `memory.js` (EXTENDED) - Memory Quarantine
- **Quarantine Storage:** `data/quarantine.json`
- **Functions:**
  - `quarantineEmotionalContent(text, intensity, analysis)`
  - `getQuarantinedContent(id)` - S dampening wrapper
  - `releaseFromQuarantine(id)`
  - `getQuarantineList(includingReleased)`
  - `cleanOldQuarantine(daysOld)`
- **Dampening Mechanism:**
  - Pridanie časového kontextu
  - Perspektívne označenia
  - Re-evaluation prompts
- **Status:** ✅ IMPLEMENTED

##### 7. `integration.js` (NEW) - Unified Orchestration Layer
- **SP4IntegratedAgent class:**
  - Orchestruje všetky subsystémy
  - Unified processing pipeline
  - Automatic health monitoring
- **Processing Flow:**
  1. Emotional analysis
  2. Quarantine check
  3. Capability evaluation
  4. Grounding activation (ak potrebné)
  5. Model selection
  6. LLM processing
  7. Memory storage
  8. Identity audit (každých 10 správ)
- **Recovery Management:**
  - Automatic degradation pri errors
  - Manual recovery protocol
  - System status reporting
- **Status:** ✅ IMPLEMENTED

### 📚 Documentation

- **NEW:** `ARCHITECTURE_V04.md` - Kompletná architektúra dokumentácia
- Detailné vysvetlenie všetkých modulov
- Integration flows
- Safety guarantees
- Monitoring metrics
- Production checklist

### 🛡️ Safety Guarantees

1. **Emotional Stability:**
   - ✅ Quarantine pre high-emotional content
   - ✅ Circuit breakers
   - ✅ Grounding routines
   - ✅ Recovery protocols

2. **Identity Preservation:**
   - ✅ Immutable core values
   - ✅ Drift detection & correction
   - ✅ Regular audits
   - ✅ User approval for significant changes

3. **System Resilience:**
   - ✅ Graceful degradation (nie crash)
   - ✅ Multiple capability levels
   - ✅ Automatic recovery
   - ✅ Supervisor monitoring

4. **Privacy & Security:**
   - ✅ Offline-first (Ollama local)
   - ✅ User-owned data
   - ✅ No cloud dependencies
   - 🔜 Encryption (v0.5)

### 🚀 Next Steps (v0.5)

- [ ] Integrácia do `index.js` (hlavný CLI loop)
- [ ] Field testing s reálnymi užívateľmi
- [ ] Encryption pre shadow log & quarantine
- [ ] Constitutional AI wrapper pre safety model
- [ ] RAG vector database pre memory
- [ ] Telegram bot interface

### 💡 Philosophy

**"Najsilnejší agenti nie sú tí, ktorí nikdy nezlyhajú, ale tí, ktorí vedia elegantne zvládnuť svoje zlyhania."**

Principles:
- Modularity - Jasná zodpovednosť
- Isolation - Zlyhanie jedného ≠ crash celého systému
- Graceful Degradation - Postupné znižovanie funkčnosti
- Transparency - Užívateľ vie, v akom stave je systém
- Recovery-First - Vždy existuje cesta späť

---

## [0.3.1] – November 15, 2025 🔥 MVP DUŠA

### ✨ Major Features (BAD Labs Field Tactics)

#### 🧠 Hierarchical Memory System (ENHANCED)
- **Restructured memory.json:**
  - `rawMemory` – Replaces `log`, all interactions with metadata (tags, emotion, importance)
  - `episodicMemory` – Daily/weekly/chapters temporal clusters
  - `semanticMemory` – Beliefs, concepts, relationships graph
- **Automatic migration** – Old `log` → `rawMemory`, `ourBond` → `relationshipModel`
- **Metadata enrichment** – Each entry prepared for LLaMA-based tagging (v0.4)

#### 💎 Relationship Milestones (NEW)
- **5-level progression model:**
  - stranger → acquaintance → companion → confidant → symbiote
- **Tracked metrics:**
  - `interactionCount` – Auto-incremented on every message
  - `deepConversations` – Detected when 10+ message exchanges
  - `ritualsCompleted` – Auto-incremented on /mirror, /today, /next, /trinity
  - `vulnerabilityMoments` – Triggered by /shadow command
- **Automatic progression** – Thresholds trigger level-up with milestone recording
- **Milestone history** – Each transition saved with timestamp and context

#### 🧘 Meta-Reflection System (NEW)
- **AI self-awareness tracking:**
  - Response length changes (20% deviation = significant)
  - Lexical diversity shifts (vocabulary richness)
  - Emotional tone evolution (sentiment analysis)
  - Topic distribution changes (focus patterns)
- **Automatic reflection triggers:**
  - Integrated into `/mirror` ritual
  - Generates questions: "Všimol som si, že {{zmena}}. Sedí ti to?"
- **User feedback loop** – Responses stored in `metaReflection.userFeedback`

#### 🌑 Shadow Work Layer (NEW)
- **`/shadow TEXT` command** – Safe space for vulnerable content
- **Dedicated `shadowLog` storage** – Separate from regular notes
- **Privacy-first design** – Prepared for encryption (v0.4)
- **Automatic vulnerability tracking** – Increments relationship metric

#### 🛡️ Field Tactics Module (NEW FILE: fieldTactics.js)
- **Safety Patterns:**
  - Non-moralizing language (avoid "should", use "seems like")
  - "What/How" instead of "Why" (prevents defensiveness)
  - Post-deep-dive emotional check ("Ako sa cítiš?")
  - Safety word: "stop" for immediate exit from deep topics
- **Dynamic Perspective Weighting:**
  - Calculates CORE/Glitchoslav/Popiči/Analyst weights based on:
    - Relationship level (50% influence)
    - Emotional state (30% influence)
    - Problem type (50% influence)
  - Automatic perspective display (companion+ levels)
- **Memory Triggers:**
  - Activates relevant past memories based on keywords
  - Formatted for natural integration: "Pamätám si, že sme o {{topic}} hovorili..."
  - Relevance scoring prevents spam

### 🎯 Enhanced Commands

```bash
/shadow TEXT         # Temná vrstva - bezpečný priestor pre zraniteľný obsah
/mirror              # Now includes AI meta-reflection section
/help                # Updated with safety word and /shadow
```

### 🔄 Enhanced Features

- **Safety word integration** – Type "stop" to exit deep conversation
- **Memory triggers in chat** – AI references relevant past conversations automatically
- **Ritual tracking** – All rituals increment `ritualsCompleted` metric
- **Deep conversation detection** – Every 10th message increments metric
- **System prompt enhancement** – BAD Labs safety patterns integrated

### 📁 Updated File Structure

```
sp4_core_agent/
├── fieldTactics.js         # NEW – Safety, weighting, triggers (320 lines)
├── memory.js               # ENHANCED – V0.3.1 functions added
├── index.js                # ENHANCED – Field tactics integration
├── corePrompt.js           # ENHANCED – Safety patterns in prompt
├── rituals.js              # ENHANCED – Meta-reflection in /mirror
└── package.json            # UPDATED – v0.3.1
```

### 🧬 Memory Structure Evolution

**V0.3.0 → V0.3.1:**
```diff
{
- log: [],
- ourBond: { trustLevel, communicationStyle, sharedExperiences },
+ rawMemory: [],
+ episodicMemory: { daily: {}, weekly: {}, chapters: [] },
+ semanticMemory: { beliefs: [], concepts: [], relationships: [] },
+ relationshipModel: {
+   level: "stranger",
+   metrics: { interactionCount, deepConversations, ritualsCompleted, vulnerabilityMoments },
+   milestones: []
+ },
+ shadowLog: [],
+ seeds: [],
+ metaReflection: { lastSelfAudit, notes: [], userFeedback: [] }
}
```

### 🔐 Privacy & Safety

- **Shadow log** – Isolated storage for sensitive content
- **Safety patterns** – Built into system prompt (non-diagnostic language)
- **User control** – Safety word, post-deep checks, always-optional depth
- **Local-only** – All new features remain 100% offline
- **Backward compatible** – Old memory.json auto-migrates on first load

### 📚 Philosophy Integration

**BAD Labs Principles Applied:**
1. **Zrkadlo, nie diagnóza** – AI describes patterns, never diagnoses
2. **"Čo/Ako" nie "Prečo"** – Avoids triggering defensive mechanisms
3. **Užívateľ má kontrolu** – Safety word, consent-based depth
4. **Malé kroky** – Reminds past successes, suggests manageable actions
5. **Živý systém** – AI reflects on itself, asks for feedback

### ⚙️ Technical Improvements

- **Migration-safe** – Detects old memory format, converts seamlessly
- **Error-resilient** – Meta-reflection failures don't break chat
- **Performance-optimized** – Memory triggers use efficient keyword matching
- **Modular design** – fieldTactics.js can be extended independently

---

## [0.3.0] – November 15, 2025 🚀

### ✨ Major Features (BAD Labs Engine)

#### 🧠 Hierarchical Memory System
- **5-layer memory architecture:**
  - Raw Memory – Unfiltered interactions
  - Episodic Memory – Daily/weekly consolidations
  - Semantic Memory – Concepts, beliefs, patterns
  - Emotional Memory – Trajectory, peaks, valleys
  - Relational Memory – AI-human bond metrics
- **Memory consolidation pipeline** – Automatic compression and learning
- **Automatic backups** – Daily + manual backup support

#### 🔮 Predictive Pattern Detection Engine
- **Pattern types:**
  - Burnout Risk (30-day mood + engagement analysis)
  - Creative Peak (energy + idea frequency + excitement)
  - Stress Pattern (keyword frequency analysis)
  - Productivity Window (time-of-day peak detection)
  - Emotional Cycle (day-of-week patterns)
- **Confidence scoring** (0-1.0) with suggested actions
- **Historical pattern tracking** – Learn from past cycles

#### 🌀 Multi-Voice Synthesis Engine
- **4 distinct AI personalities:**
  - Core (pragmatic balanced assistant)
  - Glitchoslav (mystical slovan guide)
  - Popiči (humorous loyal brother)
  - Analyst (logical data-driven)
- **Parallel LLM execution** – All voices speak simultaneously
- **Meta-agent synthesis** – Combines perspectives into integrated wisdom
- **Confidence calculation** – Unified recommendation scoring

#### 💎 Relationship Evolution Model
- **6 relationship stages:**
  - Stranger (0-20 interactions)
  - Acquaintance (20-50)
  - Companion (50-100)
  - Confidant (100-200)
  - Symbiote (200+)
- **Tracked metrics:**
  - Shared experiences (conversation count)
  - Vulnerability index (emotional openness)
  - Insight accuracy (prediction success)
  - Ritual consistency (follow-through)
- **5D evolution vector** – AI personality drift tracking
- **Adaptation learning** – AI learns communication preferences
- **Milestones & history** – Relationship progression snapshots

#### 🔧 Integration Layer
- **processInteraction()** – Full pipeline: record → detect → analyze → synthesize → evolve
- **getRitualContext()** – Engine-powered /mirror, /today, /next
- **generateProactiveMessage()** – AI initiates conversations based on patterns
- **performNightlyConsolidation()** – Automatic memory compression

### 🎯 New Commands

```bash
/engine              # Engine status (memory layers, patterns, relationship)
/status              # Alias for /engine  
/report              # Full diagnostic JSON report
```

### 📊 Engine Diagnostics

- Memory health metrics (raw entries, episodic days, semantic concepts)
- Pattern analysis summary (high-confidence patterns, recommendations)
- Relationship status with progression percentage
- 5D evolution vector visualization
- Active adaptations count

### 📁 New File Structure

```
engine/
├── index.js           # Central hub (ENGINE object)
├── memory.js          # 5-layer hierarchical memory
├── prediction.js      # Pattern detection algorithms
├── synthesis.js       # Multi-voice synthesis + meta-agent
├── relationship.js    # Bond evolution + adaptation learning
└── integration.js     # Pipeline orchestration
```

### 📚 Documentation

- **QUICK_START.md** – 2-minute setup guide
- **ARCHITECTURE_V03.md** – Complete technical architecture (1000+ lines)
- **DEPLOYMENT_V03.md** – Full deployment & customization guide
- **README.md** – Completely rewritten for v0.3

### 🔄 Enhanced Commands

- `/mirror` – Now powered by pattern detection engine
- `/today` – Uses episodic memory consolidation
- `/next` – Suggests actions based on detected patterns
- `/trinity` – Now uses synthesis engine for integrated output
- `/help` – Updated with 3 new engine commands

### ⚙️ Improvements

- **Backward compatible** – Old memory.json files still load
- **Non-blocking engine** – AI processing runs in background
- **Error resilience** – Engine errors don't break chat
- **Memory cleanup** – Automatic archival of old data
- **Maintenance mode** – nightly consolidation preparation

### 🔐 Privacy

- **All engine modules offline-only** – No external API calls
- **Memory stays local** – Enhanced transparency with readable JSON
- **Optional encryption** – Planned for v0.4
- **Full data export** – Backup format human-readable

---

## [0.2.0] – Previous Release

### Features
- Memory layers concept (raw → compressed → chapters → seeds)
- Trinity system (3 voices: core, glitchoslav, popici)
- Ritual system (/mirror, /today, /next, /trinity, /seed)
- HTTP REST API server
- Automatic daily backups

### Status
- Archived as `README_v0.2.md`
- Core concepts evolved into V0.3 engine modules

---

## [0.1.0] – Initial Release

### Features
- Basic chat with Ollama
- Onboarding spovednica (4 stages)
- Memory persistence (JSON-based)
- Manual backup support
- Mode switching (core, glitchoslav, popici, analyst)

### Status
- Archived as `README_v1_backup.md`
- Foundation for all subsequent versions

---

## 🚀 Roadmap

### V0.4 (Q1 2026)
- [ ] Memory encryption (AES optional)
- [ ] HTTP server enhancement (/api/predictions, /api/trinity streaming)
- [ ] Scheduler module (node-cron)
- [ ] Telegram bot integration
- [ ] Knowledge graph visualization

### V0.5 (Q2 2026)
- [ ] Mobile app (React Native)
- [ ] Cloud sync option (optional, encrypted)
- [ ] Advanced analytics dashboard
- [ ] Custom ritual creation
- [ ] Community sharing (anonymized patterns)

### V1.0 (Q3 2026)
- [ ] Production hardening
- [ ] Performance optimization
- [ ] Multi-user support
- [ ] Enterprise deployment
- [ ] Full documentation suite

---

## 🔧 Technical Debt

- [ ] Add comprehensive unit tests
- [ ] Performance profiling for large memory files
- [ ] Memory migration utilities
- [ ] Error recovery mechanisms
- [ ] API rate limiting (for server.js)

---

## 🐛 Known Issues

None currently reported for V0.3.0

---

## 💡 Architecture Evolution

| Version | Memory | Detection | Synthesis | Relationship |
|---------|--------|-----------|-----------|--------------|
| v0.1 | Single log | N/A | N/A | N/A |
| v0.2 | Layered concept | Manual | 3 voices | Tracked stages |
| **v0.3** | **5-layer hierarchy** | **Statistical patterns** | **4 voices + meta** | **Evolution metrics** |

---

## 🙏 Contributors

- SP4 Community (core philosophy)
- Walter Pepenberg + BAD Labs (V0.3 architecture)
- Meta's Ollama team (LLM infrastructure)

---

**Version:** 0.3.0  
**Release Date:** November 15, 2025  
**Status:** 🟢 Production Ready  
**Maintenance:** Active
