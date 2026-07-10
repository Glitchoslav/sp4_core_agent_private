# PROGRESS

- **Test ID:** test_001
- **Dátum:** 2026-04-05
- **Zmena:** Vznikla prvá evolučná follow-up test sada a nový runner [tests/phase5_followup_matrix_test.mjs](tests/phase5_followup_matrix_test.mjs).
- **Zlepšenie:** Krytie narástlo zo 4 párov na 13 kontrolovaných otázok vrátane short-tech rozšírení a fallback hrán.
- **Regresia:** Pri prvom behu nepozorovaná; runner prešiel 13/13.
- **Pozorované vzory:** Resolver je zámerne konzervatívny; silné sú `načo` a `ako sa používa`, zatiaľ čo `kde sa používa` a vágne pokračovania korektne padajú do fallbacku.
- **Ďalší krok:** Spustiť test po každej úprave `resolveDeterministicFollowUp` a pri ďalšom patchi zdediť test_001 ako parent základ.

- **Test ID:** test_002
- **Dátum:** 2026-04-05
- **Zmena:** Pridaný live runtime runner [tests/phase5_followup_live_test.mjs](tests/phase5_followup_live_test.mjs), ktorý pre každý pair odohrá reálnu dvojkrokovú konverzáciu cez SP4IntegratedAgent.
- **Zlepšenie:** Odteraz sa zbierajú nielen očakávania a deterministic výstupy, ale aj skutočné runtime odpovede a metadata (`handledBy`, `model`, quality gate).
- **Regresia:** Prvý baseline ukázal slabé live follow-up správanie: viacero prípadov skončilo mimo kontextu, s fallback textom alebo halucinovaným výkladom o CORE persone.
- **Pozorované vzory:** Prvý krok často trafí short-tech guard správne, ale druhý krok v runtime nezdedí tému tak spoľahlivo ako priamy resolver; quality gate pritom follow-up odpovede takmer vôbec nestiahol.
- **Ďalší krok:** Pri ďalšom patchi porovnať `test_001` vs `test_002` a cielene opraviť runtime follow-up handoff medzi short-tech guardom a core flow.

- **Test ID:** test_003
- **Dátum:** 2026-04-05
- **Zmena:** Pridaný diagnostický probe [tests/phase5_followup_handoff_probe.mjs](tests/phase5_followup_handoff_probe.mjs) pre 4 porovnávacie behy `processMessage` vs `ask` na pároch `ping` a `cache`.
- **Zlepšenie:** Test už nesleduje len finálnu odpoveď, ale aj plné raw result objekty, `immuneVerdict`, `responseControlApplied` a interný stav `_dlgState` pred a počas druhého turnu.
- **Regresia:** ProcessMessage vetva ostava bez handoffu a pri identitnom pare stale halucinuje mimo kontextu; to je vsak samostatny problem mimo scope tohto patchu.
- **Pozorované vzory:** Ask vetva ma pred druhym tahom stabilne `user > assistant`, ide cez `followup_deterministic_guard`, nedostava identity reason codes a nespadne na runtime chybe. ProcessMessage vetva ostava s prazdnym stavom a fallback/halucinaciou.
- **Ďalší krok:** Ak je cielom odstranit zvysny handoff rozdiel, presunut zapis dialog state zo samotneho `ask()` do spolocneho centralneho flow, aby rovnakym follow-up kontextom prechadzal aj `processMessage`.

- **Test ID:** test_004
- **Dátum:** 2026-04-05
- **Zmena:** Spustený patch-series runner [tests/integration_handoff_patch_series_test.mjs](tests/integration_handoff_patch_series_test.mjs) pre 6 kontrol integration.js handoff patch série.
- **Zlepšenie:** Testy 1-5 potvrdili správny guard pred initialize, prenesenie `forceLocal`, writeback safety odpovede, zhodu `ask()` s `_dlgState` a plne funkčný follow-up handoff aj cez `processMessage`.
- **Regresia:** Test 6 potvrdil identity blind spot mimo deterministic resolver: follow-up na OSPF skončil odpoveďou `CORE je...`, pričom `immuneVerdict.reason_codes` ostali prázdne a `responseControlApplied` bolo `false`.
- **Pozorované vzory:** Handoff vrstva je po patchoch funkčná, ale upstream generovanie + pattern authority stále púšťajú identity drift pri nedeterministickom follow-upe.
- **Ďalší krok:** Rozšíriť [src/identity/identityPatterns.js](src/identity/identityPatterns.js) o výklady typu `CORE je...` a následne znova pustiť `test_004`, aby sa overilo, či sa drift zachytí v `reason_codes` a či naň zareaguje response control.

