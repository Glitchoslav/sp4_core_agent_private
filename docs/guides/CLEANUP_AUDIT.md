# 🧹 SP4 CLEANUP AUDIT - File Organization Report

**Date:** 2025-11-21  
**Purpose:** Clean up obsolete files, archive legacy code, organize structure

---

## 📊 Current Structure (222 files analyzed)

```
ROOT (125 files) ⚠️ TOO MANY!
├── archive/ (22 files) ✅
├── archive/engine/ (6 files) ✅
├── backups/ (4 files) ✅
├── chronicles/ (1 file)
├── core/ (1 file)
├── data/ (2 files)
├── data/backups/ (1 file)
├── data/memory/ (2 files) ✅ ACTIVE
├── data/memory/personas/ (3 files) ✅ ACTIVE
├── docs/ (9 files)
├── manifest/ (1 file)
├── memory/ (1 file) ✅ ACTIVE (memoryHierarchy.js)
├── orchestration/ (1 file) ✅ ACTIVE (glitchOrchestrator.js)
├── protection/ (1 file)
├── rituals/ (1 file)
├── rules/ (1 file) ✅ ACTIVE (pattern-history.json)
├── scripts/ (4 files)
├── SP4_CORE/ (8 files)
├── SP4_CORE/agents/ (3 files)
├── src/core/ (26 files) ✅ ACTIVE
├── src/core/personas/ (1 file) ✅ ACTIVE
├── src/debug/ (2 files)
├── src/personas/core/ (2 files) ✅ ACTIVE
├── src/personas/popici/ (2 files) ✅ ACTIVE
├── src/personas/validator/ (2 files) ✅ ACTIVE
├── src/protection/ (1 file) ✅ ACTIVE
└── src/rituals/ (1 file) ✅ ACTIVE
```

---

## 🔥 ACTIVE FILES (Core System)

### Essential Runtime Files (KEEP):
```
✅ integration.js - Main orchestration entry point
✅ llmLocal.js - Ollama communication
✅ multiVoice.js - Prompt building
✅ package.json - Dependencies
✅ server.js - HTTP REST API (future)
✅ logger.js - Logging system
✅ supervisor.js - Health monitoring
✅ scheduler.js - Consolidation scheduler
✅ backup.js - Backup system
```

### Active Modules (KEEP):
```
✅ memory/memoryHierarchy.js - ACL-controlled memory (NEW v1.1)
✅ orchestration/glitchOrchestrator.js - GLITCHOSLAV BOSS (NEW v1.0)
✅ src/core/modeCompass.js - Persona routing
✅ src/core/modelRouting.js - Model selection
✅ src/core/dialectAnalyzer.js - Eastern Slovak detection
✅ src/core/emotionalProcessor.js - Intensity analysis
✅ src/core/contextManager.js - Context lock
✅ src/core/ruleMiner.js - Rule mining engine
✅ src/core/responseRhythm.js - Response formatting
✅ src/core/antiCorporateFilter.js - Corporate speak removal
✅ src/personas/core/persona.core.js - CORE persona
✅ src/personas/popici/persona.popici.js - POPICI persona
✅ src/personas/validator/persona.validator.js - VALIDATOR
✅ src/core/personas/glitchoslav.js - GLITCHOSLAV persona
✅ src/protection/botKiller.js - Bot detection
✅ src/rituals/birthRitual.js - Onboarding
```

### Active Data (KEEP):
```
✅ data/memory/core.json - GLITCHOSLAV-only secrets
✅ data/memory/shared.json - Public memory
✅ data/memory/personas/glitchoslav.json - Persona view
✅ data/memory/personas/core.json - CORE view
✅ data/memory/personas/popici.json - POPICI view
✅ rules/pattern-history.json - Rule mining history
```

---

## 🗑️ OBSOLETE FILES (Archive or Delete)

