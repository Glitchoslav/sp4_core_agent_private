# CLAUDE CODE — Tasky pre SP4

> Pre Claude Code (má prístup do repa). Sebestačný, presné cesty. Overené na živej
> codebase 25.9.2026. Branch: `codex/m2-memory-db`. Existujúci commit `a189817`
> (fix `qwen3:8b`) je už spravený — neopakuj ho.

---

## 0. Kontext

SP4 OS = local-first AI OS, Node.js, multi-agent (4 persóny: CORE/GLITCHOSLAV/POPIČI/VALIDATOR),
Ollama lokálne, privacy-first. Filozofia "kmeň nie cloud" — cloud len opt-in cez `SP4_ALLOW_CLOUD`.

**Konfigurácia modelov (`.env`):**
- `PRIMARY_MODEL=gemma3:4b`
- `FALLBACK_MODEL=llama3.2:3b`
- `USE_CLOUD_FALLBACK=false`

**Architektúra:** split-brain — root monolit (`integration.js` 176 KB, `index_v07.js` 57 KB,
`bridge-server.js` 99 KB) + nový modulárny `src/` (24 adresárov, `src/core/` 54 súborov).
Obe vrstvy bežia paralelne; routing v live behu sa dotýka oboch.

## 1. Overené fakty — neoveruj znovu, neopakuj cudzie chyby

- **Benchmark `qwen3.5:4b` (57.92/70) je ČISTÝ.** Bežal s `think:false`, 0 think únikov
  (report `tests/benchmarks/general-championship-round1/results/general-championship-round1-report.md`,
  riadok 14: `qwen3.5:4b=0, qwen3:4b=6, gemma3:4b=0`). Kontaminácia bola len `qwen3:4b`,
  čo registry už správne označil `INCONCLUSIVE_CONTAMINATED`. **Neodporúčaj re-benchmark pre kontamináciu.**
- **`confidence=0.00` NIE JE bug.** V `src/core/modeCompass.js:292-316` ide o keyword scorer
  (`src/core/quickAnalyzer.js`), ktorý legitímne vráti 0, keď input nemá keyword match, a korektne
  spustí `_detectModeWithConfidence()`. Funguje to správne. Jediný problém je zavádzajúci log text.
- **`think:false` sa už posiela správne** ako top-level field (`src/llm/ollamaClient.js:274`,
  `requestBody.think = false` pre `qwen3*` modely). Nerob to znova.

## 2. Úlohy — v poradí priority

### P0 — Reálny bug (oprav dnes)

**T1. `src/llm/ollamaClient.js` — 404 scoping bug.**
Keď Ollama vráti HTTP 404 (model neexistuje), kód to v záverečnom bloku po host-slučke
(~riadky 417-431) berie rovnako ako výpadok siete a nastaví `OLLAMA_UNHEALTHY=true`.
Jeden zlý tag (`qwen3:8b`) tak otrávil celú health state → prázdne odpovede + "Toto nebolo trafené".

Požadované správanie:
- HTTP 404 (model not found) → `{ ok:false, error:'MODEL_NOT_FOUND', model }` **bez**
  `OLLAMA_UNHEALTHY` a bez `consecutiveFailures++`.
- `OLLAMA_UNHEALTHY` nastavuj len pri network error / timeout (keď je služba fakt dole).
- Pozri `errorType` klasifikáciu v catch bloku (~riadok 370): `TIMEOUT | NETWORK | HTTP_ERROR`.
  Rozlíš HTTP_ERROR so statusom 404 (resp. 4xx "not found") od ostatných.

### P1 — Guards proti opakovaniu

**T2. `sp4.js doctor` / `tools/doctor.js` — `/api/tags` guard.**
Doctor nech hard-failuje (alebo WARN), ak `PRIMARY_MODEL` alebo `FALLBACK_MODEL` nie je
v `GET /api/tags` (zoznam nainštalovaných modelov).

**T3. Unit test na model-tag literály.**
Test, ktorý greppe `src/` aj monolit na string literály tvaru `<model>:<tag>` mimo `.env`
a `localModelRegistry.js`, a failuje na neexistujúce modely. Cieľ: zachytiť `qwen3:8b`,
`qwen2.5:14b`, `gemma3:12b`.

