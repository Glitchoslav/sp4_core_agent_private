# SP4 MVP 0.1 — Architektonický návrh

- **Status:** DRAFT — na schválenie majiteľa (Kefyk)
- **Autor syntézy:** Hermes; pripomienky ChatGPT (6 bodov) a Gemini (oponentúra) zapracované
- **Verzia:** 0.1-draft
- **Dátum:** 2026-09-25

> **Zásada (platí odteraz):** AI navrhuje, spochybňuje a testuje. Rozhodnutia o právach
> ľudí a pravidlách spoločnej pamäti patria majiteľovi. Tento dokument je **NÁVRH**,
> nie rozhodnutie.

---

## 0. Vízia v jednej vete

SP4 = kmeň, ktorý si pamätá sám. **Matchmaker**, ktorý nájde tú *jednu* skúsenosť, čo
rieši *tvoje* trápenie — nezáleží od koho. Magic u teba, sieť slepá.

## 1. Non-negotiables (pevné hranice)

1. **Exit.** Export vlastných príspevkov je vždy jednostranný — bez súhlasu ostatných.
2. **Osobný Parťák, nie centrálny mozog.** Každý má svojho; spoločné poznanie len vyhľadáva.
3. **Nesledujeme človeka.** Overujeme systém (pozri §7).
4. **Súvislosť ≠ pravda.** Povinná provenance pri každom spojení.
5. **Bezpečnostná hranica.** Neoverená skúsenosť **nikdy** nenahrádza schválený
   bezpečnostný/zásahový postup.
6. **Žiadne verejné hodnotenie ľudí.** Žiadne lajky, rebríčky, optimalizácia na pozornosť.

## 2. Dátový model — tri scopes od prvého dňa

| Scope | Obsah | Šifrovanie |
|---|---|---|
| `private:<user>` | osobná pamäť | kľúč používateľa |
| `kmen:<group>` | skupinová pamäť kruhu | skupinový kľúč |
| `verejné` | verejne zdieľané, **neoverené**, explicitne označené | žiadne (otvorené) |

Každý záznam = zašifrovaný blob + metadata (hash, podpis, scope, timestamp,
`provenance` — ID zdrojov pre odvodené záznamy).

## 3. Komponenty

- **Parťák (zariadenie):** Node.js + lokálny model. Privátny kľúč, osobná pamäť,
  lokálne vyhľadávanie, matchmaker.
- **Kmeňový node (Kefyk node):** hlúpy sklad — zašifrované bloby + index (**nie** čistý text).
- **Odložené:** plný P2P mesh (mobily↔mobily bez servera) = Stage 4. Nestabilné, žerie batériu.
  MVP = federovaný model (tvoj node ako sprostredkovateľ).

## 4. Vyhľadávanie — dvojúrovňové

- **Úroveň 1 (default): lokálne.** Sync len **svojich** kruhov + tém (nie celá pamäť —
  rieši limit batérie/RAM). Dotaz **nikdy** neopustí zariadenie.
- **Úroveň 2 (explicitný opt-in): vzdialené.** Len na prehľadanie celej verejnej pamäti.
  UI **musí** upozorniť: *"tento dotaz ide na server a dá sa z neho odvodiť."*
  Žiadne predstieranie "slepoti" — embedding sa dá invertovať (EMNLP 2023).

**Pravda:** neexistuje zadarmo obed. Lokálne = súkromné, ale obmedzené. Vzdialené =
plné, ale odhalíš dotaz.

## 5. Kryptografia — minimálna, osvedčená

- Per-user kľúč: Ed25519 (podpis) + X25519 (šifrovanie) — libsodium.
- Per-kruh symetrický kľúč: age / XChaCha20; distribúcia šifrovaná pod verejné kľúče členov.
- Pridanie člena = zašifruj kľúč k nemu. **Odobratie = rotácia kľúča** (pre-šifruj zvyšným).
- **Žiadna vlastná kryptografia.**
- **Oddeliť identitu používateľa od identity zariadenia** (strata telefónu ≠ strata prístupu
  do kmeňa).

## 6. Obnova identity (po strate zariadenia)

