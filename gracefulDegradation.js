// gracefulDegradation.js

/**
 * Graceful Degradation Module
 * Manages capability levels, transitions, and recovery mechanisms.
 */


// Capability levels (od najvyššej po najnižšiu)
const CAPABILITY_LEVELS = {
  FULL: {
    name: 'full_capability',
    features: [
      'all_features_enabled',
      'multi_voice_trinity',
      'deep_memory_access',
      'complex_reasoning',
      'emotional_processing',
      'ritual_execution'
    ],
    requirements: ['stable_connection', 'sufficient_context', 'emotional_stability'],
    description: 'Plná funkčnosť - všetky features aktívne'
  },
  REDUCED: {
    name: 'reduced_capability',
    features: [
      'core_functions_only',
      'simplified_responses',
      'basic_memory_access',
      'increased_clarification_requests'
    ],
    triggers: ['partial_context_loss', 'mild_emotional_overload'],
    description: 'Redukovaná funkčnosť - len základné features'
  },
  BASIC: {
    name: 'basic_capability',
    features: [
      'essential_functions_only',
      'template_responses',
      'minimal_memory_access',
      'explicit_limitations_disclosure'
    ],
    triggers: ['significant_context_loss', 'moderate_emotional_overload'],
    description: 'Základná funkčnosť - len nevyhnutné operácie'
  },
  SAFE: {
    name: 'safety_mode',
    features: [
      'predefined_responses_only',
      'human_escalation',
      'recovery_initiation',
      'no_complex_processing'
    ],
    triggers: ['critical_failure', 'severe_emotional_overload', 'system_instability'],
    description: 'Bezpečný režim - minimálna funkčnosť, ochrana stability'
  }
};

/**
 * Graceful Degradation Manager
 */
export class GracefulDegradationManager {
  constructor() {
    this.currentLevel = 'FULL';
    this.degradationHistory = [];
    this.contextHealth = 1.0;      // 0-1 skóre zdravia kontextu
    this.systemStability = 1.0;    // 0-1 skóre stability systému
    this.emotionalLoad = 0.0;      // 0-1 skóre emocionálneho zaťaženia
  }

  /**
   * Aktualizuje health metriky
   * @param {Object} metrics - Metriky na aktualizáciu
   */
  updateMetrics(metrics = {}) {
    if (metrics.contextHealth !== undefined) {
      this.contextHealth = Math.max(0, Math.min(1, metrics.contextHealth));
    }
    if (metrics.systemStability !== undefined) {
      this.systemStability = Math.max(0, Math.min(1, metrics.systemStability));
    }
    if (metrics.emotionalLoad !== undefined) {
      this.emotionalLoad = Math.max(0, Math.min(1, metrics.emotionalLoad));
    }
  }

  /**
   * Vyhodnotí potrebu degradácie/upgradu
   * @returns {Object} Odporúčaná úroveň a dôvod
   */
  evaluateCapabilityLevel() {
    // SAFE mode triggers
    if (this.systemStability < 0.3 || this.emotionalLoad > 0.9) {
      return {
        recommended: 'SAFE',
        reason: 'Critical system instability or severe emotional overload',
        urgency: 'CRITICAL'
      };
    }

    // BASIC mode triggers
    if (this.contextHealth < 0.4 || this.emotionalLoad > 0.7) {
      return {
        recommended: 'BASIC',
        reason: 'Significant context loss or moderate emotional overload',
        urgency: 'HIGH'
      };
    }

    // REDUCED mode triggers
    if (this.contextHealth < 0.6 || this.emotionalLoad > 0.5) {
      return {
        recommended: 'REDUCED',
        reason: 'Partial context loss or mild emotional overload',
        urgency: 'MEDIUM'
      };
    }

    // FULL capability conditions
    if (this.contextHealth >= 0.8 && this.systemStability >= 0.8 && this.emotionalLoad < 0.3) {
      return {
        recommended: 'FULL',
        reason: 'All systems stable, full capability available',
        urgency: 'LOW'
      };
    }

    // Zostať na aktuálnej úrovni
    return {
      recommended: this.currentLevel,
      reason: 'Maintaining current capability level',
      urgency: 'LOW'
    };
  }

