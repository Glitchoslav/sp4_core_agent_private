# 🚀 Full Autonomy v2.0 - User Guide

## Čo je Full Autonomy v2.0?

Najvýkonnejší režim SP4 Core Agent, ktorý **automaticky rozpracuje komplexné ciele** do samostatných úloh a vykoná ich bez ďalšieho dozoru.

---

## ⚡ Quick Start

### Základné použitie:

```
/mission Vytvor mi Python web scraper pre tech články
```

Agent **automaticky**:
1. ✅ Zanalyzuje cieľ
2. ✅ Vytvorí plán (napr. 4 úlohy: Architecture → Implementation → Tests → Docs)
3. ✅ Vyberie najlepší brain pre každú úlohu (Groq/Google/Local)
4. ✅ Vykoná všetky úlohy sekvenčne
5. ✅ Vráti kompletný výsledok

---

## 📋 Podporované typy misií

| Typ | Detekcia | Príklad |
|-----|----------|---------|
| **CODE** | `python`, `javascript`, `web scraper` | `/mission Vytvor REST API v Node.js` |
| **CAMPAIGN** | `ig post`, `landing page`, `copywriting` | `/mission Potrebujem 3 IG posty o AI` |
| **WEB** | `web app`, `dashboard`, `frontend` | `/mission Vytvor admin dashboard` |
| **ANALYSIS** | `analýza`, `report`, `research` | `/mission Analýza trhu s AI nástrojmi` |
| **PRODUCT** | `MVP`, `produkt`, `startup idea` | `/mission Vytvor MVP pre AI chatbot` |
| **CUSTOM** | *(všetko ostatné)* | `/mission Akýkoľvek custom cieľ` |

---

## 🧠 Brain Routing Strategy

Agent **inteligentne volí AI brain** pre každú úlohu:

### 1. **Groq (llama-3.3-70b)** - Complex Tasks
- **Kedy:** Architektúra, komplexný kód, strategické rozhodovanie
- **Cena:** $0.05 - $0.25 per task
- **Rýchlosť:** ~2 sekundy

### 2. **Google (gemini-2.5-flash)** - Medium Tasks
- **Kedy:** Frontend kód, testovanie, vizuálne koncepty
- **Cena:** **FREE**
- **Rýchlosť:** ~8 sekúnd

### 3. **Local (llama3:8b)** - Simple Tasks
- **Kedy:** Dokumentácia, README, jednoduché texty
- **Cena:** **FREE**
- **Rýchlosť:** ~1 sekunda

---

## 💰 Cost & Time Estimates

| Mission Type | Tasks | Est. Cost | Est. Time |
|--------------|-------|-----------|-----------|
| **CODE** | 4 | $0.50 | 50 min |
| **CAMPAIGN** | 3 | $0.20 | 25 min |
| **WEB** | 5 | $0.45 | 45 min |
| **ANALYSIS** | 3 | $0.15 | 20 min |
| **PRODUCT** | 6 | $0.70 | 60 min |

**Skutočná cena je zvyčajne 30-40% NIŽŠIA** vďaka optimalizácii brainu!

---

## 📊 Quality Assurance

Každá úloha je hodnotená (0-100%):
- ✅ **≥70%:** Task approved
- ⚠️ **<70%:** Auto-retry (max 2 retries)
- 📊 **Metriky:** Dĺžka odpovede, code blocks, opakovanie

---

## 📂 Mission Storage

```
missions/
├── active/          ← Aktuálne bežiace misie
├── completed/       ← Úspešne dokončené (JSON s full results)
└── failed/          ← Neúspešné (s error logs)
```

### Príklad completed mission:

```json
{
  "mission": {
    "id": "m_20251125_262877",
    "goal": "Vytvor mi Python funkciu na sčítanie dvoch čísel",
    "type": "CODE",
    "timestamp": "2025-11-25T00:41:07.701Z"
  },
  "plan": {
    "tasks": [...],
    "totalCost": "$0.50",
    "totalTime": "50 min"
  },
  "execution": {
    "results": [...],
    "totalCost": "$0.330",
    "totalTime": "0.2 min",
    "completedAt": "2025-11-25T00:41:23.456Z"
  }
}
```

---

## 🎯 Príklady použitia

### 1. **Web Development:**
```
/mission Vytvor React komponent pre user profile card
```
→ Architecture (Groq) → Implementation (Groq) → Tests (Google) → Docs (Local)

### 2. **Marketing Campaign:**
```
/mission Potrebujem landing page copy pre AI produkt
```
→ Audience research (Groq) → Copywriting (Groq) → Visual briefs (Google)

### 3. **Data Analysis:**
```
/mission Analyzuj CSV súbor s predajmi a vytvor report
```
→ Data loading (Groq) → Analysis (Groq) → Visualization (Google) → Report (Local)

---

## ⚙️ Advanced Features

### 📦 Task Dependencies

Tasks sa vykonávajú **sekvenčne** s dependency checking:

```json
{
  "id": "t2",
  "description": "Core implementation",
  "depends_on": ["t1"]  ← Počká na Task 1
}
```

### 🔄 Auto-Retry Logic

Pri zlej kvalite (<70%):
1. ⚠️ Detect low quality
2. 🔄 Retry same task (max 2x)
3. ⚠️ If still failing → Accept and continue

### 💡 Cost Optimization

Agent automaticky:
- Používa **Google (FREE)** pre medium tasks
- Používa **Local (FREE)** pre simple tasks
- Šetrí **Groq credits** len pre complex tasks

---

## 🚨 Error Handling

Ak misia zlyhá:

```
🚨 Mission failed: [error message]

Skús to znovu alebo rozbi úlohu na menšie časti.
```

**Riešenia:**
1. Zjednoduchte cieľ: `/mission Len Python funkcia na sčítanie`
2. Rozbiť na kroky: `/mission Najprv vytvor architektúru`
3. Skontrolujte logs: `missions/failed/m_*.json`

---

## 📈 Performance

**Skutočné výsledky z testov:**

| Test | Tasks | Est. Time | Actual Time | Speedup |
|------|-------|-----------|-------------|---------|
| Python function | 4 | 50 min | 0.2 min | **250x** |
| IG campaign | 3 | 25 min | 0.2 min | **125x** |

**Priemerná úspora času: 98%** 🔥

---

## 🔮 Roadmap

### v2.1 (Next):
- [ ] User approval confirmation (y/n prompt)
- [ ] Communication modes (silent/verbose/interactive)
- [ ] Budget warnings ($1/day limit alerts)
- [ ] Mission history viewer (`/missions` command)

### v2.2 (Future):
- [ ] Progress reporter UI (real-time task status)
- [ ] Learning system (remember best brain per task type)
- [ ] Multi-mission parallel execution
- [ ] Custom mission templates

---

## 💬 Feedback & Support

**Funguje perfektne?** → Skús komplexnejšie misie!  
**Máš problém?** → Kontaktuj @SP4KULT na IG

---

🔥 **Full Autonomy v2.0** - From goal to execution in seconds.