- **MVP:** šifrovaná záloha obnovovacieho materiálu pod kontrolou majiteľa.
- **Neskôr:** social recovery (rozdelenie obnovy medzi 2–3 dôveryhodných ľudí).
- **Úprimný limit:** nemôžeš mať *"ktoľvek obnoví"* A *"nikto iný nečíta"* súčasne.
  Plná suverenita = ak stratíš zariadenie **aj** obnovovací materiál, stratíš prístup.
  To nie je bug, to je pointa.

## 7. Overovanie systému (nie sledovanie človeka)

**Princíp:** nemeriame hodnotu človeka — overujeme spoľahlivosť technológie.

- ✅ ÁNO: anonymné/syntetické testovacie otázky, testy vyhľadávania, bezpečnostné audity,
  dobrovoľná spätná väzba.
- ❌ NIE: profilovanie správania, emócií, citlivých otázok, času v aplikácii.

Kontrolné otázky (čo sa meria):
1. Nájde vyhľadávač relevantné skúsenosti?
2. Dodržiava prístupové práva?
3. Nevymýšľa zdroje?
4. Dostane človek svoje dáta pri exporte?

## 8. AI bezpečnosť — tri vykonávacie režimy

- **READ:** Parťák číta a vyhľadáva. Žiadne zmeny, žiadne systémové akcie.
- **PROPOSE:** pripraví návrh konkrétnej akcie, nič nevykoná.
- **EXECUTE:** nezávislá kontrolná vrstva overí oprávnenia, parametre a súhlas človeka.

**Invarianty:**
- Model **nikdy** nemá priamy prístup k tajným kľúčom.
- Cudzí obsah = **DATA, nie INŠTRUKCIA** (základ, nie jediná vrstva — podľa OWASP treba
  viacero nezávislých ochrán).
- **Lokálne ≠ automaticky bezpečné:** ochrana lokálnej DB, správa kľúčov, allowlist nástrojov,
  a viditeľná odpoveď na otázku *"kde sa moje dáta práve spracúvajú?"* (on-device vs
  home-server vs remote).

## 9. Matchmaker

- **Typová klasifikácia dopytu** (procedurálne "ako urobiť X" vs skúsenostné "ako si zvládol Y")
  → rôzne váhy signálov.
- **Signály:** sémantická podobnosť + pôvod + aktuálnosť + úroveň overenia + nezávislosť zdrojov.
- **Povinná provenance:** prečo + odkiaľ + úroveň overenia.
- **Cesta "nedostatok dôkazov":** *"nenašiel som nič overené; tu je najbližšie, ale je to
  neoverené"* — nikdy nefabulovať sebaistú zhodu (SP4 už má `SP4_NON_ANSWER_POLICY_FACT`).
- **Bezpečnostná hranica:** riziková doména (hasičina, zdravie) → smeruj na **schválený
  postup**, nie "čo niekto skúsil".

## 10. Právo odísť / zabudnúť — 4 operácie + 3 úrovne potvrdenia

Operácie:
1. **Export** — vždy, jednostranne (moje príspevky sa dešifrujú mojím kľúčom).
2. **Odobratie prístupu** — rotácia kľúča.
3. **Odstránenie zdroja** — tombstone sa šíri, zdroj sa prestane citovať.
4. **Odvodené poznatky** — evidencia ID zdrojov → identifikácia súhrnov/indexov na aktualizáciu.

Úrovne potvrdenia odstránenia:
1. ✅ Potvrdené z vlastného servera.
2. ✅ Potvrdené zo synchronizovaných zariadení.
3. ⚠️ Kópie mimo kontroly (offline/rogue zariadenia, manuálne skopírované) — **NEGARANTOVANÉ.**

**Úprimné priznanie:** garantujeme odstránenie zdroja a zastavenie šírenia. **Negarantujeme**
vymazanie z kópií mimo kontroly. Toto sa hovorí, nie sľubuje.

## 11. Pamäť rozhodnutí (ADR)

Každé architektonické rozhodnutie = záznam: čo, prečo, na základe čoho, alternatívy,
kedy prehodnotiť, kto schvaľuje. Aby sme o pol roka neprijali to, čo sme už zamietli.

*(SP4 je systém, ktorý si pamätá — tak nech si pamätá aj to, ako sám vznikal.)*

## 12. Prvý experiment (MVP 0.1)

- **Účastníci:** 20–30 dobrovoľníkov (hasiči/záchranári, existujúca dôvera).
- **Obsah:** každodenné úspechy, technické postupy, neúspešné pokusy, otázky.
  **NIE** reálne zásahy, pacienti, identifikovateľné tretie osoby.
