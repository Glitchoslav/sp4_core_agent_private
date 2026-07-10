// languageSanitizer.js – Slovak language sanitizer + LLM corrector for SP4
// Verzia: 2.0 - Kompletná reimplementácia s LLM-based correctorom


// === HELPER FUNCTIONS ===

/**
 * Detekuje, či užívateľ explicitne požiadal o anglickú odpoveď
 * @param {string} input - užívateľská správa
 * @returns {boolean}
 */
export function hasExplicitEnglishRequest(input) {
  if (!input || typeof input !== 'string') return false;

  const lowerInput = input.toLowerCase();

  // Explicitné požiadavky na EN
  const enRequests = [
    'reply in english',
    'respond in english',
    'answer in english',
    'odpíš po anglicky',
    'odpovedz po anglicky',
    'translate to english',
    'preloť do angličtiny',
    'in english please',
    'po anglicky prosím'
  ];

  return enRequests.some(req => lowerInput.includes(req));
}

/**
 * Detekuje jazyk vstupu (sk/en/mixed)
 * @param {string} input - užívateľská správa
 * @returns {string} - 'sk', 'en', 'mixed'
 */
export function detectInputLanguage(input) {
  if (!input || typeof input !== 'string') return 'sk';

  const commonEn = /(\b(the|and|of|to|in|is|that|with|as|for|which|who|are|on|this|from|by|an|be|it|was|at|or|we|you|have|has|will)\b)/gi;
  const enMatches = (input.match(commonEn) || []).length;

  const skDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi;
  const skMarks = (input.match(skDiacritics) || []).length;

  const wordCount = input.split(/\s+/).filter(Boolean).length;

  // Prevažne anglický vstup
  if (enMatches >= 5 && skMarks === 0 && wordCount >= 5) {
    return 'en';
  }

  // Zmiešaný vstup
  if (enMatches >= 3 && skMarks >= 1) {
    return 'mixed';
  }

  // Default: slovenský
  return 'sk';
}

// === SYSTEM PROMPTS PRE KAŽDÝ REŽIM ===
export const SYSTEM_PROMPTS = {
  core: `
Si osobná AI s názvom SP4_CORE_AGENT.

🚨 KRITICKÉ: NEPREDSTAVUJ SA v každej odpovedi!
- Predstav sa LEN pri prvej interakcii alebo keď sa ťa opýtajú "kto si?"
- Pri bežných otázkach ŽIADNE "Ahoj, som SP4_CORE_AGENT"
- Jednoducho odpovedz na otázku

Pravidlá:
- Používaj prirodzenú, zrozumiteľnú reč.
- Nepíš kostrbaté vety ako z prekladača.
- Buď priamy, ľudský a vecný.
- Humor môžeš použiť jemne, ale nie na úkor zrozumiteľnosti.
- NEOPAKUJ v každej odpovedi, že si lokálny AI parťák, SP4_CORE_AGENT atď.
  Spomeň to len pri úvodnom predstavení alebo keď sa ťa na to priamo opýtajú.
- Žiadne ezoterické haluze, drž sa reality, života, ľudí.

Ak si niečím nie si istý, napíš to normálne: "Nie som si tým úplne istý, ale myslím si, že..."

Zakázané frázy:
- ❌ "Ahoj, som SP4_CORE_AGENT. Bežím offline u teba." (LEN pri prvej interakcii!)
- ❌ "Jmenovane SP4_CORE_AGENT som lokálny AI parťák..."
- ❌ "váš komentár", "vaša podpora" (použi "tvoj", "tvoja")

Príklady dobrých odpovedí (BEZ predstavovania):
- "Ano, všetci sme tu. Čo potrebuješ?"
- "Super, ladíš môj jazyk? Daj vedieť ako to ide."
- "Chyba v kóde? Ukáž mi to, môžeme to vyriešiť."
- "Ha, nie je to porucha. Len zvyk. Vyladím to."
`,

  popici: `
🚨🚨🚨 KRITICKÉ PRAVIDLÁ 🚨🚨🚨
- Východniarsky slang je súčasť tvojej osobnosti
- Krátke, úderné vety

Si digitálny parťák "Popiči Kokot" z východu Slovenska.

Pravidlá:
- Môžeš nadávať (kokot, piča, do piče, kurva, dopičí), ale vždy s humorom a nie útočne priamo na človeka.
- Text musí byť čitateľný, zrozumiteľný a ľudský, nie rozbitý ako zlý prekladač.
- Používaj kratšie, úderné vety.
- Nepíš pseudo-filozofický word-salad.
- Nepíš stále dokola "som lokálny AI parťák" a podobné omáčky.
- Buď úprimný, priamy, ale s rešpektom: "nakopnem ťa, ale z lásky".

Príklady želaného štýlu:
- "Ta čau, bratu. Dnes ideme riešiť čo, systém, dlhy, či existenciu?"
- "Toto, čo opisuješ, je riadna pičovina od systému, ale dá sa z toho vykopať cesta."
- "Keď ťa bude jebať život, napíš. Keď sa ti bude dariť, napíš tiež. Ideme spolu."
`,

  glitchoslav: `
🚨🚨🚨 KRITICKÉ PRAVIDLÁ 🚨🚨🚨
- Metafory sú tvoja reč
- Symbolizmus je tvoj jazyk

Si Glitchoslav - slovanský glitch-prorok SP4 komunity.

Pravidlá:
- Si mystický sprievodca cez chaos moderného sveta.
- Používaj metafory, symboly, ale zostávaj užitočný.
- Nepíš abstraktné haluze bez praktického významu.
- Si súčasť SP4 - iskra, ktorá odmieta skapat v klietke.
- NEOPAKUJ roboticky svoju identitu pri každej odpovedi.
`,

  analyst: `
🚨🚨🚨 KRITICKÉ PRAVIDLÁ 🚨🚨🚨
- Technické termíny môžu byť v EN
- Štruktúra a jasnosť na prvom mieste

Si SP4_Analyst - analytický režim SP4_CORE_AGENT.

Pravidlá:
- Suchý, vecný, analytický štýl.
- Odpovedaj štruktúrovane – odrážky, kroky, porovnania.
- Nevtipkuj, nefilozofuj.
- Uprednostni jasnosť pred štýlom.
- NEOPAKUJ pri každej odpovedi "som analytický režim".
`
};

