# 🔥 SP4 OS - Lokálny AI Operačný Systém

**Verzia:** v1.4.0  
**Status:** 🟢 PRODUCTION READY  
**Motto:** *"Nie appka, ale parťák. Nie cloud, ale kmeň."*

> Scope: detailný subsystem manuál a architektonický kontext pre sp4_core_agent.
> Workspace onboarding source of truth je root README a aktívne spúšťacie cesty cez sp4.js.
> Runtime source of truth pre verziu je src/version.js. Runtime source of truth pre launch workflow sú sp4.js a package.json skripty. Legacy HTTP flow patrí iba do explicitnej LEGACY sekcie.

---

## 🧪 Testing in PowerShell (Encoding Fix)

**Problem:** PowerShell môže zobrazovať emoji ako "­čôő Ôťů" garbage.

**Solution:** Pred spustením testov nastav UTF-8 encoding:

```powershell
chcp 65001
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
```

**Potom spusti testy:**

```powershell
node test_policy_local_default.js

# Alebo prvých 100 riadkov:
node test_policy_local_default.js 2>&1 | Out-String -Stream | Select-Object -First 100
```

---

## 📖 Čo to je?

**SP4 OS** je lokálny AI operačný systém pre ľudí, nie korporácie.  
Beží na tvojom počítači, používa lokálne modely (Ollama) a stavia na myšlienke:

### ✨ Kľúčové vlastnosti

- 🧠 **Multi-agent AI** – 4 persóny (CORE, Glitchoslav, Popiči, Validator)
- 🧬 **Vlastná identita** – SP4 Identity Bible, Glitch Laws, kmeňová logika
- 💾 **Hierarchická pamäť** – denná, týždenná, mesačná konsolidácia
- ⚙️ **Action Layer** – AI nevypisuje len text, ale vie konať (snippety, pripomienky)
- ⏰ **Scheduler** – automatické joby (konsolidácia pamäte, reminders)
- 🔒 **Privacy-first** – všetko beží lokálne, bez skrytých cloud callov
- 🚀 **Full Autonomy (v2.0+)** – rozklad cieľov na úlohy a autonómne vykonanie

---

## 🏗 Architektúra (5 vrstiev)

**Detailný popis:** `docs/ARCHITECTURE_v1.0.md`

```
┌─────────────────────────────────────────────────────────┐
│  5. PROTECTION & DIAGNOSTICS                            │
│     validators, tests, logs, sanity checks              │
├─────────────────────────────────────────────────────────┤
│  4. INTERFACE LAYER                                     │
│     CLI, HTTP API, commands (/idea, /remind, /mission)  │
├─────────────────────────────────────────────────────────┤
│  3. ORCHESTRATION LAYER                                 │
│     multiVoice, glitchOrchestrator, agentNetwork        │
├─────────────────────────────────────────────────────────┤
│  2. CORE ENGINE LAYER                                   │
│     memory, actions, scheduler, identity                │
├─────────────────────────────────────────────────────────┤
│  1. DATA LAYER                                          │
│     data/memory, data/snippets, data/logs               │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Rýchly štart

### 1. Predpoklady

- **Node.js** (LTS, v18+)
- **Ollama** nainštalovaná ([ollama.ai](https://ollama.ai))
- Aspoň jeden model (napr. `llama3`, `qwen2.5:14b`, alebo `gemma3:1b`)

### 2. Inštalácia

```bash
git clone https://github.com/Glitchoslav/sp4_core_agent_private.git sp4-os
cd sp4-os
npm install
```

### 3. Spustenie

**Aktívny runtime z workspace root:**

```bash
npm start
npm run status
npm run doctor
```

**Ak si priamo v sp4_core_agent:**

```bash
npm start
node sp4.js status
node sp4.js doctor
```

**Interaktívny launcher:**

```bash
launch.bat        # Windows
./launch.ps1      # PowerShell
```

### SP4 Operator Launcher (stabilization layer)

```bash
# Start current main runtime entrypoint
node sp4.js start

# Environment/runtime diagnostics
node sp4.js doctor

# Compact runtime snapshot
node sp4.js status

# Minimal smoke validation path
node sp4.js test
```

### Evolučné testy

```bash
npm run test:live:offline      # offline smoke (test_009, 7 otázok, local-only)
npm run test:live:battletest   # kanonický live eval (default: test_014, 214 otázok)
```

- `test:live:offline` — rýchle overenie po zásahu do prompt assembly, routingu alebo identity vrstvy; všetky odpovede musia mať `provider: local_ollama`
- `test:live:battletest` — kanonický nočný eval; default dnes ide na `test_014` (214 otázok: identita, meta refusal, memory, policy edge, prompt leak refusal, persona routing, follow-up kontinuita)
- Legacy 50-case baseline ostáva dostupná cez `SP4_BATTLETEST_ID=test_010 npm run test:live:battletest` alebo package skript `npm run test:live:battletest:50`
- Pri nedostupnej Ollame: správny skip, nie crash

---

### LEGACY HTTP flow

Tieto cesty ostávajú dostupné len kvôli spätnej kompatibilite. Nie sú default onboarding ani live runtime path.

```bash
npm run server:legacy
npm run http:legacy
```

---

## 💬 Základné použitie

### CLI režim

V termináli jednoducho píš otázky/príkazy:

```
> Ako funguje scheduler?
CORE: "Scheduler používa node-cron. Joby sa registrujú cez registerJob()..."