**T4. Dočisti zvyšné neexistujúce modely:**
- `src/core/modelCapabilities.js:35,111` — `qwen2.5:14b` (nie je nainštalovaný). Over
  `grep -rn "modelCapabilities" src/` — ak súbor nikto neimportuje (mŕtvy kód), zmaž ho alebo oprav model.
- `src/llm/ollamaClient.js:66` — `gemma3:12b` v `modelForHost` passthrough (nie je nainštalovaný).

### P2 — Architektúra (každé s vlastným commitom)

**T5. Prepojiť `classify.js` ↔ `localModelRegistry` (advisory mode).**
Pridaj `resolveTierModel(tier, ctx)` (napr. `src/routing/modelResolver.js`), ktorý:
- `legacyModel = PRIMARY_MODEL` (zo `sp4os/llmLocal.js`), nikdy nie literál.
- `runtimeStates` z `/api/tags` (cache, refresh každých N minút).
- volá `resolveModelForRole(role, { legacyModel, runtimeStates, mode:'advisory' })`.
- v advisory mode je served model **vždy** legacy; divergencia sa len loguje.
- ak served nie je nainštalovaný → `FALLBACK_MODEL` (`llama3.2:3b`).
Nepromovať `qwen3.5:4b` bez explicitného `productionThreshold` + viditeľného `.env` commitu.

**T6. Provider policy table (fail-closed).**
Nový `src/llm/providerPolicy.js`: map `tier → provider` (default všetko local). Cloud len ak
`SP4_ALLOW_CLOUD=true`, a **nikdy** pre `sensitivity==='private'` (retrieved memory,
action-layer context, persona-private state). Fallback "Ollama → cloud" v `llmRouter.js` musí
prejsť cez `selectProvider()` znova. Logovať `{requestId, tier, provider, reason, model}` bez payloadu.

**T7. Monolith strangler — Phase 0 (žiadna zmena správania).**
`requestId` na vstupe (asi `bridge-server.js`), prepúšťať cez všetky volania; každý log
`{requestId, layer:'legacy'|'src'}`. Characterization testy (~30 promptov na persónu,
zaznamenať tier/model/persónu, assert v CI). Cieľ: zviditeľniť, ktoré cesty `integration.js`
sú ešte live.

### P3 — Nízka priorita

**T8. Preformulovať misleading log** v `src/core/modeCompass.js:313`
("Low confidence (0.00) → pattern fallback" → napr. "no keyword match → pattern fallback"). Kozmetika.

**T9. Windows path bug** v `tests/test_litellm_canonical_egress.js:44` —
`rel.startsWith('tests/')` nefunguje na Windowse (backslashes). Použi `path.sep` alebo normalizuj.
(Toto spôsobuje 2 pre-existujúce faily v `npm test`.)

### P4 — Odložené (najprv overiť / rozhodnúť)

**T10. Hermes proxy integrácia** — pred implementáciou overiť porty a adaptery Hermes
(chat-Claude uviedol `8642`/`8645` a "len Nous Portal a xAI", sám upozornil že sa to mení).
Overiť proti živým Hermes docs, než sa na to čokoľvek napojí.

**T11. Decentralizovaná multi-node platforma** (messenger + súbory + poloha + spoločná AI
pre "kmeň") — samostatná architektonická diskusia, nie kód teraz.

## 3. Pravidlá (neporuš)

- **NEMENIŤ `PRIMARY_MODEL`** bez viditeľného `.env` commitu + vedomého rozhodnutia.
- **Cloud len opt-in.** Nič, čo sa dotkne súkromnej pamäte, nesmie ísť na cloud (ani ako fallback).
- **Conventional commits** (viď `git log`): `fix(scope): ...`, `feat(scope): ...`.
- Po každom P0/P1: spusti `node --test tests/classify.test.mjs`, `node tests/test_ollama_fallback.js`.
- `npm test` má pre-existujúci Windows fail (T9) — nezľakni sa ho, nesúvisí s tvojimi zmenami.

## 4. Nainštalované modely (Ollama `ollama list`)

qwen2.5-coder:7b, phi4-mini:3.8b, qwen3.5:4b, qwen3.5:0.8b, qwen3:4b, gemma3:4b,
deepseek-coder:6.7b, llama3.2:3b, phi3:mini, sp4-popici:latest, gemma3:1b, gemma:7b-instruct,
qwen2.5:7b, llama3:8b.

**Nenainštalované (nepoužívať v defaultoch):** `qwen3:8b`, `qwen2.5:14b`, `gemma3:12b`.
