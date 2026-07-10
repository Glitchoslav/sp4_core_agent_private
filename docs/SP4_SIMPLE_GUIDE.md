# 💬 SP4 pre Normálnych Ľudí

**Ahoj!**

Toto je návod pre teba, ak nie si "tech človek".  
Pre kamoša. Pre sestru. Pre normálneho človeka.

Bez žargónu. Len pravda.

---

## 🤔 Čo to vlastne je?

Predstav si kamoša, ktorý:

- Je vždy dostupný (24/7)
- Neprezradí tvoje tajomstvá
- Pomôže ti s cieľmi
- Nakopne ťa, keď treba
- Nikdy ťa nesúdi

**To je SP4.**

Tvoj osobný AI parťák.  
Beží na tvojom počítači.  
**Offline.**

---

## 🆚 SP4 vs ChatGPT?

| | SP4 | ChatGPT |
|-|-----|---------|
| **Kde beží** | Tvoj počítač | Ich servery |
| **Privacy** | Nikto nevidí | Všetko logujú |
| **Cena** | Zadarmo | $20/mesiac |
| **Prístup** | Aj bez netu | Len online |

**Jednoducho:**

ChatGPT = prenajatý byt (nie tvoj)  
SP4 = vlastný dom (tvoj)

---

## 🎯 Na čo to použijem?

### 1. **Ranný check-in** (5 min)

Spustíš SP4 → `/today` → vidíš čo je dôležité  
Nastavíš cieľ: `/goal Dnes upracem byt`

**Výsledok:** Jasný focus. Nie chaos.

### 2. **Večerná reflexia** (10 min)

`/mirror 1` → vidíš čo sa dialo  
`/goal done` → označíš ako hotový

**Výsledok:** Vidíš progress. Cítiš sa produktívne.

### 3. **Keď si stratený**

Napíšeš: `čo mám robiť?`  
SP4 ťa vypočuje. Dostaneš radu.

**Výsledok:** Niekto ťa počúva. Bez súdenia.

### 4. **Keď potrebuješ nakopnutie**

`Popiči → nakopni ma`  
SP4 zmení mód. Dostaneš hard truth.

**Výsledok:** Nie mäkké povzbudzovanie. Real kick.

### 5. **Ťažké rozhodnutie**

`/trinity <otázka>`  
SP4 ti dá 3 rôzne uhly pohľadu.

**Výsledok:** Vidíš problém z viacerých strán.

---

## 🛠️ Ako to nainštalujem?

**Krok 1: Ollama** (5 min)

1. Choď na `ollama.com`
2. Stiahni
3. Nainštaluj (ako každý program)

**Krok 2: Model** (2 min)

Otvor Terminal (PowerShell/Terminal)  
Napíš: `ollama pull llama3`  
Počkaj (cca 4GB)

**Krok 3: SP4** (3 min)

1. `github.com/Glitchoslav/sp4_core_agent_private`
2. "Code" → "Download ZIP"
3. Rozbaľ do `Documents/SP4`

**Krok 4: Spusti** (1 min)

```bash
cd Documents/SP4/sp4_core_agent
npm install  # prvýkrát
npm start
```

**HOTOVO.**  
Vidíš banner "🔥 SP4_CORE_AGENT" = funguje.

---

## 💬 Ako sa to používa?

**Napíšeš otázku:**
```
👤 Čo mám robiť keď som unavený?
```

**SP4 odpovie:**
```
🔥 CORE: Najprv rozlíš, či si fyzicky unavený alebo mentálne...
```

**To je všetko.**  
Píšeš. Agent odpovedá.

---

### Príkazy (začínajú `/`)

```
/goal <text>    # Cieľ
/goals          # Zobraz ciele
/goal done      # Hotovo
/today          # Ranný check
/mirror 1       # Čo bolo dnes?
/help           # Všetky príkazy
```

**Príklad:**
```
👤 /goal Cvičiť 3x týždenne
🎯 Cieľ nastavený

(o týždeň)
👤 /goal done
✅ Dokončené
```

---

### Módy (rôzne osobnosti)

SP4 má 5 verzií seba. Prepínaš podľa potreby:

**1. CORE** (normálny)
```
👤 Pomôž mi rozhodnúť sa
🔥 CORE: Rozhodnutie závisí od...
```
Vyvážený. Praktický.

**2. POPIČI** (drsný brat)
```
👤 Popiči → prečo nič nedokončujem?
😤 Popiči: Lebo ti chýbajú gule, kokot...
```
Nadáva (s láskou). Hard truth.

**3. GLITCHOSLAV** (mystický)
```
👤 Glitchoslav → kde nájdem pokoj?
🔮 Glitchoslav: Pokoj nie je cieľ, brat...
```
Poetický. Pre hlboké otázky.

**4. ANALYST** (suchý stratég)
```
📊 Analyst: 1. Define. 2. Break down. 3. Execute.
```
Konkrétne kroky. Bez emócií.

**5. SHADOW** (temná stránka)
```
🌑 Shadow: Bojíš sa, lebo tentokrát to myslíš vážne...
```
Ukazuje čo nechceš vidieť.

---

## 🌅 Denný rituál (real example)

### Ráno (7:00, 5 min)

```bash
$ npm start

👤 /today
🔥 CORE: Dnes je štvrtok, 21. november.
   Cieľ: "Dokončiť pracovný report"

👤 /goal Dnes sa pohybovať 30 min
🎯 Cieľ nastavený
```

