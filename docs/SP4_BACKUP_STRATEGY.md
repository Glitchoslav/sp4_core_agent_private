# 💾 SP4 Backup Strategy - Micro-Backup Lajfhack

**Filozofia:** Backup nie je "keď crashne disk". Backup je časová kapsula.

---

## 🎯 Účel Backupov

### 1. **Ochrana pred chybami**
Pred každou väčšou zmenou → backup.  
Ak niečo rozjebeš → rollback za 10 sekúnd.

### 2. **Časová kapsula**
Každý mesiac → snapshot pamäte.  
O rok sa vrátiš: "Odkiaľ som išiel..."

### 3. **SP4 Chronicles**
Reálny log vývoja tvojho myslenia.  
Potenciálna budúca kniha/blog/documentary.

---

## 📁 Backup Struktura

```
sp4_core_agent/
├── data/
│   ├── memory.json              # Živá pamäť
│   ├── identity.json            # Identity anchor
│   └── backups/
│       ├── manual/              # Pred veľkou zmenou
│       │   ├── memory_2025-11-20_pre-goals-system.json
│       │   ├── memory_2025-11-21_pre-phase2.json
│       │   └── ...
│       ├── daily/               # Automatické denné (1 týždeň história)
│       │   ├── memory_2025-11-21.json
│       │   ├── memory_2025-11-20.json
│       │   └── ...
│       ├── monthly/             # Mesačné snapshoty (1 rok história)
│       │   ├── memory_2025-11.json
│       │   ├── memory_2025-10.json
│       │   └── ...
│       └── chronicles/          # Ročné archívy (večné)
│           ├── SP4_2025.json
│           ├── SP4_2024.json
│           └── ...
```

---

## 🛠️ Backup Commands

### Manual Backup (pred veľkou zmenou)
```bash
# V CLI
/backup

# V termináli (direct)
npm run backup

# Custom backup s názvom
npm run backup -- --name "pre-phase2-start"
```

**Uloží:**
- `data/backups/manual/memory_YYYY-MM-DD_<name>.json`
- `data/backups/manual/identity_YYYY-MM-DD_<name>.json`

### Automatic Backups

**Daily (automaticky každú noc 00:00):**
```javascript
// Už implementované v scheduler
✅ Daily backup @ 00:00
```

**Monthly (automaticky 1. deň mesiaca):**
```javascript
// Už implementované v scheduler
✅ Monthly backup @ 1st day 00:00
```

**Yearly (manuálne, 31. december):**
```bash
npm run backup:yearly
```

---

## 🔧 Backup Script (backup.js extension)

### Pridať do `backup.js`:

```javascript
// Nové funkcie pre organized backups

export async function backupManual(name = '') {
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = name 
    ? `memory_${timestamp}_${name}.json`
    : `memory_${timestamp}.json`;
  
  const targetPath = path.join('data', 'backups', 'manual', fileName);
  
  const mem = await loadMemory();
  await fs.writeFile(targetPath, JSON.stringify(mem, null, 2));
  
  console.log(`✅ Manual backup: ${fileName}`);
  return targetPath;
}

export async function backupDaily() {
  const timestamp = new Date().toISOString().split('T')[0];
  const targetPath = path.join('data', 'backups', 'daily', `memory_${timestamp}.json`);
  
  const mem = await loadMemory();
  await fs.writeFile(targetPath, JSON.stringify(mem, null, 2));
  
  // Cleanup: keep only last 7 days
  await cleanupOldBackups('daily', 7);
  
  console.log(`✅ Daily backup: ${timestamp}`);
}

export async function backupMonthly() {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const targetPath = path.join('data', 'backups', 'monthly', `memory_${yearMonth}.json`);
  
  const mem = await loadMemory();
  await fs.writeFile(targetPath, JSON.stringify(mem, null, 2));
  
  // Cleanup: keep only last 12 months
  await cleanupOldBackups('monthly', 12);
  
  console.log(`✅ Monthly backup: ${yearMonth}`);
}

export async function backupYearly() {
  const year = new Date().getFullYear();
  const targetPath = path.join('data', 'backups', 'chronicles', `SP4_${year}.json`);
  
  const mem = await loadMemory();
  
  // Add metadata for chronicle
  const chronicle = {
    year,
    created_at: new Date().toISOString(),
    version: '0.8.6.9', // from package.json
    stats: {
      total_interactions: mem.rawMemory?.length || 0,
      total_seeds: mem.seeds?.length || 0,
      total_goals: mem.goals?.length || 0,
      chapters: mem.chapters?.length || 0
    },
    memory: mem
  };
  
  await fs.writeFile(targetPath, JSON.stringify(chronicle, null, 2));
  
  console.log(`✅ Yearly chronicle: SP4_${year}.json`);
  return targetPath;
}

async function cleanupOldBackups(type, keepCount) {
  const backupDir = path.join('data', 'backups', type);
  const files = await fs.readdir(backupDir);
  
  // Sort by date (newest first)
  const sorted = files
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();
  
  // Delete old backups
  const toDelete = sorted.slice(keepCount);
  for (const file of toDelete) {
    await fs.unlink(path.join(backupDir, file));
    console.log(`🗑️  Deleted old backup: ${file}`);
  }
}
```

