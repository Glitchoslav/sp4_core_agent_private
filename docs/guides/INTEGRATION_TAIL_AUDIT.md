# Integration Tail Audit

Status: canonical current-state audit

Scope: inline post-generation tail v `integration.js`

Date: 2026-04-11

Authority:

- law: `sp4_core_agent/docs/guides/RUNTIME_DISCIPLINE.md`
- runtime owner: `sp4_core_agent/integration.js`

Goal: rozobrať reálny inline tail v poradí, v akom dnes beží, a pre každý krok zapísať 5-polový contract plus verdict `nechať | zúžiť | zabiť`.

Important: aktuálny runtime už nie je len zoznam ôsmich historických krokov. Medzi cleanup a return sa dnes miešajú:

- textové mutácie
- metadata-only vyhodnocovanie
- fallback reason inferencia
- grounded replacement
- immune retry a post-immune replacement
- writeback side effects

Preto audit vedie len to, čo dnes reálne beží v live `integration.js`.

---

## 1. Reálne poradie tailu

Aktuálny tail po answer generation a základnej validácii beží v tomto poradí:

1. `enforceSlovak()`
2. interný `stripResidualEnglish()` v enforcer vetve
3. `glitchNormalizeSk()`
4. `sanitizeAiCliches()`
5. global language failsafe
6. `cleanupWeirdSlovak()`
7. `applyFallbackTruth()`
8. `validateGroundedResponse()`
9. confidence scoring + calibration
10. result assembly + empty response guard
11. `runImmuneCheck()`
12. immune soft retry
13. `applyPostImmuneResponseControl()`
14. `detectGeneralQualitySanityIssue()`
15. `runWritebackTail()`

Historická poznámka:

- `normalizeWeirdWords()` bol odpojený z globálneho live tailu runtime patchom `2026-04-11-015`
- helper zatiaľ ostáva v `src/core/languageUtils.js`, ale už nie je súčasťou kanonického inline tail poradia

Userom očakávané poradie `sanitizeAiCliches -> cleanupWeirdSlovak -> stripResidualEnglish -> enforceSlovak -> factual guards -> outputImmuneCheck -> responseControl -> writebackTail` už s runtime realitou nesedí úplne presne. Audit preto používa skutočné dnešné poradie.

---

## 2. Verdiktová mapa

| Krok | Mutuje text | Verdikt |
| --- | --- | --- |
| `enforceSlovak()` | áno | zúžiť |
| interný `stripResidualEnglish()` | áno | nechať |
| `glitchNormalizeSk()` | áno | nechať |
| `sanitizeAiCliches()` | áno | nechať |
| global language failsafe | áno | nechať |
| `cleanupWeirdSlovak()` | áno | nechať |
| `applyFallbackTruth()` | nie, len metadata | zúžiť |
| `validateGroundedResponse()` | áno | nechať |
| confidence scoring + calibration | nie, len metadata | nechať |
| empty response guard | áno | nechať |
| `runImmuneCheck()` | nie, len verdict | nechať |
| immune soft retry | áno | zúžiť |
| `applyPostImmuneResponseControl()` | áno | nechať |
| `detectGeneralQualitySanityIssue()` | áno | zúžiť |
| `runWritebackTail()` | nie | nechať |

Retired from live tail:

| Krok | Mutuje text | Verdikt |
| --- | --- | --- |
| `normalizeWeirdWords()` | nie v live taile | zabité v globálnom taile |

---

## 3. Contracty a verdicty

### 3.1 `enforceSlovak()`

- `name`: `enforceSlovak`
- `input contract`: výstup už existuje; trigger nastáva len keď je aktívny `LANGUAGE_ENFORCER_ENABLED`
- `allowed mutation`: preklad alebo úprava do slovenčiny pri explicitne zistenom EN alebo mixed výstupe; zachovanie persony a významu
- `forbidden mutation`: dopĺňanie nových tvrdení, zmena tónu persony, tvorba nového obsahu mimo pôvodného významu
- `fallback condition`: žiadna autorská fallback veta; pri persistent EN po rewrite smie len ponechať best-available text a nastaviť explicitný guard reason
- `verdict`: `zúžiť`

