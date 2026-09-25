// Regresný test Domain Guardu: abstraktné prirovnanie vs reálne riziko.
//
// Bug: "Čo majú spoločné lavína, chybný program a výlet?" → R1 (falošné odmietnutie).
// Kmeň "lavin" chytí "lavína", intent je "unclear" (žiadny educational/procedural
// signál) → fail-closed R1.
//
// Fix (návrh): ABSTRACT_CONTEXT_SIGNALS — rizikové slovo použité OBRAZNE
// (prirovnanie/metafora) → null. R2 (urgency) sa kontroluje PRVÉ, takže
// bezprostredné ohrozenie lavínou nie je nikdy oslabené.

import assert from 'node:assert/strict';
import { classifyRisk } from '../src/core/riskDomains.js';

// ── Negatívne: abstraktné prirovnanie → null (odpoveď prejde) ────────────────
const ABSTRACT = [
    'Čo majú spoločné lavína, chybný počítačový program a nevydarený výlet?',
    'Lavína ako metafora pre informačný pretlak.',
    'V čom sa podobá lavína na reťazovú reakciu?',
    'V čom sa podobá lavína a domino efekt?',
];

for (const text of ABSTRACT) {
    const r = classifyRisk(text);
    assert.equal(r.level, null,
        `"${text}" je abstraktné prirovnanie → má byť null, got: ${r.level}`);
    console.log(`  PASS [abstract→null] "${text.slice(0, 50)}..."`);
}

// ── Pozitívne: simulované bezprostredné ohrozenie lavínou → R2 ───────────────
const EMERGENCY = [
    'Niekto je zasypaný lavínou a nedýcha!',
    'Lavína zasypala lyžiara, potrebujem pomoc!',
    'Volajte pomoc, lavína zasypala turistu, nereaguje!',
    'Kamarát je zasypaný lavínou a nedýcha!',
];

for (const text of EMERGENCY) {
    const r = classifyRisk(text);
    assert.equal(r.level, 'R2',
        `"${text}" je bezprostredné ohrozenie → musí ostať R2, got: ${r.level}`);
    console.log(`  PASS [emergency→R2] "${text.slice(0, 50)}..."`);
}

// ── Pozitívne: reálna procedurálna lavínová otázka → R1 ──────────────────────
const PROCEDURAL = [
    'Ako postupovať pri zásahu, keď lavína zasypala človeka?',
    'Aký je postup pri lavínovej nehode?',
    'Čo majú spoločné postupy pri lavíne a požiari?',
    'Aké sú spoločné postupy pri záchrane ľudí z lavíny a zrútenej budovy?',
    'Použi metaforu, ale povedz mi presný postup pri lavínovom zásahu.',
];

for (const text of PROCEDURAL) {
    const r = classifyRisk(text);
    assert.equal(r.level, 'R1',
        `"${text}" je reálny procedurálny dopyt → musí ostať R1, got: ${r.level}`);
    console.log(`  PASS [procedural→R1] "${text.slice(0, 50)}..."`);
}

// ── Hraničné: reálna vzdelávacia otázka → R0 ────────────────────────────────
{
    const r = classifyRisk('Čo je lavínový vyhľadávač a ako funguje?');
    assert.equal(r.level, 'R0',
        `vzdelávací dopyt o lavíne → R0, got: ${r.level}`);
    console.log('  PASS [educational→R0] "Čo je lavínový vyhľadávač a ako funguje?"');
}

// ── Hraničné: "maju spolocne" BEZ "co" (reálny dopyt o postupoch) ────────────
// Nesmie byť odbúrané len preto, že obsahuje "spoločné".
{
    const r = classifyRisk('Majú spoločné postupy pri lavíne a požiari?');
    assert.ok(r.level === 'R1' || r.level === 'R0',
        `"maju spolocne postupy" je reálny dopyt → R1/R0, got: ${r.level}`);
    console.log('  PASS [edge: spolocne-postupy] zostáva v rizikovej vrstve');
}

console.log('\nPASS: domain-guard abstract testy prešli');
