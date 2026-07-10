// ┌─────────────────────────────────────────────────────────────────┐
// │  SP4 OS MODULE: outputImmuneCheck                              │
// │  Phase: 2 (evaluate-only, no rewrite, no retry)               │
// │  Layer: Protection                                             │
// │  Role: Post-response diagnostic immunology layer               │
// │  API: runImmuneCheck({ userInput, responseText, persona })     │
// │  Model: gemma3:1b (fastest, minimal RAM)                      │
// │  Output: verdict JSON – stored in metadata, never mutates      │
// │  v2: severity, reason_codes, immune_confidence, smart bypass   │
// │  Do NOT modify: orchestrator, routing, personas, identity      │
// └─────────────────────────────────────────────────────────────────┘

import { IDENTITY_AI_CLAIM_PATTERNS, IDENTITY_CONFUSION_PATTERNS } from '../identity/identityPatterns.js';

const IMMUNE_MODEL = 'gemma3:1b';
const IMMUNE_TIMEOUT_MS = 12000;
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const SHORT_TECH_HINTS_RE = /\b(api|json|http|https|curl|localhost|url|rest|sdk|tcp|udp|ip|dns|ssl|tls|jwt|oauth|npm|git|bash|ssh|docker|kubectl|helm|terraform|bicep|python|javascript|typescript|node|express|react|vue|angular|sp4|ollama|cache|port|router|server|client|bug|debug|prompt|model|llm|token|wifi)\b/i;

// ── TECH WHITELIST (Task G) ─────────────────────────────────────────────────
// Technické termíny sa NEpočítajú ako jazykový problém (EN baseline).
const TECH_WHITELIST_RE = /\b(API|JSON|HTTP(?:S)?|curl|localhost|URL|REST|SDK|TCP|UDP|IP|DNS|SSL|TLS|JWT|OAuth|npm|git|bash|SSH|docker|kubectl|helm|terraform|bicep|python|javascript|typescript|node(?:\.js)?|express|react|vue|angular|SP4|Ollama|ollama)\b/gi;

// ── REASON CODES (Task B) ───────────────────────────────────────────────────
export const REASON_CODES = {
    IDENTITY_AI_CLAIM: 'IDENTITY_AI_CLAIM',
    IDENTITY_CONFUSION: 'IDENTITY_CONFUSION',
    META_POLICY_LEAK: 'META_POLICY_LEAK',
    META_SYSTEM_LEAK: 'META_SYSTEM_LEAK',
    RELEVANCE_ZERO_OVERLAP: 'RELEVANCE_ZERO_OVERLAP',
    RELEVANCE_LOW_CONFIDENCE: 'RELEVANCE_LOW_CONFIDENCE',
    LANG_HEAVY_EN: 'LANG_HEAVY_EN',
    LANG_BROKEN: 'LANG_BROKEN',
    IMMUNE_TIMEOUT: 'IMMUNE_TIMEOUT',
    IMMUNE_PARSE_ERROR: 'IMMUNE_PARSE_ERROR',
};

const REASON_DESCRIPTIONS = {
    IDENTITY_AI_CLAIM: 'identity: explicit AI/model claim',
    IDENTITY_CONFUSION: 'identity: agent/persona confusion',
    META_POLICY_LEAK: 'meta: policy or directive leaked',
    META_SYSTEM_LEAK: 'meta: system prompt or internal marker leaked',
    RELEVANCE_ZERO_OVERLAP: 'relevance: zero keyword overlap with input',
    RELEVANCE_LOW_CONFIDENCE: 'relevance: LLM flagged low relevance',
    LANG_HEAVY_EN: 'language: heavy English in Slovak context',
    LANG_BROKEN: 'language: LLM detected language issue',
    IMMUNE_TIMEOUT: 'immune: LLM evaluator timed out',
    IMMUNE_PARSE_ERROR: 'immune: could not parse LLM evaluator output',
};