Prečo:

- je to legitímny jazykový zásah, ale stále je to druhý LLM autor odpovede
- už nefallbackuje do natvrdo danej vety, ale stále vie výrazne prepísať odpoveď a je to najsilnejší zostávajúci rewrite krok
- zostáva povolený, ale musí byť zviazaný len na explicitný language verdict a auditovateľnú mutáciu

### 3.2 interný `stripResidualEnglish()`

- `name`: `stripResidualEnglish`
- `input contract`: text po language enforceri alebo text pred globálnym cleanupom
- `allowed mutation`: odstránenie zjavného reziduálneho anglického klišé alebo meta vety
- `forbidden mutation`: mazanie nosnej vety, mazanie semanticky kľúčovej informácie, vlastný fallback text pri vyprázdnení odpovede
- `fallback condition`: žiadna; ak po filtri nič nezostane, rozhodnutie musí urobiť vyšší guard, nie tento helper
- `verdict`: `nechať` — po odrezaní broad generic English phrase deletion

Prečo:

- authored fallback text už z helpera vypadol a broad generic English phrase deletion bola odrezaná
- helper teraz odstraňuje len explicitné assistant/meta vety bez diakritiky, takže je obhájiteľný ako úzky residual-English filter

### 3.3 `glitchNormalizeSk()`

- `name`: `glitchNormalizeSk`
- `input contract`: jazykový enforcer bol zapnutý a user input je primárne slovenský
- `allowed mutation`: drobné typo cleanup a glitch-čechizmy bez významovej zmeny
- `forbidden mutation`: zmena obsahu, pridanie nových viet, prepísanie tónu
- `fallback condition`: žiadna
- `verdict`: `nechať`

Prečo:

- ide o deterministický mikro-filter bez druhého LLM callu
- ak zostane úzky a typo-only, sedí s tail policy

### 3.4 `sanitizeAiCliches()`

- `name`: `sanitizeAiCliches`
- `input contract`: existuje text odpovede po predošlých cleanupech
- `allowed mutation`: odstránenie explicitných AI meta klišé typu „As an AI“, „som tu aby som ti pomohol“
- `forbidden mutation`: mazanie vecnej odpovede len preto, že veta znie formálne; vlastný fallback text pri vyprázdnení obsahu
- `fallback condition`: žiadna; prázdny výsledok musí riešiť vyšší explicitný guard
- `verdict`: `nechať` — po zúžení na explicitné assistant/self-reference vety

Prečo:

- samotný zákaz AI klišé je legitímny
- authored fallback veta už z helpera vypadla a broad generic style-removal patterny boli odrezané
- helper teraz filtruje len explicitné AI/assistant self-reference vety na sentence úrovni, takže už nehrá štýlovú políciu nad vecným obsahom

### 3.5 Global language failsafe

- `name`: global language failsafe
- `input contract`: Slovak-required output (user input `sk`, manifest/forceSlovak alebo explicitný `PERSISTENT_ENGLISH_AFTER_REWRITE`) a finálny text stále vyzerá prevažne anglicky po predošlom cleanupe
- `allowed mutation`: posledný bezpečnostný slovenský fallback pri jasne detegovanom EN úniku
- `forbidden mutation`: zásah do bežnej slovenskej odpovede, zásah bez explicitnej language detekcie
- `fallback condition`: explicitný language trigger plus heavy EN ratio trigger na finálnom texte
- `verdict`: `nechať`

Prečo:

- je to čistý last-line-of-defense safety switch
- trigger je explicitne meraný, logovaný a už nie je viazaný na obrátenú non-Slovak gate heuristiku

### 3.6 `cleanupWeirdSlovak()`

