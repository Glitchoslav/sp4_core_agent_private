# SP4 Runtime Discipline

Status: canonical runtime law

Scope: runtime-affecting changes v `sp4_core_agent/`

Authority: tento dokument uzamyká tri veci naraz:

- tail policy pre `integration.js` a príbuzné runtime guard vrstvy
- must-pass gate pack pre bezpečný patch a release rozhodnutie
- regression protokol pre každú runtime zmenu

Conflict rule: ak je tento dokument v konflikte s historickými release poznámkami alebo root `TEST_GATES.md`, pre canonical runtime vyhráva tento dokument.

---

## 1. Účel

SP4 už nie je len problém „vygenerovať odpoveď“. Canonical runtime musí riadiť pravdu, kontext a dôveru.

Z toho plynie základné pravidlo:

**Tail nesmie byť druhý autor odpovede.**

Tail smie byť len:

- filter
- validator
- minimálny opravca formy
- deterministic boundary responder
- núdzový bezpečnostný prepínač

Tail nesmie byť:

- tichý prepísač významu
- tichý tónový režisér
- generátor „lepšej“ pravdy
- maskovač predchádzajúcej chyby
- fallback spúšťaný bez explicitného reason code

---

## 2. Povolené typy tail zásahov

Povolené sú len tieto zásahy:

1. Hard safety stop
   - explicitný stop pri bezpečnostnom alebo truth boundary verdikte

2. Deterministic boundary response
   - presná odpoveď na známy boundary stav, ak je trigger jasne pomenovaný a logovaný

3. Jazyková normalizácia bez zmeny významu
   - diakritika, zjavná gramatická oprava, odstránenie reziduálnej angličtiny
   - nesmie dopĺňať nové tvrdenia ani meniť intent odpovede

4. Verdict-only evaluácia
   - evaluator smie vrátiť verdict a metadata
   - evaluator sám nesmie potichu meniť text odpovede

5. Response replacement viazaný na explicitný verdict kontrakt
   - replacement je dovolený len ak existuje jednoznačný trigger, reason code a definovaný replacement režim

6. Writeback a observability side effects
   - logovanie, writeback, telemetry a metadata sú povolené, ak nemenia význam odpovede

---

## 3. Zakázané typy tail zásahov

Zakázané sú tieto zásahy:

1. Parafráza „pre istotu“ bez explicitného triggeru
2. Tone cleanup, ktorý mení význam alebo intent
3. Fact enrichment, ktorý nepochádza z upstream autority alebo deterministic source
4. Retry bez dôkazu, že retry ostal grounded a logovateľný
5. Fallback bez uloženého reason code
6. Semantic rewrite, ktorého účel sa nedá opísať jednou vetou

Ak nie je jasné, prečo krok existuje, default verdict je: zúžiť alebo odstrániť.

---

## 4. Tail Contract

Každý tail krok v `integration.js` alebo príbuznej runtime vrstve musí mať pri audite presne tento 5-polový záznam:

| Pole | Význam |
| --- | --- |
| `name` | názov kroku alebo helpera |
| `input contract` | aký stav alebo verdict musí existovať pred spustením |
| `allowed mutation` | čo presne krok smie zmeniť |
| `forbidden mutation` | čo krok nesmie zmeniť |
| `fallback condition` | pri akom explicitnom triggri smie nastať replacement, stop alebo fallback |

Bez tohto kontraktu krok nie je považovaný za uzamknutý.

---

## 5. Operačný verdikt pre tail audit

Pri konkrétnom audite tailu sa používa len tento verdiktový slovník:

### Nechať

- hard safety stop
- deterministic boundary response
- jazyková normalizácia bez významovej zmeny
- relevance verdict, ktorý vracia len verdict a metadata
- response control viazaný na jasný verdict kontrakt

### Zúžiť

- soft rewrite
- tone cleanup
- language cleanup, ak mutuje viac než formu
- retry acceptance
- fallback po „pocite“ namiesto explicitného verdictu

### Zabiť

- každý krok, ktorý po route a po answer generation mení význam bez explicitného a logovaného dôvodu
- každý krok, ktorý robí parafrázu „pre istotu"
- každý fallback bez reason code
- každý tail krok, ktorého účel sa nedá opísať jednou vetou

---

## 6. Logging Contract

Každý tail replacement, retry alebo fallback musí mať:

- explicitný trigger
- reason code v metadata alebo logu
- jasne opísateľný rozsah mutácie

Neexistuje legitímne „asi to bude lepšie takto“.

---

## 7. Hard Gate po každom runtime-affecting patchi

Spúšťa sa z `sp4_core_agent/`.

Must-pass hard gate pack:

```bash
node tests/test_runtime_authority_contract.js
node tests/test_launcher_cwd_contract.js
node tests/test_tail_normalize_contract.js
node tests/test_cleanup_weird_slovak_contract.js
node tests/test_tail_helper_fallback_contract.js
node tests/test_apply_fallback_truth_contract.js
node tests/test_immune_relevance_smalltalk.js
node tests/test_profile_memory_shortcuts.js
node tests/test_deterministic_registry.js
node tests/test_response_control_relevance_contract.js
node tests/test_response_control_flow_smoke.js
node tests/test_slovak_language_enforcement.js
node tests/test_system_command_models_render.js
node tests/test_boot_models_available_semantics.js
node tests/test_short_tech_quality_gate.js
node test_policy_local_default.js
node tests/smoke_test.js
```

