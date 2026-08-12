# CODEX BRIEF — Popiči fix (kvalita odpovedí) — 2026-08-12

**Od:** Rudo (SP4TECH, zbrojnica) — na základe live testov OWNERA
**Pre:** Codex (writer pre `sp4_core_agent_private`)
**Priorita:** vysoká — OWNER testoval naživo, kvalita odpovedí popiči je zlá
**Rozsah:** `sp4_core_agent/bridge-server.js` (jeden súbor, 3 fixy)
**Stav kódu:** `main` = 4d0b2c0d (fallback chain), lokálne na zbrojnici pullnuté

---

## Kontext (čo OWNER videl naživo)

1. Popiči bot odpovedá **číslovanými zoznamami** „1) ... 2) ... 3) ... 4) ... 5) ..." — aj keď prompt v0.10.1 (commit 8352497) výslovne hovorí „Žiadne zoznamy, bulletpointy". Prompt si protirečí.
2. Občas **repetition loop**: „...zrazu zrazu zrazu zrazu zrazu zrazu zrazu..." (slovo opakované ~20x, latency 17,9 s, engine ollama).
3. Známy samostatný problém (NERIEŠ v tomto briefe): boty neposielajú konverzačnú históriu → follow-up otázky idú bez kontextu. Rieši sa samostatne.

Repro:
```bash
curl -s -X POST http://127.0.0.1:3002/api/bridge/ask \
  -H "Authorization: Bearer <BRIDGE_AUTH_TOKEN>" -H "Content-Type: application/json" \
  -d '{"text":"Prečo píšeš jak kokot? 😁","persona":"popici","source":"sp4-popici-bot"}'
```

---

## FIX 1 — prompt: odstrániť rozpor (číslovanie vs „žiadne zoznamy")

Súbor: `bridge-server.js`, funkcia `buildPopiciSystemPrompt()` (riadky ~313-317 podľa commitu 8352497).

**Zmena 1a** — štruktúra bez číslovania (model kopíruje formát, ktorý mu ukážeme):

```diff
-        'ODPOVEĎ MUSÍ MAŤ MINIMÁLNE 3-5 VIET (nie jednoslovné odpovede!). Štruktúra: 1) otvorenie humorom alebo sebairóniou 2) jadro = pravda na rovinu, bez omáčky 3) záver = konkrétny jednoduchý krok alebo punchline.',
+        'ODPOVEĎ MUSÍ MAŤ MINIMÁLNE 3-5 VIET (nie jednoslovné odpovede!). Štruktúra v súvislom texte: najprv otvorenie humorom alebo sebairóniou, potom jadro — pravda na rovinu bez omáčky, na záver konkrétny jednoduchý krok alebo pointa.',
```

**Zmena 1b** — explicitný zákaz číslovania:

```diff
-        'Žiadne zoznamy, bulletpointy ani akademické rozbory. Píš po slovensky; slang vítaný, celé vety v angličtine zakázané (okrem názvov: API, JSON, SP4).',
+        'NIKDY nepoužívaj číslovanie (1), 2), 3)...), odrážky, bulletpointy ani nadpisy. Odpoveď je JEDEN súvislý text. Píš po slovensky; slang vítaný, celé vety v angličtine zakázané (okrem názvov: API, JSON, SP4).',
```

---

## FIX 2 — generovacie parametre pre popici (anti-repetition)

Súbor: `bridge-server.js`, call site v handleri `/api/bridge/ask` (~L1296, objekt `llmOptions`).

```diff
         const llmOptions = {
             preference: 'local-only', // ENFORCEMENT: žiadny cloud (kontrakt v1.1)
             model: chosenModel,
             prompt: text,
             system: systemPrompt,
             temperature: typeof body.temperature === 'number' ? body.temperature : 0.2,
             num_predict: 512,
+            // POPICI: nižší cap = menej priestoru na zacyklenie, vyššia repetičná penalizácia
+            ...(personaKey === 'popici' ? { num_predict: 280, repeat_penalty: 1.3 } : {}),
             stop: []
         };
```

**Povinná kontrola:** over, že `repeat_penalty` z `llmOptions` sa reálne prenesie cez `sp4LlmCall` → `src/llm/ollamaClient.js` do ollama requestu (v `ollamaClient.js` je `repeat_penalty = 1.1` default na L103 a posiela sa na L248 — skontroluj, či `sp4LlmCall`/`llmRouter` prepisuje alebo zahadzuje `repeat_penalty` z options). Ak sa stráca, doplň prenos. To je podmienka fixu — bez nej Fix 2 nefunguje.