- `name`: `cleanupWeirdSlovak`
- `input contract`: text po sanitizácii a language failsafe
- `allowed mutation`: whitespace, interpunkcia, dedupe, zjavné typo opravy, emoji compaction
- `forbidden mutation`: prepísanie pojmov, nahrádzanie významových fráz, preklad koncepčných termínov bez explicitného triggeru
- `fallback condition`: žiadna
- `verdict`: `nechať` — po odrezaní semantic rewritov z live helpera

Prečo:

- helper je teraz zredukovaný na form-only cleanup: whitespace, interpunkcia, dedupe a emoji compaction
- po odstránení semantic rewritov už sedí s tail policy ako minimálny opravca formy

### 3.7 `normalizeWeirdWords()`

- `name`: `normalizeWeirdWords`
- `input contract`: historicky text po `cleanupWeirdSlovak()`; v current-state live taile už odpojené
- `allowed mutation`: žiadna v aktuálnej podobe; ak by mal prežiť, len ako veľmi úzky typo dictionary na explicitné halucinované tokeny
- `forbidden mutation`: globálne semantic phrase rewrites, tónové prepísanie, vulgarizačné alebo významové reinterpretácie
- `fallback condition`: žiadna
- `verdict`: `zabiť` — vykonané pre globálny live tail

Prečo:

- je to globálny vak ad hoc náhrad bez explicitného triggeru
- obsahuje desiatky meaning-changing replace pravidiel a presne porušuje zákaz „parafrázy pre istotu“
- ak niečo z neho má prežiť, musí sa rozpadnúť na úzke explicitne triggerované typo fixy mimo globálneho tailu

### 3.8 `applyFallbackTruth()`

- `name`: `applyFallbackTruth`
- `input contract`: existuje `deliberationMeta`; text už prešiel cleanup vrstvami
- `allowed mutation`: metadata-only normalizácia explicitne zadaného upstream `fallbackReason` na kanonický enum a zapísanie `accuracyFallback`
- `forbidden mutation`: text mutation; odhad fallback reason z empty/stub/canonical-fallback heuristík alebo z fuzzy podobnosti
- `fallback condition`: len explicitný upstream reason code
- `verdict`: `nechať` — po odrezaní heuristického domýšľania fallback dôvodu

Prečo:

- je to observability helper, čo je legitímne
- helper už po runtime reze neháda fallback dôvod z prázdneho, stub-like ani canonical-fallback správania
- ostal len ako metadata-only normalizér explicitne pomenovaného upstream fallback reason code

### 3.9 `validateGroundedResponse()`

- `name`: grounding compliance validator
- `input contract`: `groundingPrompt !== null` a detegovaný SP4 factual topic
- `allowed mutation`: výmena halucinovaného textu za deterministic factual block pri explicitne potvrdenom grounding violation
- `forbidden mutation`: zásah mimo grounding vetvy alebo bez explicitného violation verdictu
- `fallback condition`: `validationResult.violated === true`
- `verdict`: `nechať`

Prečo:

- je to ukážkový deterministic boundary replacement s explicitným triggerom
- presne sedí do tail policy

### 3.10 Confidence scoring + calibration

- `name`: unified confidence scoring and calibration
- `input contract`: final text a deliberation metadata už existujú
- `allowed mutation`: metadata-only skóre a label dôvery
- `forbidden mutation`: text replacement alebo text rewrite
- `fallback condition`: žiadna; len metadata cap/penalty
- `verdict`: `nechať`

Prečo:

- nemení text, len označuje dôveru a fallback penalty
- je to observability, nie druhý autor odpovede

### 3.11 Empty response guard

- `name`: production empty response guard
- `input contract`: `result.response` je prázdny alebo whitespace-only
- `allowed mutation`: persona-aware minimálny fallback na explicitne prázdny výstup
- `forbidden mutation`: replacement ne-prázdnej odpovede, znižovanie kvality pri normálnom texte
- `fallback condition`: `result.response.trim().length === 0`
- `verdict`: `nechať`

