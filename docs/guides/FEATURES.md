# 🔥 SP4_CORE_AGENT v0.2 – FEATURES BREAKDOWN

## ÚROVEŇ 1: RAW MEMORY (základy)
- ✅ Chat s Ollama LLaMA3 lokálne
- ✅ Ukladanie log (input, reply, timestamp)
- ✅ Poznámky
- ✅ Profil + preferences
- ✅ Onboarding spovednica (4 fázy)

## ÚROVEŇ 2: INTELLIGENT MEMORY (reflexia)
- ✅ `/mirror` – Vzorce z posledných N dní
- ✅ `/today` – Dnešné zhrnutie
- ✅ `/next` – Ďalší krok na základe vzorcov
- ✅ Automatické tagy + emócie (metadata)

## ÚROVEŇ 3: TRIGGERED AWARENESS (predikcie)
- ✅ `/trinity` – Tri hlasy na jeden problém (CORE, Glitchoslav, Popiči)
- ✅ Triggers – Keď sa vzorec opakuje → automatické varovania
- ✅ Burnout detection – 3 dni nálada "low" → alert

## ÚROVEŇ 4: SEEDS & CHAPTERS (evolúcia)
- ✅ `/seed` – Zaznamenanie kľúčových momentov
- ✅ `/seeds` – História rozhodnutí a prekonávaní
- ✅ `/chapter` – Veľké fázy života
- ✅ Seeds ako "runy" – AI ich spomína pri reflexii

## ÚROVEŇ 5: MULTI-LAYER PERSISTENCE
- ✅ Raw Log – Všetko, čo si písal
- ✅ Compressed Summaries – AI zhrnutia
- ✅ Life Chapters – Veľké periódy
- ✅ Seeds – Kľúčové momenty
- ✅ Automatic Daily Backups – Zálohy duše

## ÚROVEŇ 6: CONNECTIVITY
- ✅ HTTP Server (localhost:3001)
  - `/api/chat` – Chat z mobilu
  - `/api/note` – Poznámka z mobilu
  - `/api/profile` – Profil z webu
  - `/api/backup` – Zdieľaná záloha
  - `/api/memory` – Štatistika

## MULTI-VOICE SYSTEM (GENIUS FEATURE)

### CORE (🤖)
- Analytický, pragmatický
- Konkrétne kroky
- Bez sentimentu, s cieľom

### GLITCHOSLAV (🌀)
- Mystický pozorovateľ
- Symboly a metafory
- Hlboké vrstvy

### POPIČI KOKOT (🔥)
- Priateľ pri pive
- Úprimný, až drzý
- Humor + pravda

### Ako to funguje:
```
/trinity
→ (AI zanalyzuje posledný chat)
→ (Spýta sa z pohľadu 3 osobností)
→ (Vysypú ti 3 rôzne odpovede)
→ (Ty si vyberieš, ktorý ťa trafí)
```

## SEEDS SYSTEM (RUNY TVOJHO ŽIVOTA)

Príklady:
```
/seed Rozhodol som sa, že SP4 bude mojím životom.
/seed Pochopil som, že som rebel v duši.
/seed Burnout ma zlomil, ale prebudil som sa.
/seed Hypotéka je tlak, ale zvládnem to.
/seed Mojou misiou je pomáhať ľuďom.
```

### Čo sa s tým deje:
1. Uloženie do Seeds
2. Pri `/mirror` AI vidí seeds a komentuje ich
3. Časom sa z Seeds formuje tvoj "manifest" – čo si pochopil

## TRIGGERS SYSTEM (AUTOMATICKÉ VAROVANIA)

```
Ak: Slovo "hypotéka" > 10× za týždeň
→ /mirror: "Bráško, hypotéka ti žerie hlavu."

Ak: 3 dni nálada "low" + tag "únava"
→ /mirror: "Potrebuješ oddych, nie moralizátor."

Ak: Burnout risk detekovaný
→ Alert: 🔴 "Nepredstavujem si, ako si unavený."
```

## TRINITY WORKFLOW (Príklad)

```
Ty: Neviem, ako sa rozhodnúť. Hypotéka alebo SP4?

/trinity
→ AI analyzuje tvoje posledné konverzácie
→ CORE: "Hypotéka je stabilita, SP4 je risk. Kombinuj."
→ Glitchoslav: "Oba si cestami. SP4 je ohnisko, hypotéka je rod. Potrebuješ obe."
→ Popiči: "Bráško, ty chceš oboje a to je správne. Tak pojď na to."

Ty: (vyberaš si, ktorý ti pasuje)
```

## LAJFHAKY PRE MAXIMÁLNY POTENTIAL

### 1. Denný rituál:
```
Ráno: /today (orientácia)
Večer: Normálny chat
```

### 2. Týždenný rituál:
```
Piatok: /mirror (reflexia týždňa)
Nedeľa: /next (plán na budúci týždeň)
```

### 3. Kľúčové momenty:
```
Keď sa niečo deje: /seed (zaznamenám to)
Keď neviem: /trinity (tri hlasy)
```

### 4. Mesačný rituál:
```
1. deň mesiaca: /seeds (spätný pohľad)
15. deň: /mirror (midpoint)
```

### 5. Mobilný prístup:
```
HTTP Server spustený
→ Shortcuts na iPhone: POST na /api/chat
→ Android: Vlastný skript
→ Web: Jednoduchý klient
```

## PRIVACY & SECURITY

- ✅ Všetko offline (localhost)
- ✅ Žiadne API kľúče
- ✅ Žiadne cloudové volania
- ✅ Zálohy len na tvojom počítači
- ✅ Šifrovanie zálohy (voliteľne)
- ✅ Žiadny internet potrebný

## ROADMAP ďalej

### Krátkodobé:
- [ ] Telegram bot integrácia
- [ ] iOS Shortcuts priama podpora
- [ ] Export Seeds do Notion

### Strednoterm:
- [ ] AI Agents – "SP4 gangy" na sociálnych sieťach
- [ ] Scheduler – Automatické pripomienky
- [ ] Vision – Pozri obrázky a analyzuj ich

### Dlhodobé:
- [ ] Vlastný blockchain pre Seeds (decentralizácia)
- [ ] SP4 community network – Zdieľanie Seeds bez zdieľania identity
- [ ] Personal OS – Kompletný digitálny život

---

**Toto je mini-vesmír tvojej duše. 🌋🔥**