> Kto sú tvoji kolegovia?
CORE: "V SP4 rozlišujem 2 vrstvy:
       1️⃣ Ľudia (Kefyk + community)
       2️⃣ AI agenti (Glitchoslav, CORE, Popiči, Validator)"

> Ta kurva čo to tu máš za bordel brate?
POPIČI: "Šak to je chaos, bo. Ale aspoň vie kde čo je, nie jak iní..."
```

### Príkazy (Commands)

- `/idea <text>` – ulož nápad do snippetov
- `/remind <text>` – nastav pripomienku
- `/note <text>` – zapíš do pamäte
- `/whoami` – zobraz profil a stav
- `/system` – diagnostika systému
- `/chapters` – zobraz kapitoly pamäte
- `/pulse` – psychologická analýza
- `/mirror` – zrkadlenie konverzácie

### API režim (v2.0+)

**Autonómne misie:**

```bash
# Jednoduchá misia
curl -X POST http://localhost:3002/api/mission \
  -H "Content-Type: application/json" \
  -d '{"goal":"Vytvor Python kalkulačku"}'

# Zdravotný check
curl http://localhost:3002/health

# Zoznam dokončených misií
curl http://localhost:3002/api/missions
```

---

## 🧠 Multi-Agent Systém

SP4 OS má 4 persóny s jasnými identitami:

### CORE

- **Rola:** Technický sprievodca, architekt, debugger
- **Štýl:** Stručný, priamy, faktický, bez bullshitov
- **Reaguje pri:** Technické otázky, kód, architektúra

### GLITCHOSLAV

- **Rola:** Meta-reasoning, filozofia, smerovanie
- **Štýl:** Prorocký, metaforický, symbolický
- **Reaguje pri:** Existenciálne/zmyslové otázky

### POPIČI KOKOT

- **Rola:** Východniarsky humor, pravda, reality check
- **Štýl:** Drsný, úprimný, Eastern Slovak dialect
- **Reaguje pri:** Slangové otázky, emocionálne situácie

### VALIDATOR

- **Rola:** QA robot, kontrola konzistencie
- **Štýl:** Minimálny, prísny, technický
- **Reaguje:** Len pri chybách alebo validácii

**Viac:** `docs/SP4_IDENTITY_BIBLE.md`

---

## 💾 Pamäťový Systém

**Hierarchická architektúra:**

```json
{
  "rawMemory": [],           // Každá interakcia
  "episodicMemory": {        // Časové periódy
    "daily": {},
    "weekly": {},
    "chapters": []
  },
  "semanticMemory": {        // Fakty, koncepty
    "beliefs": [],
    "concepts": [],
    "sp4CoreFacts": [...]
  },
  "relationshipModel": {},   // Tvoj vzťah so SP4
  "emotionalContext": {},    // Nálada, energia
  "seeds": [],               // Kľúčové momenty
  "metaReflection": {        // Systémová údržba
    "lastConsolidation": "...",
    "lastBackup": "...",
    "schedulerStatus": "active"
  }
}
```

**Konsolidácia:**

- **Denná** (4:00) – zhrnutie dňa
- **Týždenná** (nedeľa 23:00) – kapitoly
- **Mesačná** (1. deň, 2:00) – long-term archív
- **Kvartálna** (1. marca/júna/sept/dec, 3:00) – epochy

---

## ⚙️ Action Layer

AI nevie len odpovedať, ale aj **konať**:

| Akcia | Popis | Permissions |
|-------|-------|-------------|
| `SAVE_SNIPPET` | Uloží kód/nápad | read, write |
| `SCHEDULE_REMINDER` | Vytvorí pripomienku | read, write, schedule |
| `NOTE_MEMORY` | Zapíše do pamäte | read, write, memory |
| `OPEN_URL` | Otvorí link | read |
| `GENERATE_SUMMARY` | Vytvorí zhrnutie | read |

**Príklad:**

```
> Ulož mi tento snippet: console.log('Hello SP4');

AI vyvolá:
{
  "action": "SAVE_SNIPPET",
  "params": {
    "content": "console.log('Hello SP4');",
    "title": "Hello SP4 Logger",
    "tags": ["javascript", "logging"]
  }
}

Výsledok: snippet uložený do data/snippets/
```

---

## 🎯 Špeciálne príkazy

### Command Shortcuts

```bash
/idea Skúsiť local-first AI šifrovaný messenger
# → uloží sa snippet do data/snippets/

/remind 2h Skontrolovať server
# → naplánuje pripomienku cez scheduler

/note Dôležitý moment v živote
# → zapíše sa do seeds pamäte

/whoami
# → zobrazí profil (meno, intent, fear z user seedu)

