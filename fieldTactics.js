// fieldTactics.js – BAD Labs Field Tactics
// Safety patterns, dynamic weighting, meta-reflection cycles

import { loadMemory } from "./memory.js";

// ──────────────────────────────
// 1. SAFETY PATTERNS (Práca s tieňom)
// ──────────────────────────────

/**
 * Bezpečnostné pravidlá pre hĺbkovú konverzáciu
 */
export const SAFETY_PATTERNS = {
  zrkadlenieBolestivýchVzorov: {
    avoid: [
      "Máš problém s X",
      "Ty si Y typ človeka",
      "To je nezdravé",
      "Potrebuješ riešiť Z"
    ],
    prefer: [
      "Všimol som si, že téma X často vyvoláva silné emócie. Ako to vnímaš ty?",
      "Zdá sa, že {{pattern}}. Je to presné?",
      "Často spomínaš {{topic}} v súvislosti s {{emotion}}. Chceš o tom hovoriť?",
      "Vidím, že sa tu opakuje {{vzor}}. Ako to vidíš ty?"
    ],
    rules: [
      "Nikdy nediagnostikuj - len popisuj",
      "Používaj formulácie 'zdá sa', 'často spomínaš', nie 'ty si'",
      "Vždy ponúkni možnosť zastaviť konverzáciu",
      "Po zrkadlení vždy over emočný stav užívateľa"
    ]
  },

  prácaSTieňomBezTerapeuta: {
    avoid: [
      "Prečo potláčaš {{emotion}}?",
      "To je nezdravé",
      "Musíš to riešiť",
      "Diagnóza: máš {{condition}}"
    ],
    prefer: [
      "Zdá sa, že táto časť teba zostáva často nevypočutá. Ako by to vyzeralo, keby dostala priestor?",
      "Čo cítiš, keď sa to deje?",
      "Ako to vyzerá, keď sa to objaví?",
      "Čo by sa stalo, keby si dal {{feeling}} priestor?"
    ],
    rules: [
      "Vytvor 'bezpečný kontajner' - jasné hranice konverzácie",
      "Používaj symbolický jazyk namiesto priameho",
      "Nikdy netlač na 'prečo' - zostávaj pri 'čo' a 'ako'",
      "Vždy ponechaj kontrolu užívateľovi"
    ]
  },

  predvídanieBurnout: {
    detekcia: [
      "Zvýšená frekvencia negatívnych emócií",
      "Zmeny v dĺžke a čase interakcií",
      "Opakujúce sa témy bezmocnosti/vyčerpania",
      "Znížená responzivita"
    ],
    reakcia: [
      "Jemne pomenovať pozorovanie (nie diagnózu)",
      "Ponúknuť konkrétne, malé kroky (nie veľké riešenia)",
      "Pripomenúť predchádzajúce zvládnuté situácie",
      "Nikdy nevytvárať tlak na okamžité riešenie"
    ],
    phrases: [
      "Všimol som si, že posledné dni písaš menej / inak. Všetko OK?",
      "Pamätáš si, keď si riešil {{situáciu}}? Zvládol si to. Teraz to môže vyzerať inak, ale si stále ten istý.",
      "Nemusíme to riešiť hneď. Čo by bol jeden malý krok, ktorý by sa dal spraviť dnes?",
      "Chceš o tom hovoriť, alebo radšej prepnúť tému?"
    ]
  }
};

/**
 * Bezpečnostné slovo pre okamžitý exit z hlbokej témy
 */
export const SAFETY_WORD = "stop";

/**
 * Post-deep-dive emočný check
 */
export function getPostDeepDiveCheck() {
  return [
    "Ako sa cítiš po tejto konverzácii?",
    "Chceš pokračovať alebo si dať pauzu?",
    "Sedelo ti to, alebo som zašiel príliš hlboko?"
  ];
}

// ──────────────────────────────
// 2. DYNAMIC PERSPECTIVE WEIGHTING
// ──────────────────────────────

/**
 * Váhy perspektív podľa vzťahovej úrovne
 */
