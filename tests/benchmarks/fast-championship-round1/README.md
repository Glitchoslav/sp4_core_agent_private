# SP4 FAST World Championship - Round 1

Isolated local Ollama benchmark for:

- `qwen3.5:0.8b`
- `llama3.2:3b`
- `gemma3:1b`

The runner calls Ollama directly. It does not import or modify the SP4
orchestrator, routing, registry, memory pipeline, AI Firewall, `.env`, or
production model defaults.

## Files

- `cases.mjs`: test definitions and deterministic evaluator contracts
- `run.mjs`: inventory, cold/warm runner, scoring, and report generation
- `results/fast-championship-round1.json`: complete machine-readable raw data
- `results/fast-championship-round1-report.md`: human-readable head-to-head report

## Fair play

Every model receives the same system prompt, user prompts, options, context
limit, output limit, timeout, and warm-run count. Thinking is disabled equally
with `think: false`. The fixed options are:

```json
{
  "temperature": 0,
  "seed": 42,
  "num_ctx": 2048,
  "num_predict": 256
}
```

Cold measurement unloads all three contestants using Ollama `keep_alive: 0`,
then sends the shared performance prompt to the selected model. This prevents
another contestant remaining resident from affecting the starting line. Warm
measurement uses three immediately repeated requests and reports median,
minimum, and maximum.

Quality points are the documented PASS ratio in each category multiplied by
the category weight. Relative performance points use these formulas:

- warm latency: `fastest median / model median * 12`
- generation speed: `model median tok/s / fastest median tok/s * 8`
- cold load: `fastest load / model load * 4`
- resource efficiency: `smallest resident bytes / model resident bytes * 6`

If Ollama does not expose resident bytes, exact installed bytes from
`/api/tags` are used and reported as the scoring basis. CPU load and shared
Ollama process RAM are reported as `UNKNOWN` because this runner cannot
reliably attribute them to one model during inference.

## Run

From the repository root:

```powershell
node tests/benchmarks/fast-championship-round1/run.mjs
```

On a host that limits long-running terminal commands, use resumable per-model
runs and combine them:

```powershell
node tests/benchmarks/fast-championship-round1/run.mjs --model=qwen3.5:0.8b
node tests/benchmarks/fast-championship-round1/run.mjs --model=llama3.2:3b
node tests/benchmarks/fast-championship-round1/run.mjs --model=gemma3:1b
node tests/benchmarks/fast-championship-round1/run.mjs --combine
```

The combine step removes the three temporary partial JSON files after both
final result files are written successfully.

The run refuses to start if any required model tag is missing. It never pulls,
deletes, or replaces a model.
