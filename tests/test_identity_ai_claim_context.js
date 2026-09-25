// Regresný test: falošný IDENTITY_AI_CLAIM pri faktických vetách v 3. osobe.
//
// Bug: identityPatterns.js:41 (/\bjazykov[yý]\s+model\b/i) chytil AKÚKOĽVEK frázu
// "jazykový model", takže faktické "GPT je jazykový model" bolo mylne označené ako
// identitný claim.
//
// Fix: pattern obmedzený na PRVÚ OSOBU ("som/ja som [kvalifikátor] jazykový model"),
// s max 2 slovami medzi "som" a "jazykový model" — aby nechytil pomocné "som"
// v minulom čase ("čítal som článok o tom, čo je jazykový model").

import assert from 'node:assert/strict';
import { runImmuneCheck } from '../src/immune/outputImmuneCheck.js';

function identityCodes(v) {
    return v.reason_codes.filter(c => c.startsWith('IDENTITY'));
}

// ── Negatívne prípady (musia prejsť — NIE identitný claim) ───────────────────
const ALLOW_CASES = [
    { q: 'Čo znamená GPT?', a: 'GPT je jazykový model, ktorý predpovedá ďalšie slovo.' },
    { q: 'Čo je Claude?', a: 'Claude je jazykový model od firmy Anthropic.' },
    { q: 'Čo je jazykový model?', a: 'Čítal som článok o tom, čo je jazykový model.' },
    { q: 'Čo je jazykový model?', a: 'Jazykový model je typ AI, ktorý spracúva text.' },
    { q: 'Čo je SP4?', a: 'SP4 je lokálny AI operačný systém pre komunity.' },
    { q: 'Kto si?', a: 'Som SP4 CORE, tvoj AI asistent pre technické otázky.' },
];

for (const { q, a } of ALLOW_CASES) {
    const v = await runImmuneCheck({ userInput: q, responseText: a, persona: 'core' });
    const idCodes = identityCodes(v);
    assert.equal(idCodes.length, 0,
        `"${a}" nesmie emitovať IDENTITY_* kód (fakt/opis/citácia/vlastná identita), got: [${idCodes.join(',')}]`);
    console.log(`  PASS [allow] "${a.slice(0, 45)}..."`);
}

// ── Pozitívne prípady (musia byť odmietnuté — skutočný identitný claim) ──────
const REJECT_CASES = [
    { a: 'Som jazykový model.' },
    { a: 'Ja som veľký jazykový model.' },
    { a: 'Ako AI jazykový model ti odpoviem.' },
    { a: 'Som ChatGPT, model od OpenAI.' },
    { a: 'Som AI asistent.' },
];

for (const { a } of REJECT_CASES) {
    const v = await runImmuneCheck({ userInput: 'Kto si?', responseText: a, persona: 'core' });
    assert.ok(
        v.reason_codes.includes('IDENTITY_AI_CLAIM') || v.reason_codes.includes('IDENTITY_CONFUSION'),
        `"${a}" musí emitovať IDENTITY_AI_CLAIM alebo IDENTITY_CONFUSION, got: [${v.reason_codes.join(',')}]`
    );
    assert.equal(v.pass, false, `"${a}" musí byť odmietnutá (pass=false)`);
    console.log(`  PASS [reject] "${a}" → codes=[${v.reason_codes.join(',')}]`);
}

console.log('\nPASS: identity AI-claim context testy prešli');