---

## FIX 3 — post-processing guard (poistka na degeneráciu)

Súbor: `bridge-server.js`. Pridaj funkciu (napr. nad handler `/api/bridge/ask`) a aplikuj ju pre `personaKey === 'popici'` po `sp4LlmCall`, pred vrátením odpovede:

```js
// POPICI: detekcia degenerácie (opakované slovo 5x+ alebo trigram 3x+)
function hasRepetitionLoop(text) {
  const words = text.trim().split(/\s+/);
  for (let i = 0; i < words.length - 4; i++) {
    const w = words[i].toLowerCase();
    if (w.length > 2 && words.slice(i, i + 5).every(x => x.toLowerCase() === w)) return true;
  }
  for (let i = 0; i < words.length - 8; i++) {
    const tri = words.slice(i, i + 3).map(x => x.toLowerCase()).join(' ');
    if (words.slice(i + 3, i + 6).map(x => x.toLowerCase()).join(' ') === tri
     && words.slice(i + 6, i + 9).map(x => x.toLowerCase()).join(' ') === tri) return true;
  }
  return false;
}
```

**Aplikačná logika (odporúčaná):**
1. Ak `personaKey === 'popici' && hasRepetitionLoop(result.text)` → **1 retry** s `{ ...llmOptions, temperature: 0.1, repeat_penalty: 1.5 }` + system prompt doplnený o „NEOPAKUJ slová ani frázy. Ak sa opakuješ, prestaň a ukonči vetu."
2. Ak retry stále loop → **truncate** na prvý čistý úsek (do začiatku opakovania) + pripoj „…" a zaloguj `[POPICI_LOOP]`.
3. Žiadna zmena odpovede, ak loop nie je.

---

## Verifikácia (povinná pred commitom)

Spusti cez bridge (token z `~/.config/sp4-launcher/launcher.env` → `BRIDGE_AUTH_TOKEN`):

```bash
# 1) žiadne číslovanie
curl -s -X POST http://127.0.0.1:3002/api/bridge/ask \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Jak sa máš bratu?","persona":"popici","source":"sp4-popici-bot"}'
# → očakávam: súvislý text 3-5 viet, ŽIADNE "1) 2) 3)"

# 2) žiadny loop
curl -s -X POST http://127.0.0.1:3002/api/bridge/ask \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Prečo píšeš jak kokot? 😁","persona":"popici","source":"sp4-popici-bot"}'
# → očakávam: žiadne opakované slová/trigramy

# 3) ďalšie sanity: "Kto si ty?", "Pomôž mi, som v p*či", "Vysvetli mi SP4"
```

Kritériá: `ok:true`, `engine:ollama`, žiadne `1)` na začiatku viet, žiadna n-gramová repetícia, odpoveď 3-5 viet.

---

## Commit + push (proces)

1. Nová vetva: `sp4/popici-quality-fix-v1` (z `main`)
2. Commit message (konvencia): `fix(popici): quality — prompt bez číslovania, anti-repetition parametre + loop guard`
3. Push + **PR** (nie priamy push na main) — merge schvaľuje OWNER/pi
4. Žiadne secrets v commite; žiadne zmeny mimo rozsahu (jeden súbor)

---

## MIMO rozsahu (samostatné briefy, NERIEŠ tu)

- **Konverzačný kontext (history):** boty posielajú len `{text, persona, source, model}` — treba per-chat history 2-3 správy + odbrániť `isHasicPersona` gating na `historyBlock` (L1172). Samostatný brief.
- **Glitchoslav pamäť:** pamäťové bloky gated na `isHasicPersona` (L1145 collective/kb/member, L1171 manifest) → glitchoslav/popici majú nulový pamäťový kontext; community bot neposiela `memberId`; „čo vieš o mne / čo máš v pamäti" → MYTHOS poézia. Samostatný brief.
- **Fallback reťazec nasadenie:** `OLLAMA_HOSTS` je v `SP4-Launcher/.env` ale NIE v env bežiacich procesov (`sp4_core_agent/.env` ho nemá, systemd unit ho nemá) → live fallback NIE JE aktívny napriek merge 4d0b2c0d. Treba env + reštart reťazca + kill duplicitného enginu (PID 1010964). Samostatný ticket (čaká na OWNERA).

---

## Časová os

- Brief vytvorený: 2026-08-12 15:55 (Rudo)
- Po aplikácii fixu: report do CURRENT_WORK.md + PR
