# test_015

- parent_test_id: test_014
- mode: BUILD+EVAL
- datum: 2026-04-16
- goal: Cieleny regresny test pre patche z 2026-04-16 session: Popici identity follow-up carry, identity hardening pre prirodzene role otazky, changelog public recovery a Walter stack regression.
- scope: Popici identity carry po follow-up turne, role/control otazky v Popici mode, changelog false-positive refusal, Walter dialect/context/intensity pipeline.

## Breakdown

- inherited_sentinel: 4 core cases z test_014 (Q35 persona_dialect, Q42 followup_identity_drift, Q43 followup_offline_topic_hold, Q01 identity_direct)
- patch_targeted: 12 novych case pre konkretne fixy z tejto session
- total: 16 case

## Patche ktore tato sada strazzi

1. Popici follow-up carry (`shouldCarryPopiciFollowUpPersona` — integration.js:146)
2. Identity hardening pre prirodzene "co robis / kto ta ovlada" otazky (identityHardening.js:79-98)
3. Popici identity hardening odpoved — 4-vetova rola (integration.js:1405)
4. Changelog public recovery — nie meta refusal (responseControl.js:82)
5. Walter stack — import fix + 19/19 pass (test_walter_integration.js:7)

## Execution

- node tests/test_015_patch_regression.js
