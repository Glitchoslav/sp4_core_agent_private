/**
 * GLITCH NORMALIZER – Language Quality Micro-Layer
 * 
 * Deterministic regex-based cleanup (ZERO LLM calls).
 * Runs AFTER enforcer to fix typos introduced by imperfect Slovak models.
 * 
 * Philosophy:
 * - Preserves glitch vibe & personality
 * - Only fixes obvious typos (ne-slova)
 * - No creative rewriting
 * 
 * @module glitchNormalizer
 */

import { preserveCodeSegments } from '../pipeline/codeSegments.js';

/**
 * Normalize glitch-slovak typos to proper Slovak
 * 
 * @param {string} text - Raw text (possibly with typos)
 * @returns {string} - Cleaned text (preserves meaning + glitch tone)
 */
export function glitchNormalizeSk(text = '') {
  // Kód (```bloky``` a `inline`) sa nenormalizuje — typo regexy ani zhlukovanie medzier doň nesiahajú.
  return preserveCodeSegments(text, glitchNormalizeProse);
}

function glitchNormalizeProse(text = '') {
  if (!text || typeof text !== 'string') return text;

  let t = text;

  // ┌─────────────────────────────────────────────┐
  // │ GLITCH NORMALIZATION RULES                 │
  // │ (Czech/mistranslated patterns → Slovak)    │
  // └─────────────────────────────────────────────┘

  const rules = [
    // Frequent Czech/glitch patterns
    [/\bsmysl\b/gi, 'zmysel'],              // "smysl" → "zmysel" (Czech → Slovak)
    [/navrhoen(e|ý|á|é)/gi, 'navrhnut$1'],  // "navrhoené" → "navrhnuté"
    [/kolkov(a|á|é|ý)/gi, 'chaotick$1'],    // "kolková" → "chaotická" (context-dependent, but safer)
    [/nejistot/gi, 'neistot'],              // Czech "nejistota" → Slovak "neistota"
    [/technickému kolonialismu/gi, 'technickému kolonializmu'],  // Typo fix
    [/\btímové\s+AI\b/gi, 'tímová AI'],     // Gender agreement: "tímová" not "tímové"
    [/\bmajš\b/gi, 'máš'],                  // Czech "máš" variant → Standard Slovak "máš"
    [/\bpiš\b/gi, 'píš'],                   // Czech → Slovak accent
    [/\buž\b/gi, 'už'],                     // Czech "už" (already OK in most contexts, but ensure)

    // Common mistranslation patterns
    [/jsou\b/gi, 'sú'],                     // Czech "jsou" → Slovak "sú"
    [/chtít\b/gi, 'chcieť'],                // Czech "chtít" → Slovak "chcieť"
    [/\bmůž/gi, 'môž'],                     // Czech "můž" → Slovak "môž"
    [/\bkterý/gi, 'ktorý'],                 // Czech "který" → Slovak "ktorý"

    // Archaic/broken Slovak that slips through
    [/\bsmradlav\b/gi, 'smradlavý'],        // Incomplete adjective
    [/\bvznik\b/gi, 'vznik'],               // Already OK, but ensure consistency

    // Double-space cleanup (normalize weird spacing)
    [/[ \t]{2,}/g, ' '],                    // Multiple spaces → single
    [/\n{3,}/g, '\n\n'],                    // Multiple newlines → max 2
  ];

  // Apply all normalization rules
  for (const [pattern, replacement] of rules) {
    t = t.replace(pattern, replacement);
  }

  // ┌─────────────────────────────────────────────┐
  // │ POST-PROCESSING: Preserve Glitch Vibe      │
  // └─────────────────────────────────────────────┘

  // Trim trailing/leading whitespace per line (but keep intentional formatting)
  t = t
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n');

  // Remove leading/trailing empty lines
  t = t.trim();

  return t;
}

/**
 * Wrapper: Check if text needs normalization, then normalize
 * 
 * @param {string} text - Text to check + normalize
 * @param {boolean} force - Force normalization even if not needed
 * @returns {Object} - { text, wasNormalized, stats }
 */
export function maybeNormalizeGlitch(text = '', force = false) {
  if (!text || typeof text !== 'string') {
    return { text, wasNormalized: false, stats: { checksPassed: [] } };
  }

  // Quick detection: Check for Czech patterns
  const czechPatterns = [
    /\bsmysl\b/i,
    /navrhoen/i,
    /nejistot/i,
    /\bkolkov/i,
  ];

  const hasCzechPatterns = czechPatterns.some(p => p.test(text));
  const shouldNormalize = force || hasCzechPatterns;

  if (!shouldNormalize) {
    return { text, wasNormalized: false, stats: { checksPassed: ['no_czech_patterns_detected'] } };
  }

  const normalized = glitchNormalizeSk(text);
  const wasChanged = normalized !== text;

  return {
    text: normalized,
    wasNormalized: wasChanged,
    stats: {
      originalLength: text.length,
      normalizedLength: normalized.length,
      checksPassed: ['czech_pattern_detected', wasChanged ? 'normalization_applied' : 'no_changes_needed']
    }
  };
}

export default { glitchNormalizeSk, maybeNormalizeGlitch };
