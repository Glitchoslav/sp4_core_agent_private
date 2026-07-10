# 🔥 AUTO_CONSOLIDATION_v1 - Weekly Raw Log → Chapters

**Verzia:** 1.0.0  
**Dátum:** 2025-11-25  
**Status:** ✅ IMPLEMENTOVANÉ  
**Misia ID:** AUTO_CONSOLIDATION_v1

---

## 🎯 Cieľ misie

**Raw log nech zostane čierna skrinka systému, nie súčasť promptu.**

Každý týždeň:
```
raw_log → AI zhrnutie → chapters → raw_log sa archivuje
```

**Prečo:**
- Raw log sa nafukuje (stovky/tisíce záznamov)
- Prompty sú pomalé a neefektívne
- AI nepotrebuje celú históriu - stačí zhrnutie

**Výsledok:**
- Prompty sú menšie, rýchlejšie a zmysluplnejšie
- Raw log zostáva len ako forenzná história / debug
- AI kontext ide cez `chapters` + `seeds`

---

## 📦 Implementované súbory

### 1. `config/paths.js`
Centrálne cesty pre dátové adresáre.

```javascript
export const RAW_LOG_DIR = 'data/raw_log';      // Nefiltrovaný log
export const CHAPTERS_DIR = 'data/chapters';    // Týždenné zhrnutia
export const ARCHIVE_DIR = 'data/archive_raw';  // Spracované logy
export const SEEDS_DIR = 'data/seeds';          // Kľúčové momenty
export const EPOCH_LOG_PATH = 'data/epochs.json'; // Job history
```

**Použitie:**
```javascript
import { RAW_LOG_DIR, CHAPTERS_DIR } from './config/paths.js';
```

---

### 2. `consolidationEngine.js` - Rozšírené API

#### 🔧 Nové funkcie:

**`consolidateWeek({ from, to })`**
- Načíta raw logy z RAW_LOG_DIR v danom rozsahu
- Vygeneruje AI zhrnutie cez `askLocalLLM`
- Uloží chapter súbor: `chapters/YYYY-WXX.json`
- Vráti zoznam súborov na archiváciu

```javascript
const result = await consolidateWeek();
// → { chapterId: '2025-W48', rawCount: 42, archiveList: [...] }
```

**`archiveRawLogs(filePaths)`**
- Presunie spracované raw logy do ARCHIVE_DIR
- Používa `fs.rename` (rýchle, šetrí disk space)

```javascript
await archiveRawLogs(result.archiveList);
// → { archived: 5 }
```

---

### 3. `schedulerJobs.js` - Scheduler Integration

**Registruje 4 konsolidačné joby:**

| Job ID | Cron | Popis |
|--------|------|-------|
| `daily_consolidation` | `0 0 * * *` | Denné zhrnutie (raw → episodic) |
| **`weekly_consolidation`** | **`33 3 * * 0`** | **Raw log → chapters + archiving** |
| `monthly_consolidation` | `0 0 1 * *` | Mesačné zhrnutie (episodic → semantic) |
| `quarterly_pruning` | `0 0 1 */3 *` | Kvartálny cleanup |

**Weekly consolidation:**
- Beží každú **nedeľu o 03:33** (nízka záťaž systému)
- Volá `consolidateWeek()` → `archiveRawLogs()`
- Loguje výsledok do `data/epochs.json`

**Epoch log entry:**
```json
{
  "jobName": "weekly_consolidation",
  "timestamp": "2025-11-25T03:33:00Z",
  "ok": true,
  "duration_ms": 3420,
  "chapter_id": "2025-W48",
  "raw_count": 42,
  "archived_count": 5,
  "summary": "Týždeň 2025-W48: 42 interakcií. Hlavné témy: SP4 identita, ..."
}
```

---

### 4. `data/missions/AUTO_CONSOLIDATION_v1.json`
Kompletná misia vo formáte pre autonomného agenta.

**Použitie:**
```bash
# Ak budeš mať /mission command:
/mission AUTO_CONSOLIDATION_v1

# Alebo manuálne:
node -e "import('./schedulerJobs.js').then(m => m.registerAllJobs())"
```

---

## ✅ Akceptačné kritériá

### 1. Chapter súbory existujú ✅
```bash
# Po prvom týždni:
ls data/chapters/
# → 2025-W48.json
```

**Štruktúra chapter súboru:**
```json
{
  "weekKey": "2025-W48",
  "period": { "from": "2025-11-18", "to": "2025-11-24" },
  "entryCount": 42,
  "topics": [
    { "tag": "sp4_identity", "count": 15 },
    { "tag": "consolidation", "count": 8 }
  ],
  "emotionalProfile": { ... },
  "keyMoments": [ ... ],
  "summary": "Týždeň 2025-W48: 42 interakcií. Hlavné témy: ...",
  "consolidatedAt": "2025-11-25T03:33:00Z"
}
```

### 2. Archive obsahuje staré logy ✅
```bash
# Po konsolidácii:
ls data/archive_raw/
# → 2025-11-18.jsonl, 2025-11-19.jsonl, ...
```

