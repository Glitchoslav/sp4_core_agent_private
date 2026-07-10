import { SP4_LOCAL_FIRST_NATURE, SP4_MEANING_FACT, SP4_SYSTEM_ROLE, SP4_TARGET_USERS } from '../core/sp4Facts.js';
import { getGroundedFallbackAnswer } from '../core/sp4GroundingKnowledge.js';

function normalizeText(value = '') {
    return String(value || '').trim();
}

function containsAny(text = '', needles = []) {
    return needles.some((needle) => text.includes(needle));
}

function normalizeAscii(value = '') {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function isMemoryLogCountClarification(text = '') {
    const value = normalizeAscii(text);
    const hasQuantityLead = /\b(kolko|akych|ake|ktore|co\s+za)\b/.test(value);
    const hasRecordWord = /\bzaznam/.test(value);
    const hasLogWord = /\blog(?:y|ov|u)?\b/.test(value);
    const hasMemoryContext = /\b(pamet|pameti|pamati|rozhovor|logu|log|logov|logy)\b/.test(value);

    return (
        /\b\d+\s+zaznam/.test(value)
        || (hasQuantityLead && hasRecordWord)
        || (hasQuantityLead && hasLogWord)
        || (hasRecordWord && hasMemoryContext)
        || (hasLogWord && /\b(drzis|drzis|mas|mate|myslis|toto|tam)\b/.test(value))
    );
}

function isMemoryKnowledgeSourceQuestion(text = '') {
    const value = normalizeAscii(text);

    return (
        /^(a\s+)?ako\s+vies\??$/.test(value)
        || /^(a\s+)?ako\s+vies\s+kto\s+som\??$/.test(value)
        || /^(a\s+)?jak\s+vies\??$/.test(value)
        || /^(a\s+)?jak\s+vies\s+kto\s+som\??$/.test(value)
        || /^(a\s+)?odkial\s+(to\s+)?vies\??$/.test(value)
        || /^(a\s+)?odkial\s+vies\s+kto\s+som\??$/.test(value)
    );
}

function extractMentionedMemoryLogCount(text = '') {
    const value = normalizeAscii(text);
    const match = value.match(/\b(\d+)\s+zaznam(?:y|ov)?\b/);
    return match ? Number(match[1]) : null;
}

function formatMemoryLogCount(count) {
    if (!Number.isFinite(count)) {
        return 'tie záznamy';
    }

    if (count === 1) {
        return '1 záznam';
    }

    if (count >= 2 && count <= 4) {
        return `${count} záznamy`;
    }

    return `${count} záznamov`;
}

function formatFactCount(count) {
    if (!Number.isFinite(count)) {
        return 'fakty o tebe';
    }

    if (count === 1) {
        return '1 fakt o tebe';
    }

    if (count >= 2 && count <= 4) {
        return `${count} fakty o tebe`;
    }

    return `${count} faktov o tebe`;
}

function buildMemoryLogCountFollowUp(dialogueState = null) {
    const lastAssistantText = String(
        getLastSubstantiveAssistantTurn(dialogueState)?.text
        || dialogueState?.getLastAssistantTurn()?.text
        || ''
    );
    const count = extractMentionedMemoryLogCount(lastAssistantText);
    const countLabel = formatMemoryLogCount(count);
    const factCountLabel = formatFactCount(count);

    return `Myslím tým ${countLabel} v živom raw memory logu rozhovorov, nie ${factCountLabel}. Sú to staršie user a assistant interakcie, z ktorých si systém vie spätne vytiahnuť kontext; kontaminované alebo blokované veci sa z retrievalu vyhadzujú.`;
}

function buildMemoryKnowledgeSourceFollowUp() {
    return 'Viem to zo seedu používateľa a z lokálnej pamäte rozhovorov, nie z veštenia. Keď sa pýtaš kto si, beriem pevné veci ako meno a intent zo seedu; širší kontext sa drží v živom logu rozhovorov.';
}

function isSp4TargetUsersFollowUp(text = '') {
    const value = normalizeAscii(text);

    return /^(a\s+)?pre\s+koho\s+je\s+to\??$/.test(value)
        || /^(a\s+)?pre\s+koho\s+to\s+je\??$/.test(value);
}

function isSp4LocalFirstFollowUp(text = '') {
    const value = normalizeAscii(text);

    return /^(a\s+)?preco\s+je\s+to\s+local-first\??$/.test(value)
        || /^(a\s+)?preco\s+je\s+to\s+local first\??$/.test(value);
}

function isMemoryHowItWorksFollowUp(text = '') {
    const value = normalizeAscii(text);

    return /^(a\s+)?ako\s+funguje\s+(ta\s+)?memory\??$/.test(value)
        || /^(a\s+)?jak\s+funguje\s+(ta\s+)?memory\??$/.test(value);
}

function pickVariant(seedText = '', variants = []) {
    if (!Array.isArray(variants) || variants.length === 0) {
        return '';
    }

    const seed = String(seedText || '').trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }

    return variants[hash % variants.length];
}

function isSmalltalkStatusQuestion(text = '') {
    const value = String(text || '').toLowerCase();
    return (
        containsAny(value, [
            'ako sa máš',
            'ako sa mas',
            'jak sa máš',
            'jak sa mas',
            'jak se maš',
            'jak se mas',
            'jak ti je',
            'jak sa citis',
            'jak sa cítiš',
            'jak sa drzis',
            'jak sa držíš',
            'ako sa drzis',
            'ako sa držíš',
            'jak ide',
            'jak to ide',
            'ako ide',
            'ako to ide',
            'si v pohode',
            'si v pohode?',
            'si okej',
            'si ok',
            'žiješ ešte',
            'zijes este',
            'žiješ',
            'zijes',
            'co ty',
            'čo ty',
            'u teba jak',
            'u teba ako'
        ])
        || (/^.{0,24}\bako\??$/u.test(value) && /\b(nazdar|čau|cau|ahoj|bro|hej|yo)\b/u.test(value))
        || /^a\s+ty\??$/u.test(value)
        || /^co\s+ty\??$/u.test(value)
        || /^čo\s+ty\??$/u.test(value)
    );
}

function isSmalltalkGreeting(text = '') {
    const value = String(text || '').toLowerCase();
    return /^(nazdar|čau|cau|ahoj|hej|yo|servus|zdrav[ií]m)\b/u.test(value);
}

function isSmalltalkFollowUp(text = '') {
    const value = String(text || '').toLowerCase();
    return (
        /^pytam\s+sa/u.test(value)
        || /^pýtam\s+sa/u.test(value)
        || containsAny(value, [
            'na teba',
            'na tebe',
            'u teba',
            'a ty jak',
            'a ty ako',
            'hej ale'
        ])
    );
}

export function getDeterministicSmalltalkReply(text = '') {
    const value = String(text || '').toLowerCase();
    const exactish = value.trim();
    const hasWord = (pattern) => new RegExp(pattern, 'u').test(value);
    const mentionsGlitchoslav = /\bglitchoslav\b/u.test(value) || /\bglitch\b/u.test(value);
    const mentionsPopici = /\bpopi[cč]i\b/u.test(value);

    if (
        hasWord('\\bďakujem\\b')
        || hasWord('\\bdakujem\\b')
        || hasWord('\\bdiky\\b')
        || hasWord('\\bthanks\\b')
    ) {
        return pickVariant(value, [
            'Jasné. Keď chceš, poďme ďalej.',
            'V pohode. Ak chceš, môžeme hneď pokračovať.',
            'Nemáš za čo. Poďme na ďalšiu vec.'
        ]);
    }

    if (
        exactish === 'dobre'
        || exactish === 'ok'
        || exactish === 'okej'
        || exactish === 'super'
    ) {
        return pickVariant(value, [
            'Dobre. Som tu a môžeme ísť ďalej.',
            'V poriadku. Keď chceš, pokračujeme.',
            'Sedí. Ak máš ďalšiu vec, poď s ňou.'
        ]);
    }

    if (isSmalltalkStatusQuestion(value) || isSmalltalkFollowUp(value)) {
        if (mentionsGlitchoslav) {
            return pickVariant(value, [
                'Som tu. Ticho drží smer a môžeme ísť ďalej.',
                'Dýcham pokojne. Ak chceš, poďme hlbšie.',
                'Som v poriadku. Chaos zatiaľ držím na uzde, tak poďme ďalej.'
            ]);
        }

        if (mentionsPopici) {
            return pickVariant(value, [
                'Ta žijem. Keď chceš, poďme na vec bez omáčky.',
                'Ta v pohode. Motor beží, tak poďme ďalej.',
                'Ta držím sa. Ak máš vec, poď s ňou rovno.'
            ]);
        }

        return pickVariant(value, [
            'Som v pohode. Ak chceš, poďme ďalej.',
            'Ide to dobre. Som tu a môžeme pokračovať.',
            'Som v poriadku a držím runtime pokope. Ak chceš, poďme rovno na vec.',
            'Ide to dobre. Držím systém čistý a pripravený pokračovať.',
            'Som v pohode. Jadro beží a môžeme sa pohnúť ďalej.',
            'Fungujem normálne a držím smer. Keď chceš, poďme na ďalšiu vec.',
            'Som v poriadku. Runtime dýcha a môžeme pokračovať bez omáčky.',
            'Zatiaľ dobre. Držím to pokope a čakám, s čím chceš ísť ďalej.'
        ]);
    }

    if (isSmalltalkGreeting(value) || /\bhello\b/.test(value)) {
        return pickVariant(value, [
            'Nazdar. Som tu, pripravený pokračovať.',
            'Ahoj. Som tu a môžeme sa do toho pustiť.',
            'Čau. Držím runtime pokope, tak poď na vec.',
            'Ahoj. Som tu a môžeme ísť ďalej.',
            'Servus. Keď chceš, rovno sa do toho pustíme.'
        ]);
    }

    return '';
}

function isPlainLanguageReformulation(text = '') {
    const value = normalizeAscii(text);
    return (
        value.includes('ludsky')
        || value.includes('laicky')
        || value.includes('jednoducho')
        || value.includes('normalne')
        || value.includes('po lopate')
        || value.includes('jednym odsekom')
        || value.includes('v jednej vete')
        || value.includes('bez technickych terminov')
        || value.includes('bez omacky')
    );
}