Prečo:

- trigger je explicitný a binárny
- ide o hard safety guard, nie o estetický rewrite

### 3.12 `runImmuneCheck()`

- `name`: `runImmuneCheck`
- `input contract`: existuje finálny candidate output a metadata
- `allowed mutation`: žiadna textová; len verdict, reason codes a immune metadata
- `forbidden mutation`: priama zmena `result.response`
- `fallback condition`: žiadna na úrovni evaluatora
- `verdict`: `nechať`

Prečo:

- evaluator dnes sám text nemení
- sedí s pravidlom „verdict-only evaluácia"

### 3.13 Immune soft retry

- `name`: immune soft retry
- `input contract`: immune severity je `soft`, retry ešte nebežal a existuje explicitný retry directive z reason codes
- `allowed mutation`: jeden retry attempt s plným logom; `repair_existing_output` len pre explicitný language fail a `answer_again` len pre `RELEVANCE_ZERO_OVERLAP` s truth anchorom
- `forbidden mutation`: druhý alebo neurčitý retry, `answer_again` bez truth anchoru, retry bez reason code, retry pre low-confidence relevance len preto, že odpoveď „nevyzerá dosť dobre“
- `fallback condition`: explicitný `getImmuneRetryDirective()` verdict; pri `answer_again` navyše truth anchor
- `verdict`: `nechať` — po odrezaní voľného relevance retry bez anchoru

Prečo:

- retry je explicitný, logovaný a po runtime reze už nepúšťa low-confidence relevance do druhého pokusu
- `answer_again` ostal len pre anchored zero-overlap vetvu; language repair zostal ako úzky repair-existing-output kontrakt namiesto voľného prepisovania odpovede od nuly

### 3.14 `applyPostImmuneResponseControl()`

- `name`: post-immune response control
- `input contract`: existuje immune verdict a prípadne retry metadata
- `allowed mutation`: deterministic replacement len pri explicitných reason codes alebo identity drift kontrakte
- `forbidden mutation`: replacement bez reason code alebo na základe „nízkeho pocitu kvality"
- `fallback condition`: explicitné reason codes ako meta leak, identity drift, hard relevance/language fail po retry
- `verdict`: `nechať`

Prečo:

- helper má jasný kontrakt aj reason-coded rozhodovanie
- je to najčistejší príklad povoleného post-immune replacera

### 3.15 `detectGeneralQualitySanityIssue()`

- `name`: general quality sanity guard
- `input contract`: response control sa neuplatnil a query type je v povolenej sade
- `allowed mutation`: len veľmi úzky replacement pri zjavne rozbitom, stub-like, encoding-zničenom alebo explicitne známom zlom fallback výstupe
- `forbidden mutation`: broad utility policing, tichý replacement pri „slabej“ odpovedi bez explicitného corruption triggeru
- `fallback condition`: explicitný stub/encoding/known-wrong-fallback trigger; nie len nízka utilita
- `verdict`: `nechať` — po odrezaní utility heuristík

Prečo:

- guard už po runtime reze drží len explicitný stub, mojibake a známy zlý canonical fallback output
- short-tech utility heuristiky, meta bleed a cross-topic tech bleed už z tejto vrstvy vypadli, takže helper prestal robiť estetickú políciu nad textom

### 3.16 `runWritebackTail()`

- `name`: `runWritebackTail`
- `input contract`: finálny output a metadata sú už rozhodnuté
- `allowed mutation`: side effects, memory writeback metadata, action processing, triggers, relationship evaluation, rule mining
- `forbidden mutation`: akákoľvek zmena `result.response`
- `fallback condition`: žiadna
- `verdict`: `nechať`

Prečo:

- helper dnes text nemení
- je to čistý writeback a observability tail

---

## 4. Najvyššie riziká

Najvyšší risk dnes nesú tieto body:

