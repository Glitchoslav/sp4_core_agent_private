# test_006

- parent_test_id: test_005
- mode: BUILD
- goal: Patch-targeted regresny test pre `outputImmuneCheck` a `identityPatterns` na 5 novych otazkach.
- scope: Overit, ze pronoun-only follow-up s `prevUserInput` uz neobchadza LLM a ze zuzene identity confusion patterny nebiju legitimne architektonicke opisy.

## Core Inherited Set

- `co je ping` -> `a na co to?`
- `co je OSPF` -> `a preco to?`

## New Coverage

- `co je cache` -> `a co to?`
- `co je SP4_CORE?` s architektonickym opisom `SP4_CORE je system ...`

## Edge / Stress

- `co je CORE?` s explicitnym driftom `CORE je AI asistent ...` musi ostat fail.

## Why This Test Exists

Predosle testy riesili hlavne handoff v `integration.js`. Tento test ide nizsie a overuje samotny patch v immune decision vrstve bez miesania model adherence a runtime handoff problemov.
