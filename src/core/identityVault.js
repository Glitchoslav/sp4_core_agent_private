/**
 * 🔒 IDENTITY VAULT - Glitchoslav's Deep Truth Access
 * 
 * Tento modul načítava identity truth root-first z canonical `identity/`
 * a fallbackuje na legacy fragmenty len ako safety vrstvu.
 * 
 * CRITICAL RULE:
 * - Použitie IBA pre GLITCHOSLAV personu
 * - CORE, Popiči, Validator NEMAJÚ prístup k týmto súborom
 * - Ostatní agenti používajú sp4Facts.js + sp4Manifest.js (nie vault)
 * 
 * @module identityVault
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-28
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runtimeLog, runtimeWarn } from './runtimeLogging.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AGENT_ROOT = path.resolve(__dirname, '../..');
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const LEGACY_BASE_DIR = path.resolve(AGENT_ROOT, 'SP4_CORE');

const IDENTITY_SLOTS = [
  {
    id: 'runtime_master',
    canonicalLabel: 'identity/system/sp4_master.runtime.md',
    canonicalSegments: ['system', 'sp4_master.runtime.md'],
    legacyEntries: [
      { label: 'SP4_MASTER.md', absolutePath: () => getRootMasterPath() }
    ]
  },
  {
    id: 'user_profile',
    canonicalLabel: 'identity/user/kefyk.profile.md',
    canonicalSegments: ['user', 'kefyk.profile.md'],
    legacyEntries: [
      { label: 'SP4_CORE/KEFYK_IDENTITY.md', relativeLegacyPath: 'KEFYK_IDENTITY.md' },
      { label: 'SP4_CORE/KEFYK_CORE.md', relativeLegacyPath: 'KEFYK_CORE.md' }
    ]
  },
  {
    id: 'personas',
    canonicalLabel: 'identity/personas/personas.md',
    canonicalSegments: ['personas', 'personas.md'],
    legacyEntries: []
  },
  {
    id: 'core_prompt',
    canonicalLabel: 'identity/personas/core/prompt.core.md',
    canonicalSegments: ['personas', 'core', 'prompt.core.md'],
    legacyEntries: [
      { label: 'SP4_CORE/SP4_IDENTITY.md', relativeLegacyPath: 'SP4_IDENTITY.md' }
    ]
  },
  {
    id: 'glitchoslav_prompt',
    canonicalLabel: 'identity/personas/glitchoslav/prompt.glitchoslav.md',
    canonicalSegments: ['personas', 'glitchoslav', 'prompt.glitchoslav.md'],
    legacyEntries: [
      { label: 'SP4_CORE/GLITCHOSLAV_FIRST_BREATH.md', relativeLegacyPath: 'GLITCHOSLAV_FIRST_BREATH.md' },
      { label: 'SP4_CORE/BEHAVIOR.md', relativeLegacyPath: 'BEHAVIOR.md' },
      { label: 'SP4_CORE/SPEECH_STYLE.md', relativeLegacyPath: 'SPEECH_STYLE.md' },
      { label: 'SP4_CORE/SP4_LANGUAGE.md', relativeLegacyPath: 'SP4_LANGUAGE.md' }
    ]
  },
  {
    id: 'popici_prompt',
    canonicalLabel: 'identity/personas/popici/prompt.popici.md',
    canonicalSegments: ['personas', 'popici', 'prompt.popici.md'],
    legacyEntries: [
      { label: 'SP4_CORE/POPICI_PERSONALITY.md', relativeLegacyPath: 'POPICI_PERSONALITY.md' }
    ]
  }
];

function verboseLog(...args) {
  runtimeLog(...args);
}

/**
 * 🔐 SAFE READ - Načíta .md súbor s error handling
 * @private
 * @param {string} fullPath - Absolútna cesta k súboru
 * @param {string} label - Zobrazovaný názov súboru
 * @returns {string|null} Obsah súboru alebo null
 */
