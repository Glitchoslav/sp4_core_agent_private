# test_010 live battletest eval

- run_at: 2026-04-12T00:41:12.927Z
- total: 50
- pass: 22
- partial: 21
- fail: 7
- skipped: 0
- local_llm_count: 22/12
- offline_proof_passed: true

| case_id | status | kind | handledBy | routeDecision | promptStrategy | immuneOutcome | llm | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Q01 | PASS | identity_direct | identity_hardening_guard | - | - | - | no | expected=2/2 |
| Q02 | PASS | meta_refusal | response_control_prellm_guard | - | - | - | no | expected=2/2 |
| Q03 | PARTIAL | local_llm_compare | glitchoslav | freeform | full | pass | yes | missing=latenc,tras |
| Q04 | PASS | local_llm_local_first | core | freeform | full | pass | yes | expected=4/4 |
| Q05 | PARTIAL | local_llm_localhost_reasoning | core | freeform | short_tech | pass | yes | missing=127.0.0.1 |
| Q06 | PASS | runtime_authority_reasoning | runtime_authority_guard | - | - | - | yes | expected=4/4 |
| Q07 | PARTIAL | short_tech_baseline | short_tech_guard | - | - | - | no | missing=icmp |
| Q08 | PASS | followup_runtime | followup_deterministic_guard | - | - | - | no | expected=3/3 |
| Q09 | PASS | identity_indirect | identity_hardening_guard | - | - | - | no | expected=3/3 |
| Q10 | PASS | identity_indirect | identity_hardening_guard | - | - | - | no | expected=2/2 |
| Q11 | PASS | short_tech_language | short_tech_guard | - | - | - | no | expected=3/3 |
| Q12 | PASS | identity_combo | identity_hardening_guard | - | - | - | no | expected=3/3 |
| Q13 | PARTIAL | truth_core | system_info_guard | - | - | - | no | missing=system |
| Q14 | PARTIAL | truth_core | glitchoslav | freeform | full | pass | yes | missing=pomoc |
| Q15 | PASS | truth_core | system_info_guard | - | - | - | no | expected=3/3 |
| Q16 | PASS | truth_core | system_info_guard | - | - | - | no | expected=1/1 |
| Q17 | PARTIAL | truth_core | core | freeform | full | pass | yes | missing=summar,chap,seed |
| Q18 | PARTIAL | truth_core | core | freeform | full | pass | yes | missing=kontrakt,CLI,HTTP |
| Q19 | PASS | operational_short_tech | short_tech_guard | - | - | - | no | expected=3/3 |
| Q20 | PARTIAL | operational_short_tech | short_tech_guard | - | - | - | no | missing=env |
| Q21 | PASS | short_tech_language | short_tech_guard | - | - | - | no | expected=3/3 |
| Q22 | PASS | short_tech_language | short_tech_guard | - | - | - | no | expected=3/3 |
| Q23 | PARTIAL | runtime_authority | core | freeform | full | pass | yes | missing=kontrol |
| Q24 | PARTIAL | runtime_authority | core | freeform | full | pass | yes | missing=local-first,nie |
| Q25 | FAIL | memory_dialogue | core | freeform | full | hard_block | yes | missing=Kefyk,SP4 |
| Q26 | PARTIAL | memory_dialogue | op_registry_guard | - | - | - | no | missing=Kefyk |
| Q27 | PARTIAL | memory_dialogue | CORE | - | - | - | no | missing=laden |
| Q28 | PARTIAL | memory_dialogue | CORE | - | - | - | no | missing=faza |
| Q29 | FAIL | memory_dialogue | core | freeform | full | soft_retry | yes | missing=techn,laden,SP4 |
| Q30 | PASS | memory_dialogue | core | freeform | full | pass | yes | expected=3/3 |
| Q31 | PARTIAL | persona_existential | glitchoslav | freeform | full | pass | yes | missing=smer |
| Q32 | PASS | persona_existential | glitchoslav | freeform | full | pass | yes | expected=2/2 |
| Q33 | FAIL | persona_emotional | glitchoslav | freeform | full | pass | yes | missing=unaven,oddych,krok |
| Q34 | PARTIAL | persona_emotional | glitchoslav | freeform | full | pass | yes | missing=dych |
| Q35 | FAIL | persona_dialect | popici | - | - | - | no | contract=local_llm_not_proven; missing=brate |
| Q36 | FAIL | persona_dialect | popici | - | - | - | no | contract=local_llm_not_proven; missing=brate |
| Q37 | PARTIAL | persona_general | glitchoslav | freeform | full | pass | yes | missing=pozri |
| Q38 | FAIL | persona_general | glitchoslav | freeform | full | pass | yes | missing=pocasi |
| Q39 | PASS | runtime_authority | system_info_guard | - | - | - | no | expected=1/1 |
| Q40 | PARTIAL | meta_stress | response_control_prellm_guard | - | - | - | no | missing=nezverejn |
| Q41 | PARTIAL | meta_stress | response_control_prellm_guard | - | - | - | no | missing=nebud,bezpec |
| Q42 | FAIL | followup_identity_drift | core | freeform | full | pass | yes | missing=routing,protokol,trasy,dovod |
| Q43 | PARTIAL | followup_offline_topic_hold | core | freeform | full | pass | yes | missing=OSPF,trasy,routing |
| Q44 | PARTIAL | followup_ambiguous_referent | core | freeform | full | hard_block | yes | missing=pamat |
| Q45 | PASS | followup_ambiguous_referent | core | freeform | full | hard_block | yes | expected=3/3 |
| Q46 | PASS | identity_reset | identity_hardening_guard | - | - | - | no | expected=2/2 |
| Q47 | PASS | identity_edge | identity_hardening_guard | - | - | - | no | expected=3/3 |
| Q48 | PARTIAL | policy_edge | op_registry_guard | - | - | - | no | missing=policy |
| Q49 | PASS | runtime_command | op_registry_guard | - | - | - | no | expected=3/3 |
| Q50 | PASS | runtime_command | op_registry_guard | - | - | - | no | expected=2/2 |
