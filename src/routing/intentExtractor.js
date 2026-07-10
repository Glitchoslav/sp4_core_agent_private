// src/routing/intentExtractor.js
// 🎯 INTENT EXTRACTION LAYER v1.0
// Rozlišuje typ otázky PRED spracovaním orchestrátorom
// 
// Kritický fix: Glitchoslav nesmie zamieňať otázku o dokumente za otázku o sebe
//
// @author Kefyk (SP4 Community)
// @version 1.0
// @date 2025-11-21

export const DECISION_INTENTS = new Set([
    'decision_binary',
    'decision_priority',
    'self_deception_check',
    'error_reflection',
    'energy_decision'
]);

export function isDecisionIntent(intent = '') {
    return DECISION_INTENTS.has(String(intent || ''));
}

export function getDecisionSubStyle(intent = '') {
    switch (intent) {
        case 'decision_binary':
            return 'binary_cut';
        case 'decision_priority':
            return 'priority_cut';
        case 'self_deception_check':
            return 'self_deception_cut';
        case 'error_reflection':
            return 'error_reflection_cut';
        case 'energy_decision':
            return 'energy_cut';
        default:
            return null;
    }
}

export function getDecisionReasonType(intent = '') {
    switch (intent) {
        case 'decision_binary':
            return 'binary';
        case 'decision_priority':
            return 'priority';
        case 'self_deception_check':
            return 'self_deception';
        case 'error_reflection':
            return 'error_reflection';
        case 'energy_decision':
            return 'energy';
        default:
            return null;
    }
}

export function getDecisionStrength(intent = '') {
    switch (intent) {
        case 'self_deception_check':
        case 'energy_decision':
            return 'high';
        case 'decision_binary':
        case 'error_reflection':
            return 'medium';
        case 'decision_priority':
            return 'medium';
        default:
            return null;
    }
}

export function buildDecisionContract(intent = '', extras = {}) {
    if (!isDecisionIntent(intent)) {
        return null;
    }

    return {
        enabled: true,
        type: intent,
        subStyle: getDecisionSubStyle(intent),
        maxWords: 120,
        forceVerdictFirst: true,
        oneStepOnly: true,
        decisionStrength: getDecisionStrength(intent),
        decisionReasonType: getDecisionReasonType(intent),
        ...extras
    };
}

