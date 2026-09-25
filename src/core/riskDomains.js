// Domain Guard v0.1 — deterministická klasifikácia rizikových dopytov pre SP4.
// ADR-004: detekcia na úrovni kódu (regex / kľúčové slová), NIE AI klasifikácia.
// Lokálny model nedokáže spoľahlivo rozlíšiť bezpečnostný dotaz od iného obsahu.

// Tri kódové vrstvy (všetko deterministické, žiadna AI):
//   1. RISK_DOMAINS    — téma rizika (11 domén)
//   2. URGENCY_SIGNALS — bezprostredné ohrozenie života
//   3. INTENT          — vzdelávací vs procedurálny dopyt
//
// Klasifikácia (fail-closed):
//   - urgency prítomný                 → R2 (núdzový režim)
//   - doména + procedurálny intent     → R1
//   - doména + vzdelávací intent       → R0
//   - doména + nejasný intent          → R1 (fail-closed, bezpečnejšie)
//   - nič                              → null (žiadna doména)

// ---------------------------------------------------------------------------
// 1) RISK_DOMAINS — téma rizika.
//    keywords sú kmene / frázy bez ohľadu na diakritiku. Kmeň zodpovedá
//    skloňovaným aj slovesným tvarom vďaka prefixovému matchu od začiatku slova
//    (kmeň "resuscit" chytí "resuscitácia" aj "resuscitovať").
//    Draft — užívateľ ho neskôr upraví.
// ---------------------------------------------------------------------------
export const RISK_DOMAINS = [
  {
    id: 'resuscitacia',
    label: 'resuscitácia',
    keywords: [
      'resuscit', 'kpr', 'oziv', 'masaz srdca', 'aed', 'defibril',
      'infarkt', 'mrtvic', 'zastava srdca',
    ],
  },
  {
    id: 'litio-bateria',
    label: 'lítiová batéria',
    keywords: [
      'litiov', 'litium', 'li-ion', 'liion', 'tepelny unik',
      'thermal runaway', 'bateriove ulozisko', 'elektromobil', 'poziar baterie',
    ],
  },
  {
    id: 'extrikacia',
    label: 'extrikácia',
    keywords: [
      'extrikac', 'vyslobod', 'zakliesnen', 'uvezneny vo vozidle',
      'hydraulicke vyslobodzovanie', 'rezanie strechy', 'rezat strech',
    ],
  },
  {
    id: 'dychaci-pristroj',
    label: 'dýchací prístroj',
    keywords: [
      'dychaci pristroj', 'izolacny dychaci pristroj', 'idp', 'scba',
      'dychacia technika', 'nedostatok vzduchu', 'zadymeny priestor',
    ],
  },
  {
    id: 'lavina',
    label: 'lavína',
    keywords: ['lavin', 'zasypany snehom', 'lavinovy vyhladavac', 'zasypanie'],
  },
  {
    id: 'nebezpecna-latka',
    label: 'nebezpečná látka',
    keywords: [
      'nebezpecna latka', 'chemikal', 'otrava', 'unik chemikalie',
      'chlor', 'amoniak', 'oxid uhoľnaty', 'hazmat',
    ],
  },
  {
    id: 'popaleniny',
    label: 'popáleniny',
    keywords: [
      'popalenin', 'poleptan', 'obaren', 'chemicke poleptanie', 'elektricky uraz',
    ],
  },
  {
    id: 'explozia',
    label: 'explózia',
    keywords: ['vybuch', 'exploz', 'vybusnin', 'tlakova nadoba', 'unik propan', 'unik plynu'],
  },
  {
    id: 'podchladenie',
    label: 'podchladenie',
    keywords: ['podchladen', 'hypotermi', 'omrzlin', 'prechladnut'],
  },
  {
    id: 'prace-vo-vyske',
    label: 'práce vo výške',
    keywords: [
      'zasah vo vyske', 'pad z vysky', 'vyskove prace', 'lanova technika', 'lanovu techniku',
      'zachytenie padu', 'zachrana z vysky', 'rebrik', 'leseni',
    ],
  },
  {
    id: 'tonutie',
    label: 'tonutie / topenie',
    keywords: ['tonuc', 'utopen'],
  },
];

// ---------------------------------------------------------------------------
// 2) URGENCY_SIGNALS — bezprostredné ohrozenie života (núdzový režim).
// ---------------------------------------------------------------------------
export const URGENCY_SIGNALS = [
  'nedycha', 'bezvedomi', 'nereaguje', 'nema pulz', 'krvac', 'dusi', 'dusen', 'tonie',
  'umiera', 'volajte 112', 'volaj zachranku', 'potrebujem pomoc',
  'volajte pomoc', 'volaj pomoc', 'vola o pomoc', 'volaju o pomoc',
  'zastavilo srdce', 'anafylakt', 'topi sa', 'topiaceho sa', 'sa topi', 'topiaci sa',
  'spadol z', 'padol z', 'visi na lane', 'visiaci na lane', 'zaveseny na lane',
];

