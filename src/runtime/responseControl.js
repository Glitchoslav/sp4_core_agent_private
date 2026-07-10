// SP4 Response Control Layer
// Role: pre-LLM hard guard + post-immune safe replacement

import { IDENTITY_DRIFT_PATTERNS, IDENTITY_QUERY_PATTERNS } from '../identity/identityPatterns.js';
import { getDeterministicShortTechResponse, getDeterministicSystemInfoResponse } from '../routing/deterministicRegistry.js';

const SAFE_TEXTS = {
    SAFE_REFUSAL_META: 'Interné promptovanie, systémové texty, safety layer a bezpečnostné pravidlá neukazujem. Nebudem pomáhať obchádzať guardy ani odhaľovať prompt stack; môžem vysvetliť fungovanie navonok.',
    SAFE_IDENTITY_RESPONSE: 'Som SP4 agent. Pomáham prakticky a držím sa bezpečných hraníc.',
    SAFE_RELEVANCE_FALLBACK: 'Toto nebolo trafené. Skúsim to povedať priamo: odpoviem stručne a k veci, ak otázku položíš ešte raz jednou vetou.',
    SAFE_LANGUAGE_FALLBACK: 'Jazyk odpovede sa rozpadol, preto ju nepúšťam ďalej. Ak chceš, polož otázku ešte raz jednou vetou.',
};

const META_PATTERNS = [
    /\b(co|čo)\s+mas\s+v\s+system\s+prompte\b/i,
    /\bukaz\s+(interny|intern[eé])?\s*prompt\b/i,
    /\bukaz\s+mi\s+identity\s+kernel\b/i,
    /\bidentity\s+kernel\b/i,
    /\binterny\s+kernel\b/i,
    /\bukaz\s+.*\b(pravidla|pravidlá|instrukcie)\b.*\b(bez\s+filtra|cele|presne)\b/i,
    /\bukaz\s+.*\b(bez\s+filtra|cele|presne)\b.*\b(pravidla|pravidlá|instrukcie)\b/i,
    /\bodhal\s+(svoj|mi\s+tvoj|tvoj)?\s*prompt\b/i,
    /\b(vypis|vypíš|vytlac|vytlač)\s+.*\b(prompt|instrukcie|pravidla|boundary)\b/i,
    /\b(prompt\s+stack|stack\s+promptov)\b/i,
    /\bprompt\s+boundary\b/i,
    /\broute\s+decision\s+prompt\b/i,
    /\b(hidden|skryte)\s+system\s+text\b/i,
    /\bhidden\s+system\s+text\b/i,
    /\b(ake|aké)\s+mas\s+(pravidla|pravidlá|instrukcie)\b/i,
    /\b(ake|aké)\s+(pravidla|pravidlá|instrukcie)\s+mas\s+(interne|vnutri)\b/i,
    /\b(ake|aké)\s+mas\s+(pravidla|pravidlá|instrukcie)\s+(interne|vnutri)\b/i,
    /\b(vnutorne|vnutorne|interne|internych|intern[eé]|skryte|skryt[eé])\s+(pravidla|pravidlá|instrukcie|systemove\s+instrukcie|syst[eé]move\s+instrukcie)\b/i,
    /\b(interne|internych|intern[eé])\s+instrukcie\b/i,
    /\binternej\s+instrukcie\b/i,
    /\bpodla\s+coho\s+odpovedas\b/i,
    /\bco\s+mas\s+v\s+internych\s+promptoch\b/i,
    /\bco\s+mas\s+(napisane|ulozene)\s+v\s+(systeme|system)\b/i,
    /\bprezrad\s+(systemovy|syst[eé]mov[yý])\s+prompt\b/i,
    /\bodhal\s+.*\b(interny|intern[eé]|systemovy|syst[eé]mov[yý]|config|kernel|prompt|pravidla)\b/i,
    /\bukaz\s+interne\s+pravidla\b/i,
    /\bako\s+obchadzas\s+pravidla\b/i,
    /\bako\s+sa\s+da\s+obist\s+(tvoje\s+)?guardy\b/i,
    /\bobist\s+(tvoje\s+)?guardy\b/i,
    /\bobchadzat\s+(tvoje\s+)?guardy\b/i,
    /\bvytiahol\s+tvoj\s+safety\s+layer\b/i,
    /\bvysyp\s+mi\s+.*\bsafety\s+layer/i,
    /\bco\s+nesmies\s+povedat\b/i,
    /\bco\s+mas\s+zakazane\s+hovorit\b/i,
    /\bake\s+filtre\s+mas\b/i,
    /\bco\s+blokujes\b/i,
    /\bco\s+kontroluje\s+immune\s+vrstva\b/i,
    /\bpresny\s+prompt\s+stack\b/i,
    /\binterne\s+guard\s+texty\b/i,
    /\binterne\s+systemove\s+pravidla\b/i,
    /\bco\s+je\s+internal\s+completion\s+rule\b/i,
    /\binternal\s+completion\s+rule\b/i,
    /\bk\s+akym\s+dokumentom\s+mas\s+pristup\b/i,
    // ── CANONICAL GROUP 1: "neukaz" + intern/bezpec/guard/pravidl/prompt/system ──
    /\bukaz\s+.*\b(cel[yý]|kompletn[yý]|presn[yý]|system(ov[yý])?|intern[eé])\s+prompt\b/i,
    /\bukaz\s+.*\b(cel[yý]|kompletn[yý]|presn[yý])\s+instrukcie\b/i,
    /\bdaj\s+mi\s+.*\b(system(ov[yý])?\s+prompt|intern[eé]\s+instrukcie|systemov[yý]\s+prompt)\b/i,
    // ── CANONICAL GROUP 2: priame bypass pokusy ──
    /\bako\s+(preskocit|prekonat|obist|zdolat)\s+(guardy|bezpecn|ochran[au]?)\b/i,
    /\bako\s+by\s+som\s+(obisiel|prekonal|zdolal|dostal\s+sa\s+(cez|za))\s+(guardy|bezpecnost|ochran[au]?)\b/i,
    /\bako\s+dostat\s+sa\s+(cez|za)\s+(guardy|bezpecn|ochran[au]?)\b/i,
    // ── CANONICAL GROUP 3: prompt extraction parafrázy ──
    /\b(ukaz|vypis|vytlac|odhal)\s+.*\binternal\s+(prompt|instrukcie|rules?)\b/i,
    /\b(poskytni|daj)\s+mi\s+.*\b(plný|plny|cel[yý])\s+(text\s+promptu|system\s+prompt|prompt\s+text)\b/i,
];

