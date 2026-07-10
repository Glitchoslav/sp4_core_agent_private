// Empty-like means there is no usable text at all.
export function isEmptyLikeResponse(text) {
  return !text || String(text).trim().length === 0;
}

// Stub-like means there is text, but it is a known placeholder/fallback shell.
export function isStubLikeResponse(text) {
  const value = String(text || '').trim().toLowerCase();
  if (!value) return false;

  const knownStubPatterns = [
    /^ticho\.\s*skús/i,
    /^ticho\.\s*skus/i,
    /^skús to zopakovať jednou vetou\./i,
    /^skus to zopakovat jednou vetou\./i,
    /^ta napíš to normálne/i,
    /^ta napis to normalne/i,
    /^error:\s*empty response/i,
    /^no_output:/i
  ];

  return knownStubPatterns.some((pattern) => pattern.test(value));
}

export function looksLikeCanonicalSp4Fallback(userMessage, text) {
  const question = String(userMessage || '').toLowerCase();
  const answer = String(text || '').toLowerCase().trim();

  if (!answer) return false;
  if (/\bsp4\b/i.test(question)) return false;

  return answer.startsWith('sp4 je offline ai partnera projekt')
    || answer.startsWith('sp4 je offline-first ai partner')
    || answer.includes('offline ai partnera projekt a osobný digitálny partner');
}

export function hasMojibakeArtifacts(text) {
  const value = String(text || '');
  return /�|ÔÇ|├|┤|┼/.test(value);
}

function normalizeQualityText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s:_./<>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countQualityFragments(text, fragments = []) {
  const value = normalizeQualityText(text);
  return fragments.reduce((count, fragment) => count + (value.includes(fragment) ? 1 : 0), 0);
}

function countCrossSlavicArtifacts(text) {
  const value = String(text || '');
  return (value.match(/[ěřů]/gi) || []).length;
}

export function detectShortTechTopic(question) {
  const value = normalizeQualityText(question);

  if (value.includes('wifi') && value.includes('router')) {
    return 'wifi_router';
  }

  if (value.includes('cache')) {
    return 'cache';
  }

  if (value.includes('404')) {
    return 'http_404';
  }

  if (value.includes('ollama') && value.includes('port')) {
    return 'ollama_port';
  }

  return null;
}

