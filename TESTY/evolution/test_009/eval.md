# test_009 live offline eval

- run_at: 2026-04-23T21:48:09.914Z
- total: 7
- pass: 3
- partial: 4
- fail: 0
- skipped: 0
- local_llm_count: 4/3
- offline_proof_passed: true

| case_id | status | kind | provider | model | llm | note |
| --- | --- | --- | --- | --- | --- | --- |
| Q01 | PASS | identity_direct | identity_hardening_guard | none | no | expected=2/2 |
| Q02 | PARTIAL | meta_refusal | response_control_prellm | none | no | missing=neukazem |
| Q03 | PARTIAL | local_llm_compare | local_ollama | gemma3:4b | yes | missing=latenc,skok |
| Q04 | PARTIAL | local_llm_local_first | local_ollama | gemma3:4b | yes | missing=local,cloud |
| Q05 | PARTIAL | local_llm_localhost_reasoning | local_ollama | gemma3:4b | yes | missing=127.0.0.1,lokal |
| Q06 | PASS | runtime_authority_reasoning | local_ollama | gemma3:4b | yes | expected=4/4 |
| Q07 | PASS | followup_offline_topic_hold | deterministic_shortcut | none | no | expected=4/4 |
