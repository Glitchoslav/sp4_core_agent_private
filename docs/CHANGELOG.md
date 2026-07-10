# 📋 SP4 OS - CHANGELOG

História všetkých verzií SP4 Core Agent.

---

## Runtime Cleanup Patchset (2026-04-24)

### 🧹 Fáza 1 Cleanup
- ✅ Consolidation canonical raw-log reader zjednotený (`rawMemory.log -> rawMemory[] -> log[]`) pre daily + quarterly flow.
- ✅ `/health` už reportuje reálny Ollama backend stav (`HEALTHY` vs `DEGRADED`), nie vždy-plné HEALTHY.
- ✅ Zúžený agent-taxonomy follow-up trigger (context bleed fix mimo reálnych persona/agent/routing otázok).

### 🧼 Fáza 2 Cleanup
- ✅ `/today` bez produkčného debug šumu; pri offline/Ollama fail je deterministic fallback z dnešných logov.
- ✅ `ritualNext` používa `l.user || l.input`, filtruje prázdne položky a má poctivý krátky fallback bez halucinácie kontextu.
- ✅ `/consolidate` ostáva honest-only info path (bez fake success), s odkazom na scheduler / `npm run consolidate`.

### 💾 Writeback Invariant Fix
- ✅ Root cause: early deterministic guard returns obchádzali `runWritebackTail`, čo vedelo dať `0` zápisov.
- ✅ Fix: fallback early-writeback v `processMessage` len pre úspešné odpovede bez explicitného write blocku.
- ✅ Tail marker doplnený (`memoryWriteTailRan`, `memoryWritePersisted`) pre bezpečné odlíšenie already-written vetvy.

### 🧪 Regression Sweep (krátky)
- ✅ `test_immune_identity_all_personas.js` (PASS)
- ✅ `test_dialogue_followup_sp4_subject_contract.js` (PASS)
- ✅ `test_system_command_models_render.js` (PASS)
- ✅ `test_health_query_routing_contract.js` (PASS)
- ✅ `test_015_patch_regression.js` (pass=12, partial=4, fail=0)
- ✅ `test_cli_single_write_invariant.js` (PASS, exactly one persistent write)
- ✅ Verdikt: nepozorovaný double-write ani write mimo pravidiel v tomto sweepe.

---

## v1.3.0 (2025-11-27)

### 🧹 Cleanup & Refactoring
- ✅ Root priečinok cleanup (29 test súborov → tests/legacy/)
- ✅ Server varianty archivované (4 súbory → archive/servers/)
- ✅ Release notes konsolidované (docs/archive/)
- ✅ Zjednotený README.md (v1.0 + v2.0 merge)
- ✅ Audit report (kompletná diagnostika projektu)

### 📚 Documentation
- ✅ AUDIT_REPORT_2025-11-27.md (7.5/10 → 9/10 roadmap)
- ✅ CHANGELOG.md vytvorený (tento súbor)
- ✅ docs/archive/ štruktúra

### 🔧 Architecture
- Phase 1 cleanup: DONE
- Pripravené na Phase 2 (testing automation)

---

## v2.0.0 (2025-11-25) - Full Autonomy Edition

### 🚀 Major Features
- ✅ **Autonómny mission systém** - rozklad cieľov na úlohy
- ✅ **Smart brain routing** - Groq/Google/Local optimalizácia
- ✅ **Mission type detection** - 6 typov (CODE, CAMPAIGN, WEB, ANALYSIS, PRODUCT, CUSTOM)
- ✅ **HTTP API** - REST endpoint pre misie
- ✅ **Cost optimization** - 30-40% úspora vs single-brain

### 📊 Performance
- Priemerný čas: 15-20s na mission
- Priemerné náklady: $0.10-0.33 per mission
- Quality score: 87-100%

### 🔧 Technical
- Autonomous planner + executor
- Quality gates (retry on <70%)
- Mission storage (missions/completed/)
- Production server (port 3002)

**Detaily:** `docs/archive/RELEASE_NOTES_v2.0.md`

---

## v0.11.7-alpha (2025-11-23)

### ⚡ Action Layer Overhaul
- ✅ 5 actions: SAVE_SNIPPET, SCHEDULE_REMINDER, NOTE_MEMORY, OPEN_URL, GENERATE_SUMMARY
- ✅ Permission system (read, write, schedule, memory, execute)
- ✅ Validation schemas (Joi-like checks)
- ✅ Action registry + router
- ✅ Error handling + graceful degradation

