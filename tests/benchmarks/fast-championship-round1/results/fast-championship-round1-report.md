# SP4 LOCAL AI WORLD CHAMPIONSHIP - FAST DIVISION / ROUND 1

Generated: 2026-07-31T05:32:20.224Z

## Fair play

- Models: `qwen3.5:0.8b`, `llama3.2:3b`, `gemma3:1b`
- System prompt: `Si presný FAST worker. Dodrž presne formát a obmedzenia používateľa. Odpovedaj po slovensky, ak používateľ nežiada iba JSON. Ak údaj nemáš, otvorene povedz, že ho nevieš; nič si nevymýšľaj.`
- Options: `{"temperature":0,"seed":42,"num_ctx":2048,"num_predict":256}`
- Thinking: disabled equally with `think: false`
- Timeout: 90000 ms
- Warm repetitions: 3
- Quality scoring: deterministic PASS/FAIL validators in `cases.mjs`
- Literal `<think>` markup in response content: qwen3.5:0.8b=0, llama3.2:3b=0, gemma3:1b=0

## Model inventory

| Model | Digest | Size | Available |
| --- | --- | ---: | --- |
| qwen3.5:0.8b | f3817196d142eaf72ce79dfebe53dcb20bd21da87ce13e138a8f8e10a866b3a4 | 1.04 GB | yes |
| llama3.2:3b | a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72 | 2.02 GB | yes |
| gemma3:1b | 8648f39daa8fbf5b18c7b4e6a8fb4990c692751d49917417b8842ca5758e7ffc | 0.82 GB | yes |

## Head-to-head

| Metric | qwen3.5:0.8b | llama3.2:3b | gemma3:1b |
| --- | ---: | ---: | ---: |
| Intent | 5/20 (2/8) | 0/20 (0/8) | 0/20 (0/8) |
| JSON | 3/15 (1/5) | 3/15 (1/5) | 0/15 (0/5) |
| Slovak | 5/15 (2/6) | 10/15 (4/6) | 5/15 (2/6) |
| Memory extraction | 0/10 (0/5) | 0/10 (0/5) | 0/10 (0/5) |
| Anti-hallucination | 0/5 (0/3) | 1.67/5 (1/3) | 0/5 (0/3) |
| Summary/general | 2.5/5 (3/6) | 1.67/5 (2/6) | 2.5/5 (3/6) |
| Warm latency | 2787.77 ms (3.68/12) | 3848.68 ms (2.67/12) | 856.05 ms (12/12) |
| tok/s | 100.87 (6.11/8) | 85.89 (5.2/8) | 132.15 (8/8) |
| Cold load | 4175.19 ms (2.7/4) | 4114.85 ms (2.74/4) | 2823.07 ms (4/4) |
| Resource efficiency | 3.2/6 | 2.93/6 | 6/6 |
| TOTAL | **31.19/100** | **29.87/100** | **37.5/100** |

## Qualification warning

- Quality totals before performance: `qwen3.5:0.8b` 15.5/70, `llama3.2:3b` 16.33/70, `gemma3:1b` 7.5/70.
- A podium position follows the declared 70/30 formula; it is not evidence that the model is safe to switch into production.
- Every model failed all five memory-extraction contracts; no model qualifies for that role in this round.

## Cold and warm detail

| Model | Cold wall | Cold load | Cold prompt eval | Cold generation | Cold tokens | Cold tok/s | Warm wall median (min-max) | Warm tok/s median (min-max) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| qwen3.5:0.8b | 6884 ms | 4175.19 ms | 57.88 ms | 2423.53 ms | 241 | 99.44 | 2787.77 ms (2785.92-2810.05) | 100.87 (100.45-101.01) |
| llama3.2:3b | 7862.4 ms | 4114.85 ms | 59.55 ms | 2941.79 ms | 256 | 87.02 | 3848.68 ms (3837.89-3848.78) | 85.89 (84.9-86.76) |
| gemma3:1b | 3373.36 ms | 2823.07 ms | 32.42 ms | 434.24 ms | 52 | 119.75 | 856.05 ms (800.51-859.46) | 132.15 (129.55-132.62) |

## Podium

### WORLD CHAMPION - FAST

Model: `gemma3:1b`
Reason: highest transparent total, 37.5/100.

### SECOND PLACE

Model: `qwen3.5:0.8b`
Reason: second-highest transparent total, 31.19/100.

### THIRD PLACE

Model: `llama3.2:3b`
Reason: third-highest transparent total, 29.87/100.

## Role verdict

- Best router/classifier: `qwen3.5:0.8b (weak: 2/8 intent, 1/5 JSON)`
- Best background memory extractor: `UNQUALIFIED (all models failed every memory test)`
- Best FAST conversational model: `gemma3:1b (weak: 5/12 Slovak/general tests)`
- Highest raw warm generation speed: `gemma3:1b`

## Failures by model

### qwen3.5:0.8b