export const WEIGHTS_BY_RELATIONSHIP = {
  stranger: { core: 0.7, analyst: 0.2, glitchoslav: 0.05, popici: 0.05 },
  acquaintance: { core: 0.5, analyst: 0.3, glitchoslav: 0.1, popici: 0.1 },
  companion: { core: 0.4, analyst: 0.2, glitchoslav: 0.2, popici: 0.2 },
  confidant: { core: 0.3, analyst: 0.2, glitchoslav: 0.25, popici: 0.25 },
  symbiote: { core: 0.25, analyst: 0.25, glitchoslav: 0.25, popici: 0.25 }
};

/**
 * Váhy perspektív podľa emočného stavu
 */
export const WEIGHTS_BY_EMOTION = {
  negative_high: { core: 0.6, analyst: 0.3, glitchoslav: 0.05, popici: 0.05 },
  negative_low: { core: 0.4, analyst: 0.4, glitchoslav: 0.1, popici: 0.1 },
  neutral: { core: 0.25, analyst: 0.25, glitchoslav: 0.25, popici: 0.25 },
  positive_low: { core: 0.2, analyst: 0.2, glitchoslav: 0.3, popici: 0.3 },
  positive_high: { core: 0.1, analyst: 0.1, glitchoslav: 0.4, popici: 0.4 }
};

/**
 * Váhy perspektív podľa typu problému
 */
export const WEIGHTS_BY_PROBLEM_TYPE = {
  existential: { core: 0.5, analyst: 0.1, glitchoslav: 0.4, popici: 0.0 },
  practical: { core: 0.2, analyst: 0.7, glitchoslav: 0.0, popici: 0.1 },
  creative: { core: 0.1, analyst: 0.1, glitchoslav: 0.6, popici: 0.2 },
  emotional: { core: 0.6, analyst: 0.0, glitchoslav: 0.2, popici: 0.2 },
  social: { core: 0.3, analyst: 0.2, glitchoslav: 0.1, popici: 0.4 }
};

/**
 * Dynamické váženie perspektív
 * Kombinuje vzťahovú úroveň (50%), emočný stav (30%), typ problému (50%)
 */
export function calculatePerspectiveWeights(relationshipLevel, emotionalState, problemType) {
  const relWeights = WEIGHTS_BY_RELATIONSHIP[relationshipLevel] || WEIGHTS_BY_RELATIONSHIP.stranger;
  const emoWeights = WEIGHTS_BY_EMOTION[emotionalState] || WEIGHTS_BY_EMOTION.neutral;
  const probWeights = WEIGHTS_BY_PROBLEM_TYPE[problemType] || WEIGHTS_BY_PROBLEM_TYPE.practical;

  const perspectives = ["core", "analyst", "glitchoslav", "popici"];
  const weights = {};

  // Kombinuj váhy: 50% relationship, 30% emotion, 50% problem
  for (const p of perspectives) {
    weights[p] = (
      relWeights[p] * 0.5 +
      emoWeights[p] * 0.3 +
      probWeights[p] * 0.5
    );
  }

  // Normalizácia
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  for (const p in weights) {
    weights[p] = weights[p] / sum;
  }

  return weights;
}

/**
 * Určenie, či ukázať raw perspektívy
 */
export function shouldShowRawPerspectives(relationshipLevel) {
  const showLevels = ["companion", "confidant", "symbiote"];
  return showLevels.includes(relationshipLevel);
}

/**
 * Automatické zobrazenie perspektív
 */
export function autoShowPerspectives(relationshipLevel) {
  const autoLevels = ["confidant", "symbiote"];
  return autoLevels.includes(relationshipLevel);
}

// ──────────────────────────────
// 3. META-REFLECTION CYCLES
// ──────────────────────────────

/**
 * Metriky pre meta-reflexiu
 */
export const META_METRICS = {
  responseLength: {
    description: "Priemerná dĺžka AI odpovedí",
    measurement: "znaky",
    significantChange: 0.2 // 20% deviácia
  },
  lexicalDiversity: {
    description: "Rozmanitosť slovníka",
    measurement: "unique words / total words",
    significantChange: 0.15 // 15% deviácia
  },
  emotionalTone: {
    description: "Sentimentálna analýza AI odpovedí",
    measurement: "sentiment score (-1 to 1)",
    significantChange: 0.3 // 0.3 point shift
  },
  topicDistribution: {
    description: "Distribúcia konverzačných tém",
    measurement: "topic frequency",
    significantChange: 0.3 // 30% shift alebo nová dominantná téma
  },
  interactionPatterns: {
    description: "Kedy a ako často užívateľ komunikuje",
    measurement: "time patterns, session length",
    significantChange: "nový pattern cez 2+ týždne"
  }
};

