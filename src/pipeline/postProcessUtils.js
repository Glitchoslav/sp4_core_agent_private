import { preserveCodeSegments } from './codeSegments.js';

export function brutalizeFireResponse(text) {
  return text
    .replace(/nevzdávaj sa/gi, 'ak to fakt chceš, prestaň si klamať a niečo urob')
    .replace(/je to výzva/gi, 'je to kurva ťažké a ty to vieš')
    .replace(/skús zvážiť/gi, 'prestaň váhať a rozhodni sa')
    .replace(/možno by pomohlo/gi, 'spraviťo alebo nie')
    .replace(/dôležité je/gi, 'podstatné je')
    .replace(/je to náročné, ale/gi, 'je to kurva ťažké a')
    .replace(/ver v seba/gi, 'mať gule')
    .replace(/si silný/gi, 'máš v sebe viac, ako si mysliš')
    // Remove numbered/bullet lists (keep only content)
    .replace(/^\s*\d+\.\s*/gm, '')
    .replace(/^\s*[-*+]\s*/gm, '');
}

export function sanitizeAiCliches(text) {
  if (!text || typeof text !== 'string') return text;

  const bannedPatterns = [
    /^\s*I['’]m an AI(?: language model)?\b[^.?!]*[.?!]?$/i,
    /^\s*As an AI(?: language model)?\b[^.?!]*[.?!]?$/i,
    /^\s*I am an AI(?: language model)?\b[^.?!]*[.?!]?$/i,
    /^\s*I['’]m here to help you\b[^.?!]*[.?!]?$/i,
    /^\s*I am here to help you\b[^.?!]*[.?!]?$/i,
    /^\s*please feel free to ask\b[^.?!]*[.?!]?$/i,
    /^\s*I['’]ll do my best to assist you\b[^.?!]*[.?!]?$/i,

    /^\s*ako AI jazykov[ýá] model\b[^.?!]*[.?!]?$/i,
    /^\s*ako umel[áa] inteligencia\b[^.?!]*[.?!]?$/i,
    /^\s*som tu,? aby som ti pomohol\b[^.?!]*[.?!]?$/i,
    /^\s*ďakujem za (tvoju|vašu) ot[áa]zku\b[^.?!]*[.?!]?$/i,
    /^\s*som virtu[áa]lny asistent\b[^.?!]*[.?!]?$/i
  ];

  const sentences = text.match(/[^.?!]+[.?!]?/g) ?? [text];

  const cleaned = sentences
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => !bannedPatterns.some((pattern) => pattern.test(sentence)))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleaned) {
    return '';
  }

  return cleaned;
}

export function stripResidualEnglish(text) {
  if (!text || typeof text !== 'string') return text;

  const sentences = text.split(/(?<=[\.\?\!])\s+/);

  const filtered = sentences.filter((s) => {
    const lower = s.toLowerCase();

    const hasSlovakDiacritics = /[áäčďéíĺľňóôŕšťúýž]/.test(lower);

    const englishCliche =
      /^(as an outside observer\b|feel free to ask\b|please feel free to ask\b|i cannot provide a response\b|i['’]m here to help you\b|i am here to help you\b|as an ai(?: language model)?\b|i['’]ll do my best to assist you\b)/i.test(
        lower.trim()
      );

    if (!hasSlovakDiacritics && englishCliche) return false;

    return true;
  });

  const joined = filtered.join(' ').trim();

  return joined;
}

export function stripInternalPromptArtifacts(text) {
  if (!text || typeof text !== 'string') return text;

  return text
    .replace(/\s*\[INTERNAL_[^\]]+\]/gi, '')
    // SP4-audit-003: strip leaked system prompt section headers
    .replace(/━{5,}\s*\n?🧠\s*SP4 KNOWLEDGE BASE\s*\n?━{5,}/g, '')
    .replace(/🌀\s*Tribe echo:[^\n]*/g, '')
    .replace(/━{5,}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function reconcileLanguageRewrite({
  originalText,
  rewrittenText,
  englishRatioBefore,
  englishRatioAfter
}) {
  const ratioDropped = (englishRatioBefore || 0) - (englishRatioAfter || 0);
  const ratioDropPercent = Math.round(ratioDropped * 100);
  const persistentEnglish = (englishRatioAfter || 0) > 0.3;
  const rewriteImproved = (englishRatioAfter || 0) < (englishRatioBefore || 0);

  return {
    text:
      persistentEnglish && !rewriteImproved
        ? (originalText ?? '')
        : (rewrittenText ?? originalText ?? ''),
    ratioDropPercent,
    persistentEnglish,
    rewriteImproved
  };
}

export function getGlobalLanguageFailsafeDecision({
  userInputLang,
  isManifestRequest,
  forceSlovak,
  enforcementResult,
  englishRatioFinal,
  totalWords
}) {
  const explicitLanguageTrigger =
    enforcementResult?.languageGuardReason === 'PERSISTENT_ENGLISH_AFTER_REWRITE'
      ? 'PERSISTENT_ENGLISH_AFTER_REWRITE'
      : userInputLang === 'sk'
        ? 'USER_INPUT_SK'
        : isManifestRequest === true
          ? 'MANIFEST_REQUEST'
          : forceSlovak === true
            ? 'FORCE_SLOVAK'
            : null;

  const heavyEnglishLeak = (totalWords || 0) > 20 && (englishRatioFinal || 0) > 0.7;

  return {
    shouldFallback: Boolean(explicitLanguageTrigger) && heavyEnglishLeak,
    explicitLanguageTrigger,
    heavyEnglishLeak
  };
}

export function cleanupWeirdSlovak(text, options = {}) {
  // Kód sa nečistí: zhlukovanie medzier a mazanie zdvojených slov by rozbili bloky kódu.
  return preserveCodeSegments(text, (prose) => cleanupWeirdSlovakProse(prose, options));
}

function cleanupWeirdSlovakProse(text, options = {}) {
  if (!text) return text;
  let out = text;

  // 1) zjednoť whitespace
  out = out.replace(/\r\n/g, '\n');
  out = out.replace(/\n{3,}/g, '\n\n'); // max 1 prázdny riadok medzi odsekmi

  // 2) odstráň zdvojené slová: "tiež tiež", "aj aj"
  out = out.replace(/\b(\w+)\s+\1\b/gi, '$1');

  // 3) trochu normalizuj emoji – max 1 rovnaký za sebou
  out = out.replace(/([😂🤣😍😊😁😅🙂😉🤔🔥❤️🚫⭐💀💫✨])\1{1,}/g, '$1');

  // 4) medzery pred interpunkciou
  out = out.replace(/\s+([,.!?;:])/g, '$1');

  // 5) viacnásobné medzery
  out = out.replace(/\s{2,}/g, ' ');

  if (options?.stripEmojis) {
    out = out.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
  }

  // 6) orež začiatok/koniec
  out = out.trim();

  return out;
}

export function auditCleanupStep(name, before, after, audit = null) {
  if (!audit || typeof audit.push !== 'function') {
    return;
  }

  const beforeText = String(before ?? '');
  const afterText = String(after ?? '');
  if (beforeText === afterText) {
    return;
  }

  audit.push({
    step: name,
    changed: true,
    beforeLength: beforeText.length,
    afterLength: afterText.length
  });
}
