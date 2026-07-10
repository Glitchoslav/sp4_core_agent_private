# 🚀 AUTO_CONSOLIDATION_v1 - Integration Guide

**Quick Start:** Ako integrovať weekly consolidation do SP4 systému.

---

## 🔧 1. Integrácia do startup sekvencie

**Súbor:** `index_v07.js` alebo `startup.js`

### Pridaj import:
```javascript
import { registerAllJobs } from './schedulerJobs.js';
import { initScheduler, displayStatus } from './scheduler.js';
```

### Zavolaj pred hlavným loopom:
```javascript
// Po načítaní memory, pred CLI loop
console.log('\n🔄 Initializing scheduler...');
registerAllJobs();     // Registruje 4 consolidation jobs
initScheduler();       // Spustí cron jobs
displayStatus();       // Zobrazí status
```

**Kompletný príklad:**
```javascript
// index_v07.js
import { registerAllJobs } from './schedulerJobs.js';
import { initScheduler, displayStatus } from './scheduler.js';

async function main() {
  console.log('🔥 SP4_CORE_AGENT starting...');
  
  // Load memory
  const memory = await loadMemory();
  
  // 🔥 AUTO_CONSOLIDATION_v1: Register scheduler jobs
  registerAllJobs();
  initScheduler();
  displayStatus();
  
  // Start CLI loop
  await startCLI();
}

main();
```

---

## 🧪 2. Manuálny test (bez čakania na nedeľu)

### Test weekly consolidation hneď:
```bash
node -e "import('./consolidationEngine.js').then(async m => {
  const result = await m.consolidateWeek();
  console.log('✅ Chapter:', result.chapterId);
  console.log('📊 Entries:', result.rawCount);
  
  const archive = await m.archiveRawLogs(result.archiveList || []);
  console.log('📦 Archived:', archive.archived);
})"
```

### Vytvor dummy raw log pre testing:
```bash
# PowerShell:
mkdir -Force data/raw_log
@'
{"ts":"2025-11-20T10:00:00Z","input":"test message 1","metadata":{"tags":["test"]}}
{"ts":"2025-11-20T11:00:00Z","input":"test message 2","metadata":{"tags":["test","sp4"]}}
'@ | Out-File -Encoding utf8 data/raw_log/2025-11-20.jsonl

# Teraz spusti consolidation:
node test_consolidation.js
```

**`test_consolidation.js`:**
```javascript
import { consolidateWeek, archiveRawLogs } from './consolidationEngine.js';

async function test() {
  console.log('🧪 Testing AUTO_CONSOLIDATION_v1...\n');
  
  const result = await consolidateWeek();
  console.log('Result:', JSON.stringify(result, null, 2));
  
  if (!result.skipped) {
    const archive = await archiveRawLogs(result.archiveList);
    console.log('Archive:', archive);
  }
}

test().catch(console.error);
```

---

## 📂 3. Adresárová štruktúra

Po prvom spustení sa vytvoria tieto adresáre:

```
data/
├── raw_log/            ← Aktívne raw logy (YYYY-MM-DD.jsonl)
├── chapters/           ← Týždenné zhrnutia (YYYY-WXX.json)
├── archive_raw/        ← Spracované raw logy (archív)
├── seeds/              ← Kľúčové momenty (budúcnosť)
└── epochs.json         ← Job history log
```

**Automaticky sa vytvoria pri prvom použití.**

---

## ⏰ 4. Scheduler Status

### Zobraz aktuálny status:
```javascript
import { getSchedulerStatus, displayStatus } from './scheduler.js';

// V kóde:
const status = getSchedulerStatus();
console.log(status);

// V CLI:
displayStatus();
```

**Output:**
```
⏰ ═══════════════════════════════════════════════════════════════
⏰ SCHEDULER STATUS
⏰ ═══════════════════════════════════════════════════════════════

   ✅ Job: weekly_consolidation
      Schedule: 33 3 * * 0
      Description: Weekly raw log → chapters + archiving (AUTO_CONSOLIDATION_v1)
      Last run: Never

   ✅ Job: daily_consolidation
      Schedule: 0 0 * * *
      Description: Daily memory consolidation (raw → episodic)
      Last run: Never

⏰ ═══════════════════════════════════════════════════════════════
```

---

## 📊 5. EPOCH_KEEPER monitoring

### Prečítaj job history:
```javascript
import fs from 'fs/promises';

const epochs = JSON.parse(await fs.readFile('data/epochs.json', 'utf-8'));
const weeklyJobs = epochs.jobs.filter(j => j.jobName === 'weekly_consolidation');

console.log('Weekly consolidation history:');
weeklyJobs.forEach(job => {
  console.log(`- ${job.timestamp}: ${job.chapter_id} (${job.raw_count} entries, ${job.duration_ms}ms)`);
});
```

**Sample output:**
```
Weekly consolidation history:
- 2025-11-24T03:33:00Z: 2025-W47 (42 entries, 3420ms)
- 2025-12-01T03:33:00Z: 2025-W48 (38 entries, 2890ms)
```

---

## 🔍 6. Debugging

### Enable DEBUG mode:
```bash
SP4_DEBUG=true node index_v07.js
```

**Vypíše:**
- Scheduler initialization
- Job registration details
- Consolidation progress
- Archive operations

### Check logs:
```bash
# Scheduler log:
cat logs/scheduler.log

# EPOCH_KEEPER:
cat data/epochs.json | jq '.jobs[-5:]'  # Last 5 jobs
```

---

## ⚠️ 7. Troubleshooting

### Problem: "No raw logs found"
**Riešenie:**
- Over existenciu `data/raw_log/` adresára
- Over formát súborov: `YYYY-MM-DD.jsonl` alebo `.json`
- Vytvor dummy log pre testing (viď Test section)

### Problem: "Archive failed"
**Riešenie:**
- Over permissions na `data/archive_raw/`
- Over že `fs.rename` má prístup k obom adresárom
- Skús manuálne: `mkdir -p data/archive_raw`

### Problem: "AI summary failed"
**Riešenie:**
- Over že Ollama beží: `ollama list`
- Over model: `ollama run qwen2.5:14b` (alebo gemma3:1b)
- Fallback summary sa použije automaticky

### Problem: "Job never runs"
**Riešenie:**
- Over scheduler init: `getSchedulerStatus()`
- Over cron syntax: `33 3 * * 0` = nedeľa 03:33
- Spusti manuálne pre test (viď Test section)

---

## 🎯 8. Production Checklist

Pred nasadením do production:

- [ ] ✅ `registerAllJobs()` + `initScheduler()` v startup
- [ ] ✅ `data/raw_log/` adresár existuje
- [ ] ✅ Dummy test úspešne prebehol
- [ ] ✅ EPOCH_KEEPER loguje joby
- [ ] ✅ Scheduler status zobrazuje 4 registered jobs
- [ ] ✅ Ollama beží a je dostupná
- [ ] ✅ Backup stratégia pre `data/archive_raw/` (90 days retention)
- [ ] ✅ Monitoring `data/epochs.json` veľkosti (max 1000 records)

---

## 📚 Súvisiace súbory

- **Dokumentácia:** `docs/AUTO_CONSOLIDATION_v1.md`
- **Misia:** `data/missions/AUTO_CONSOLIDATION_v1.json`
- **Config:** `config/paths.js`
- **Engine:** `consolidationEngine.js`
- **Jobs:** `schedulerJobs.js`
- **Scheduler:** `scheduler.js`

---

**Hotovo! AUTO_CONSOLIDATION_v1 je ready to deploy. 🚀**
