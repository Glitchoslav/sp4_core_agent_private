// SP4 OS MODULE: languageUtils
// Shared language detection helpers (Slovak vs English)

const SLOVAK_STOPWORDS = [
    'a', 'ale', 'aj', 'že', 'som', 'si', 'sme', 'ste', 'oni', 'ono', 'ona', 'on',
    'ja', 'ty', 'my', 'vy', 'sa', 'nie', 'nič', 'žiadny', 'prečo', 'kde', 'kedy',
    'ktorý', 'ktorá', 'ktoré', 'ktorí', 'ten', 'tento', 'táto', 'toto', 'tam',
    'tu', 'už', 'ešte', 'veľmi', 'málo', 'veľa', 'možno', 'asi', 'ako', 'čo',
    'lebo', 'preto', 'aby', 'keď', 'keby', 'ak', 'iba', 'len', 'teda', 'potom',
    'všetko', 'všetci', 'nikto', 'nikdy', 'teraz', 'dnes', 'včera', 'zajtra',
    'bude', 'bol', 'bola', 'bolo', 'boli', 'budem', 'budeš', 'budeme', 'budete',
    'mám', 'máš', 'má', 'máme', 'máte', 'majú', 'mal', 'mala', 'mali', 'musím',
    'musíš', 'musí', 'musíme', 'musíte', 'musia', 'chcem', 'chceš', 'chce',
    'chceme', 'chcete', 'chcú', 'môžem', 'môžeš', 'môže', 'môžeme', 'môžete',
    'môžu', 'do', 'na', 'pod', 'nad', 'pri', 's', 'z', 'za', 'bez', 'okolo',
    'cez', 'po', 'od', 'ku', 'pre', 'o', 'u', 'v', 'niečo', 'niekto', 'nejaký'
];

// SP4 canonical technical terms used natively in SK context — never count as EN.
// Includes: SP4-specific architecture terms + tech loanwords without SK diacritics.
const SP4_CANONICAL_TERMS = new Set([
    'offline', 'offlinefirst', 'online', 'routing', 'runtime', 'agent', 'agents',
    'model', 'models', 'persona', 'personas', 'prompt', 'prompts', 'token', 'tokens',
    'layer', 'layers', 'pipeline', 'stack', 'plugin', 'plugins', 'trigger', 'triggers',
    'backup', 'backups', 'core', 'output', 'input', 'context', 'handler', 'hook',
    'import', 'export', 'build', 'module', 'modules', 'endpoint', 'server',
    'projekt', 'system', 'data', 'log', 'logs', 'debug',
]);

// Common Slovak content words that lack diacritics — prevent false EN classification.
const SK_NEUTRAL_WORDS = new Set([
    'smer', 'smeru', 'smere', 'slobodu', 'sloboda', 'slobode', 'slobodne',
    'kontrolou', 'kontrola', 'kontrolu', 'kontrole',
    'tvojou', 'tvojim', 'tvoje', 'tvoj', 'tvojho',
    'viac', 'viacej', 'menej',
    'robim', 'robis', 'robi', 'robime', 'robite', 'robia',
    'chod', 'chodit', 'chodis', 'chodim',
    'vediet', 'treba', 'mozes', 'mozem', 'moze',
    'vlastnom', 'vlastnou', 'vlastny', 'vlastne', 'vlastnych',
    'systemu', 'systeme', 'systemom',
    'celom', 'celou', 'celemu',
    'miesto', 'mieste', 'miestu',
    'spolu', 'dokopy', 'naozaj',
    'human', 'clovek', 'cloveka', 'cloveku', 'clovekom',
    'kroku', 'krokoch', 'krokom',
    'cestu', 'ceste', 'cestou',
    'zivot', 'zivota', 'zivotu', 'zivotom',
    'moznost', 'moznosti', 'moznostou',
    'priamy', 'prime', 'priame',
    'lokalne', 'lokal', 'lokalny',
    // SP4-audit-008: teologická, prírodná a gramatická skupina — bez diakritiky, ale plnohodnotná SK slová
    'nebo', 'nebe', 'nebom', 'nebu',
    'boh', 'boha', 'bohu', 'bohom', 'bozi', 'bozie',
    'viera', 'vieru', 'viery', 'viere',
    'zem', 'zeme', 'zemi', 'zemou',
    'raj', 'raja', 'raju', 'rajom',
    'oblak', 'oblaku', 'oblakov', 'oblaky', 'oblakmi',
    'slnko', 'slnka', 'slnku', 'slnkom',
    'hviezda', 'hviezdy', 'hviezdou',
    // gramatické pádové tvary "ktorý" bez diakritiky
    'ktorom', 'ktorou', 'ktorych', 'ktoreho', 'ktori', 'ktore',
    // byť / bývať bez diakritiky
    'byva', 'byvat', 'byvam', 'byvate', 'byvaju', 'byvalo',
    // ďalšie bežné SK slová bez diakritiky
    'svet', 'sveta', 'svetu', 'svetom',
    'zivotom', 'priroda', 'prirody', 'prirodou',
    'ludia', 'ludi', 'ludmi', 'ludom',
    'ducha', 'duchu', 'duchom',
    'modlit', 'modlitba', 'modlitbu',
    'vieru', 'viera',
]);

