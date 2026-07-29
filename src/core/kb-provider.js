// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: kb-provider                │
// │  Layer: Core / Knowledge Base             │
// │  Role: Inject SP4 facts into prompts      │
// │  API: getRelevantKb(prompt, persona)      │
// └─────────────────────────────────────────────┘

/**
 * SP4 KNOWLEDGE BASE PROVIDER
 *
 * Načíta sp4-kb/index.json (raz, synchrónne pri štarte) a vracia relevantné
 * fakty o SP4 pre daný prompt. Jednoduché keyword matching (žiadne embeddings).
 *
 * ESM modul (sp4_core_agent má type:module; bridge-server.js používa import).
 *
 * @module kb-provider
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// kb-provider.js: sp4_core_agent/src/core/  ->  KB: SP4KULT/sp4-kb/index.json
const INDEX_PATH = path.join(__dirname, '..', '..', '..', 'sp4-kb', 'index.json');
const TIER = Object.freeze({ public: 0, member: 1, admin: 2 });
const PERSONA_IDENTITY_IDS = new Set(['core', 'glitchoslav', 'popici', 'validator']);

/** Lowercase + odstránenie diakritiky pre robustné matchovanie. */
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// ── Načítanie indexu raz pri štarte ───────────────────────
let KB_INDEX = [];
try {
  const raw = fs.readFileSync(INDEX_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  KB_INDEX = Array.isArray(parsed) ? parsed : [];
  // Predpočítaj normalizované kľúčové slová (term + aliases) pre rýchlosť.
  for (const rec of KB_INDEX) {
    const keywords = [rec.term, ...(Array.isArray(rec.aliases) ? rec.aliases : [])];
    rec._keywords = keywords.map(normalize).filter(Boolean);
    rec._scope = Array.isArray(rec.persona_scope) ? rec.persona_scope.map((s) => String(s).toLowerCase()) : ['all'];
  }
} catch (err) {
  // KB chýba/zlyhalo načítanie -> provider funguje, len vracia prázdne výsledky.
  console.warn(`[kb-provider] index.json sa nepodarilo načítať (${INDEX_PATH}): ${err.message}`);
  KB_INDEX = [];
}

/** Je záznam viditeľný pre danú personu? */
function inScope(rec, personaKey) {
  const scope = rec._scope || ['all'];
  if (scope.includes('all')) return true;
  if (!personaKey) return false;
  return scope.includes(String(personaKey).toLowerCase());
}

/** Default-deny visibility gate for KB sensitivity. */
function visibleToAudience(rec, audience) {
  const audienceTier = TIER[audience] ?? TIER.public;
  const sensitivityTier = TIER[rec.sensitivity] ?? TIER.admin;
  return sensitivityTier <= audienceTier;
}

/** Verejný tvar záznamu (bez interných polí). */
function publicShape(rec) {
  return { term: rec.term, text: rec.text, source: rec.source };
}

/**
 * Vráti najrelevantnejšie KB fakty pre daný prompt.
 *
 * @param {string} prompt - Text používateľa.
 * @param {string} personaKey - Kľúč persony (filtruje persona_scope).
 * @param {number} maxFacts - Max počet vrátených faktov (default 5).
 * @returns {Array<{term:string,text:string,source:string}>}
 */
export function getRelevantKb(prompt, personaKey, maxFacts = 5, audience = 'public') {
  const normPrompt = normalize(prompt);
  if (!normPrompt) return [];

  const normalizedPersonaKey = String(personaKey || '').toLowerCase();
  const scored = [];
  for (const rec of KB_INDEX) {
    const recordId = String(rec.id || '').toLowerCase();
    if (PERSONA_IDENTITY_IDS.has(recordId) && recordId !== normalizedPersonaKey) continue;
    if (!inScope(rec, personaKey) || !visibleToAudience(rec, audience)) continue;
    let score = 0;
    for (const kw of rec._keywords) {
      if (kw && normPrompt.includes(kw)) score += 1;
    }
    if (score > 0) scored.push({ rec, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxFacts).map((s) => publicShape(s.rec));
}

/**
 * Vráti všetky KB fakty viditeľné pre danú personu (baseline do system promptu).
 *
 * @param {string} personaKey - Kľúč persony.
 * @returns {Array<{term:string,text:string,source:string}>}
 */
export function getAllKb(personaKey, audience = 'public') {
  return KB_INDEX
    .filter((rec) => inScope(rec, personaKey) && visibleToAudience(rec, audience))
    .map(publicShape);
}

/** Diagnostika: koľko záznamov je načítaných. */
export function getKbStatus() {
  return { loaded: KB_INDEX.length, indexPath: INDEX_PATH };
}

export default { getRelevantKb, getAllKb, getKbStatus };
