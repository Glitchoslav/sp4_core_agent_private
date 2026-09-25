# P1/P2 fix proposal — živý log audit (2026-09-25)

Zdroj: audit live logu (`ukazkyLIVEaiSP4.txt`) + overenie v kóde (read-only) na `2967c83`.
Každý bod: test najprv (RED) → fix (GREEN) → samostatný conventional commit. Bez pushu.

## Rozhodnutia majiteľa

1. Mŕtve súbory z bodu 1 → **zmazať** `src/commands/mirrorCommand.js` a `src/services/conversationMirror.js`.
2. Kanonické počítadlo interakcií (9c) → **`rawMemory.log.length`**.
3. Bod 5 → najprv **minimálna oprava** (regex vzory opráv). „Vždy posielať posledné výmeny“ je **odložené** na strangler (T7) s characterization testami — mení prompt pre všetky odpovede.
4. Bod 4 → **súhlas**: guardy dostanú `confidenceSource:'deterministic'` (nie `1.0`), LLM scorer štartuje na **0.7**. Overiť, či `test_metadata_contract` nevyžaduje ≥ 0.9.

**Poradie:** 3 → 2 → 1 → 8 → 9 → 7 → 4 → 5.
Bod 3 prvý — truth bug (SP4 si vymýšľa o vlastnej cloud policy), horší než zhodená požiadavka.

---

## 3 · Vymyslená rada o cloude (truth bug)

- **Príčina:** `SP4_POLICY_FACTS` (`src/core/sp4GroundingKnowledge.js`) sa pri policy téme vkladá do promptu a je zastaraný: Groq/Google (dnes jediný kanál LiteLLM), režim `autonomous-cloud`, metadata kontrakt s `cloudAllowed`. Model z neho radí neexistujúce prepínače.
- **Oprava:** zosúladiť s realitou — cloud len cez LiteLLM; zapína ho operátor (`SP4_ALLOW_CLOUD=true`) + súhlas v requeste + `sensitivity:'public'` (T6); súkromný obsah nikdy; **v chate neexistuje príkaz na zapnutie cloudu**. Bez Groq/Google/`autonomous-cloud`/metadata kontraktu.
- **Test:** knowledge block pre „ako zapnem cloud?“ neobsahuje `Groq|Google|autonomous-cloud|cloudAllowed`, obsahuje `SP4_ALLOW_CLOUD` a „neexistuje príkaz“.

## 2 · Vulgarizmus zahodí požiadavku

- **Príčina:** `shouldUsePopiciEdgeShortcut` (`src/routing/deterministicRegistry.js`) vráti pevnú vetu „Ta brate, bordel pomenovaný…“ pri akomkoľvek slove z rant-regexu (`kurva`, …), ak správa neobsahuje technické kľúčové slovo.
- **Oprava:** skratka len pre čistý výlev bez obsahu (po odstránení vulgarizmov/výplne ostanú ≤ ~2 slová); inak normálny POPIČI LLM s pôvodným textom.
- **Test:** `"kurva, zas bordel"` → true; `"kurva, oprav mi tento skript na zálohu"` → false; `"kurva, prečo mi nejde git push"` → false; E2E cez integration s mockom Ollamy: odpoveď nie je pevná veta.

## 1 · `/mirror` psychologizuje

- **Príčina:** CLI `/mirror` → `rituals.js` `ritualMirror` (nie `mirrorCommand.js`). Prompt: „Čo ma teraz naozaj trápi?“, systém „Buď úprimný, dokonca bolestný… Pomáhaj užívateľovi vidieť pravdu o sebe“, + „Burnout risk“. `handleRitual` ignoruje argument dní (vždy 7).
- **Oprava:** vecné pozorovanie (opakujúce sa témy/otázky), bez diagnóz; burnout len ako dátový bod, keď ho `checkTriggers` naozaj vráti; `args` → `ritualMirror(days)`; zmazať mŕtve `mirrorCommand.js` + `conversationMirror.js`.
- **Test:** prompt neobsahuje `trápi|bolestn|pravdu o sebe|vyhoren`; `/mirror 3` filtruje 3 dni.

## 8 · Embeddingy sa počítajú každé kolo (výkon)

- **Príčina:** `integration.js` volá `loadMemory()` (čerstvý parse `memory.json`) → `computeMemoryEmbeddings` zapisuje embeddingy do dočasnej kópie, ktorá sa neuloží → ~660 embeddingov každé kolo.
- **Oprava:** in-process `Map` cache v `sp4os/ragLocal.js` s kľúčom `sha1(text)`; do `memory.json` sa nič nezapisuje.
- **Test:** druhý `retrieveRelevantMemories` na čerstvom stave nevolá model pre položky pamäte; zmena textu prepočíta len danú položku.

## 9 · Diagnostika

- **(a) `/whoami`:** `Chceš ${intent}.` → „Chceš chcem…“. Oprava: „Tvoj zámer: …“. Test: intent „chcem žiť naplno“ → bez „Chceš chcem“.
- **(b) `/language_stats`:** `retriesSuccessful / (englishDetected || 1)` → 0.0 % pri nule angličtiny. Oprava: `n/a`. Test na obe vetvy.
- **(c) „stranger (164)“:** `/help` ukazuje `relationship.metrics.interactionCount`, progresia počíta `rawMemory.log.length` + 4 faktory. Oprava: kanonicky `rawMemory.log.length` a status ukáže chýbajúci faktor. Test: 164 interakcií, `depth` pod prahom → „chýba: depth“.

## 7 · `policy. cloudAllowed` (príčina neznáma)

- `glitchNormalizer` medzeru za bodku **nepridáva**; jediný kandidát v kóde (`enforcePopiciTone`, split na holej bodke + `join('. ')`) nikto nevolá.
- **Postup:** test, ktorý pošle `"Nastav policy.cloudAllowed na false."` cez post-processing kroky v poradí z `integration.js` a lokalizuje krok. Fix až potom.
- Nezávisle: `glitchNormalizeSk` nemá meniť `` `inline` `` / ```` ``` ```` kód ani zhlukovať medzery v kódových blokoch.

## 4 · Confidence 1.000

- **Príčina:** 11× `confidenceScore: 1.0` v `integration.js`; `calculateConfidenceScore` štartuje na 1.0 a len odpočítava zistené problémy.
- **Oprava (schválená):** guardy `confidenceSource:'deterministic'`; LLM scorer neutrálny štart 0.7.
- **Test:** `calculateConfidenceScore({})` < 0.9; guard výsledky majú `confidenceSource:'deterministic'`; `test_metadata_contract` prechádza.

## 5 · Oprava stratí kontext

- **Príčina:** `isFollowUpQuestion` (`src/dialogue/dialogueState.js`) nemá vzory opráv; predošlá replika ide do promptu len pri follow-up regexe.
- **Oprava (schválená, minimálna):** vzory `^nie\b`, `to som nemyslel`, `zle si (ma )?pochopil`, `myslel som tým`, `nie tak` — pritom samotné „myslel som X“ ostáva novou témou.
- **Test:** „nie, to som nemyslel, išlo mi o X“ → `followUp:true` s `prevAssistantText`; „myslel som docker“ ostáva nová téma; `routing_characterization` prechádza.
