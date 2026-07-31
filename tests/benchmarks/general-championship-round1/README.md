# SP4 GENERAL World Championship - Round 1

Isolated local Ollama benchmark for:

- `qwen3.5:4b`
- `qwen3:4b`
- `gemma3:4b`

The runner calls Ollama directly and does not import or modify SP4 production
routing, registry, memory, AI Firewall, `.env`, or model defaults.

## Test divisions

The 36 deterministic PASS/FAIL cases cover:

- factual/general knowledge: 8 tests, 20 points
- reasoning: 6 tests, 15 points
- Slovak language: 6 tests, 10 points
- instruction following: 5 tests, 10 points
- summarization: 4 tests, 5 points
- practical help: 4 tests, 5 points
- anti-hallucination: 3 tests, 5 points

Performance contributes 30 points using warm latency, generation speed, cold
load, and Ollama-reported resident model size.

## Fair play

Every model receives the same prompts, system prompt, timeout, output limit,
context limit, and options:

```json
{
  "temperature": 0,
  "seed": 42,
  "num_ctx": 4096,
  "num_predict": 384
}
```

Thinking is disabled equally with `think: false`. Before every cold test, all
three contestants are unloaded with `keep_alive: 0`. Warm performance uses
three repeated requests and reports median, minimum, and maximum.

## Run

From the repository root:

```powershell
node tests/benchmarks/general-championship-round1/run.mjs --model=qwen3.5:4b
node tests/benchmarks/general-championship-round1/run.mjs --model=qwen3:4b
node tests/benchmarks/general-championship-round1/run.mjs --model=gemma3:4b
node tests/benchmarks/general-championship-round1/run.mjs --combine
```

Evaluator-only corrections can be applied to preserved responses without
re-running inference or changing performance measurements:

```powershell
node tests/benchmarks/general-championship-round1/run.mjs --regrade
```

The final files are:

- `results/general-championship-round1.json`
- `results/general-championship-round1-report.md`

All prompts, complete responses, evaluator notes, errors, tokens, and exact
Ollama timing metadata remain in the raw JSON.
