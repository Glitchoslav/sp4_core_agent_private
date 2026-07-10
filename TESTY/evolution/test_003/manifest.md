**Test ID:** test_003
**Parent test ID:** test_002
**Mode:** EVAL
**Goal:** Dodat dôkaz, či follow-up padá primárne na handoffe `processMessage` vs `ask`, alebo až na identity/response-control vrstve.
**Modules covered:** integration.js, src/dialogue/dialogueState.js, src/runtime/responseControl.js, src/identity/identityPatterns.js
**Personas covered:** auto, core
**Constraints:** nové inštancie medzi variantami; oba turny vnútri varianty na jednej inštancii; plný raw result objekt oboch turnov; snapshot `_dlgState` po 1. a 2. turne
**Inherited question count:** 2
**New question count:** 0
**Edge case count:** 0
**Source of questions:** user
**Notes:** Test používa presne dva reprezentatívne páry zadané používateľom a robí 4 behy: ping/cache × processMessage/ask.

**What This Test Proves**
Nejde o ďalší funkčný smoke test. Je to diagnostický probe. Zámer je porovnať, či je `_dlgState` po prvom turne prázdny v `processMessage`, ale naplnený v `ask`, a či sa po odstránení handoff medzery ešte stále objavuje identity blind spot typu `CORE je osoba/persona`.
**Test ID:** test_003
**Parent test ID:** test_002
**Mode:** EVAL
**Goal:** Dodat dôkaz, či follow-up padá primárne na handoffe `processMessage` vs `ask`, alebo až na identity/response-control vrstve.
**Modules covered:** integration.js, src/dialogue/dialogueState.js, src/runtime/responseControl.js, src/identity/identityPatterns.js
**Personas covered:** auto, core
**Constraints:** nové inštancie medzi variantami; oba turny vnútri varianty na jednej inštancii; plný raw result objekt oboch turnov; snapshot `_dlgState` po 1. a 2. turne
**Inherited question count:** 2
**New question count:** 0
**Edge case count:** 0
**Source of questions:** user
**Notes:** Test používa presne dva reprezentatívne páry zadané používateľom a robí 4 behy: ping/cache × processMessage/ask.

**What This Test Proves**
Nejde o ďalší funkčný smoke test. Je to diagnostický probe. Zámer je porovnať, či je `_dlgState` po prvom turne prázdny v `processMessage`, ale naplnený v `ask`, a či sa po odstránení handoff medzery ešte stále objavuje identity blind spot typu `CORE je osoba/persona`.