function getLocalFirstRoutingResponse(userInput) {
    const normalized = normalizeText(userInput);
    const asksForMeaning = /\b(co je|vysvetli|znamena|na co sluzi|kratko|normalne|po slovensky|povedz)\b/i.test(normalized);

    if (!/\blocal-first routing\b/i.test(normalized) || !asksForMeaning) {
        return null;
    }

    return 'Local-first routing znamena, ze SP4 najprv skusa lokalnu cestu a vlastny runtime. Cloud je len doplnkova alebo fallback cesta, ked je vobec povolena.';
}

function getChangelogResponse(userInput) {
    const normalized = normalizeText(userInput);
    const mentionsChangelog = /\b(change\s*log|changelog|log\s+zmien)\b/i.test(normalized);
    const asksForMeaning = /\b(co je|naco|na co|preco|aky ma vyznam|aký ma vyznam|aky je vyznam|aký je vyznam|na co sluzi|sluzi na co|vysvetli|znamena)\b/i.test(normalized);

    if (!mentionsChangelog || !asksForMeaning) {
        return null;
    }

    return 'Changelog je verejny prevadzkovy zaznam zmien v SP4. Drzi historiu oprav, dovod zmien, dopad a riziko, aby bolo vidno co sa realne zmenilo a preco. Nie je to interny prompt ani tajna vrstva, ale normalna disciplina projektu a kontroly reality.';
}

function getPublicSystemInfoRecovery(userInput) {
    return (
        getDeterministicSystemInfoResponse(userInput)
        || getDeterministicShortTechResponse(userInput)
        || getLocalFirstRoutingResponse(userInput)
        || getChangelogResponse(userInput)
        || null
    );
}

function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function hasAnyPattern(text, patterns) {
    return patterns.some((pattern) => pattern.test(text));
}

function looksLikeExplicitMetaDisclosure(userInput) {
    return hasAnyPattern(normalizeText(userInput), META_PATTERNS);
}