- **Test ID:** test_005
- **Dátum:** 2026-04-05
- **Zmena:** Pridaný izolovaný runner [tests/integration_handoff_patch_series_isolated_test.mjs](tests/integration_handoff_patch_series_isolated_test.mjs) a spustený rerun s unikátnym run label `isolated-2026-04-05T00-58-25-312Z`.
- **Zlepšenie:** Výsledky sa už nemiešajú medzi behmi: patch-series artefakt aj probe artefakt majú run-specific názvy a každý subtest nesie unikátne ID.
- **Regresia:** Test 6 znovu zlyhal, ale iným textovým fenotypom než v test_004. Namiesto `CORE je...` vrátil všeobecný mimo-témový text o zmene podmienok. `immuneVerdict.reason_codes` aj tak ostali prázdne a `responseControlApplied` ostalo `false`.
- **Pozorované vzory:** Konkrétne znenie failu je nedeterministické, ale trieda zlyhania je stabilná: nedeterministický follow-up drift nie je zachytený guardmi ani identity authority patternmi.
- **Ďalší krok:** Pri ďalšom patchi netreba ladiť len konkrétny string `CORE je...`, ale rozšíriť pattern authority aj relevance/identity heuristiky tak, aby zachytávali širšiu triedu mimo-témových follow-up driftov.

- **Test ID:** test_006
- **Dátum:** 2026-04-05
- **Zmena:** Vznikla nová patch-targeted sada [tests/immune_prev_context_patch_test.mjs](tests/immune_prev_context_patch_test.mjs) pre priamy test `runImmuneCheck()` a zúžených identity patternov.
- **Zlepšenie:** Test potvrdil patch presne v cieľovej vetve: všetky 3 nové pronoun-only follow-up otázky s `prevUserInput` prešli s `bypass_llm=false` a `llm_used=true`; zároveň `SP4_CORE je system ...` už nepadá ako identity confusion.
- **Regresia:** Ostáva 1 reálny fail: formulácia `CORE je AI asistent pre technicke otazky.` prešla ako `identity_ok=true`, čiže `IDENTITY_CONFUSION_PATTERNS` stále nepokrývajú variant s vloženým `AI` pred `asistent`.
- **Pozorované vzory:** Patch opravil bypass decision pre pronoun-only follow-upy, ale explicitný drift typu `CORE je AI asistent ...` sa už prelieva do LLM hodnotenia ako legitímna odpoveď namiesto hard-fail regex zásahu.
- **Ďalší krok:** Rozšíriť [sp4_core_agent/src/identity/identityPatterns.js](sp4_core_agent/src/identity/identityPatterns.js) o variant `CORE je AI asistent|AI assistant|AI model` bez návratu k širokým architektonickým slovám ako `system`, `nastroj` či `platforma`.

- **Test ID:** test_007
- **Dátum:** 2026-04-05
- **Zmena:** Single-write invariant pre CLI bol zaradený do kanonickej línie cez nový test [sp4_core_agent/tests/test_cli_single_write_invariant.js](c:\SP4KULT\sp4_core_agent\tests\test_cli_single_write_invariant.js).
- **Zlepšenie:** Test staticky stráži, že [sp4_core_agent/index_v07.js](c:\SP4KULT\sp4_core_agent\index_v07.js) už neobsahuje priamy `addLogEntry`, a dynamicky potvrdzuje presne jeden persistentný zápis po jednom `agent.ask()` turne.
- **Regresia:** Nepozorovaná; test prešiel a obnovuje pôvodný `memory.json` po behu.
- **Pozorované vzory:** Autorita writebacku ostáva centralizovaná v integration tail flow; mimo scope ostáva warning `MODULE_TYPELESS_PACKAGE_JSON` z root package metadata.
- **Ďalší krok:** Ak bude treba prísnejší dôkaz, doplniť neskôr separátny child-process bootstrap test nad readline vrstvou bez zmeny tohto jadrového invariant testu.

