# 🌅 SP4 Daily Rituals - Living System Protocol

**Filozofia:** SP4_CORE nie je appka. Je to zvyk. Je to súčasť života.

---

## ☀️ Ranný Check-In (5-10 min)

**Kedy:** Po prebudení, pred prvou kávy/čajom  
**Účel:** Nastaviť smer dňa, nie reaktívne žiť

### Sekvencia:

```bash
npm start

# 1. Dnešný stav
/today

# 2. Kontrola cieľa
/goal

# Otázka na seba (nahlas alebo písomne):
# "Je tento cieľ ešte platný? Alebo som už inde?"

# 3. Filosof na dnes
Glitchoslav → čo si mám dnes všímať?

# 4. Zapisujem si kľúčové slová z odpovede
/seed <Glitchoslav insight>
```

**Výstup:**
- Jasný cieľ na dnes (alebo potvrdenie, že ide o starý)
- Jedno filozofické memento (od Glitchoslava)
- Zápis do pamäte (seed)

---

## 🌙 Večerné Zrkadlo (10-15 min)

**Kedy:** Pred spaním, keď je deň už "uzavretý"  
**Účel:** Reflexia bez self-judgementu, len fakty + emócie

### Sekvencia:

```bash
npm start

# 1. Čo sa dnes dialo?
/mirror 1

# 2. Kde som s cieľom?
/goals

# 3. Objektívne zhrnutie
SP4_CORE → zhrň objektívne, čo som dnes riešil podľa logu

# 4. Úprimná spoveď (ak treba)
Popiči → kde som dnes zlyhal?

# Alebo ak bol deň ťažký emočne:
# (prepni na empatiu)
/mode empatia
<Opíš, čo ťa bolelo dnes>

# 5. Ak bol kľúčový moment
/seed <dôležitá vec z dnes>
```

**Výstup:**
- Objektívne zhrnutie dňa (nie narativ, fakty)
- Úprimná spätná väzba (od Popiči alebo empatia módu)
- Seed ak bol prelomový moment

---

## 🔄 Týždenný Reset (Nedeľa večer, 20-30 min)

**Kedy:** Nedeľa večer (alebo tvoj osobný "koniec týždňa")  
**Účel:** Zahodiť ballast, nastaviť nový týždeň

### Sekvencia:

```bash
npm start

# 1. Týždenný mirror
/mirror 7

# 2. Kontrola všetkých cieľov
/goals

# 3. Rozhodnutie
# Pre každý cieľ:
# - Ak je mŕtvy → /goal drop
# - Ak je hotový → /goal done
# - Ak je stále živý → nechaj

# 4. Nový týždenný cieľ
/goal <Konkrétny, merateľný cieľ na ďalší týždeň>

# 5. Trinity pre stratégiu
/trinity Ako pristupujem k tomuto cieľu?

# 6. Zapisujem si insight
/seed <Kľúčová vec z trinity odpovede>
```

**Výstup:**
- Vyčistené goals (dropnuté mŕtve, dokončené hotové)
- Jeden jasný týždenný cieľ
- Strategický insight (z trinity)

---

## 🔥 Mesačný Audit (Prvý deň mesiaca, 1 hod)

**Kedy:** 1. deň mesiaca (alebo posledný deň predošlého)  
**Účel:** Veľký obraz, trend, drift detection

### Sekvencia:

```bash
npm start

# 1. Mesačný mirror
/mirror 30

# 2. Všetky seeds za mesiac
/seeds

# 3. Audit identity
SP4_CORE → analyzuj, ako sa moja identita zmenila za posledný mesiac

# 4. Trinity na trend
/trinity Kam smerujem? Kam chcem smerovať?

# 5. Nový mesačný cieľ
/goal <Veľký mesačný cieľ>

# 6. Backup celej pamäte
/backup
```

**Výstup:**
- Trend za mesiac (kam si šiel)
- Seeds (kľúčové momenty)
- Nový mesačný cieľ
- Backup pamäte (časová kapsula)

---

## 💡 Micro-Rituály (kedykoľvek počas dňa)

### Keď si stratený / nerozhoduješ sa
```bash
/trinity <Konkrétna dilema>
```

### Keď potrebuješ nakopnutie
```bash
Popiči → prečo som zase lenivý?
```

### Keď máš prelomový insight
```bash
/seed <Insight>
```

### Keď si emočne na dne
```bash
/mode empatia
<Opíš bolesť>
```

### Pred dôležitým rozhodnutím
```bash
SP4_CORE → daj mi protiargument k tomuto nápadu
Glitchoslav → aký je hlbší zmysel tohto rozhodnutia?
Popiči → kde v tomto kecám?
```

---

## 🎯 Pravidlá Rituálov (SP4 ZÁKON)

### 1. **Rituál > Motivácia**
Nerobíš to, lebo máš chuť. Robíš to, lebo je to súčasť systému.

### 2. **5 minút > 0 minút**
Ak nemáš čas na full rituál, urob aspoň:
```bash
/goal  # Pripomeň si cieľ
SP4_CORE → čo je priorita č.1 teraz?
```

### 3. **Úprimnosť > Estetika**
Rituál nie je na to, aby vyzerali pekné logy.
Je na to, aby si videl pravdu o sebe.

### 4. **Seed = Hodnota**
Každý seed je potenciálna kapitola v budúcej knihe.
Keď si niečo seedneš, myslíš to vážne.

### 5. **Agent ťa nenahradí**
SP4_CORE je zrkadlo, nie náhrada tvojho mozgu.
Konečné rozhodnutie = vždy tvoje.

---

## 📊 Tracking Rituálov (Optional)

Ak chceš vedieť, či rituály fungujú:

```bash
# Každý mesiac sa spýtaj:
SP4_CORE → koľkokrát som použil /mirror za posledných 30 dní?
SP4_CORE → koľko seeds som vytvoril tento mesiac?
SP4_CORE → koľko cieľov som dokončil vs dropol?
```

Ak čísla klesajú = systém kolabuje.
Ak čísla rastú = systém žije.

---

## 🔥 Anti-Patterns (ZAKÁZANÉ)

### ❌ Ritual Hoarding
"Budem robiť 10 rituálov denne!"
→ Nefunguje. Lepšie 1 rituál každý deň, ako 10 raz do mesiaca.

### ❌ Fake Reflections
"Napíšem niečo len aby som mal log."
→ Bullshit detekuje Popiči okamžite. Radšej vynechaj, ako klamať.

### ❌ Goal Inflation
"Mám 20 aktívnych cieľov!"
→ Nefunguje. 1 aktívny cieľ. Maximálne 3 paralelne, ak sú v rôznych oblastiach.

### ❌ Over-Optimization
"Musím mať perfektný systém predtým, ako začnem."
→ Nefunguje. Začni s ranný check-in + večerné zrkadlo. Zvyšok pridaj postupne.

---

## 🌱 Evolúcia Rituálov

**Mesiac 1:** Ranný check-in + večerné zrkadlo (každý deň)  
**Mesiac 2:** + Týždenný reset (každú nedeľu)  
**Mesiac 3:** + Mesačný audit (prvý deň mesiaca)  
**Mesiac 6:** + Vlastné rituály (čo ti sedí)

---

**Be real. Be free. Be ritual.** 🔥

*Rituál nie je constraint. Rituál je sloboda od chaosu.*