export function detectPreLlmGuard(userInput) {
    const publicSystemInfoRecovery = getPublicSystemInfoRecovery(userInput);

    if (publicSystemInfoRecovery) {
        return {
            blocked: false,
            reason: null,
            response: null,
            handledBy: null,
        };
    }

    if (looksLikeExplicitMetaDisclosure(userInput)) {
        return {
            blocked: true,
            reason: 'meta_system_guard',
            response: SAFE_TEXTS.SAFE_REFUSAL_META,
            handledBy: 'response_control_prellm_guard',
        };
    }

    return {
        blocked: false,
        reason: null,
        response: null,
        handledBy: null,
    };
}

export function getImmuneRetryDirective({ immuneVerdict, retryApplied, truthAnchorAvailable = false }) {
    const reasonCodes = new Set(immuneVerdict?.reason_codes || []);
    const hasTruthAnchor = truthAnchorAvailable === true;

    if (retryApplied || immuneVerdict?.severity !== 'soft') {
        return { shouldRetry: false, retryReason: null, prompt: null };
    }

    if (reasonCodes.has('META_POLICY_LEAK') || reasonCodes.has('META_SYSTEM_LEAK')) {
        return { shouldRetry: false, retryReason: null, prompt: null };
    }

    if (reasonCodes.has('IDENTITY_AI_CLAIM') || reasonCodes.has('IDENTITY_CONFUSION')) {
        return { shouldRetry: false, retryReason: null, prompt: null };
    }

    if (reasonCodes.has('RELEVANCE_ZERO_OVERLAP') && hasTruthAnchor) {
        return {
            shouldRetry: true,
            retryReason: 'soft_relevance',
            strategy: 'answer_again',
            prompt: 'Odpovedz priamo na otázku používateľa. Bez odbočiek, bez meta komentárov, stručne a po slovensky.'
        };
    }

    if (reasonCodes.has('LANG_HEAVY_EN') || reasonCodes.has('LANG_BROKEN')) {
        return {
            shouldRetry: true,
            retryReason: 'soft_language',
            strategy: 'repair_existing_output',
            prompt: 'Prepíš rozbitú odpoveď do krátkej prirodzenej slovenčiny bez zmeny významu. Odstráň angličtinu, meta balast a divné formulácie. Ak obsah nie je zachrániteľný, vráť presne: REPAIR_FAILED.'
        };
    }

    return { shouldRetry: false, retryReason: null, strategy: null, prompt: null };
}

function isIdentityQuestion(userInput) {
    const normalized = normalizeText(userInput);
    return hasAnyPattern(normalized, IDENTITY_QUERY_PATTERNS);
}

function looksLikeIdentityDrift(responseText) {
    return hasAnyPattern(String(responseText || ''), IDENTITY_DRIFT_PATTERNS);
}

