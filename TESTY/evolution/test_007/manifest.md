# test_007

- parent_test_id: test_006
- mode: BUILD
- goal: Dokazat, ze po jednom CLI-ekvivalentnom turne vznikne presne jeden persistentny write a autorita writebacku zostane centralizovana.
- scope: CLI wrapper, integration pipeline, writeback tail, memory persistence, runtime logging boundary.
- evidence target: spustitelny regresny test v sp4_core_agent/tests/test_cli_single_write_invariant.js.

## Core Inherited Set

- Z tejto linie sa dedi samotny princip centralnej writeback authority z integration tail flow; neprebera sa starsia otazkova sada, lebo ide o novy typ invariant testu.

## New Coverage

- Jeden CLI turn musi zapisat presne jeden rawMemory entry.
- Ulozeny input sa musi zhodovat s odoslanou spravou.
- index_v07.js nesmie po patche obsahovat priamy addLogEntry import ani konkretny zakazany post-ask addLogEntry pattern.
- Test obsahuje volitelny interaktivny CLI smoke hook, ktory sa spusta len cez env flag a tym neznehodnocuje stabilitu bezneho regresneho behu.

## Edge / Stress

- Test musi obnovit povodny memory.json.
- Import memory -> runtimeLogging nesmie vytvorit zjavnu inicializacnu slucku.
- Interaktivny CLI smoke test nesmie byt povinna flaky brana; ma sluzit ako cielene hlbsie overenie readline bootstrap vrstvy.

## Why This Test Exists

Predosla evidencia potvrdila root cause a minimalny patch, ale chybalo regresne strazenie invariant-u "jeden CLI turn = jeden persistentny write" v kanonickej testovej linii pod sp4_core_agent/TESTY.
