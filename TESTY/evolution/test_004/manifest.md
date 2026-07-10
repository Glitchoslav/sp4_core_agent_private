**Test ID:** test_004
**Parent test ID:** test_003
**Mode:** EVAL
**Goal:** Overiť patch sériu v integration.js po posledných 4 zásahoch.
**Modules covered:** integration.js, tests/phase5_followup_handoff_probe.mjs
**Personas covered:** core, auto
**Constraints:** testy 1, 3, 4 bez Ollama; testy 2, 5, 6 s runtime; test 6 iba ak test 5 prejde
**Inherited question count:** 2
**New question count:** 4
**Edge case count:** 1
**Source of questions:** user
**Notes:** Ide o kombinovaný unit + runtime eval runner zameraný na wrapper processMessage, ask error alignment a follow-up continuity.
