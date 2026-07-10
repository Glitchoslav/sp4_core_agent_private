# Root Artifact Cleanup Plan

Status: evidence-based cleanup manifest

Date: 2026-04-11

Scope:

- workspace root artifact hygiene
- diagnostic clarity around generated outputs
- no delete or move executed by this document

Authority:

- canonical runtime root: sp4_core_agent/
- workspace governance exception: SP4_CHANGELOG.md

Goal:

- pomenovať artefakty, ktoré dnes mätú diagnostiku
- oddeliť jasný odpad od historických snapshotov a od aktuálnych, ale zle scope-ovaných výstupov
- pripraviť bezpečný podklad pre neskorší cleanup patch bez forenznej straty

Method:

- pre každý kandidátsky súbor bol overený aspoň typ obsahu, veľkosť, mtime, prázdnosť a lokálny kontext použitia
- pri writer outputoch bol overený aj najbližší writer surface, ak bol známy
- tento manifest nemení runtime správanie ani nič nemaže

## Classification Rules

- delete = jasný odpad alebo dočasný capture artefakt bez kanonickej väzby
- archive = historický alebo forenzný výstup, ktorého problém je umiestnenie alebo názov, nie samotná existencia
- rename = aktuálny alebo pravdivý výstup, ktorý je mätúci kvôli názvu alebo scope-u
- keep = ponechať bez akcie

## Candidate Table