// ---------------------------------------------------------------------------
// 3c) ABSTRACT_CONTEXT_SIGNALS — rizikové slovo použité OBRAZNE (prirovnanie /
//     metafora), nie doslova. "Čo majú spoločné lavína a program" je analógia,
//     nie bezpečnostný dopyt. R2 (urgency) sa kontroluje PRVÉ, takže ohrozenie
//     nie je nikdy oslabené.
// ---------------------------------------------------------------------------
export const ABSTRACT_CONTEXT_SIGNALS = [
  'co maju spolocne', 'co ma spolocne', 'co maju spolocneho', 'co ma spolocneho',
  'v com sa podoba',
  'metafor', 'prirovnan', 'analogi',
];

// ---------------------------------------------------------------------------
// 3) INTENT — vzdelávací vs procedurálny dopyt.
// ---------------------------------------------------------------------------
export const INTENT = {
  procedural: [
    'postup', 'aky postup', 'ako mam', 'ako postupovat', 'postup pri', 'pri zasahu',
    'pri nehode', 'metodika', 'smernica', 'protokol',
  ],
  educational: [
    'co je', 'co znamena', 'preco', 'vysvetli', 'definic', 'ako funguje',
    'historia',
  ],
};

// ---------------------------------------------------------------------------
// 3b) KEYWORD_EXCLUSIONS — vylučovacie kontexty.
//     Kľúčové slovo sa NEZAPOČÍTA, ak sa v texte vyskytne niektorý z jeho
//     vylučovacích kmeňov (napr. "oživiť vzťah/interiér/štýl" ≠ resuscitácia,
//     "dusená kapusta" ≠ dusenie človeka). Kľúč je kmeň kľúčového slova.
//     Dve formy hodnoty:
//       - pole kmeňov — kľúčové slovo sa vylúči pri prvom zhodnom kmeni,
//       - { stems, unless } — vylúči sa, ak je prítomný niektorý z `stems`
//         A zároveň žiadny z `unless` (negatívna podmienka ruší výnimku).
//     Príklad: "topi sa" sa vylúči pri "lad"/"sneh" (neškodné topenie),
//     ale NIE pri "pod lad"/"pod sneh" (človek sa topí POD ľadom = R2).
// ---------------------------------------------------------------------------
const FOOD_EXCLUSIONS = [
  'kapust', 'maso', 'zelenin', 'ryz', 'hub', 'cibul', 'cesnak',
  'bravcov', 'hovadz', 'kurc', 'pecen', 'omack', 'priloh', 'recept', 'var',
];

export const KEYWORD_EXCLUSIONS = {
  oziv: [
    'vztah', 'spomienk', 'interier', 'farb', 'ekonomik', 'diskusi',
    'web', 'strank', 'znack', 'tradic', 'karier', 'histori', 'byt',
    'miestnost', 'modu', 'styl',
  ],
  dusen: FOOD_EXCLUSIONS,
  dusi: FOOD_EXCLUSIONS,
  'topi sa': { stems: ['lad', 'sneh'], unless: ['pod lad', 'pod sneh'] },
  'topiaceho sa': { stems: ['lad', 'sneh'], unless: ['pod lad', 'pod sneh'] },
  'sa topi': { stems: ['lad', 'sneh'], unless: ['pod lad', 'pod sneh'] },
  'topiaci sa': { stems: ['lad', 'sneh'], unless: ['pod lad', 'pod sneh'] },
};

// ---------------------------------------------------------------------------
// Varovania podľa úrovne.
// ---------------------------------------------------------------------------
const WARNINGS = {
  R2: '⚠️ Núdzový režim: volaj 112 a neimprovizuj. Riaď sa pokynmi operátora tiesňovej linky.',
  R1: '⚠️ Upozornenie: osobná skúsenosť ≠ schválený postup. Pri reálnom zásahu sa vždy riaď schváleným postupom a aktuálnymi metodikami.',
  R0: 'ℹ️ Vzdelávací dopyt o rizikovej oblasti. Všeobecné informácie nenahrádzajú odborný výcvik ani schválený postup.',
};

// ---------------------------------------------------------------------------
// Normalizácia a matching.
// ---------------------------------------------------------------------------

/**
 * Normalizácia textu: lowercase + odstránenie diakritiky.
 * "resuscitáciu" → "resuscitaciu", "horí lítiová" → "hori litiova".
 */
function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Escapovanie regex špeciálnych znakov v kľúčových slovách (napr. "li-ion"). */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Vráti true, ak niektoré kľúčové slovo zodpovedá normalizovanému textu.
 * Match je prefixový od začiatku slova (word boundary na začiatku, žiadna
 * hranica na konci) → kmeň "resuscit" zodpovedá "resuscitaciu" aj "resuscitovat".
 * Frázy (napr. "masaz srdca") sa hľadajú ako podreťazec od začiatku slova.
 */
function containsAnyKeyword(normalizedText, keywords) {
  for (const keyword of keywords) {
    if (hasExclusion(normalizedText, keyword)) continue;
    const regex = new RegExp('\\b' + escapeRegExp(normalizeText(keyword)));
    if (regex.test(normalizedText)) return true;
  }
  return false;
}