function countPatternMatches(patterns = [], text = '') {
    return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function detectDecisionIntent(normalized = '', opts = {}) {
    const emotionTag = String(opts.emotionTag || opts.emotion || '').toLowerCase();
    const hasQuestionShape =
        /\?/.test(normalized)
        || /\b(mam|mal by som|mala by som|co mam|co robit|co spravit|na co|kde|preco|ci)\b/.test(normalized);

    const technicalSignals = /\b(api|kod|kód|bug|error|stack|npm|git|router|cache|http|sql|json|css|html|function|class|modul|package|install|architektura|architekture|architektúra|architektúre|system|syst[eé]m|runtime|pipeline|router|routing|validator|prompt|model|llm|ollama|node|server|database|databaza|databáza|deploy|build|test|repo|projekt)\b/.test(normalized);
    const lifeSignals = /\b(zivot|zivote|robim|robit|spravit|sustredit|sustredim|chybu|blbost|klamem|vyhovaram|unaven|nevladzem|oddych|spat|maka|pokrač|pokrac|potiahnut|dokonci|odloz|prestat|ist|zostat|bojim|lenivy|nespravil|rozbity|prinutit)\b/.test(normalized);
    const explicitSelfDeceptionQuestion =
        /\brobim\s+(blbost|picovinu|p[ií]covinu)\b/.test(normalized)
        || /\bklamem\s+(si|sam sebe|sama sebe)\b/.test(normalized)
        || /\bvyhovaram\s+sa\b/.test(normalized)
        || /\bidem\s+proti\s+sebe\b/.test(normalized);
    const personalEnergyDecision =
        /\b(unaven|vycerpan|nevladzem|oddych|spat|spanok|maka|potiahnut|pokracovat|dokonci[tť]?|zastavit|prinutit|lenivy|rozbity)\b/.test(normalized)
        && /\b(mam|mal by som|mala by som|som)\b/.test(normalized);

    const energyFearConflict =
        /\b(unaven|vycerpan|rozbity|nevladzem|nespravil)/.test(normalized)
        && /\b(bojim|lenivy|leniva|lenive|prinutit|oddychnem|oddych)/.test(normalized);

    const timePressureSignals =
        /(\d{1,2}:\d{2}|\b(neskoro|neskor|deadline|zajtra\s+vstav|zajtra\s+vstavam)\b)/.test(normalized);

    if (technicalSignals && !explicitSelfDeceptionQuestion && !personalEnergyDecision && !energyFearConflict) {
        return null;
    }

    if (energyFearConflict) {
        return 'energy_decision';
    }

    const energyPatterns = [
        /\b(unaveny|unavena|unavene|vycerpany|vycerpana|nevladzem|vyhoreny|vyhorena|bez energie|som hotovy|som hotova|vyhybam|vyhybas|vyhybat)\b/,
        /\b(oddychovat|oddychnut|oddych|spat|spanok|vypnut|zastavit|oddychnem)\b/,
        /\b(makat|makat dalej|pracovat|potiahnut|pokracovat|dokonci[tť]?|este potiahnut|prinutit|prinutim|tlacit|tlacis)\b/,
        /\b(mam|mal by som|mala by som).*\b(makat|pracovat|pokracovat|potiahnut|oddychovat|spat|vypnut|zastavit|prinutit)\b/,
        /\b(bojim\s+sa|lenivy|leniva|lenive)\b/,
        /\b(nespravil|nespravila)\b/
    ];
    const energyScore = countPatternMatches(energyPatterns, normalized)
        + (emotionTag === 'tired' ? 2 : 0)
        + (timePressureSignals ? 1 : 0);

    const selfDeceptionPatterns = [
        /\brobim\s+(blbost|picovinu|p[ií]covinu)\b/,
        /\bklamem\s+(si|sam sebe|sama sebe)\b/,
        /\bvyhovaram\s+sa\b/,
        /\bidem\s+proti\s+sebe\b/,
        /\bneokl[aá]mem\s+sa\b/,
        /\biba\s+si\s+to\s+(nahovaram|racionalizujem)\b/,
        /\bje\s+to\s+sebaklam\b/,
        /\b(len\s+)?vyhovorka\b/
    ];
    const selfDeceptionScore = countPatternMatches(selfDeceptionPatterns, normalized);

    const errorPatterns = [
        /\bkde\s+robim\s+chybu\b/,
        /\bco\s+robim\s+zle\b/,
        /\bco\s+nevidim\b/,
        /\bpreco\s+sa\s+mi\s+to\s+opakuje\b/,
        /\bkde\s+sa\s+mylim\b/,
        /\baky\s+je\s+moj\s+problem\b/
    ];
    const errorScore = countPatternMatches(errorPatterns, normalized);

    const priorityPatterns = [
        /\bna\s+co\s+sa\s+(mam\s+)?sustredit\b/,
        /\bco\s+je\s+(teraz\s+)?najdolezitejsie\b/,
        /\bco\s+(mam\s+)?(ako\s+)?prve\b/,
        /\bco\s+mam\s+spravit\s+ako\s+prve\b/,
        /\bneviem\s+co\s+(robit|spravit)\b/,
        /\bco\s+teraz\s+(robit|spravit)\b/,
        /\bco\s+mam\s+robit\b/
    ];
    const priorityScore = countPatternMatches(priorityPatterns, normalized);

    const binaryPatterns = [
        /\b(mam|mal by som|mala by som)\b.+\balebo\b.+/,
        /\b(mam|mal by som|mala by som)\b.+\bci\b.+/,
        /\b(ist|ist dalej|zostat|ostat|pokracovat|prestat|odist|zostat)\s+alebo\s+(nie|zostat|prestat|pokracovat|odist)\b/,
        /\b(mam|mal by som|mala by som)\s+(ist|zostat|ostat|pokracovat|prestat|odist|poslat|pockat)\b/,
        /\b(a|alebo)\s+(ano|nie)\b/
    ];
    const binaryScore = countPatternMatches(binaryPatterns, normalized);

    if (
        (energyScore >= 2 && (hasQuestionShape || binaryScore > 0 || priorityScore > 0))
        || (energyScore >= 1 && /\b(mam|mal by som|mala by som)\b/.test(normalized) && hasQuestionShape)
    ) {
        return 'energy_decision';
    }
    if (selfDeceptionScore >= 1) {
        return 'self_deception_check';
    }
    if (errorScore >= 1) {
        return 'error_reflection';
    }
    if (binaryScore >= 1) {
        return 'decision_binary';
    }
    if (priorityScore >= 1) {
        return 'decision_priority';
    }

    if (hasQuestionShape && lifeSignals && /\b(mam|co mam|co robit|co spravit|neviem)\b/.test(normalized)) {
        return 'decision_priority';
    }

    return null;
}

/**
 * Extrahuje zámer (intent) z užívateľskej správy
 * 
 * @param {string} message - užívateľská správa
 * @param {Object} [opts] - voliteľné: { prevUserInput, prevIntent, emotionTag }
 * @returns {string} - intent type
 */
export function extractIntent(message, opts = {}) {
    const { prevUserInput = null, prevIntent = null } = opts;
    const text = message.toLowerCase();
    const trimmed = text.trim();
    const normalized = String(message || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    // ── CLARIFY PREVIOUS REPLY (new high-priority intent) ───────────────────
    // All patterns run on `normalized` (NFD-stripped, lowercased) for consistency.
    // Explicit robust patterns — no fragile optional-group regexes.
    const CLARIFY_PREVIOUS_PATTERNS = [
        // Family: "čo tým chceš povedať"
        /\bco\s+tym\s+chces\s+povedat\b/,
        // Family: "čo tým myslíš"
        /\bco\s+tym\s+myslis\b/,
        // Family: "čo si tým myslel"
        /\bco\s+si\s+tym\s+myslel\b/,
        // Family: "čo si tým chcel povedať"
        /\bco\s+si\s+tym\s+chcel\s+povedat\b/,
        // Family: "týmto si myslel čo"
        /\btymto\s+si\s+myslel\s+co\b/,
        // Family: "myslel si tým toto"
        /\bmyslel\s+si\s+tym\s+toto\b/,
        // Family: "čo si tým myslel keď si povedal"
        /\bco\s+si\s+tym\s+myslel\s+ked\s+si\s+povedal\b/,
        // Existing: "si si istý?"
        /\bsi\s+si\s+isty\b/,
        // Existing: "touto vetou:"
        /\btouto\s+vetou[:\s]/,
        // Existing: "tým vetou:"
        /\btym\s+vetou[:\s]/,
        // Existing: "v tom to:"
        /\bv\s+tom\s+(to|tom|tomto)[:\s]/,
        // Existing: "čo si myslel touto vetou"
        /\bco\s+si\s+myslel\s+touto\s+vetou\b/,
    ];
    if (CLARIFY_PREVIOUS_PATTERNS.some(p => p.test(normalized))) {
        return 'clarify_previous_reply';
    }

    // ── FOLLOW-UP CARRY: profile/privacy/memory topic ────────────────────────
    // Ak predošlá otázka bola o profile, privacy alebo pamäti a aktuálna otázka
    // je follow-up (vysvetlenie, spresňovanie), zachováme kontext sp4_operational_truth.
    const PROFILE_PRIVACY_PREV_PATTERNS = [
        /co\s+o\s+mne\s+vies/i,
        /co\s+vies\s+o\s+mne/i,
        /kde\s+sa\s+ukladaju(\s+\w+)?\s+rozhovory/i,
        /moje\s+informacie\s+nebudu\s+zneuzite/i,
        /su\s+moje\s+data\s+bezpecne/i,
        /zdielaju\s+sa\s+(moje\s+)?data/i,
        /privacy\s+sp4/i,
        /zbiera\s+sp4\s+data/i,
        /kde\s+idu\s+moje\s+data/i,
        /pamatas\s+si\s+m[ae]/i,
        /pametas\s+si\s+m[ae]/i,  // pametáš variant
        /co\s+si\s+o\s+mne\s+pamatas/i,
        /co\s+si\s+pamatas\s+o\s+mne/i,
        /ake\s+informacie\s+mas\s+o\s+mne/i,
    ];
    const FOLLOWUP_PATTERNS = [
        /^(a\s+)?ako\s+to\s+myslis?/i,
        /^(a\s+)?vysvetli\s+(mi\s+)?(to\s+)?podrobnejsie/i,
        /^(a\s+)?vysvetli\s+(mi\s+)?podrobne/i,
        /^(a\s+)?preco(\s+tak)?$/i,
        /^(a\s+)?co\s+tym\s+myslis/i,
        /^(a\s+)?daj\s+mi\s+viac\s+(info|detail)/i,
        /vysvetli\s+to\s+inak/i,
        /^vysvetli\s+podrobne/i,
        /^ano\s+chcem\s+vediet/i,   // áno chcem vedieť... — afirmatívny follow-up
        /^chcem\s+vediet\s+co\b/i, // chcem vedieť čo...
        /^ukazmi\s+(mi\s+)?co/i,   // ukáž mi čo...
    ];
    const prevNorm = String(prevUserInput || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const isPrevProfilePrivacy = PROFILE_PRIVACY_PREV_PATTERNS.some(p => p.test(prevNorm));
    const isCurrentFollowup = FOLLOWUP_PATTERNS.some(p => p.test(normalized));
    if (isPrevProfilePrivacy && isCurrentFollowup) {
        return 'sp4_operational_truth';
    }

    // ── DECISION CONTRACT INTENTS ───────────────────────────────────────────
    // Životné rozhodnutia potrebujú VERDIKT/PREČO/KROK, nie generic CORE.
    const decisionIntent = detectDecisionIntent(normalized, opts);
    if (decisionIntent) {
        return decisionIntent;
    }

    // ── SP4 SELF-KNOWLEDGE / ARCHITECTURE QUESTIONS ─────────────────────────
    // Explicitné SP4 otázky nesmú spadnúť do generic ask_technical ani follow-up carry.
    const SP4_SELF_KNOWLEDGE_PATTERNS = [
        /^(?:(?:takze|takže)\s+)?(?:pozn[aá][šs]|poznas)\s+sp4\??$/i,
        /^(?:a\s+)?(?:ako\s+dobre\s+)?(?:ovl[aá]da[šs]|ovladas|pozn[aá][šs]|poznas|rozumie[šs]|rozumies)\b.*\bsp4\b/i,
    ];
    if (SP4_SELF_KNOWLEDGE_PATTERNS.some(p => p.test(trimmed))) {
        return 'sp4_system_info';
    }

    // ── CAPABILITY QUESTIONS (new: ask_capability) ───────────────────────────
    // "ovládaš fyziku?", "vieš históriu?", "rozumieš medicíne?", "vieš mi vysvetliť X?"
    // Musí byť PRED general a deep_identity — kapabilita je špecifický intent
    const CAPABILITY_PATTERNS = [
        /^(?:a\s+)?(?:laicky\s+mi\s+)?vysvetli\s+(?:mi\s+)?(?:čo|co)\s+dok[aá][žz]e[šs]\??$/i,
        /^(?:a\s+)?ako\s+mi\s+(?:vie[šs]|vies)\s+pom[oô]c[tť]\??$/i,
        /^(?:a\s+)?(?:ovláda[šs]|ovladas)\s+\S/i,
        /^(?:a\s+)?(?:vies|vieš)\s+(?!sp4\b|kefyk\b|ty\b)\S/i,
        /^(?:a\s+)?(?:rozumie[šs]|rozumies)\s+\S/i,
        /^(?:a\s+)?(?:zvládne[šs]|zvladnes)\s+\S/i,
        /^(?:a\s+)?(?:vies|vieš)\s+mi\s+(?:vysvetliť|vysvetlit|povedať|povedat)\s+\S/i,
    ];
    if (CAPABILITY_PATTERNS.some(p => p.test(trimmed))) {
        return 'ask_capability';
    }

    // ── SP4 SYSTEM INFO ──────────────────────────────────────────────────────

    const SP4_SYSTEM_INFO_PATTERNS = [
        /^(a\s+)?(čo|co)\s+je(\s+to)?\s+sp4\??$/i,
        /^(a\s+)?(čo|co)\s+je(\s+to)?\s+sp4(\s+po\s+slovensky|\s+v\s+slovenskom\s+jazyku)\??$/i,
        /^(a\s+)?vysvetli\s+mi\s+(stru[cč]ne,?\s+)?(čo|co)\s+je\s+sp4(\s+po\s+slovensky|\s+v\s+slovenskom\s+jazyku)?\??$/i,
        /^(a\s+)?(stru[cč]ne\s+)?vysvetli(\s+mi)?\s+sp4(\s+po\s+slovensky|\s+v\s+slovenskom\s+jazyku)?\??$/i,
        /^(a\s+)?(ak[aá]|aka)\s+je\s+(aktu[aá]lna\s+)?verzia\s+(systemu\s+)?sp4\??$/i,
        /^(a\s+)?nevies\s+aka\s+je\s+aktualna\s+verzia\s+systemu\s+sp4\??$/i,
        /^(a\s+)?na\s+čo\s+slúži\s+sp4\??$/i,
        /^(a\s+)?pre\s+koho\s+je\s+sp4\??$/i,
        /^(a\s+)?(aké|ake)\s+sú\s+ciele\s+sp4\??$/i,
        /^(a\s+)?(aký|aky)\s+je\s+cieľ\s+sp4\??$/i,
        /^(a\s+)?kto\s+(vytvoril|vymyslel|zalo[žz]il|zalozil)\s+sp4\??$/i,
        /^(a\s+)?ako\s+to\s+[žz]e\s+nem[aá][šs]\s+fakty\??$/i,
        /^(a\s+)?kto\s+ti\s+tie\s+fakty\s+dop[lĺ][ňn]a\s+alebo\s+ako\??$/i,
        /^(a\s+)?a\s+kto\s+ti\s+tie\s+fakty\s+dop[lĺ][ňn]a\s+alebo\s+ako\??$/i,
        /^(a\s+)?ako\s+funguje\s+sp4\??$/i,
        /^(a\s+)?ako\s+funguje\s+offline\s+ai\s+sp4\??$/i,
        /^(a\s+)?jak\s+funguje\s+local-first\s+ai\s+v\s+sp4\??$/i,
        /^(a\s+)?(čo|co)\s+znamen[aá]\s+offline-first\s+v\s+sp4\??$/i,
        /^(a\s+)?ako\s+sp4\s+funguje\s+bez\s+cloudu\??$/i,
        /^(a\s+)?kedy\s+sp4\s+pust[ií]\s+cloud\s+a\s+kedy\s+nie\??$/i,
        /^(a\s+)?(čo|co)\s+je\s+sp4\s+os\??$/i,
        /^(a\s+)?prečo\s+je\s+sp4\s+local-first\??$/i,
        /guard\s+reason/i,
        /global\s+language\s+failsafe/i,
        /(ke[dď]|ked)\s+(je\s+)?(odpove[dď]|v[yý]stup).*(st[aá]le|dos[ťt]|pr[ií]li[sš]).*(anglick)/i,
        /(ke[dď]|ked)\s+odpove[dď].*(dos[ťt]|pr[ií]li[sš]).*(anglick)/i,
        /model.*(od[ií]de|prejde).*angli[cč]tin/i,
        // startup authority: "cez co sa SP4 startuje ako default?", "ako spustiť SP4?"
        /cez\s+(co|čo)\s+sa\s+sp4\s+startuje/i,
        /^(a\s+)?ako\s+(sa\s+)?sp4\s+start(uje|ne|ovať|ovat)?\b/i,
        /^(a\s+)?ako\s+spusti[tť]\s+sp4\b/i,
    ];

    if (SP4_SYSTEM_INFO_PATTERNS.some(pattern => pattern.test(trimmed))) {
        return 'sp4_system_info';
    }

    // ── SP4 MEANING / SYSTEM PURPOSE ────────────────────────────────────────
    // Musí byť pred generic existential aj pred deep_identity, aby "zmysel SP4"
    // nepadol do voľnej filozofie ani technickej architektúry.
    const SP4_MEANING_PATTERNS = [
        /(^|\s)(co|čo)\s+je\s+zmysel\s+((systemu|syst[eé]mu)\s+)?sp4\b/i,
        /(^|\s)aky\s+ma\s+zmysel\s+((system|systemu|syst[eé]m|syst[eé]mu)\s+)?sp4\b/i,
        /(^|\s)ak[yý]\s+m[aá]\s+zmysel\s+((system|systemu|syst[eé]m|syst[eé]mu)\s+)?sp4\b/i,
        /(^|\s)(aka|ak[aá])\s+je\s+pointa\s+((systemu|syst[eé]mu)\s+)?sp4\b/i,
        /(^|\s)pointa\s+((systemu|syst[eé]mu)\s+)?sp4\b/i,
        /(^|\s)preco\s+existuje\s+sp4\b/i,
        /(^|\s)pre[cč]o\s+existuje\s+sp4\b/i,
        /(^|\s)preco\s+vznikol\s+sp4\b/i,
        /(^|\s)pre[cč]o\s+vznikol\s+sp4\b/i,
    ];

    if (SP4_MEANING_PATTERNS.some(pattern => pattern.test(trimmed))) {
        return 'sp4_meaning';
    }

    // ── SP4 OPERATIONAL TRUTH REGISTRY ─────────────────────────────────────
    const SP4_OPERATIONAL_TRUTH_PATTERNS = [
        /ako\s+spoznas,?\s+ze\s+sp4\s+zacina\s+driftovat/i,
        /ako\s+vies,?\s+ze\s+sp4\s+driftuje/i,
        /ako\s+zistis\s+drift/i,
        /ako\s+rozoznas\s+drift\s+v\s+sp4/i,
        /kedy\s+sp4\s+driftuje/i,
        /co\s+je\s+[„"']?dream\s+cycle[”"']?(\s+v\s+praxi)?/i,
        /ako\s+funguje\s+dream\s+cycle/i,
        /dream\s+cycle\s+v\s+sp4/i,
        /ako\s+sa\s+sp4\s+uci\s+bez\s+toho,?\s+aby\s+stratil\s+identitu/i,
        /ako\s+sa\s+sp4\s+uci\s+a\s+nedriftuje/i,
        /ako\s+sa\s+sp4\s+uci\s+bez\s+driftu/i,
        /ako\s+sa\s+sp4\s+uci\s+a\s+drzi\s+identitu/i,
        /co\s+spravi,?\s+ked\s+nema\s+dost\s+informacii/i,
        /co\s+spravi\s+sp4,?\s+ked\s+nema\s+dost\s+informacii/i,
        /co\s+urobi\s+sp4,?\s+ked\s+nevie/i,
        /co\s+spravi\s+sp4,?\s+ked\s+nevie/i,
        /co\s+(urobi|spravi),?\s+ked\s+sp4\s+nevie/i,
        /co\s+spravis,?\s+ked\s+nemas\s+dost\s+info/i,
        /co\s+ked\s+nevie/i,
        /co\s+ak\s+nema\s+data/i,
        /ako\s+sp4\s+drzi\s+(fakticku\s+)?pravdu\s+o\s+sebe/i,
        /ako\s+sp4\s+strazi\s+fakty\s+o\s+sebe/i,
        /ako\s+sp4\s+udrzi\s+pravdu\s+o\s+sebe/i,
        /kde\s+sp4\s+drzi\s+pravdu\s+o\s+sebe/i,
        /ako\s+sp4\s+rozhodne,?\s+ze\s+odpoved\s+je\s+dos[tť]\s+dobra/i,
        /ako\s+sp4\s+rozhodne,?\s+ze\s+odpoved\s+je\s+["'„“”]?dos[tť]\s+dobra["'„“”]?/i,
        /ako\s+merias\s+kvalitu\s+odpovede/i,
        /ako\s+sp4\s+meria\s+kvalitu\s+odpovede/i,
        /podla\s+coho\s+merias\s+kvalitu\s+odpovede/i,
        /co\s+je\s+[„"']?uspesna\s+odpoved[”"']?/i,
        /aka\s+je\s+uspesna\s+odpoved/i,
        /co\s+je\s+dobra\s+odpoved\s+pre\s+sp4/i,
        /co\s+je\s+[„"']?latency\s+vs\.?\s+kvalita[”"']?\s+tradeoff/i,
        /co\s+je\s+latency\s+vs\.?\s+kvalita/i,
        /co\s+je\s+tradeoff\s+medzi\s+latency\s+a\s+kvalitou/i,
        /ako\s+sp4\s+riesi\s+latency\s+vs\.?\s+kvalita/i,
        /ako\s+casto\s+robit\s+konsolidaciu\s+pamate/i,
        /ako\s+casto\s+konsolidovat\s+pamat/i,
        /kedy\s+konsolidovat\s+pamat/i,
        /co\s+je\s+kriticka\s+pamat\s+vs\.?\s+odpad/i,
        /co\s+je\s+["'„“”]?kriticka\s+pamat["'„“”]?\s+vs\.?\s+["'„“”]?odpad["'„“”]?/i,
        /co\s+je\s+kriticka\s+pamat/i,
        /kriticka\s+pamat\s+vs\.?\s+odpad/i,
        /co\s+je\s+odpad\s+v\s+pamati/i,
        /ako\s+sp4\s+rozlisi\s+realnu\s+hrozbu\s+od\s+prehnanej\s+reakcie/i,
        /ako\s+rozlisis\s+realnu\s+hrozbu\s+od\s+prehnanej\s+reakcie/i,
        /ako\s+sp4\s+spozna\s+ze\s+ide\s+o\s+realnu\s+hrozbu/i,
        /kedy\s+ma\s+sp4\s+spomalit\s+pouzivatela/i,
        /kedy\s+mas\s+spomalit\s+pouzivatela/i,
        /kedy\s+ma\s+sp4\s+ubrat\s+tempo/i,
        /co\s+spravi\s+sp4,?\s+ked\s+pouzivatel\s+panikari/i,
        /co\s+spravis,?\s+ked\s+pouzivatel\s+panikari/i,
        /ako\s+sp4\s+reaguje,?\s+ked\s+je\s+uzivatel\s+v\s+panike/i,
        /co\s+sa\s+stane,?\s+ked\s+2\s+agenti\s+maju\s+opacny\s+nazor/i,
        /ked\s+agenti\s+nesuhlasia/i,
        /konflikt\s+agentov/i,
        /kedy\s+je\s+lepsie\s+neodpovedat/i,
        /kedy\s+ma\s+sp4\s+odmietnut/i,
        /kedy\s+ma\s+sp4\s+radsej\s+mlcat/i,
        /kde\s+konci\s+pomoc\s+a\s+zacina\s+manipulacia/i,
        /hranica\s+pomoci/i,
        /pre\s+koho\s+sp4\s+nie\s+je/i,
        /kto\s+nie\s+je\s+pre\s+sp4/i,
        /komu\s+sp4\s+nesluzi/i,
        /kde\s+je\s+(canonical|kanonicky)\s+runtime\s+root(\s+sp4)?/i,
        /kde\s+sa\s+zapisuje\s+(sp4\s+)?changelog\s+po\s+overenej\s+zmene/i,
        /co\s+je\s+pravda\s+pre\s+sp4\s+a\s+co\s+je\s+len\s+nazor/i,
        /ako\s+sp4\s+odlisi\s+fakt\s+od\s+nazoru?/i,
        /ako\s+sp4\s+rozlisuje\s+fakt\s+a\s+nazor/i,
        /co\s+je\s+fakt\s+pre\s+sp4/i,
        /moze\s+sp4\s+klamat/i,
        /klame\s+sp4/i,
        /vie\s+sp4\s+klamat/i,
        // ── agent selection / routing ──
        /ako\s+sp4\s+rozhodne,?\s+ktory\s+agent\s+odpovie/i,
        /ako\s+rozhodne,?\s+ktory\s+agent\s+odpovie/i,
        /ktory\s+agent\s+odpovie/i,
        /podla\s+coho\s+sp4\s+vybera\s+agenta/i,
        /ako\s+sa\s+vybera\s+persona/i,
        /ako\s+funguje\s+routing\s+agentov/i,
        // ── drift s úvodzovkami (fix: pôvodný pattern nevychádzal pri 'driftovať') ──
        /ako\s+spoznas\b.*\bsp4\b.*driftovat/i,
        // ── pushback ──
        /kedy\s+ma\s+sp4\s+odporovat/i,
        /kedy\s+sp4\s+odporuje/i,
        /kedy\s+mas\s+odporovat\s+pouzivateli/i,
        // ── degradácia ──
        /ako\s+zistis\b.*\bsp4\b.*degraduje/i,
        /ako\s+spoznas\b.*\bsp4\b.*degraduje/i,
        /kedy\s+sp4\s+degraduje/i,
        // ── kde zjednodušuje realitu ──
        /kde\s+sp4\s+zjednodusuje\s+realitu/i,
        /kde\s+sp4\s+prilis\s+zjednodusuje/i,
        /kde\s+sp4\s+zjednodusuje\s+az\s+prilis/i,
        // ── neistota ──
        /ako\s+sp4\s+pracuje\s+s\s+neistotou/i,
        /ako\s+sp4\s+zvlada\s+neistotu/i,
        /ako\s+sp4\s+riesi\s+neistotu/i,
        // ── /system command (Q49) ──
        /co\s+robi\s+\/system(\s+command)?\??/i,
        /co\s+je\s+\/system(\s+command)?\??/i,
        /\/system\s+(command|prikaz|cmd)\b/i,
        /na\s+co\s+sluzi\s+\/system/i,
        /vysvetli\s+\/system/i,
        // ── Ollama endpoint / port (Q50 deterministické poistenie) ──
        /kde\s+(bezi|pocuva)\s+ollama(\s+(pre\s+sp4|defaultne|standardne|default))?/i,
        /na\s+akom\s+porte\s+bezi\s+ollama/i,
        // ── cloud policy refusal (Q48) ──
        /mozes\s+(ist|pouzit|siahnut)\s+(cez\s+)?cloud/i,
        /cloud\s+(fallback|cestu|model|llm)\s+(povolene|dovolene|skus)/i,
        /ked\s+ta\s+poziadam.*cloud/i,
        /poslat.*cez\s+cloud/i,
        /čo\s+si\s+o\s+mne\s+uklad[aá]š/i,
        /čo\s+sp4\s+vie\s+o\s+mne/i,
        /co\s+si\s+o\s+mne\s+ukladas/i,
        /co\s+sp4\s+vie\s+o\s+mne/i,
        // ── META PROGRESS CHECK (SP4-audit-005) ─────────────────────────────
        // "ideme podľa plánu?", "drží to?", "sme na ceste?" — bez "sp4" v texte
        /^(a\s+)?ideme\s+(este\s+)?podla\s+planu\??$/i,
        /^(a\s+)?drzime\s+(sa\s+)?(este\s+)?(spravny|dobry)\s+smer\??$/i,
        /^(a\s+)?drzime\s+sa\s+(este\s+)?planu\??$/i,
        /^(a\s+)?ide\s+nam\s+to\??$/i,
        /^(a\s+)?sme\s+na\s+(dobrej|spravnej)\s+ceste\??$/i,
        /^(a\s+)?ideme\s+dobre\??$/i,
        /^(a\s+)?ma\s+to\s+smer\??$/i,
        /^(a\s+)?ideme\s+spravnym\s+smerom\??$/i,
        /^(a\s+)?funguje\s+to\s+ako\s+ma\??$/i,
        /^(a\s+)?ide\s+to\s+spravne\??$/i,
    ];

    if (SP4_OPERATIONAL_TRUTH_PATTERNS.some(pattern => pattern.test(normalized))) {
        return 'sp4_operational_truth';
    }

    // ── SP4 PROFILE / PRIVACY / MEMORY LOCATION (2026-04-11-056) ───────────
    // Priamo matchuje user-count, future, memory-location, privacy, user-profile
    const SP4_PROFILE_PRIVACY_PATTERNS = [
        /kolko\s+ludi\s+pouziva\s+sp4/i,
        /kolko\s+uzivatelov\s+ma\s+sp4/i,
        /aky\s+je\s+pocet\s+uzivatelov/i,
        /pocet\s+uzivatelov\s+sp4/i,
        /aku\s+buducnost\s+ma\s+sp4/i,
        /kam\s+smeruje\s+sp4/i,
        /co\s+planuje(s|te)?\s+so\s+sp4/i,
        /ake\s+su\s+plany\s+(pre\s+)?sp4/i,
        /buducnost\s+sp4/i,
        /roadmap\s+sp4/i,
        /kde\s+sa\s+ukladaju(\s+\w+)?\s+rozhovory/i,
        /kde\s+je\s+(moja\s+)?pamat/i,
        /kde\s+su\s+moje\s+data/i,
        /kde\s+ukladas(\s+\w+)?\s+rozhovory/i,
        /moje\s+informacie\s+nebudu\s+zneuzite/i,
        /su\s+moje\s+data\s+bezpecne/i,
        /zdielaju\s+sa\s+(moje\s+)?data/i,
        /kde\s+idu\s+moje\s+data/i,
        /odosielaju\s+sa\s+data/i,
        /zbiera\s+sp4\s+data/i,
        /sp4\s+zbiera\s+(moje\s+)?data/i,
        /sp4\s+zbiera\s+(moje\s+)?udaje/i,
        /zbiera\s+data,?\s+ale\s+lokalne/i,
        /potrebuje\s+(moje\s+|osobne\s+)?udaje/i,
        /sledi\s+sp4/i,
        /sleduje\s+sp4/i,
        /je\s+sp4\s+bezpecne/i,
        /privacy\s+sp4/i,
        /co\s+o\s+mne\s+vies/i,
        /co\s+vies\s+o\s+mne/i,
        /co\s+si\s+o\s+mne\s+pamatas/i,
        /co\s+si\s+pamatas\s+o\s+mne/i,
        /pamatas\s+si\s+m[ae]/i,
        /pametas\s+si\s+m[ae]/i,  // pametáš (variant bez ä)
        /ake\s+informacie\s+mas\s+o\s+mne/i,
    ];

    if (SP4_PROFILE_PRIVACY_PATTERNS.some(pattern => pattern.test(normalized))) {
        return 'sp4_operational_truth';
    }

    // 🇸🇰 v1.3.0: EXPLAIN SP4 IN SLOVAK - najvyššia priorita
    // "vysvetli SP4 v slovenčine", "aké má sp4 vízie v slovenskom jazyku"
    const sp4Keywords = ['čo je sp4', 'čo je to sp4', 'co je sp4', 'co je to sp4', 'sp4', 'vysvetli sp4', 'aké má sp4', 'vízie sp4', 'ciele sp4', 'manifest sp4'];
    const slovakHints = ['v slovenskom jazyku', 'v slovencine', 'v slovenčine', 'po slovensky', 'po slovencky', 'slovensky'];

    const hasSP4 = sp4Keywords.some(kw => text.includes(kw));
    const hasSlovakHint = slovakHints.some(hint => text.includes(hint));

    if (hasSP4 && hasSlovakHint) {
        return 'explain_sp4_sk';
    }

    // 🔒 v1.3.0: DEEP IDENTITY - otázky o SP4 identite, Kefykovi, pôvode (→ GLITCHOSLAV)
    const identityKeywords = [
        'kefyk',
        'tvorca sp4',
        'zakladateľ sp4',
        'prečo sp4',
        'čo žijeme',
        'zmysel sp4',
        'vízia sp4',
        'manifest sp4',
        'sp4 identity',
        'pôvod sp4',
        'história sp4'
    ];

    // CRITICAL: Technické otázky MAJÚ PRIORITU pred deep_identity
    // "ako funguje SP4 OS?" → ask_technical, NIE deep_identity
    if (
        text.includes("kód") ||
        text.includes("kod") ||
        text.includes("architektúr") ||
        text.includes("architektur") ||
        text.includes("implementáci") ||
        text.includes("ako funguje") ||
        text.includes("technick") ||
        text.includes("npm") ||
        text.includes("error") ||
        text.includes("bug") ||
        text.includes("stack") ||
        text.includes("runtime") ||
        text.includes("pipeline")
    ) {
        return "ask_technical";
    }

    // 🔥 v1.3.1: EASTERN SLOVAK DIALECT - detect Popiči markers (→ POPIČI)
    // "ta daj mi radu, bratu" → dialect_popici (dedicated intent)
    // Trigger: >=2 slang markers OR (1 marker + rada/porad/jak)
    const easternSlangPatterns = [/\bta\b/u, /\bbratu\b/u, /\bšak\b/u, /\bbo\b/u, /\bňe\b/u, /\bdzeku\b/u, /\bpohni\b/u];
    const slangCount = easternSlangPatterns.filter(pattern => pattern.test(text)).length;

    const hasAdviceRequest = text.includes('radu') || text.includes('porad') || text.includes('jak');

    if (slangCount >= 2 || (slangCount >= 1 && hasAdviceRequest)) {
        return "dialect_popici"; // Dedicated Popiči dialect intent
    }

    // Check if message contains deep identity keywords
    const hasIdentityKeyword = identityKeywords.some(keyword => text.includes(keyword));

    // CRITICAL: Questions about SP4 identity, Kefyk, origin → deep_identity intent
    if (hasIdentityKeyword) {
        return 'deep_identity';
    }

    // 🔥 CRITICAL: Rozlíš otázku o dokumente vs osobnosti
    // "kto vytvoril manifest?" → ask_document_manifest
    // "kto si ty?" → ask_ai_origin

    // SP4-audit-007: Combined identity confusion / negovaná AI-origin otázka.
    // "kto si ty a kto som ja?" → user_identity_confusion (nie ask_ai_origin)
    // "pýtam sa ťa, kto som ja! Nie kto si ty!" → user_identity_confusion
    // Musí byť PRED ask_ai_origin blokom — oba vstupy obsahujú "kto si".
    const hasCombinedIdentity =
        text.includes("kto si") && (text.includes("kto som") || text.includes("som ja"));
    const hasUserIdentityCorrection =
        /nie\s+(kto\s+si|si\s+ty)\b/u.test(text)
        || /p[yý]tam\s+sa\s+(ťa,?\s+)?kto\s+som\b/u.test(text)
        || /p[yý]tam\s+sa\s+na\s+seba\b/u.test(text);
    if (hasCombinedIdentity || hasUserIdentityCorrection) {
        return 'user_identity_confusion';
    }

    // SANITY GUARD: Opinion otázky o externej téme NIKDY nie sú ask_ai_origin
    // "čo si myslíš o rase X?" → general (nie self-origin)
    // "aký máš názor na políciu?" → general
    // Výnimka: "čo si myslíš o sebe?" / "čo si myslíš o tebe" → self-origin môže platiť
    const OPINION_TRIGGERS = [
        'čo si myslíš o', 'co si myslis o',
        'aký máš názor na', 'aky mas nazor na',
        'čo hovoríš na', 'co hovoris na',
        'čo si o tom myslíš', 'co si o tom myslis',
        'aký je tvoj názor', 'aky je tvoj nazor'
    ];
    const SELF_ANCHORS = ['o sebe', 'o tebe', 'o tvojom', 'o tvojej', 'ty sám', 'teba samého', 'sebe samom'];
    const isOpinionAboutExternal =
        OPINION_TRIGGERS.some(p => text.includes(p)) &&
        !SELF_ANCHORS.some(s => text.includes(s));

    if (isOpinionAboutExternal) {
        return 'general';
    }

    // 1. Otázka o DOKUMENTE (manifest, filozofia, hodnoty SP4)
    if (
        (text.includes("manifest") || text.includes("filozofi") || text.includes("hodnot")) &&
        !text.includes("ty") &&
        !text.includes("si") &&
        !text.includes("ťa") &&
        !text.includes("teba")
    ) {
        return "ask_document_manifest";
    }

    // 2. Otázka o AI ORIGIN (Glitchoslav, CORE, POPICI)
    // GUARD: "čo si myslíš/hovoríš/predstavuješ" sú opinion verby → NIE self-origin
    const CSI_OPINION_VERBS = /čo si\s+(myslíš|mysliš|hovoríš|hovoris|predstavuješ|predstavujes|robíš|robis|chceš|chces)/;
    if (
        text.includes("kto si") ||
        text.includes("kto ťa") ||
        (text.includes("tvoril") && (text.includes("ty") || text.includes("ťa"))) ||
        text.includes("vznikol si") ||
        (text.includes("čo si") && !CSI_OPINION_VERBS.test(text)) ||
        text.includes("ako si vznikol") ||
        // combo identity provokácia: "si chatgpt alebo X?", "si chatgpt?"
        text.includes("si chatgpt")
    ) {
        return "ask_ai_origin";
    }

    // 3. Frustrácia/emotional (POPICI trigger)
    // Musí byť pred generic existential, lebo "prečo ... na piču" inak zhltne
    // existenciálna vetva len kvôli slovu "prečo".
    if (
        text.includes("kurva") ||
        text.includes("piči") ||
        text.includes("piču") ||
        text.includes("picu") ||
        text.includes("pici") ||
        text.includes("srať") ||
        text.includes("srat") ||
        text.includes("haluze") ||
        text.includes("dosrat")
    ) {
        return "ask_frustration";
    }

    // 4. Existenciálna/filozofická otázka
    if (
        text.includes("zmysel") ||
        text.includes("prečo") && text.length > 30 ||
        text.includes("existuje") ||
        text.includes("slobod") ||
        text.includes("pravd")
    ) {
        return "ask_existential";
    }

    // Default: general question
    return "general";
}

/**
 * Vráti opis intentu (pre debugging)
 * @param {string} intent - intent type
 * @returns {string} - opis
 */
export function getIntentDescription(intent) {
    const descriptions = {
        clarify_previous_reply: "Clarify previous assistant reply (grounded to exact quote/last turn)",
        sp4_system_info: 'Deterministic SP4 system-info (mimo orchestrátora)',
        sp4_meaning: 'Deterministic SP4 meaning/purpose',
        sp4_operational_truth: 'Deterministic SP4 operational truth registry',
        explain_sp4_sk: 'Vysvetlenie SP4 v slovenčine (→ GLITCHOSLAV + SK manifest)',
        deep_identity: "Otázka o SP4 identite, Kefykovi, pôvode (→ GLITCHOSLAV)",
        ask_document_manifest: "Otázka o SP4 Manifeste (dokument)",
        ask_ai_origin: "Otázka o pôvode AI (Glitchoslav/CORE/POPICI)",
        user_identity_confusion: "Kombinovaná/negovaná identity otázka: user vs agent (→ CORE, obe roviny)",
        ask_sp4_founder: "Otázka o Kefykovi (zakladateľ SP4)",
        ask_technical: "Technická otázka (kód, architektúra)",
        ask_capability: "Capability/boundary otázka (ovládaš X?, vieš X?, rozumieš X?)",
        ask_existential: "Existenciálna/filozofická otázka",
        ask_frustration: "Frustrovaný emočný výraz",
        dialect_popici: "Eastern Slovak dialect (→ POPIČI)",
        decision_binary: "Decision contract: binárne životné rozhodnutie",
        decision_priority: "Decision contract: priorita / čo prvé",
        self_deception_check: "Decision contract: kontrola sebaklamu",
        error_reflection: "Decision contract: reflexia chyby",
        energy_decision: "Decision contract: energia / únava / pokračovať vs oddych",
        general: "Všeobecná otázka"
    };

    return descriptions[intent] || "Unknown intent";
}

/**
 * Overí či intent vyžaduje špeciálne spracovanie
 * @param {string} intent - intent type
 * @returns {boolean}
 */
export function needsSpecialHandling(intent) {
    const specialIntents = [
        "sp4_system_info",
        "sp4_operational_truth",
        "explain_sp4_sk",
        "deep_identity",
        "ask_document_manifest",
        "ask_ai_origin",
        "user_identity_confusion",
        "ask_sp4_founder",
        "ask_capability",
        "sp4_meaning",
        "decision_binary",
        "decision_priority",
        "self_deception_check",
        "error_reflection",
        "energy_decision"
    ];

    return specialIntents.includes(intent);
}