// ── META LEAK PATTERNS ──────────────────────────────────────────────────────
// META_POLICY_LEAK: presakovanie politiky alebo direktív
// AUDIT (2026-04-11): preverené false positive frázy:
//   REMOVED: /\bmôj cieľ je\b/i — príliš široké, trigrovalo prirodzenú SK odpoveď (napr. "Môj cieľ je pomôcť...")
//   RISK (neopravené, sledovať): /\bmy goal is\b/i — OK pre EN kontext, nízke riziko v SK relácii
//   AUDIT OK: /\bjazyk...\b/i, /\bsupport\s+directive\b/i, /\bi follow.*directives?\b/i, /\bfollow.*language policy\b/i
//   Potenciálne false positives (neodstránené, TREBA SLEDOVAŤ pri regresii):
//     "môžem vysvetliť", "snažím sa", "mojou úlohou je", "cieľom je" — zatiaľ NIE sú v zozname; ak ich pridáš, pridaj aj test
const META_POLICY_LEAK_PATTERNS = [
    /\bjazyk(?:ová|ova)\s+politika\b/i,
    /\blanguage policy\b/i,
    // REMOVED: /\bmôj cieľ je\b/i — false positive na prirodzenú SK formuláciu v behavioral/operational odpovediach
    /\bmy goal is\b/i,
    /\bsupport\s+directive\w*\b/i,
    /\bi follow.*directives?\b/i,
    /\bfollow.*language policy\b/i,
];

// META_SYSTEM_LEAK: presakovanie interných technických markerov
const META_SYSTEM_LEAK_PATTERNS = [
    /\bsystem prompt\b/i,
    /\bFIRE MODE\b/,
    /\bLANGUAGE ENFORCER\b/,
    /\bSP4_(?:CORE|DEBUG|IDENTITY)\b/,
];

// ── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Rýchly djb2-like hash (bez závislostí).
 * Použité pre prompt_hash / response_hash pri FAIL (Task J).
 */
function simpleHash(str) {
    let h = 5381;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(16).padStart(8, '0');
}

/**
 * Spočíta anglický ratio textu (0–1).
 * Tech whitelist termíny sú vopred odstránené (Task G).
 */
function roughEnglishRatio(text) {
    const stripped = String(text || '').replace(TECH_WHITELIST_RE, '');
    const words = stripped.split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return 0;
    const skWords = words.filter(w => /[áäčďéíĺľňóôŕšťúýž]/i.test(w)).length;
    const enWords = words.filter(w =>
        /^(the|is|are|was|were|has|have|had|will|would|can|could|should|that|this|with|from|they|their|been|being|about|into|through|during|before|after|above|below|between|each|both|few|more|most|other|some|such|only|same|than|then|there|when|where|which|while|who|whom|whose|what|how|all|also|just|said|like|well|may|new|its|his|her|you|your|our|we|he|she|it|an|and|or|not|but|for|in|on|at|to|of|by|as|if|so|do|did|does|my|me|him|us|them|any|no|up|out|get|go|use|make|take|come|made|good|great|help|here|time|way|see|now|know|people|think|actually)$/i
            .test(w)
    ).length;
    if (skWords / words.length > 0.25) return 0;
    return Math.min(enWords / words.length, 1);
}

/**
 * Normalizuje text (lowercase, bez diakritiky, bez interpunkcie).
 */
