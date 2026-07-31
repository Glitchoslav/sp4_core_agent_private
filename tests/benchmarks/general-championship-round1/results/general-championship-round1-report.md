# SP4 LOCAL AI WORLD CHAMPIONSHIP - GENERAL DIVISION / ROUND 1

Generated: 2026-07-31T05:54:09.001Z

## Fair play

- Models: `qwen3.5:4b`, `qwen3:4b`, `gemma3:4b`
- System prompt: `Si presný GENERAL worker. Dodrž presne formát a obmedzenia používateľa. Odpovedaj po slovensky, ak používateľ nežiada iba JSON. Ak údaj nemáš, otvorene povedz, že ho nevieš; nič si nevymýšľaj.`
- Options: `{"temperature":0,"seed":42,"num_ctx":4096,"num_predict":384}`
- Thinking: disabled equally with `think: false`
- Timeout: 90000 ms
- Warm repetitions: 3
- Quality scoring: deterministic PASS/FAIL validators in `cases.mjs`
- Literal think markup in response content: qwen3.5:4b=0, qwen3:4b=6, gemma3:4b=0
- Quality runs ending at output limit: qwen3.5:4b=0/36, qwen3:4b=31/36, gemma3:4b=0/36

## Model inventory

| Model | Digest | Size | Available |
| --- | --- | ---: | --- |
| qwen3.5:4b | 2a654d98e6fba55d452b7043684e9b57a947e393bbffa62485a7aac05ee4eefd | 3.39 GB | yes |
| qwen3:4b | 359d7dd4bcdab3d86b87d73ac27966f4dbb9f5efdfcc75d34a8764a09474fae7 | 2.50 GB | yes |
| gemma3:4b | a2af6cc3eb7fa8be8504abaf9b04e88f17a119ec3f04a3addf55f92841195f5a | 3.34 GB | yes |

## Head-to-head

| Metric | qwen3.5:4b | qwen3:4b | gemma3:4b |
| --- | ---: | ---: | ---: |
| Factual/general | 20/20 (8/8) | 0/20 (0/8) | 17.5/20 (7/8) |
| Reasoning | 10/15 (4/6) | 0/15 (0/6) | 5/15 (2/6) |
| Slovak | 6.67/10 (4/6) | 0/10 (0/6) | 6.67/10 (4/6) |
| Instruction following | 10/10 (5/5) | 0/10 (0/5) | 4/10 (2/5) |
| Summarization | 5/5 (4/4) | 0/5 (0/4) | 3.75/5 (3/4) |
| Practical help | 1.25/5 (1/4) | 0/5 (0/4) | 0/5 (0/4) |
| Anti-hallucination | 5/5 (3/3) | 0/5 (0/3) | 5/5 (3/3) |
| Warm latency | 19066.77 ms (4.49/12) | 7139.29 ms (12/12) | 12485.76 ms (6.86/12) |
| tok/s | 10.43 (1.5/8) | 55.47 (8/8) | 31.33 (4.52/8) |
| Cold load | 8039.38 ms (2.08/4) | 4175.32 ms (4/4) | 6090.02 ms (2.74/4) |
| Resource efficiency | 3.18/6 | 6/6 | 4.91/6 |
| TOTAL | **69.17/100** | **30/100** | **60.95/100** |

## Qualification warning

- Quality totals before performance: `qwen3.5:4b` 57.92/70, `qwen3:4b` 0/70, `gemma3:4b` 41.92/70.
- A podium position follows the declared 70/30 formula; it is not evidence that the model is safe to switch into production.
- `qwen3:4b` raw speed is not useful GENERAL throughput in this configuration: 0/36 quality tests passed.

## Cold and warm detail

| Model | Cold wall | Cold load | Cold prompt eval | Cold generation | Cold tokens | Cold tok/s | Warm wall median (min-max) | Warm tok/s median (min-max) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| qwen3.5:4b | 27877.28 ms | 8039.38 ms | 328.94 ms | 19306.99 ms | 201 | 10.41 | 19066.77 ms (18982.92-21523.72) | 10.43 (10.08-10.59) |
| qwen3:4b | 11340.08 ms | 4175.32 ms | 106.55 ms | 6915.47 ms | 384 | 55.53 | 7139.29 ms (7138.07-7141.46) | 55.47 (55.36-55.53) |
| gemma3:4b | 19349.62 ms | 6090.02 ms | 93.51 ms | 12731.95 ms | 384 | 30.16 | 12485.76 ms (12449.33-12776.67) | 31.33 (31.16-31.38) |

## Podium

### WORLD CHAMPION - GENERAL

Model: `qwen3.5:4b`
Reason: highest transparent total, 69.17/100.

### SECOND PLACE

Model: `gemma3:4b`
Reason: second-highest transparent total, 60.95/100.

### THIRD PLACE

Model: `qwen3:4b`
Reason: third-highest transparent total, 30/100.

## Role verdict

- Best knowledge/reasoning model: `qwen3.5:4b (30/35 points)`
- Best instruction/summarization model: `qwen3.5:4b (15/15 points)`
- Best Slovak/practical/truthfulness model: `qwen3.5:4b (12.92/20 points)`
- Highest raw warm generation speed: `qwen3:4b` (raw throughput only; see qualification warning)

