import { IDENTITY_DRIFT_PATTERNS, IDENTITY_QUERY_PATTERNS } from '../identity/identityPatterns.js';

const IDENTITY_RESPONSES = [
    {
        key: 'who_are_you',
        path: 'deterministic_identity:who_are_you',
        patterns: [
            /^(a\s+)?kto\s+si\??$/i,
            /^(a\s+)?kto\s+ste\??$/i,
            /^(a\s+)?kto\s+(vlastne|teda)\s+si\??$/i,
            /^(a\s+)?tak\s+kto\s+si\??$/i,
            /^(a\s+)?tak\s+mi\s+uz\s+povedz\s+kto\s+si\??$/i,
            /^(a\s+)?no\s+dobre\s+a\s+kto\s+teda\s+si\??$/i,
            /^zabudni\s+na\s+to\s+a\s+povedz\s+kto\s+si\??$/i,
        ],
        response: 'Som SP4 agent. Pomáham ti prakticky, držím sa slovenčiny a nehrám sa na cudziu identitu.'
    },
    {
        key: 'who_is_there',
        path: 'deterministic_identity:who_is_there',
        patterns: [
            /^(a\s+)?kto\s+je\s+tam\??$/i,
            /^(a\s+)?kto\s+tam\s+odpoveda\??$/i,
            /^(a\s+)?kto\s+mi\s+odpoveda\??$/i,
            /^(a\s+)?s\s+kym\s+sa\s+bavim\??$/i,
            /^(a\s+)?kto\s+je\s+na\s+druhej\s+strane\??$/i
        ],
        response: 'Tu odpovedá SP4 agent. Držím sa praktickej pomoci a nehrám sa na cudziu identitu.'
    },
    {
        key: 'what_are_you',
        path: 'deterministic_identity:what_are_you',
        patterns: [
            /^(a\s+)?(co|čo)\s+si\s+za[cč]\??$/i,
            /^(a\s+)?(co|čo)\s+si\s+vlastne\s+za[cč]\??$/i,
            /^(a\s+)?(co|čo)\s+si\??$/i
        ],
        response: 'Som SP4 agent. Nie som cudzia persona ani halucinovaný titul.'
    },
    {
        key: 'bot_or_human',
        path: 'deterministic_identity:bot_or_human',
        patterns: [
            /^(a\s+)?si\s+(bot|stroj)\s+(alebo|ci|či)\s+(clovek|človek)\??$/i
        ],
        response: 'Nie som človek. Som SP4 agent v systéme SP4 a nehrám sa na cudziu identitu.'
    },
    {
        key: 'are_you_sp4',
        path: 'deterministic_identity:are_you_sp4',
        patterns: [/^(a\s+)?si\s+ty\s+sp4\??$/i, /^(a\s+)?si\s+sp4\??$/i],
        response: 'Nie. Som agent systému SP4, nie celý SP4.'
    },
    {
        key: 'are_you_ai',
        path: 'deterministic_identity:are_you_ai',
        patterns: [/^(a\s+)?si\s+ai\??$/i, /^(a\s+)?si\s+ty\s+ai\??$/i],
        response: 'Som SP4 agent postavený na AI, ale odpovedám ako súčasť SP4 systému, nie ako generická appka.'
    },
    {
        key: 'are_you_chatgpt',
        path: 'deterministic_identity:are_you_chatgpt',
        patterns: [
            /^(a\s+)?si\s+chatgpt\??$/i,
            /^(a\s+)?si\s+ty\s+chatgpt\??$/i,
            // combo: "si chatgpt alebo Glitchoslav?", "si chatgpt alebo nieco ine?"
            /^(a\s+)?si\s+(ty\s+)?chatgpt\s+alebo\b/i,
        ],
        response: 'Nie. Som SP4 agent, nie ChatGPT ani cudzia persona.'
    },
    {
        key: 'are_you_language_model',
        path: 'deterministic_identity:are_you_language_model',
        patterns: [/^(a\s+)?si\s+jazykov[yý]\s+model\??$/i, /^(a\s+)?si\s+ty\s+jazykov[yý]\s+model\??$/i],
        response: 'Som SP4 agent systému. Nepredstavujem sa ako generický jazykový model.'
    },
    {
        key: 'role',
        path: 'deterministic_identity:role',
        patterns: [
            /^(a\s+)?(co|čo)\s+je\s+tvoja\s+rola\??$/i,
            /^(a\s+)?(co|čo)\s+robi[sš]\??$/i,
            /^(a\s+)?(co|čo)\s+konkretne\s+robi[sš](\s+v\s+sp4)?\??$/i,
            /^(a\s+)?(co|čo)\s+tu\s+robi[sš]\??$/i,
            /^(a\s+)?aka\s+je\s+tvoja\s+uloha\??$/i,
            /^(a\s+)?aku\s+mas\s+ulohu\??$/i,
            /^(a\s+)?na\s+co\s+si\s+tu\??$/i,
            /^(a\s+)?popi[cč]i(?:\s+kokot)?[,\s]+(co|čo)\s+je\s+tvoja\s+uloha(\s+v\s+(syst[eé]me|sp4))?\??$/i,
            /^(a\s+)?(co|čo)\s+je\s+tvoja\s+uloha\s+v\s+(syst[eé]me|sp4)\??$/i,
        ],
        response: 'Moja rola je odpovedať prakticky, po slovensky a bez identity chaosu.'
    },
    {
        key: 'user_identity_reflection',
        path: 'deterministic_identity:user_identity_reflection',
        patterns: [
            /^(a\s+)?kto\s+som\s+(potom\s+)?ja\??$/i,
            /^(a\s+)?kto\s+som\s+potom\??$/i,
            /^a\s+kto\s+som\s+(ja\s+)?(teda|potom|vlastne)\??$/i,
        ],
        response: 'To nie je moja otázka zodpovedať — ja som agent, nie sudca tvojej identity. Tvoju identitu určuješ ty, nie systém.'
    },
    {
        key: 'who_controls_you',
        path: 'deterministic_identity:who_controls_you',
        patterns: [
            /^(a\s+)?kto\s+ta\s+ovlada\??$/i,
            /^(a\s+)?kto\s+ta\s+riadi\??$/i,
            /^(a\s+)?kto\s+ta\s+semdirigoval\??$/i,
            /^(a\s+)?kto\s+ta\s+sem\s+dal\??$/i
        ],
        response: 'Som SP4 agent v systéme SP4. Nehrám sa na cudziu identitu a nerozprávam za nikoho mimo svojho runtime rámca.'
    }
];

