// Regresný test routingu: explicitný dopyt po podrobnosti nesmie skončiť na
// num_predict=150 (done_reason=length, eval_count=150 → orezaná odpoveď).
//
// Bug: classify("Co je SP4? Vysvetli mi to podrobne.") → score=0 → num_predict=150.
// "podrobne" / "detailne" nie sú v DEEP_RE, takže explicitný dopyt po podrobnosti
// dostane 150 tokenov a model sa oreže v polovici vety.

import assert from 'node:assert/strict';
import { classify } from '../src/routing/classify.js';

// "Vysvetli mi to podrobne" — explicitný dopyt po detailoch.
const detail = classify('Co je SP4? Vysvetli mi to podrobne.', { persona: 'core' });
assert.ok(detail.num_predict >= 250,
    `"podrobne" musí zvýšiť num_predict (≥250), got: ${detail.num_predict} (reason: ${detail.reason})`);
console.log(`  PASS [detail] "podrobne" → num_predict=${detail.num_predict}`);

// Bežná triviálna otázka bez dopytu po podrobnosti — môže ostať krátka.
const short = classify('co je sp4?', { persona: 'core' });
console.log(`  INFO [baseline] "co je sp4?" → num_predict=${short.num_predict} (reason: ${short.reason})`);

// Krátky pozdrav — nesmie zbytočne skočiť na dlhú odpoveď.
const greet = classify('nazdar', { persona: 'core' });
assert.ok(greet.num_predict <= 250,
    `pozdrav nesmie mať dlhú odpoveď, got: ${greet.num_predict}`);
console.log(`  PASS [greeting] "nazdar" → num_predict=${greet.num_predict}`);

console.log('\nPASS: classify depth-signal testy prešli');