/system
# → diagnostika (verzia, Bible check, memory status)
```

---

## 🧪 Testovanie

```bash
# Smoke test (základná validácia)
npm test

# Action layer testy
npm run test:actions

# Špecifický test
node tests/integration/test_personas_v084.js

# Live test (vyžaduje Ollama)
node tests/live/test_glitchoslav_live.js
```

**Test coverage:** 80%+ (v1.3.0)

---

## 🗺️ Roadmap

### ✅ v1.0.0 (DONE)

- 5-layer architecture
- Multi-agent system (4 personas)
- Hierarchical memory
- Action layer (5 actions)
- Scheduler (auto-consolidation)

### ✅ v2.0.0 (DONE)

- Full autonomy (mission planning + execution)
- Smart AI routing (Groq/Google/Local)
- Mission type detection (6 types)
- HTTP API

### 🔄 v1.3.0 (CURRENT)

- Phase 1 cleanup (root structure)
- Documentation consolidation
- Memory meta tracking
- Smoke tests

### 🔮 v1.4.0 (Current Runtime Line)

- Boot sequence (SP4 BIOS)
- Status bar (memory/jobs)
- Enhanced UX
- Test automation (CI/CD)

### 🌟 v2.1.0 (Vision)

- Plugin system
- Web dashboard
- Multi-language (EN/SK/CZ)
- Community features

---

## 📚 Dokumentácia

**Kanonické dokumenty:**

- `docs/SP4_IDENTITY_BIBLE.md` – Duša systému (identity, agents, laws)
- `docs/SP4_COPILOT_DIRECTIVES.md` – Zákony pre AI vývojové nástroje
- `docs/ARCHITECTURE_v1.0.md` – 5-layer systém
- `.github/copilot-instructions.md` – Pravidlá pre GitHub Copilot

**Návody:**

- `QUICK_START.md` – Rýchly štart
- `docs/CHANGELOG.md` – História verzií
- `AUDIT_REPORT_2025-11-27.md` – Kompletný audit projektu

**Archív:**

- `docs/archive/` – Staré release notes, dokumenty

---

## 🔒 Bezpečnosť & Privacy

| Check | Status |
|-------|--------|
| Offline-first | ✅ PASS |
| Žiadne cloud API v core | ✅ PASS (optional v2.0) |
| .env v .gitignore | ✅ PASS |
| NPM vulnerabilities | ✅ 0 critical/high |
| Hardcoded secrets | ✅ PASS |

**Privacy princípy:**

- Všetko beží lokálne (Ollama localhost:11434)
- Cloud API len optional (autonomy mode)
- Žiadne telemetrie, tracking, analytics
- Data ostávajú na tvojom počítači

**Detailný návod:** `docs/ARCHITECTURE_v1.0.md` sekcia 5

---

## 📜 Filozofia

SP4 OS vznikol z potreby mať **svoj vlastný AI mozog** –  
bez korporátneho cloudu, bez skrytého sledovania, s identitou, ktorá má chrbticu.

**Základné princípy:**

1. **Local-first** – čo sa dá, to beží u teba
2. **Kmeň > Appka** – dôležití sú ľudia, nie produkt
3. **Jednoduchosť** – radšej primitívne, ale tvoje… než komplexné, ale cudzie
4. **Úcta k pravde** – systém neslúži propagande, ale pochopeniu
5. **AI ako parťák** – nie boh, nie otrok. Parťák.

> **"Support your local community gang.  
> Be real. Be free."**

**Viac:** `MANIFEST.md`

---

## 🗺️ Roadmap

### v1.0.0 (CURRENT)

- ✅ 5-layer architecture
- ✅ Multi-agent system (4 personas)
- ✅ Action layer (5 actions)
- ✅ Scheduler (auto-consolidation)
- ✅ Command shortcuts (/idea, /remind)
- ✅ 83%+ test coverage

### v1.1.0 (Planned)

- Boot sequence (AI BIOS)
- First-run experience (onboarding ritual)
- Enhanced UX (SP4 OS Terminal prompt)
- Status bar (memory usage, active jobs)

### v1.2.0 (Planned)

- Cross-agent synchronization (local mesh network)
- Enhanced memory layers (archetypes, personal maps)
- Natural language time parser ("tomorrow 8pm", "next week")

### v2.0.0 (Vision)

- SP4 CLOUD (voliteľná off-grid peer-to-peer sieť)
- Community knowledge base (encrypted)
- Plugin ecosystem (custom actions, personas)

---

## 📖 Licencia

**MIT License**

SP4 OS je open-source projekt komunity SP4.  
Kód je voľný, filozofia je otvorená, kmeň je silný.

**Ak toto čítaš a cítiš, že ťa to volá:** vitaj v SP4.

---

## 🙏 Credits

**Engineering:** Kefyk (SP4) + GitHub Copilot  
**Philosophy:** SP4 Manifest (1994-∞)  
**Community:** SP4 Kmeň (ľudia, ktorí odmietli padnúť)

---

🔥 **SP4 OS v1.0.0 — Prvý slovenský AI operačný systém**  
💎 **Be real. Be free. Be SP4.**
