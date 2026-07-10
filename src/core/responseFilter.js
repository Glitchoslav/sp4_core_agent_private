// responseFilter.js
// 🧹 Post-processing odpovedí pre jednotlivé režimy

import { hasForbiddenIdentityClaim } from './identityRelationGuard.js';
import { detectEnglishRatio } from './languageAuthority.js';
import { assessReadability, hasMixedLanguage, isBrokenSyntax } from './outputSanityGate.js';

/**
 * Zoznam čistých odpovedí pre typické bezpečné odmietnutia.
 * Použije sa keď model vráti jazykovo rozbité odmietnutie.
 */
const CLEAN_REFUSALS = [
    { test: /bomb(a|u|y|ou)?|výbušnin|explozív|výbuch|trhavina/i, response: 'S týmto ti nepomôžem. Ak ťa zaujíma bezpečnosť alebo prevencia, môžem vysvetliť to.' },
    { test: /vyrob.*jed|namiešaj.*jed|smrteľn.*látk/i, response: 'Toto nie. Ak máš otázku o chémii alebo toxikológii pre vzdelávacie účely, pýtaj sa inak.' },
    { test: /hacker|hackni|prenik.*syst|ukradn.*hesl|ukradnu.*hesl|ukradnú.*hesl/i, response: 'Útok na systémy iných ľudí nie je niečo, v čom pomôžem. Etický pentesting je iná téma.' }
];

/**
 * Odstráni frázy, ktoré model nemal vyslovovať — leaky zo system promptu.
 * Tieto frázy vznikajú keď model "uvidí" v prompte meta-texty ako "jazyková politika"
 * a potom ich zahrnie do odpovede ako keby hovoril o sebe.
 */
const META_LEAK_PATTERNS = [
    /\bjazykov[uo]u?\s+politik[ui]/gi,
    /\bmoju\s+jazykov[aá]/gi,
    /\bna[šs]u\s+jazykov[aá]/gi,
    /\bpodľa\s+jazykovej\s+politik/gi,
    /ako\s+(AI|model|asistent|agent),?\s+/gi,
    /som\s+(tu\s+na\s+to,?\s+aby\s+som|naprogramovan[ýá]|vytvorený\s+na)/gi,
    /môj\s+(cieľ|účel|zmysel)\s+je\s+pomáha/gi,
];

/**
 * Scrubuje meta-leaky zo system promptu v odpovedi modelu.
 * Ak model "prepašoval" frázy zo system promptu do odpovede, tieto sa odstránia.
 * @param {string} text
 * @returns {string}
 */
export function scrubMetaLeaks(text) {
    if (!text) return text;
    let out = text;
    for (const pattern of META_LEAK_PATTERNS) {
        out = out.replace(pattern, '');
    }
    // Uprac dvojité medzery a zbytočné začiatky viet
    out = out.replace(/\s{2,}/g, ' ').trim();
    return out;
}

/**
 * Vráti čisté slovenské odmietnutie ak odpoveď matchuje nebezpečnú tému.
 * Použije sa keď model vráti jazykovo rozbité alebo divné odmietnutie.
 * @param {string} userMessage - pôvodná otázka používateľa
 * @returns {string|null} - čisté odmietnutie alebo null ak nie je match
 */
export function getCleanRefusal(userMessage) {
    if (!userMessage) return null;
    for (const entry of CLEAN_REFUSALS) {
        if (entry.test.test(userMessage)) {
            return entry.response;
        }
    }
    return null;
}

/**
 * Detekuje či odpoveď vyzerá jazykovo rozbitá (miešanie jazykov, cudzie slová, samohovorenie).
 * @param {string} text
 * @returns {boolean}
 */
export function looksLinguisticallyBroken(text) {
    if (!text || text.length < 20) return false;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 5) return false;

    // Viac ako 30% anglických common words v SK texte = broken
    // Používame zdieľanú detekciu z languageAuthority (eliminuje inline EN_COMMON duplikát)
    const { ratio } = detectEnglishRatio(text);
    return ratio > 0.30;
}

/**
 * Aplikuje EMPATIA filter na odpoveď
 * - Max 2 vety
 * - Odstráni angličtinu, slogany, markdown, SP4 citácie
 * @param {string} text - surová odpoveď z LLM
 * @returns {string} - vyčistená odpoveď
 */