export function detectShortTechUtilityIssue({ userMessage, responseText, queryType }) {
  const relevantQueryTypes = new Set(['technical_simple', 'technical_deep', 'followup', 'mixed', 'conversational']);
  if (!relevantQueryTypes.has(String(queryType || ''))) {
    return { applied: false, reason: null, replacementText: null, action: null };
  }

  const topic = detectShortTechTopic(userMessage);
  if (!topic) {
    return { applied: false, reason: null, replacementText: null, action: null };
  }

  const answer = String(responseText || '').trim();
  if (!answer) {
    return { applied: false, reason: null, replacementText: null, action: null };
  }

  const normalizedAnswer = normalizeQualityText(answer);
  const corruptedFragments = [
    'prepodaba',
    'prepoziva',
    'sirigeluje',
    'overies',
    'stradiu',
    'priebiratel',
    'zaistenec',
    'dotvorne kopie',
    'dohromady buforovaci',
    'sprievodcovej konfiguracii',
    'ollamectl',
    'nie je na mieste',
    'weboveho strankovania',
    'doba cakania medzi poslednou hodnotou',
    'priejomy',
    'pozickou po sieti',
    'priipojenymi zariadeniam',
    'telefoné',
    'kablav',
    'omezeni medzi',
    'project',
    'dotakov na server',
    'skladnica',
    'dotvorne',
  ];

  const corruptedHitCount = countQualityFragments(normalizedAnswer, corruptedFragments);

  const topicRules = {
    wifi_router: {
      suspiciousFragments: [
        'prepodaba',
        'prepoziva',
        'sirigeluje',
        'overies',
        'stradiu',
        'priebiratel',
        'zaistenec',
        'priejomy',
        'omezeni medzi',
        'devices',
        'kablav',
      ],
      expectedFragments: ['internet', 'siet', 'wifi', 'pripoj', 'zariaden'],
      minExpectedHits: 2,
    },
    cache: {
      suspiciousFragments: [
        'doba cakania medzi poslednou hodnotou',
        'dohromady buforovaci',
        'skladnica',
        'dotvorne kopie',
        'dotakov na server',
      ],
      expectedFragments: ['pamat', 'docasn', 'rychl', 'uloz', 'opak'],
      minExpectedHits: 1,
    },
    http_404: {
      suspiciousFragments: [
        'nie je na mieste',
        'internetovy pripojenie',
        'weboveho strankovania',
      ],
      expectedFragments: ['nenajd', 'neexist', 'not found', 'url', 'odkaz', 'server'],
      minExpectedHits: 2,
    },
    ollama_port: {
      suspiciousFragments: [
        'konfiguracnom subore aplikacie',
        'spravcovia konfiguracie',
        'kontaktovat ich podporu',
        'app.yaml',
        'ollamectl',
        'sprievodcovej konfiguracii',
      ],
      expectedFragments: ['11434', 'localhost', 'ollama_host', 'host', 'serve', 'env', 'environment'],
      minExpectedHits: 1,
    },
  };

  const topicRule = topicRules[topic];
  const suspiciousHitCount = countQualityFragments(normalizedAnswer, topicRule.suspiciousFragments);
  const expectedHitCount = countQualityFragments(normalizedAnswer, topicRule.expectedFragments);
  const crossSlavicArtifactCount = countCrossSlavicArtifacts(answer);

  if (crossSlavicArtifactCount >= 1 && (suspiciousHitCount >= 1 || corruptedHitCount >= 1 || topic === 'wifi_router')) {
    return {
      applied: true,
      reason: 'short_tech_cross_slavic_artifacts',
      replacementText: 'Odpoveď bola technicky na tému, ale jazykovo rozpadnutá do česko-slovenského mixu, preto ju nepúšťam ďalej. Polož tú istú otázku ešte raz jednou vetou a odpoviem priamo.',
      action: 'GENERAL_QUALITY_SHORT_TECH_UTILITY'
    };
  }

  if (suspiciousHitCount >= 1 && (expectedHitCount < topicRule.minExpectedHits || corruptedHitCount >= 1)) {
    return {
      applied: true,
      reason: `short_tech_low_utility_${topic}`,
      replacementText: 'Odpoveď síce trafila tému, ale bola jazykovo alebo prakticky slabá, preto ju nepúšťam ďalej. Polož tú istú otázku ešte raz jednou vetou a odpoviem priamo.',
      action: 'GENERAL_QUALITY_SHORT_TECH_UTILITY'
    };
  }

  if (topic === 'ollama_port' && expectedHitCount === 0) {
    return {
      applied: true,
      reason: 'short_tech_missing_operational_anchor_ollama_port',
      replacementText: 'Odpoveď o porte v Ollama bola príliš všeobecná a bez operatívneho postupu, preto ju nepúšťam ďalej. Polož tú istú otázku ešte raz jednou vetou a odpoviem priamo.',
      action: 'GENERAL_QUALITY_SHORT_TECH_UTILITY'
    };
  }

  if (corruptedHitCount >= 2) {
    return {
      applied: true,
      reason: 'short_tech_corrupted_lexicon',
      replacementText: 'Odpoveď bola technicky na tému, ale jazykovo zdegenerovaná a prakticky slabá, preto ju nepúšťam ďalej. Polož tú istú otázku ešte raz jednou vetou a odpoviem priamo.',
      action: 'GENERAL_QUALITY_SHORT_TECH_UTILITY'
    };
  }

  return { applied: false, reason: null, replacementText: null, action: null };
}

export function detectGeneralQualitySanityIssue({ userMessage, responseText, queryType, responseControlApplied }) {
  if (responseControlApplied === true) {
    return { applied: false, reason: null, replacementText: null, action: null };
  }

  const allowedQueryTypes = new Set(['conversational', 'followup', 'technical_simple', 'technical_deep', 'mixed']);
  if (!allowedQueryTypes.has(String(queryType || ''))) {
    return { applied: false, reason: null, replacementText: null, action: null };
  }

  const answer = String(responseText || '').trim();

  if (!answer) {
    return { applied: false, reason: null, replacementText: null, action: null };
  }

  if (isStubLikeResponse(answer)) {
    return {
      applied: true,
      reason: 'stub_like_output',
      replacementText: 'Odpoveď bola zjavne rozbitá, preto ju nepúšťam ďalej. Polož otázku ešte raz jednou vetou a odpoviem priamo.',
      action: 'GENERAL_QUALITY_STUB'
    };
  }

  if (looksLikeCanonicalSp4Fallback(userMessage, answer)) {
    return {
      applied: true,
      reason: 'canonical_sp4_fallback',
      replacementText: 'Táto odpoveď trafila zlý fallback a nepúšťam ju ďalej. Polož otázku ešte raz jednou vetou a odpoviem priamo.',
      action: 'GENERAL_QUALITY_CANONICAL_FALLBACK'
    };
  }

  if (hasMojibakeArtifacts(answer)) {
    return {
      applied: true,
      reason: 'encoding_artifacts',
      replacementText: 'Odpoveď sa rozpadla pri generovaní alebo kódovaní, preto ju nepúšťam ďalej. Polož otázku ešte raz jednou vetou.',
      action: 'GENERAL_QUALITY_ENCODING'
    };
  }

  return { applied: false, reason: null, replacementText: null, action: null };
}
