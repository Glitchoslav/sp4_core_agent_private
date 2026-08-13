// ┌─────────────────────────────────────────────┐
// │  SP4 Memory Eval Harness (v0)              │
// │  Metrika: recall@5 + end-to-end            │
// │  Vzor: LongMemEval/LoCoMo (SK adaptácia)   │
// └─────────────────────────────────────────────┘
//
// ⚠️ Toto je STARTER. Skutočný harness treba naplniť REÁLNYMI otázkami z histórie
// (20–50 SK otázok s known-good odpoveďami), ako sa pamäť plní. Claude review:
// „bez eval harnessu lietate naslepo".

import { initMemoryDb, recordEpisode, searchMemory } from '../src/memory/sp4Memory.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// known-good páry: otázka → seed (verbatim epizóda) + očakávaný fragment odpovede
const CASES = [
    { q: 'Kto vytvoril SP4?', seed: 'SP4 vytvoril Kefyk ako lokálny offline-first ekosystém.', expect: 'Kefyk' },
    { q: 'Kedy je zber odpadu?', seed: 'Zber triedeného odpadu je každú stredu ráno pred siedmou.', expect: 'stred' },
    { q: 'Kde sa koná obecný ples?', seed: 'Obecný ples bude v kultúrnom dome na námestí.', expect: 'kultúrn' },
    { q: 'Ako sa volá starosta?', seed: 'Starostom obce Spišský Štvrtok je pán Novák.', expect: 'Novák' },
    { q: 'Čo je Herbár?', seed: 'Herbár je zbierka overených open-source appiek pre komunitu.', expect: 'Herbár' },
    { q: 'Kedy je hasičská súťaž?', seed: 'Hasičská súťaž sa koná prvú sobotu v septembri.', expect: 'sobot' },
    { q: 'Kde sa dá kúpiť med?', seed: 'Med sa dá kúpiť u včelára pána Kováča na hornom konci.', expect: 'Kováč' },
    { q: 'Čo je SP4?', seed: 'SP4 je lokálny komunitný AI ekosystém, ktorý beží na vlastných strojoch.', expect: 'ekosystém' },
    { q: 'Kedy je futbalový turnaj?', seed: 'Futbalový turnaj sa hrá poslednú nedeľu mesiaca.', expect: 'nedeľ' },
    { q: 'Kto spravuje obecný web?', seed: 'Obecný web spravuje pán Horák dobrovoľne.', expect: 'Horák' },
    { q: 'Kedy sa stretáva obecné zastupiteľstvo?', seed: 'Zastupiteľstvo sa stretáva každý druhý štvrtok v mesiaci.', expect: 'štvrtok' },
    { q: 'Kde je pošta?', seed: 'Pošta je oproti kostola vedľa potravín.', expect: 'kostol' },
];

function recallAtK(results, expect, k = 5) {
    const top = results.slice(0, k);
    return top.some((r) => (r.content || '').toLowerCase().includes(expect.toLowerCase()));
}

function main() {
    const dbPath = path.join(os.tmpdir(), `sp4-eval-${Date.now()}.db`);
    const db = initMemoryDb(dbPath);

    // seed — epizódy s rôznym vekom (recency časť skóringu)
    const now = Date.now();
    CASES.forEach((c, i) => {
        recordEpisode(db, {
            ts: new Date(now - i * 3600 * 1000).toISOString(), // postupne staršie
            communityId: 'eval',
            topic: null,
            content: c.seed,
            importance: 0.6,
            sourceChannel: 'eval',
        });
    });

    let recallHits = 0;
    let endToEndHits = 0;
    console.log('│ otázka                                     │ recall@5 │');
    console.log('├────────────────────────────────────────────┼──────────┤');
    for (const c of CASES) {
        const results = searchMemory(db, c.q, { budgetTokens: 100000, limit: 50 });
        const hit = recallAtK(results, c.expect);
        if (hit) recallHits += 1;
        const e2e = results.length > 0 && results[0].content.toLowerCase().includes(c.expect.toLowerCase());
        if (e2e) endToEndHits += 1;
        const mark = hit ? '✅' : '❌';
        console.log(`│ ${c.q.padEnd(43)} │   ${mark}    │`);
    }
    console.log('└────────────────────────────────────────────┴──────────┘');

    const recall = recallHits / CASES.length;
    const e2e = endToEndHits / CASES.length;
    console.log(`\nrecall@5 = ${recall.toFixed(2)} (prah Claude: <0.6 → meň model/prahy, nie architektúru)`);
    console.log(`end-to-end@1 = ${e2e.toFixed(2)}`);

    db.close();
    for (const f of [dbPath, dbPath + '-wal', dbPath + '-shm']) {
        if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    process.exitCode = recall >= 0.6 ? 0 : 1;
}

main();