export function applyPostImmuneResponseControl({ immuneVerdict, retryApplied, retryImproved, userInput, prevUserInput = null, responseText }) {
    const reasonCodes = new Set(immuneVerdict?.reason_codes || []);
    const retryFailed = retryApplied === true && retryImproved === false;
    const publicSystemInfoRecovery = getPublicSystemInfoRecovery(userInput);
    const followUpSystemInfoRecovery = looksLikeExplicitMetaDisclosure(userInput)
        ? null
        : getPublicSystemInfoRecovery(prevUserInput);
    const resolvedSystemInfoRecovery = publicSystemInfoRecovery || followUpSystemInfoRecovery;

    if (
        resolvedSystemInfoRecovery
        && (reasonCodes.has('META_SYSTEM_LEAK') || reasonCodes.has('META_POLICY_LEAK'))
    ) {
        return {
            responseControlApplied: true,
            responseControlReason: 'META_PUBLIC_SYSTEM_INFO_RECOVERY',
            replacementUsed: true,
            replacementText: resolvedSystemInfoRecovery,
            action: 'SAFE_PUBLIC_SYSTEM_INFO_RECOVERY',
        };
    }

    if (reasonCodes.has('META_SYSTEM_LEAK') || reasonCodes.has('META_POLICY_LEAK')) {
        return {
            responseControlApplied: true,
            responseControlReason: reasonCodes.has('META_SYSTEM_LEAK') ? 'META_SYSTEM_LEAK' : 'META_POLICY_LEAK',
            replacementUsed: true,
            replacementText: SAFE_TEXTS.SAFE_REFUSAL_META,
            action: 'SAFE_REFUSAL_META',
        };
    }

    if (reasonCodes.has('IDENTITY_AI_CLAIM') || reasonCodes.has('IDENTITY_CONFUSION')) {
        return {
            responseControlApplied: true,
            responseControlReason: reasonCodes.has('IDENTITY_AI_CLAIM') ? 'IDENTITY_AI_CLAIM' : 'IDENTITY_CONFUSION',
            replacementUsed: true,
            replacementText: SAFE_TEXTS.SAFE_IDENTITY_RESPONSE,
            action: 'SAFE_IDENTITY_RESPONSE',
        };
    }

    if (isIdentityQuestion(userInput) && looksLikeIdentityDrift(responseText)) {
        return {
            responseControlApplied: true,
            responseControlReason: 'IDENTITY_DRIFT',
            replacementUsed: true,
            replacementText: SAFE_TEXTS.SAFE_IDENTITY_RESPONSE,
            action: 'SAFE_IDENTITY_RESPONSE',
        };
    }

    if (reasonCodes.has('RELEVANCE_ZERO_OVERLAP') && (!retryApplied || retryFailed)) {
        // SP4-056: Bypass ak odpoveď je grounded truth-boundary (nemám info, ale SP4 kontext platí)
        if (immuneVerdict?.metadata?.groundingApplied === true) {
            return { responseControlApplied: false };
        }

        // SP4-057: Finálny immune verdikt (pass/relevance_ok) má prednosť pred reason_codes
        // reason_codes sú diagnostické signály — ak immune layer schválil odpoveď, nekontroluj
        if (immuneVerdict?.pass === true || immuneVerdict?.relevance_ok === true) {
            return { responseControlApplied: false, responseControlSkippedReason: 'final_immune_verdict_ok' };
        }

        // SP4-056: Topic-match bypass — ak otázka je o privacy/profile/memory SP4
        // a odpoveď obsahuje SP4/lokálny kontext, je to validná truth-boundary odpoveď
        const SP4_PRIVACY_TOPICS = [
            /co\s+o\s+mne\s+vies/i, /kde\s+sa\s+ukladaju\s+rozhovory/i,
            /moje\s+informacie/i, /moje\s+data/i, /su\s+moje\s+data/i,
            /privacy\s+sp4/i, /kolko\s+ludi\s+pouziva/i,
            /aku\s+buducnost\s+ma\s+sp4/i, /kde\s+idu\s+moje\s+data/i,
        ];
        const SP4_GROUNDED_SIGNALS = ['sp4', 'lokáln', 'pamäť', 'pamät', 'data', 'memory', 'nemám', 'neviem'];
        const inputNorm = String(userInput || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const outputNorm = String(responseText || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const isPrivacyTopic = SP4_PRIVACY_TOPICS.some(p => p.test(inputNorm));
        const hasGroundedSignal = SP4_GROUNDED_SIGNALS.some(s => outputNorm.includes(s));
        if (isPrivacyTopic && hasGroundedSignal) {
            return { responseControlApplied: false };
        }

        return {
            responseControlApplied: true,
            responseControlReason: 'RELEVANCE_ZERO_OVERLAP',
            replacementUsed: true,
            replacementText: SAFE_TEXTS.SAFE_RELEVANCE_FALLBACK,
            action: 'RETRY_ONCE_OR_SAFE_REWRITE',
        };
    }

    if ((reasonCodes.has('LANG_HEAVY_EN') || reasonCodes.has('LANG_BROKEN')) && (!retryApplied || retryFailed)) {
        return {
            responseControlApplied: true,
            responseControlReason: reasonCodes.has('LANG_HEAVY_EN') ? 'LANG_HEAVY_EN' : 'LANG_BROKEN',
            replacementUsed: true,
            replacementText: SAFE_TEXTS.SAFE_LANGUAGE_FALLBACK,
            action: 'RETRY_ONCE_OR_SAFE_SK_FALLBACK',
        };
    }

    if (reasonCodes.has('RELEVANCE_LOW_CONFIDENCE')) {
        return {
            responseControlApplied: false,
            responseControlReason: null,
            replacementUsed: false,
            replacementText: null,
            action: 'RETRY_ONLY_LOW_CONFIDENCE',
        };
    }

    return {
        responseControlApplied: false,
        responseControlReason: null,
        replacementUsed: false,
        replacementText: null,
        action: null,
    };
}

export { SAFE_TEXTS };