- **3 výstupy:** (a) nová informácia, (b) prakticky použiteľná skúsenosť,
  (c) dobrovoľná spolupráca.
- **Spätná väzba = súhlasný self-report**, nie dozor. Nesmie byť jediným dôkazom úspechu.

## 13. Fakt / predpoklad / experiment

| Tvrdenie | Status |
|---|---|
| Embeddingy sa dajú invertovať | **Fakt** (EMNLP 2023) |
| Rotácia kľúčov funguje | **Fakt** (Signal/Matrix) |
| Lokálne hľadanie neuniká dotaz | **Fakt** (logika) |
| "Synca len svoje kruhy sa zmestí do mobilu" | **Predpoklad** (overiť) |
| Štrukturálna izolácia (READ/PROPOSE/EXECUTE) zastaví injection | **Predpoklad** (OWASP: nutné, nie postačujúce) |
| Typové vyhľadávanie > čistá sémantická podobnosť | **Predpoklad** (A/B test) |
| Dobrovoľníci vôbec napíšu skúsenosť | **Experiment** (cold-start) |
| Retrieval nájde *užitočné*, nie len *podobné* | **Experiment** |

## 14. Otestovať pred verejným spustením

1. Lokálny režim neuniká žiadny dotaz (audit).
2. Škodlivý príspevok nedokáže vyvolať systémovú akciu (injection test).
3. Rotácia kľúča reálne odreže odídeného člena.
4. "Nedostatok dôkazov" → systém povie "neviem", nehalucinuje.
5. Cold-start: či niekto vôbec napíše (najťažšia časť).

---

## Príloha A — ADR log (seed)

### ADR-001 · Predvolené vyhľadávanie je lokálne
- **Rozhodnutie:** default = lokálne vyhľadávanie; vzdialené len na explicitný opt-in.
- **Dôvod:** ochrana súkromných otázok bez odosielania embeddingov na server (invertovateľné).
- **Alternatíva:** vzdialené sémantické vyhľadávanie ako default.
- **Riziko:** obmedzené množstvo lokálne dostupných poznatkov.
- **Overenie:** test na reálnych zariadeniach (RAM, rýchlosť, sieť).

### ADR-002 · Osobný Parťák, nie centrálny mozog
- **Rozhodnutie:** každý má vlastného Parťáka; spoločná pamäť je len vyhľadávaná, nie vlastnená.
- **Dôvod:** jediná obrana proti profilovaniu centrálnym serverom.
- **Alternatíva:** jeden centrálny model pre celý kmeň (zamietnuté).

### ADR-003 · Export vlastných príspevkov je jednostranný
- **Rozhodnutie:** vlastné príspevky exportovateľné kedykoľvek bez súhlasu; spoločná pamäť = so súhlasom.
- **Dôvod:** exit princíp — sloboda = možnosť odísť aj s dátami.

### ADR-004 · Bezpečnostná hranica pri rizikových doménach
- **Rozhodnutie:** neoverená skúsenosť **nenahrádza** schválený bezpečnostný/zásahový postup.
- **Dôvod:** hranica medzi radou a smrťou.

### ADR-005 · Tri vykonávacie režimy (READ/PROPOSE/EXECUTE)
- **Rozhodnutie:** model bez priameho prístupu k akciám a kľúčom; akcie cez nezávislú vrstvu.
- **Dôvod:** prompt injection nesmie prerásť v systémovú akciu.

### ADR-006 · MVP = federácia, P2P mesh odložený
- **Rozhodnutie:** kmeňový node ako sprostredkovateľ; P2P mesh = Stage 4.
- **Dôvod:** P2P mesh je nestabilný a žerie batériu; predčasný.

### ADR-007 · Overujeme systém, nesledujeme človeka
- **Rozhodnutie:** meriame spoľahlivosť (retrieval, práva, zdroje, export), nie človeka.
- **Dôvod:** hranica medzi overovaním technológie a profilovaním ľudí.

### ADR-008 · Žiadne lajky / rebríčky / optimalizácia pozornosti
- **Rozhodnutie:** žiadne verejné hodnotenie autorov, žiadna metrika pozornosti.
- **Dôvod:** odstránenie motivácie tvoriť clickbait skúsenosti.