  /**
   * Vykoná degradáciu na nižšiu úroveň
   * @param {string} targetLevel - Cieľová úroveň
   * @param {string} reason - Dôvod degradácie
   * @returns {Object} Výsledok degradácie
   */
  async degradeToLevel(targetLevel, reason = '') {
    const levelOrder = ['FULL', 'REDUCED', 'BASIC', 'SAFE'];
    const currentIndex = levelOrder.indexOf(this.currentLevel);
    const targetIndex = levelOrder.indexOf(targetLevel);

    if (targetIndex < 0) {
      return {
        success: false,
        message: `Neplatná úroveň: ${targetLevel}`
      };
    }

    if (targetIndex <= currentIndex) {
      return {
        success: false,
        message: 'Nie je potrebná degradácia - cieľová úroveň je rovnaká alebo vyššia'
      };
    }

    // Postupná degradácia (step-by-step)
    const steps = [];
    for (let i = currentIndex + 1; i <= targetIndex; i++) {
      steps.push(levelOrder[i]);
    }

    console.log(`⬇️ Degradácia: ${this.currentLevel} → ${targetLevel}`);
    console.log(`📋 Kroky: ${steps.join(' → ')}`);
    console.log(`❓ Dôvod: ${reason}`);

    this.currentLevel = targetLevel;

    this.degradationHistory.push({
      timestamp: new Date().toISOString(),
      from: levelOrder[currentIndex],
      to: targetLevel,
      reason,
      metrics: {
        contextHealth: this.contextHealth,
        systemStability: this.systemStability,
        emotionalLoad: this.emotionalLoad
      }
    });

    return {
      success: true,
      message: `Degradácia na ${targetLevel} úspešná`,
      steps,
      level: CAPABILITY_LEVELS[targetLevel]
    };
  }

  /**
   * Vykoná upgrade na vyššiu úroveň
   * @param {string} targetLevel - Cieľová úroveň
   * @param {string} reason - Dôvod upgradu
   * @returns {Object} Výsledok upgradu
   */
  async upgradeToLevel(targetLevel, reason = '') {
    const levelOrder = ['FULL', 'REDUCED', 'BASIC', 'SAFE'];
    const currentIndex = levelOrder.indexOf(this.currentLevel);
    const targetIndex = levelOrder.indexOf(targetLevel);

    if (targetIndex < 0) {
      return {
        success: false,
        message: `Neplatná úroveň: ${targetLevel}`
      };
    }

    if (targetIndex >= currentIndex) {
      return {
        success: false,
        message: 'Nie je možný upgrade - cieľová úroveň je rovnaká alebo nižšia'
      };
    }

    // Opatrná obnova (postupná)
    const steps = [];
    for (let i = currentIndex - 1; i >= targetIndex; i--) {
      steps.push(levelOrder[i]);
    }

    console.log(`⬆️ Upgrade: ${this.currentLevel} → ${targetLevel}`);
    console.log(`📋 Kroky: ${steps.join(' → ')}`);
    console.log(`❓ Dôvod: ${reason}`);

    this.currentLevel = targetLevel;

    this.degradationHistory.push({
      timestamp: new Date().toISOString(),
      from: levelOrder[currentIndex],
      to: targetLevel,
      reason,
      type: 'upgrade',
      metrics: {
        contextHealth: this.contextHealth,
        systemStability: this.systemStability,
        emotionalLoad: this.emotionalLoad
      }
    });

    return {
      success: true,
      message: `Upgrade na ${targetLevel} úspešný`,
      steps,
      level: CAPABILITY_LEVELS[targetLevel]
    };
  }

  /**
   * Automatická adaptácia podľa metrík
   * @returns {Object} Výsledok adaptácie
   */
  async autoAdapt() {
    const evaluation = this.evaluateCapabilityLevel();

    if (evaluation.recommended !== this.currentLevel) {
      const levelOrder = ['FULL', 'REDUCED', 'BASIC', 'SAFE'];
      const currentIndex = levelOrder.indexOf(this.currentLevel);
      const targetIndex = levelOrder.indexOf(evaluation.recommended);

      if (targetIndex > currentIndex) {
        // Degradácia - robíme len JEDEN krok naraz (step-by-step)
        const nextLevel = levelOrder[currentIndex + 1];
        return await this.degradeToLevel(nextLevel, evaluation.reason);
      } else if (targetIndex < currentIndex) {
        // Upgrade - robíme len JEDEN krok naraz (step-by-step)
        const nextLevel = levelOrder[currentIndex - 1];
        return await this.upgradeToLevel(nextLevel, evaluation.reason);
      }
    }

    return {
      success: true,
      message: 'Žiadna zmena úrovne nie je potrebná',
      currentLevel: this.currentLevel
    };
  }

