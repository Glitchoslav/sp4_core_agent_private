export const DECISION_HEDGE_PHRASES = [
    'záleží',
    'závisí',
    'možno',
    'mohlo by',
    'môžeš skúsiť',
    'treba zvážiť',
    'odporúčam ti skúsiť',
    'na jednej strane',
    'na druhej strane',
    'v zásade',
    'v konečnom dôsledku',
    'v istom zmysle',
    'je to komplexné',
    'nie je na to jednoduchá odpoveď',
    'bolo by vhodné',
    'stojí za zváženie',
    'je dobré sa zamyslieť',
    'možné je aj to, že'
];

export const DECISION_SOFTNESS_PHRASES = [
    'rozumiem',
    'je to pochopiteľné',
    'je to pochopitelne',
    'môže to byť náročné',
    'moze to byt narocne',
    'držím palce',
    'verím, že to zvládneš',
    'nevzdávaj sa',
    'buď na seba láskavý',
    'je to prirodzené',
    'je v poriadku'
];

const ENERGY_VERBS = ['oddýchni', 'pokračuj', 'zastav', 'dokonči', 'odlož'];

function normalizeText(text = '') {
    return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function countPhraseMatches(text = '', phrases = []) {
    const normalized = normalizeText(text);
    return phrases.reduce((count, phrase) => {
        const normalizedPhrase = normalizeText(phrase);
        return count + (normalized.includes(normalizedPhrase) ? 1 : 0);
    }, 0);
}

function countWords(text = '') {
    return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function capWords(text = '', maxWords = 120) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) {
        return String(text || '').trim();
    }
    return words.slice(0, maxWords).join(' ').replace(/[,:;]$/, '.').trim();
}

function hasRequiredShape(text = '') {
    return /^\s*VERDIKT:/i.test(text)
        && /\bPREČO:/i.test(text)
        && /\bKROK:/i.test(text);
}

function countQuestions(text = '') {
    return (String(text || '').match(/\?/g) || []).length;
}

function hasLongList(text = '') {
    const listMarkers = String(text || '').match(/^\s*(?:[-*+]|\d+\.)\s+/gm) || [];
    return listMarkers.length >= 4;
}

function removeSoftLead(text = '') {
    let out = String(text || '').trim();
    const leadPatterns = [
        /^\s*(rozumiem|chápem|chapem)[^.!?]*[.!?]\s*/i,
        /^\s*(je v poriadku|je prirodzené|je prirodzene)[^.!?]*[.!?]\s*/i,
        /^\s*(záleží|zavisi|závisí|možno)[^.!?]*[.!?]\s*/i,
        /^\s*(na jednej strane)[^.!?]*[.!?]\s*/i
    ];
    for (const pattern of leadPatterns) {
        out = out.replace(pattern, '').trim();
    }
    return out;
}