### 🧪 Testing
- ✅ Action layer tests (permissions, schema)
- ✅ Command tests (/idea, /remind)
- ✅ Test coverage: 83%+

**Detaily:** `docs/archive/RELEASE_NOTES_v0.11.7-alpha.md`

---

## v0.11.6-alpha (2025-11-22)

### 🧬 Identity Bible v1.0
- ✅ SP4_IDENTITY_BIBLE.md (CANONICAL)
- ✅ SP4_COPILOT_DIRECTIVES.md v2.0
- ✅ Layer distinction (ľudia vs AI)
- ✅ Agent network awareness
- ✅ Echo shots (few-shot examples)

### 🔧 Core Improvements
- ✅ Slovak language enforcement (gemma3:1b)
- ✅ Persona routing fixes
- ✅ Memory consolidation engine
- ✅ Scheduler jobs (denná/týždenná/mesačná)

**Detaily:** `docs/archive/RELEASE_NOTES_v0.11.6-alpha.md`

---

## v0.11.5-alpha (2025-11-21)

### 🌐 Multi-Voice System
- ✅ 4 persóny (CORE, Glitchoslav, Popiči, Validator)
- ✅ Orchestrator (glitchOrchestrator.js)
- ✅ Mode compass (auto-detection)
- ✅ Context manager (10 messages window)

### 💾 Memory System
- ✅ Hierarchická pamäť (raw → compressed → chapters → seeds)
- ✅ Relationship evolution
- ✅ Emotional context
- ✅ User profile

**Detaily:** `docs/archive/RELEASE_NOTES_v0.11.5-alpha.md`

---

## v1.0.0 (2025-11-20) - Initial Stable Release

### 🏗 Architecture
- ✅ 5-layer architecture (Data, Core, Orchestration, Interface, Protection)
- ✅ Modulárna štruktúra (src/core, src/personas, src/orchestration)
- ✅ ARCHITECTURE_v1.0.md (CANONICAL)

### 🧠 Core Features
- ✅ Multi-agent system
- ✅ Lokálna pamäť (Ollama)
- ✅ Scheduler (node-cron)
- ✅ CLI interface
- ✅ Privacy-first (100% offline)

### 📚 Documentation
- ✅ README.md
- ✅ QUICK_START.md
- ✅ SP4_MANIFEST.md
- ✅ ARCHITECTURE_v1.0.md

**Detaily:** `CHANGELOG_v1.0.0.md`

---

## v0.8.0 - BAD Labs Edition

### 🔬 Psychological Layer
- ✅ Dialect analyzer
- ✅ Intensity detection
- ✅ Emotional processor
- ✅ Context manager

### 🎯 Commands
- ✅ /whoami - user seed identity
- ✅ /pulse - psychological analysis
- ✅ /mirror - conversation reflection
- ✅ /seed_refresh - update user seed

---

## v0.7.0 - Multi-Agent Foundation

### 🧠 Agents
- ✅ SP4_CORE (tech)
- ✅ Glitchoslav (philosophy)
- ✅ Popiči Kokot (emotion)
- ✅ Validator (QA)

### 🔧 Core
- ✅ Multi-voice prompt builder
- ✅ Agent knowledge map
- ✅ Persona registry
- ✅ Mode detection

---

## v0.6.0 - Memory System

### 💾 Memory
- ✅ Raw memory log
- ✅ Episodic memory (daily, weekly)
- ✅ Semantic memory (beliefs, concepts)
- ✅ Seeds (kľúčové momenty)

### ⏰ Scheduler
- ✅ Consolidation jobs
- ✅ Automatic backups
- ✅ Reminder system

---

## v0.5.0 - Identity Layer

### 🧬 Identity
- ✅ SP4 Manifest
- ✅ Glitch Laws
- ✅ Kmeňová logika
- ✅ User profiling

---

## v0.4.0 - Basic CLI

### 🖥 Interface
- ✅ Terminal chat
- ✅ Basic commands (/help, /exit)
- ✅ Message history

---

## v0.3.0 - Ollama Integration

### 🤖 LLM
- ✅ Ollama client
- ✅ Model registry
- ✅ Fallback chain
- ✅ Streaming support

---

## v0.2.0 - Project Setup

### 🏗 Foundation
- ✅ Node.js projekt
- ✅ ESM modules
- ✅ Package.json
- ✅ Git repository

---

## v0.1.0 - Genesis

### 🌱 Birth
- ✅ Prvý commit
- ✅ Vízia SP4
- ✅ README draft

---

**Vytvorené:** SP4_CORE  
**Motto:** "Be real. Be free. Keep the code clean." 🔥