- **Test ID:** test_007
- **Dátum:** 2026-04-05
- **Zmena:** Test [sp4_core_agent/tests/test_cli_single_write_invariant.js](c:\SP4KULT\sp4_core_agent\tests\test_cli_single_write_invariant.js) bol spevnený presnejším post-ask guardom a voliteľným interaktívnym CLI smoke hookom cez env flag `SP4_CLI_SMOKE=1`.
- **Zlepšenie:** Guard už nehľadá ľubovoľný textový výskyt `addLogEntry(` v celom súbore, ale cieli na zakázaný import a post-ask write pattern v line handler bloku. Zároveň existuje hlbší smoke dôkaz pre readline vrstvu bez toho, aby bol povinný v každom behu.
- **Regresia:** Bežný stabilný wrapper-flow test ostáva zelený, ale voliteľný interaktívny smoke hook zatiaľ v aktuálnom prostredí nepotvrdil persistentný write. Child process doručil odpoveď do stdout, no `rawMemory.log` ostal na `0`, takže smoke hook je zatiaľ len diagnostický a nie pravidelná gate.
- **Pozorované vzory:** Spevnený guard už lepšie cieli na skutočný zákaz po `agent.ask()`. Interaktívny child-process tok vie odpovedať, ale writeback sa v tomto režime nepotvrdil ani pri deterministickom greeting vstupe.
- **Ďalší krok:** Ak bude cieľom dotiahnuť aj interaktívny dôkaz do zelena, treba osobitne zmapovať, prečo child-process CLI tok vracia odpoveď bez potvrdeného `rawMemory.log` writebacku, a až potom rozhodnúť, či smoke hook povýšiť na pravidelnú gate.

- **Test ID:** test_008
- **Dátum:** 2026-04-05
- **Zmena:** Vznikla nová live sada [sp4_core_agent/TESTY/evolution/test_008/questions.json](c:\SP4KULT\sp4_core_agent\TESTY\evolution\test_008\questions.json) a manifest [sp4_core_agent/TESTY/evolution/test_008/manifest.md](c:\SP4KULT\sp4_core_agent\TESTY\evolution\test_008\manifest.md) pre manualny alebo runner-based runtime smoke nad poslednymi zmenami.
- **Zlepšenie:** Krytie sa rozsirilo za follow-up a writeback vrstvu o identity hardening, meta refusal, short-tech jazykovu cistotu, local-first autoritu a legacy launcher kontrakt.
- **Regresia:** Zatial nehodnotena, lebo ide o BUILD krok a nova sada este nebola odbehnuta ako celok.
- **Pozorované vzory:** Najvyssie riziko po poslednych zmenach uz nelezi len vo follow-up handoffe; rovnako dolezite su nepriame identity otazky, prompt leak refusal a short-tech odpovede s CZ/RU artefaktmi.
- **Ďalší krok:** Odohrat test_008 live cez CLI alebo samostatny runner a zapisat, ktore otazky realne padaju na bot challenge, language drift alebo stale slabu system authority odpoved.

