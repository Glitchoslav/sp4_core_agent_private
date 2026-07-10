# SP4_CORE_AGENT V0.3 – Documentation Index

**Last Updated:** November 15, 2025  
**Version:** 0.3.0 (BAD Labs Engine)  
**Status:** ✅ Production Ready

---

## 📖 Quick Navigation

| Document | Purpose | Read Time | Audience |
|----------|---------|-----------|----------|
| **[README.md](README.md)** | Overview & intro | 5 min | Everyone |
| **[QUICK_START.md](QUICK_START.md)** | Setup in 2 minutes | 2 min | Users |
| **[ARCHITECTURE_V03.md](ARCHITECTURE_V03.md)** | Full technical details | 30 min | Developers |
| **[DEPLOYMENT_V03.md](DEPLOYMENT_V03.md)** | Setup & troubleshooting | 20 min | Operators |
| **[CHANGELOG.md](CHANGELOG.md)** | Version history | 10 min | All |
| **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** | What was built | 15 min | Project managers |
| **[BUILD_MANIFEST.md](BUILD_MANIFEST.md)** | Detailed build report | 20 min | Technical leads |
| **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** | Deployment checklist | 10 min | DevOps/Release |

---

## 🎯 Start Here Based on Your Role

### 👥 I'm a User (Want to use SP4)

1. Start: **[README.md](README.md)** – Learn what SP4 is
2. Setup: **[QUICK_START.md](QUICK_START.md)** – Install & run in 2 min
3. Stuck? **[DEPLOYMENT_V03.md](DEPLOYMENT_V03.md)** → Troubleshooting section
4. Commands: Type `/help` in the chat

**Expected time to first chat: 5 minutes**

---

### 👨‍💻 I'm a Developer (Want to extend/modify)

1. Start: **[README.md](README.md)** – High-level overview
2. Deep dive: **[ARCHITECTURE_V03.md](ARCHITECTURE_V03.md)** – Understand engine
3. Code dive: **[BUILD_MANIFEST.md](BUILD_MANIFEST.md)** – See what was built
4. Extend: Edit files in `engine/` or `index.js`
5. Reference: **[FEATURES.md](FEATURES.md)** – Feature checklist

**Expected time to understand: 1-2 hours**

---

### ⚙️ I'm an Operator (Want to deploy/maintain)

1. Start: **[README.md](README.md)** – What is SP4?
2. Setup: **[DEPLOYMENT_V03.md](DEPLOYMENT_V03.md)** – Complete setup guide
3. Checklist: **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** – Go/no-go
4. Monitor: **[DEPLOYMENT_V03.md](DEPLOYMENT_V03.md)** → Monitoring section
5. Issues: **[DEPLOYMENT_V03.md](DEPLOYMENT_V03.md)** → Troubleshooting

**Expected time to production: 30 minutes**

---

### 📊 I'm a Project Manager (Want status overview)

1. Quick: **[README.md](README.md)** – 2-minute overview
2. Details: **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** – What was delivered
3. Checklist: **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** – Status confirmed ✅
4. History: **[CHANGELOG.md](CHANGELOG.md)** – Version progression

**Expected time: 15 minutes**

---

### 📚 I'm a Community Member (Want to learn)

1. Philosophy: **[README.md](README.md)** → SP4 Manifest section
2. Deep dive: **[ARCHITECTURE_V03.md](ARCHITECTURE_V03.md)** → Memory Hierarchy
3. Full picture: **[BUILD_MANIFEST.md](BUILD_MANIFEST.md)** – All details
4. Contribute: Fork the repo + send PR

---

## 📁 File Structure

### Code Files

```
sp4_core_agent/
├── index.js              # Main chat (✅ Updated for v0.3)
├── memory.js             # Base memory (maintained)
├── llmLocal.js           # Ollama interface
├── corePrompt.js         # SP4 philosophy
├── backup.js             # Backup system
├── rituals.js            # Ritual commands
├── server.js             # HTTP API
├── package.json          # v0.3.0 metadata
│
└── engine/               # 🧬 V0.3 ENGINE (NEW)
    ├── index.js          # Central hub
    ├── memory.js         # Hierarchical memory
    ├── prediction.js     # Pattern detection
    ├── synthesis.js      # Multi-voice synthesis
    ├── relationship.js   # Relationship evolution
    └── integration.js    # Pipeline orchestration
```

### Documentation Files