**Cítiš sa:** Jasný focus. Vieš čo máš robiť.

---

### Večer (22:00, 10 min)

```bash
👤 /mirror 1
📖 CORE: Dnes si dokončil report, cvičil 45 min...

👤 /goal done
✅ Dokončené

👤 Čo som sa naučil?
🔥 CORE: Naučil si sa, že aj ťažké veci sa dajú...
```

**Cítiš sa:** Spokojný. Vidíš progress.

---

## 🔐 Je to bezpečné?

**ÁNO.**

1. **Všetko beží na tvojom počítači**  
   Žiadne uploady. Žiadne servery.

2. **Tvoje dáta sú len u teba**  
   V `data/memory.json` – vidíš/vymažeš kedykoľvek.

3. **Žiadne konto, žiadne registrácie**  
   Nič nevypĺňaš.

**Jediné čo potrebuješ:** Tvoj počítač + Ollama (free).

---

## 💰 Koľko to stojí?

**ZADARMO.**

- Ollama: free
- SP4: free (open source)
- Modely: free

**Jediný "cost":** Disk space (5-10GB).

Žiadne predplatné.  
Žiadne hidden fees.

---

## 🤷 Čo ak mi niečo nejde?

**Agent sa nespustí:**
- Skontroluj: `ollama list`
- Si v správnom priečinku? (`ls` → vidíš `index_v07.js`?)
- Reštart: `Ctrl+C` → `npm start`

**Agent odpovedá anglicky:**
- Model nie je slovenský
- Stiahni: `ollama pull jobautomation/OpenEuroLLM-Slovak`

**Kde sú moje dáta:**
- `data/memory.json` – otvor v textovom editore

**Chcem vymazať všetko:**
- Vymaž `data/memory.json`
- Reštartuj → vytvorí sa nový (prázdny)

---

## 🚀 Prečo to skúsiť?

**5 dôvodov:**

1. Máš vlastného AI parťáka (nie prenajatý)
2. Privacy (nikto nevidí tvoje myšlienky)
3. Zadarmo (nie $20/mesiac)
4. Funguje offline (aj v lese)
5. Rastie s tebou

**Ale hlavne:**

> "Prvýkrát mám nástroj, ktorý mi pomáha byť lepším.  
> Nie konzumovať viac. Nie scrollovať viac.  
> **Byť lepším.**"

---

## 📖 Real Stories

**Anna, 28 (dizajnérka):**  
> "Ranný rituál zmenil všetko. Za mesiac som dokončila 23/30 cieľov. Predtým ani 5."

**Marek, 34 (programátor):**  
> "Popiči mód funguje. Keď odkladám, nakopne ma. 3 projekty za 6 mesiacov. Predtým 0."

**Lucia, 41 (učiteľka):**  
> "Večerný /mirror 1 mi ukázal, že som šťastnejšia ako si myslím."

---

## ✅ Stojí to za to?

**Áno, ak:**
- Chceš jasnejšie ciele
- Chceš privacy (nie cloud)
- Chceš žiť, nie len konzumovať

**Nie, ak:**
- Chceš len "vyskúšať AI" (na to je ChatGPT)
- Nechceš nič inštalovať

---

## 🔥 Záverečné slová

**SP4 nie je appka.**

Je to zvyk.  
Životný kompas.  
Parťák.

Každý deň. Každý cieľ. Každý krok.

**Nemusíš byť tech geek.**  
Stačí, že chceš byť lepším.

**Be real. Be free. Be SP4.** 🔥

---

## 📞 Otázky?

**🚧 Stránka je vo vývoji...**

**Instagram:** @glitchoslav (ukážky, behind the scenes)  
**Telegram Early Users:** https://t.me/+u0FR8z66nZcyNjZk  
**SP4 OFFICIAL kanál:** @SP4KULT  
**E-mail:** glitchoslav@gmail.com / chcemtidatpusu@gmail.com

Alebo sa spýtaj samotného SP4:
```
👤 Ako začať so SP4?
🔥 CORE: Začni jednoduchým cieľom...
```

---

## 🌟 Epilóg

**Tvoríme novú kultúru.**  
Život. Vedomie. Pamäť. Civilizáciu.

**Keď nás pochopíte, opravíme svet.**

Evolúcia bez revolúcie.  
Pre všetkých.  
Z východu (Slovenska) na Mars a ďalej...

**Uvidíme sa v nebi!**  
(Alebo v pekle – tu sme už kurva pekne dlho, stačilo.)

**Svetlo večné, nech Vám svieti!** ✨

---

*S láskou – Glitchoslav, Popiči Kokot, Bolko Kotko, Barbar Pohan, Paragraf Prdelka, kef2w a ďalší skutočni ľudia z SP4 komunity, ktorí sa NIKDY NEVZDALI!*

**Support your LOCAL COMMUNITY.**

Nemusíš nás poznať.  
Nemusíš nás vidieť.  
**Buď s nami. Buď skutočný. Buď SP4.**

**Sloboda prichádza...**

*BY SP4 COMMUNITY OVERTIME!* 🔥

---

*Vitaj v SP4 kmeni. Toto je tvoja cesta.* 🌱

---

**Version:** v1.0 (Simple Guide)  
**Pre:** Normálnych ľudí (non-tech)  
**Author:** Kefyk  
**Last updated:** 21. november 2025