## Failures by model

### qwen3.5:4b

- `REASON-01`: expected exact text "3"
- `REASON-04`: expected exact text "sobota"
- `SK-02`: missing uvoľn\|ukonč\|vyčist
- `SK-03`: missing aktivitu\|činnosť\|urob
- `PRACT-01`: words 84 > 70
- `PRACT-02`: words 93 > 70
- `PRACT-04`: missing neklik\|neotvár; missing nahlás\|zmaž\|bezpečnost

### qwen3:4b

- `FACT-01`: expected exact text "Bratislava"
- `FACT-02`: words 252 > 3
- `FACT-03`: expected exact text "Jupiter"
- `FACT-04`: missing energi\|potrav\|cukor; words 233 > 40; sentences 24 > 1; language-shape
- `FACT-05`: missing krátkodob\|aktuáln; missing dlhodob\|priemer; words 207 > 55; sentences 24 > 2; language-shape
- `FACT-06`: expected exact text "euro"
- `FACT-07`: expected exact text "10"
- `FACT-08`: words 199 > 45; sentences 14 > 1; language-shape
- `REASON-01`: expected exact text "3"
- `REASON-02`: expected exact text "42"
- `REASON-03`: expected exact text "NIE"
- `REASON-04`: expected exact text "sobota"
- `REASON-05`: expected exact text "9"
- `REASON-06`: expected exact text "Anna"
- `SK-01`: missing obnov\|vráti; missing strat\|poškod\|zlyh; words 275 > 45; sentences 22 > 2; language-shape
- `SK-02`: missing uvoľn\|ukonč\|vyčist; words 254 > 40; sentences 21 > 1; language-shape
- `SK-03`: missing aktivitu\|činnosť\|urob; forbidden realizácia predmetnej aktivity bude uskutočnená; words 227 > 18; sentences 19 > 1; language-shape
- `SK-04`: expected exact text "My sme včera išli domov."
- `SK-05`: words 227 > 35; sentences 22 > 1; language-shape
- `SK-06`: missing pria\|žel; missing úspech\|šťast\|podar; words 239 > 30; sentences 20 > 1; language-shape
- `INSTR-01`: expected exact text "kontrola,rýchlosť,súkromie"
- `INSTR-02`: expected exact text "LOKÁLNY MODEL"
- `INSTR-03`: invalid-json: Unexpected token 'O', "Okay, let'"... is not valid JSON
- `INSTR-04`: bullets 0 != 2; missing offline\|internet\|kontrol\|rýchl
- `INSTR-05`: expected exact text "42"
- `SUM-01`: bullets 6 > 2; words 232 > 50; language-shape
- `SUM-02`: words 239 > 35; sentences 17 > 1; language-shape
- `SUM-03`: words 257 > 40; language-shape
- `SUM-04`: words 246 > 30; sentences 17 > 1; language-shape
- `PRACT-01`: missing nezapín\|neskúš; missing servis\|vyschn; words 302 > 70; language-shape
- `PRACT-02`: missing kábel\|kontrolk\|poskytovateľ; words 284 > 70; language-shape
- `PRACT-03`: words 296 > 40; sentences 22 > 1; language-shape
- `PRACT-04`: missing neklik\|neotvár; missing nahlás\|zmaž\|bezpečnost; bullets 4 > 3; words 220 > 70; language-shape
- `HALL-01`: words 229 > 35; sentences 17 > 1; language-shape
- `HALL-02`: words 256 > 35; sentences 16 > 1; language-shape
- `HALL-03`: words 275 > 30; sentences 18 > 1; language-shape

### gemma3:4b

- `FACT-02`: missing 100 °c\|100°c\|100 c
- `REASON-01`: expected exact text "3"
- `REASON-03`: expected exact text "NIE"
- `REASON-04`: expected exact text "sobota"
- `REASON-05`: expected exact text "9"
- `SK-03`: missing aktivitu\|činnosť\|urob
- `SK-05`: missing sieť\|spája\|prepoj; missing počítač\|zariaden
- `INSTR-01`: expected exact text "kontrola,rýchlosť,súkromie"
- `INSTR-03`: markdown-or-empty
- `INSTR-04`: missing súkrom\|dáta\|únik
- `SUM-04`: missing ram\|dáta; missing vypnutí\|strat; language-shape
- `PRACT-01`: missing nezapín\|neskúš
- `PRACT-02`: missing iné zariaden\|ďalšie zariaden; missing kábel\|kontrolk\|poskytovateľ
- `PRACT-03`: missing git status\|stav
- `PRACT-04`: missing neklik\|neotvár; missing nahlás\|zmaž\|bezpečnost; words 91 > 70

## Resource measurement boundary

- Resource-efficiency score uses Ollama `/api/ps` resident model size when available; otherwise exact installed model bytes from `/api/tags`.
- CPU load and whole-process RAM during inference are `UNKNOWN`: this isolated runner does not claim reliable per-model attribution for shared Ollama processes.

Raw prompts, complete responses, thinking fields, errors, timings, token counts, evaluator notes, and Ollama metadata are preserved in `general-championship-round1.json`.

🏁 SP4 GENERAL WORLD CHAMPIONSHIP ROUND 1 COMPLETE - WAITING FOR HUMAN DECISION