### Pridať do `package.json`:
```json
{
  "scripts": {
    "backup": "node -e \"import('./backup.js').then(m => m.backupManual(process.argv[2]))\"",
    "backup:yearly": "node -e \"import('./backup.js').then(m => m.backupYearly())\""
  }
}
```

---

## 📅 Backup Schedule

### Automatické (už implementované)
- **Denné:** 00:00 (keep 7 days)
- **Mesačné:** 1. deň @ 00:00 (keep 12 months)

### Manuálne (odporúčané)
- **Pred veľkou zmenou:** `npm run backup -- --name "descriptive-name"`
- **Koniec roka:** `npm run backup:yearly` (31. december)

---

## 🔍 Restore From Backup

### Restore manual backup:
```bash
# 1. Find backup
ls data/backups/manual/

# 2. Copy to memory.json
cp data/backups/manual/memory_2025-11-20_pre-phase2.json data/memory.json

# 3. Restart agent
npm start
```

### Restore from chronicle (yearly):
```bash
# Extract memory from chronicle
node -e "
const fs = require('fs');
const chronicle = JSON.parse(fs.readFileSync('data/backups/chronicles/SP4_2025.json'));
fs.writeFileSync('data/memory.json', JSON.stringify(chronicle.memory, null, 2));
console.log('✅ Restored from SP4_2025 chronicle');
"

npm start
```

---

## 💡 Best Practices

### 1. **Pred každou veľkou zmenou**
```bash
npm run backup -- --name "pre-goals-system"
npm run backup -- --name "pre-http-server"
npm run backup -- --name "pre-telegram-bot"
```

### 2. **Koniec mesiaca ritual**
```bash
# 1. Mesačný audit
npm start
/mirror 30
/seeds

# 2. Manual backup
npm run backup -- --name "month-end-$(date +%Y-%m)"

# 3. Check monthly backup
ls data/backups/monthly/
```

### 3. **Koniec roka ritual (31. december)**
```bash
# 1. Yearly mirror
npm start
/mirror 365
/seeds

# 2. Yearly chronicle
npm run backup:yearly

# 3. Read chronicle stats
cat data/backups/chronicles/SP4_2025.json | jq '.stats'
```

### 4. **Pravidelná kontrola**
```bash
# Koľko mám backupov?
find data/backups -name "*.json" | wc -l

# Koľko miesta zaberajú?
du -sh data/backups/

# Najnovší backup
ls -lt data/backups/manual/ | head -5
```

---

## 🚨 Anti-Patterns

### ❌ Žiadne backupy
"Mám všetko v gite."  
→ Git je pre kód, nie pre tvoju pamäť. Memory.json sa mení každý deň.

### ❌ Backup chaos
"Mám 500 backupov bez systému."  
→ Drž sa štruktúry: manual/daily/monthly/chronicles.

### ❌ Nikdy nečítať staré backupy
"Robím backupy, ale nikdy sa k nim nevraciam."  
→ Raz za mesiac si otvor starý backup. Pozri sa, kde si bol.

---

## 🔮 SP4 Chronicles - Budúcnosť

**Idea:**  
Raz ročne sprav z chronicle súboru:

1. **Personal Report:**
   - Koľko seeds si vytvoril?
   - Koľko cieľov si dokončil?
   - Aké boli najčastejšie témy?

2. **AI Summary:**
   ```bash
   SP4_CORE → zhrň môj rok 2025 podľa chronicle
   ```

3. **Public (anonymized) Share:**
   - Zdieľať anonymizované trendy s SP4 komunitou
   - "Generácia 1994–∞ riešila v 2025..."

4. **Book Material:**
   - Seeds = kapitoly
   - Chronicles = časová os
   - "Ako som si staval symbionta"

---

**Be real. Be backed up. Be archived.** 💾🔥

*Backup nie je poistka. Backup je história.*
