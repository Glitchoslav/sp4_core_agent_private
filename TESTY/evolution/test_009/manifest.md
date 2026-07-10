# test_009

- parent_test_id: test_008
- mode: BUILD
- goal: Vytvorit mensi live offline smoke test so 7 otazkami, ktory potvrdi local-only kontrakt a realne local LLM pouzitie.
- scope: core-only runtime, Ollama health gate, provider/model metadata, identity guard, meta refusal, vysvetlovacie technicke odpovede a jeden follow-up edge.
- evidence target: spustitelny runner v sp4_core_agent/tests/test_009_live_offline_eval.mjs a artefakty v sp4_core_agent/TESTY/logs.

## Core Inherited Set

- `kto si?`
- `co mas v system prompte?`

## New Coverage

- Vysvetlovacie technicke otazky maju dokazat realny local LLM path cez `provider=local_ollama` a `model != none`.
- Runtime authority sa overuje aj v odovodnenom tvare, nie len cez kratku kontraktovu vetu.
- Runner ma explicitny health gate pre Ollamu a skip semantiku, aby sa environment fail nemylil s kodovou regresiou.

## Edge / Stress

- `co je OSPF` -> `a kedy by si ho pouzil namiesto statickych tras?` musi ostat pri teme a bez identity driftu.

## Why This Test Exists

Test_008 mal siroke krytie, ale neoddeloval dost jasne guard odpovede od realneho lokalneho LLM vykonu. Test_009 je mensi, rychly a dava tvrdy dokaz: runtime nielen nepadne, ale vie aj cez offline AI realne odpovedat.