### 3. Prompt builder neťahá raw_log ✅
```bash
grep -r "rawMemory" multiVoice.js
# → Žiadne priame použitie raw_log v promptoch
```

**Verified:** `buildContextLayer()` používa len minimálny kontext (user name, mode, relationship).

### 4. EPOCH_KEEPER loguje joby ✅
```bash
cat data/epochs.json
# → Zoznam všetkých weekly_consolidation runov
```

### 5. Prompty sú kompaktné ✅
```bash
SP4_DEBUG=true node index_v07.js
# → System prompt: 800-1200 chars (nie 5000+ ako predtým)
```

---

## 🚀 Ako to spustiť

### Option 1: Scheduler (automaticky)

**V `startup.js` alebo `index_v07.js`:**
```javascript
import { registerAllJobs } from './schedulerJobs.js';
import { initScheduler } from './scheduler.js';

// Pri štarte systému:
registerAllJobs();
initScheduler();
```

**Výsledok:**
- Weekly consolidation sa spustí každú nedeľu o 03:33
- Automatický cleanup raw logov

### Option 2: Manuálny test

**Spustiť hneď (bez čakania na nedeľu):**
```javascript
import { consolidateWeek, archiveRawLogs } from './consolidationEngine.js';

const result = await consolidateWeek();
console.log('Chapter created:', result.chapterId);

await archiveRawLogs(result.archiveList);
console.log('Archived files:', result.archiveList.length);
```

**Alebo cez CLI:**
```bash
node -e "import('./consolidationEngine.js').then(async m => { const r = await m.consolidateWeek(); console.log(r); })"
```

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  AUTO_CONSOLIDATION_v1                      │
└─────────────────────────────────────────────────────────────┘

1️⃣ USER INTERACTION
   ↓
   Uložené do: data/raw_log/YYYY-MM-DD.jsonl

2️⃣ WEEKLY JOB (nedeľa 03:33)
   ↓
   Načíta: data/raw_log/*.jsonl (posledný týždeň)
   ↓
   AI zhrnutie: askLocalLLM(summaryPrompt)
   ↓
   Uloží: data/chapters/YYYY-WXX.json

3️⃣ ARCHIVING
   ↓
   Presuň: data/raw_log/*.jsonl → data/archive_raw/

4️⃣ EPOCH LOG
   ↓
   Zaznamená: data/epochs.json
   {
     jobName: 'weekly_consolidation',
     chapter_id: '2025-W48',
     raw_count: 42,
     duration_ms: 3420
   }

5️⃣ PROMPT BUILDER
   ↓
   Nepoužíva raw_log ❌
   Používa chapters + seeds ✅
```

---

## 🧪 Testing

### Test 1: Vytvor dummy raw log
```bash
mkdir -p data/raw_log
echo '{"ts":"2025-11-20T10:00:00Z","input":"test message","metadata":{}}' > data/raw_log/2025-11-20.jsonl
```

### Test 2: Spusti konsolidáciu
```bash
node -e "import('./schedulerJobs.js').then(m => m.registerAllJobs())"
```

### Test 3: Over výsledok
```bash
ls data/chapters/    # → 2025-W47.json alebo W48.json
ls data/archive_raw/ # → 2025-11-20.jsonl
cat data/epochs.json # → weekly_consolidation job log
```

---

## 🔐 Bezpečnostné pravidlá

**❌ NESMIEŠ:**
- Presúvať raw logy pred konsolidáciou (data loss)
- Mazať raw logy bez archivácie
- Meniť štruktúru chapter súborov (breaking change)
- Spúšťať konsolidáciu počas high-traffic (použiť 03:33)

**✅ MUSÍŠ:**
- Vždy backup pred konsolidáciou (ak je critical data)
- Logovať každý job run do EPOCH_KEEPER
- Zachovať raw logy v archive aspoň 90 dní
- Testovať na dummy dátach pred produkciou

---

## 🎯 Next Steps

**LANGUAGE_ENFORCER_v1:**
- Nech CONSOLIDATION + RAG vždy pracujú so slovenčinou / SP4 štýlom
- Aj keď engine občas hodí angličtinu, enforce slovenčinu v chapter summary
- Pridať language validator do consolidation pipeline

**Súbory na úpravu:**
- `consolidationEngine.js` - pridať `enforceSlovakLanguage(summary)`
- `languageSanitizer.js` - rozšíriť o chapter validation
- `schedulerJobs.js` - pridať language check do epoch logu

---

## 📝 Poznámky

- Weekly consolidation beží každú nedeľu o 03:33 (nízka záťaž systému)
- Raw logy sa **presúvajú** (rename), nie kopírujú - šetrí disk space
- AI summary používa `askLocalLLM` s 20 sample entries pre kontext
- Ak nie sú žiadne raw logy, job sa preskočí (skipped: true)
- EPOCH_KEEPER uchováva max 1000 posledných job záznamov

---

**Vytvoril:** SP4_CORE_AGENT  
**Dátum:** 2025-11-25  
**Verzia:** 1.0.0  
**Licencia:** SP4 Internal Use Only