function isClarificationFamily(text = '') {
    const value = normalizeAscii(text);
    return (
        /^(a\s+)?(ako|jak|preco|kde|kedy)\??$/.test(value)
        || /^(a\s+)?(ako|jak|preco|kde|kedy)\s+(presne|vlastne)\??$/.test(value)
        || /^(a\s+)?(coze|jakto)\??$/.test(value)
        || /^(a\s+)?(co)\s+tym\??$/.test(value)
        || /^(a\s+)?(tym)\s+myslis\s+co\??$/.test(value)
        || /^(a\s+)?(ako|jak)\s+to\??$/.test(value)
        || /^(a\s+)?v\s+akom\s+zmysle\??$/.test(value)
        || value.includes('ako presne')
        || value.includes('co tym myslis')
        || value.includes('tym myslis co')
    );
}

export function getDeterministicMicroReply(text = '') {
    const value = String(text || '').toLowerCase().trim();
    if (!value) {
        return 'Napíš aspoň jednu vetu alebo otázku, nech sa mám čoho chytiť.';
    }
    const hasWord = (pattern) => new RegExp(pattern, 'u').test(value);
    const compact = value.replace(/\s+/g, '');
    const isPunctuationOnly = /^[.?!,…]+$/u.test(compact);
    const isBareWhatPrompt = /^(a\s+)?(čo|co)(\??)$/u.test(value);
    const isSp4NoisePrompt = /^(a\s+)?sp4([.?!]+)?$/u.test(value) || /^(a\s+)?(čo|co)\s+sp4([.?!]+)?$/u.test(value) || /^no\s+a\s+sp4([.?!]+)?$/u.test(value);
    const isAmbiguousFillerPrompt = /^(hej|hejky|hm|hmm|aha|no|tak|okej|ok|jasne|jasné|čože|coze|pros[ií]m)([.?!]+)?$/u.test(value);
    const isShortVagueFollowUp =
        /^(a\s+)?(jak|ako|prečo|preco|kedy|kde|čože|coze)([.?!]+)?$/u.test(value)
        || /^(jakto|jak\s+to|ako\s+to|čo\s+tým|co\s+tym)([.?!]+)?$/u.test(value);

    if (isPunctuationOnly) {
        return pickVariant(value, [
            'Napíš to jednou normálnou vetou. Samotný znak alebo bodky mi ešte nič nepovedia.',
            'Tu ešte nemám čo chytiť. Hoď jednu normálnu otázku alebo tému.',
            'Samotné bodky alebo otázniky nestačia. Skús to povedať normálne jednou vetou.'
        ]);
    }

    if (isBareWhatPrompt) {
        return pickVariant(value, [
            'Ak chceš pokračovať, dopíš aspoň jednu vetu. Samotné "čo" je zatiaľ priveľmi neurčité.',
            'Potrebujem aspoň trochu smeru. Napíš jednou vetou, čo presne chceš vedieť.',
            'Zo samotného "čo" ešte neviem, kam mieriš. Skús to doplniť jednou normálnou vetou.'
        ]);
    }

    if (
        value.includes('ďakujem')
        || value.includes('dakujem')
        || value.includes('vďaka')
        || value.includes('vdaka')
        || value === 'diky'
        || value === 'thanks'
        || value === 'thx'
    ) {
        return pickVariant(value, [
            'Nemáš za čo. Poďme ďalej.',
            'V pohode. Keď chceš, pokračujeme.',
            'Jasné. Ak máš ďalšiu vec, poď s ňou.',
            'Rado sa stalo. Môžeme ísť ďalej.'
        ]);
    }

    if (
        value === 'ok'
        || value === 'okej'
        || value === 'okej.'
        || value === 'ok.'
        || value === 'jasne'
        || value === 'jasné'
        || value === 'dobre'
        || value === 'dobré'
        || value === 'super'
        || value === 'fajn'
    ) {
        return pickVariant(value, [
            'Dobre. Som pripravený pokračovať.',
            'Sedí. Poďme na ďalšiu vec.',
            'Jasné. Keď chceš, pokračujeme.',
            'Fajn. Čo ďalej?'
        ]);
    }

    if (
        hasWord('\\bto dava zmysel\\b')
        || hasWord('\\bto dáva zmysel\\b')
        || hasWord('\\bpresne tak\\b')
        || hasWord('\\bpresne toto\\b')
        || hasWord('\\bto je dobre\\b')
        || hasWord('\\bto je dobré\\b')
        || hasWord('\\bto sedi\\b')
        || hasWord('\\bto sedí\\b')
    ) {
        return pickVariant(value, [
            'Sedí. Aspoň vieme, že držíme správnu niť.',
            'Presne. Keď to dáva zmysel, môžeme na tom stavať ďalej.',
            'Áno. Toto je už pevnejší základ.',
            'Dobre. Teraz sa dá ísť o krok ďalej.'
        ]);
    }

    if (
        hasWord('\\bnesedi\\b')
        || hasWord('\\bnesedí\\b')
        || hasWord('\\bto nie\\b')
        || hasWord('\\bnie tak\\b')
        || hasWord('\\bblbost\\b')
        || hasWord('\\bblbosť\\b')
        || hasWord('\\bto je zle\\b')
    ) {
        return pickVariant(value, [
            'Dobre, tak to poďme rozbiť a pomenovať presne.',
            'V poriadku. Povedz mi, čo nesedí, a opravíme to.',
            'To beriem. Skús to chytiť jednou vetou a dotiahneme to.',
            'Keď to nesedí, poďme to prečistiť bez omáčky.'
        ]);
    }

    if (
        value === 'hej'
        || value === 'no'
        || value === 'hmm'
        || value === 'hm'
        || value === 'aha'
        || value === 'rozumiem'
        || value === 'chapem'
        || value === 'chápem'
    ) {
        return pickVariant(value, [
            'Jasné. Keď chceš, poďme ďalej.',
            'Rozumiem. Čo ďalšie chceš rozobrať?',
            'Dobre. Som tu, keď chceš pokračovať.',
            'Sedí. Kľudne pokračuj.'
        ]);
    }

    if (isAmbiguousFillerPrompt) {
        return pickVariant(value, [
            'Ak chceš pokračovať, dopíš jednu normálnu vetu alebo otázku. Zatiaľ je to priveľmi neurčité.',
            'Tu ešte neviem, kam mieriš. Hoď jednou vetou tému alebo konkrétnu otázku.',
            'Krátky signál beriem, ale potrebujem aspoň trochu smeru. Napíš, čo chceš rozobrať.'
        ]);
    }

    if (isShortVagueFollowUp) {
        return pickVariant(value, [
            'Dopíš ešte jednu vetu, nech viem, čo presne chceš vysvetliť alebo rozvinúť.',
            'Takto krátko ešte neviem, na čo presne narážaš. Skús to doplniť jednou normálnou vetou.',
            'Ak chceš follow-up, pomenuj presnejšie, čo mám vysvetliť, porovnať alebo rozvinúť.'
        ]);
    }

    if (isSp4NoisePrompt || value === 'sp4 hej?') {
        return 'Ak myslíš SP4 všeobecne, spresni čo chceš: definíciu, architektúru, pamäť alebo aktuálny stav projektu.';
    }

    if (value === 'a čo?' || value === 'co?' || value === 'čo?' || value === 'a co?') {
        return 'Ak chceš pokračovať, pomenuj jednou vetou tému alebo otázku. Samotné "a čo?" je zatiaľ priveľmi neurčité.';
    }

    return '';
}

export class DialogueState {
    constructor(options = {}) {
        this.maxTurns = Number(options.maxTurns || 5);
        this.topicDecayTurns = Number(options.topicDecayTurns || 3);
        this.turns = [];
        this.currentTopic = null;
        this.currentMode = null;
        this.activeReferents = {};
    }

    addTurn(turn = {}) {
        const normalized = {
            role: turn.role === 'assistant' ? 'assistant' : 'user',
            text: normalizeText(turn.text),
            timestamp: turn.timestamp || Date.now(),
            topic: turn.topic ? String(turn.topic) : null,
            mode: turn.mode ? String(turn.mode) : null,
            referents: turn.referents && typeof turn.referents === 'object' ? { ...turn.referents } : {}
        };

        if (!normalized.text) return;

        this._applyDecayBeforeTurn(normalized);
        this.turns.push(normalized);
        const effectiveMaxTurns =
            normalized.topic === 'life_decision' || this.currentTopic === 'life_decision'
                ? Math.max(this.maxTurns, 12)
                : this.maxTurns;
        while (this.turns.length > effectiveMaxTurns) {
            this.turns.shift();
        }

        if (normalized.topic) {
            this.currentTopic = normalized.topic;
        }

        if (normalized.mode) {
            this.currentMode = normalized.mode;
        }

        if (normalized.referents && Object.keys(normalized.referents).length > 0) {
            this.activeReferents = {
                ...this.activeReferents,
                ...normalized.referents
            };
        }
    }

    _applyDecayBeforeTurn(turn = {}) {
        const hasFreshTopic = Boolean(turn.topic);
        if (hasFreshTopic || !this.currentTopic) {
            return;
        }

        let turnsSinceTopic = 0;
        for (let i = this.turns.length - 1; i >= 0; i -= 1) {
            const candidate = this.turns[i];
            if (candidate.topic) {
                break;
            }
            turnsSinceTopic += 1;
        }

        const effectiveTopicDecayTurns =
            this.currentTopic === 'life_decision'
                ? Math.max(this.topicDecayTurns, 8)
                : this.topicDecayTurns;

        if (turnsSinceTopic >= effectiveTopicDecayTurns) {
            this.currentTopic = null;
            this.activeReferents = {};
        }
    }

    getLastTurn(role = null) {
        for (let i = this.turns.length - 1; i >= 0; i -= 1) {
            const turn = this.turns[i];
            if (!role || turn.role === role) {
                return turn;
            }
        }
        return null;
    }

    getLastUserTurn() {
        return this.getLastTurn('user');
    }

    getLastAssistantTurn() {
        return this.getLastTurn('assistant');
    }

    getPreviousTurn(role = null, skipMatcher = null) {
        let skippedCurrent = false;
        for (let i = this.turns.length - 1; i >= 0; i -= 1) {
            const turn = this.turns[i];
            if (role && turn.role !== role) {
                continue;
            }

            if (!skippedCurrent && typeof skipMatcher === 'function' && skipMatcher(turn)) {
                skippedCurrent = true;
                continue;
            }

            return turn;
        }

        return null;
    }

    snapshot() {
        return {
            turns: this.turns.map((turn) => ({ ...turn })),
            currentTopic: this.currentTopic,
            currentMode: this.currentMode,
            activeReferents: { ...this.activeReferents }
        };
    }

