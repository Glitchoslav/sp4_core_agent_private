import { detectEnglishRatio } from './languageAuthority.js';

const SHORT_ALLOW = new Set([
  'ano', 'áno', 'nie', 'ok', 'yes', 'no'
]);
const KNOWN_BROKEN_SYNTAX_PATTERNS = [
  /je\s+take\s+agenti/i,
  /miesto\s+na\s+vas/i,
  /sprievodca\s+pre\s+system/i
];
const TECHNICAL_SIGNAL = /\b(http\s*\d{3}|error|exception|stack\s*trace|json|yaml|sql|api|timeout|retry|llm|token|regex|null|undefined|npm|node|python|docker|kubectl|k8s|status|ok|fail|success)\b/i;

function hasVowel(word = '') {
  return /[aeiouáäéíóôú]/i.test(String(word || ''));
}

function stripPunctuation(text = '') {
  return String(text || '').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function hasLetters(text = '') {
  return /[a-záäčďéíĺľňóôŕšťúýž]/i.test(String(text || ''));
}

function isRepetitiveNoise(text = '') {
  return /(.)\1{3,}/.test(String(text || ''));
}

function looksLikeRandomToken(word = '') {
  const value = String(word || '').toLowerCase();
  if (!value) return true;
  if (SHORT_ALLOW.has(value)) return false;
  if (TECHNICAL_SIGNAL.test(value)) return false;
  if (/^([a-záäčďéíĺľňóôŕšťúýž])\1{2,}$/i.test(value)) return true;
  if (value.length < 2) return true;
  if (!hasVowel(value)) return true;
  return false;
}

function computeShortMeaningScore(text = '') {
  const value = String(text || '').trim();
  const clean = stripPunctuation(value).toLowerCase();
  const words = value.split(/\s+/).filter(Boolean);
  const cleanWords = words.map((w) => stripPunctuation(w).toLowerCase()).filter(Boolean);
  const singleWord = cleanWords.length === 1 ? cleanWords[0] : '';

  const containsLetters = hasLetters(value);
  const notNoise = !isRepetitiveNoise(value);
  const containsVowel = cleanWords.some((w) => hasVowel(w));
  const minLengthOrWhitelist = cleanWords.some((w) => w.length >= 2) || SHORT_ALLOW.has(clean);

  let score = 0;
  if (containsLetters) score++;
  if (notNoise) score++;
  if (containsVowel) score++;
  if (minLengthOrWhitelist) score++;

  // Single token hard-fail for random strings/noise regardless of aggregate score.
  if (singleWord && looksLikeRandomToken(singleWord)) {
    return {
      score,
      randomSingleToken: true
    };
  }

  return {
    score,
    randomSingleToken: false
  };
}

export function isShort(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;
  const words = value.split(/\s+/).filter(Boolean);
  return words.length <= 3 || value.length < 25;
}

export function isMeaningfulShort(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;

  const { score, randomSingleToken } = computeShortMeaningScore(value);
  if (randomSingleToken) return false;
  return score >= 3;
}

function defaultReadableCheck(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;

  const hasLetter = hasLetters(value);
  if (!hasLetter) return false;

  // Obvious garbage/noise should never pass readability.
  if (isRepetitiveNoise(value)) return false;

  const tokens = value.split(/\s+/).filter(Boolean);
  const alphaTokens = tokens.filter((token) => /[a-záäčďéíĺľňóôŕšťúýž]/i.test(token));

  // Technical short outputs can still be valid (e.g. "HTTP 500", "JSON parse error").
  if (TECHNICAL_SIGNAL.test(value) && alphaTokens.length >= 1) return true;

  // Sentence-like outputs should pass even when concise.
  const sentenceLike = /[.!?]/.test(value)
    || /\b(je|sú|si|som|bude|funguje|chyba|problém|problem|riešenie|riesenie|skús|skus|is|are|was|be|can|should)\b/i.test(value);

  if (sentenceLike && alphaTokens.length >= 2) return true;

  // Otherwise require minimally informative text.
  return alphaTokens.length >= 4;
}

export function assessReadability(text = '') {
  const value = String(text || '').trim();
  const shortCandidate = isShort(value);
  if (shortCandidate) {
    const { score, randomSingleToken } = computeShortMeaningScore(value);
    const shortMeaningful = score >= 3 && !randomSingleToken;
    return {
      readable: shortMeaningful,
      short_candidate: true,
      score,
      short_meaningful: shortMeaningful,
      gate_reason: shortMeaningful ? 'short_valid' : 'short_invalid'
    };
  }

  return {
    readable: defaultReadableCheck(value),
    short_candidate: false,
    score: null,
    short_meaningful: false,
    gate_reason: 'default_readability'
  };
}

export function isReadable(text = '') {
  return assessReadability(text).readable;
}

export function hasMixedLanguage(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;

  const { ratio, totalWords } = detectEnglishRatio(value);
  const slovakHits = (value.match(/[áäčďéíĺľňóôŕšťúýž]/gi) || []).length;

  if (totalWords < 8) return false;
  return ratio > 0.18 && ratio < 0.75 && slovakHits > 0;
}

export function isBrokenSyntax(text = '') {
  const value = String(text || '').trim();
  if (!value) return true;

  if (KNOWN_BROKEN_SYNTAX_PATTERNS.some((pattern) => pattern.test(value))) {
    return true;
  }

  const unbalancedQuotes = (value.match(/"/g) || []).length % 2 !== 0;
  // Strip numbered list markers like "1)" "2)" before counting brackets
  const valueForBrackets = value.replace(/(?:^|\n)\s*\d+\)/g, '');
  const brokenBrackets = ((valueForBrackets.match(/\(/g) || []).length !== (valueForBrackets.match(/\)/g) || []).length)
    || ((valueForBrackets.match(/\[/g) || []).length !== (valueForBrackets.match(/\]/g) || []).length);
  const noisyChars = /(.)\1{8,}/.test(value);

  return unbalancedQuotes || brokenBrackets || noisyChars;
}