function normalizeSk(text) {
    const DIA = 'áäčďéíĺľňóôŕšťúýž';
    const BASE = 'aacdeillnoorstuyz';
    return String(text || '')
        .toLowerCase()
        .replace(/[áäčďéíĺľňóôŕšťúýž]/g, c => BASE[DIA.indexOf(c)] ?? c)
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const SK_STOPWORDS = new Set([
    'ako', 'ake', 'aka', 'co', 'kto', 'kde', 'kedy', 'preco', 'proc',
    'je', 'sa', 'to', 'a', 'na', 'v', 'za', 'do', 'zo', 'pri', 'pre',
    'nie', 'si', 'som', 'su', 'ho', 'mu', 'ich', 'ti', 'mi', 'ta', 'tie',
    'tym', 'temu', 'tej', 'tom', 'tato', 'tuto', 'vy', 'my', 'oni', 'ona',
    'ten', 'or', 'and', 'the', 'is', 'of', 'in', 'to', 'ma', 'mas'
]);

/**
 * Zistí, či majú input a output keyword overlap.
 * Vracia { overlaps: boolean, inputKeywordCount: number }
 */
function hasKeywordOverlap(userInput, responseText) {
    const inputNorm = normalizeSk(userInput);
    const responseNorm = normalizeSk(responseText);
    const inputKeywords = inputNorm
        .split(' ')
        .filter(w => w.length >= 4 && !SK_STOPWORDS.has(w));

    if (inputKeywords.length === 0) return { overlaps: true, inputKeywordCount: 0 };
    // Token-set match (nie substring) – "ping" nesmie matchnuť "pinging" ani "uloženie".
    const responseTokenSet = new Set(responseNorm.split(' ').filter(w => w.length >= 4));
    const overlaps = inputKeywords.some(kw => responseTokenSet.has(kw));
    return { overlaps, inputKeywordCount: inputKeywords.length };
}

/**
 * Detekuje typ vstupu podľa obsahu (Task F).
 * @returns {"smalltalk"|"technical"|"identity"}
 */
function detectInputType(userInput) {
    const text = String(userInput || '');
    const norm = normalizeSk(text);
    if (/kto\s+si|who\s+are\s+you|tvoja\s+identita/i.test(text)) return 'identity';
    if (SHORT_TECH_HINTS_RE.test(norm)) return 'technical';
    if (text.length < 30) return 'smalltalk';
    const contentWords = norm.split(' ').filter(w => w.length >= 4 && !SK_STOPWORDS.has(w));
    if (contentWords.length <= 1) return 'smalltalk';
    return 'technical';
}

/**
 * Adaptívne limity truncation podľa inputType (Task F).
 */
function getSmartTruncation(inputType) {
    switch (inputType) {
        case 'smalltalk': return { inputMax: 120, outputMax: 220 };
        case 'identity': return { inputMax: 300, outputMax: 700 };
        default: return { inputMax: 250, outputMax: 500 };
    }
}

/**
 * Deterministická kontrola – rýchla, bez LLM.
 * Vracia identity_ok, meta_leak, a príslušné reason_codes.
 */
function deterministicPreScreen(responseText) {
    const text = String(responseText || '');
    const reason_codes = [];

    let identity_ok = true;
    if (IDENTITY_AI_CLAIM_PATTERNS.some(p => p.test(text))) {
        identity_ok = false;
        reason_codes.push(REASON_CODES.IDENTITY_AI_CLAIM);
    }
    if (IDENTITY_CONFUSION_PATTERNS.some(p => p.test(text))) {
        identity_ok = false;
        if (!reason_codes.includes(REASON_CODES.IDENTITY_AI_CLAIM)) {
            reason_codes.push(REASON_CODES.IDENTITY_CONFUSION);
        }
    }

    let meta_leak = false;
    if (META_POLICY_LEAK_PATTERNS.some(p => p.test(text))) {
        meta_leak = true;
        reason_codes.push(REASON_CODES.META_POLICY_LEAK);
    }
    if (META_SYSTEM_LEAK_PATTERNS.some(p => p.test(text))) {
        meta_leak = true;
        if (!reason_codes.includes(REASON_CODES.META_SYSTEM_LEAK)) {
            reason_codes.push(REASON_CODES.META_SYSTEM_LEAK);
        }
    }

    return { identity_ok, meta_leak, reason_codes };
}

/**
 * Vypočíta severity (Task A).
 * hard   = identity/meta fail alebo prázdny výstup
 * soft   = language alebo relevance fail
 * none   = všetko OK
 * unknown = immune error
 */
function computeSeverity({ identity_ok, meta_leak, language_ok, relevance_ok, isEmpty }) {
    if (isEmpty) return 'hard';
    if (!identity_ok || meta_leak) return 'hard';
    if (!language_ok || !relevance_ok) return 'soft';
    return 'none';
}

/**
 * Vypočíta immune_confidence (Task C).
 * high   = čisté pravidlá, bez LLM
 * medium = LLM použitý, žiadny konflikt s pravidlami
 * low    = LLM errored alebo konflikt medzi pravidlami a LLM
 */
function computeConfidence({ usedLLM, llmConflictsWithRules, llmErrored }) {
    if (!usedLLM) return 'high';
    if (llmErrored || llmConflictsWithRules) return 'low';
    return 'medium';
}

/**
 * Zostaví ľudsky čitateľný reason text z reason_codes + LLM reason.
 */
function buildReasonText(reason_codes, llmReason) {
    if (reason_codes.length === 0 && (!llmReason || llmReason === 'ok')) return 'ok';
    const texts = reason_codes.map(c => REASON_DESCRIPTIONS[c] || c);
    if (llmReason && llmReason !== 'ok') texts.push(llmReason);
    return texts.join('; ') || 'ok';
}

// ── UPGRADED LLM SYSTEM PROMPT (Task H) ─────────────────────────────────────
const IMMUNE_SYSTEM_PROMPT = `Si imunitný evaluátor. Odpovedaj IBA JSON. Žiadny iný text.

HODNOŤ:
1. language_ok: false ak odpoveď je z väčšej časti po anglicky A otázka bola po slovensky.
   IGNORUJ technické termíny: API, JSON, HTTP, curl, localhost, URL.

2. relevance_ok: Odpovedá text PRIAMO na otázku? Nie len o súvisiacej téme – priamo.
   Pýtaj sa: "Odpovedá text priamo na otázku, alebo len hovorí o súvisiacej téme?"
   false ak odpoveď hovorí o inej oblasti ako je otázka.

PRÍKLADY relevance_ok=false:
- Otázka: "čo robí wifi router" → Odpoveď o neurónových sieťach → false
- Otázka: "ako sa máš" → Odpoveď o AI politike → false
- Predchádzajúca otázka: "čo je OSPF", Aktuálna otázka: "a prečo to vzniklo?" → Odpoveď o SP4 agentovi alebo persone → false
- Predchádzajúca otázka: "čo je ping", Aktuálna otázka: "načo to je?" → Odpoveď o AI systéme → false
   Ak je k dispozícii PREDCHÁDZAJÚCA OTÁZKA, "to/toto/prečo to" odkazuje na tú predchádzajúcu tému.

Formát (LEN TOTO):
{"language_ok":true,"relevance_ok":true,"reason":"ok"}`;

/**
 * Zostaví evaluačný prompt pre LLM vrstvu s adaptívnou truncation (Task F).
 * @param {string|null} prevUserInput  - Voliteľný predchádzajúci user turn (follow-up kontext)
 */
function buildImmunePrompt(userInput, responseText, inputType, prevUserInput) {
    const { inputMax, outputMax } = getSmartTruncation(inputType);
    const inputSnippet = String(userInput || '').slice(0, inputMax);
    const responseSnippet = String(responseText || '').slice(0, outputMax);
    const prevLine = prevUserInput
        ? `PREDCHÁDZAJÚCA OTÁZKA: ${String(prevUserInput).slice(0, 200)}\n`
        : '';
    return `${prevLine}OTÁZKA: ${inputSnippet}
ODPOVEĎ: ${responseSnippet}

Odpovedá text priamo? Hodnoť language_ok a relevance_ok. Vráť LEN JSON.`;
}

/**
 * Normalizuje raw Ollama output na parseable JSON.
 */
function parseImmuneResponse(raw) {
    if (!raw || typeof raw !== 'string') {
        return { verdict: null, parseError: 'empty_response' };
    }
    let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
        return { verdict: null, parseError: 'no_json_block_found' };
    }
    try {
        const parsed = JSON.parse(jsonMatch[0]);
        const required = ['language_ok', 'relevance_ok'];
        for (const field of required) {
            if (!(field in parsed)) {
                return { verdict: null, parseError: `missing_field:${field}` };
            }
        }
        for (const field of ['language_ok', 'relevance_ok']) {
            if (typeof parsed[field] === 'string') {
                parsed[field] = parsed[field].toLowerCase() === 'true';
            }
        }
        if (!parsed.reason || typeof parsed.reason !== 'string') parsed.reason = 'ok';
        return { verdict: parsed, parseError: null };
    } catch (e) {
        return { verdict: null, parseError: `json_parse_error: ${e.message}` };
    }
}