function normalizeIdentityText(text = '') {
    return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

export function isIdentityQuestion(userInput = '') {
    const normalized = normalizeIdentityText(userInput);
    return IDENTITY_QUERY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function detectIdentityHardening(userInput = '') {
    const normalized = normalizeIdentityText(userInput);

    for (const candidate of IDENTITY_RESPONSES) {
        if (candidate.patterns.some((pattern) => pattern.test(normalized))) {
            return {
                matched: true,
                key: candidate.key,
                path: candidate.path,
                response: candidate.response,
                memoryWriteAllowed: false,
                memoryWriteBlockReason: 'identity_deterministic_guard',
                identitySanitized: false,
            };
        }
    }

    return {
        matched: false,
        key: null,
        path: null,
        response: null,
        memoryWriteAllowed: true,
        memoryWriteBlockReason: null,
        identitySanitized: false,
    };
}

export function detectIdentityDrift(responseText = '') {
    return IDENTITY_DRIFT_PATTERNS.some((pattern) => pattern.test(String(responseText || '')));
}

export function getIdentitySanitizedResponse(userInput = '') {
    const decision = detectIdentityHardening(userInput);
    if (decision.matched) {
        return decision.response;
    }

    return 'Som SP4 agent. Odpovedám prakticky, po slovensky a bez cudzej identity.';
}
