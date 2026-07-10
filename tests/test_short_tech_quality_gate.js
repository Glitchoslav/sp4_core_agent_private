// ┌─────────────────────────────────────────────────────────────┐
// │  SP4 OS TEST: Short Tech Quality Gate                      │
// │  Layer: Protection / Regression                            │
// │  Role: Freeze weak short-tech failure modes                │
// └─────────────────────────────────────────────────────────────┘

import assert from 'node:assert/strict';
import { detectGeneralQualitySanityIssue } from '../src/pipeline/qualityGuards.js';

console.log('🧪 TEST: quality sanity hard-corruption contract');

assert.equal(typeof detectGeneralQualitySanityIssue, 'function', 'quality gate function must be extractable for regression test');

const utilityFixtures = [
    {
        name: 'wifi router weak utility answer',
        queryType: 'technical_simple',
        userMessage: 'čo robí wifi router?',
        responseText: 'WiFi router overies prepojenie medzi vašou sietou a internetom, šírigeľuje signál WiFi, aby sa mohli počítače, mobilné telefoné a iné zařízenia pripojiť k sieti bez použitia kabláv.',
    },
    {
        name: 'cache weak utility answer',
        queryType: 'technical_simple',
        userMessage: 'čo je cache',
        responseText: 'Cache je dohromady buforovací systém, ktorý uľahčuje rýchlejšie prístupovanie k údajom. V internetovej technológií sa často používa na uloženie obsahu webových stránok alebo iných dat blízko prehliadači, aby zmenšili počet potrebných dotákov na server a rýchleji nahradovali tieto údaje.',
    },
    {
        name: '404 weak utility answer',
        queryType: 'technical_simple',
        userMessage: 'čo znamená chyba 404 a ako ju vyriešim?',
        responseText: 'Chyba 404 znamená, že požadovaná stránka nie je na mieste. Pre jej vyriešenie overte URL, skontrolujte internetový pripojenie alebo obnovte stránku. Ak chyba trvá, kontaktujte administrátora webového stránkovania.',
    },
    {
        name: 'ollama port weak utility answer',
        queryType: 'technical_simple',
        userMessage: 'ako nastavím port v ollama',
        responseText: 'Ak chcete nastaviť port vo Ollame, môže to urobiene cez súvisiaci konfiguračný súbor alebo API. Premenovanie portu obvykle znamená úpravu súradníka port v konfiguračnom subore app.yaml alebo pomocou príkazu ollamectl config set server.port <nový_port>. Nezabudnite overiť, či nový port je dostupný a správne nastavený vo vašej sprievodcovej konfigurácii.',
    },
    {
        name: 'cz sk mix short-tech utility answer',
        queryType: 'technical_simple',
        userMessage: 'čo robí wifi router?',
        responseText: 'WiFi router zdieľa pripojenie medzi sietou a zařízením, prenosiaci údaje štrátom bezpečného spojenia.',
    }
];

for (const fixture of utilityFixtures) {
    const result = detectGeneralQualitySanityIssue({
        userMessage: fixture.userMessage,
        responseText: fixture.responseText,
        queryType: fixture.queryType,
        responseControlApplied: false,
    });

    assert.equal(result.applied, false, `${fixture.name}: utility-only answer must not be blocked by hard-corruption guard`);
}

const corruptionFixtures = [
    {
        name: 'stub output',
        queryType: 'conversational',
        userMessage: 'čo je sp4?',
        responseText: 'Ticho. Skús znova.',
        expectedReason: 'stub_like_output',
        expectedAction: 'GENERAL_QUALITY_STUB',
    },
    {
        name: 'encoding artifacts',
        queryType: 'technical_simple',
        userMessage: 'čo je cache?',
        responseText: 'Cache sa rozpadla � ÔÇ pri kódovaní odpovede.',
        expectedReason: 'encoding_artifacts',
        expectedAction: 'GENERAL_QUALITY_ENCODING',
    },
    {
        name: 'wrong canonical fallback',
        queryType: 'conversational',
        userMessage: 'ako sa máš?',
        responseText: 'SP4 je offline-first AI partner a osobný digitálny partner pre ľudí, ktorí chcú žiť slobodne a lokálne.',
        expectedReason: 'canonical_sp4_fallback',
        expectedAction: 'GENERAL_QUALITY_CANONICAL_FALLBACK',
    }
];

for (const fixture of corruptionFixtures) {
    const result = detectGeneralQualitySanityIssue({
        userMessage: fixture.userMessage,
        responseText: fixture.responseText,
        queryType: fixture.queryType,
        responseControlApplied: false,
    });

    assert.equal(result.applied, true, `${fixture.name}: hard-corruption fixture must be blocked`);
    assert.equal(result.reason, fixture.expectedReason, `${fixture.name}: wrong reason ${result.reason}`);
    assert.equal(result.action, fixture.expectedAction, `${fixture.name}: wrong action`);
    assert.match(result.replacementText, /nepúšťam ďalej|polož otázku ešte raz|poloz otazku este raz/i, `${fixture.name}: replacement text should explain block`);
}

const controlFixture = {
    queryType: 'technical_deep',
    userMessage: 'function sum(a,b){ return a-b; } prečo zlé výsledky?',
    responseText: 'Funkcia sum má chybu, pretože vracia odčítanie namiesto súčtu. Oprav to na return a + b.',
};

const controlResult = detectGeneralQualitySanityIssue({
    userMessage: controlFixture.userMessage,
    responseText: controlFixture.responseText,
    queryType: controlFixture.queryType,
    responseControlApplied: false,
});

assert.equal(controlResult.applied, false, 'good control case must not be blocked by short-tech quality gate');

console.log('✅ PASS: quality sanity hard-corruption contract');