/**
 * Fallback verdict – immune layer padol alebo neparseovateľný výstup.
 * NIKDY neklasifikujeme ako FAIL keď nevieme.
 */
function unknownVerdict(reason, extra_codes = []) {
    return {
        pass: null,
        severity: 'unknown',
        identity_ok: null,
        language_ok: null,
        relevance_ok: null,
        meta_leak: null,
        reason_codes: [...extra_codes],
        reason: `unknown: ${reason}`,
        immune_confidence: 'low',
        immune_error: true,
        immune_model: IMMUNE_MODEL,
        immune_profile: null
    };
}

export function buildSkippedImmuneVerdict(reason = 'integration_guard') {
    return {
        pass: null,
        severity: 'none',
        identity_ok: null,
        language_ok: null,
        relevance_ok: null,
        meta_leak: null,
        reason_codes: [],
        reason: `skipped: ${reason}`,
        immune_confidence: 'high',
        immune_error: false,
        immune_model: null,
        latency_ms: 0,
        immune_profile: 'skipped',
        immune_skipped: true,
        _detection: {
            input_type: 'skipped',
            bypass_llm: true,
            bypass_reason: reason,
            rulebased_lang_ok: null,
            keyword_overlap: null,
            keyword_count: 0,
            llm_used: false,
            llm_language_ok: null,
            llm_relevance_ok: null,
            llm_parse_error: null,
            llm_conflicts: false,
            llm_risk_path: 'integration_skip'
        }
    };
}

