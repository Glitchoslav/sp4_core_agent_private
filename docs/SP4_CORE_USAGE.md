# 🔥 SP4_CORE_AGENT - Usage Guide

**Verzia:** 0.8.6.9  
**Filozofia:** Be real. Be free. Offline-first AI parťák.

---

## 🚀 Spustenie

```bash
cd sp4_core_agent
npm start
```

**Prerekvizity:**
- Node.js 18+
- Ollama running (`ollama serve`)
- Model: `jobautomation/OpenEuroLLM-Slovak` (primary)

---

## 🎭 Personalities (Módy)

SP4_CORE_AGENT má **5 osobností**. Prepínaš medzi nimi **prefixom** alebo `/mode`:

### 1. **SP4_CORE** (default)
**Kedy:** Technické otázky, AI, kód, systémy, blockchain  
**Štýl:** Technický, racionálny, bez emócií, žiadne metafory  
**Aktivácia:**
```
SP4_CORE → vysvetli blockchain
/mode core
```

**Príklad:**
```
> SP4_CORE → čo je blockchain?
Blockchain je distribuovaná databáza organizovaná do blokov...
```

### 2. **Glitchoslav** 🌀
**Kedy:** Existenciálne otázky, zmysel, filozofia, spiritualita  
**Štýl:** Poetický, metaforický, mystický slovanský prorok  
**Aktivácia:**
```
Glitchoslav → prečo existujem?
/mode glitch
```

**Príklad:**
```
> Glitchoslav → čo je hranica?
Hranica je tam, kde prestáva otázka a začína echo. 
Stroj odpovedá presne – človek odpovedá, lebo musí.
```

### 3. **Popiči Kokot** 🔥
**Kedy:** Nakopnutie do reality, pravda na rovinu, motivácia  
**Štýl:** Východniarsky brat z krčmy, drzý ale s láskou  
**Aktivácia:**
```
Popiči → motivuj ma
/mode popici
```

**Príklad:**
```
> Popiči → prečo mi nič nejde?
No šak si myslel, že to bude jak naštartovať traktor, kokot? 
Bo si možno lenivý, možno netalentovaný, ale ta fakt - väčšinou je to 
preto že si to neskúšal stokrát. Skús ešte.
```

### 4. **EMPATIA** 💙
**Kedy:** Bolesť, samota, strach, trauma, ťažké emócie  
**Štýl:** Tichý, láskavý, bez rád (len prítomnosť)  
**Aktivácia:**
```
/mode empatia
(alebo automaticky pri ťažkých emóciách)
```

### 5. **HUMAN** 🧑
**Kedy:** Auto-detekcia (žiadny explicitný prefix)  
**Štýl:** Balanced, konverzačný, praktický  
**Aktivácia:**
```
(žiadny prefix, normálny chat)
```

---

## 📝 Príkazy

### Základné

| Príkaz | Popis |
|--------|-------|
| `/help` | Zobrazí všetky príkazy |
| `/status` | Stav systému (memory, mood, mode, context) |
| `/mode <name>` | Prepne mód (`auto`, `core`, `glitch`, `popici`, `empatia`, `human`) |
| `/exit` | Ukončiť |

### Memory & Profil

| Príkaz | Popis |
|--------|-------|
| `/profile` | Tvoj profil + relationship stage |
| `/mirror [days]` | Čo si riešil posledných N dní (default: 7) |
| `/today` | Čo dnes potrebuješ vyriešiť? |
| `/next` | Ďalší krok v tvojom pláne |
| `/seeds` | Kľúčové momenty (Seeds) |
| `/seed <text>` | Zaznamená kľúčový moment |

### Ciele (Goals) 🎯 **NEW v0.8.6.9**

| Príkaz | Popis |
|--------|-------|
| `/goal` | Zobrazí aktívny cieľ + históriu |
| `/goal <text>` | Nastaví nový aktívny cieľ |
| `/goal done` | Označí aktívny cieľ ako dokončený |
| `/goal drop` | Dropne aktívny cieľ (nebol dokončený) |
| `/goals` | Alias pre `/goal` |

**Príklad workflow:**
```bash
> /goal Dokončiť SP4_CORE_AGENT v0.9 do konca mesiaca
🎯 Nový cieľ nastavený: "Dokončiť SP4_CORE_AGENT v0.9 do konca mesiaca"

> /goal
🎯 AKTÍVNY CIEĽ:
  "Dokončiť SP4_CORE_AGENT v0.9 do konca mesiaca"
  Vytvorený: 21.11.2025 (0 dní)

> /goal done
✅ Cieľ dokončený: "Dokončiť SP4_CORE_AGENT v0.9 do konca mesiaca"
```