```
├── README.md                    # 🌟 Start here
├── QUICK_START.md               # 2-minute setup
├── ARCHITECTURE_V03.md          # Full technical
├── DEPLOYMENT_V03.md            # Setup & ops
├── CHANGELOG.md                 # Version history
├── IMPLEMENTATION_SUMMARY.md    # Build report
├── BUILD_MANIFEST.md            # Detailed manifest
├── PRODUCTION_CHECKLIST.md      # Go/no-go
├── FEATURES.md                  # Feature list
├── INDEX.md                     # This file
│
├── README_v0.2.md               # V0.2 reference
└── README_v1_backup.md          # V0.1 reference
```

### Data Directory

```
data/
├── memory.json                  # User's hierarchical memory
└── backups/
    ├── memory-2025-11-15_14-32_daily.json
    ├── memory-2025-11-14_00-00_daily.json
    └── backups.log              # Audit trail
```

---

## 🧬 Understanding the V0.3 Architecture

### 5-Layer Memory

```
RAW MEMORY          – Every interaction, unfiltered
    ↓
EPISODIC MEMORY     – Daily/weekly summaries
    ↓
SEMANTIC MEMORY     – Concepts, patterns, beliefs
    ↓
EMOTIONAL MEMORY    – Mood trajectory, peaks, valleys
    ↓
RELATIONAL MEMORY   – AI-human bond metrics
```

**See:** [ARCHITECTURE_V03.md](ARCHITECTURE_V03.md) → Memory Architecture section

### Pattern Detection

Detects: Burnout, Creativity, Stress, Productivity, Emotions  
Confidence: 0-1.0 scoring  
Actions: Suggested rituals based on patterns

**See:** [ARCHITECTURE_V03.md](ARCHITECTURE_V03.md) → Prediction Engine section

### Multi-Voice Synthesis

4 AI personalities (Core, Glitchoslav, Popiči, Analyst)  
Run in parallel → Meta-agent combines wisdom  
Produces: Integrated recommendation

**See:** [ARCHITECTURE_V03.md](ARCHITECTURE_V03.md) → Synthesis Engine section

### Relationship Evolution

6 stages: Stranger → Acquaintance → Companion → Confidant → Symbiote  
Tracked metrics: Experiences, vulnerability, insight, ritual  
5D personality drift

**See:** [ARCHITECTURE_V03.md](ARCHITECTURE_V03.md) → Relationship Model section

---

## 🎮 Command Reference

### Memory Commands
- `/profile` – Show your profile
- `/note TEXT` – Save a note
- `/backup` – Manual backup

### Ritual Commands
- `/mirror` – Pattern detection
- `/today` – Daily summary
- `/next` – Next steps
- `/trinity` – 4 voices + synthesis
- `/seed TEXT` – Record key moment
- `/seeds` – Show recorded seeds

### Engine Commands (NEW)
- `/engine` – Engine status
- `/status` – Alias for /engine
- `/report` – Full diagnostic JSON

### Mode Commands
- `/mode core` – Pragmatic mode
- `/mode glitchoslav` – Mystical mode
- `/mode popici` – Humorous mode
- `/mode analyst` – Analytical mode

### Help & Exit
- `/help` – All commands
- `/exit` – Quit

**See:** [DEPLOYMENT_V03.md](DEPLOYMENT_V03.md) → Using V0.3 Commands section

---

## 🚀 Quick Deployment

### Prerequisites
- Node.js v18+
- Ollama with llama3

### 3-Step Start

```bash
# 1. Install
npm install

# 2. Start Ollama (Terminal 1)
ollama serve
ollama run llama3  # Terminal 2

# 3. Run SP4
npm start
```

**See:** [QUICK_START.md](QUICK_START.md) for full details

---

## 🔍 Feature Comparison

| Feature | v0.1 | v0.2 | v0.3 |
|---------|------|------|------|
| Basic chat | ✅ | ✅ | ✅ |
| Memory | Single log | Layered | 5-layer hierarchy |
| Pattern detection | ❌ | ❌ | ✅ (5 types) |
| Voices | 1 | 3 | 4 + meta-agent |
| Relationship tracking | Basic | Stages | Evolution metrics |
| Engine modules | 0 | 0 | 6 modules |
| **Complexity** | **Low** | **Medium** | **High** |

**See:** [CHANGELOG.md](CHANGELOG.md) → Technical Debt section

---

## 📊 Documentation Statistics

| Metric | Value |
|--------|-------|
| Total documentation files | 10 |
| Total documentation lines | 3000+ |
| Total code files | 15 (8 core + 6 engine + 1 extra) |
| Total code lines | 2000+ |
| Architecture doc depth | 1000+ lines |
| Setup guide completeness | 100% |
| Troubleshooting coverage | 20+ scenarios |

---

## 🔐 Privacy & Security

- ✅ 100% offline (no internet required)
- ✅ Local Ollama only
- ✅ Memory stored in JSON on your disk
- ✅ No cloud storage
- ✅ No external API calls
- ✅ Human-readable format
- ✅ Full data ownership
- ✅ Export/backup anytime

