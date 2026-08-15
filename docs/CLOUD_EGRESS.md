# Cloud Egress — canonical (2026-08-15)

## Canonical cesta (jediná povolená)

```
sp4LlmCall (src/llm/llmRouter.js)
  → askCloudLLM (cloudLLM.js)
    → mayEgress('conversation_text', 'litellm_gateway')   [src/constitution/loader.js]
      → askLiteLLM (src/llm/litellmClient.js)
        → LiteLLM gateway (127.0.0.1:4000)
```

## Consent model (fail-closed)

- Cloud vyžaduje `resolvePolicy().allowCloud === true`, threadovaný z request/user policy.
- **Chýbajúca policy → fail closed** (`cloud_policy_required`, zero network).
- **`allowCloud:false` → zero network.**
- **`USE_CLOUD_FALLBACK` (env) NEUDEĽUJE consent** — iba povoľuje fallback cestu PO explicitnom consente.
- **`preference:'cloud-only'`** sa rešpektuje len pri `allowCloud===true`.
- Provider-specific výber (`groq`/`google`) je odstránený — tier (`budget|quality|fast|free`) určuje deterministický `classify()` v llmRouteri.

## Odstránené / utlmené cesty (2026-08-15)

- **SP4AIOSBridge** (top-level `SP4AIOSBridge.js`) — zmazaný; agent/CLI cloud ide cez `sp4LlmCall`.
- **Sibling `../SP4AIOS/src/bridge.js`** — compatibility shim; **odstráni sa na runtime (linux-pc) až po schválenom deployi**.
- **`askGroqLLM`** (direct GROQ) — dead code, odstránený.
- **Fantómové Binding C testy** (`test_constitution_binding_c.js`, `test_constitution_policy_threading.js`) — nahradené `tests/test_litellm_canonical_egress.js`.

## Deploy poznámka

- Runtime kópia na linux-pc (`/home/dhzpc/sp4kult/sp4-workspace/sp4_core_agent`) je čistý checkout canonical `main`.
- Po schválení PR: `git pull origin main` na linux-pc, potom zmazať sibling shim `../SP4AIOS/src/bridge.js`.
- Launcher (`services.linux.json`) ďalej ukazuje `cwd` na túto runtime kópiu; žiadna zmena konfigu nie je potrebná.

## Rollback (produkcia)

```bash
cd /home/dhzpc/sp4kult/sp4-workspace/sp4_core_agent

# 1. Preflight — čistý tree + správna vetva
[ -z "$(git status --porcelain)" ] || { echo "DIRTY TREE — STOP"; exit 1; }
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || { echo "NOT ON main — STOP"; exit 1; }
git rev-parse HEAD   # zaznamenaj aktuálny pripnutý SHA

# 2. Rollback na schválený SHA (main pred LiteLLM migráciou)
git reset --hard e060675
git rev-parse HEAD   # over == e060675

# 3. Health check (po reštarte cez Launcher, mimo tohto postupu)
#    curl -s http://localhost:3002/health   # bridge
#    curl -s http://localhost:3001/health   # legacy HTTP

# 4. Návrat na predchádzajúci pripnutý SHA (ak ≠ e060675)
#    git reset --hard <pinned-SHA>
```