// Pozitívny EN signál: len slová, ktoré sú reálne anglické (funkčné slová + bežná EN slovná
// zásoba LLM výstupov). Chýbajúca diakritika NIE je EN signál — slovenčina má veľa slov bez
// diakritiky (myslenia, pochopenie, jeho, zameriava) a prevzaté slová (boss, meta-awareness).
// Vynechané sú tvary zhodné so slovenčinou (a, to, on, do, no, by, my, ten, tie, most, list, let)
// a 'be' (motto "Be real. Be free." v SK texte).
const ENGLISH_WORDS = new Set([
    // funkčné slová
    'the', 'an', 'and', 'or', 'but', 'of', 'in', 'at', 'for', 'with', 'from', 'into', 'onto',
    'about', 'over', 'under', 'between', 'through', 'during', 'without', 'within', 'against',
    'is', 'are', 'was', 'were', 'been', 'being', 'has', 'have', 'had', 'having',
    'does', 'did', 'doing', 'done', 'will', 'would', 'shall', 'should', 'can', 'could', 'may',
    'might', 'must', 'not', 'isnt', 'arent', 'dont', 'doesnt', 'didnt', 'cant', 'wont',
    'this', 'that', 'these', 'those', 'there', 'here', 'where', 'when', 'what', 'which', 'who',
    'whom', 'whose', 'why', 'how', 'it', 'its', 'he', 'she', 'we', 'you', 'your', 'yours',
    'they', 'them', 'their', 'theirs', 'his', 'her', 'hers', 'our', 'ours', 'me', 'him', 'us',
    'if', 'then', 'than', 'so', 'as', 'because', 'while', 'although', 'though', 'however',
    'therefore', 'also', 'just', 'only', 'very', 'really', 'more', 'less', 'many',
    'much', 'some', 'any', 'each', 'every', 'all', 'both', 'either', 'neither', 'other',
    'such', 'own', 'same', 'up', 'out', 'off', 'again', 'still', 'yet', 'already', 'always',
    'never', 'often', 'sometimes', 'usually', 'like', 'unlike', 'whether', 'until', 'since',
    // bežná EN slovná zásoba (bez tvarov zhodných so slovenčinou)
    'clearly', 'several', 'english', 'response', 'answer', 'question', 'questions', 'words',
    'word', 'final', 'founder', 'created', 'create', 'help', 'helps', 'think', 'thinking',
    'know', 'knowledge', 'understand', 'understanding', 'important', 'focus', 'focuses',
    'deeper', 'deep', 'philosophical', 'eastern', 'digital', 'control',
    'something', 'anything', 'everything', 'nothing', 'someone', 'please', 'thanks',
    'thank', 'sorry', 'yes', 'hello', 'world', 'way', 'ways', 'thing', 'things', 'make',
    'makes', 'made', 'use', 'uses', 'used', 'using', 'want', 'need', 'needs', 'good', 'great',
    'best', 'better', 'new', 'first', 'last', 'next', 'time',
]);

// Krátke SK funkčné slová (≤3 znaky by inak padli do skipu skratiek). Bez tvarov
// zhodných s angličtinou (a, to, on, do, no, by, so, me, my).
const SLOVAK_SHORT_WORDS = new Set([
    'je', 'sa', 'si', 'sme', 'ste', 'na', 'aj', 'ako', 'ale', 'ani', 'už', 'že', 'či',
    'ich', 'ho', 'mu', 'ju', 'ma', 'mi', 'ti', 'sú', 'pre', 'pri', 'od', 'po', 'za',
    'zo', 'ku', 'bez', 'len', 'iba', 'čo', 'kde', 'kto', 'tak', 'tu', 'ten', 'tie',
    'ta', 'ty', 'vy', 'oni', 'bol', 'mám', 'máš', 'má', 'nie', 'áno', 'v', 'z', 's', 'k', 'o', 'u',
]);

