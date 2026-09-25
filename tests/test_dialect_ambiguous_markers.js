// Regresný test: odstránenie izolovaných "co" a "jak" ako falošných markerov východniarčiny.
//
// Bug: dialectAnalyzer.js extended keywords obsahoval "co" (ASCII "čo") a "jak" (colloquial
// "ako") ako samostatné dôkazy východniarčiny → každá spisovná otázka písaná bez diakritiky
// s "čo"/"ako" dostala falošnú východniarčinu (conf 0.34–0.40).
//
// Fix: "co" a "jak" odstránené zo samostatných extended markerov. Zachované v
// jednoznačných slovných spojeniach ("ta co", "jak še").

import assert from 'node:assert/strict';
import { DialectAnalyzer } from '../src/core/dialectAnalyzer.js';

const da = new DialectAnalyzer();

function analyze(text) {
    return da.analyze(text);
}

// ── Spisovná slovenčina BEZ diakritiky (nesmie byť východniarčina) ────────────
const STANDARD_NO_DIACRITICS = [
    'co je sp4?',
    'co znamena gpt?',
    'jak to funguje?',
    'jak sa mas?',
    'co robi tento program?',
    'preco to nefunguje?',
];

for (const text of STANDARD_NO_DIACRITICS) {
    const r = analyze(text);
    assert.equal(r.isEasternSlovak, false,
        `"${text}" nesmie byť detekovaná ako východniarčina (conf=${r.confidence.toFixed(2)})`);
    console.log(`  PASS [standard] "${text}" → conf=${r.confidence.toFixed(2)}`);
}

// ── Bežné pozdravy (nesmú byť východniarčina) ────────────────────────────────
const GREETINGS = ['nazdar', 'ahoj', 'dobrý deň', 'ako sa máš?', 'čau'];

for (const text of GREETINGS) {
    const r = analyze(text);
    assert.equal(r.isEasternSlovak, false,
        `"${text}" nesmie byť detekovaná ako východniarčina (conf=${r.confidence.toFixed(2)})`);
    console.log(`  PASS [greeting] "${text}" → conf=${r.confidence.toFixed(2)}`);
}

// ── Skutočná východniarčina (musí ostať detekovaná) ──────────────────────────
const EASTERN_CASES = [
    'ta co je?',
    'jak še maš?',
    'hej ta bratu, šak vidiš',
    'no še dzeci, bo furt',
    'ta bratu, poďme na pivo',
];

for (const text of EASTERN_CASES) {
    const r = analyze(text);
    assert.equal(r.isEasternSlovak, true,
        `"${text}" MUSÍ byť detekovaná ako východniarčina (conf=${r.confidence.toFixed(2)})`);
    console.log(`  PASS [eastern] "${text}" → conf=${r.confidence.toFixed(2)} level=${r.dialectLevel}`);
}

console.log('\nPASS: dialect ambiguous-marker testy prešli');
