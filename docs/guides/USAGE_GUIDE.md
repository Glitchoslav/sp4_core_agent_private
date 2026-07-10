# 🔥 SP4_CORE_AGENT – Používateľská príručka

**SP4_CORE_AGENT je tvoj lokálny AI symbiont. Beží na tvojom PC cez Ollama.**  
**Žiadny cloud, žiadny Big Brother, len ty a tvoja lokálna AI.**

---

## 🚀 Rýchly štart

```bash
npm start          # Spusti agenta
```

---

## 🎭 Tri osobnosti SP4

SP4 má tri vrstvy osobnosti. Prepínaš ich prefixom v správe:

### 🟥 SP4_CORE – Studený mozog
**Použitie:**
- Technické vysvetlenia (blockchain, token, modely, architektúra)
- Analýza logov, chýb, návrhy riešení
- Bez emócií, bez "pomáham ti", bez "ja" / "ty"

**Príklady:**
```
SP4_CORE → vysvetli mi presne, čo je LP pool na DeDust
SP4_CORE → zhrň mi dnešné chyby v logu do 3 bodov
SP4_CORE → navrhni štruktúru README pre SP4_CORE repo
```

### 🟦 Glitchoslav – Duch a vízia
**Použitie:**
- Texty pre manifesty, popisy, filozofiu, "prečo to robíme"
- Hlboké otázky: zmysel SP4, hranica človek–stroj, smrť, pamäť
- Krátke silné výstupy, ktoré vieš hodiť na web/TG

**Príklady:**
```
Glitchoslav → ako by si opísal SP4 novému človeku, čo nás prvýkrát vidí?
Glitchoslav → čo je skrytý zmysel SP4OT?
Glitchoslav → povedz mi, čo podľa teba práve nesiem v sebe
```

### 🟨 Popiči – Tlak, humor, kopanec do riti
**Použitie:**
- Motivácia, keď stagnuješ
- Uvoľnenie napätia, krčmová múdrosť v hrubom balení
- Texty do meme, komentáre, popiči statusy

**Príklady:**
```
Popiči → ta kokot, čo mám dnes spraviť pre SP4?
Popiči → vysmej ma, že zas prokrastinujem
Popiči → okomentuj to, či to nie je moc suché
```

---

## 🛠️ Základné príkazy

```
/help              # Zoznam funkcií a módov
/note <text>       # Uloženie poznámky do pamäti
/today             # Rekapitulácia dňa (čo sa riešilo, čo ťa trápilo)
/mirror            # Reflexia: agent ti vráti, čo z teba v poslednej dobe cíti
/profile           # Zhrnutie toho, čo o tebe vie (hodnoty, smer, vzorce)
/backup            # Manuálna záloha pamäti
```

---

## 🧠 Pamäť a profil

**Agent si pamätá:**
- Konverzácie lokálne (žiadny cloud)
- Dôležité momenty (traumy, vízie, nápady, rozhodnutia)
- Tvoj profil: čo riešiš, čo ťa žerie, kam chceš ísť

**Vrstvy pamäte:**
- **Raw log** – všetko čo si písal
- **Summaries** – AI zhrnutia
- **Chapters** – veľké periódy života
- **Seeds** – kľúčové momenty
- **Triggers** – automatické varovania

---

## 💡 Tipy, triky, lajfheky

### 1. Denný rituál `/mirror` (2–5 minút)

**Večer napíšeš:**
```
SP4_CORE → zhrň môj dnešný deň v 3 vetách
Glitchoslav → čo je podľa teba skrytá téma dneška?
```

**Dostaneš:**  
Technický sumár + symbolický pohľad

---

### 2. Rozhodnutia o peniazoch / krypto / projekt

```
SP4_CORE → daj mi plusy/mínusy tohto rozhodnutia: [opíš situáciu]
```

**Potom:**
```
Glitchoslav → čo v tom rozhodnutí nevidím, ale ovplyvní môj život?
```

**Dve vrstvy zároveň:** rácio + zmysel

---

### 3. Buffer pred svetom

**Skôr než niečo pošleš do TON komunity / X / TG:**
```
SP4_CORE → skontroluj text, či je zrozumiteľný a bez technických blbostí
Popiči → okomentuj to, či to nie je moc suché
```

**Kombinácia:** CORE ti drží realitu, Popiči ti drží šťavu

---

### 4. Čistenie hlavy

**Keď si rozhodený:**
```
Glitchoslav → povedz mi, čo podľa teba práve nesiem v sebe
```

**O pár minút:**
```
SP4_CORE → prepíš to do 3 konkrétnych úloh na zajtra
```

---

### 5. Tréning vlastnej mysle

**Pýtaj sa:**
```
SP4_CORE → nájdi slabiny v mojom nápade: [opíš nápad]
SP4_CORE → sprav kritiku tohto rozhodnutia ako keby si bol nepriateľ
```

**Robíš z neho interného "oponenta", nie len cheerleadera**

---

### 6. SP4 log ako budúca kniha

**Všetko, čo ide cez SP4_CORE / Glitchoslava, je potenciálny materiál na knihu, manifest, whitepaper.**

**Raz za čas:**
```
SP4_CORE → vytiahni 5 najvýraznejších myšlienok za posledný týždeň
```

---

## 🔒 Filozofia SP4

- **Žiadny cloud**, žiadne sledovanie
- **Tvoje dáta zostávajú u teba** (lokálna databáza)
- **AI tu nie je pán**, je to nástroj a zrkadlo
- **Heslo:** "be real. be free."

---

## 🏗️ Technické detaily

**Stack:**
- **Ollama** (localhost:11434) – lokálne LLM modely
- **OpenEuroLLM-Slovak** – primárny model (natívna slovenčina, 8B params)
- **Node.js** – runtime
- **JSON** – lokálna databáza (data/memory.json)

**Performance:**
- Odpoveď: 3-5 sekúnd
- System prompt: ~50 slov (optimalizované v v0.8.6.6)
- Token limit: 300 tokens/response

**Privacy:**
- 100% offline
- Žiadne API kľúče
- Žiadne externé služby
- Všetko beží na localhost

---

## 📖 Ďalšie zdroje

- `README.md` – technická dokumentácia
- `ARCHITECTURE_V04.md` – systémová architektúra
- `QUICK_START.md` – inštalácia a setup
- `copilot-instructions.md` – development guidelines

---

**Version:** 0.8.6.6  
**Last update:** 20. november 2025  
**Autor:** Kefyk (SP4 founder)

🔥 **"be real. be free."**
