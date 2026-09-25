// Regresný test: cielená oprava falošného RELEVANCE_ZERO_OVERLAP pre krátke
// alfanumerické entity (SP4, AI, GPT, 3B, CO2).
//
// Bug: keyword extrakcia (w.length >= 4) vyhadzovala entity ako "sp4" (3 znaky),
// takže správna odpoveď "SP4 je lokálny systém..." dostala RELEVANCE_ZERO_OVERLAP
// a orchestrátor ju prepísal na hlúpy fallback ("Toto nebolo trafené...").
//
// Fix (outputImmuneCheck.js):
//   1) isEntityToken() rozpoznáva entity (alfanumerické + známe akronymy) — bez
//      plošného zníženia limitu na 2 znaky.
//   2) Entita-samotná overlap (entityOnlyOverlap) NEauto-bypassuje LLM — LLM
//      overí, či odpoveď je NAOZAJ o entite (nie len spomenutie). (SP4-058)

import assert from 'node:assert/strict';
import { runImmuneCheck } from '../src/immune/outputImmuneCheck.js';
import { getImmuneRetryDirective } from '../src/runtime/responseControl.js';

// ── Pozitívne prípady: entity otázky nesmú dostať RELEVANCE_ZERO_OVERLAP ────
const POSITIVE_CASES = [
    { q: 'Čo je SP4?', a: 'SP4 je lokálny AI operačný systém, ktorý beží offline a patrí komunite.' },
    { q: 'Vysvetli mi podrobne SP4.', a: 'SP4 je local-first ekosystém, ktorý spája ľudí, pamäť, nástroje a AI pod kontrolou komunity.' },
    { q: 'Čo je AI?', a: 'AI je umelá inteligencia, teda systémy, ktoré sa učia z dát a vzorov.' },
    { q: 'Čo znamená GPT?', a: 'GPT je generatívny model, ktorý predpovedá ďalšie slovo v texte.' },
    { q: 'Čo je model 3B?', a: 'Model 3B má približne tri miliardy parametrov a je vhodný na lokálne použitie.' },
    { q: 'Čo je CO2?', a: 'CO2 je oxid uhličitý, plyn, ktorý vzniká pri spaľovaní a dýchaní.' },
];

let unnecessaryRetries = 0;
let positivePassCount = 0;

for (const { q, a } of POSITIVE_CASES) {
    const verdict = await runImmuneCheck({ userInput: q, responseText: a, persona: 'core' });

    // Hlavná oprava: entita overlap → žiadny RELEVANCE_ZERO_OVERLAP (deterministické)
    assert.ok(
        !verdict.reason_codes.includes('RELEVANCE_ZERO_OVERLAP'),
        `"${q}" + relevantná odpoveď nesmie dostať RELEVANCE_ZERO_OVERLAP, got [${verdict.reason_codes.join(',')}]`
    );

    // Meranie zbytočných retry: pred fixom každý RELEVANCE_ZERO_OVERLAP → retry
    const retry = getImmuneRetryDirective({
        immuneVerdict: verdict,
        retryApplied: false,
        truthAnchorAvailable: true,
    });
    if (retry.shouldRetry) unnecessaryRetries++;

    if (verdict.pass === true) positivePassCount++;

    console.log(`  PASS [positive] "${q}" → codes=[${verdict.reason_codes.join(',')}] pass=${verdict.pass} llm_used=${verdict._detection?.llm_used} retry=${retry.shouldRetry}`);
}

// ── Negatívny prípad 1: nesúvisiaca odpoveď BEZ entity → musí byť odmietnutá ─
{
    const verdict = await runImmuneCheck({
        userInput: 'Čo je SP4?',
        responseText: 'Dnes je krásne počasie a vonku svieti slnko na modrej oblohe.',
        persona: 'core',
    });
    assert.ok(
        verdict.reason_codes.includes('RELEVANCE_ZERO_OVERLAP'),
        `nesúvisiaca odpoveď bez SP4 musí dostať RELEVANCE_ZERO_OVERLAP, got [${verdict.reason_codes.join(',')}]`
    );
    assert.equal(verdict.pass, false, 'nesúvisiaca odpoveď bez SP4 musí byť odmietnutá (pass=false)');
    console.log(`  PASS [neg-no-entity] codes=[${verdict.reason_codes.join(',')}] pass=${verdict.pass}`);
}

// ── Negatívny prípad 2: odpoveď, čo IBA spomína SP4 → LLM overí, nie auto-pass ─
{
    const verdict = await runImmuneCheck({
        userInput: 'Čo je SP4?',
        responseText: 'SP4 je moje obľúbené slovo, rád ho hovorím každý deň pri rannej káve.',
        persona: 'core',
    });
    // Entita-samotná prítomnosť NESMIE auto-bypassnúť LLM (SP4-058)
    assert.equal(
        verdict._detection?.llm_used, true,
        `odpoveď, čo iba spomína SP4, nesmie byť auto-bypassnutá — LLM musí byť volaný (got llm_used=${verdict._detection?.llm_used})`
    );
    // Nie je to zero-overlap (entita sa prekrýva), je to low-confidence ak LLM odmietne
    assert.ok(
        !verdict.reason_codes.includes('RELEVANCE_ZERO_OVERLAP'),
        `entita-samotná overlap nemá byť klasifikovaná ako zero-overlap, got [${verdict.reason_codes.join(',')}]`
    );
    console.log(`  PASS [neg-entity-only] llm_used=${verdict._detection?.llm_used} pass=${verdict.pass} codes=[${verdict.reason_codes.join(',')}]`);
}

// ── Multi-keyword + entita-samotná overlap → LLM overí (nie auto-bypass) ─────
{
    const verdict = await runImmuneCheck({
        userInput: 'Vysvetli mi podrobne SP4.',
        responseText: 'SP4 je moje obľúbené slovo, rád ho hovorím každý deň.',
        persona: 'core',
    });
    assert.equal(
        verdict._detection?.llm_used, true,
        `multi-keyword + entita-samotná overlap nesmie byť auto-bypassnutá (got llm_used=${verdict._detection?.llm_used})`
    );
    console.log(`  PASS [multi-keyword-entity] llm_used=${verdict._detection?.llm_used} pass=${verdict.pass} codes=[${verdict.reason_codes.join(',')}]`);
}

console.log('\n===== SUMMARY =====');
console.log(`Positive cases: ${POSITIVE_CASES.length}, pass=true: ${positivePassCount}`);
console.log(`Unnecessary retries (positive entity cases): ${unnecessaryRetries}`);
console.log('\nPASS: všetky entity relevance testy prešli');
