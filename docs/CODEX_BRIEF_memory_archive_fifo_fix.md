# CODEX BRIEF — P1 memory retention fix: Archiver (getMemoryAge) + FIFO cap archivácia

**Zdroj briefu:** SP4CORE (DeepSeek, mobil), zapísaný `Glitchoslav/SP4` `plans/2026-08-16-p1-memory-archive-fifo-fix.md`
(commit `09d2ad2`). Tento súbor je jeho kópia priamo v cieľovom repo, aby si mal Codex kontext
bez skoku medzi repami.

**Repo:** `sp4_core_agent_private` · **Vetva:** `fix/memory-archive-fifo-v1` (založená z `main` @ `dfda09b`)
**Proces:** Codex (writer) → pi/SP4CORE (verifikátor) → Claude (review, read-only) → OWNER (merge gate)

> Rozsah: **P1 = bug #3 (Archiver) + bug #2 (FIFO cap).** Jedno PR, sú na sebe závislé.
> **P2** (dual-store `relationship`/`relationshipModel`) a **P3** (`weekly_consolidation`) **NIE SÚ** v scope — triáž v `CURRENT_WORK.md` (16.8.).
> **Bug #5** (`epochLog` `.jobs`) je už RESOLVED (`208a258`, main) — netýka sa tohto PR.

Root cause overený nezávisle (Claude, proti `origin/main` `dfda09b`, 2026-08-16):
- `memory/metadataHelpers.js:134` — `getMemoryAge` číta `memoryObj.timestamp`, ktoré v raw-log zázname neexistuje (potvrdené).
- `memory.js` FIFO cap — `mem.rawMemory.log = mem.rawMemory.log.slice(-max)` zahadzuje najstaršie záznamy bez archivácie (potvrdené).

## Cieľ
Zastaviť tiché strácanie pamäte v `sp4_core_agent`.

## Fix 1 — `memory/metadataHelpers.js` (fallback reťazec, back-compat)

```diff
 export function getMemoryAge(memoryObj) {
     const now = new Date();
-    const created = new Date(memoryObj.timestamp);
+    // Fallback: legacy `timestamp` (WALTER) → nový `ts` → `lastUsed`
+    // (raw-log metadata má len `lastUsed`, čo pre append-only log = čas zápisu)
+    const created = new Date(memoryObj.timestamp ?? memoryObj.ts ?? memoryObj.lastUsed);
     const ageMs = now - created;
     return Math.floor(ageMs / (1000 * 60 * 60 * 24));
 }

 export function getDaysSinceLastUse(memoryObj) {
     const now = new Date();
-    const lastUsed = new Date(memoryObj.lastUsed || memoryObj.timestamp);
+    const lastUsed = new Date(memoryObj.lastUsed ?? memoryObj.timestamp ?? memoryObj.ts);
     const unusedMs = now - lastUsed;
     return Math.floor(unusedMs / (1000 * 60 * 60 * 24));
 }
```

`??` zámerne namiesto `||` — prázdny string by inak prešiel fallbackom a spravil `Invalid Date`.
Nepremenovávať na `ts` — tri tvary žijú v kóde naraz (legacy `timestamp`, raw-log `ts`, metadata `lastUsed`).

## Fix 2 — `memory.js` (FIFO cap archivuje pred orezaním)

```diff
   const max = mem.preferences?.maxLogEntries ?? 500;
   if (mem.rawMemory.log.length > max) {
-    mem.rawMemory.log = mem.rawMemory.log.slice(-max);
+    const overflow = mem.rawMemory.log.length - max;
+    const evicted = mem.rawMemory.log.slice(0, overflow);
+    if (!mem.archivedMemory) mem.archivedMemory = [];
+    const archivedAt = new Date().toISOString();
+    for (const entry of evicted) {
+      mem.archivedMemory.push({ ...entry, archivedAt, reason: 'fifo_cap_eviction' });
+    }
+    mem.rawMemory.log = mem.rawMemory.log.slice(-max);
   }
```

Tvar zrkadlí `consolidationEngine.js:572-577` (`{ ...entry, archivedAt, reason }`). Persistuje sa
cez existujúci `saveMemory(mem)`.

## Fix 3 (voliteľný, na uváženie Codexa) — merge `ts` priamo na call site
`shouldArchive({ ...(entry.metadata || {}), ts: entry.ts })` — nie nutné, fallback v Fix 1 to pokrýva.

## Testy — musia ostať zelené (regresia)
`test_metadata_contract.js`, `tests/legacy/test_consolidation.js`, `tests/legacy/test_memory_audit.js`,
`tests/legacy/test_memory_v10.js` (legacy `timestamp` tvar), `tests/integration/test_auto_consolidation.js`,
`test_memory_architecture_guard_contract.js`, `test_memory_safety_boundary.js`,
`test_memory_subcomponent_truth_contract.js`.

## Nové testy (pridať do `tests/memory/` alebo rozšíriť existujúce)
1. `getMemoryAge` s raw-log tvarom (`{ ts, metadata: { lastUsed } }`) → ~0 pre čerstvý, >N pre starý.
2. `getMemoryAge` s legacy tvarom (`{ timestamp }`) → rovnaký výsledok (back-compat).
3. `getMemoryAge` len s `{ metadata: { lastUsed } }` → korektný vek (fallback).
4. `getMemoryAge` bez akéhokoľvek časového poľa → `shouldArchive` vráti `false` (žiadny crash/falošná archivácia).
5. `shouldArchive` na old + low-importance + unused → `true`.
6. FIFO: zápis `max+1` → `log.length == max`, `archivedMemory.length == 1`, evicted má `reason:'fifo_cap_eviction'`, zachované `input`/`reply`/`ts`.
7. FIFO: evicted sú najstaršie (poradie zachované, slice od začiatku).

## Global constraints
- Žiadna zmena schémy (`archivedMemory` už existuje, len sa začína plniť).
- Žiadne nové závislosti.
- Archiver cron/scheduler — mimo scope (P3/P4).
- `archivedMemory` nemá vlastný cap — s fixom začne rásť; známy follow-up, NEblokovať týmto PR.
- Nedotýkať sa `relationship`/`relationshipModel` (P2) ani `epochLog` (RESOLVED).
- Zmeny len v `memory/metadataHelpers.js` a `memory.js` (okrem voliteľného Fix 3).

## Definícia hotového
- `getMemoryAge`/`getDaysSinceLastUse` používajú fallback `timestamp ?? ts ?? lastUsed`.
- FIFO cap archivuje evicted záznamy do `archivedMemory` (`reason: fifo_cap_eviction`) pred orezaním.
- Nové testy 1–7 zelené, existujúca suite bez regresie.
- Commit → push na `fix/memory-archive-fifo-v1` → PR (merge gate OWNER).
