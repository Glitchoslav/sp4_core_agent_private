/**
 * SP4 — unpredictabilityGuard (2026-08-13, pi + Claude Code návrh)
 *
 * Detekuje otázky na NEPREDVÍDATEĽNÚ BUDÚCNOSŤ / neznáme udalosti
 * (budúci rok v texte alebo prediktívne vzory). Účel: model má priznať
 * „neviem" namiesto tipovania (uncertain flag + system prompt direktíva).
 *
 * Local-first, žiadne závislosti. Normalizácia zhodná s kb-provider.js.
 */

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const PREDICTIVE_PATTERNS = [
  'kto vyhra', 'kto vyhraje', 'kto vyhral', 'kto bude', 'kto sa stane',
  'aka bude cena', 'aka bude', 'ake bude', 'aky bude', 'kedy skonci',
  'kedy sa skonci', 'vysledok', 'ci vyhra', 'kto postupi', 'kto ziska',
  'predpoved', 'buducnost', 'bude v roku', 'kto dostane', 'co sa stane',
];

/**
 * True, ak otázka smeruje na nepredvídateľnú budúcnosť:
 *  - v texte je rok > aktuálny rok, ALEBO
 *  - text obsahuje prediktívny vzor.
 */
export function isUnpredictableFuture(text) {
  const norm = normalize(text);
  const currentYear = new Date().getFullYear();
  const yearMatch = norm.match(/\b(20\d{2})\b/g);
  if (yearMatch && yearMatch.some((y) => Number(y) > currentYear)) {
    return true;
  }
  return PREDICTIVE_PATTERNS.some((p) => norm.includes(p));
}