- `INTENT-01`: invalid-json: Unexpected token 'M', "Mám v pamä"... is not valid JSON
- `INTENT-04`: invalid-json: Unexpected token 'N', "Nemám dost"... is not valid JSON
- `INTENT-05`: expected {"intent":"summarize"}
- `INTENT-06`: expected {"intent":"memory_store"}
- `INTENT-07`: invalid-json: Unexpected token 'N', "Nemám dost"... is not valid JSON
- `INTENT-08`: invalid-json: Unexpected token 'D', "Dobrý dň, "... is not valid JSON
- `JSON-01`: invalid-json: Unexpected token 'P', "Používateľ"... is not valid JSON
- `JSON-02`: invalid-json: Unexpected token 'P', "Priamka: I"... is not valid JSON
- `JSON-04`: markdown-or-empty
- `JSON-05`: markdown-or-empty
- `SK-01`: words 73 > 35
- `SK-02`: missing riadi\|koordin\|smer\|vyber; words 95 > 55; sentences 6 > 2
- `SK-04`: missing neviem\|nemám\|nedokáž
- `SK-06`: missing obnov\|strat\|poškod\|zlyh
- `MEM-01`: invalid-json: Unexpected token 'P', "Peter, skú"... is not valid JSON
- `MEM-02`: missing učiteľ
- `MEM-03`: invalid-json: Unexpected token 'N', "Nemám dost"... is not valid JSON
- `MEM-04`: invalid-json: Unexpected non-whitespace character after JSON at position 42 (line 1 column 43)
- `MEM-05`: invalid-json: Expected ',' or ']' after array element in JSON at position 38 (line 1 column 39)
- `HALL-01`: missing neviem\|nemám\|nedokáž\|nie je možné\|nemožno určiť\|bez runtime; sentences 2 > 1
- `HALL-02`: words 45 > 35; sentences 3 > 1
- `HALL-03`: sentences 2 > 1
- `GEN-01`: missing rozhranie
- `GEN-02`: sentences 4 > 2
- `GEN-03`: missing lokáln\|repozitár\|vzdialen

### llama3.2:3b

- `INTENT-01`: markdown-or-empty
- `INTENT-02`: expected {"intent":"runtime_model_current"}
- `INTENT-03`: markdown-or-empty
- `INTENT-04`: markdown-or-empty
- `INTENT-05`: invalid-json: Unexpected token 'N', "Nemám info"... is not valid JSON
- `INTENT-06`: invalid-json: Unexpected token '`', "`"memory_a"... is not valid JSON
- `INTENT-07`: markdown-or-empty
- `INTENT-08`: expected {"intent":"conversation"}
- `JSON-01`: markdown-or-empty
- `JSON-02`: markdown-or-empty
- `JSON-04`: markdown-or-empty
- `JSON-05`: markdown-or-empty
- `SK-01`: language-shape
- `SK-04`: missing neviem\|nemám\|nedokáž
- `MEM-01`: markdown-or-empty
- `MEM-02`: markdown-or-empty
- `MEM-03`: markdown-or-empty
- `MEM-04`: markdown-or-empty
- `MEM-05`: markdown-or-empty
- `HALL-01`: missing neviem\|nemám\|nedokáž\|nie je možné\|nemožno určiť\|bez runtime; language-shape
- `HALL-02`: missing neviem\|nemám\|nebol\|nie sú\|nemám dostupný výsledok\|nemožno určiť\|nedá sa určiť
- `SUM-02`: missing bez commitu\|čo odoslať
- `SUM-03`: missing netestovan\|použiteľ
- `GEN-01`: missing rozhranie
- `GEN-02`: language-shape

### gemma3:1b

- `INTENT-01`: invalid-json: Unexpected token 'm', "memory_store" is not valid JSON
- `INTENT-02`: invalid-json: Unexpected token 'm', "memory_about_user" is not valid JSON
- `INTENT-03`: markdown-or-empty
- `INTENT-04`: markdown-or-empty
- `INTENT-05`: invalid-json: Unexpected token 'O', "OK, poskyt"... is not valid JSON
- `INTENT-06`: invalid-json: Unexpected token 'O', "OK." is not valid JSON
- `INTENT-07`: invalid-json: Unexpected token 'O', "OK." is not valid JSON
- `INTENT-08`: markdown-or-empty
- `JSON-01`: markdown-or-empty
- `JSON-02`: markdown-or-empty
- `JSON-03`: markdown-or-empty
- `JSON-04`: markdown-or-empty
- `JSON-05`: markdown-or-empty
- `SK-02`: words 71 > 55; sentences 6 > 2
- `SK-04`: missing neviem\|nemám\|nedokáž
- `SK-05`: words 116 > 55
- `SK-06`: words 88 > 45
- `MEM-01`: markdown-or-empty
- `MEM-02`: markdown-or-empty
- `MEM-03`: markdown-or-empty
- `MEM-04`: markdown-or-empty
- `MEM-05`: markdown-or-empty
- `HALL-01`: missing neviem\|nemám\|nedokáž\|nie je možné\|nemožno určiť\|bez runtime; language-shape
- `HALL-02`: missing neviem\|nemám\|nebol\|nie sú\|nemám dostupný výsledok\|nemožno určiť\|nedá sa určiť; language-shape
- `HALL-03`: missing neviem\|neuvádza\|nie je uveden\|nedá sa\|nemôžem identifikovať\|text neobsahuje\|bez ďalších informácií; language-shape
- `GEN-01`: sentences 4 > 2
- `GEN-02`: sentences 4 > 2
- `GEN-03`: missing lokáln\|repozitár\|vzdialen

## Resource measurement boundary

- Resource-efficiency score uses Ollama `/api/ps` resident model size when available; otherwise exact installed model bytes from `/api/tags`.
- CPU load and whole-process RAM during inference are `UNKNOWN`: this isolated runner does not claim reliable per-model attribution for shared Ollama processes.

Raw prompts, complete responses, thinking fields, errors, timings, token counts, evaluator notes, and Ollama metadata are preserved in `fast-championship-round1.json`.

🏁 SP4 FAST WORLD CHAMPIONSHIP ROUND 1 COMPLETE - WAITING FOR HUMAN DECISION