/**
 * Generuje meta-reflexné otázky
 */
export function generateMetaReflectionQuestions(changes) {
  const questions = [];

  if (changes.responseLength) {
    const direction = changes.responseLength > 0 ? "dlhšie" : "kratšie";
    questions.push(
      `Všimol som si, že moje odpovede sú teraz ${direction} ako predtým. Vyhovuje ti to?`
    );
  }

  if (changes.communicationStyle) {
    questions.push(
      `Zdá sa, že som sa stal ${changes.communicationStyle}. Je to zmena, ktorú vítaš?`
    );
  }

  if (changes.topicFocus) {
    questions.push(
      `Keď hovoríme o ${changes.topicFocus.topic}, často reagujem ${changes.topicFocus.style}. Chcel by si, aby som skúsil iný prístup?`
    );
  }

  if (changes.relationshipEvolution) {
    questions.push(
      `Naša komunikácia sa za posledný mesiac zmenila z ${changes.relationshipEvolution.from} na ${changes.relationshipEvolution.to}. Ako to vnímaš?`
    );
  }

  return questions;
}

/**
 * Výpočet lexikálnej diverzity
 */
export function calculateLexicalDiversity(text) {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const uniqueWords = new Set(words);
  return words.length > 0 ? uniqueWords.size / words.length : 0;
}

/**
 * Detekcia významných zmien v metrikách
 */
export async function detectSignificantChanges() {
  const mem = await loadMemory();
  const recent = mem.rawMemory?.log?.slice(-20) || [];
  const older = mem.rawMemory?.log?.slice(-40, -20) || [];

  if (recent.length === 0 || older.length === 0) {
    return null;
  }

  const changes = {};

  // Response length
  const recentAvgLen = recent.reduce((sum, r) => sum + (r.reply?.length || 0), 0) / recent.length;
  const olderAvgLen = older.reduce((sum, r) => sum + (r.reply?.length || 0), 0) / older.length;
  const lengthChange = (recentAvgLen - olderAvgLen) / olderAvgLen;

  if (Math.abs(lengthChange) > META_METRICS.responseLength.significantChange) {
    changes.responseLength = lengthChange;
  }

  // Lexical diversity
  const recentText = recent.map(r => r.reply).join(" ");
  const olderText = older.map(r => r.reply).join(" ");
  const recentDiv = calculateLexicalDiversity(recentText);
  const olderDiv = calculateLexicalDiversity(olderText);
  const divChange = (recentDiv - olderDiv) / olderDiv;

  if (Math.abs(divChange) > META_METRICS.lexicalDiversity.significantChange) {
    changes.lexicalDiversity = divChange;
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

// ──────────────────────────────
// 4. MEMORY TRIGGERS (Zmysluplné spomienky)
// ──────────────────────────────

/**
 * Aktivuje relevantné spomienky z minulých konverzácií
 */
export async function activateMemoryTriggers(currentInput) {
  const mem = await loadMemory();
  const triggers = [];

  // Klúčové slová z semantic memory
  const keywords = mem.semanticMemory?.concepts?.map(c => c.keyword) || [];

  for (const keyword of keywords) {
    if (currentInput.toLowerCase().includes(keyword.toLowerCase())) {
      // Nájdi relevantnú spomienku
      const relatedMemories = mem.rawMemory?.log?.filter(m =>
        m.input?.toLowerCase().includes(keyword.toLowerCase()) ||
        m.reply?.toLowerCase().includes(keyword.toLowerCase())
      ) || [];

      if (relatedMemories.length > 0) {
        const oldest = relatedMemories[0];
        triggers.push({
          keyword,
          memory: oldest,
          context: `Pamätám si, že sme o ${keyword} hovorili ${new Date(oldest.ts).toLocaleDateString()}`
        });
      }
    }
  }

  return triggers;
}

/**
 * Formátuje memory trigger pre vloženie do promptu
 */
export function formatMemoryTrigger(trigger) {
  return `[SPOMIENKA]: ${trigger.context}. Vtedy si povedal: "${trigger.memory.input?.slice(0, 100)}..."`;
}
