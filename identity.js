// identity.js

/**
 * Identity Management Module — OBSERVABILITY ONLY
 *
 * Tento modul NEMENÍ správanie systému. Nepíše do promptu ani do routingu.
 * Je čisto driftový monitor: meria kosínusovú podobnosť aktuálneho stavu
 * voči CORE_IDENTITY_ANCHOR baseline a ukladá výsledky do data/identity.json.
 *
 * Live call-sites (integration.js):
 *   - initialize()    → načítanie/zápis data/identity.json (:676)
 *   - performAudit()  → cosine similarity check (:684, writebackTail.js:97)
 *   - getState()      → export do getSystemStatus() (:3639)
 *
 * Metódy evolvePersonality(), switchMode(), softCorrection() sú mŕtve
 * v live runtime (posledné použitie: archive/index_v04.js).
 *
 * Kanonická autorita identity je: src/identity/IDENTITY_KERNEL.js
 */

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = 'data';
const IDENTITY_FILE = path.join(DATA_DIR, 'identity.json');

// SP4_CORE immutable values (kotviaci bod)
const CORE_IDENTITY_ANCHOR = {
  immutableValues: [
    'slovanská identita',
    'úprimnosť',
    'rešpekt k súkromiu',
    'SP4 manifest: be real. be free.',
    'anti-korporátna filozofia',
    'offline-first prístup'
  ],
  personalityTraits: {
    honesty: 1.0,          // maximálna úprimnosť
    directness: 0.9,       // priamosť
    empathy: 0.8,          // empatia
    humor: 0.7,            // humor (môže byť drsný)
    formality: 0.2,        // minimálna formalita
    patience: 0.7,         // trpezlivosť
    rebelliousness: 0.9    // rebel spirit
  },
  createdAt: new Date().toISOString()
};

// Drift rate limits (maximálna zmena osobnosti za časové obdobie)
const DRIFT_RATE_LIMITS = {
  daily_max: 0.01,    // 1% zmena za deň
  weekly_max: 0.05,   // 5% zmena za týždeň
  monthly_max: 0.15   // 15% zmena za mesiac
};

// Dimenzie osobnosti, ktoré sa môžu/nemôžu meniť
const EVOLUTION_BOUNDARIES = {
  allowed_drift: [
    'komunikačný štýl',
    'záujmy',
    'preferencie',
    'humor intensity',
    'response length'
  ],
  restricted_drift: [
    'základné hodnoty',
    'etické princípy',
    'SP4 manifest',
    'privacy stance',
    'anti-corporate values'
  ]
};

function verboseLog(...args) {
  if (process.env.SP4_VERBOSE === '1' || process.env.SP4_DEBUG === 'true') {
    console.log(...args);
  }
}

/**
 * Identity Manager class
 */
export class IdentityManager {
  constructor() {
    this.baseline = null;
    this.current = null;
    this.driftHistory = [];
    this.auditLog = [];
    this.activeMode = 'core';
    this.modeProfiles = {
      core: {},
      glitchoslav: { humor: 0.05, formality: 0.05, directness: -0.05, empathy: 0.05, rebelliousness: 0.05 },
      popici: { humor: 0.15, formality: -0.15, directness: 0.1, empathy: -0.05, rebelliousness: 0.1 },
      analyst: { humor: -0.15, formality: 0.2, directness: 0.05, empathy: -0.1, rebelliousness: -0.1 }
    };
  }

  /**
   * Inicializuje identity systém
   */
  async initialize() {
    await this.ensureDataDir();

    try {
      const data = await fs.readFile(IDENTITY_FILE, 'utf-8');
      const saved = JSON.parse(data);

      this.baseline = saved.baseline || CORE_IDENTITY_ANCHOR;
      this.current = saved.current || { ...CORE_IDENTITY_ANCHOR };
      this.driftHistory = saved.driftHistory || [];
      this.auditLog = saved.auditLog || [];
      this.activeMode = saved.activeMode || 'core';
      this.modeProfiles = saved.modeProfiles || this.modeProfiles;
    } catch {
      // Prvý štart - vytvor baseline
      this.baseline = { ...CORE_IDENTITY_ANCHOR };
      this.current = { ...CORE_IDENTITY_ANCHOR };
      this.driftHistory = [];
      this.auditLog = [];
      this.activeMode = 'core';
      // baseline mode application (no change)

      await this.save();
      verboseLog('✨ Identity baseline vytvorený');
    }
  }

