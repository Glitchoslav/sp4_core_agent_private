# SYSTEM RUNTIME MAP - AGENT BRIEF

## CIEĽ

Tento brief je pripravený proti aktuálnemu runtime kódu. Zdroj pravdy sú importy, call sites a explicitné vetvy v runtime. Nie dokumentácia a nie názov súboru.

Overenie bolo robené proti live runtime vetvám v:

- sp4_core_agent/sp4.js
- sp4_core_agent/index_v07.js
- sp4_core_agent/integration.js
- sp4_core_agent/orchestration/glitchOrchestrator.js
- sp4_core_agent/src/routing/*
- sp4_core_agent/src/runtime/*
- sp4_core_agent/src/core/personaRegistry.js
- sp4_core_agent/multiVoice.js
- sp4_core_agent/src/identity/IDENTITY_KERNEL.js

Runtime probe:

- node sp4.js start sa dostalo do CLI stavu
- Ollama nebežala
- preto local/cloud success execution bez backendu nebola potvrdená behom, iba kódom

---

## VERIFIED

### Entry chain

- file: sp4_core_agent/sp4.js
  role: primárny launcher
  call_context: command=start volá runNodeScript s START_ENTRY=index_v07.js
  activation: node sp4.js start
  confidence: high

- file: sp4_core_agent/index_v07.js
  role: CLI entrypoint
  call_context: boot, onboarding, scheduler, agent.initialize(), následne processMessage v chat runtime
  activation: defaultný interaktívny runtime
  confidence: high

- file: sp4_core_agent/integration.js
  role: hlavná runtime pipeline
  call_context: `SP4IntegratedAgent.processMessage -> _processMessageCore`
  activation: každá normálna správa v runtime
  confidence: high

### Early returns pred emotional processing

Tieto vetvy sú potvrdené pred analyzeEmotionalContent:

- file: sp4_core_agent/sp4_first_aid/spg.js
  role: emergency override
  call_context: `runSPG` je volané na začiatku `_processMessageCore` a pri zhode vracia okamžite
  activation: conditional early return
  confidence: high

- file: sp4_core_agent/integration.js
  role: punctuation-only guard
  call_context: punctuation-only input vracia buildGuardResult bez ďalšieho spracovania
  activation: conditional early return
  confidence: high

- file: sp4_core_agent/integration.js
  role: short meaningful guard
  call_context: známe krátke vstupy vracajú okamžitú reply bez emotional processing
  activation: conditional early return
  confidence: high

- file: sp4_core_agent/integration.js
  role: gibberish guard
  call_context: isLikelyGibberishInput vracia deterministic response pred emotional branch
  activation: conditional early return
  confidence: high

- file: sp4_core_agent/integration.js
  role: /mode command handler
  call_context: /mode vracia command response bez emotional processing
  activation: conditional early return
  confidence: high

- file: sp4_core_agent/integration.js
  role: very short greeting shortcut
  call_context: isVeryShortGreeting vracia shortcut response pred hlavným try blokom
  activation: conditional early return
  confidence: high

- file: sp4_core_agent/integration.js
  role: mission command path
  call_context: /mission ide do planner/executor vetvy a nepadá do bežného emočného chatu
  activation: conditional early return
  confidence: high

- file: sp4_core_agent/integration.js
  role: bot protection gate
  call_context: detectBot action=block alebo challenge vracia response pred emotional analysis
  activation: conditional early return
  confidence: high

### Main runtime flow

- file: sp4_core_agent/emotionalProcessor.js
  role: emočná analýza a grounding support
  call_context: integration volá analyzeEmotionalContent až po všetkých vyššie uvedených early returnoch a po bot monitor vetve
  activation: post-guard branch; nie na každú správu
  confidence: high

- file: sp4_core_agent/integration.js
  role: prompt assembly
  call_context: po intent, mode a job context skladá prompt cez buildPrompt
  activation: standard non-early-exit path
  confidence: high

- file: sp4_core_agent/integration.js
  role: local/cloud decision point
  call_context: ak flow neostane vo vision shortcut, testMode direct local alebo forceLocal bypass, volá autonomousController.decide
  activation: conditional branch
  confidence: high

- file: sp4_core_agent/autonomousController.js
  role: policy-aware strategy selector
  call_context: !allowCloud -> local return, forceLocal -> local return, forceCloud -> cloud return, inak pokračujú hybrid a complexity pravidlá
  activation: len keď je cloud/local decision branch vôbec dosiahnutá
  confidence: high

- file: sp4_core_agent/orchestration/glitchOrchestrator.js
  role: final local orchestrator
  call_context: volaný z integration vo forced-local path, v autonomous local path a pri cloud fallbacku
  activation: defaultná local execution cesta
  confidence: high

### Routing stack

- file: sp4_core_agent/src/routing/intentExtractor.js
  role: intent pre-routing
  call_context: používa sa v integration pred prompt assembly a aj v glitchOrchestrator
  activation: standard non-early-exit path
  confidence: high

- file: sp4_core_agent/src/routing/entityResolver.js
  role: entity + handler hint mapping
  call_context: glitchOrchestrator volá resolveEntity a checkGuardRules pred analyzeAndDecide
  activation: local orchestration path
  confidence: high

- file: sp4_core_agent/src/core/modeCompass.js
  role: preselection, explicit prefix override a lock logic
  call_context: používa sa v CLI a integration pri auto mode alebo mode command
  activation: preselection layer, nie final router
  confidence: high

- file: sp4_core_agent/orchestration/glitchOrchestrator.js
  role: final local routing orchestration
  call_context: po intent/entity/context analýze rozhoduje elevate, delegate alebo deterministic reply
  activation: local orchestration path
  confidence: high

### Validation and replacement

- file: sp4_core_agent/src/core/personaRegistry.js
  role: runtime persona enforcement
  call_context: integration volá validatePersonaOutput; pri CORE fail môže nasledovať sanitizeCoreOutput a getCoreFallback
  activation: post-processing validation path
  confidence: high

- file: sp4_core_agent/src/validators/layerValidator.js
  role: diagnostics-only validator
  call_context: integration volá validateLayerDistinction a logLayerValidation po language enforcement
  activation: post-processing path
  confidence: high

- file: sp4_core_agent/src/immune/outputImmuneCheck.js
  role: post-response immune evaluator
  call_context: integration volá runImmuneCheck po metadata assembly a pred response control
  activation: final response evaluation branch
  confidence: high

- file: sp4_core_agent/src/runtime/responseControl.js
  role: real replacement layer
  call_context: detectPreLlmGuard blokuje request ešte pred buildPrompt; applyPostImmuneResponseControl vie nahradiť output po immune verdicte
  activation: conditional guard/replacement path
  confidence: high

### Final writeback

- file: sp4_core_agent/src/runtime/writebackTail.js
  role: success tail
  call_context: integration volá runWritebackTail po immune bloku a pred return result
  activation: final successful processing path
  confidence: high

- file: sp4_core_agent/src/runtime/writebackTail.js
  role: memory/action/trigger/relationship tail
  call_context: runMemoryWritebackStep, processResponseActions, evaluateTriggers, performAudit periodicky, evaluateRelationshipProgression periodicky, ruleMiningPipeline.processConversation
  activation: success tail, nie routing
  confidence: high

---

## CONDITIONAL

- file: sp4_core_agent/integration.js
  role: council branch
  call_context: deliberate vetva existuje, ale useCouncil je v aktuálnom flow false
  activation: explicitne zapnutá non-default vetva
  confidence: high

- file: sp4_core_agent/integration.js
  role: cloud execution
  call_context: active len keď autonomous controller vyberie cloud a policy cloud povolí
  activation: conditional branch
  confidence: high

- file: sp4_core_agent/integration.js
  role: testMode direct local
  call_context: testMode && forceLocal preskočí orchestrator a ide priamo do askLocalLLM
  activation: test-only branch
  confidence: high

- file: sp4_core_agent/multiVoice.js
  role: vision shortcut
  call_context: buildPrompt môže vrátiť shortAnswer a obísť normálnu orchestration vetvu
  activation: conditional branch
  confidence: medium
  note: call site je jasný, ale rozsah aktivácie bez runtime input testu nie

- file: sp4_core_agent/orchestration/glitchOrchestrator.js
  role: direct persona bypass
  call_context: bypassOrchestrator, modeLocked alebo manualOverride môžu ísť priamo do handlePersonaDirect
  activation: context-dependent branch
  confidence: high

---

## DIAGNOSTIC ONLY

- file: sp4_core_agent/src/validators/layerValidator.js
  role: score + log
  call_context: neblokuje flow a nemení output
  activation: post-processing
  confidence: high

- file: sp4_core_agent/src/immune/outputImmuneCheck.js
  role: verdict producer
  call_context: sám o sebe neprepisuje response; to robí až downstream response control alebo retry acceptance v integration
  activation: post-response evaluation
  confidence: high

---

## OUTPUT-MODIFYING

- file: sp4_core_agent/src/core/personaRegistry.js
  role: enforcement input do sanitizácie/fallbacku
  call_context: validatePersonaOutput spúšťa downstream sanitization a fallback rozhodnutia
  activation: post-processing validation
  confidence: high

- file: sp4_core_agent/src/runtime/responseControl.js
  role: safe replacement executor
  call_context: pre-LLM block aj post-immune replacement
  activation: conditional
  confidence: high

- file: sp4_core_agent/integration.js
  role: soft retry path
  call_context: po immune verdicte môže znovu volať askLocalLLM; output sa prepíše len ak retry zlepší verdict
  activation: repairable soft fail branch
  confidence: high

- file: sp4_core_agent/integration.js
  role: post-generation mutators
  call_context: scrubCorePoliteness, enforceSlovak, glitchNormalizeSk, repetitive trim a podmienený glitch layer menia output po generovaní
  activation: conditional post-processing
  confidence: high

---

## SHADOW OR SPLIT AUTHORITY

- file: sp4_core_agent/multiVoice.js
  role: prompt wrapper
  call_context: importuje workspace-level identity/personas a zároveň kernel zo src/identity/IDENTITY_KERNEL.js
  activation: live prompt assembly
  confidence: high

- file: sp4_core_agent/src/identity/IDENTITY_KERNEL.js
  role: kernel identity layer
  call_context: multiVoice.buildSystemPrompt používa buildIdentityKernelBlock ako prvú prompt vrstvu
  activation: live prompt assembly
  confidence: high

- file: sp4_core_agent/src/core/personaRegistry.js
  role: live runtime registry
  call_context: importuje validátory a persona data z identity/personas
  activation: live validation path
  confidence: high

- file: sp4_core_agent/src/personas/personas.js
  role: active helper, nie potvrdený canonical source
  call_context: integration importuje normalizePersona priamo odtiaľto
  activation: live helper path
  confidence: high

- file: sp4_core_agent/src/personas/core/scrubber.core.js
  role: active helper, nie canonical identity source
  call_context: integration importuje scrubCorePoliteness priamo odtiaľto
  activation: live helper path
  confidence: high

Shadow risk:
Identity authority nie je v jednom súbore. Live runtime skladá identitu z workspace-level identity/personas plus IDENTITY_KERNEL, zatiaľ čo src/personas má potvrdenú helper rolu. Persona-definition kópie v src/personas nemajú v aktuálnom flow potvrdený canonical authority call site.

---

## OPEN UNCERTAINTIES

- Cloud branch je kódom potvrdená, ale bez bežiacej Ollamy a bez úspešného cloud runtime testu nie je end-to-end potvrdené, ktoré model/provider kombinácie sú aktuálne dostupné.
- Vision shortcut call site je explicitný, ale bez runtime trigger inputov nie je overený jeho praktický dosah.
- Split identity authority je jasný, ale presná hranica canonical source versus layered override je len čiastočne inferovateľná z importov; nie úplne z runtime behavior bez širšieho testu.

---

## FINAL SUMMARY

SUMMARY:

- entrypoints: OK
- integration verified: YES
- routing stack verified: YES
- local orchestration verified: YES
- cloud branch verified: YES
- validation layers verified: YES
- writeback tail verified: YES
- shadow risk: YES
- overall confidence: MEDIUM