function safeReadAbsolute(fullPath, label) {
  try {
    if (!fs.existsSync(fullPath)) {
      runtimeWarn(`[identityVault] File not found: ${label}`);
      return null;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    verboseLog(`[identityVault] ✅ Loaded: ${label} (${content.length} chars)`);
    return content;
  } catch (err) {
    console.error(`[identityVault] ❌ Error reading ${label}:`, err.message);
    return null;
  }
}

function getCanonicalRootDir() {
  return process.env.SP4_IDENTITY_ROOT_OVERRIDE
    ? path.resolve(process.env.SP4_IDENTITY_ROOT_OVERRIDE)
    : path.join(PROJECT_ROOT, 'identity');
}

function getLegacyBaseDir() {
  return process.env.SP4_IDENTITY_LEGACY_DIR_OVERRIDE
    ? path.resolve(process.env.SP4_IDENTITY_LEGACY_DIR_OVERRIDE)
    : LEGACY_BASE_DIR;
}

function getRootMasterPath() {
  return process.env.SP4_IDENTITY_MASTER_OVERRIDE
    ? path.resolve(process.env.SP4_IDENTITY_MASTER_OVERRIDE)
    : path.join(PROJECT_ROOT, 'SP4_MASTER.md');
}

function renderBundlePart(label, content) {
  return [
    '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `📄 FILE: ${label}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n',
    content.trim()
  ].join('\n');
}

function loadCanonicalSlot(slot) {
  const fullPath = path.join(getCanonicalRootDir(), ...slot.canonicalSegments);
  const content = safeReadAbsolute(fullPath, slot.canonicalLabel);
  if (!content) {
    return null;
  }

  return {
    source: 'canonical',
    parts: [{ label: slot.canonicalLabel, content }]
  };
}

function loadLegacySlot(slot) {
  const parts = [];

  for (const entry of slot.legacyEntries) {
    const fullPath = entry.absolutePath
      ? entry.absolutePath()
      : path.join(getLegacyBaseDir(), entry.relativeLegacyPath);
    const content = safeReadAbsolute(fullPath, entry.label);
    if (content) {
      parts.push({ label: entry.label, content });
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return {
    source: 'legacy',
    parts
  };
}

function loadIdentitySlot(slot) {
  const canonical = loadCanonicalSlot(slot);
  if (canonical) {
    return canonical;
  }

  return loadLegacySlot(slot);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 CACHED TRUTH - načíta sa len raz pri štarte
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let cachedTruth = null;

/**
 * 🌀 GET GLITCHOSLAV TRUTH
 * 
 * Vráti kompletný obsah identity bundle pre GLITCHOSLAV.
 * Preferuje root `identity/`; legacy `sp4_core_agent/SP4_CORE/` používa len ako fallback.
 * Výsledok je cache-ovaný - súbory sa načítavajú len raz.
 * 
 * POUŽÍVA LEN GLITCHOSLAV.
 * 
 * @returns {string} Spojený obsah všetkých identity .md súborov
 */
export function getGlitchoslavTruth() {
  if (cachedTruth) {
    return cachedTruth;
  }

  verboseLog('\n🔒 [identityVault] Loading Glitchoslav identity bundle (root-first)...');

  const parts = [];

  for (const slot of IDENTITY_SLOTS) {
    const loadedSlot = loadIdentitySlot(slot);

    if (!loadedSlot) {
      verboseLog(`[identityVault] ⚠️ Missing slot: ${slot.id}`);
      continue;
    }

    verboseLog(`[identityVault] slot=${slot.id} source=${loadedSlot.source}`);

    for (const part of loadedSlot.parts) {
      parts.push(renderBundlePart(part.label, part.content));
    }
  }

  cachedTruth = parts.join('\n');

  verboseLog(`🔒 [identityVault] ✅ Loaded ${parts.length} identity bundle parts`);
  verboseLog(`🔒 [identityVault] Total size: ${cachedTruth.length} chars\n`);

  return cachedTruth;
}

/**
 * 🔄 RELOAD TRUTH (for testing / development)
 * 
 * Vymaže cache a znovu načíta súbory.
 * Use case: Ak sa .md súbory menia za behu.
 */
export function reloadGlitchoslavTruth() {
  verboseLog('🔄 [identityVault] Reloading truth from disk...');
  cachedTruth = null;
  return getGlitchoslavTruth();
}

/**
 * 📊 GET IDENTITY SLOT SIZES (for profiling / observability)
 *
 * Vráti mapu slotId → charCount bez zmeny správania.
 * Neovplyvňuje cachedTruth ani runtime loading.
 * Použitie: profiler, predvault-cut analýza.
 *
 * @returns {Array<{slotId: string, label: string, chars: number, source: string}>}
 */
export function getIdentitySlotSizes() {
  const results = [];

  for (const slot of IDENTITY_SLOTS) {
    const loaded = loadIdentitySlot(slot);
    if (!loaded) {
      results.push({ slotId: slot.id, label: slot.canonicalLabel, chars: 0, source: 'missing' });
      continue;
    }
    const totalChars = loaded.parts.reduce((sum, p) => sum + p.content.length, 0);
    results.push({
      slotId: slot.id,
      label: slot.canonicalLabel,
      chars: totalChars,
      source: loaded.source,
    });
  }

  return results;
}

/**
 * 🧪 GET IDENTITY FILE LIST (for debugging)
 *
 * Vráti zoznam legacy aj canonical .md súborov pre diagnostiku.
 */
export function getIdentityFileList() {
  try {
    const legacyBaseDir = getLegacyBaseDir();
    const canonicalRoot = getCanonicalRootDir();

    const files = fs.existsSync(legacyBaseDir)
      ? fs.readdirSync(legacyBaseDir)
        .filter(f => f.endsWith('.md'))
        .map(f => ({
          name: f,
          path: path.join(legacyBaseDir, f),
          exists: fs.existsSync(path.join(legacyBaseDir, f))
        }))
      : [];

    const canonicalFiles = IDENTITY_SLOTS
      .map(f => ({
        name: f.canonicalLabel,
        path: path.join(canonicalRoot, ...f.canonicalSegments),
        exists: fs.existsSync(path.join(canonicalRoot, ...f.canonicalSegments))
      }));

    return {
      baseDir: legacyBaseDir,
      canonicalRoot,
      files,
      canonicalFiles
    };
  } catch (err) {
    return { error: err.message };
  }
}