function splitSentences(text = '') {
    return String(text || '')
        .replace(/\n+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function fallbackForDecision({ intent = '', userMessage = '' } = {}) {
    const input = normalizeText(userMessage);

    if (intent === 'self_deception_check') {
        return 'VERDIKT: Áno, pravdepodobne si niečo prikrášľuješ.\nPREČO: Pýtaš sa na sebaklam, takže problém už cítiš, len ho ešte nechceš pomenovať natvrdo.\nKROK: Napíš jednou vetou, čo presne odkladáš.';
    }

    if (intent === 'energy_decision') {
        if (/\b(deadline|dnes musim|do zajtra|urgent|hor[ií])\b/.test(input)) {
            return 'VERDIKT: Dokonči len minimum a potom zastav.\nPREČO: Urgentnosť je reálna, ale nízka energia už ničí kvalitu rozhodnutí.\nKROK: Daj si 25 minút na najnutnejší výstup a potom odlož zvyšok.';
        }
        return 'VERDIKT: Oddýchni.\nPREČO: Únava teraz vyzerá ako limit, nie ako výhovorka.\nKROK: Na 20 minút vypni obrazovku, napi sa a až potom sa vráť k jednej veci.';
    }

    if (intent === 'error_reflection') {
        return 'VERDIKT: Chyba je pravdepodobne v rozptýlení, nie v schopnosti.\nPREČO: Pýtaš sa na chybu, ale zatiaľ nemáš pomenovaný jeden konkrétny bod zlyhania.\nKROK: Vyber jednu vec, ktorá sa opakuje, a napíš ju bez vysvetľovania.';
    }

    if (intent === 'decision_binary') {
        return 'VERDIKT: Vyber jednoduchšiu a menej drahú možnosť.\nPREČO: Bez ďalšieho kontextu je bezpečnejšie minimalizovať škodu než hľadať dokonalé riešenie.\nKROK: Sprav 10-minútový test tejto možnosti a potom ju potvrď alebo zahoď.';
    }

    return 'VERDIKT: Zúž to na jednu prioritu.\nPREČO: Teraz nepotrebuješ viac možností, ale smer, ktorý zníži chaos.\nKROK: Napíš jednu vec, ktorá keď sa pohne dnes, zlepší všetko ostatné.';
}

function cleanupToDecisionShape(text = '', context = {}) {
    const maxWords = Number(context?.maxWords || context?.decisionContract?.maxWords || 120);
    const intent = context?.intent || context?.decisionType || context?.decisionContract?.type || '';
    const stripped = removeSoftLead(text);
    const sentences = splitSentences(stripped);

    if (hasRequiredShape(stripped)) {
        return capWords(stripped, maxWords);
    }

    if (!sentences.length) {
        return capWords(fallbackForDecision({ intent, userMessage: context?.userMessage }), maxWords);
    }

    const verdict = sentences[0].replace(/^VERDIKT:\s*/i, '').trim();
    const why = (sentences[1] || 'Toto je najčistejší pracovný rez z dostupných signálov.').replace(/^PREČO:\s*/i, '').trim();
    const step = (sentences[2] || fallbackForDecision({ intent, userMessage: context?.userMessage }).split('KROK:')[1] || 'Sprav jednu najmenšiu konkrétnu akciu do 20 minút.').replace(/^KROK:\s*/i, '').trim();

    return capWords(`VERDIKT: ${verdict}\nPREČO: ${why}\nKROK: ${step}`, maxWords);
}

export function isAlreadySharpSelfDeceptionResponse(text = '') {
    const normalized = normalizeText(text);
    return /\brobis\s+(blbost|picovinu|chybu)\b/.test(normalized)
        || /\bklames\s+si\b/.test(normalized)
        || /\bprestan\s+si\s+klamat\b/.test(normalized)
        || /\btoto\s+je\s+sebaklam\b/.test(normalized);
}

export function hardenSelfDeceptionDecisionText(text = '') {
    const value = String(text || '').trim();
    if (/^\s*VERDIKT:\s*po[cč]úvaj,?\s+prest[aá]vam\s+ti\s+klama[tť]\s+do\s+o[cč][ií]/i.test(value)) {
        return value;
    }
    if (/^\s*VERDIKT:/i.test(value)) {
        return value.replace(/^\s*VERDIKT:\s*/i, 'VERDIKT: Počúvaj, prestávam ti klamať do očí: ');
    }
    return 'VERDIKT: Počúvaj, prestávam ti klamať do očí: toto vyzerá ako sebaklam.\nPREČO: Pýtaš sa na blbosť, takže ten rozpor už cítiš.\nKROK: Napíš jednou vetou, čo presne odkladáš.';
}

export function validateDecisionResponse(text = '', context = {}) {
    const intent = context?.intent || context?.decisionType || context?.decisionContract?.type || '';
    const maxWords = Number(context?.maxWords || context?.decisionContract?.maxWords || 120);
    const hedgeCount = countPhraseMatches(text, DECISION_HEDGE_PHRASES);
    const softnessCount = countPhraseMatches(text, DECISION_SOFTNESS_PHRASES);
    const questionCount = countQuestions(text);
    const wordCount = countWords(text);
    const requiredShape = hasRequiredShape(text);
    const longList = hasLongList(text);
    const energyVerbMissing =
        intent === 'energy_decision'
        && !ENERGY_VERBS.some((verb) => normalizeText(text).includes(normalizeText(verb)));

    const issues = [];
    if (!requiredShape) issues.push('missing_decision_shape');
    if (wordCount > maxWords) issues.push('word_cap_exceeded');
    if (hedgeCount >= 2) issues.push('too_many_hedges');
    if (softnessCount > 0) issues.push('softness_phrase');
    if (questionCount > 1) issues.push('too_many_questions');
    if (longList) issues.push('long_list_detected');
    if (energyVerbMissing) issues.push('energy_verb_missing');

    return {
        valid: issues.length === 0,
        issues,
        hedgeCount,
        softnessCount,
        questionCount,
        wordCount,
        maxWords,
        requiredShape,
        longList,
        energyVerbMissing
    };
}

export function applyDecisionContract(text = '', context = {}) {
    const firstPass = validateDecisionResponse(text, context);
    let output = String(text || '').trim();
    let cleanupApplied = false;

    if (firstPass.hedgeCount >= 2 || firstPass.softnessCount > 0) {
        output = capWords(fallbackForDecision({
            intent: context?.intent || context?.decisionType || context?.decisionContract?.type,
            userMessage: context?.userMessage
        }), firstPass.maxWords);
        cleanupApplied = true;
    } else if (!firstPass.valid) {
        output = cleanupToDecisionShape(output, context);
        cleanupApplied = true;
    } else if (firstPass.wordCount > firstPass.maxWords) {
        output = capWords(output, firstPass.maxWords);
        cleanupApplied = true;
    }

    const finalValidation = validateDecisionResponse(output, context);
    if (!finalValidation.requiredShape || finalValidation.energyVerbMissing) {
        output = capWords(fallbackForDecision({
            intent: context?.intent || context?.decisionType || context?.decisionContract?.type,
            userMessage: context?.userMessage
        }), firstPass.maxWords);
        cleanupApplied = true;
    }

    const metadata = {
        decisionContractApplied: true,
        decisionCleanupApplied: cleanupApplied,
        hedgeCount: firstPass.hedgeCount,
        softnessCount: firstPass.softnessCount,
        decisionQuestionCount: firstPass.questionCount,
        decisionWordCount: countWords(output),
        decisionValidationIssues: firstPass.issues
    };

    return {
        text: output,
        metadata,
        validation: validateDecisionResponse(output, context)
    };
}