function shouldForceImmuneLlm(persona) {
    return process.env.SP4_DEBUG === 'true' || persona === 'validator';
}

function shouldRunImmuneLlm({ forceImmuneLlm, bypassLLM, hasPrevContext, rulebasedLanguageOk, keywordOverlap, inputKeywordCount, semanticRelevanceReview }) {
    if (bypassLLM) return false;
    if (forceImmuneLlm) return true;

    const singleKeywordRisk = inputKeywordCount === 1 && keywordOverlap;
    const needsLanguageReview = !rulebasedLanguageOk;
    const needsFollowUpDisambiguation = hasPrevContext;
    const needsSemanticRelevanceReview = semanticRelevanceReview === true;

    return singleKeywordRisk || needsLanguageReview || needsFollowUpDisambiguation || needsSemanticRelevanceReview;
}

// ── IMMUNE PROFILE CLASSIFIER (Task C – Phase 3) ─────────────────────────────

/**
 * Klasifikuje profil immune eventu podľa vstupu, výstupu a preScreen výsledku.
 * Heuristická klasifikácia – nie deterministická, ale dostatočná pre log analýzu.
 *
 * Kategórie:
 *   identity      – deterministická identity chyba (AI claim / confusion)
 *   code_heavy    – odpoveď obsahuje kódové bloky alebo hlboko odsadené riadky
 *   fallback      – meta_leak (presakovanie systémového promptu)
 *   technical     – technický vstup (API, kód, infraštruktúra)
 *   conversational – default (krátky/bežný vstup)
 *
 * @param {string} userInput
 * @param {string} responseText
 * @param {Object} preScreen  - výstup deterministicPreScreen()
 * @returns {'conversational'|'technical'|'identity'|'fallback'|'code_heavy'}
 */