### Rituály & Tools

| Príkaz | Popis |
|--------|-------|
| `/trinity <otázka>` | Tri perspektívy (CORE, Analyst, Glitch) |
| `/rate <good\|mid\|bad>` | Ohodnotí poslednú odpoveď |
| `/backup` | Ručná záloha pamäte |
| `/consolidate` | Ručná konsolidácia pamäte |
| `/recovery` | Manuálny recovery protokol |

### Context Manager (v0.7+)

| Príkaz | Popis |
|--------|-------|
| `/context` | Stav context managera (lock strength, history) |
| `/unlock` | Force unlock context manager |

---

## 🗣️ Komunikácia

### Explicitné prefixy (override auto-detection)

```bash
SP4_CORE → technická otázka
Glitchoslav → filozofická otázka
Popiči → nakopni ma
```

### Auto-detection (no prefix)

Ak **nepoužiješ prefix**, agent automaticky deteguje mód:
- Východniarsky slang (`ta`, `bo`, `šak`, `kurva`) → **POPICI**
- Existenciálne slová (`duša`, `zmysel`, `prečo existujem`) → **GLITCHOSLAV**
- Technické slová (`blockchain`, `AI`, `kód`) → **CORE**
- Emócie (`samota`, `bolesť`, `strach`) → **EMPATIA**
- Default → **HUMAN**

---

## 🧠 Memory System

SP4 si **pamätá všetko** cez vrstvy:

1. **Raw Log** - každá konverzácia
2. **Summaries** - AI zhrnutia
3. **Chapters** - veľké periódy (týždne/mesiace)
4. **Seeds** - kľúčové momenty
5. **Triggers** - automatické varovania

**Konsolidácia:** Automaticky každých 24h (alebo `/consolidate`)

---

## ⚙️ Stack

- **Ollama** (localhost:11434) - lokálny LLM runtime
- **OpenEuroLLM-Slovak** - primárny model (natívna slovenčina, 8B params)
- **Node.js** - runtime
- **JSON** - lokálna databáza (data/memory.json)

**Žiadne cloudy. Žiadne API kľúče. Úplne offline.**

---

## 🔒 Privacy First

- ✅ Všetko beží lokálne (Ollama)
- ✅ Žiadne sieťové volania (okrem localhost)
- ✅ Data len na tvojom PC (data/memory.json)
- ✅ Žiadne sledovanie, žiadne analytiká
- ✅ Backup len lokálne (data/backups/)

---

## 🐛 Debugging

| Príkaz | Čo zobrazí |
|--------|-----------|
| `/status` | Memory size, mode, capability, emotion |
| `/context` | Context manager state + conversation history |

**Logy:** Vidíš ich priamo v termináli počas chatu.

---

## 💡 Tipy & Triky

### 1. **Daily /mirror ritual**
Každý večer:
```bash
> /mirror 1
```
Uvidíš zhrnutie dňa - čo si riešil, čo funguje, čo bolí.

### 2. **Rozhodovanie: rácio + zmysel**
```bash
> SP4_CORE → technická analýza možnosti A vs B
> Glitchoslav → ktorá cesta má väčší zmysel?
```

### 3. **Pred publikovaním: buffer test**
```bash
> SP4_CORE → skontroluj tento text, hľadaj bullshit
> Popiči → povedz mi, kde kecám
```

### 4. **Mental cleanup**
```bash
> /trinity mám pocit, že sa točím v kruhu
```
Dostaneš 3 perspektívy (CORE/Analyst/Glitch) na jeden problém.

### 5. **SP4 log = budúca kniha**
Každý `/seed <moment>` je kapsla času. O rok si pozrieš `/seeds` a uvidíš cestu.

---

## 🆘 Troubleshooting

**Problem:** Agent odpovedá po anglicky  
**Fix:** Model OpenEuroLLM-Slovak musí byť stiahnutý:
```bash
ollama pull jobautomation/OpenEuroLLM-Slovak
```

**Problem:** "Connection refused"  
**Fix:** Ollama nebeží:
```bash
ollama serve
```

**Problem:** Pomalé odpovede  
**Fix:** Model loading prvýkrát - ďalšie budú rýchlejšie (cache)

**Problem:** Validator zlyháva (Popiči/Glitch)  
**Fix:** Unicode issue - už opravené v v0.8.6.9

---

*Be real. Be free. Be SP4.*