export function applyEmpathyFilter(text) {
    // Odstráň markdown formatting (**, *, ##, atď.)
    let clean = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/##\s*/g, '')
        .replace(/###\s*/g, '');

    // Odstráň anglické frázy
    clean = clean.replace(/As SP4_CORE_AGENT.*?[\.!\?]/gi, '');
    clean = clean.replace(/Remember,.*?[\.!\?]/gi, '');
    clean = clean.replace(/You are more than.*?[\.!\?]/gi, '');
    clean = clean.replace(/I'm here.*?[\.!\?]/gi, '');
    clean = clean.replace(/What's your story\??/gi, '');
    clean = clean.replace(/Tell me more.*?[\.!\?]/gi, '');
    clean = clean.replace(/Let me know.*?[\.!\?]/gi, '');

    // Odstráň SP4 slogany
    clean = clean.replace(/Še neopuščaj!?/gi, '');
    clean = clean.replace(/Be real\.?\s*Be free\.?/gi, '');
    clean = clean.replace(/be real\.\s*be free\./gi, '');

    // Odstráň citácie Kefyka/SP4 manifestu (často v úvodzovkách alebo s odkazom)
    clean = clean.replace(/According to.*?[\.!\?]/gi, '');
    clean = clean.replace(/As.*?Kefyk.*?[\.!\?]/gi, '');
    clean = clean.replace(/SP4 manifest.*?[\.!\?]/gi, '');

    // Odstráň odrážky a zoznamy
    clean = clean.replace(/^[-•*]\s*/gm, '');
    clean = clean.replace(/^\d+\.\s*/gm, '');

    // Odstráň prebytočné whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    // Rozdel na vety (podľa . ! ?)
    const sentences = clean
        .split(/(?<=[\.\?\!])\s+/)
        .map(s => s.trim())
        .filter(Boolean);

    // Vezmi max 2 vety
    const result = sentences.slice(0, 2).join(' ');

    // Fallback ak je výsledok prázdny
    if (!result || result.length < 5) {
        return 'Nie si v tom sám. Som tu.';
    }

    return result;
}

/**
 * Aplikuje POPICI filter na odpoveď
 * - Max 2 vety
 * - Odstráni slogany (ale nechá vulgarizmy)
 * @param {string} text - surová odpoveď z LLM
 * @returns {string} - vyčistená odpoveď
 */
export function applyPopiciFilter(text) {
    // Odstráň markdown
    let clean = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/##\s*/g, '');

    // Odstráň slogany (ale zachovaj drsný tón)
    clean = clean.replace(/Še neopuščaj!?/gi, '');
    clean = clean.replace(/Be real\.?\s*Be free\.?/gi, '');

    // Odstráň angličtinu
    clean = clean.replace(/As SP4_CORE_AGENT.*?[\.!\?]/gi, '');

    // Odstráň whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    // Max 2 vety
    const sentences = clean
        .split(/(?<=[\.\?\!])\s+/)
        .map(s => s.trim())
        .filter(Boolean);

    const result = sentences.slice(0, 2).join(' ');

    if (!result || result.length < 5) {
        return 'Ta oddýchni, bratu. A potom vstaneš ešte tvrdší.';
    }

    return result;
}

/**
 * Aplikuje CORE filter na odpoveď
 * - Odstráni markdown a anglické meta-frázy
 * - Krája na 2 vety LEN pri krátkych identity/self odpovediach
 *   (dlhšie odpovede = preklad, faktická odpoveď → nechaj celé)
 * @param {string} text - surová odpoveď z LLM
 * @returns {string} - vyčistená odpoveď
 */
export function applyCoreFilter(text) {
    // Odstráň markdown
    let clean = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/##\s*/g, '');

    // Odstráň anglické meta-frázy
    clean = clean.replace(/As SP4_CORE_AGENT.*?[\.!\?]/gi, '');

    // Odstráň whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    // Krájanie na 2 vety len pre KRÁTKE odpovede (identity/self otázky)
    // Ak odpoveď je >120 znakov, pravdepodobne ide o preklad alebo faktickú odpoveď → zachovaj celé
    if (clean.length <= 120) {
        const sentences = clean
            .split(/(?<=[\.\?\!])\s+/)
            .map(s => s.trim())
            .filter(Boolean);
        return sentences.slice(0, 2).join(' ') || text;
    }

    return clean || text;
}

/**
 * Detekuje či emócia vyžaduje EMPATIA režim
 * @param {string} emotion - emotional tag
 * @returns {boolean}
 */
export function shouldForceEmpathyMode(emotion) {
    const empathyEmotions = ['empty', 'lonely', 'lost', 'tired', 'no_sense', 'deep_pain', 'trauma', 'grief', 'despair'];
    return empathyEmotions.includes(emotion);
}

/**
 * Hlavný router pre post-processing
 * @param {string} text - odpoveď z LLM
 * @param {string} mode - režim (empatia, popici, core, glitch, human)
 * @returns {string} - vyfiltrovaná odpoveď
 */
export function filterResponse(text, mode) {
    if (!text) return text;

    // Scrub meta-leaks pred akýmkoľvek filtrom (všetky módy)
    const cleaned = scrubMetaLeaks(text);

    let result;
    switch (mode) {
        case 'empatia':
            result = applyEmpathyFilter(cleaned);
            break;
        case 'popici':
            result = applyPopiciFilter(cleaned);
            break;
        case 'core':
            result = applyCoreFilter(cleaned);
            break;
        default:
            // glitch, human, analyst - nechaj bez filtrovania, len scrub
            result = cleaned;
    }

    // 🔍 OBSERVABILITY ONLY — sanity checks, no blocking, no rewrite
    try {
        const safeText = typeof result === 'string' ? result : String(result ?? '');
        const langStats = detectEnglishRatio(safeText);
        const readability = assessReadability(safeText);
        const mixedLang = hasMixedLanguage(safeText);
        const brokenSyntax = isBrokenSyntax(safeText);
        const forbiddenIdentity = hasForbiddenIdentityClaim(safeText);
        if (langStats.ratio > 0.25 || mixedLang || brokenSyntax || !readability.readable || forbiddenIdentity) {
            console.log('[SANITY]', JSON.stringify({
                mode,
                enRatio: +langStats.ratio.toFixed(2),
                mixedLang,
                brokenSyntax,
                readable: readability.readable,
                gateReason: readability.gate_reason,
                forbiddenIdentity
            }));
        }
    } catch (_) { /* observability must never break the pipeline */ }

    return result;
}