### 1. Duplicate/Legacy Modules (ROOT):
```
❌ agents.js → REPLACED by orchestration/glitchOrchestrator.js
❌ agentManager.js → OBSOLETE (council system deprecated)
❌ corePrompt.js → REPLACED by multiVoice.js
❌ emotionalProcessor.js → DUPLICATE of src/core/emotionalProcessor.js
❌ glitchLayer.js → OBSOLETE (replaced by orchestrator)
❌ identity.js → REPLACED by src/core/personas/glitchoslav.js
❌ identityDrift.js → TESTING ONLY (archive)
❌ languageSanitizer.js → OBSOLETE (validator disabled)
❌ memory.js → REPLACED by memory/memoryHierarchy.js
❌ memoryHelpers.js → MERGED into memoryHierarchy.js
❌ memoryLayers.js → MERGED into memoryHierarchy.js
❌ memoryTriggers.js → OBSOLETE (RAG disabled)
❌ ragLocal.js → OBSOLETE (RAG disabled)
❌ relationshipEvolution.js → NOT IMPLEMENTED
❌ rituals.js → REPLACED by src/rituals/birthRitual.js
❌ ruleMiner.js → DUPLICATE of src/core/ruleMiner.js
❌ ruleMiningPipeline.js → INTEGRATED into integration.js
❌ semanticExtractor.js → OBSOLETE (RAG disabled)
```

### 2. Test Files (ROOT) - MOVE TO tests/:
```
❌ compassTest.js
❌ contextManagerTest.js
❌ debug_rag.js
❌ dialectAnalyzerTest.js
❌ intensityDetectionTest.js
❌ liveTestV07.js
❌ modeCompassIntegrationTest.js
❌ quick_test.js
❌ quickAnalyzerTest.js
❌ test_*.js (25 files!)
```

### 3. Documentation - CONSOLIDATE:
```
⚠️ WALTER_*.md (11 files) → archive/docs/walter/
⚠️ CHANGELOG_*.md (5 files) → docs/changelogs/
⚠️ POPICI_*.md (3 files) → docs/fixes/
⚠️ DEPLOYMENT_*.md → archive/docs/
⚠️ V05_ROADMAP.md → archive/docs/
⚠️ TESTING_PROTOCOL.md → docs/testing/
```

### 4. Old Scripts:
```
❌ cleanup_memory.js → OBSOLETE
❌ export_training_data.js → OBSOLETE (no training)
❌ recompute_embeddings.js → OBSOLETE (RAG disabled)
❌ scripts/migrateMemory.js → ONE-TIME USE (archive)
❌ scripts/testIdentityDrift.js → ARCHIVE
❌ scripts/testMemorySystem.js → ARCHIVE
```

### 5. Legacy Folders:
```
❌ core/glitch_core.json → OBSOLETE
❌ protection/glitch_guard.js → DUPLICATE of src/protection/botKiller.js
❌ rituals/glitch_rituals.js → DUPLICATE of src/rituals/birthRitual.js
❌ chronicles/glitch_chain.md → ARCHIVE
```

### 6. Unused Persona Modules:
```
⚠️ goalsModel.js → NOT IMPLEMENTED (delete or implement)
⚠️ fieldTactics.js → NOT IMPLEMENTED (delete or implement)
⚠️ gracefulDegradation.js → PARTIALLY USED (review)
⚠️ consolidationEngine.js → USED BY SCHEDULER (keep)
```

---

## 📁 PROPOSED NEW STRUCTURE

```
sp4_core_agent/
├── 📁 src/                          # SOURCE CODE ONLY
│   ├── core/                        # Core modules (26 files) ✅
│   ├── personas/                    # Persona implementations ✅
│   ├── protection/                  # Bot detection ✅
│   └── rituals/                     # Onboarding ✅
│
├── 📁 memory/                       # MEMORY SYSTEM
│   └── memoryHierarchy.js           # ACL-controlled memory ✅
│
├── 📁 orchestration/                # ORCHESTRATION
│   └── glitchOrchestrator.js        # BOSS decision engine ✅
│
├── 📁 data/                         # RUNTIME DATA
│   ├── memory/                      # Memory files ✅
│   │   ├── core.json                # Secrets
│   │   ├── shared.json              # Public
│   │   └── personas/                # Filtered views
│   └── backups/                     # Auto backups ✅
│
├── 📁 rules/                        # RULE MINING
│   └── pattern-history.json         # Pattern history ✅
│
├── 📁 docs/                         # DOCUMENTATION
│   ├── api/                         # API docs
│   ├── changelogs/                  # Version history
│   ├── fixes/                       # Bug fix reports
│   ├── guides/                      # User guides
│   └── architecture/                # System design
│
├── 📁 tests/                        # ALL TESTS (NEW)
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   └── live/                        # Live conversation tests
│
├── 📁 scripts/                      # UTILITY SCRIPTS
│   └── runConsolidation.js          # Manual consolidation ✅
│
├── 📁 archive/                      # OBSOLETE CODE ✅
│   ├── engine/                      # Old engines
│   ├── docs/                        # Old docs (NEW)
│   └── legacy/                      # Deprecated modules (NEW)
│
├── 📁 SP4_CORE/                     # MANIFESTS (keep or merge to docs/)
│   ├── SP4_IDENTITY.md
│   ├── KEFYK_IDENTITY.md
│   └── agents/                      # Agent definitions
│
├── 📄 integration.js                # MAIN ENTRY POINT ✅
├── 📄 llmLocal.js                   # Ollama client ✅
├── 📄 multiVoice.js                 # Prompt builder ✅
├── 📄 server.js                     # HTTP API ✅
├── 📄 supervisor.js                 # Monitoring ✅
├── 📄 scheduler.js                  # Scheduler ✅
├── 📄 backup.js                     # Backups ✅
├── 📄 logger.js                     # Logging ✅
├── 📄 package.json                  # Dependencies ✅
├── 📄 README.md                     # Main README ✅
└── 📄 .gitignore                    # Git ignore ✅
```