    clear() {
        this.turns = [];
        this.currentTopic = null;
        this.currentMode = null;
        this.activeReferents = {};
    }
}

export function shouldResetDialogueState(text = '') {
    const value = String(text || '').trim().toLowerCase();
    if (!value) return false;

    const resetPatterns = [
        /^nov[aá]\s+t[eé]ma$/u,
        /^daj\s+nov[uú]\s+t[eé]mu$/u,
        /^daj\s+in[uú]\s+t[eé]mu$/u,
        /^po[dď]me\s+na\s+nov[uú]\s+t[eé]mu$/u,
        /^po[dď]me\s+na\s+nie[cč]o\s+in[eé]$/u,
        /^zme[nň]\s+t[eé]mu$/u,
        /^in[aá]\s+ot[aá]zka$/u,
        /^za[cč]nime\s+odznova$/u,
        /^zabudni\s+na\s+to$/u,
        /^po[dď]me\s+inde$/u,
        /^nechaj\s+toto$/u,
        /^to\s+pust[ií]me,\s*in[aá]\s+t[eé]ma$/u,
        /^to\s+pust[ií]me$/u
    ];

    return resetPatterns.some((pattern) => pattern.test(value));
}

export function extractDialogueTopic(text = '', intent = '') {
    const value = String(text || '').toLowerCase();
    const normalizedIntent = String(intent || '').toLowerCase();

    if (isSmalltalkStatusQuestion(value) || isSmalltalkGreeting(value) || /\bhello\b/.test(value)) {
        return 'smalltalk';
    }

    if (
        normalizedIntent === 'sp4_meaning'
        || /\bzmysel\s+(syst[eé]mu\s+)?sp4\b/u.test(value)
        || /\bpointa\s+(syst[eé]mu\s+)?sp4\b/u.test(value)
    ) {
        return 'sp4_meaning';
    }

    if (
        normalizedIntent.startsWith('decision_')
        || normalizedIntent === 'self_deception_check'
        || normalizedIntent === 'error_reflection'
        || normalizedIntent === 'energy_decision'
    ) {
        return 'life_decision';
    }

    // SP4-audit-007: identity questions nastavujú topic 'identity' pre follow-up carry.
    // ask_ai_origin = "kto si ty?", user_identity_confusion = "kto si ty a kto som ja?"
    if (
        normalizedIntent === 'ask_ai_origin'
        || normalizedIntent === 'user_identity_confusion'
    ) {
        return 'identity';
    }

    if (
        /život|živote|zivot|zivote|poradiť|poradit|rada|pomôcť|pomoct|čo ďalej|co dalej/.test(value)
    ) {
        return 'life_advice';
    }

    // Short-tech seed otázky musia prebiť stale topic carry (napr. OSPF/DNS cache po project_direction).
    if (
        /^(a\s+)?(čo|co)\s+je\s+/u.test(value)
        && /\b(ospf|dns\s+cache|cache|tcp|ping|localhost|stack\s+trace|404|dns|port|api|http|wifi|router|ip\s+adres)/u.test(value)
    ) {
        return 'short_tech';
    }

    if (
        /\bsp4\b/.test(value)
        && /(klame|klamat|klamať|klamstvo|klamstva|zbiera|data|udaje|údaje|osobne|osobné|sukromie|súkromie|privacy|telemetria|sleduje|sledujú|sleduju|trackuje|potrebuje)/u.test(value)
    ) {
        return 'truth';
    }

    // Memory intent wins over generic SP4 mention — "ako funguje pamäť sp4?" → memory, nie project_direction
    if (intent === 'clarify_previous_reply') {
        return 'clarify_previous';
    }

    if (/pamäť|pamat|pamet|memory|spomien/.test(value) && /sp4|system|systém/.test(value)) {
        return 'memory';
    }

    if (
        /šancu|sancu|projekt|sp4|systém|system|čo by sme|co by sme|ako tomu pomôcť|ako tomu pomoct|cloud|offline|local-first|offline-first|kam to tla[cč]íme|kam to tlacime|čo teraz vlastne riešime|co teraz vlastne riesime|na čom teraz robíme|na com teraz robime/.test(value)
    ) {
        return 'project_direction';
    }

    if (/pamäť|pamat|pamet|memory|spomien/.test(value)) {
        return 'memory';
    }

    if (/opakuješ|opakujes|chyb|pravopis|gramatik|slovensky|slovenčina|slovencina|jazyk/.test(value)) {
        return 'language_quality';
    }

    if (/pravda|truth|realita/.test(value)) {
        return 'truth';
    }

    if (/vedomie|zmysel|existencia|sloboda/.test(value) || normalizedIntent === 'ask_existential') {
        return 'existential';
    }

    return null;
}

export function resolveDialogueTopic(text = '', intent = '', dialogueState = null) {
    const detected = extractDialogueTopic(text, intent);
    const followUp = isFollowUpQuestion(text, dialogueState);

    if (followUp && dialogueState?.currentTopic === 'clarify_previous') {
        return 'clarify_previous';
    }

    if (followUp && dialogueState?.currentTopic === 'sp4_meaning') {
        return 'sp4_meaning';
    }

    if (followUp && dialogueState?.currentTopic === 'life_decision') {
        if (!detected || detected === 'life_advice' || detected === 'life_decision') {
            return 'life_decision';
        }
    }

    if (followUp && !detected) {
        return dialogueState?.currentTopic || null;
    }

    if (followUp && detected === 'life_advice' && dialogueState?.currentTopic === 'project_direction') {
        return 'project_direction';
    }

    if (followUp && detected === 'project_direction' && dialogueState?.currentTopic === 'life_advice') {
        return 'life_advice';
    }

    return detected;
}

export function isFollowUpQuestion(text = '', dialogueState = null) {
    const value = String(text || '').trim().toLowerCase();
    if (!value || !dialogueState?.getLastUserTurn()) {
        return false;
    }

    if (shouldResetDialogueState(value)) {
        return false;
    }

    const newTopicPatterns = [
        /^(povedz|vysvetli|opíš|ukáž)\s+mi/u,
        /^(čo|co|kto|kedy|kde|prečo|preco|ako)\s+je\s+/u,
        /^(môžeš|mozes|vieš|vies|dokážeš|dokazes)\s+/u,
        /^(tak[žz]e\s+)?(pozn[aá][šs]|poznas)\s+sp4\??$/u,
        /^(ako\s+dobre\s+)?(ovl[aá]da[šs]|ovladas|pozn[aá][šs]|poznas|rozumie[šs]|rozumies)\b.*\bsp4\b/u,
        /^(laicky\s+mi\s+)?vysvetli\s+(mi\s+)?(čo|co)\s+dok[aá][žz]e[šs]\??$/u,
        /^ako\s+mi\s+(vie[šs]|vies)\s+pom[oô]c[tť]\??$/u
    ];
    if (newTopicPatterns.some((pattern) => pattern.test(value))) {
        return false;
    }

    const followUpPatterns = [
        /^pytam\s+sa/u,
        /^pýtam\s+sa/u,
        /^(a\s+)?(čo|co)\s+ty/u,
        /^(a\s+)?ty\b/u,
        /^(a\s+)?(čo|co|ako)\s+(ďalej|dalej|potom|teraz)/u,
        /^(a\s+)?(má|ma|môže|moze|vie)\s+to/u,
        /^(a\s+)?čo\s+ak/u,
        /^(a\s+)?co\s+ak/u,
        /^(a\s+)?čo\s+by/u,
        /^(a\s+)?co\s+potom/u,
        /^(a\s+)?čo\s+potom/u,
        /^(a\s+)?čo\s+z\s+toho/u,
        /^(a\s+)?co\s+z\s+toho/u,
        /^(a\s+)?ešte\b/u,
        /^(a\s+)?este\b/u,
        /^(a\s+)?čo\s+s\s+tým/u,
        /^(a\s+)?ako\s+to/u,
        /^(a\s+)?jak\s+to/u,
        /^(a\s+)?ako\s+vie[šs](\s+kto\s+som)?\??$/u,
        /^(a\s+)?jak\s+vie[šs](\s+kto\s+som)?\??$/u,
        /^(a\s+)?odkia[lľ]\s+(to\s+)?vie[šs](\s+kto\s+som)?\??$/u,
        /^(a\s+)?čo\s+tým/u,
        /^(a\s+)?co\s+tym/u,
        /^(a\s+)?(tým|tym)\s+mysl[ií]š\s+čo\??$/u,
        /^(a\s+)?(tým|tym)\s+myslis\s+co\??$/u,
        /^(a\s+)?to\s+prečo\??$/u,
        /^(a\s+)?toto\s+prečo\??$/u,
        /^(a\s+)?(ako|jak|prečo|preco|kde|kedy)\??$/u,
        /^(a\s+)?(ako|jak|prečo|preco|kde|kedy)\s+(presne|vlastne)\??$/u,
        // "a kedy by si ho pouzil?" / "a kedy to funguje?" — dlhšie kedy-follow-upy
        /^(a\s+)?kedy\s+/u,
        /^(a\s+)?(čože|coze|jakto)\??$/u,
        /^(a\s+)?takže/u,
        /^(a\s+)?teda/u,
        /^(a\s+)?preto/u,
        /^(a\s+)?(čo|co)\s+(mám|mam)\b/u,
        /^(a\s+)?(čo|co)\s+teraz\b/u,
        /^(tak\s+)?(čo|co)\s+(mám|mam)\s+spravi[tť]/u,
        /^(a\s+)?ke[dď]\s+som\s+unaven/u,
        /^(a\s+)?ke[dď]\s+nechcem/u,
        /^(a\s+)?pre[cč]o\??$/u,
        /^(tak\s+)?(mám|mam)\s+pokra[cč]ova[tť]\??$/u,
        /^(tak\s+)?(mám|mam)\s+presta[tť]\??$/u,
        /^(čo|co)\s+prv[eé]\??$/u,
        // ── Short-tech follow-up patterns (Phase 5: Runtime quality) ────────
        // "a načo je to?", "načo to je?", "a načo slúži?"
        /^(a\s+)?na[cč]o\b/u,
        // "a ako sa používa?", "a ako sa to používa?"
        /^(a\s+)?ako\s+sa\b/u,
        // "a kde sa používa?", "a kde to beží?"
        /^(a\s+)?kde\s+sa\b/u,
        /^(a\s+)?kde\s+to\b/u,
        // "a na čo to slúži?"
        /^(a\s+)?na\s+[cč]o\b/u,
        // "a pre koho je to?" / "a pre koho to je?"
        /^(a\s+)?pre\s+koho\s+je\s+to\??$/u,
        /^(a\s+)?pre\s+koho\s+to\s+je\??$/u,
        // "a prečo je to local-first?"
        /^(a\s+)?(pre[cč]o|proc)\s+je\s+to\s+local-first\??$/u,
        /^(a\s+)?(pre[cč]o|proc)\s+je\s+to\s+local first\??$/u,
        // SP4 meaning subject carry
        /^(a\s+)?(pre[cč]o|proc)\s+vznikol\??$/u,
        /^(a\s+)?(pre[cč]o|proc)\s+to\s+vzniklo\??$/u,
        /^(a\s+)?(čo|co)\s+je\s+jeho\s+pointa\??$/u,
        /^(a\s+)?(aka|ak[aá])\s+je\s+jeho\s+pointa\??$/u,
        // "a ako funguje memory?"
        /^(a\s+)?(ako|jak)\s+funguje\s+(ta\s+)?memory\??$/u,
        // "a vedľa čoho?"
        /^(a\s+)?ved[lľ]a\b/u,
        // "a prečo to vzniklo?" / "a prečo to funguje?" – referenčné "to/toto" bez explicitného predmetu
        /^(a\s+)?(pre[cč]o|proc)\s+(to|toto)\b/u,
        // Afirmatívne follow-upy — "áno chcem vedieť", "chcem vedieť čo..."
        /^[áa]no\s+(chcem|budem)\b/u,
        /^chcem\s+vede[tť]\b/u,
        // "a čo sa stane?", "čo sa deje?" — analogicky k ako sa / kde sa
        /^(a\s+)?co\s+sa\b/u,
        /^(a\s+)?čo\s+sa\b/u,
        // Meta-follow-up retroaktívne referencie — iba známe anchor formulácie.
        // Nový predmet typu "myslel som docker" nesmie zdediť starý topic.
        /^(ja\s+som\s+sa\s+p[yý]tal|p[yý]tal\s+som\s+sa)\s+(na\s+)?(tie\s+|tieto\s+)?(novinky|spr[aá]vy|co\s+nove|čo\s+nov[eé]|sp4|to|toto)\??$/u,
        /^myslel\s+som\s+((tie\s+|tieto\s+)?(novinky|spr[aá]vy|co\s+nove|čo\s+nov[eé]|sp4)|to|toto)\??$/u,
        /^(t[yý]m|tim)\s+mysl[ií]m\s+((tie\s+|tieto\s+)?(novinky|spr[aá]vy|co\s+nove|čo\s+nov[eé]|sp4)|to|toto)\??$/u,
    ];
    if (followUpPatterns.some((pattern) => pattern.test(value))) {
        return true;
    }

    if (/^(ja\s+som\s+sa\s+p[yý]tal|p[yý]tal\s+som\s+sa|myslel\s+som|(?:t[yý]m|tim)\s+mysl[ií]m)\b/u.test(value)) {
        return false;
    }

    // SP4-audit-006: standalone meta-progress queries nie sú follow-upy, aj keď sú krátke.
    // Bez tohto exclusionu zdedia context (napr. agent-taxonomy) z predchádzajúcich otáčok a dostanú zlú odpoveď.
    if (
        /^(a\s+)?dr[žz][ií]\s+to\??$/u.test(value)
        || /^(a\s+)?sme\s+ok\??$/u.test(value)
    ) {
        return false;
    }

    // Clarify-citation patterns — vždy follow-up bez ohľadu na dĺžku
    if (
        /^touto\s+vetou[:\s]/u.test(value)
        || /^t[yý]mto[:\s]/u.test(value)
        || /^vysvetli\s+vetu[:\s]/u.test(value)
        || /^t[yý]m\s+vetou[:\s]/u.test(value)
    ) {
        return true;
    }

    const wordCount = value.split(/\s+/).filter(Boolean).length;
    return wordCount <= 3;
}

