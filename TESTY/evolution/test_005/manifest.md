**Test ID:** test_005
**Parent test ID:** test_004
**Mode:** EVAL
**Goal:** Spraviť izolovaný rerun patch série bez miešania artefaktov medzi behmi.
**Modules covered:** integration.js, tests/phase5_followup_handoff_probe.mjs, tests/integration_handoff_patch_series_isolated_test.mjs
**Personas covered:** core, auto
**Constraints:** každý beh musí mať unikátny run label; Test 5 musí používať vlastný probe output; subtest IDs musia byť unikátne
**Inherited question count:** 6
**New question count:** 0
**Edge case count:** 1
**Source of questions:** user
**Notes:** Tento test nerieši len obsah odpovedí, ale aj hygienu artefaktov. Každý subtest a každý probe output je pomenovaný run-specific suffixom, aby sa nedali zameniť medzi rerunmi.