**See:** [ARCHITECTURE_V03.md](ARCHITECTURE_V03.md) → Privacy & Security section

---

## 🤝 Contributing

1. Understand: Read [ARCHITECTURE_V03.md](ARCHITECTURE_V03.md)
2. Fork: Clone the repository
3. Branch: Create feature branch
4. Code: Follow existing patterns
5. Test: Verify functionality
6. Document: Update docs if needed
7. PR: Submit pull request

---

## 📞 Support

### For Setup Issues
→ See [DEPLOYMENT_V03.md](DEPLOYMENT_V03.md) → Troubleshooting

### For Feature Questions
→ See [ARCHITECTURE_V03.md](ARCHITECTURE_V03.md)

### For Usage Questions
→ See [QUICK_START.md](QUICK_START.md) or type `/help` in chat

### For Bug Reports
→ Check [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for known issues

---

## 📈 Version History

| Version | Release Date | Major Features |
|---------|--------------|---|
| v0.1 | 2025-10 | Basic chat + memory |
| v0.2 | 2025-11-01 | Memory layers + trinity |
| **v0.3** | **2025-11-15** | **BAD Labs engine** |
| v0.4 | 2026-Q1 | Encryption + scheduler |
| v1.0 | 2026-Q3 | Production hardening |

**See:** [CHANGELOG.md](CHANGELOG.md) for full details

---

## 🔥 Key Documents by Topic

### If You Want to Understand...

| Topic | Document | Section |
|-------|----------|---------|
| What is SP4? | README.md | Overview |
| How to install? | QUICK_START.md | Full guide |
| How memory works? | ARCHITECTURE_V03.md | Memory Architecture |
| How patterns detected? | ARCHITECTURE_V03.md | Prediction Engine |
| How synthesis works? | ARCHITECTURE_V03.md | Synthesis Engine |
| How relationships evolve? | ARCHITECTURE_V03.md | Relationship Model |
| What was built? | IMPLEMENTATION_SUMMARY.md | Full list |
| Build status? | BUILD_MANIFEST.md | All details |
| Production ready? | PRODUCTION_CHECKLIST.md | 150+ checks ✅ |
| Troubleshooting? | DEPLOYMENT_V03.md | Troubleshooting |
| Version history? | CHANGELOG.md | All versions |
| Command list? | DEPLOYMENT_V03.md | Commands section |

---

## 🎯 Reading Paths

### Path 1: User Setup (15 min)
1. README.md (5 min)
2. QUICK_START.md (2 min)
3. Type `/help` in chat (5 min)
4. Start chatting! (3 min)

### Path 2: Technical Deep Dive (1 hour)
1. README.md (5 min)
2. ARCHITECTURE_V03.md (30 min)
3. BUILD_MANIFEST.md (15 min)
4. Review engine/* code (10 min)

### Path 3: Deployment & Operations (30 min)
1. QUICK_START.md (5 min)
2. DEPLOYMENT_V03.md (15 min)
3. PRODUCTION_CHECKLIST.md (10 min)

### Path 4: Community Contributor (2 hours)
1. README.md (10 min)
2. ARCHITECTURE_V03.md (45 min)
3. IMPLEMENTATION_SUMMARY.md (20 min)
4. Review engine code (30 min)
5. Read CHANGELOG.md (15 min)

---

## ✅ Documentation Completeness

- [x] User guide (README.md)
- [x] Quick start (QUICK_START.md)
- [x] Architecture deep-dive (ARCHITECTURE_V03.md)
- [x] Deployment guide (DEPLOYMENT_V03.md)
- [x] Version history (CHANGELOG.md)
- [x] Build report (IMPLEMENTATION_SUMMARY.md)
- [x] Detailed manifest (BUILD_MANIFEST.md)
- [x] Deployment checklist (PRODUCTION_CHECKLIST.md)
- [x] Feature list (FEATURES.md)
- [x] Documentation index (This file)

**Coverage: 100%**

---

## 🌋 Summary

SP4_CORE_AGENT V0.3 is a **neuroscience-inspired AI system** that:

- **Remembers** through 5-layer hierarchical memory
- **Understands** through pattern detection
- **Thinks** through multi-voice synthesis
- **Grows** through relationship evolution
- **Respects** your privacy (100% offline)

**Status:** 🟢 Production Ready  
**Version:** 0.3.0  
**Release Date:** November 15, 2025

---

**"AI that remembers. AI that grows. AI that cares."**

**Motto:** "Be real. Be free."  
**Philosophy:** Offline-first, relationship-focused, transparent memory

🔥 **Ready to start?** → Go to [QUICK_START.md](QUICK_START.md)