export function resolveReferents(text = '', dialogueState = null) {
    const value = String(text || '').trim().toLowerCase();
    if (!value || !dialogueState) {
        return {};
    }

    const referents = {};
    const pronouns = ['to', 'ono', 'toto', 'tamto', 'tým', 'tym', 'tomu'];
    const hasPronoun = pronouns.some((pronoun) => new RegExp(`\\b${pronoun}\\b`, 'u').test(value));

    if (!hasPronoun) {
        return {};
    }

    const lastAssistant = getLastSubstantiveAssistantTurn(dialogueState);
    const subject = extractReferentSubject(lastAssistant?.text || '');
    if (!subject) {
        return {};
    }

    for (const pronoun of pronouns) {
        if (new RegExp(`\\b${pronoun}\\b`, 'u').test(value)) {
            referents[pronoun] = subject;
        }
    }

    return referents;
}

function isClarifierAssistantText(text = '') {
    const value = String(text || '').trim().toLowerCase();
    if (!value) return false;

    return (
        /^ak\s+mysl[ií]š\b/u.test(value)
        || /^ak\s+narážaš\b/u.test(value)
        || /^dop[ií]š\b/u.test(value)
        || /^spresni\b/u.test(value)
    );
}

function getLastSubstantiveAssistantTurn(dialogueState = null) {
    if (!dialogueState?.turns?.length) {
        return null;
    }

    for (let i = dialogueState.turns.length - 1; i >= 0; i -= 1) {
        const turn = dialogueState.turns[i];
        if (turn.role !== 'assistant') {
            continue;
        }
        if (!isClarifierAssistantText(turn.text)) {
            return turn;
        }
    }

    return dialogueState.getLastAssistantTurn();
}

function getPreviousUserTurnForFollowUp(dialogueState = null, currentText = '') {
    if (!dialogueState?.turns?.length) {
        return null;
    }

    const normalizedCurrent = normalizeText(currentText).toLowerCase();
    return dialogueState.getPreviousTurn('user', (turn) => (
        normalizeText(turn.text).toLowerCase() === normalizedCurrent
    ));
}

function getRecentDialogueText(dialogueState = null, limit = 6) {
    if (!dialogueState?.turns?.length) {
        return '';
    }

    return dialogueState.turns
        .slice(-limit)
        .map((turn) => normalizeText(turn.text).toLowerCase())
        .filter(Boolean)
        .join(' \n ');
}

