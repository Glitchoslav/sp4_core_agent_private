const COMMON_ENGLISH = /\b(the|and|of|to|in|is|that|with|for|are|was|this|be|you|your|from|have|has|it|on|as|at|by|or|should|would|could|will|not|but|if|when|what|how|can|do|did|been|about|also|just|more|some|any|get|them|than|these|those|each|both|most|such|only)\b/gi;
const SLOVAK_MARKERS = /[áäčďéíĺľňóôŕšťúýž]|\b(že|som|si|sme|ste|čo|ako|prečo|ktorý|slovensky|ahoj|čau|ďakujem|môžeš|potrebujem)\b/gi;

export function detectEnglishRatio(text = '') {
  const value = String(text || '').trim();
  if (!value) {
    return { ratio: 0, englishHits: 0, totalWords: 0 };
  }

  const words = value.split(/\s+/).filter(Boolean);
  const englishHits = (value.match(COMMON_ENGLISH) || []).length;
  const totalWords = words.length;
  const ratio = totalWords > 0 ? englishHits / totalWords : 0;

  return { ratio, englishHits, totalWords };
}

export function isValidSlovak(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;

  const { ratio, totalWords } = detectEnglishRatio(value);
  const slovakHits = (value.match(SLOVAK_MARKERS) || []).length;

  if (totalWords === 0) return false;
  if (slovakHits >= 2) return true;

  return ratio <= 0.35;
}

export function shouldEnforceLanguage(context = {}) {
  const userMessage = String(context?.userMessage || '');
  const forceSlovak = context?.forceSlovak === true;
  const intent = String(context?.intent || '').toLowerCase();

  if (forceSlovak) return true;
  if (intent === 'explain_sp4_sk') return true;

  const userLooksSlovak = isValidSlovak(userMessage);
  return userLooksSlovak;
}
