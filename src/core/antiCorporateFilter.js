/**
 * Anti-Corporate Filter (v0.8.8)
 * 
 * Detekuje a nahrádza korporátne frázy SP4 verziou.
 * Žiadny corporate bullshit. Be real. Be free.
 * 
 * @module antiCorporateFilter
 */

// Mapping: corporate phrase → SP4 authentic version
const CORPORATE_REPLACEMENTS = {
    // Čas a doba
    "v dnešnej digitálnej dobe": "v tomto rozjebanom online svete",
    "v dnešnej rýchlo sa meniacej digitálnej dobe": "v tomto chaose, kde všetci scrollujú",
    "v modernej dobe": "teraz, keď sme online viac ako offline",
    "v súčasnej digitálnej ére": "dnes, keď algoritmy riadia životy",

    // Hodnota a riešenia
    "poskytujeme hodnotu": "robíme veci, ktoré majú zmysel aj mimo obrazovky",
    "prinášame hodnotu": "tvoríme niečo skutočné, nie len metriky",
    "inovatívne riešenia": "veci, čo naozaj fungujú",
    "poskytujeme riešenia": "pomáhame vyriešiť to, čo ťa trápi",
    "komplexné riešenia": "robíme to tak, aby to malo hlavu a pätu",

    // Komunita a spolupráca
    "ako komunita sa snažíme": "ako kmeň",
    "naša komunita": "náš kmeň",
    "používatelia našej platformy": "ľudia, čo to používajú",
    "zákaznícka skúsenosť": "ako sa pri tom cítiš",
    "user experience": "ako sa ti s tým žije",

    // Ciele a mise
    "naším poslaním je": "chceme",
    "našou víziou je": "ideme k tomu, že",
    "náš hlavný cieľ": "to, čo sa snažíme dosiahnuť",
    "strategické zameranie": "kam ideme",

    // Technológie a procesy
    "optimalizujeme procesy": "zjednodušujeme to, čo je zbytočne zložité",
    "efektívne nástroje": "veci, čo fungujú bez komplikácií",
    "technologické inovácie": "nové technológie, ktoré majú zmysel",
    "digitálna transformácia": "prechod od starého k novému",

    // Hodnoty a prístupy
    "transparentný prístup": "hovoríme pravdu",
    "customer-centric": "robíme to pre ľudí, nie metriky",
    "user-first": "najprv človek, potom tech",
    "hodnoty našej značky": "v čo veríme",

    // Rast a vývoj
    "neustále sa vyvíjame": "učíme sa a meníme sa",
    "kontinuálne zlepšovanie": "robíme to lepšie, ako to bolo včera",
    "udržateľný rast": "rastieme tak, aby to malo zmysel",

    // Buzzwords
    "disruptívny": "mení pravidlá hry",
    "game-changer": "to mení všetko",
    "cutting-edge": "nové a ostré",
    "state-of-the-art": "najlepšie, čo teraz je",
    "best practices": "osvedčené postupy",

    // Extra corporate BS
    "synergický efekt": "keď to spolu dáva zmysel",
    "value proposition": "prečo by ťa to malo zaujímať",
    "stakeholder engagement": "zapájanie ľudí, ktorých sa to týka",
    "key performance indicators": "metriky, čo sledujeme",
    "leverage": "využívame",
    "bandwidth": "čas a energia",
    "circle back": "vrátime sa k tomu",
    "touch base": "dáme si vedieť"
};

// Case-insensitive regex pre detekciu
const CORPORATE_PATTERNS = Object.keys(CORPORATE_REPLACEMENTS).map(phrase => ({
    pattern: new RegExp(phrase, 'gi'),
    replacement: CORPORATE_REPLACEMENTS[phrase]
}));

/**
 * Filtruje corporate bullshit z textu
 * @param {string} text - Text na filtráciu
 * @returns {object} { text: string, wasFiltered: boolean, replacements: number }
 */
export function filterCorporateBullshit(text) {
    if (!text || typeof text !== 'string') {
        return { text, wasFiltered: false, replacements: 0 };
    }

    let filtered = text;
    let replacements = 0;

    // Apply all replacements
    for (const { pattern, replacement } of CORPORATE_PATTERNS) {
        const matches = filtered.match(pattern);
        if (matches) {
            filtered = filtered.replace(pattern, replacement);
            replacements += matches.length;
        }
    }

    return {
        text: filtered,
        wasFiltered: replacements > 0,
        replacements
    };
}

/**
 * Detekuje corporate vibe v texte (pre logging/debug)
 * @param {string} text - Text na analýzu
 * @returns {object} { score: number, detectedPhrases: string[] }
 */
export function detectCorporateVibe(text) {
    if (!text || typeof text !== 'string') {
        return { score: 0, detectedPhrases: [] };
    }

    const detected = [];

    for (const phrase of Object.keys(CORPORATE_REPLACEMENTS)) {
        const regex = new RegExp(phrase, 'gi');
        const matches = text.match(regex);
        if (matches) {
            detected.push(...matches);
        }
    }

    // Score: 0.0 (čisto) → 1.0 (plný corporate)
    const score = Math.min(detected.length / 5, 1.0);

    return {
        score,
        detectedPhrases: detected
    };
}

/**
 * Pridaj SP4 vibe warning ak je text príliš formálny
 * @param {string} text - Text na kontrolu
 * @returns {string} - Text s prípadným warningom
 */
export function ensureSp4Vibe(text) {
    const { score } = detectCorporateVibe(text);

    // Ak je corporate vibe > 0.6, pridaj warning do logu
    if (score > 0.6) {
        console.warn(`⚠️ CORPORATE VIBE ALERT: score ${score.toFixed(2)} (filtered)`);
    }

    const { text: filtered } = filterCorporateBullshit(text);
    return filtered;
}

export default {
    filterCorporateBullshit,
    detectCorporateVibe,
    ensureSp4Vibe
};