| Path | Size | Mtime | Empty | Classification | Reason | Safe action |
| --- | ---: | --- | --- | --- | --- | --- |
| battletest_buckets.log | 17823 | 2026-04-11 13:31:38 | no | rename | Ručný capture posledného bucket runu cez Tee-Object; nie prirodzený writer output runnera. Vyzerá ako kanonický live log. | Presunúť alebo premenovať do manual capture namespace, napr. reports/manual/ alebo battletest_buckets.manual_capture.log |
| battletest_buckets_report.txt | 1446 | 2026-04-11 14:11:39 | no | rename | Pravdivý output, ale len posledný selected bucket slice. Názov predstiera celý bucket suite report. | Pri full cleanup ponechať len pre full run alebo premenovať podľa bucketu, napr. battletest_buckets_report.micro_dialogue.txt |
| battletest_buckets_answers.txt | 1765 | 2026-04-11 14:11:39 | no | rename | Companion output k selected bucket slice; rovnaký scope drift ako report. | Premenovať podľa bucketu alebo ukladať mimo root ako slice-specific output |
| battletest_report.txt | 4226 | 2026-04-05 15:10:33 | no | archive | Legit full nightly report, ale starý a v root-e pôsobí ako aktuálny stav systému. | Presunúť do dated archive/test-runs path |
| battletest_answers.txt | 162103 | 2026-04-05 15:10:33 | no | archive | Companion answers dump k starému nightly reportu; bez archívu mätie live diagnostiku. | Presunúť spolu s nightly reportom do dated archive/test-runs path |
| test-output-latest.txt | 0 | 2026-03-30 01:56:51 | yes | delete | Prázdny súbor s autoritatívnym názvom latest. Diagnosticky škodlivý, bez evidencie runtime hodnoty. | Zmazať až v samostatnom cleanup patchi |
| output_mirror_test.txt | 14902 | 2026-03-30 02:17:10 | no | archive | Raw test dump s diagnostickým obsahom; nie kanonický report ani live runtime truth. | Presunúť do archive/artifacts alebo dated test-runs archívu |
| mirror_test_output.json | 53022 | 2026-03-30 00:07:18 | no | archive | JSON diagnostický output mirror testu; forenzne užitočný, ale v root-e sa tvári ako aktívny stav. | Presunúť do archive/artifacts alebo dated test-runs archívu |
| console.log(m.extractIntent(Ako | 0 | 2026-04-11 13:01:00 | yes | delete | Zablúdený shell artefakt, nulová veľkosť, nulová kanonická väzba. | Zmazať v samostatnom cleanup patchi |
| _tmp_battletest_full_run.log | 128347 | 2026-03-28 19:20:03 | no | delete | Dočasný root capture log. Žiadna kanonická hodnota okrem krátkodobého troubleshooting kontextu. | Zmazať po potvrdení, že už nie je potrebný na forenzný audit |
| _tmp_battletest_full_run2.log | 128347 | 2026-03-28 18:34:31 | no | delete | Druhý dočasný root capture log rovnakého typu. | Zmazať po potvrdení, že už nie je potrebný |
| _tmp_prompt_focus_run.log | 21486 | 2026-03-28 18:29:08 | no | delete | Dočasný prompt focus capture log v root-e. | Zmazať po potvrdení |
| _tmp_quality_focus_run.log | 79435 | 2026-03-28 19:03:57 | no | delete | Dočasný quality focus capture log v root-e. | Zmazať po potvrdení |
| sp4_core_agent/test_system_output.txt | 25278 | 2026-03-08 13:26:25 | no | archive | Starý raw system output capture priamo v runtime root-e; vysoké riziko zámeny za aktuálny canonical output. | Presunúť do sp4_core_agent/docs/archive alebo archive/artifacts |
| sp4_core_agent/test_live_output.txt | 6236 | 2026-03-18 19:10:41 | no | archive | Starý raw live output capture v runtime root-e. | Presunúť do archívu |
| sp4_core_agent/test_final_output.txt | 10758 | 2026-03-08 13:26:25 | no | archive | Starý final output dump; forenzná hodnota môže existovať, ale umiestnenie je mätúce. | Presunúť do archívu |
| sp4_core_agent/test_result.txt | 2794 | 2026-03-08 13:26:25 | no | archive | Historický test result dump v runtime root-e. | Presunúť do archívu |
| sp4_core_agent/tests/test_output.txt | 602 | 2025-11-20 09:35:29 | no | archive | Raw output artefakt miešaný medzi test source files. | Presunúť do test artifact archívu |
| sp4_core_agent/tests/live_test_output.txt | 24470 | 2025-11-16 12:15:57 | no | archive | Starý live output artefakt v tests priečinku. | Presunúť do test artifact archívu |
| sp4_core_agent/tests/baseline_output.log | 12484 | 2026-03-08 21:14:24 | no | archive | Baseline log snapshot medzi aktívnymi testami; názov je silný a miesto je mätúce. | Presunúť do dated archive/test-runs path |

## Evidence Notes

### Writer surfaces

- root battletest bucket runner píše priamo battletest_buckets_report.txt a battletest_buckets_answers.txt cez battletest_buckets.js
- root battletest bucket runner prirodzene nepíše battletest_buckets.log; tento súbor vznikol ručným shell capture postupom
- root full battletest runner píše battletest_report.txt a battletest_answers.txt

### Reference scan

- package scripts v workspace package.json ani v sp4_core_agent/package.json neodkazujú priamo na vyššie uvedené artifact outputs ako povinné vstupy
- explicitná dokumentačná referencia bola nájdená len na generic test_output.txt v sp4_core_agent/docs/TESTING_GUIDE.md ako príklad shell output redirectu, nie ako autoritatívna runtime závislosť

### Interpretation guard

- delete kandidáti v tomto manifeste stále nie sú zmazané; delete tu znamená len odporúčaný smer pre budúci patch
- archive kandidáti sa nemajú zahadzovať; problém je diagnostická nečitateľnosť v root-e alebo runtime root-e
- rename kandidáti sú najcitlivejšia skupina, pretože obsah môže byť pravdivý, ale názov klame scope alebo pôvod

## Safe Follow-ups

1. V samostatnom patchi presunúť historical artifacts do dated archive namespace bez straty obsahu.
2. V samostatnom patchi zmazať len súbory, ktoré sú v tomto manifeste prázdne alebo explicitne tmp-only.
3. V samostatnom patchi upraviť naming policy writer outputs tak, aby selected bucket neprodukoval generický full-suite názov.

## Naming Policy Proposal

- full suite root output nech vzniká len pri full run-e
- selected bucket output musí niesť bucket name v názve
- ručný shell capture nemá patriť do root namespace rovnakého mena ako kanonický runner output

Príklad:

- battletest_buckets_report.txt len pre full bucket suite
- battletest_buckets_report.micro_dialogue.txt pre selected bucket run
- battletest_buckets.manual_capture.log pre ručný Tee-Object capture

## Current Verdict

Najbezpečnejší ďalší krok nie je delete patch.

Najbezpečnejší ďalší krok je dvojfázový:

1. archive/rename patch podľa tohto manifestu
2. až potom delete patch pre prázdne a tmp-only artefakty
