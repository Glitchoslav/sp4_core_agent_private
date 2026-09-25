# SP4 — Architektonický briefing

> Dokument na diskusiu s Claude (Opus/Sonnet/Haiku) alebo GPT. Je sebestačný —
> nepredpokladá prístup do repa. Všetky fakty nižšie sú overené na živom systéme.

---

## 1. Čo je SP4

SP4 OS (Sovereign Protocol 4 Autonomy) je lokálny AI operačný systém v Node.js (v1.4.0).
Beží na stroji používateľa, modely cez lokálnu Ollamu, filozofia **local-first / privacy-first /
"nie appka, ale parťák"**. Multi-agent so 4 persónami (CORE, GLITCHOSLAV, POPIČI, VALIDATOR),
hierarchická pamäť, scheduler, action layer. Cloud je **len opt-in** (flag `SP4_ALLOW_CLOUD`),
default je local-first.

Autor: Kefyk + SP4 komunita. Repo: `C:\SP4KULT\sp4_core_agent` (git, branch `codex/m2-memory-db`).

---

## 2. Aktuálny stav (overené)

- **`doctor`:** DEGRADED — ale len preto, že cloud egress je vypnutý (zámer). Zvyšok OK.
- **Pamäť:** 611 záznamov. `data/memory.json` (`rawMemory.log`) + SQLite `sp4-memory.db` (FTS5, SQLCipher tiers).
- **Ollama:** 14 modelov nainštalovaných.
- **Konfigurácia modelov (`.env`):**
  - `PRIMARY_MODEL=gemma3:4b`
  - `FALLBACK_MODEL=llama3.2:3b`
  - `USE_CLOUD_FALLBACK=false`
- **Architektúra:** *split-brain* — paralelne existujú dva svety (detail v sekcii B).

---

## 3. Čo sa práve opravilo (context, aby si to nerobil znova)

Bug: routing mal hardcodovaný model `qwen3:8b`, ktorý **nie je nainštalovaný** v Ollame.
S persónou glitchoslav (+2 skóre) padali bežné otázky do "bezny" tier → Ollama HTTP 404 →
Ollama označená UNHEALTHY → prázdna odpoveď → fallback stub ("Toto nebolo trafené").

Oprava (commit `a189817`): lokálne tiery teraz berú model z `PRIMARY_MODEL` (`.env`), žiadny
hardcoded názov. Súbory: `src/routing/classify.js`, `src/llm/ollamaClient.js`, `src/agents/kurator.js`.

---

## 4. Otvorené rozhodnutia (o čo ťa žiadame)

### A. Model selection: benchmark registry vs konfigurácia (najdôležitejšie)

V kóde sú **dva zdroje pravdy o tom, ktorý model použiť**, a nie sú zosynchronizované:

1. **Konfigurácia** (`runtimeFacts.js`, `sp4os/llmLocal.js`, `.env`):
   primary = `gemma3:4b`, fast-path = `llama3.2:3b`.
2. **Benchmark registry** (`src/core/localModelRegistry.js`):
   merané skóre "general" role — `qwen3.5:4b` = **57.92/70** (WEAK_CANDIDATE),
   `gemma3:4b` = **41.92/70** (WEAK_CANDIDATE), `qwen3:4b` = INCONCLUSIVE_CONTAMINATED
   (think markup leakoval). Žiadna rola nemá `productionThreshold` schválený.

Registry má mechanizmus `resolveModelForRole(role, { legacyModel, runtimeStates, mode })`
s `mode = advisory | enforce` a `legacyModel` fallbackom — ale **`classify.js` ho vôbec nepoužíva**
a rieši model po svojom.

**Otázky:**
- Má routing preferovať benchmark-best (`qwen3.5:4b`) alebo konfigurovaný primary (`gemma3:4b`)?
- Má sa `qwen3.5:4b` povýšiť na primary (cez `.env`), alebo zostane `gemma3:4b`?
- Ako správne prepojiť `classify.js` s registry bez toho, aby sa zaviedol nový "model, čo neexistuje"?

### B. Monolit vs nový `src/` strom

Dva paralelné svety kódu:
- **Root monolit** (legacy): `integration.js` (176 KB), `index_v07.js` (57 KB), `bridge-server.js` (99 KB).
- **Nový modulárny `src/`** (24 adresárov, `src/core/` 54 súborov): routing, llm, registry, immune, pipeline.

Routing v live behu sa dotýka **oboch** vrstiev naraz (odtiaľ ten chaos v logoch).

**Otázka:** dokončiť migráciu na `src/` a odstaviť monolit, alebo jasne oddeliť legacy?
Aký je realistický plán postupného prechodu bez rozbitia live behu?

