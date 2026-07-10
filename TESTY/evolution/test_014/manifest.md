# test_014

- parent_test_id: test_010
- mode: BUILD
- goal: Rozsirit kanonicky live battletest na 214 otazok bez rozbitia existujucej 50-case baseline.
- scope: realny runtime cez SP4IntegratedAgent, auto routing, deterministic truth, runtime authority, memory dialog, policy edge, prompt leak refusal, persona routing a follow-up kontinuita.
- evidence target: parametricky wrapper v battletest.js, genericky runner v tests/test_010_live_battletest_eval.mjs a artefakty v TESTY/logs + TESTY/evolution/test_014/eval.md.

## Breakdown

- inherited: 50 case z test_010 ako parent battle surface
- expanded: 150 novych parafraz a sirsi coverage slice
- edge: 12 follow-up a policy stress case
- total: 214 case

## Why This Test Exists

test_010 dal pouzitelny 50-case baseline, ale uz bol prilis uzky na sirku dnesnych regression ploch. test_014 preto nerusi parent, ale dedi ho cely a dopina velky 200+ battletest pre tri veci naraz:

- prirodzene parafrazy system truth a runtime authority otazok
- navrat memory, privacy a policy edge tem do jedneho battle behu
- sirsi persona a follow-up surface, aby sa routing nekontroloval len na 2-3 sentinel promptoch

## Execution

- default prepare: node battletest.js --prepare
- default full run: node battletest.js
- legacy 50-case prepare: node battletest.js --test-id test_010 --prepare
- legacy 50-case full run: node battletest.js --test-id test_010

## Contract Notes

- wrapper aj runner su odteraz parametricke cez SP4_BATTLETEST_ID alebo --test-id
- default battletest smeruje na test_014
- legacy 50-case baseline ostava zachovana cez test_010
- pri nedostupnej Ollame sa ma zapisat SKIP artefakt, nie fail tvariaci sa ako kodova regresia