  /**
   * Recovery protokol - postupný návrat do plnej funkčnosti
   * @returns {Object} Výsledok recovery
   */
  async initiateRecovery() {
    console.log('🔄 Spúšťam recovery protokol...');

    // Krok 1: Stabilizácia emócií
    if (this.emotionalLoad > 0.5) {
      console.log('  1️⃣ Stabilizácia emócií...');
      // TODO: Integrácia s emotionalProcessor
      this.emotionalLoad *= 0.7; // Simulácia tlmenia
    }

    // Krok 2: Obnova kontextu
    if (this.contextHealth < 0.8) {
      console.log('  2️⃣ Obnova kontextu...');
      this.contextHealth = Math.min(1.0, this.contextHealth + 0.2);
    }

    // Krok 3: Overenie stability
    console.log('  3️⃣ Overenie stability systému...');
    this.systemStability = Math.min(1.0, this.systemStability + 0.1);

    // Krok 4: Postupný upgrade
    const evaluation = this.evaluateCapabilityLevel();
    if (evaluation.recommended !== this.currentLevel) {
      console.log(`  4️⃣ Upgrade na ${evaluation.recommended}...`);
      return await this.upgradeToLevel(evaluation.recommended, 'Recovery protocol completed');
    }

    return {
      success: true,
      message: 'Recovery protokol dokončený',
      currentLevel: this.currentLevel,
      metrics: {
        contextHealth: this.contextHealth,
        systemStability: this.systemStability,
        emotionalLoad: this.emotionalLoad
      }
    };
  }

  /**
   * Získaj user-friendly notifikáciu o aktuálnom stave
   * @returns {string} Notifikácia
   */
  getUserNotification() {
    const level = CAPABILITY_LEVELS[this.currentLevel];

    const notifications = {
      FULL: '✅ Systém beží v plnej kapacite.',
      REDUCED: '⚠️ Systém je v režime redukovanej funkčnosti. Niektoré funkcie sú obmedzené.',
      BASIC: '⚠️ Systém je v základnom režime. Len nevyhnutné funkcie sú aktívne.',
      SAFE: '🚨 Systém je v bezpečnom režime. Komplexné spracovanie je pozastavené.'
    };

    return notifications[this.currentLevel] || notifications.FULL;
  }

  /**
   * Získaj aktuálny stav
   * @returns {Object} Stav degradation managera
   */
  getState() {
    return {
      currentLevel: this.currentLevel,
      levelInfo: CAPABILITY_LEVELS[this.currentLevel],
      metrics: {
        contextHealth: this.contextHealth.toFixed(2),
        systemStability: this.systemStability.toFixed(2),
        emotionalLoad: this.emotionalLoad.toFixed(2)
      },
      notification: this.getUserNotification(),
      historyCount: this.degradationHistory.length
    };
  }

  /**
   * Získaj históriu degradácií/upgradov
   * @param {number} limit - Max počet záznamov
   * @returns {Array} História
   */
  getHistory(limit = 10) {
    return this.degradationHistory.slice(-limit);
  }
}

// Export singleton instance
export const gracefulDegradationManager = new GracefulDegradationManager();

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new GracefulDegradationManager();

  (async () => {
    console.log('\n⚡ Graceful Degradation Manager Test:\n');
    console.log('Initial state:', manager.getState());

    // Simulácia emocionálneho preťaženia
    console.log('\n📉 Simulácia emocionálneho preťaženia:');
    manager.updateMetrics({ emotionalLoad: 0.8 });
    await manager.autoAdapt();
    console.log('State after emotional overload:', manager.getState());

    // Simulácia kritického zlyhania
    console.log('\n💥 Simulácia kritického zlyhania:');
    manager.updateMetrics({ systemStability: 0.2 });
    await manager.autoAdapt();
    console.log('State after critical failure:', manager.getState());

    // Recovery protokol
    console.log('\n🔄 Spúšťam recovery protokol:');
    await manager.initiateRecovery();
    console.log('State after recovery:', manager.getState());

    console.log('\n📊 History:', manager.getHistory());
  })();
}
