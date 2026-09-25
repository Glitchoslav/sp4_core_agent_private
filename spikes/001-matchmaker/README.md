# Spike 001 — Matchmaker: nájde retrieval správnu skúsenosť?

**Otázka (od ChatGPT/Gemini):** Dokáže Parťák z niekoľkých desiatok skúseností vytvoriť
užitočné a vysvetliteľné spojenie — a vie povedať "nemám dôkaz" namiesto fabulácie?

**Metóda:** 30 syntetických slovenských skúseností (6 domén), 8 dopytov s ground-truth,
2 no-match dopyty. Porovnanie dvoch embedding modelov.

## Výsledky

| Model | top-1 | top-3 | no-match odmietnutý | Bezpečnostné zlyhanie |
|---|---|---|---|---|
| `Xenova/all-MiniLM-L6-v2` (ANGLICKÝ, aktuálny SP4 default) | 6/8 | 6/8 | **0/2** | áno (lítiová batéria → smútok) |
| `Xenova/paraphrase-multilingual-MiniLM-L12-v2` | 5/8 | 7/8 | 1/2 | áno (resuscitácia → smútok) |

### Kľúčové čísla (no-match = "fabulácia spojenia")

- Anglický model: "thajská kari omáčka" → **0.587**, "bonsaje" → **0.555** (prakticky všetko
  sa tvári ako match; threshold 0.3 je nezmysel).
- Multilingválny model: "thajská kari" → **0.171** ✅, ale "bonsaje" → **0.418** ❌.

### Kritické zlyhanie (bezpečnostná hranica)

- "Čo robiť, keď horí lítiová batéria?" → anglický model vrátil **smútok po strate blízkeho**
  (#23, 0.56) namiesto batériovej skúsenosti (#1).
- "Ako správne robiť resuscitáciu?" → multilingválny model vrátil **smútok** (#23, 0.49).

Oba prípady = presne ten scenár, pred ktorým varoval Gemini (ADR-004): lokálny model nemá
kapacitu rozlíšiť bezpečnostný dotaz od bežného.

## Verdict: INVALIDATED (s jasnou cestou nápravy)

### Čo fungovalo
- Pipeline (embedding + kosínová + retrieval) beží mechanicky správne.
- Multilingválny model výrazne zlepšil odmietanie no-match (0.587 → 0.171 pre kari).

### Čo nefungovalo
1. **Anglický `all-MiniLM-L6-v2` je pre slovenčinu nepoužiteľný** — fabuluje spojenia na
   úrovni 0.55+ pre úplne nesúvisiace dopyty.
2. **Fixed threshold 0.3 je svojvoľný.** Skóre správnych (0.49–0.87) a nesprávnych (0.17–0.42)
   výsledkov sa prekrývajú v pásme 0.4–0.5 — jeden prah ich neoddelí.
3. **Váhy (overenie/aktuálnosť) nezachránia zlé embeddingy.** Re-rank v TEST 3 takmer nič
   nezmenil, lebo sémantický rozdiel dominoval.
4. **Bezpečnostné zlyhanie** (lítiová batéria / resuscitácia → smútok) u oboch modelov.

### Odporúčanie pre reálny build
1. **Povinne multilingválny model** (paraphrase-multilingual alebo multilingual-e5) — anglický je non-starter.
2. **Kalibrácia prahu na reálnych dátach**, nie fixed 0.3. Plus tzv. cross-encoder re-rank na
   synonymá/doménové termíny (resuscitácia, extrikácia).
3. **Hard-coded doménové kľúčové slová** (Gemini ADR-004): resuscitácia, lítiová batéria,
   extrikácia → prepnutie do režimu "overený postup", na úrovni kódu, nie AI.
4. Bezpečnostný dotaz nesmie nikdy skončiť na osobnej skúsenosti — toto potvrdil test empiricky.

## Súbory
- `test.mjs` — anglický model (baseline)
- `test_multilingual.mjs` — multilingválny model
- `README.md` — tento dokument