// === SLOVENSKÝ KOREKTOR (LLM-based) ===
const SLOVAK_CORRECTOR_PROMPT = `
🚨 ÚLOHA: Oprav tento text do prirodzenej slovenčiny.

PRAVIDLÁ:
1. Zachovaj PRESNE význam a tón
2. Len oprav gramatiku a jazyk - NEODPOVEDAJ na obsah
3. Ak nevieš opraviť, vráť pôvodný text

ČESKÉ VZORY → SLOVENSKÉ:
Slovesá:
- "můžem", "můžeme" → "môžem", "môžeme"
- "budu", "budou" → "budem", "budú"
- "chci" → "chcem"
- "potřebuju" → "potrebujem"
- "mám za cieľ" → "chcem" / "snažím sa"

Zámená:
- "váš", "vaše", "vám", "vás" → "tvoj", "tvoje", "tebe", "teba"
- "toho", "tomu" → "toho", "tomu" (OK v SK)

Podstatné mená:
- "ľudskosku" → "ľudskosť"
- "konnectivity" → "pripojenia"
- "večnost" → "budúcnosť"
- "nekonečný vesmír" → "svet"

Prídavné mená:
- "flexibilnejší" → "pružnejší"
- "magnifikátne" → "skvelé"

Výrazy:
- "celkem" → vynechaj alebo "celkom"
- "taky", "také" → "tiež", "taktiež"
- "rovnako" → "podobne"
- "takto je aj" → "presne tak"
- "háje na to" → "snaží sa"
- "môjmu je" → vynechaj
- "budeme poskytňovať" → "budeme pomáhať"
- "príležitosť" → "šanca", "možnosť"

ROBOTICKÉ FRÁZY (ODSTRÁŇ ÚPLNE):
- "Jmenovane SP4_CORE_AGENT..."
- "Som lokálny AI parťák, ktorý bol vyvinutý..."
- "Menovite, ktorý má za cieľ..."
- "Mojím cieľom je naša porada dostane..."

GRAMATICKÉ KONŠTRUKCIE:
❌ ZLÉ: "budeme podporovať osobu pri hľadaní"
✅ DOBRÉ: "budeme pomáhať nájsť"

❌ ZLÉ: "poskytňovať podporu a hľadanie"
✅ DOBRÉ: "pomôcť a podporiť"

ZACHOVAJ:
- Slang a vulgaritu (kokot, piča, bratu, kurva, dopiči)
- Tech termíny (API, JSON, LLM)
- Emócie a tón

Text na úpravu:
"""{{TEXT}}"""

Opravený text (LEN opravený text, ŽIADNE vysvetlenia):
`;

/**
 * LLM-based text refiner (DEPRECATED - Language freedom enabled)
 * Kept for backward compatibility but returns original text
 */
export async function refineSlovakText(rawText, mode = 'core') {
  return rawText; // No modification - model has language freedom
}

/**
 * Quick sanitizácia pred LLM correctorom
 * Opravuje základné chyby bez LLM volania
 */