### C. `confidence=0.00` → pattern fallback

V živých logoch je **vždy** `Low confidence (0.00) → pattern fallback`. Intent/confidence
klasifikátor nevracia reálne skóre, takže polovica pipeline (pattern fallback, orchestration)
je fakticky slepá.

**Otázka:** opraviť confidence vrstvu, alebo ju zjednodušiť/odstrániť? Kde je zdroj toho 0.00
(`src/routing/`, `src/immune/`, orchestration)?

### D. Provider routing "podľa potreby"

SP4 *má* routing: `classify.js` (deterministický scoring náročnosti → tier trivial/bezny/komplexny/hlboka),
`llmRouter.js` (Ollama → cloud fallback), `litellmClient.js` (LiteLLM gateway, 5 vrstiev), policy vrstva.
Ale provider selection je **binárna**: local-first (cloud blokovaný) ALEBO cloud opt-in.
Nie je tam "táto otázka potrebuje cloud, táto nie".

**Otázka:** ako spraviť jemný routing podľa náročnosti (lokálny 4b pre triviálne, cloud pre ťažké),
rešpektujúc `SP4_ALLOW_CLOUD` opt-in a privacy-first filozofiu?

### E. (Voliteľné) Hermes proxy ako smart cloud tier

Existuje nápad napojiť SP4 na `hermes proxy` (OpenAI-kompatibilný endpoint Hermes agenta),
ktorý sám routuje na viacero providerov (Claude/GPT/Gemini/DeepSeek). Čiže: lokálne pre
jednoduché/súkromné, Hermes pre ťažké. Filozofický konflikt s "no corporate cloud" — riešiteľný
cez existujúci opt-in. **Otázka:** má to zmysel a kam presne to napojiť (LiteLLM egress?).

---

## 5. Kľúčové súbory

| Súbor | Čo robí |
|---|---|
| `src/routing/classify.js` | Deterministický scoring náročnosti → tier + model |
| `src/core/localModelRegistry.js` | Benchmark registry, `resolveModelForRole()` |
| `src/llm/llmRouter.js` | Orchestrácia: Ollama → cloud fallback |
| `src/llm/ollamaClient.js` | Ollama wrapper (timeout, retry, health, fallback chain) |
| `src/llm/litellmClient.js` | LiteLLM cloud gateway (5 vrstiev) |
| `sp4os/llmLocal.js` | Kompat vrstva: `PRIMARY_MODEL`, `FAST_PATH_MODEL` |
| `src/core/runtimeFacts.js` | Deterministický snapshot (primary/fast-path modely) |
| `src/llm/llmLocal.js` → pozri `sp4os/llmLocal.js` | — |
| `integration.js` / `index_v07.js` / `bridge-server.js` | Root monolit (legacy) |
| `.env` | `PRIMARY_MODEL`, `FALLBACK_MODEL`, cloud flags |

---

## 6. Obmedzenia / čo NEMENIŤ

- **Filozofia:** local-first, privacy-first, žiadny korporátny cloud v core. Cloud len opt-in.
- **Konfiguračné rozhodnutie:** primary = `gemma3:4b` — nemeniť potichu; zmena len cez `.env` a vedome.
- **Nainštalované modely (Ollama):** qwen2.5-coder:7b, phi4-mini:3.8b, qwen3.5:4b, qwen3.5:0.8b,
  qwen3:4b, gemma3:4b, deepseek-coder:6.7b, llama3.2:3b, phi3:mini, sp4-popici:latest (vlastný),
  gemma3:1b, gemma:7b-instruct, qwen2.5:7b, llama3:8b.
- **NENAINŠTALOVANÉ, ale v kóde odkazované:** `qwen3:8b`, `qwen2.5:14b`, `gemma3:12b` —
  toto je zdroj 404 bugov. Nepoužívať ich v routing defaultoch.
- **Benchmark realita:** lokálne 4b modely sú slabé (41–58/70). Lokálna AI nebude "múdra"
  bez cloudu. Toto je tvrdý strop, nie bug.

---

## 7. Čo od teba chceme (formát výstupu)

1. **Pre bod A** — konkrétne odporúčanie (benchmark vs config) + presný postup prepojenia
   `classify.js` ↔ `localModelRegistry` (ktoré funkcie, aký mode: advisory/enforce, kde `legacyModel`).
2. **Pre bod B** — realistický plán migrácie monolit → `src/` (fázy, čo sa môže rozbiť).
3. **Pre body C a D** — príčina + minimálna oprava, nie veľký prepis.
4. **Pre bod E** — áno/nie + kde presne napojiť.

Ak niečo chýba, pýtaj sa. Ale preferované sú **konkrétne, technické odpovede**, nie všeobecná analýza.