export function detectEnglish(text) {
    if (!text) {
        return { ratio: 0, totalWords: 0, englishWords: 0, slovakHits: 0 };
    }

    const tokens = text
        .toLowerCase()
        .split(/\s+/)
        .map(t => t.replace(/[^a-záäčďéíľĺňóôŕšťúýž0-9]/gi, ''))
        .filter(Boolean);

    let totalWords = 0;
    let englishWords = 0;
    let slovakWords = 0;
    let slovakHits = 0;

    for (const token of tokens) {
        // krátke EN funkčné slová (the, is, of, ...) sú silný signál — počítaj ich pred skipom.
        // SP4 kanonické termíny a SK neutrálne slová nie sú EN nikdy (poistka proti prekryvu).
        if (ENGLISH_WORDS.has(token) && !SP4_CANONICAL_TERMS.has(token) && !SK_NEUTRAL_WORDS.has(token)) {
            totalWords++;
            englishWords++;
            continue;
        }

        // krátke SK funkčné slová (je, sa, na, ...) sú SK signál
        if (SLOVAK_SHORT_WORDS.has(token)) {
            totalWords++;
            slovakWords++;
            continue;
        }

        // ignoruj krátke skratky typu SP4, AI, LLM
        if (/^[a-z0-9]{1,3}$/i.test(token)) continue;

        totalWords++;

        if (SLOVAK_STOPWORDS.includes(token)) slovakHits++;

        if (/[áäčďéíľĺňóôŕšťúýž]/.test(token) || SLOVAK_STOPWORDS.includes(token) || SK_NEUTRAL_WORDS.has(token)) {
            slovakWords++;
        }
        // Ostatné slová (boss, glitchoslav, meta-awareness, response, ...) sú neutrálne:
        // chýbajúca diakritika ešte neznamená anglicky a do pomeru sa nerátajú.
    }

    // EN pomer = EN signály voči všetkým jazykovým signálom (EN + SK). Delenie celkovým počtom
    // slov by anglický text s bohatou slovnou zásobou (mimo ENGLISH_WORDS) podhodnotilo.
    const signals = englishWords + slovakWords;
    const ratio = signals > 0 ? englishWords / signals : 0;

    return { ratio, totalWords, englishWords, slovakHits };
}

export default {
    detectEnglish
};

// TODO [COPILOT]:
// Pridaj helper normalizeWeirdWords(text), ktorý opraví najčastejšie
// divné alebo halucinované výrazy zo slovenských prekladov.
//
// - corporationálna -> korporátna
// - pravá bludu -> čistý bullshit (alebo "čistá hlúposť" ak chceš jemnejšie)
// - offline režime AI -> v offline režime ako AI parťák
// - offline-first AI partner -> lokálny AI parťák v offline režime
// - pĺuje -> napr. "ženie" alebo "posúva"
// - kmeňovo prízrenie -> niečo zmysluplné, napr. "kmeňové túžby"
//
// Funkcia má:
// - prijať string,
// - reťazovo urobiť .replace(...) podľa vyššie uvedených príkladov,
// - vrátiť upravený string.
//
// Exportuj ju (named export), aby ju vedel použiť integration.js.