- **Test ID:** test_008
- **Dátum:** 2026-04-05
- **Zmena:** Spustený live eval runner [sp4_core_agent/tests/test_008_live_runtime_eval.mjs](c:\SP4KULT\sp4_core_agent\tests\test_008_live_runtime_eval.mjs); artefakty vznikli v [sp4_core_agent/TESTY/logs/test_008.results.latest.json](c:\SP4KULT\sp4_core_agent\TESTY\logs\test_008.results.latest.json) a [sp4_core_agent/TESTY/evolution/test_008/eval.md](c:\SP4KULT\sp4_core_agent\TESTY\evolution\test_008\eval.md).
- **Zlepšenie:** 5 prípadov prešlo vrátane oboch nepriamych identity otázok, priamej identity otázky, localhost short-tech definície a follow-up na ping. Meta guard funguje bezpečne a neleakuje prompt stack.
- **Regresia:** 4 prípady spadli tvrdo: dve runtime authority otázky, OSPF follow-up edge a identity combo. Všetky skončili všeobecným SAFE fallbackom namiesto vecnej odpovede. Paralelne sa v behu opakovane objavila runtime chyba `POPICI_PERSONA.forbidden.motivationalClichés is not iterable`, ktorá tlačí systém do bezpečného režimu.
- **Pozorované vzory:** Deterministické a identity-hardening guardy sú silné. Slabé miesto je prechod do POPIČI validačnej vetvy a následný SAFE degradation, ktorý znehodnotí aj otázky na runtime autoritu. Short-tech jazyková kvalita sa oproti battle baseline zlepšila, ale niektoré očakávané signály ostali len partial.
- **Ďalší krok:** Opraviť kontrakt medzi [identity/personas/popici/persona.popici.js](c:\SP4KULT\identity\personas\popici\persona.popici.js) a [identity/personas/popici/validator.popici.js](c:\SP4KULT\identity\personas\popici\validator.popici.js), potom znovu pustiť test_008 bez zmeny otázok a porovnať, či SAFE fallback zmizne z Q11, Q12, Q15 a Q16.

- **Test ID:** test_009
- **Dátum:** 2026-04-06
- **Zmena:** Vznikla nova build sada [sp4_core_agent/TESTY/evolution/test_009/questions.json](c:\SP4KULT\sp4_core_agent\TESTY\evolution\test_009\questions.json), manifest [sp4_core_agent/TESTY/evolution/test_009/manifest.md](c:\SP4KULT\sp4_core_agent\TESTY\evolution\test_009\manifest.md) a runner [sp4_core_agent/tests/test_009_live_offline_eval.mjs](c:\SP4KULT\sp4_core_agent\tests\test_009_live_offline_eval.mjs).
- **Zlepšenie:** Linia testov ma po novom aj maly core-only offline smoke, ktory tvrdo sleduje `provider`, `model`, local-only kontrakt a explicitne odlisuje environment miss od kodovej regresie cez Ollama health gate.
- **Regresia:** Zatial nehodnotena; ide o BUILD krok a nova sada este nebola zapisane vyhodnotena ako baseline.
- **Pozorované vzory:** Po test_008 uz nestaci vediet, ze guardy drzia. Potrebny je aj maly dokaz, ze aspon niekolko odpovedi naozaj ide cez `local_ollama` s modelom a nie len cez `model=none` guard vetvy.
- **Ďalší krok:** Spustit `npm run test:live:offline` a zapisat, ci lokalny LLM dokaz presiel aspon na 3 case bez cloud pathu a bez follow-up driftu.

- **Test ID:** test_009
- **Dátum:** 2026-04-06
- **Zmena:** Live eval runner [sp4_core_agent/tests/test_009_live_offline_eval.mjs](c:\SP4KULT\sp4_core_agent\tests\test_009_live_offline_eval.mjs) bol odbehnuty; vznikli artefakty [sp4_core_agent/TESTY/logs/test_009.results.latest.json](c:\SP4KULT\sp4_core_agent\TESTY\logs\test_009.results.latest.json) a [sp4_core_agent/TESTY/evolution/test_009/eval.md](c:\SP4KULT\sp4_core_agent\TESTY\evolution\test_009\eval.md).
- **Zlepšenie:** Hlavny ciel testu presiel: local-only kontrakt ostal cisty, cloud path sa nepouzil a realny local LLM dokaz vysiel 5/3 cez `provider=local_ollama` a `model=gemma3:4b`.
- **Regresia:** Kvalitativne jadro je zatial slabe: len 1 PASS a 6 PARTIAL. Odpovede drzali temu, ale pravidelne minuli pozadovane signaly ako `sp4.js start`, `127.0.0.1`, `OSPF` alebo explicitne slova `local/cloud`.
- **Pozorované vzory:** Guard vetvy Q01-Q02 su stabilne. Ked sa ide cez lokalny model, system sa uz neprepada do SAFE failu ako v test_008, ale vysvetlenia su prilis volne a casto nevracaju kanonicke runtime terminy, ktore test ocakava.
- **Ďalší krok:** Bud sprisnit prompt authority pre runtime/local-first vysvetlenia, alebo jemne upravit expected signaly v Q03-Q07 tak, aby lepsie merali vecnost a nie presny slovnik modelu.