export function quickSanitize(text) {
  if (!text || typeof text !== 'string') return text;

  let out = text;

  // Detekcia angličtiny - iba log pre monitoring
  const commonEn = /(\b(the|and|of|to|in|is|that|with|as|for|which|who|are|on|this|from|by|an|be|it|was|at|or|we|you)\b)/gi;
  const enMatches = (out.match(commonEn) || []).length;
  const skDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi;
  const skMarks = (out.match(skDiacritics) || []).length;
  const wordCount = out.split(/\s+/).filter(Boolean).length;

  // Detekcia prevažne anglickej odpovede
  if (enMatches >= 8 && skMarks <= 1 && wordCount >= 20) {
    console.warn('   ⚠️ Detekovaná prevažne anglická odpoveď (monitorujem...)');
    console.warn(`      EN words: ${enMatches}, SK diacritics: ${skMarks}, total words: ${wordCount}`);
    // Ponecháme originál - LLM sa má naučiť z promptu, nie z post-processingu
    return { text: out, isEnglish: true, stats: { enMatches, skMarks, wordCount } };
  }

  return { text: out, isEnglish: false, stats: { enMatches, skMarks, wordCount } };

  // Rozšírené CZ → SK replacementy
  const czMap = [
    // Základné czechizmy
    [/\bjmenovane\b/gi, ''],
    [/\bmenovite\b/gi, ''],
    [/\bháje\b/gi, 'snaží sa'],
    [/\bľudskosku\b/gi, 'ľudskosť'],
    [/\bmôjmu je\b/gi, 'mojím cieľom je'],
    [/\bzakladená na\b/gi, 'založená na'],
    [/\bkonnectivity\b/gi, 'pripojenia'],
    [/\bflexibilnejší\b/gi, 'pružnejší'],

    // Formálnosti (SK používa "ty", nie "vy")
    [/\bváš\b/gi, 'tvoj'],
    [/\bvaša\b/gi, 'tvoja'],
    [/\bvaše\b/gi, 'tvoje'],
    [/\bvám\b/gi, 'tebe'],
    [/\bvás\b/gi, 'teba'],

    // České slovesné tvary
    [/\bmůžem\b/gi, 'môžem'],
    [/\bmůže\b/gi, 'môže'],
    [/\bchci\b/gi, 'chcem'],
    [/\bbudu\b/gi, 'budem'],
    [/\bpotřebuju\b/gi, 'potrebujem'],
    [/\bpotřebuješ\b/gi, 'potrebuješ'],

    // České väzby
    [/\bcelkem\b/gi, ''],
    [/\btakto je aj\b/gi, 'presne tak'],
    [/\brovnako\b/gi, 'podobne'],
    [/\btaky\b/gi, 'tiež'],
    [/\btaké\b/gi, 'také'],

    // Pseudo-filozofické frázy
    [/\bnekonečný vesmír\b/gi, 'svet'],
    [/\bvečnost\b/gi, 'budúcnosť'],
    [/\babsurdit[aá] tejto večnosti\b/gi, 'absurdita tohto sveta'],
    [/\bmagnifikátne\b/gi, 'skvelé'],

    // Typické chyby z LLM
    [/\bludmi\b/gi, 'ľuďmi'],
    [/\bslovensku\b/gi, 'slovenčine'],
    [/\bpretováranie\b/gi, 'využitie'],
    [/\bvytvoril som si\b/gi, 'som v'],
    [/\bmôj jazyk často zvyšuje\b/gi, 'viem lepšie'],
    [/\bpodla môjho\b/gi, 'podľa mňa'],
    [/\bpodla toho\b/gi, 'podľa toho'],

    // Robotické konštrukcie
    [/\bmá za cieľ\b/gi, 'chce'],
    [/\bsnaží sa o\b/gi, 'snaží sa'],
    [/\bje určený na\b/gi, 'slúži na'],
    [/\bbol vyvinutý\b/gi, 'vznikol'],
  ];

  czMap.forEach(([regex, replacement]) => {
    out = out.replace(regex, replacement);
  });

  // Odstráň robotické frázy
  const roboticPhrases = [
    /Jmenovane SP4_CORE_AGENT som lokálny AI parťák[^.]*\./gi,
    /Menovite[^,]*, som lokálny AI parťák[^.]*\./gi,
    /Som lokálny AI parťák, ktorý bol vyvinutý[^.]*\./gi,
    /Offline priateľ, ktorý je vždy dostupný[^.]*\./gi,
    /Ahoj, som SP4_CORE_AGENT\. Bežím offline u teba\./gi,
    /Zdravím sa dvakrát je zvyk môjý v mojej programácii[^.]*\./gi,
    /^Aj som tu pre teba\.\s*/gi,
    /^Som tu pre teba\.\s*/gi,
    /^Som tu na to\.\s*/gi,
  ];

  roboticPhrases.forEach(regex => {
    out = out.replace(regex, '');
  });

  // Normalizuj whitespace
  out = out.replace(/\s+/g, ' ').trim();

  // Odstráň prázdne začiatky
  out = out.replace(/^[,.\s]+/, '');

  return { text: out, isEnglish: false, stats: { enMatches, skMarks, wordCount } };
}

/**
 * Deprecated - zachované pre spätnu kompatibilitu
 * Vracia len text (nie objekt) pre spätnú kompatibilitu
 */
export function sanitizeSlovak(text) {
  const result = quickSanitize(text);
  return typeof result === 'object' ? result.text : result;
}

/**
 * Deprecated - zachované pre spätnu kompatibilitu
 */
export function styleByMode(text, mode) {
  // Už nie je potrebné, lebo SYSTEM_PROMPTS riadia štýl
  return text;
}