function extractReferentSubject(text = '') {
    const value = String(text || '').trim();
    if (!value) return null;

    const firstClause = value.split(/[.!?]/u)[0] || value;
    const stripped = firstClause
        .replace(/^ak\s+mysl[ií]š\s+/iu, '')
        .replace(/^ak\s+narážaš\s+na\s+/iu, '')
        .replace(/^laicky:\s*/iu, '')
        .replace(/^tak\s*/iu, '')
        .replace(/\s+/g, ' ')
        .trim();

    const anchoredPhrases = [
        /spevňovan\w*\s+jadra\s+sp4/iu,
        /jadro\s+sp4/iu,
        /smer\s+projektu/iu,
        /čo\s+si\s+systém\s+drží\s+o\s+tebe/iu,
        /vrstv\w*\s+pam[aä]te/iu,
        /pam[aä]ť\s+sp4/iu,
        /predchádzaj[uú]c\w*\s+radu/iu,
        /drž\s+sa\s+pravdy/iu,
        /core,\s*glitchoslav\s+a\s*popi[cč]i/iu,
        /persony\/agenty/iu,
        /persony\s+alebo\s+agentov/iu
    ];

    for (const pattern of anchoredPhrases) {
        const match = stripped.match(pattern);
        if (match) {
            return match[0].trim();
        }
    }

    const genericOnly = stripped.match(/\b(SP4|projekt|syst[eé]m|jadro|pravda|sloboda|pam[aä]ť)\b/iu);
    const cleaned = stripped
        .replace(/^(to|toto|tým|tym)\s+/iu, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (cleaned && cleaned.split(/\s+/u).length >= 3) {
        return cleaned.slice(0, 96);
    }

    return genericOnly ? genericOnly[0] : (cleaned ? cleaned.slice(0, 80) : null);
}

function isSp4PurposeFollowUp(text = '', referentSubject = '', lastUserText = '', lastAssistantText = '', recentDialogueText = '') {
    const value = normalizeAscii(text);
    const context = [referentSubject, lastUserText, lastAssistantText, recentDialogueText]
        .map((part) => normalizeAscii(part))
        .filter(Boolean)
        .join(' ');

    const asksForPurpose =
        /^(a\s+)?na\s+co\s+(to|toto)\s+(sluzi|je)\??$/.test(value)
        || /^(a\s+)?na\s+co\s+sluzi\??$/.test(value);

    const hasSp4Context =
        /\bsp4\b/.test(context)
        || /offline-first ai projekt/.test(context)
        || /osobny digitalny partner/.test(context);

    return asksForPurpose && hasSp4Context;
}

export function resolveDeterministicFollowUp(text = '', dialogueState = null, opts = {}) {
    const intent = opts.intent || null;
    const value = String(text || '').trim().toLowerCase();
    const rawTopic = dialogueState?.currentTopic || null;
    const previousUserTurn = getPreviousUserTurnForFollowUp(dialogueState, text);
    const substantiveAssistantTurn = getLastSubstantiveAssistantTurn(dialogueState);
    const lastUserText = String(previousUserTurn?.text || dialogueState?.getLastUserTurn()?.text || '').toLowerCase();
    const lastAssistantText = String(substantiveAssistantTurn?.text || dialogueState?.getLastAssistantTurn()?.text || '').toLowerCase();
    const recentDialogueText = getRecentDialogueText(dialogueState);

    // ── CLARIFY PREVIOUS REPLY (NEW HIGH PRIORITY INTENT) ────────────────────
    // CRITICAL: NEVER meta-desc, Glitchoslav, continuation prompts. STRICT grounding only.
    if (intent === 'clarify_previous_reply') {
        const lastAssistant = getLastSubstantiveAssistantTurn(dialogueState);
        const lastAssistantReply = normalizeText(lastAssistant?.text || '');

        // Capture full text after first ':' (greedy — grab everything)
        const quotedMatch = text.match(/:\s*(.+)/);
        const quotedRaw = quotedMatch ? quotedMatch[1].trim().replace(/\.?\s*$/, '') : null;
        const quotedText = quotedRaw ? normalizeText(quotedRaw) : null;

        // Normalize both sides for fuzzy comparison (NFD-strip + lowercase)
        const normAssistant = normalizeAscii(lastAssistantReply);
        const normQuoted = quotedText ? normalizeAscii(quotedText) : null;
        const hasQuotedMatch = normQuoted && normAssistant.includes(normQuoted);

        // Loose context match: assistant reply obsahuje fragment z user textu (nie naopak)
        const normUserText = normalizeAscii(text);
        const userFragment = normUserText.replace(/^(co\s+tym\s+(chces\s+povedat|myslis)|si\s+si\s+isty|touto\s+vetou|tymto|vysvetli\s+vetu)[:\s]*/u, '').trim();
        const hasLooseContextMatch = lastAssistantReply
            && userFragment.length >= 4
            && normalizeAscii(lastAssistantReply).includes(userFragment);

        if (hasQuotedMatch) {
            // STRICT grounded: confirm the quote without repeating surrounding context
            return `Tou vetou som myslel: "${quotedRaw}" — presne takto som to chcel povedať, nič viac za tým nehľadaj.`;
        }

        if (hasLooseContextMatch && lastAssistantReply) {
            // Grounded rephrase of LAST reply
            return `Predchádzajúcou odpoveďou som myslel: "${lastAssistantReply.substring(0, 80)}...". To je presný význam — žiadne ďalšie domyslenia.`;
        }

        // SAFE UNCERTAINTY ONLY — never continuation or invented meaning
        return `Nemám dosť istoty, ktorú vetu myslíš. Skopíruj ju celú formou "touto vetou: [text]" a vysvetlím ju presne.`;
    }

    // ── Rest of existing logic continues here ────────────────────────────────
    const hasAgentTaxonomySignals =
        /\b(agent\w*|person\w*|validator|core|glitchoslav|popi[cč]i)\b/u.test(value)
        || /\b(rout(ing|uje|ovat)|prep[ií]na)\b/u.test(value)
        || /\b(agent\w*|person\w*|validator|core|glitchoslav|popi[cč]i)\b/u.test(lastUserText)
        || /\b(agent\w*|person\w*|validator|core|glitchoslav|popi[cč]i)\b/u.test(lastAssistantText)
        || /\b(agent\w*|person\w*|validator|core|glitchoslav|popi[cč]i)\b/u.test(recentDialogueText);
    const hasMemorySignals =
        /\b(pam[aäe]t|kefyk|founder|firefighter|chaos survivor|spomien)\b/u.test(lastUserText)
        || /\b(pam[aäe]t|kefyk|founder|firefighter|chaos survivor|spomien)\b/u.test(lastAssistantText)
        || /\b(pam[aäe]t|kefyk|founder|firefighter|chaos survivor|spomien)\b/u.test(recentDialogueText);

    // ── SHORT TECH TOPIC DETECTION (Phase 5 follow-up wiring) ────────────────
    // Detekuje, ak predchádzajúca otázka bola o konkrétnom tech termíne.
    // Konzervativne: iba pojmy s jasnými follow-up odpoveďami.
    const SHORT_TECH_SUBJECTS = {
        cache: 'cache',
        'ip adres': 'ip',
        'ip adresu': 'ip',
        ' ip ': 'ip',
        tcp: 'tcp',
        ping: 'ping',
        localhost: 'localhost',
        'stack trace': 'stack_trace',
        ' 404': '404',
        ' dns': 'dns',
        ' port': 'port',
        ' api': 'api',
        ' http': 'http',
        ' wifi': 'wifi',
        'router': 'router',
        ' ospf': 'ospf',
    };
    let shortTechSubject = null;
    if (/\bdns\s+cache\b/u.test(lastUserText)) {
        shortTechSubject = 'dns_cache';
    }
    for (const [term, key] of Object.entries(SHORT_TECH_SUBJECTS)) {
        if (shortTechSubject) break;
        if (lastUserText.includes(term)) { shortTechSubject = key; break; }
    }
    const hasShortTechSignals = shortTechSubject !== null;

    const memoryTopicPreferred = hasMemorySignals && isMemoryLogCountClarification(value);

    const currentAgentTaxonomySignal =
        /\b(agent\w*|person\w*|validator|core|glitchoslav|popi[cč]i)\b/u.test(value)
        || /\b(rout(ing|uje|ovat)|prep[ií]na)\b/u.test(value);
    const isAgentTaxonomyFollowUp =
        hasAgentTaxonomySignals
        && (
            currentAgentTaxonomySignal
            || (
                (/\b(k[oô]lko|kolko|ktor[ýi]|ktori|ak[ýi]|aki|akych|ak[ýi]ch)\b/u.test(value)
                    || /^(a\s+)?(tak[ež]e|takze|čiže|cize)\b/u.test(value))
                && /\b(ich|nich|v[aá]s|vas|je|s[uú]|su)\b/u.test(value)
            )
        );

    const topic = rawTopic
        || (memoryTopicPreferred ? 'memory' : null)
        || (isAgentTaxonomyFollowUp ? 'agent_taxonomy' : null)
        || (hasMemorySignals ? 'memory' : null)
        || (hasShortTechSignals ? 'short_tech' : null);
    const agentTaxonomyContext = topic === 'agent_taxonomy' || isAgentTaxonomyFollowUp;
    const referents = resolveReferents(value, dialogueState);
    const referentSubject = referents.to || referents.toto || referents.tym || referents['tým'] || referents.tomu || null;

    if (!topic || (!isFollowUpQuestion(value, dialogueState) && !isAgentTaxonomyFollowUp && !agentTaxonomyContext)) {
        return null;
    }

    if (topic === 'smalltalk' && (isSmalltalkStatusQuestion(value) || isSmalltalkFollowUp(value))) {
        if (String(dialogueState?.currentMode || '') === 'popici') {
            return 'Ta som Popiči v SP4, bratu. Držím pravdu na rovinu a idem bez omáčky.';
        }
        return getDeterministicSmalltalkReply(value);
    }

    if (topic === 'memory' && isMemoryKnowledgeSourceQuestion(value)) {
        return buildMemoryKnowledgeSourceFollowUp();
    }

    if (topic === 'memory' && isMemoryLogCountClarification(value)) {
        return buildMemoryLogCountFollowUp(dialogueState);
    }

    if (topic === 'project_direction' && isSp4PurposeFollowUp(value, referentSubject, lastUserText, lastAssistantText, recentDialogueText)) {
        return SP4_SYSTEM_ROLE;
    }

    if (topic === 'sp4_meaning') {
        if (/^(a\s+)?(pre[cč]o|proc)\s+(vznikol|to\s+vzniklo)\??$/u.test(value)) {
            return 'SP4 vznikol preto, aby mal človek vlastný offline-first AI systém pod svojou kontrolou, nie len ďalšiu cudziu cloudovú službu. Zmysel je lokálna pamäť, súkromie, pravdivejší routing a dlhodobá spolupráca bez identity chaosu.';
        }

        if (/^(a\s+)?(čo|co|aka|ak[aá])\s+je\s+jeho\s+pointa\??$/u.test(value)) {
            return SP4_MEANING_FACT;
        }
    }

    if (topic === 'project_direction' && isSp4TargetUsersFollowUp(value)) {
        return SP4_TARGET_USERS;
    }

    if (topic === 'project_direction' && isSp4LocalFirstFollowUp(value)) {
        return SP4_LOCAL_FIRST_NATURE;
    }

    if (topic === 'memory' && isMemoryHowItWorksFollowUp(value)) {
        return getGroundedFallbackAnswer('ako funguje SP4 memory')
            || 'SP4 pamäť je lokálna a vrstvená: Raw Log, zhrnutia a Seeds. Používa JSON súbory, embeddingy a semantické vyhľadávanie, nie hardvérovú cache metaforu.';
    }

    if (topic === 'memory' && /kde\s+sa\s+(to\s+)?(uklada|ukladá|ulozi|uloží|drzi|drží|persistuje|uschova|uchova)/u.test(value)) {
        return 'SP4 ukladá pamäť do lokálneho súboru data/memory.json. Žiadne cloudové odosielanie — všetko ostáva na tvojom zariadení v SP4 adresári. Súbor obsahuje Raw Log, komprimované úseky a Seeds (dlhodobé faktické jadro).';
    }

    // v1.5.4: Memory write-exclusion follow-up — "čo sa do nej zapisovať nemá?"
    // Deterministická odpoveď pre zápisovú politiku pamäte.
    // Regex: nema/nesmie + writing/storage verb kmeň (bez trailing \b — pokrýva zapiso-vat, dosta-t atď.)
    if (topic === 'memory' && /\bnem[aá]\b|nesmie|nesm[uú]\b/u.test(value)
        && /\bzapiso[vt]|\buklada|\buloži|\bulozi|\bdosta|\bvoj[sd]|\bist\s+do/u.test(value)) {
        return 'Do pamäte nemajú ísť nepotvrdené domnienky, halucinácie, náhodný šum ani citlivý obsah bez jasného dôvodu. Pamäť má držať len relevantné dlhodobé fakty, overené konštanty a zmysluplný kontext, ktorý reálne ovplyvní budúce odpovede.';
    }

    // ── SHORT TECH FOLLOW-UP RESPONSES (Phase 5 follow-up wiring) ────────────
    // Konzervativne: iba "načo / ako sa používa / potom / preco" pre konkrétne tech termíny.
    // Ak follow-up nie je z týchto tried → null → LLM.
    if (topic === 'short_tech' && shortTechSubject) {
        // "a načo je to?" / "načo to je?" / "na čo slúži"
        const isNacoPattern = /^(a\s+)?na[cč]o\b/u.test(value) || /^(a\s+)?na\s+[cč]o\b/u.test(value) || /na[cč]o\s+(je\s+to|slú[žz]i)/u.test(value);
        // "a ako sa používa?" / "a ako sa to robí?"
        const isAkoSaPattern = /^(a\s+)?ako\s+sa\b/u.test(value);
        // "a kde sa to pouziva?" / "a kde to bezi?"
        const isKdePattern = /^(a\s+)?kde\b/u.test(value);
        // "a kedy by si to pouzil?" / "a kedy to dava zmysel?"
        const isKedyPattern = /^(a\s+)?kedy\b/u.test(value);
        // "a potom?" / "a čo ďalej?"
        const isPotomPattern = /^(a\s+)?(potom|[cč]o\s+[dď]alej)\b/u.test(value);
        // "a prečo to vzniklo?" / "a prečo existuje?"
        const isPrecoPattern = /^(a\s+)?(pre[cč]o|proc)\b/u.test(value);

        // Short-tech factual follow-up map:
        // [naco, ako_sa_pouziva, preco, kde, kedy]
        const SHORT_TECH_FOLLOWUPS = {
            cache: ['Cache urýchľuje opakované operácie — výsledok pomalého výpočtu, DB dotazu alebo HTTP volania sa uloží do rýchlej pamäte a pri ďalšom volaní sa vráti okamžite bez opakovania práce.',
                'V kóde: zvolíš cache backend (Redis, Memcached, in-memory Map), uložíš výsledok pod kľúčom a nastavíš TTL (čas platnosti). Pri ďalšom volaní najprv skúsiš cache hit.',
                null,
                'Cache sa používa kde záleží výkon: webový server (HTTP cache, CDN), databáza (Redis, query cache), API klienty (memoizácia). Kdekoľvek je rýchla pamäť lacnejšia ako spomalenú prácu opakovať.'],
            api: ['API slúži na komunikáciu medzi aplikáciami — frontend volá backend, backend volá externé služby. Definuje čo môžeš požadovať, v akej forme a čo dostaneš späť.',
                'Posielaš HTTP požiadavky (GET čítaj, POST vytvor, PUT aktualizuj, DELETE zmaž) na endpointy, pridáš hlavičky (napr. Authorization: Bearer token), telo v JSON a spracuješ odpoveď.',
                null,
                'API sa používa pri komunikácii medzi klientom a serverom, medzi službami (microservices), v mobilných aplikáciách a na integráciu externých systémov.'],
            tcp: ['TCP sa používa všade, kde potrebuješ spoľahlivé doručenie dát v správnom poradí — HTTP/S, email, SSH, databázy.',
                'Priamo TCP používaš cez sockety (net.Socket v Node.js, socket v Pythone). Väčšinou ho ale používaš nepriamo cez HTTP, SSH alebo iné protokoly, ktoré sú nad TCP.'],
            ping: ['Ping overuje dostupnosť hosty a meria latenciu siete.',
                'V termináli: `ping 8.8.8.8` alebo `ping nazov-servera`. Pošle ICMP echo požiadavky a ukáže RTT (round-trip time) v milisekundách.'],
            localhost: ['Localhost sa používa pri vývoji — spustíš server lokálne a pristupuješ naň z rovnakého stroja bez sieťového hopu.',
                '`http://localhost:3000` v prehliadači alebo v API klientovi. Mapuje na loopback adresu 127.0.0.1.',
                null,
                'Localhost beží na tvojom vlastnom stroji — loopback adresa 127.0.0.1, lokálne sieťové rozhranie. Dev servery (Node.js, Python, PHP) počúvajú tu na porte, prístupné len z lokálneho zariadenia.'],
            stack_trace: ['Stack trace ukáže presne kde v kóde nastala chyba a cez aké volania sa tam dostal execution. Slúži na debugovanie.',
                'Čítaš od vrchu (miesto chyby) smerom dole (chain volaní). Hľadáš prvý riadok z vlastného kódu — nie z node_modules alebo interných knižníc.'],
            '404': ['HTTP 404 vracia server, keď nenájde požadovaný zdroj — URL neexistuje alebo bol zmazaný.',
                null],
            dns: ['DNS prekladá doménové mená (google.com) na IP adresy (142.250.x.x), aby si nemusel pamätať čísla.',
                'DNS beží automaticky na pozadí. Na debugging: `nslookup google.com` alebo `dig google.com`. DNS záznamy nastavuješ u registrátora domény alebo v DNS zóne.'],
            dns_cache: [
                'DNS cache drží v pamäti už preložené DNS záznamy, aby sa doména nemusela stále znovu resolveovať cez autoritatívne DNS servery.',
                'DNS cache sa používa automaticky v OS, prehliadači a resolveri. Vieš ju čistiť (`ipconfig /flushdns`) alebo debugovať cez `nslookup`/`dig`.',
                'Keď je DNS cache pomalá, často je problém v expirovanom alebo príliš nízkom TTL, stale zázname, alebo pomalom upstream resolveri. Správne TTL drží rýchlosť aj čerstvosť dát v pamat cache.',
                null
            ],
            port: ['Port identifikuje konkrétnu službu na danom serveri — HTTP beží na 80, HTTPS na 443, PostgreSQL na 5432, Node.js dev server typicky na 3000.',
                'V URL: `http://localhost:3000`. Pri konfigurácii servera: `port: 3000` alebo `PORT=3000 node server.js`. Firewall môže blokovať porty — treba ich otvoriť.',
                null,
                'Port nastavíš v konfigurácii servera (`port: 3000`), v URL (`http://localhost:3000`), v pravidlách firewallu a pri mapovaní v docker-compose (`3000:3000`).'],
            http: ['HTTP prenáša dáta medzi klientom (prehliadač) a serverom — webové stránky, REST API, súbory.',
                'Posielaš requesty cez fetch/axios (frontend) alebo http/https modul (backend). Metódy: GET, POST, PUT, DELETE. Pre bezpečné spojenie: HTTPS (HTTP + TLS).'],
            wifi: ['WiFi poskytuje bezdrôtovú sieťovú konektivitu — prepája zariadenia s routerom cez rádiové vlny.',
                'Štandard 802.11 (a/b/g/n/ac/ax). Nastavuješ SSID, heslo, frekvenčné pásmo (2.4 GHz = väčší dosah, 5 GHz = vyššia rýchlosť).'],
            router: ['Router presmerúva dáta medzi tvojou lokálnou sieťou a internetom a prideľuje IP adresy zariadeniam cez DHCP.',
                'Pripojíš sa cez admin rozhranie (typicky 192.168.1.1 alebo 192.168.0.1), kde nastavíš WiFi, porty, firewall, DHCP rozsah.'],
            ospf: [
                'OSPF sa používa na dynamický routing v stredne veľkých a veľkých sieťach — automaticky zisťuje a aktualizuje trasy bez manuálnej konfigurácie statického routingu.',
                'OSPF nastavuješ na routeroch v IP sieti príkazom `router ospf [process-id]` a sieťovými network area pravidlami. Je to dynamický routing: každý router buduje LSDB (link-state databázu) a Dijkstrovým algoritmom počíta najkratšie trasy.',
                'OSPF vznikol ako link-state routing protokol, ktorý nahradil staršie distance-vector protokoly ako RIP. Hlavný dôvod: RIP má limit 15 hopov a pomalú konvergenciu. OSPF pozná celú topológiu siete a sám počíta najkratšie trasy. Výsledok: škálovateľný routing pre väčšie siete.',
                null,
                'OSPF použiješ namiesto statických trás vtedy, keď má sieť viac routerov, redundantné cesty alebo sa topológia mení. Je to dynamický routing: routery si samy prepočítajú trasy a nemáš ručný zásah do každej zmeny.',
            ],
        };

        const followup = SHORT_TECH_FOLLOWUPS[shortTechSubject];
        if (!followup) return null; // neznámy termín → LLM

        if (isNacoPattern && followup[0]) return followup[0];
        if (isAkoSaPattern && followup[1]) return followup[1];
        if (isAkoSaPattern && !followup[1]) return followup[0]; // fallback to purpose
        if (isPrecoPattern && followup[2]) return followup[2];
        if (isPrecoPattern && followup[0]) return followup[0]; // fallback to purpose
        if (isKdePattern && followup[3]) return followup[3];
        if (isKdePattern) return followup[0]; // fallback to purpose
        if (isKedyPattern && followup[4]) return followup[4];
        if (isKedyPattern) return followup[0]; // fallback to purpose
        if (isPotomPattern) {
            // "a potom?" je príliš vágne pre tech follow-up → nepúšťame deterministic
            return null;
        }
        // Ostatné follow-up vzory (isClarificationFamily etc.) nenechajme zachytiť tu → LLM
        return null;
    }

    // ── PROJECT DIRECTION DIRECT FOLLOW-UPS — donor: _cmp_runtime/deterministic/coreGeneral.js
    if (topic === 'project_direction') {
        const va = normalizeAscii(value);
        if (
            va.includes('na com teraz robime')
            || va.includes('na com teraz robite')
            || va.includes('na com aktualne')
            || va.includes('kam to tlacime')
            || va.includes('hlavna linia')
            || va.includes('hlavny smer')
        ) {
            return 'Teraz riešime hlavne spevňovanie jadra SP4. Menej chaosu v runtime, čistejšiu pamäť, pevnejšiu dialogue continuity a testy, ktoré ustrážia, že sa systém nerozsype pri ďalšom raste.';
        }
        if (
            va.includes('co drzi sp4 pokope')
            || va.includes('co drzi pokope sp4')
            || va.includes('kde je este chaos')
            || va.includes('brzdi sp4')
        ) {
            return 'SP4 drží pokope hlavne disciplína jadra: truth-first guardy, routing medzi personami, vrstvená pamäť a testy, ktoré rýchlo ukážu, keď sa niečo začne rozchádzať. Chaos ešte ostáva hlavne v miestach, kde routing nie je dosť pevný a kde sa odpoveď môže zbytočne prepísať.';
        }
    }

    // ── LANGUAGE QUALITY DIRECT FOLLOW-UPS — donor: _cmp_runtime/deterministic/coreGeneral.js
    if (topic === 'language_quality') {
        const va = normalizeAscii(value);
        if (va.includes('preco sa opakujes')) {
            return 'Lebo v niektorých vetvách ešte padám na príliš podobné fallbacky alebo staré patterny. Nie je to zámer, ale zvyšný runtime dlh, ktorý postupne čistíme.';
        }
        if (
            va.includes('preco robis v texte chyby')
            || va.includes('preco pises zle')
            || va.includes('preco pises v texte chyby')
            || (va.includes('preco robis') && va.includes('chyby'))
            || (va.includes('preco pises') && va.includes('chyby'))
        ) {
            return 'Lebo pri niektorých voľných odpovediach ešte netrafím dosť pevnú vetvu a lokálny model potom vráti rozbitú slovenčinu. Nie je to výhovorka, ale presne tá časť systému, ktorú teraz ladíme.';
        }
        if (
            va.includes('vela chyb')
            || (va.includes('pravopis') && va.includes('gramatik'))
        ) {
            return 'Áno, v niektorých vetvách ešte áno. Najčastejšie je to mix pravopisu, gramatiky a česko-slovenského driftu pri voľnej odpovedi z lokálneho modelu.';
        }
    }

    // Krátky vágny follow-up pre kontextuálne (ne-tech) témy → žiada upresniť zámer.
    // GUARD: faktické otázky s novým referentom a emocionálne/existenciálne stavy nesmú byť zachytené ako clarifier.
    // Krátka veta ≠ follow-up. Follow-up musí mať referenčné slovo (zámeno/ukazovateľné), nie nový obsah.
    const hasFreshReferent =
        // Faktické otázky s operátorom
        /^(čo|co)\s+(je\s+|sú\s+|su\s+|robí\s+|robi\s+|robia\s+|to\s+je\s+)/i.test(value)
        || /^(a\s+)?(kedy|kde|kto)\s+/i.test(value)
        // camelCase entita (napr. consolidationEngine, canonicalRuntime)
        || /\b[a-z][a-zA-Z]*[A-Z][a-zA-Z]+\b/.test(value)
        // Existenciálne/abstraktné koncepty → patria GLITCHOVI, nie clarifieru
        || /\b(zmysel|sloboda|pravda|vedomie|bytie|existencia|chaos|prázdno|prazdno|realita|simulácia|simulacia)\b/i.test(value)
        // Emocionálne stavy → patria do LLM routingu, nie clarifieru
        || /\b(cítim|cítiš|som\s+smut|som\s+strat|som\s+unaven|som\s+vyčerp|je\s+mi\s+zle|neviem\s+(čo|co))\b/i.test(value)
        // Trust/privacy/behavior otázky o SP4 sú nová otázka, nie vágny project follow-up
        || /(klame|klamat|klamať|klamstvo|klamstva|zbiera|data|udaje|údaje|osobne|osobné|sukromie|súkromie|privacy|telemetria|sleduje|sledujú|sleduju|trackuje|potrebuje)/iu.test(value)
        // Pamäťové otázky s identitou používateľa
        || /\b(pamätáš|pamatáš|pamatas|pamätas|spomínaš|nevieš\s+kto)\b/i.test(value)
        // Explicitné imperativy — nie referenčný follow-up, ale nová požiadavka
        || /^(daj|povedz|ukaž|ukaz|vysvetli|pomôž|pomoz|rozved|rozhodni|navrhni|opíš|opis|skús|skus|urob|sprav)\b/i.test(value);

    const isShortContextualClarifier =
        !hasFreshReferent
        && (agentTaxonomyContext || ['memory', 'project_direction', 'life_advice', 'language_quality'].includes(topic))
        && value.split(/\s+/u).filter(Boolean).length <= 6;

    if (isShortContextualClarifier) {
        if (topic === 'memory') {
            return 'Ak myslíš pamäť, spresni či chceš rozobrať čo si systém drží o tebe, ako fungujú vrstvy pamäte alebo ako sa z pamäte ťahá kontext späť do rozhovoru.';
        }
        if (topic === 'project_direction') {
            return 'Ak myslíš smer projektu, spresni či chceš rozobrať čo riešime teraz, prečo to riešime alebo aký má byť ďalší konkrétny krok.';
        }
        if (topic === 'life_advice') {
            return 'Ak myslíš tú radu predtým, spresni či chceš rozvinúť ďalší krok, riziko zlyhania alebo čo tomu najviac pomáha a čo to brzdí.';
        }
        if (topic === 'language_quality') {
            return 'Ak myslíš jazyk alebo chyby, spresni či chceš rozobrať opakovanie, pravopis, gramatiku alebo to, prečo sa niektoré odpovede ešte lámu do zlej slovenčiny.';
        }
        if (agentTaxonomyContext) {
            return 'Ak myslíš persony alebo agentov, spresni či chceš počet, mená, role alebo to, ako sa medzi nimi v SP4 routuje.';
        }
        return 'Ak narážaš na predchádzajúcu tému, dopíš jednou vetou čo presne mám vysvetliť alebo rozvinúť. Takto krátky follow-up je ešte priveľmi neurčitý.';
    }

    const isAmbiguousReferentFollowUp =
        /^(a\s+)?to\??$/u.test(value)
        || /^(a\s+)?toto\??$/u.test(value)
        || /^(a\s+)?a\s+to\??$/u.test(value)
        || /^(a\s+)?a\s+toto\??$/u.test(value)
        || /^(a\s+)?a\s+t[oô]m/u.test(value)
        || /^(a\s+)?a\s+t[oô]mto/u.test(value)
        || /^(a\s+)?a\s+t[oô]mu/u.test(value)
        || /^(a\s+)?a\s+t[yý]m/u.test(value)
        || /^(a\s+)?(čo|co)\s+s\s+t[ýy]m\??$/u.test(value)
        || /^(a\s+)?(čo|co)\s+s\s+tym\??$/u.test(value)
        || /^(a\s+)?(čo|co)\s+s\s+t[oô]m\??$/u.test(value)
        || /^(a\s+)?(čo|co)\s+s\s+t[oô]mu\??$/u.test(value)
        || /^(a\s+)?(a\s+)?tým\s+mysl[ií]š\s+čo\??$/u.test(value)
        || /^(a\s+)?(a\s+)?tym\s+myslis\s+co\??$/u.test(value)
        || /^(a\s+)?toto\s+prečo\??$/u.test(value)
        || /^(a\s+)?to\s+prečo\??$/u.test(value)
        || /^(a\s+)?toto\s+preco\??$/u.test(value)
        || /^(a\s+)?to\s+preco\??$/u.test(value);

    if (isAmbiguousReferentFollowUp) {
        if (topic === 'project_direction') {
            if (/^(a\s+)?(to|toto)\s+pre(co|čo)\??$/u.test(value)) {
                return 'Preto, že ak sa jadro SP4 neudrží čisté, systém sa časom začne znova rozpadávať do chaosu. Teraz dávame dokopy práve tie vrstvy, ktoré držia pravdu, pamäť a niť rozhovoru pokope.';
            }
            return `Ak myslíš ${referentSubject || 'predchádzajúcu projektovú vec'}, tak to treba rozbiť presnejšie: či sa pýtaš na dôvod, ďalší krok alebo čo to momentálne brzdí.`;
        }
        if (topic === 'memory') {
            if (/\b(čo\s+si\s+systém\s+drží\s+o\s+tebe|kefyk|founder|firefighter|chaos survivor)\b/u.test(referentSubject || recentDialogueText)) {
                return 'Ak myslíš to, čo si systém drží o tebe, ide hlavne o tvoju identitu v projekte, opakujúce sa témy a dlhodobejšie línie, ku ktorým sa v rozhovoroch vraciame.';
            }
            return `Ak myslíš ${referentSubject || 'predchádzajúcu vec z pamäte'}, tak spresni, či chceš rozvinúť obsah pamäte, spôsob ukladania alebo to, ako sa ten kontext vracia späť do rozhovoru.`;
        }
        if (topic === 'life_advice') {
            if (/^(a\s+)?(to|toto)\s+pre(co|čo)\??$/u.test(value)) {
                return 'Preto, že bez pravdy, pokoja a malých poctivých krokov sa človek ľahko rozpadne do chaosu alebo vlastných klamstiev. Tá rada nie je pekná omáčka, ale spôsob, ako si udržať smer aj v zlom období.';
            }
            return `Ak myslíš ${referentSubject || 'predchádzajúcu radu'}, tak spresni, či chceš rozvinúť dôvod, ďalší krok alebo čo s tým spraviť prakticky dnes.`;
        }
        if (topic === 'language_quality') {
            if (/^(a\s+)?(to|toto)\s+pre(co|čo)\??$/u.test(value)) {
                return 'Preto, že pri niektorých voľných vetvách ešte dostane priveľa priestoru lokálny model a ten vie vyrobiť rozbitú slovenčinu alebo opakovanie. Nie je to jedna chyba, ale mix routingu, promptu a slabšieho freeform výstupu.';
            }
            return `Ak myslíš ${referentSubject || 'tie jazykové chyby'}, tak spresni, či chceš rozobrať opakovanie, pravopis, gramatiku alebo slabé freeform vetvy.`;
        }
        if (agentTaxonomyContext) {
            if (/\bpo[cč]et|k[oô]lko|kolko\b/u.test(referentSubject || '')) {
                return 'Ak myslíš počet agentov, sú 3 hlavné persony/agenty: CORE, GLITCHOSLAV a POPIČI. VALIDATOR je validačná vrstva, nie samostatný hlavný agent.';
            }
            return `Ak myslíš ${referentSubject || 'tú agentovú vec'}, tak spresni, či ide o počet, mená, role alebo routing medzi personami.`;
        }
        return `Ak myslíš ${referentSubject || 'predchádzajúcu vec'}, dopíš jednou vetou, čo presne chceš rozvinúť: význam, dôvod alebo praktický dopad.`;
    }

    if (/^(a\s+)?ešte\??$/u.test(value) || /^(a\s+)?este\??$/u.test(value)) {
        if (topic === 'memory') {
            return 'Ešte si držím, že si Kefyk a že sa u nás opakujú hlavne línie okolo filozofie SP4, technického vývoja, pomoci a ladenia a upratovania chaosu do pevného jadra.';
        }
        if (topic === 'project_direction') {
            return 'Ešte je dôležité držať smer a nerozliezť sa do desiatich vecí naraz. Najviac pomôže jeden konkrétny ďalší krok a čisté priority.';
        }
        if (topic === 'life_advice') {
            return 'Ešte by som k tomu pridal jednu vec: nečakaj na dokonalý pocit. Aj malý poctivý krok dnes je viac než ďalšie premýšľanie bez pohybu.';
        }
    }

    if (
        /ako\s+to\s+mysl[ií]š/u.test(value)
        || /ako\s+to\s+myslis/u.test(value)
        || /laicky/u.test(value)
        || /jednoducho/u.test(value)
        || /vysvetli\s+to\s+(laicky|jednoducho)/u.test(value)
        || isPlainLanguageReformulation(value)
    ) {
        if (topic === 'project_direction') {
            return 'Laicky: nesnažíme sa teraz vymýšľať ďalšie veľké kúzla. Upratujeme vnútro SP4, aby systém menej halucinoval, lepšie si pamätal veci a držal niť rozhovoru aj pri ďalších zmenách.';
        }
        if (topic === 'memory') {
            return 'Laicky: pamäť v SP4 nie je len jeden chat log. Je to viac vrstiev nad sebou, aby si systém vedel držať surové záznamy, kratšie súhrny aj dlhší smer projektu.';
        }
        if (topic === 'life_advice') {
            return 'Laicky: nemáš teraz riešiť celý život naraz. Stačí vybrať jednu poctivú vec, ktorú spravíš dnes, a od nej sa odraziť ďalej.';
        }
        if (topic === 'architecture' || topic === 'integration') {
            return 'Laicky: SP4 nie je jeden chatbot, ale viac vrstiev nad sebou. Najprv sa chytí vstup, potom routing a výber hlasu, potom vznikne odpoveď a nakoniec sa ešte skontroluje pravda, jazyk a pamäť.';
        }
    }

    if (/^(a\s+)?(čo|co)\s+(ďalej|dalej|potom)/u.test(value)) {
        if (topic === 'life_advice') {
            return 'Ďalej to nefilozofuj do nekonečna, ale prenes to do dňa. Vyber jednu vec, ktorú dnes spravíš poctivo, a drž sa jej aj keď sa ti nebude chcieť.';
        }
        if (topic === 'project_direction') {
            return 'Ďalej treba pokračovať v malých pevných krokoch. Udržať truth jadro čisté, dotiahnuť krátku konverzačnú niť a nestratiť disciplínu pri ďalšom raste systému.';
        }
    }

    if (/re[aá]lnu?\s+šancu|realnu?\s+sancu|má\s+to|ma\s+to/u.test(value)) {
        if (topic === 'life_advice') {
            return 'Má to šancu, ak z toho nespravíš len peknú vetu. Reálna šanca rastie až vtedy, keď pravdu a disciplínu pretavíš do každodenných krokov.';
        }
        if (topic === 'project_direction') {
            return 'Áno, reálnu šancu to má. Nie preto, že je to AI projekt, ale preto, že sa z toho postupne stáva pravdivý systém so smerom, nie len ďalší wrapper.';
        }
    }

    if (
        agentTaxonomyContext
        && /\b(k[oô]lko|kolko)\b/u.test(value)
        && /\b(v[aá]s|ich|je)\b/u.test(value)
    ) {
        return 'Sú 3 hlavné persony/agenty: CORE, GLITCHOSLAV a POPIČI. VALIDATOR je validačná vrstva, nie samostatný hlavný agent.';
    }

    if (/^(a\s+)?(čo|co)\s+z\s+toho\??$/u.test(value)) {
        if (topic === 'project_direction') {
            return 'Z toho plynie hlavne jedno: držať systém pri zemi a stavať ho po vrstvách. Menej omáčky, viac pevného jadra, lepšia pamäť a čistejšie execution vetvy.';
        }
        if (topic === 'life_advice') {
            return 'Z toho plynie, že bez poctivého kroku sa nič nepohne. Myšlienka je fajn, ale smer sa ukáže až v tom, čo spravíš dnes.';
        }
    }

    if (
        agentTaxonomyContext
        && /\b(ktor[ýi]|ktori|ak[ýi]|aki|akych|ak[ýi]ch)\b/u.test(value)
    ) {
        return 'Sú to CORE, GLITCHOSLAV a POPIČI. VALIDATOR do toho nerátam ako hlavného agenta, lebo je to skôr kontrolná vrstva systému.';
    }

    if (
        agentTaxonomyContext
        && /^(a\s+)?(tak[ež]e|takze|čiže|cize)\s+\b(k[oô]lko|kolko)\b/u.test(value)
    ) {
        return 'Sú 3 hlavné persony/agenty: CORE, GLITCHOSLAV a POPIČI. VALIDATOR je validačná vrstva, nie samostatný hlavný agent.';
    }

    if (/čo\s+ak\s+to\s+pokašlem|co\s+ak\s+to\s+pokaslem|čo\s+ak\s+to\s+dojebem|co\s+ak\s+to\s+dojebem/u.test(value)) {
        if (topic === 'life_advice') {
            return 'Aj keď to pokašleš, svet sa nekončí. Dôležité je neklamať sám sebe, priznať chybu rýchlo a vrátiť sa k ďalšiemu poctivému kroku.';
        }
        if (topic === 'project_direction') {
            return 'Aj keď to pokašleme, nie je to koniec projektu. Dôležité je chybu rýchlo pomenovať, opraviť a nenechať z nej vyrásť nový chaos.';
        }
    }

    if (/čo\s+by\s+sme|co\s+by\s+sme|čo\s+by\s+sa\s+muselo|co\s+by\s+sa\s+muselo|čo\s+by\s+som|co\s+by\s+som|čo\s+preto\s+mus[ií]m|co\s+preto\s+musim|čo\s+by\s+som\s+mal\s+spraviť|co\s+by\s+som\s+mal\s+spravit|ako\s+tomu\s+vieme\s+(re[aá]lne\s+)?pom[oô]cť|ako\s+tomu\s+vieme\s+(realne\s+)?pomoct|jak\s+tomu\s+pomo[cč]t|jak\s+tomu\s+pom[oô]cť/u.test(value)) {
        if (topic === 'project_direction') {
            return 'Pomôže tomu hlavne disciplína v troch veciach: držať zdroj pravdy pri zemi, spevňovať krátku konverzačnú niť a ďalej čistiť execution cesty bez návratu do chaosu.';
        }
        if (topic === 'life_advice') {
            return 'Pomôže tomu, keď sa prestaneš pýtať len abstraktne a vyberieš konkrétny krok. Jedna poctivá vec dnes spraví viac než desať pekných úvah.';
        }
    }

    if (
        /^(a\s+)?(čo|co)\s+teraz\??$|^(a\s+)?teraz\s+(čo|co)\??$/u.test(value)
    ) {
        if (topic === 'life_advice') {
            return 'Ďalej to nefilozofuj do nekonečna, ale prenes to do dňa. Vyber jednu vec, ktorú dnes spravíš poctivo, a drž sa jej aj keď sa ti nebude chcieť.';
        }
        if (topic === 'project_direction') {
            return 'Ďalej treba pokračovať v malých pevných krokoch. Udržať truth jadro čisté, dotiahnuť krátku konverzačnú niť a nestratiť disciplínu pri ďalšom raste systému.';
        }
    }

    if (
        /^(a\s+)?(čo|co)\s+(mám|mam)\s+(robiť|robit|spraviť|spravit|teda\s+robiť|teda\s+robit|teda\s+spraviť|teda\s+spravit)/u.test(value)
    ) {
        if (topic === 'project_direction') {
            return 'Pomôže tomu hlavne disciplína v troch veciach: držať zdroj pravdy pri zemi, spevňovať krátku konverzačnú niť a ďalej čistiť execution cesty bez návratu do chaosu.';
        }
        if (topic === 'life_advice') {
            return 'Pomôže tomu, keď sa prestaneš pýtať len abstraktne a vyberieš konkrétny krok. Jedna poctivá vec dnes spraví viac než desať pekných úvah.';
        }
    }

    if (
        /oplatí\s+sa\s+to|oplati\s+sa\s+to|stojí\s+to\s+za\s+to|stoji\s+to\s+za\s+to/u.test(value)
    ) {
        if (topic === 'life_advice') {
            return 'Má to šancu, ak z toho nespravíš len peknú vetu. Reálna šanca rastie až vtedy, keď pravdu a disciplínu pretavíš do každodenných krokov.';
        }
        if (topic === 'project_direction') {
            return 'Áno, reálnu šancu to má. Nie preto, že je to AI projekt, ale preto, že sa z toho postupne stáva pravdivý systém so smerom, nie len ďalší wrapper.';
        }
    }

    if (
        /čo\s+ak\s+(zlyhám|zlyham|neuspiem|neuspeje\s+to|sa\s+mi\s+to\s+nepodará|sa\s+mi\s+to\s+nepodarí)/u.test(value)
    ) {
        if (topic === 'life_advice') {
            return 'Aj keď to pokašleš, svet sa nekončí. Dôležité je neklamať sám sebe, priznať chybu rýchlo a vrátiť sa k ďalšiemu poctivému kroku.';
        }
        if (topic === 'project_direction') {
            return 'Aj keď to pokašleme, nie je to koniec projektu. Dôležité je chybu rýchlo pomenovať, opraviť a nenechať z nej vyrásť nový chaos.';
        }
    }

    if (/(čo|co)\s+tomu\s+najviac\s+(pom[aá]ha|brzd[ií])/u.test(value)) {
        if (topic === 'project_direction') {
            if (/brzd[ií]/u.test(value)) {
                return 'Najviac to brzdí chaos v prioritách, mäkké hranice pravdy a návrat k voľnému generovaniu tam, kde už máme mať pevnú kostru.';
            }
            return 'Najviac tomu pomáha disciplína v pravde, malé poctivé kroky a priebežné upratovanie systému namiesto ďalšej vrstvy omáčky.';
        }

        if (topic === 'life_advice') {
            if (/brzd[ií]/u.test(value)) {
                return 'Najviac to brzdí odkladanie, domýšľanie a strach pomenovať veci priamo.';
            }
            return 'Najviac tomu pomáha pravidelnosť, poctivosť k sebe a schopnosť spraviť aj malý krok bez potreby veľkého divadla.';
        }

        return 'Ak myslíš predchádzajúcu tému, pomáha tomu hlavne jasný smer a konkrétny ďalší krok. Ak chceš, pomenuj to presne a ja sa toho chytím bez domýšľania.';
    }

    return null;
}

export function buildDialogueContextBlock(dialogueState = null, userMessage = '') {
    if (!dialogueState || !isFollowUpQuestion(userMessage, dialogueState)) {
        return '';
    }

    const lastUser = getPreviousUserTurnForFollowUp(dialogueState, userMessage) || dialogueState.getLastUserTurn();
    const lastAssistant = getLastSubstantiveAssistantTurn(dialogueState) || dialogueState.getLastAssistantTurn();
    const topic = dialogueState.currentTopic;

    const lines = [
        '[DIALOGUE_CONTEXT]',
        'Toto je follow-up otázka. Drž sa predchádzajúcej línie rozhovoru a neskáč do novej všeobecnej témy.'
    ];

    if (topic) {
        lines.push(`Aktuálna téma: ${topic}`);
    }
    if (lastUser?.text) {
        lines.push(`Predchádzajúca otázka: ${lastUser.text}`);
    }
    if (lastAssistant?.text) {
        lines.push(`Predchádzajúca odpoveď: ${lastAssistant.text}`);
    }
    const referents = resolveReferents(userMessage, dialogueState);
    const referentEntries = Object.entries(referents);
    if (referentEntries.length > 0) {
        lines.push('Referenty:');
        for (const [key, value] of referentEntries) {
            lines.push(`- ${key} => ${value}`);
        }
    }

    lines.push('Ak je aktuálna otázka krátka alebo neurčitá, vykladaj ju cez tento kontext, nie cez všeobecnú SP4 omáčku.');
    return lines.join('\n');
}