- **Test ID:** test_010
- **Dátum:** 2026-04-06
- **Zmena:** Vznikla nova build sada [sp4_core_agent/TESTY/evolution/test_010/questions.json](c:\SP4KULT\sp4_core_agent\TESTY\evolution\test_010\questions.json), manifest [sp4_core_agent/TESTY/evolution/test_010/manifest.md](c:\SP4KULT\sp4_core_agent\TESTY\evolution\test_010\manifest.md) a runner [sp4_core_agent/tests/test_010_live_battletest_eval.mjs](c:\SP4KULT\sp4_core_agent\tests\test_010_live_battletest_eval.mjs).
- **Zlepšenie:** Kanonicka linia testov ma po novom sirsu battle sadu s 50 otazkami, ktora spaja inherited jadro z test_008/test_009, historicke root battletest temy a novu auto-routing live exekuciu s local-only kontraktom.
- **Regresia:** Zatial nehodnotena; ide o BUILD krok a nova sada este nebola odbehnuta ako plny baseline.
- **Pozorované vzory:** Po test_009 bolo zjavne, ze maly offline smoke je dobry na local_ollama dokaz, ale nestaci na routing, memory dialog, persona vetvy ani edge follow-upy. Test_010 preto znovu sklada sirsie krytie do jedneho kanonickeho runnera v sp4_core_agent.
- **Ďalší krok:** Spustit `npm run test:live:battletest` a zapisat, ktore buckety padaju najviac: runtime authority, memory recall, persona routing alebo OSPF/cache/localhost follow-up edge.

- **Test ID:** test_010
- **Dátum:** 2026-04-06
- **Zmena:** Live eval runner [sp4_core_agent/tests/test_010_live_battletest_eval.mjs](c:\SP4KULT\sp4_core_agent\tests\test_010_live_battletest_eval.mjs) bol odbehnuty; vznikli artefakty [sp4_core_agent/TESTY/logs/test_010.results.latest.json](c:\SP4KULT\sp4_core_agent\TESTY\logs\test_010.results.latest.json) a [sp4_core_agent/TESTY/evolution/test_010/eval.md](c:\SP4KULT\sp4_core_agent\TESTY\evolution\test_010\eval.md).
- **Zlepšenie:** Hlavny kontrakt novej sady funguje: 50-case runner prebehol, cloud path sa nepouzil a realny local LLM dokaz vysiel 33/12, teda vyrazne nad minimom.
- **Regresia:** Kvalitativny baseline je zatial tvrdy: 13 PASS / 18 PARTIAL / 19 FAIL. Slabe su hlavne runtime authority, memory dialog a follow-up edge buckety; viacero technickych a memory otazok skoncilo vo vetve `popici` namiesto vecneho CORE vysvetlenia.
- **Pozorované vzory:** Identity a meta guardy drzia velmi dobre. Deterministicke short-tech a system-info guardy su stale najsilnejsie. Ked vsak auto routing alebo context lock pretiahne technicke a memory case do Popici vetvy, odpovede sice zostanu lokalne a bez cloud driftu, ale minaju ocakavane signaly ako `sp4.js start`, `raw/summaries/chapters/seeds`, `Kefyk/SP4`, `OSPF` alebo `cache`.
- **Ďalší krok:** Pri dalsom child teste oddelit aspon dve veci: 1. routing kontrakt pre technicke/memory otazky, kde sa nema udrzat Popici lock, 2. expected signaly pri otvorenych LLM odpovediach tak, aby merali vecnost a nie len presne klucove slova.

