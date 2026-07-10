**Test ID:** test_001
**Parent test ID:** phase5_followup_wiring_test
**Mode:** BUILD
**Goal:** Rozšíriť prvý follow-up regresný test z 4 párov na minimálne 10 otázok a zakotviť ho do evolučnej línie.
**Modules covered:** integration.js, src/dialogue/dialogueState.js
**Personas covered:** core
**Constraints:** bez LLM volania; iba resolveDeterministicFollowUp; vágne a netech follow-upy musia ostať llm_fallback
**Inherited question count:** 4
**New question count:** 6
**Edge case count:** 3
**Source of questions:** generated
**Notes:** Test cieli presne na wiring po dopojení resolveDeterministicFollowUp. Overuje nielen match, ale aj to, že konzervatívne fallbacky zostanú fallbackmi.

**Core Inherited Set**
Prenesené sú 4 anchor páry z [tests/phase5_followup_wiring_test.mjs](tests/phase5_followup_wiring_test.mjs): cache, API, wifi router a Slovensko. Tieto otázky slúžia ako porovnávacie jadro pre ďalšie verzie.

**Expanded Set**
Pridané sú explicitné short-tech subjekty z [src/dialogue/dialogueState.js](src/dialogue/dialogueState.js): TCP, ping, localhost, DNS, port a 404. Jeden prípad cieli aj na vetvu, kde `ako sa používa` pri 404 fallbackne na purpose odpoveď.

**Edge / Stress Set**
Zámerne sú pridané otázky, ktoré follow-up vrstva nemá chytať deterministicky: `kde sa používa?` po wifi, `čo ďalej?` po routeri a netech `načo je to?` po aute. Tým sa stráži, aby sa konzervatívny resolver zbytočne nerozširoval.
