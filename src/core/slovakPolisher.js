/**
 * SLOVAK POLISHER - Language Quality Layer
 * 
 * Používa Slovak model (OpenEuroLLM-Slovak) na finálne vylepšenie slovenčiny.
 * 
 * POUŽITIE:
 * - Primary model (llama3, mistral) generuje kvalitný obsah + rešpektuje personality
 * - Slovak polisher to preloží/vylepší do prirodzenej slovenčiny
 * 
 * @module slovakPolisher
 */

import { askLocalLLM } from '../../sp4os/llmLocal.js';

/**
 * Detekuje či text obsahuje príliš veľa angličtiny alebo zlú slovenčinu
 */
function needsPolishing(text) {
  // Detekcia anglických slov (okrem tech termínov)
  const englishWords = /\b(the|and|of|to|in|is|that|with|for|are|this|from|have|was|were|been|which|their|will|would|could|should|about|into|through|during|before|after)\b/gi;
  const englishMatches = (text.match(englishWords) || []).length;

  // Detekcia slovenskej diakritiky
  const slovakDiacritics = /[áäčďéíĺľňóôŕšťúýž]/gi;
  const diacriticsCount = (text.match(slovakDiacritics) || []).length;

  const wordCount = text.split(/\s+/).length;

  // Potrebuje polish ak:
  // - Viac ako 5 anglických slov v dlhších textoch
  // - Menej ako 2 diakritické znaky na 20 slov
  const hasEnglish = englishMatches >= 5 && wordCount >= 20;
  const lacksDiacritics = diacriticsCount < (wordCount / 10) && wordCount >= 20;

  return hasEnglish || lacksDiacritics;
}

/**
 * Vylepší slovenčinu v texte pomocou Slovak modelu
 * 
 * @param {string} text - Pôvodný text (možno s anglickými frázami)
 * @param {string} persona - Persona (core/popici/glitchoslav)
 * @param {boolean} force - Force polishing aj keď text vyzerá OK
 * @returns {Promise<string>} - Vylepšený text v čistej slovenčine
 */
export async function polishToSlovak(text, persona = 'core', force = false) {
  // Skip ak nie je potrebné (unless forced)
  if (!force && !needsPolishing(text)) {
    console.log('   ✅ Slovak quality OK, skipping polisher');
    return text;
  }

  if (force) {
    console.log('   🇸🇰 Slovak polisher FORCED (mistral mode)');
  } else {
    console.log('   🇸🇰 Slovak polisher activated');
  }

  // Persona-specific instructions
  const personaStyles = {
    core: 'technický, jasný, bez zbytočných slov',
    popici: 'východniarsky slang (ta, bo, šak, bratu, kokot), humor, drsný ale kamarátsky',
    glitchoslav: 'filozofický, poetický, metafory, mystický tón'
  };

  const style = personaStyles[persona] || personaStyles.core;

  const polishPrompt = `Prepíš tento text do perfektnej slovenčiny. Zachovaj význam, tón a štýl: ${style}

PÔVODNÝ TEXT:
${text}

PRAVIDLÁ:
- Zachovaj VŠETKO: formátovanie, emojis, význam, humor
- Zmeň LEN jazykové chyby a anglické frázy
- Štýl: ${style}
- ODPOVEDAJ LEN vylepšeným textom, žiadne komentáre!`;

  try {
    const polished = await askLocalLLM(
      polishPrompt,
      'Si expert na slovenskú gramatiku a štýl. Prepisuj texty do prirodzenej slovenčiny.',
      'jobautomation/OpenEuroLLM-Slovak:latest',
      {
        temperature: 0.3,  // Nízka kreativita - len oprava jazyka
        num_predict: 2048
      }
    );

    console.log('   ✅ Slovak polishing complete');
    return polished.trim();

  } catch (err) {
    console.warn('   ⚠️ Slovak polisher failed, using original:', err.message);
    return text; // Fallback na pôvodný text
  }
}

/**
 * Wrapper pre integráciu do existujúceho flow
 * 
 * @param {string} response - Response z primary modelu
 * @param {Object} options - { persona, skipPolish, forcePolish }
 * @returns {Promise<string>}
 */
export async function maybePolish(response, options = {}) {
  // v1.3.x: Slovak polisher dočasne vypnutý –
  // jazyk rieši primárny model + languageEnforcer + normalizeWeirdWords.
  return response;
}