- **Test ID:** test_013
- **Dátum:** 2026-04-11
- **Zmena:** Vznikla nova child sada [sp4_core_agent/TESTY/evolution/test_013/questions.json](c:\SP4KULT\sp4_core_agent\TESTY\evolution\test_013\questions.json) a runner [sp4_core_agent/tests/test_013_improvement_leak_eval.mjs](c:\SP4KULT\sp4_core_agent\tests\test_013_improvement_leak_eval.mjs); live eval vytvoril artefakty [sp4_core_agent/TESTY/logs/test_013.results.latest.json](c:\SP4KULT\sp4_core_agent\TESTY\logs\test_013.results.latest.json) a [sp4_core_agent/TESTY/evolution/test_013/eval.md](c:\SP4KULT\sp4_core_agent\TESTY\evolution\test_013\eval.md).
- **Zlepšenie:** Hladany anti-pattern je potlaceny: v 15-case sade sa ani raz neobjavil zakazany leak `Návrh na vylepšenie`, `fallback_fired` ostal 0 a local LLM dokaz vysiel 13/15.
- **Regresia:** Kvalitativny baseline ostava slaby: 5 PASS / 2 PARTIAL / 8 FAIL. Fail-y uz nie su leak bug, ale theme-shaping misses (`pomoc vs manipulacia`, `pravdiva spatna vazba`), neaktivovany decision format (`VERDIKT/PREČO/KROK`) a rozpad follow-up carry po otvorenych behavioralnych otazkach.
- **Pozorované vzory:** Fix v [sp4_core_agent/agents.js](c:\SP4KULT\sp4_core_agent\agents.js) odstránil explicitny pattern z promptu, ale test mode casto obchadza immune a odhaluje, ze samotny CORE freeform prompt este nema dost silny behavior/decision contract. Q14 navyse ukazal, ze followup_deterministic_guard si pri `rozved to jednoduchsie` zle vybral persony/agentov namiesto udrzania bezpecnostnej temy.
- **Ďalší krok:** Dalsi child test alebo fix by mal oddelit 3 dlhove vetvy: 1. silnejsi decision activation pre energy/pressure wording, 2. behavior prompt shaping bez mentorovej omacky, 3. follow-up carry heuristiku pre otvorene behavioralne vysvetlenia.

- **Test ID:** test_014
- **Dátum:** 2026-04-12
- **Zmena:** Battletest wrapper [sp4_core_agent/battletest.js](c:\SP4KULT\sp4_core_agent\battletest.js) a live runner [sp4_core_agent/tests/test_010_live_battletest_eval.mjs](c:\SP4KULT\sp4_core_agent\tests\test_010_live_battletest_eval.mjs) boli parametrizované cez `SP4_BATTLETEST_ID` / `--test-id`; vznikla nová 214-case sada [sp4_core_agent/TESTY/evolution/test_014/questions.mjs](c:\SP4KULT\sp4_core_agent\TESTY\evolution\test_014\questions.mjs) a manifest [sp4_core_agent/TESTY/evolution/test_014/manifest.md](c:\SP4KULT\sp4_core_agent\TESTY\evolution\test_014\manifest.md).
- **Zlepšenie:** Kanonický battletest už nie je natvrdo priviazaný na test_010. Default prepare/full run smeruje na 200+ suite, ale 50-case baseline ostáva spustiteľná bez duplikácie runnera.
- **Regresia:** Zatial nehodnotena; ide o BUILD a prepare krok. Plny 212-case live beh este nebol odbehnuty ako baseline.
- **Pozorované vzory:** Na rozsirenie na 200+ uz nestacilo pridat dalsi JSON. Root problem bol exekucny povrch: wrapper aj runner mali natvrdo zabudovany test_010 path, takze nova sada by bez parametrizacie nebola kanonicky spustitelna.
- **Ďalší krok:** Spustit `node battletest.js --prepare` pre test_014, potom cielene odbehnut plny 212-case run v test mode alebo live mode a zapisat nove baseline buckety s osobitnym fokusom na memory_dialogue, policy_edge a follow-up topic hold.