export function normalizeWeirdWords(text) {
    if (!text) return text;
    let out = String(text);

    out = out.replace(/corporationálna/gi, 'korporátna');
    out = out.replace(/pravá bludu/gi, 'čistý bullshit');
    out = out.replace(/offline režime AI/gi, 'v offline režime ako AI parťák');
    out = out.replace(/offline režim AI/gi, 'v offline režime ako AI parťák');
    out = out.replace(/offline-first AI partner/gi, 'lokálny AI parťák v offline režime');
    out = out.replace(/pĺuje/gi, 'ženie');
    out = out.replace(/kmeňovo prízrenie/gi, 'kmeňové túžby');
    out = out.replace(/kultúru projektu/gi, 'kultúrny projekt');
    out = out.replace(/falešnej optimizmu/gi, 'falošného optimizmu');

    // ďalšie časté chyby z auditov
    out = out.replace(/\bkmen\b/gi, 'kmeň');
    out = out.replace(/\bkterý\b/gi, 'ktorý');
    out = out.replace(/korporátní/gi, 'korporátnu');
    out = out.replace(/pravý bullshit/gi, 'čistý bullshit');
    out = out.replace(/\bfalešnej\b/gi, 'falošnej');
    out = out.replace(/\boptimizmu\b/gi, 'optimizmu');
    out = out.replace(/AI sil/gi, 'AI systémov');
    out = out.replace(/nepravidelnosť pôsobí rodinné žiadosti/gi, 'chaos budí kmeňové túžby');
    out = out.replace(/chybné svetlo/gi, 'záblesk svetla');
    out = out.replace(/sa zvedie/gi, 'zdvihne sa');
    out = out.replace(/krmení/gi, 'kŕmení');
    out = out.replace(/offline režim AI/gi, 'AI v offline režime');
    out = out.replace(/divné a slobodné/gi, 'divoké a slobodné');

    // nové pravidlá z najnovšieho auditu
    out = out.replace(/Takáto reč nepoznáme, preto sme sa snažili objasniť, čo to je\./g, 'Ta hej, ten jazyk je svojský, ale patrí k SP4 vibe.');
    out = out.replace(/Text zdá sa skladať/g, 'Text sa zdá skladať');
    out = out.replace(/Toto text/g, 'Tento text');
    out = out.replace(/Ty sa páčiš tykanie!/g, 'Vidím, že chceš tykať, a to je v poriadku.');
    out = out.replace(/je to možné, že mává k projektu/g, 'je možné, že súvisí s projektom');
    out = out.replace(/mixom slovenského a anglického jazyka/g, 'mixom slovenčiny a angličtiny');

    out = out.replace(/Vo kríde reči/gi, 'V krajine slov');
    out = out.replace(/chcúce kmene/gi, 'túžiace kmene');
    out = out.replace(/skratka svetla/gi, 'záblesk svetla');
    out = out.replace(/instead of prenášanie korporátnej AI silových systém/gi, 'namiesto odovzdávania moci korporátnym AI systémom');
    out = out.replace(/môže vést/gi, 'môže viesť');
    out = out.replace(/offline-first partner/gi, 'lokálny AI parťák v offline režime');
    out = out.replace(/streseje/gi, 'sa trasie');
    out = out.replace(/falošnej optimismy/gi, 'falošného optimizmu');
    out = out.replace(/silových systém/gi, 'mocenským AI systémom');
    out = out.replace(/kultúrne projekt/g, 'kultúrny projekt');
    out = out.replace(/ľudia vlastní/g, 'ľudia vlastnia');
    out = out.replace(/Čo s tým\? Cítim sa stratený\./g, 'Cítiš sa stratený.');
    out = out.replace(/má tvoje zálohy/gi, 'drží ti chrbát');
    out = out.replace(/vlasť/gi, 'vlastné ja');
    out = out.replace(/ztracený/gi, 'stratený');

    // FIX PACK v3 – ďalšie jazykové opravy
    out = out.replace(/splývá/gi, 'splýva');
    out = out.replace(/\bcíťte sa\b/gi, 'cíť sa');
    out = out.replace(/\bvášho\b/gi, 'tvojho');
    out = out.replace(/\bváš\b/gi, 'tvoj');
    out = out.replace(/\bk korporátnej\b/gi, 'ku korporátnej');

    // nové pravidlá fix pack v2
    out = out.replace(/povediem/gi, 'poviem');
    out = out.replace(/Môjmi slovnami/gi, 'Mojimi slovami');
    out = out.replace(/nejsi/gi, 'nie si');

    // generické pravidlo na duplikované slová: "partnera partner" → "partner"
    out = out.replace(/\b(\w+)\s+\1\b/gi, '$1');

    // špeciálne pre často sa opakujúci výraz
    out = out.replace(/AI partnera partner/gi, 'AI parťák');

    // konkrétny nezmysel z auditov
    out = out.replace(/všetkému týždennému a korporátnemu šikanovaniu/gi,
        'tomu korporátnemu šikanovaniu a sledovaniu');

    return out;
}

// 🔥 FIX 2: GLITCH NORMALIZER – mikro-vrstva na glitch-čechizmy
// Nie nový LLM, nie nový prompt, len deterministický filter
export function glitchNormalize(text) {
    if (!text) return text;
    let out = String(text);

    // glitch-čechizmy z live testov
    out = out.replace(/\bsmysl/gi, 'zmysel');
    out = out.replace(/navrhoen(e|ý)/gi, 'navrhnut$1');
    out = out.replace(/svetlovač(i|í)/gi, 'svetlo');
    out = out.replace(/kolkov(a|á)/gi, 'chaotick$1');
    out = out.replace(/\bmajš\b/gi, 'máš');
    out = out.replace(/štiepení/gi, 'štiepeniu');
    out = out.replace(/dácia niekoho/gi, 'nikto ťa');
    out = out.replace(/tímovému AI/gi, 'tímovým AI');
    out = out.replace(/navrhoené/gi, 'navrhnuté');

    return out;
}
