# 🔄 Memory System v1.0 - Migration Guide

## Integrácia s existujúcim `memory.js`

**Dobrá správa:** `memory.js` už má podporu pre metadata! Nemusíme robiť breaking changes.

### Čo je už hotové v `memory.js`:

✅ **rawMemory.log[]** - každý záznam má `metadata` objekt  
✅ **addLogEntry()** - prijíma metadata parameter  
✅ **episodicMemory** - daily/weekly/chapters  
✅ **semanticMemory** - beliefs/concepts/relationships  
✅ **relationshipModel** - 5-level progression system  

### Čo sme pridali (v1.0):

✅ **Enhanced metadata fields:**
```javascript
metadata: {
  importance: 0.0-1.0,           // NEW
  lastUsed: "ISO timestamp",     // NEW
  reasonKept: "high_importance", // NEW
  tags: [...],                   // EXISTING
  emotion: {...},                // EXISTING
  context: {...},                // EXISTING
  vectorEmbedding: null          // EXISTING
}
```

✅ **archivedMemory[]** - archived low-importance memories  
✅ **metaReflection.lastConsolidation** - consolidation timestamp  
✅ **metaReflection.pendingArchival[]** - flagged for review  
✅ **metaReflection.pendingPruning[]** - flagged for deletion  

---

## Migrácia existujúcich dát

### Option 1: Backfill Script (Doporučené)

```bash
node scripts/backfill_memory_v10.js
```

**Čo robí:**
- Načíta `data/memory.json`
- Pre každý záznam bez v1.0 metadát:
  - Vypočíta `importance` z existujúcich `tags` a `emotion`
  - Nastaví `lastUsed` = `timestamp` (created at)
  - Určí `reasonKept` podľa `importance` a `tags`
- Uloží aktualizovanú pamäť
- Nezničí existujúce dáta (backward compatible)

### Option 2: Automatická migrácia pri štarte

V `memory.js` `loadMemory()` už kontroluje a migruje staré formáty:

```javascript
// V0.3.1 migrácia: log → rawMemory
if (mem.log && !mem.rawMemory) {
  mem.rawMemory = { log: mem.log };
  delete mem.log;
}
```

Môžeme pridať podobnú logiku pre v1.0 metadata.

### Option 3: Fresh Start (Ak nemáš veľa dát)

Jednoducho spusti agenta - nové memories budú mať v1.0 metadata automaticky.

---

## Využitie v existujúcom kóde

### 1. `integration.js` - už integrované ✅

```javascript
// KROK 9.5: v1.0 TRIGGER ENGINE
const triggerResult = evaluateTriggers(triggerContext);
```

### 2. `consolidationEngine.js` - už integrované ✅

```javascript
// YML config reader
const config = loadConsolidationConfig();

// Pre-job backups
await backupBeforeJob('daily', state);

// Export functions
export async function runDaily(options = {}) { ... }
```

### 3. `index_v07.js` - už integrované ✅

```javascript
// /memory_audit command
if (trimmed === '/memory_audit') {
  const { shouldArchive, shouldPrune } = 
    await import('./memory/metadataHelpers.js');
  // ... display stats, archive, prune
}
```

### 4. `memoryLayers.js` - už integrované ✅

```javascript
// Filter by reasonKept in compression
const importantLogs = recentLogs.filter(l => 
  l.metadata?.reasonKept && 
  priorityReasons.includes(l.metadata.reasonKept)
);
```

---

## Scheduler Integration (Voliteľné)

**Ak chceš automatickú konsolidáciu:**

```javascript
// V index_v07.js alebo server.js
import { initMemoryScheduler } from './scheduler/memoryScheduler.js';

// Na štarte
const schedulerId = initMemoryScheduler({ logger: console.log });

// Pred exitom
shutdownScheduler(schedulerId, console.log);
```

**Alebo manuálne:**
```bash
node -e "import('./scheduler/memoryScheduler.js').then(m => m.runManualConsolidation('daily', console.log))"
```

---

## Príkazy pre užívateľa

### Nové príkazy (v1.0):

```
/memory_audit              - Zobraz memory statistics
/memory_audit archive      - Archivuj low-importance memories
/memory_audit prune        - Permanently delete old memories (requires confirmation)
/memory_audit export       - Export audit report to JSON
```

### Existujúce príkazy (stále fungujú):

```
/backup                    - Vytvor zálohu
/profile                   - Zobraz profil
/mirror [days]             - Čo si riešil posledných N dní
/seeds                     - Zobraz kľúčové momenty
/consolidate               - Manuálna konsolidácia (legacy)
```

---

## Testing

```bash
# Unit test nového systému
node test_memory_v10.js

# Full agent test
npm start

# Backfill test (dry-run)
node scripts/backfill_memory_v10.js
```

---

## Rollback (ak niečo nevyjde)

1. **Zálohy sú v `data/backups/`** - každá pre-job konsolidácia vytvorí backup
2. **Git revert** - ak si commitol
3. **Manual restore:**
   ```bash
   cp data/backups/memory-TIMESTAMP.json data/memory.json
   ```

---

## Summary

**✅ Bez breaking changes**  
**✅ Backward compatible**  
**✅ Postupná migrácia (backfill)**  
**✅ Nové features neprerušia existujúce**  

Môžeš pokračovať s existujúcim `memory.js` a nový systém sa zapne automaticky! 🔥
