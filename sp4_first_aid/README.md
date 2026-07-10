# 🚨 SP4 FIRST AID - Strict Procedural Gate (SPG)

**Version:** 0.1.1  
**Status:** ✅ Production Ready  
**Mode:** Offline, Deterministic, Zero-LLM

---

## 🎯 Účel

**SP4 First Aid** je deterministický emergency gate pre SP4 Core Agent.  
Detekuje **núdzové prvá pomoc situácie** (KPR, zástava dychu) a vracia **statické šablóny** OKAMŽITE - **bez LLM callou, bez orchestrácie**.

### Prečo?

- **Rýchlosť:** <2ms response time (no LLM overhead)
- **Spoľahlivosť:** Deterministický output (same input = same output)
- **Offline:** Žiadne sieťové volania
- **Bezpečnosť:** Emergency template garantované (no AI halucinationy)
- **Audit:** Life-critical events logged to `data/logs/emergency_audit.log` (v0.1.1)
- **Diacritics-Agnostic:** `nedýcha` = `nedycha`, `leží` = `lezi` (v0.1.1)

---

## 📁 Štruktúra

```
sp4_first_aid/
├── spg.js                          # SPG core logic
├── logic_manifest.json             # Emergency state definitions
├── templates/
│   ├── cpr_adult.txt               # KPR template (full)
│   └── cpr_adult_short.txt         # KPR template (compressed)
├── README.md                       # Module documentation
├── IMPLEMENTATION_SUMMARY.md       # Implementation details
├── QUICK_START.md                  # Quick start guide
├── v0.1.1_COMPLETION_REPORT.md     # v0.1.1 release report
└── v0.1.1_POLISH_SUMMARY.md        # v0.1.1 polish summary
```

---

## 🔧 Ako to funguje

### 1. Detection (Keyword Matching)

SPG skontroluje user input proti keyword listom:

**Detect Keywords (trigger SPG):**
- bezvedom, nereaguje, nedýcha, zástava, kolaboval, leží
- lapá po dychu, nehýbe sa, nepulzuje, bez pulzu
- zrážka, mdloba, kolaps

**Forbidden Keywords (interdiction):**
- čakať, počkať, naliať vodu, fackať, sadnúť
- transportovať, odviezť, preniesť, dať jesť, dať piť

### 2. Template Loading

Ak match → load static template:
- `templates/cpr_adult.txt` - KPR návod pre dospelých

### 3. Immediate Return

Return template **bez LLM callu** → user dostane okamžitú odpoveď.

---

## 🚀 Použitie

### CLI

```bash
cd sp4_core_agent
npm start

> Človek leží, nereaguje a nedýcha

[SPG] 🚨 EMERGENCY DETECTED: FA_001 (detect_keyword)
🚨 === SP4 FIRST AID SPG ACTIVATED === 🚨

KPR DOSPELÝ – OKAMŽITE

1) SKONTROLUJ bezpečnosť okolia.
2) ZISTI vedomie – zatras, zakrič.
3) NEDÝCHA alebo lapá po dychu?
4) VOLAJ 112 (alebo daj niekomu volať).
...
```

### HTTP API

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Človek nedýcha"}'
```

**Response:**
```json
{
  "success": true,
  "response": "KPR DOSPELÝ – OKAMŽITE...",
  "meta": {
    "handledBy": "sp4_first_aid_spg",
    "emergency": true,
    "bypassLLM": true
  }
}
```

### System Diagnostics

```bash
> /system

🚨 FIRST AID SPG:
   Status: ENABLED ✅
   Version: 0.1
   States: 1 (cpr_adult)
   Keywords: 13
```

---

## 🧪 Testing

### Unit Tests

```bash
cd sp4_core_agent
node tests/test_first_aid_spg.js
```

**Expected:**
```
✅ ALL TESTS PASSED - SP4 FIRST AID SPG READY FOR PRODUCTION
```

### CLI Integration Test

```bash
node test_first_aid_cli.js
```

---

## 🛠️ Rozšírenie (Adding New Emergency State)

### 1. Vytvor template

```bash
echo "HEIMLICH MANEUVER..." > sp4_first_aid/templates/choking_adult.txt
```

### 2. Pridaj state do manifestu

Edit `logic_manifest.json`:

```json
{
  "states": {
    "cpr_adult": { ... },
    "choking_adult": {
      "id": "FA_002",
      "detect_keywords": ["dusí sa", "zadusenie", "nemôže dýchať", "zalkol sa"],
      "forbidden": ["napiť", "fackať", "ležať"],
      "mandatory": ["volať 112", "heimlich", "úder"],
      "fallback_template": "choking_adult.txt"
    }
  }
}
```

### 3. Restart agent

```bash
npm start
```

**Done!** Nový emergency state je aktívny.

---

## 📊 API Reference

### `runSPG(userMessage, manifest)`

**Main entry point** - checks if message matches emergency state.

**Parameters:**
- `userMessage` (string) - User's input
- `manifest` (object) - logic_manifest.json

**Returns:**
- `string` - Template content (if match)
- `null` - No match (continue normal flow)

**Example (ESM):**
```javascript
import manifest from './logic_manifest.json' with { type: 'json' };
import { runSPG } from './spg.js';

const result = runSPG("Človek nedýcha", manifest);
if (result) {
  console.log(result); // KPR DOSPELÝ – OKAMŽITE...
}
```

### `getSPGDiagnostics(manifest)`

**Returns diagnostics info** for `/system` command.

**Parameters:**
- `manifest` (object) - logic_manifest.json

**Returns:**
- `object` - Diagnostics data

**Example (ESM):**
```javascript
import manifest from './logic_manifest.json' with { type: 'json' };
import { getSPGDiagnostics } from './spg.js';

const diag = getSPGDiagnostics(manifest);
console.log(diag.enabled);        // true
console.log(diag.statesCount);    // 1
console.log(diag.totalKeywords);  // 13
```

---

## 🔐 Bezpečnosť

### Priority Level

**SPG má NAJVYŠŠIU prioritu** v integration.js:

1. ✅ **SPG Check** (emergency detection)
2. Bot detection
3. Emotional analysis
4. Orchestration
5. LLM call

### Fallback

Ak template file chýba → SPG vracia núdzový fallback:

```
⚠️ NÚDZOVÝ FALLBACK ⚠️

OKAMŽITE VOLAJ 112

Šablóna prvej pomoci nedostupná.
Ak ide o život ohrozujúcu situáciu:
1. Zavolaj záchranku (112)
2. Zisti vedomie osoby
3. Ak nedýcha → začni KPR
4. Neprestávaj, kým nepríde pomoc
```

---

## 📈 Performance

- **Execution Time:** <2ms
- **Memory Footprint:** Very small (tens of KB including templates and manifest)
- **Network Calls:** 0
- **Dependencies:** 0 (only Node.js `fs`)
- **Reliability:** 100% (deterministic)

---

## 🎓 Design Principles

1. **Offline-First** - No network dependency
2. **Deterministic** - Same input = same output
3. **Safety-First** - Highest priority in flow
4. **Simple** - No ML, just keyword matching
5. **Extensible** - Easy to add new states
6. **Auditable** - Clear logic, no black box

---

## 📞 Support

**Issues:** Open GitHub issue  
**Docs:** See `IMPLEMENTATION_SUMMARY.md`  
**Tests:** Run `node tests/test_first_aid_spg.js`

---

## 📝 License

Part of SP4 Core Agent - SP4 KULT  
**"Be real. Be free. Save lives."** 🚨