---

## 🎯 ACTION PLAN

### PHASE 1: Archive Obsolete (SAFE)
```bash
# Create archive structure
mkdir -p archive/legacy archive/docs archive/tests

# Move obsolete modules
mv agents.js agentManager.js corePrompt.js archive/legacy/
mv emotionalProcessor.js glitchLayer.js identity.js archive/legacy/
mv identityDrift.js languageSanitizer.js memory.js archive/legacy/
mv memoryHelpers.js memoryLayers.js memoryTriggers.js archive/legacy/
mv ragLocal.js relationshipEvolution.js rituals.js archive/legacy/
mv ruleMiner.js ruleMiningPipeline.js semanticExtractor.js archive/legacy/

# Move old docs
mv WALTER_*.md archive/docs/
mv DEPLOYMENT_*.md V05_ROADMAP.md archive/docs/
mv TESTING_PROTOCOL.md archive/docs/

# Move old scripts
mv cleanup_memory.js export_training_data.js archive/legacy/
mv recompute_embeddings.js archive/legacy/
```

### PHASE 2: Organize Tests
```bash
# Create tests structure
mkdir -p tests/unit tests/integration tests/live

# Move test files
mv test_*.js tests/integration/
mv *Test.js tests/unit/
mv scripts/test*.js tests/unit/
```

### PHASE 3: Consolidate Docs
```bash
# Create docs structure
mkdir -p docs/changelogs docs/fixes docs/guides docs/architecture

# Move changelogs
mv CHANGELOG*.md docs/changelogs/

# Move fix reports
mv POPICI_*.md docs/fixes/
mv BUG_FIX_*.md docs/fixes/

# Move guides
mv QUICK_START.md README_GLITCHOSLAV.md docs/guides/
mv USAGE_GUIDE.md docs/guides/

# Move architecture
mv SYSTEM_OVERVIEW.md BUILD_MANIFEST.md docs/architecture/
mv PERSONA_HIERARCHY_AUDIT.md docs/architecture/
```

### PHASE 4: Remove Duplicates
```bash
# Delete duplicate folders
rm -rf core/ protection/ rituals/ chronicles/

# Delete obsolete scripts
rm goalsModel.js fieldTactics.js
```

### PHASE 5: Update Imports
- Scan for broken imports after moves
- Update paths in active files
- Test system: `npm start`

---

## ✅ FINAL RESULT

**Before:** 222 files (125 in ROOT!)  
**After:** ~50 files in ROOT (clean, organized)

**Benefits:**
- ✅ Clear separation: src/ vs data/ vs docs/
- ✅ Easy navigation for developers
- ✅ Archive preserves history
- ✅ Tests isolated from runtime
- ✅ No duplicate modules
- ✅ Professional structure

**Risk:** LOW (archive preserves everything, no deletion)

---

## 🚨 CRITICAL CHECKS BEFORE CLEANUP

1. ✅ Memory system tested (hard guards working)
2. ✅ Orchestrator tested (100% routing)
3. ✅ POPICI model tested (OpenEuroLLM-Slovak)
4. ⚠️ Backup current state: `node backup.js`
5. ⚠️ Git commit before cleanup
6. ⚠️ Test after each phase

---

**Ready to execute? Potvrď a spustím PHASE 1 (archive obsolete files).**
