**Test ID:** test_002
**Parent test ID:** test_001
**Mode:** BUILD
**Goal:** Zaviesť live runtime follow-up runner a ukladať skutočné odpovede `Q -> A -> follow-up -> A2` na porovnanie medzi behmi.
**Modules covered:** integration.js, src/dialogue/dialogueState.js, orchestration/runtime flow
**Personas covered:** auto, core
**Constraints:** skutocny runtime cez SP4IntegratedAgent; novy agent pre kazdy case; defaultne forceLocal a testMode pre stabilnejsie porovnanie
**Inherited question count:** 13
**New question count:** 0
**Edge case count:** 3
**Source of questions:** generated
**Notes:** Test_002 vedome dedi rovnaky follow-up set ako test_001. Rozdiel nie je v otázkach, ale v tom, že meria už celý runtime, nie len deterministický resolver.

**Parent Basis**
Otázky sú prevzaté z [sp4_core_agent/TESTY/evolution/test_001/questions.json](sp4_core_agent/TESTY/evolution/test_001/questions.json), aby sa výsledky dali porovnávať naprieč deterministic a live vrstvou.

**Live Scope**
Každý case beží ako samostatný dvojkrokový dialóg cez [sp4_core_agent/tests/phase5_followup_live_test.mjs](sp4_core_agent/tests/phase5_followup_live_test.mjs). Ukladá sa prvá odpoveď, follow-up odpoveď a metadata ako `handledBy`, `model` a quality gate zásahy.

**Why Separate Test ID**
Je to nová testovacia vrstva. `test_001` zamyká deterministic wiring. `test_002` meria, ako sa ten istý follow-up správa v reálnom runtime flow.