Pravidlo:

- ak padne ktorýkoľvek hard gate test, patch sa neberie ako bezpečný
- pri hard gate FAIL sa neoznačuje výsledok za `STABLE`
- pri hard gate FAIL sa patch nemá brať ako pripravený na merge do canonical runtime

---

## 8. Live Gate pred release alebo väčším patchom

Kanonický live gate pack:

```bash
npm run test:live:offline
npm run test:live:battletest
```

Pravidlo:

- ak padne live gate, nič sa nenasadzuje a nič sa neoznačuje za release-ready
- crash, timeout, metadata mismatch alebo porušenie local-only kontraktu je block release

---

## 9. Docs-only a governance výnimka

Ak je zmena čisto dokumentačná alebo governance-only a nemení runtime správanie, import graph ani test runner správanie, plný hard/live gate pack nie je povinný.

Povinné ostáva:

- source-of-truth check (`node tests/test_runtime_authority_contract.js`)
- authority consistency check (`node tests/test_runtime_authority_contract.js`)
- zápis do `SP4_CHANGELOG.md`, ak ide o kanonickú governance zmenu

---

## 10. SP4 Regression Protocol v1

Pri každom runtime patchi sa vyplní aspoň tento stručný protokol:

### 1. Scope

- ktoré súbory sa zmenili
- ktorá vrstva je dotknutá: `routing | validation | identity | interface | tooling | orchestration | memory`

### 2. Blast Radius

- čo sa tým môže rozbiť
- ktoré flow sa toho dotýkajú
- či ide o hot-path alebo okrajový flow

### 3. Source Of Truth Check

- je edit v autoritatívnom súbore
- nehrozí shadow patch alebo dead-copy patch
- ktorý import alebo call site potvrdzuje autoritu

### 4. Test Coverage

- ktoré hard gate testy to kryjú
- ktoré live testy môžu byť dotknuté
- čo ostáva nepokryté

### 5. Tail Risk

- mení sa význam po generovaní
- pribudol nový retry
- pribudol nový fallback
- pribudla nová textová mutácia

Ak je odpoveď na niektorú z týchto otázok `áno`, patch ide automaticky do zvýšeného rizika.

### 6. Changelog Discipline

- jeden zápis v `SP4_CHANGELOG.md`
- dopad
- riziko
- naväzuje na
- detekcia

---

## 11. Patch Workflow

Odporúčaný poriadok po každom runtime zásahu:

1. Diagnóza
2. Opravár
3. Regression Guard
4. Patch Reviewer
5. Kronikár

Najprv zákon, potom audit, až potom runtime zásah.

---

## 12. Aktuálny auditový stav

Kanonický current-state audit inline tailu je zapísaný v:

- `sp4_core_agent/docs/guides/INTEGRATION_TAIL_AUDIT.md`

Tento audit už vedie reálne poradie tailu, 5-polové contracty a verdicty `nechať | zúžiť | zabiť` pre aktuálny live `integration.js`.

Ďalší povinný krok už nie je spísať audit, ale robiť len také runtime zásahy, ktoré sa opierajú o tento audit a držia sa verdiktov pre najrizikovejšie kroky.

Prvých deväť runtime rezov podľa auditu už prebehlo:

- globálny call `normalizeWeirdWords()` bol odpojený z live tailu a stráži ho `tests/test_tail_normalize_contract.js`
- `cleanupWeirdSlovak()` bol zúžený na form-only cleanup a stráži ho `tests/test_cleanup_weird_slovak_contract.js`
- `sanitizeAiCliches()` a `stripResidualEnglish()` prestali vracať vlastné fallback vety a stráži ich `tests/test_tail_helper_fallback_contract.js`
- `detectGeneralQualitySanityIssue()` bol zúžený na hard-corruption-only guard a stráži ho `tests/test_short_tech_quality_gate.js`
- `applyFallbackTruth()` prestal heuristicky hádať fallback dôvod a stráži ho `tests/test_apply_fallback_truth_contract.js`
- immune soft retry bol zúžený na truth-anchored reason-coded kontrakt a strážia ho `tests/test_response_control_relevance_contract.js` a `tests/test_response_control_flow_smoke.js`
- `sanitizeAiCliches()` a `stripResidualEnglish()` prestali mazať broad generic style/English frázy a `tests/test_tail_helper_fallback_contract.js` teraz stráži aj explicitne-meta-only helper kontrakt
- `enforceSlovak()` call-site prestal authorovať vlastnú Slovak fallback vetu pri persistent EN po rewrite a `tests/test_language_enforcer_tail_contract.js` teraz stráži explicit-failure kontrakt s best-available text rozhodnutím
- global language failsafe sa už nespúšťa z obrátenej non-Slovak gate heuristiky, ale len z explicitných language triggerov, a stráži ho `tests/test_global_language_failsafe_contract.js`

Nový patch nemá dokazovať len to, že niečo opravuje.

Musí dokazovať aj to, že neskazil pravdu, kontext a tón v posledných 10 % pipeline.