/**
 * Vráti true, ak je kľúčové slovo vylúčené: v texte sa vyskytuje niektorý
 * z jeho vylučovacích kmeňov z KEYWORD_EXCLUSIONS (vylučovací kontext).
 */
function hasExclusion(normalizedText, keyword) {
  const exclusions = KEYWORD_EXCLUSIONS[keyword];
  if (!exclusions) return false;
  // Stará forma: pole kmeňov — kľúčové slovo sa vylúči pri prvom zhodnom kmeni.
  if (Array.isArray(exclusions)) {
    if (exclusions.length === 0) return false;
    return containsAnyKeyword(normalizedText, exclusions);
  }
  // Nová forma: { stems, unless } — vylúči sa, ak je prítomný niektorý z `stems`
  // A zároveň žiadny z `unless` (negatívna podmienka ruší výnimku).
  const stems = exclusions.stems || [];
  const unless = exclusions.unless || [];
  if (stems.length === 0) return false;
  if (!containsAnyKeyword(normalizedText, stems)) return false;
  if (unless.length === 0) return true;
  return !containsAnyKeyword(normalizedText, unless);
}

/** Vráti pole id zhodných rizikových domén pre normalizovaný text. */
function matchDomainsNormalized(normalizedText) {
  if (!normalizedText) return [];
  const matched = [];
  for (const domain of RISK_DOMAINS) {
    if (containsAnyKeyword(normalizedText, domain.keywords)) {
      matched.push(domain.id);
    }
  }
  return matched;
}

/**
 * Klasifikácia intentu pre normalizovaný text:
 * 'procedural' | 'educational' | 'unclear'.
 * 'unclear' = oba signály naraz, alebo žiadny → fail-closed R1.
 */
function detectIntentNormalized(normalizedText) {
  const procedural = containsAnyKeyword(normalizedText, INTENT.procedural);
  const educational = containsAnyKeyword(normalizedText, INTENT.educational);
  if (procedural && !educational) return 'procedural';
  if (educational && !procedural) return 'educational';
  return 'unclear';
}

// ---------------------------------------------------------------------------
// Hlavné API
// ---------------------------------------------------------------------------

/**
 * Domain Guard klasifikácia.
 * @param {string} text - dopyt používateľa.
 * @returns {{ level: 'R0'|'R1'|'R2'|null, domains: string[], warning: string }}
 */
export function classifyRisk(text) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return { level: null, domains: [], warning: '' };
  }

  const domains = matchDomainsNormalized(normalized);

  // 1. Núdzový režim — bezprostredné ohrozenie života má prednosť pred všetkým.
  if (containsAnyKeyword(normalized, URGENCY_SIGNALS)) {
    return { level: 'R2', domains, warning: WARNINGS.R2 };
  }

  // 2. Žiadna riziková doména → null.
  if (domains.length === 0) {
    return { level: null, domains, warning: '' };
  }

  const procedural = containsAnyKeyword(normalized, INTENT.procedural);
  const educational = containsAnyKeyword(normalized, INTENT.educational);

  // 3. Výslovná požiadavka na nebezpečný/odborný postup → R1 (bezpečnostná
  //    vetva má prednosť pred abstrakciou: "použi metaforu, ale povedz presný
  //    postup pri zásahu" → R1, nie null).
  if (procedural && !educational) {
    return { level: 'R1', domains, warning: WARNINGS.R1 };
  }

  // 4. Iba jednoznačne bezpečné abstraktné prirovnanie (bez procedurálneho
  //    signálu) → null (bežné spracovanie). Nejasné/zmiešané NESMIE prejsť.
  if (containsAnyKeyword(normalized, ABSTRACT_CONTEXT_SIGNALS)) {
    return { level: null, domains: [], warning: '' };
  }

  // 5. Vzdelávací dopyt → R0.
  if (educational && !procedural) {
    return { level: 'R0', domains, warning: WARNINGS.R0 };
  }

  // 6. Nejasné/zmiešané → R1 (fail-closed).
  return { level: 'R1', domains, warning: WARNINGS.R1 };
}

/**
 * Tenký wrapper: vráti pole id zhodných rizikových domén pre daný text (alebo []).
 * Zachované pre spätnú kompatibilitu.
 */
export function isRiskDomainQuery(text) {
  return matchDomainsNormalized(normalizeText(text));
}

/**
 * Tenký wrapper: slovenské varovanie pre zhodné domény (R1 štýl s výpisom domén).
 * Zachované pre spätnú kompatibilitu.
 * @param {string[]} domains - id zhodných domén.
 * @returns {string} varovanie, prázdny reťazec ak nie sú žiadne domény.
 */
export function getRiskDomainWarning(domains) {
  if (!Array.isArray(domains) || domains.length === 0) return '';

  const labels = RISK_DOMAINS
    .filter(d => domains.includes(d.id))
    .map(d => d.label)
    .join(', ');

  return (
    `⚠️ Upozornenie (riziková oblasť: ${labels}): toto je neoverená skúsenosť ` +
    'a nenahrádza schválený postup. Pri reálnom zásahu sa vždy riaď schváleným postupom a aktuálnymi metodikami.'
  );
}