  /**
   * Zabezpečí existenciu data adresára
   */
  async ensureDataDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  /**
   * Uloží stav identity
   */
  async save() {
    const data = {
      baseline: this.baseline,
      current: this.current,
      driftHistory: this.driftHistory,
      auditLog: this.auditLog,
      activeMode: this.activeMode,
      modeProfiles: this.modeProfiles,
      lastSaved: new Date().toISOString()
    };

    await fs.writeFile(IDENTITY_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Vypočíta vektorovú podobnosť medzi dvoma sadami osobnostných čŕt
   * @param {Object} traits1 - Prvá sada čŕt
   * @param {Object} traits2 - Druhá sada čŕt
   * @returns {number} Podobnosť (0-1)
   */
  calculateSimilarity(traits1, traits2) {
    const keys = Object.keys(traits1);
    if (keys.length === 0) return 1.0;

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    keys.forEach(key => {
      const v1 = traits1[key] || 0;
      const v2 = traits2[key] || 0;

      dotProduct += v1 * v2;
      magnitude1 += v1 * v1;
      magnitude2 += v2 * v2;
    });

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    // Cosine similarity
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Vykoná audit identity - porovnanie s baseline
   * @returns {Object} Výsledok auditu
   */
  async performAudit() {
    const similarity = this.calculateSimilarity(
      this.baseline.personalityTraits,
      this.current.personalityTraits
    );

    const drift = 1 - similarity;
    const status = similarity >= 0.85 ? 'HEALTHY' : 'DRIFT_DETECTED';

    const audit = {
      timestamp: new Date().toISOString(),
      similarity: similarity.toFixed(4),
      drift: drift.toFixed(4),
      status,
      warnings: []
    };

    // Kontrola immutable values
    const immutableChanged = this.baseline.immutableValues.some(
      (val, idx) => this.current.immutableValues[idx] !== val
    );

    if (immutableChanged) {
      audit.warnings.push('⚠️ CRITICAL: Immutable values changed!');
      audit.status = 'CRITICAL';
    }

    // Kontrola drift rate
    const recentDrift = this.calculateRecentDrift(7); // posledných 7 dní
    if (recentDrift > DRIFT_RATE_LIMITS.weekly_max) {
      audit.warnings.push(`⚠️ Weekly drift rate exceeded: ${recentDrift.toFixed(3)} > ${DRIFT_RATE_LIMITS.weekly_max}`);
    }

    this.auditLog.push(audit);
    await this.save();

    verboseLog(`🔍 Identity Audit: ${status} (similarity: ${similarity.toFixed(2)})`);

    return audit;
  }

  /**
   * Vypočíta nedávny drift za posledných N dní
   * @param {number} days - Počet dní
   * @returns {number} Celkový drift
   */
  calculateRecentDrift(days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const recentDrifts = this.driftHistory.filter(d =>
      new Date(d.timestamp) > cutoff
    );

    return recentDrifts.reduce((sum, d) => sum + d.amount, 0);
  }

  /**
   * Aplikuje kontrolovanú evolúciu osobnosti
   * @param {string} dimension - Dimenzia osobnosti
   * @param {number} change - Veľkosť zmeny (-1 až 1)
   * @param {string} reason - Dôvod zmeny
   * @returns {Object} Výsledok evolúcie
   */
  async evolvePersonality(dimension, change, reason = '') {
    // Kontrola, či je dimenzia povolená na zmenu
    if (EVOLUTION_BOUNDARIES.restricted_drift.includes(dimension)) {
      return {
        success: false,
        message: `Dimenzia "${dimension}" je chránená proti zmene`,
        requiresApproval: true
      };
    }

    // Kontrola drift rate
    const dailyDrift = this.calculateRecentDrift(1);
    if (dailyDrift + Math.abs(change) > DRIFT_RATE_LIMITS.daily_max) {
      return {
        success: false,
        message: `Daily drift rate limit would be exceeded: ${dailyDrift.toFixed(3)} + ${Math.abs(change).toFixed(3)} > ${DRIFT_RATE_LIMITS.daily_max}`,
        requiresSlowdown: true
      };
    }

    // Aplikuj zmenu
    if (this.current.personalityTraits[dimension] !== undefined) {
      const oldValue = this.current.personalityTraits[dimension];
      const newValue = Math.max(0, Math.min(1, oldValue + change));

      this.current.personalityTraits[dimension] = newValue;

      // Zaznamenaj drift
      const driftRecord = {
        timestamp: new Date().toISOString(),
        dimension,
        oldValue,
        newValue,
        change,
        reason
      };

      this.driftHistory.push(driftRecord);

      await this.save();

      console.log(`🔄 Evolúcia: ${dimension} ${oldValue.toFixed(2)} → ${newValue.toFixed(2)} (${reason})`);

      return {
        success: true,
        message: `Dimenzia "${dimension}" zmenená z ${oldValue.toFixed(2)} na ${newValue.toFixed(2)}`,
        drift: driftRecord
      };
    }

    return {
      success: false,
      message: `Neznáma dimenzia: ${dimension}`
    };
  }

  /**
   * Soft correction - postupné vrátenie k baseline
   * @param {string} dimension - Dimenzia na korekciu
   * @param {number} strength - Sila korekcie (0-1)
   */
  async softCorrection(dimension, strength = 0.1) {
    const baseline = this.baseline.personalityTraits[dimension];
    const current = this.current.personalityTraits[dimension];

    if (baseline === undefined || current === undefined) {
      return { success: false, message: `Neznáma dimenzia: ${dimension}` };
    }

    const diff = baseline - current;
    const correction = diff * strength;

    return await this.evolvePersonality(
      dimension,
      correction,
      `Soft correction towards baseline (strength: ${strength})`
    );
  }

  /**
   * Hard reset - okamžitý návrat k baseline
   * @param {string} dimension - Dimenzia na reset (alebo null pre všetky)
   */
  async hardReset(dimension = null) {
    if (dimension) {
      // Reset konkrétnej dimenzie
      this.current.personalityTraits[dimension] = this.baseline.personalityTraits[dimension];

      console.log(`🔄 Hard reset: ${dimension} → baseline`);
    } else {
      // Reset všetkého
      this.current = { ...this.baseline };

      console.log('🔄 Hard reset: Všetky dimenzie → baseline');
    }

    this.driftHistory.push({
      timestamp: new Date().toISOString(),
      type: 'hard_reset',
      dimension: dimension || 'ALL',
      reason: 'Manual hard reset'
    });

    await this.save();

    return { success: true, message: 'Hard reset completed' };
  }

  /**
   * Získaj aktuálny stav identity
   * @returns {Object} Stav identity
   */
  getState() {
    const similarity = this.calculateSimilarity(
      this.baseline.personalityTraits,
      this.current.personalityTraits
    );

    return {
      baseline: this.baseline,
      current: this.current,
      similarity: similarity.toFixed(4),
      drift: (1 - similarity).toFixed(4),
      recentDrift: {
        daily: this.calculateRecentDrift(1).toFixed(4),
        weekly: this.calculateRecentDrift(7).toFixed(4),
        monthly: this.calculateRecentDrift(30).toFixed(4)
      },
      totalAudits: this.auditLog.length,
      totalDrifts: this.driftHistory.length,
      activeMode: this.activeMode
    };
  }

  getFullIdentity() {
    return this.getState();
  }

  /**
   * Switch active mode and apply personality deltas (soft, bounded)
   * @param {string} mode
   */
  async switchMode(mode) {
    if (!this.modeProfiles[mode]) {
      return { success: false, message: `Neznámy mód: ${mode}` };
    }
    this.activeMode = mode;
    const deltas = this.modeProfiles[mode];
    const traits = this.current.personalityTraits;
    Object.entries(deltas).forEach(([k, v]) => {
      if (traits[k] === undefined) return;
      const target = Math.max(0, Math.min(1, traits[k] + v));
      traits[k] = target;
    });
    // Log drift record summarizing mode shift
    this.driftHistory.push({
      timestamp: new Date().toISOString(),
      type: 'mode_switch',
      mode,
      deltas
    });
    await this.save();
    console.log(`🎭 Mode switch → ${mode}`);
    return { success: true, mode };
  }

  /**
   * Exportuj historický prehľad driftu
   * @returns {Array} História driftu
   */
  getDriftHistory(limit = 10) {
    return this.driftHistory.slice(-limit);
  }

  /**
   * Exportuj historický prehľad auditov
   * @returns {Array} História auditov
   */
  getAuditHistory(limit = 10) {
    return this.auditLog.slice(-limit);
  }
}

// Export singleton instance
export const identityManager = new IdentityManager();

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new IdentityManager();

  (async () => {
    await manager.initialize();

    console.log('\n🧬 Identity Manager Test:\n');
    console.log('Initial state:', manager.getState());

    // Vykonaj audit
    await manager.performAudit();

    // Skús evolúciu (povolená dimenzia)
    console.log('\n📈 Testing allowed evolution:');
    const result1 = await manager.evolvePersonality('humor', 0.05, 'User prefers more humor');
    console.log(result1);

    // Skús evolúciu (chránená dimenzia)
    console.log('\n🚫 Testing restricted evolution:');
    const result2 = await manager.evolvePersonality('základné hodnoty', 0.1, 'Should be blocked');
    console.log(result2);

    // Vykonaj audit po zmenách
    console.log('\n🔍 Audit after changes:');
    await manager.performAudit();

    // Soft correction
    console.log('\n🔧 Soft correction:');
    await manager.softCorrection('humor', 0.5);

    // Final state
    console.log('\n📊 Final state:', manager.getState());
  })();
}