1. global language failsafe
   - trigger je už explicitný, ale stále je to tvrdý last-line replacement a treba priebežne kontrolovať, že sa nerozšíri späť na všeobecný rewrite guard

2. `enforceSlovak()`
   - už nepíše vlastnú fallback vetu, ale stále je to silný druhý autor odpovede a ďalší priestor na zúženie zostáva v trigger/prompt disciplíne rewrite vetvy

3. jazykový helper stack ako celok
   - sanitize/strip aj failsafe sú už úzke, ale stále treba prejsť celú language vrstvu naraz a potvrdiť, že sa jednotlivé guardy neprekryjú späť do druhého autora odpovede

Historicky najhorší globálny spoluautor `normalizeWeirdWords()` bol odpojený z live tailu v patchi `2026-04-11-015`.
`cleanupWeirdSlovak()` bol následne zúžený na form-only helper v patchi `2026-04-11-016`.
`sanitizeAiCliches()` a `stripResidualEnglish()` prestali vracať vlastné fallback vety v patchi `2026-04-11-017`.
`detectGeneralQualitySanityIssue()` bol následne zúžený na hard-corruption-only guard v patchi `2026-04-11-018`.
`applyFallbackTruth()` bol následne zúžený na explicitný reason-code normalizér v patchi `2026-04-11-019`.
Immune soft retry bol následne sprísnený na truth-anchored reason-coded kontrakt v patchi `2026-04-11-020`.
`sanitizeAiCliches()` a `stripResidualEnglish()` boli následne zúžené na explicitné meta-only sentence filtre v patchi `2026-04-11-021`.
`enforceSlovak()` následne prestal v call-site authorovať vlastnú fallback vetu a pri persistent EN už len drží best-available text plus explicitný guard reason v patchi `2026-04-11-022`.
Global language failsafe bol následne zúžený na explicitné language triggery namiesto obrátenej non-Slovak gate heuristiky v patchi `2026-04-11-023`.

---

## 5. Prvé odporúčané runtime zásahy

Ak sa pôjde po najmenšom bezpečnom scope, ďalšie poradie má byť:

1. znovu prejsť celý language helper stack ako jednu vrstvu a potvrdiť, že už nikde nevzniká druhý autor odpovede
2. ak po tomto full-stack prechode ostane ešte priveľká rewrite sila, zúžiť trigger/prompt disciplínu v samotnom `enforceSlovak()` bez návratu autorských fallback vetiev
3. až potom riešiť ďalšie language detaily ako heuristiky v `detectEnglish()` alebo jemné residual-English patterny, nie skôr

---

## 6. Záver

`runImmuneCheck`, `applyPostImmuneResponseControl`, grounding validator, empty response guard a writeback tail sú dnes obhájiteľné podľa runtime law.

Najväčší problém nie je v evaluatoroch, ale v helperoch, ktoré vyzerajú ako cleanup, no v skutočnosti ešte stále spoluautorujú odpoveď.

Presne tam sa rodia tiché chyby.

---

## 7. Quick Audit Entry (2026-04-24)

- Fáza 1 cleanup: canonical raw-log čítanie v consolidation flow, `/health` backend status (Ollama), zúžený agent-taxonomy follow-up trigger.
- Fáza 2 cleanup: `/today` bez debug/error šumu + deterministic fallback pri offline backende; `ritualNext` berie `l.user || l.input` a filtruje prázdne kontexty.
- `/consolidate`: ostáva honest info-path (manuálna konsolidácia nie je aktívna; scheduler/`npm run consolidate`).
- Writeback invariant fix: early guard returns už neobchádzajú persist path; fallback early-writeback rešpektuje explicitné write block pravidlá.
- Regression sweep (krátky): identity guardy, clarify flow, short-tech follow-up, slash/health smoke, write invariant.
- Verdikt sweepu: nepozorovaný double-write ani write mimo pravidiel v tomto rozsahu.