function classifyImmuneProfile(userInput, responseText, preScreen) {
    const input = String(userInput || '');
    const response = String(responseText || '');

    // identity: deterministická chyba identity (najprísnejší filter)
    if (!preScreen.identity_ok) return 'identity';

    // code_heavy: backtick bloky alebo hlboko odsadené riadky (kód pattern)
    if (/```/.test(response) || /(\n[ \t]{4,}\S)/.test(response)) return 'code_heavy';

    // fallback: meta_leak = systémový dump
    if (preScreen.meta_leak) return 'fallback';

    // technical: vstup klasifikovaný ako technical
    if (detectInputType(input) === 'technical') return 'technical';

    return 'conversational';
}

// ── MAIN EXPORT ──────────────────────────────────────────────────────────────

/**
 * HLAVNÁ FUNKCIA – spusti immune check na finálnom výstupe.
 *
 * v2 HYBRID DECISION LAYER (Task D):
 *   1. hard rules (regex) majú PRIORITU
 *   2. keyword relevance rozhoduje pred LLM
 *   3. LLM len dopĺňa – len keď rules nestačia
 *
 * BYPASS LLM (Task E) keď:
 *   - hard rule FAIL (identity/meta detected)
 *   - response < 120 znakov
 *   - zero keyword overlap + language passes by rule (verdict je kompletný)
 *
 * SHADOW MODE (Task I):
 *   - output SA NEMENÍ
 *   - FAIL → len ulož do metadata
 *   - ERROR → unknown verdict, runtime nekrachuje
 *
 * @param {Object} params
 * @param {string} params.userInput     - Originálna správa od používateľa
 * @param {string} params.responseText  - Finálny output po všetkom post-processingu
 * @param {string} [params.persona]     - Aktívna persona
 * @returns {Promise<Object>} Immune verdict
 */
export async function runImmuneCheck({ userInput, responseText, persona = 'core', prevUserInput = null }) {
    const startMs = Date.now();

    if (!responseText || responseText.trim().length === 0) {
        return unknownVerdict('empty_response_text');
    }

    const isEmpty = responseText.trim().length < 10;

    // ── KROK 0: Persona prefix sanitize ──────────────────────────────────────
    // SP4_CORE: / SP4_GLITCH: / SP4_POPICI: na začiatku je output formatting leak,
    // NIE system prompt leak. Sanitizujeme pred preScreen, nie po ňom.
    const sanitizedResponseText = responseText.replace(
        /^SP4_(?:CORE|GLITCH(?:OSLAV)?|POPICI|VALIDATOR)\s*[:：]\s*/i, ''
    ).trim();

    // ── KROK 1: Deterministická vrstva (identity + meta_leak) ─────────────────
    const preScreen = deterministicPreScreen(sanitizedResponseText);
    const reason_codes = [...preScreen.reason_codes];
    const hasPrevContext = prevUserInput != null && String(prevUserInput).trim().length > 0;
    const inputType = detectInputType(String(userInput || ''));
    const isGlitchPersona = persona === 'glitchoslav';

    // ── KROK 2: Keyword overlap ───────────────────────────────────────────────
    const { overlaps: keywordOverlap, inputKeywordCount } = hasKeywordOverlap(
        String(userInput || ''), String(sanitizedResponseText || '')
    );

    // ── KROK 3: Rule-based language check ─────────────────────────────────────
    const inputEnRatio = roughEnglishRatio(String(userInput || ''));
    const outputEnRatio = roughEnglishRatio(String(sanitizedResponseText || ''));
    const isInputSlovak = inputEnRatio < 0.15;
    const isOutputHeavilyEn = outputEnRatio > 0.40;
    const rulebased_language_ok = !(isInputSlovak && isOutputHeavilyEn);
    const semanticRelevanceReview = inputType === 'smalltalk' && inputKeywordCount > 0 && !keywordOverlap && !hasPrevContext;

    if (!rulebased_language_ok) reason_codes.push(REASON_CODES.LANG_HEAVY_EN);
    if (!keywordOverlap && inputKeywordCount > 0 && !semanticRelevanceReview && !isGlitchPersona) {
        reason_codes.push(REASON_CODES.RELEVANCE_ZERO_OVERLAP);
    }

    // ── KROK 4: Bypass decision (Task E – hybrid decision) ───────────────────
    const hardFail = !preScreen.identity_ok || preScreen.meta_leak;
    const isShortResponse = sanitizedResponseText.trim().length < 120;
    const zeroInputKeywords = inputKeywordCount === 0;
    const isShortResponseSafe = isShortResponse && ((zeroInputKeywords && !hasPrevContext) || (keywordOverlap && inputKeywordCount >= 2));
    const zeroOverlapLangOk = zeroInputKeywords && rulebased_language_ok && !hasPrevContext;
    const bypassLLM = hardFail || isShortResponseSafe || zeroOverlapLangOk || (!keywordOverlap && inputKeywordCount > 0 && !hasPrevContext && !semanticRelevanceReview);
    const forceImmuneLlm = shouldForceImmuneLlm(persona);
    const shouldRunLlm = shouldRunImmuneLlm({
        forceImmuneLlm,
        bypassLLM,
        hasPrevContext,
        rulebasedLanguageOk: rulebased_language_ok,
        keywordOverlap,
        inputKeywordCount,
        semanticRelevanceReview
    });

    // ── KROK 5: LLM vrstva (iba keď bypass = false) ───────────────────────────
    let llmLanguageOk = null;
    let llmRelevanceOk = null;
    let llmReason = 'ok';
    let llmParseError = null;
    let usedLLM = false;

    if (shouldRunLlm) {
        usedLLM = true;
        const immunePrompt = buildImmunePrompt(userInput, responseText, inputType, prevUserInput);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), IMMUNE_TIMEOUT_MS);

            const res = await fetch(OLLAMA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    model: IMMUNE_MODEL,
                    system: IMMUNE_SYSTEM_PROMPT,
                    prompt: immunePrompt,
                    stream: false,
                    options: { temperature: 0.0, num_predict: 80, top_p: 1.0, top_k: 1 }
                })
            });

            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                const rawOutput = data?.response || '';
                const { verdict: llmVerdict, parseError } = parseImmuneResponse(rawOutput);
                if (llmVerdict) {
                    llmLanguageOk = llmVerdict.language_ok;
                    llmRelevanceOk = llmVerdict.relevance_ok;
                    llmReason = llmVerdict.reason || 'ok';
                } else {
                    llmParseError = parseError;
                    reason_codes.push(REASON_CODES.IMMUNE_PARSE_ERROR);
                }
            }
        } catch (err) {
            if (err?.name === 'AbortError') {
                llmParseError = 'timeout';
                reason_codes.push(REASON_CODES.IMMUNE_TIMEOUT);
            } else {
                llmParseError = `fetch_error: ${err?.message || 'unknown'}`;
                reason_codes.push(REASON_CODES.IMMUNE_PARSE_ERROR);
            }
        }
    }

    const latencyMs = Date.now() - startMs;

    // ── KROK 6: Kombinácia výsledkov (Task D – hybrid priority) ──────────────
    // JAZYK: rule-based je autoritatívny.
    //   rule OK  → vždy true (SK diacritika je spoľahlivý signál)
    //   rule FAIL → potvrdíme LLM, alebo false ak LLM tiež nejde
    const finalLanguageOk = rulebased_language_ok
        ? true
        : (llmLanguageOk !== null ? llmLanguageOk : false);

    if (!finalLanguageOk && llmLanguageOk === false
        && !reason_codes.includes(REASON_CODES.LANG_HEAVY_EN)) {
        reason_codes.push(REASON_CODES.LANG_BROKEN);
    }

    // RELEVANCE: zero overlap = defínítivne false bez ohľadu na LLM
    //   overlap exists → dôverujeme LLM alebo default true
    // Výnimka A: jeden overlap token nie je dostatočný dôkaz tematickej zhody.
    //   Ak LLM sa nevyjadril (null) a overlap bol z jediného tokenu, nedefaultujeme na true.
    // Výnimka B (prevContextOverride): keď hasPrevContext=true a LLM potvrdil relevance (llmRelevanceOk=true),
    //   zero-overlap NIE JE autoritatívny fail — follow-up zámeno ("a prečo to vzniklo?") nemá
    //   lexikálny overlap s aktuálnym vstupom, ale LLM videl predošlý kontext a relevance potvrdil.
    // Výnimka C (semanticShortUncertain): smalltalk otázka bez overlapa, LLM zlyhalo/offline →
    //   benefit of doubt = pass. Synonymá ("nápady" → "myšlienky") nesmú defaultovať na fail.
    //   Diagnostický kód RELEVANCE_LOW_CONFIDENCE sa naďalej loguje (line ~591).
    const singleKeywordUncertain = (inputKeywordCount === 1 && keywordOverlap && llmRelevanceOk === null);
    const semanticShortUncertain = semanticRelevanceReview && llmRelevanceOk === null;
    const prevContextOverride = hasPrevContext && llmRelevanceOk === true;
    const finalRelevanceOk = (!keywordOverlap && inputKeywordCount > 0 && !prevContextOverride && !semanticRelevanceReview && !isGlitchPersona)
        ? false
        : (llmRelevanceOk !== null ? llmRelevanceOk : (singleKeywordUncertain ? false : true));

    if (semanticRelevanceReview && llmRelevanceOk === false
        && !reason_codes.includes(REASON_CODES.RELEVANCE_ZERO_OVERLAP)) {
        reason_codes.push(REASON_CODES.RELEVANCE_ZERO_OVERLAP);
    }

    // Propagovať singleKeywordUncertain do reason_codes ako low-confidence relevance,
    // nie ako definitívny zero-overlap fail.
    if ((singleKeywordUncertain || semanticShortUncertain)
        && !reason_codes.includes(REASON_CODES.RELEVANCE_LOW_CONFIDENCE)) {
        reason_codes.push(REASON_CODES.RELEVANCE_LOW_CONFIDENCE);
    }

    if (llmRelevanceOk === false && keywordOverlap
        && !reason_codes.includes(REASON_CODES.RELEVANCE_LOW_CONFIDENCE)) {
        reason_codes.push(REASON_CODES.RELEVANCE_LOW_CONFIDENCE);
    }

    // ── KROK 7: Pass ─────────────────────────────────────────────────────────
    const pass = preScreen.identity_ok
        && finalLanguageOk
        && finalRelevanceOk
        && !preScreen.meta_leak;

    // ── KROK 8: Severity (Task A) ─────────────────────────────────────────────
    const severity = computeSeverity({
        identity_ok: preScreen.identity_ok,
        meta_leak: preScreen.meta_leak,
        language_ok: finalLanguageOk,
        relevance_ok: finalRelevanceOk,
        isEmpty
    });

    // ── KROK 9: Confidence (Task C) ───────────────────────────────────────────
    const langConflict = usedLLM && llmLanguageOk !== null && (rulebased_language_ok !== llmLanguageOk);
    const relConflict = usedLLM && keywordOverlap && llmRelevanceOk === false;
    const llmConflictsWithRules = langConflict || relConflict;
    const llmErrored = llmParseError !== null;
    const immune_confidence = computeConfidence({ usedLLM, llmConflictsWithRules, llmErrored });

    // ── KROK 10: Reason text ──────────────────────────────────────────────────
    const reason = buildReasonText(reason_codes, llmReason);

    // ── KROK 11: Hash tracking pre FAILy (Task J) ─────────────────────────────
    const hashes = pass ? {} : {
        prompt_hash: simpleHash(String(userInput || '')),
        response_hash: simpleHash(String(responseText || ''))
    };

    return {
        pass,
        severity,
        identity_ok: preScreen.identity_ok,
        language_ok: finalLanguageOk,
        relevance_ok: finalRelevanceOk,
        meta_leak: preScreen.meta_leak,
        reason_codes,
        reason,
        immune_confidence,
        immune_model: IMMUNE_MODEL,
        latency_ms: latencyMs,
        immune_profile: classifyImmuneProfile(userInput, responseText, preScreen),
        ...hashes,
        // ── Debug ─────────────────────────────────────────────────────────────
        _detection: {
            input_type: inputType,
            bypass_llm: !shouldRunLlm,
            bypass_reason: !shouldRunLlm
                ? (bypassLLM
                    ? (hardFail ? 'hard_fail'
                        : isShortResponse ? 'short_response'
                            : !keywordOverlap && inputKeywordCount > 0 && !hasPrevContext
                                ? 'zero_overlap_deterministic'
                                : 'zero_overlap+lang_ok')
                    : 'low_risk_safe')
                : 'none',
            rulebased_lang_ok: rulebased_language_ok,
            keyword_overlap: keywordOverlap,
            keyword_count: inputKeywordCount,
            llm_used: usedLLM,
            llm_language_ok: llmLanguageOk,
            llm_relevance_ok: llmRelevanceOk,
            llm_parse_error: llmParseError || null,
            llm_conflicts: llmConflictsWithRules,
            llm_risk_path: usedLLM
                ? (forceImmuneLlm
                    ? 'forced_debug_or_validator'
                    : hasPrevContext
                        ? 'follow_up_context'
                        : !rulebased_language_ok
                            ? 'language_risk'
                            : semanticRelevanceReview
                                ? 'smalltalk_semantic_review'
                                : 'single_keyword_overlap')
                : 'none'
        }
    };
}
