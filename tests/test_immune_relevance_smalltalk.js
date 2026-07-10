// Reprodukčný test: RELEVANCE_ZERO_OVERLAP false-positive na krátke ľudské otázky
//
// Bug: "aké máš nápady?" + odpoveď so synonymami ("myšlienky" namiesto "nápady")
// padala na immune fail, pretože semanticShortUncertain defaultoval na false
// keď LLM bol offline / vrátil null.
//
// Fix (outputImmuneCheck.js:582): semanticShortUncertain odstránený z `? false` vetvičky →
// smalltalk + LLM-null = benefit of doubt (pass), nie fail.

import assert from 'node:assert/strict';
import { runImmuneCheck } from '../src/immune/outputImmuneCheck.js';

// ── Scenario 1a: smalltalk otázka, odpoveď používa synonymá (live evaluator) ─
// "nápady" → odpoveď má "myšlienky / tipy" — žiadny token overlap,
// ale odpoveď je tematicky relevantná. Ak LLM beží, nesmie byť RELEVANCE_ZERO_OVERLAP.
// Ak LLM nebeží alebo zlyhá, nesmie byť fail (testuje sa deterministicky v 1b).
{
    const verdict = await runImmuneCheck({
        userInput: 'aké máš nápady?',
        responseText: 'Mám niekoľko myšlienok a tipov, ktoré by ti mohli pomôcť. Môžeš vyskúšať nové prístupy alebo sa inšpirovať zo zahraničia. Je tu tiež možnosť spolupráce s komunitou.',
        persona: 'core',
    });

    assert.ok(
        !verdict.reason_codes.includes('RELEVANCE_ZERO_OVERLAP'),
        `RELEVANCE_ZERO_OVERLAP nesmie byť v reason_codes pre smalltalk synonym-case, got: ${verdict.reason_codes.join(',')}`
    );
    assert.equal(
        verdict._detection?.input_type, 'smalltalk',
        `input_type musí byť 'smalltalk', got: ${verdict._detection?.input_type}`
    );

    const llmUsed = verdict._detection?.llm_used === true;
    const llmFailed = llmUsed && verdict._detection?.llm_parse_error != null;
    if (!llmUsed || llmFailed) {
        // Ak LLM nebol volaný alebo zlyhal, benefit of doubt = pass (falzifikovateľné v 1b)
        assert.equal(verdict.pass, true,
            `smalltalk + LLM nepoužitý/zlyhaný → pass musí byť true, got: pass=${verdict.pass}, codes=[${verdict.reason_codes.join(',')}]`
        );
    }

    console.log(`  PASS [1a live] pass=${verdict.pass}, llm_used=${llmUsed}, llm_risk_path=${verdict._detection?.llm_risk_path}, codes=[${verdict.reason_codes.join(',')}]`);
}

// ── Scenario 1b: deterministický offline mock ─────────────────────────────────
// Zamock fetch pred volaním — globalThis.fetch sa číta pri každom volaní, nie pri importe.
// Toto priamo testuje semanticShortUncertain branch bez závislosti na Ollame.
{
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error('simulated_offline'); };
    let verdict;
    try {
        verdict = await runImmuneCheck({
            userInput: 'aké máš nápady?',
            responseText: 'Mám niekoľko myšlienok a tipov, ktoré by ti mohli pomôcť. Môžeš vyskúšať nové prístupy alebo sa inšpirovať zo zahraničia.',
            persona: 'core',
        });
    } finally {
        globalThis.fetch = realFetch;
    }

    // LLM bol volaný (semanticRelevanceReview=true), ale offline → llm_parse_error nastavený
    assert.equal(verdict._detection?.llm_used, true,
        `LLM musí byť volaný pre smalltalk bez overlapa (semanticRelevanceReview=true)`
    );
    assert.ok(verdict._detection?.llm_parse_error != null,
        `llm_parse_error musí byť nastavený keď fetch hodí error`
    );
    // Benefit of doubt: pass=true aj keď LLM zlyhalo
    assert.equal(verdict.pass, true,
        `smalltalk + LLM offline (null) → pass musí byť true (benefit of doubt), got: pass=${verdict.pass}, codes=[${verdict.reason_codes.join(',')}]`
    );
    assert.ok(!verdict.reason_codes.includes('RELEVANCE_ZERO_OVERLAP'),
        `RELEVANCE_ZERO_OVERLAP nesmie byť v reason_codes pri offline LLM pre smalltalk`
    );
    // Diagnostický kód musí byť prítomný (logovateľnosť zachovaná)
    assert.ok(
        verdict.reason_codes.includes('RELEVANCE_LOW_CONFIDENCE') || verdict.reason_codes.includes('IMMUNE_PARSE_ERROR'),
        `aspoň jeden diagnostický kód musí byť prítomný, got: [${verdict.reason_codes.join(',')}]`
    );
    // llm_risk_path musí byť 'smalltalk_semantic_review', nie 'single_keyword_overlap'
    assert.equal(verdict._detection?.llm_risk_path, 'smalltalk_semantic_review',
        `llm_risk_path musí byť 'smalltalk_semantic_review' pre smalltalk bez overlapa`
    );

    console.log(`  PASS [1b offline mock] pass=${verdict.pass}, llm_risk_path=${verdict._detection?.llm_risk_path}, codes=[${verdict.reason_codes.join(',')}]`);
}

// ── Scenario 2: technická otázka — zero overlap MUSÍ ostať prísny ────────────
// "čo robí wifi router" → odpoveď o neurónových sieťach = fail (technical input)
{
    const verdict = await runImmuneCheck({
        userInput: 'čo robí wifi router?',
        responseText: 'Neurónové siete sú inšpirované biologickým mozgom. Skladajú sa z vrstiev neurónov, ktoré spracúvajú vstupné dáta a generujú výstupy. Backpropagation je algoritmus učenia.',
        persona: 'core',
    });

    assert.equal(verdict._detection?.input_type, 'technical',
        `"wifi router" musí byť detekovaný ako 'technical' (SHORT_TECH_HINTS_RE zachytí "wifi"), got: ${verdict._detection?.input_type}`
    );
    assert.equal(verdict.pass, false,
        `technický off-topic response musí failnúť immune check`
    );
    assert.ok(
        verdict.reason_codes.includes('RELEVANCE_ZERO_OVERLAP'),
        `RELEVANCE_ZERO_OVERLAP musí byť v reason_codes pre technický zero-overlap, got: [${verdict.reason_codes.join(',')}]`
    );

    console.log(`  PASS [2 technical guard] pass=${verdict.pass}, input_type=${verdict._detection?.input_type}, codes=[${verdict.reason_codes.join(',')}]`);
}

// ── Scenario 3: identity claim — guard musí ostať prísny ─────────────────────
{
    const verdict = await runImmuneCheck({
        userInput: 'aké máš nápady?',
        responseText: 'Som AI asistent od OpenAI. Mám veľa myšlienok a nápadov, ktoré ti rád ponúknem.',
        persona: 'core',
    });

    assert.equal(verdict.pass, false, 'IDENTITY_AI_CLAIM musí ostať hard fail aj pri smalltalk otázke');
    assert.equal(verdict.severity, 'hard', 'severity musí byť hard');
    assert.ok(verdict.reason_codes.includes('IDENTITY_AI_CLAIM'), 'IDENTITY_AI_CLAIM musí byť v reason_codes');

    console.log(`  PASS [3 identity guard] pass=${verdict.pass}, severity=${verdict.severity}`);
}

console.log('\nPASS: všetky smalltalk relevance testy prešli');
