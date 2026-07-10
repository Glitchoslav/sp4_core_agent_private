// emotionalProcessor.js

/**
 * Emotional Processor Module
 * Detects, processes, and adjusts emotional content with circuit breakers and grounding routines.
 * v0.8.7: Integrated SP4 hope whispers for pain detection
 */

import { getRandomSp4Tagline } from './src/core/sp4Manifest.js';

// Emotional intensity thresholds
const THRESHOLDS = {
  LOW: 0.3,
  MEDIUM: 0.5,
  HIGH: 0.7,
  CRITICAL: 0.9
};

// Circuit breaker states
const BREAKER_STATES = {
  CLOSED: 'closed',      // Normal operation
  OPEN: 'open',          // Emotional overload detected
  HALF_OPEN: 'half_open' // Testing recovery
};

/**
 * Emotional Processor class
 */
export class EmotionalProcessor {
  constructor() {
    this.state = {
      circuitBreaker: BREAKER_STATES.CLOSED,
      emotionalLoad: 0.0,
      lastGrounding: null,
      consecutiveHighEmotions: 0,
      recoveryMode: false
    };

    this.emotionalKeywords = {
      negative: ['smrť', 'trauma', 'strach', 'panika', 'zlyhanie', 'chaos', 'bolesť', 'zúfalstvo', 'beznádej'],
      positive: ['radosť', 'nádej', 'úspech', 'láska', 'pokoj', 'šťastie', 'sloboda'],
      intense: ['kurva', 'kokot', 'srať', 'piča', 'extrémne', 'absolútne', 'vždy', 'nikdy']
    };
  }

  /**
   * Detect emotional intensity in text
   * ENHANCED v0.7.0 - BAD Labs Integration (Walter)
   * 
   * @param {string} text - Text to analyze
   * @returns {number} Emotional intensity score (0-1)
   */
  detectEmotionalIntensity(text) {
    if (!text) return 0;

    const lowerText = text.toLowerCase();
    const normalizedText = text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove diacritics
    let intensity = 0;
    let wordCount = text.split(/\s+/).length;

    // Count negative keywords
    const negativeCount = this.emotionalKeywords.negative.filter(w => lowerText.includes(w)).length;
    intensity += negativeCount * 0.15;

    // Count intense language
    const intenseCount = this.emotionalKeywords.intense.filter(w => lowerText.includes(w)).length;
    intensity += intenseCount * 0.1;

    // 🔥 NEW: Vulgar words detection (BAD Labs)
    const vulgarWords = ['piča', 'pica', 'kokot', 'kurva', 'jebať', 'jebat', 'srať', 'srat',
      'pičus', 'picus', 'do riti', 'do piče', 'do pice', 'do piči', 'do pici'];
    const vulgarCount = vulgarWords.filter(word => normalizedText.toLowerCase().includes(word)).length;
    intensity += vulgarCount * 0.2;

    // 🔥 NEW: Punctuation repetition (BAD Labs)
    const punctuationRepetition = /([?!])\1+/g;
    const punctMatches = (text.match(punctuationRepetition) || []);
    const punctScore = punctMatches.reduce((score, match) => score + (match.length * 0.05), 0);
    intensity += punctScore;

    // 🔥 NEW: Emoji intensity (BAD Labs)
    const highIntensityEmoji = ['🔥', '💥', '🤬', '😡', '💢', '⚡', '😤', '😠', '👊'];
    const emojiCount = highIntensityEmoji.filter(emoji => text.includes(emoji)).length;
    intensity += emojiCount * 0.15;

    // Check for CAPS (shouting)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    intensity += capsRatio * 0.3;

    // Check for exclamation marks (original)
    const exclamationCount = (text.match(/!/g) || []).length;
    intensity += (exclamationCount / wordCount) * 0.2;

    // 🔥 KEFYK FIX v2.0: COMBINED INTENSITY BOOST
    // Ak 2+ kategórie (vulgar + punctuation + emoji) → +0.25 bonus
    const categories = [];
    if (vulgarCount > 0) categories.push('vulgar');
    if (punctMatches.length > 0) categories.push('punctuation');
    if (emojiCount > 0) categories.push('emoji');
    if (capsRatio > 0.3) categories.push('caps');

    if (categories.length >= 2) {
      const combinedBonus = 0.25;
      intensity += combinedBonus;
      console.log(`   🔥 COMBINED INTENSITY BOOST: ${categories.length} categories (${categories.join(', ')}) → +${combinedBonus}`);
    }

    // Normalize to 0-1
    return Math.min(intensity, 1.0);
  }

  /**
   * Analyze emotional content and update circuit breaker
   * @param {string} text - Text to analyze
   * @returns {Object} Analysis result with intensity, action, and emotional tags
   */
  analyzeEmotionalContent(text) {
    const intensity = this.detectEmotionalIntensity(text);
    this.state.emotionalLoad = intensity;

    // 🧠 NEW: Detect specific deep emotions for model routing
    const lowerText = text.toLowerCase();
    let emotionalTag = 'neutral';

    // EMPATIA triggers (expanded set)
    if (lowerText.match(/smrť|umier|zomrel|pochov/)) {
      emotionalTag = 'grief';
    } else if (lowerText.match(/trauma|týr|zneuživ|násil/)) {
      emotionalTag = 'trauma';
    } else if (lowerText.match(/prázdnot|prázdny|prázdno|nemá.*zmysel|bez.*zmysl/)) {
      emotionalTag = 'empty';
    } else if (lowerText.match(/sám|samot|opusten|nikto|nik.*ma/)) {
      emotionalTag = 'lonely';
    } else if (lowerText.match(/beznádej|zúfal|nevládz|už.*neviem/)) {
      emotionalTag = 'despair';
    } else if (lowerText.match(/bolesť|bolí|trpím|všetko.*bolí/)) {
      emotionalTag = 'deep_pain';
    } else if (lowerText.match(/unavený|vyčerpan|už.*nemôžem|stratený|neviem.*ďalej/)) {
      emotionalTag = 'tired';
    } else if (lowerText.match(/bojujem.*sám|bojujem.*so.*sebou/)) {
      emotionalTag = 'lost';
    }

    // Update consecutive high emotions counter
    if (intensity >= THRESHOLDS.HIGH) {
      this.state.consecutiveHighEmotions++;
    } else if (intensity < THRESHOLDS.MEDIUM) {
      this.state.consecutiveHighEmotions = 0;
    }

    // Determine action based on intensity and state
    let action = 'normal';
    let shouldGround = false;

    if (intensity >= THRESHOLDS.CRITICAL || this.state.consecutiveHighEmotions >= 3) {
      this.openCircuitBreaker();
      action = 'emergency_grounding';
      shouldGround = true;
    } else if (intensity >= THRESHOLDS.HIGH) {
      action = 'activate_grounding';
      shouldGround = true;
    } else if (intensity >= THRESHOLDS.MEDIUM) {
      action = 'monitor_closely';
    }

    return {
      intensity,
      level: this.getIntensityLevel(intensity),
      action,
      shouldGround,
      emotionalTag, // 🧠 NEW: for model routing
      dominantEmotion: emotionalTag, // alias for backward compatibility
      circuitBreakerState: this.state.circuitBreaker,
      recommendation: this.getRecommendation(intensity, action)
    };
  }

  /**
   * Get intensity level label
   * @param {number} intensity - Intensity score
   * @returns {string} Level label
   */
  getIntensityLevel(intensity) {
    if (intensity >= THRESHOLDS.CRITICAL) return 'CRITICAL';
    if (intensity >= THRESHOLDS.HIGH) return 'HIGH';
    if (intensity >= THRESHOLDS.MEDIUM) return 'MEDIUM';
    if (intensity >= THRESHOLDS.LOW) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Open circuit breaker (emotional overload protection)
   */
  openCircuitBreaker() {
    if (this.state.circuitBreaker !== BREAKER_STATES.OPEN) {
      console.warn('⚠️ CIRCUIT BREAKER OPEN: Emotional overload detected');
      this.state.circuitBreaker = BREAKER_STATES.OPEN;
      this.state.recoveryMode = true;
    }
  }

  /**
   * Close circuit breaker (return to normal)
   */
  closeCircuitBreaker() {
    console.log('✅ CIRCUIT BREAKER CLOSED: Returning to normal operation');
    this.state.circuitBreaker = BREAKER_STATES.CLOSED;
    this.state.recoveryMode = false;
    this.state.consecutiveHighEmotions = 0;
  }

  /**
   * Grounding routine - return to factual anchoring
   * v0.8.7: Enhanced with SP4 hope whispers for deep pain
   * @param {string} context - Current context
   * @returns {Object} Grounding response
   */
  activateGroundingRoutine(context = '') {
    this.state.lastGrounding = new Date().toISOString();

    const groundingStrategies = [
      {
        name: 'factual_anchoring',
        prompt: 'Vráťme sa k faktom. Čo presne sa deje teraz, v tejto chvíli?'
      },
      {
        name: 'breath_reset',
        prompt: 'Zastav. Tri hlboké nádychy. Potom mi povedz, čo potrebuješ.'
      },
      {
        name: 'perspective_shift',
        prompt: 'Keby si sa pozrel na toto z odstupu, čo by si videl?'
      },
      {
        name: 'sp4_tribe_anchor', // 🔥 NEW: SP4 hope whisper
        prompt: `Nie si sám. Si súčasť kmeňa.\n\n${getRandomSp4Tagline()}`
      }
    ];

    // 🔥 SP4 ENHANCEMENT: Pre vysokú intenzitu pridaj tribe whisper
    const intensity = this.detectEmotionalIntensity(context);
    const shouldInjectHope = intensity >= THRESHOLDS.HIGH;

    const strategy = shouldInjectHope
      ? groundingStrategies[3] // sp4_tribe_anchor
      : groundingStrategies[Math.floor(Math.random() * 3)];

    return {
      strategy: strategy.name,
      prompt: strategy.prompt,
      timestamp: this.state.lastGrounding,
      sp4Hope: shouldInjectHope // flag for integration layer
    };
  }

  /**
   * Get recommendation based on intensity
   * @param {number} intensity - Emotional intensity
   * @param {string} action - Recommended action
   * @returns {string} Recommendation text
   */
  getRecommendation(intensity, action) {
    const recommendations = {
      'normal': 'Pokračuj v normálnej konverzácii.',
      'monitor_closely': 'Sleduj emočný stav. Buď pripravený na grounding.',
      'activate_grounding': 'Aktivuj grounding rutinu. Vráť sa k faktom.',
      'emergency_grounding': 'NÚDZOVÉ UKOTVENIE. Zastav emočné spracovanie. Fokus na bezpečnosť.'
    };

    return recommendations[action] || recommendations.normal;
  }

  /**
   * Recovery protocol - gradual return to normal
   */
  initiateRecovery() {
    if (this.state.circuitBreaker === BREAKER_STATES.OPEN) {
      console.log('🔄 Initiating recovery protocol...');
      this.state.circuitBreaker = BREAKER_STATES.HALF_OPEN;

      // After successful processing, close breaker
      setTimeout(() => {
        if (this.state.emotionalLoad < THRESHOLDS.MEDIUM) {
          this.closeCircuitBreaker();
        }
      }, 5000);
    }
  }

  /**
   * Get current processor state
   * @returns {Object} Current state
   */
  getState() {
    return {
      ...this.state,
      status: this.state.circuitBreaker === BREAKER_STATES.OPEN ? 'PROTECTION_MODE' : 'NORMAL'
    };
  }
}

// Export singleton instance
export const emotionalProcessor = new EmotionalProcessor();

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const processor = new EmotionalProcessor();

  const testTexts = [
    'Dnes je krásny deň a cítim sa dobre.',
    'KURVA, toto ma SRÁ! Všetko sa rozpadá!!!',
    'Mám strach z budúcnosti, ale snažím sa zostať v pohode.',
    'PANIKA! CHAOS! VŠETKO ZLYHALO! BEZNÁDEJ!'
  ];

  console.log('\n🧠 Emotional Processor Test:\n');
  testTexts.forEach((text, i) => {
    console.log(`\nTest ${i + 1}: "${text}"`);
    const analysis = processor.analyzeEmotionalContent(text);
    console.log(`Intensity: ${analysis.intensity.toFixed(2)} (${analysis.level})`);
    console.log(`Action: ${analysis.action}`);
    console.log(`Recommendation: ${analysis.recommendation}`);

    if (analysis.shouldGround) {
      const grounding = processor.activateGroundingRoutine(text);
      console.log(`Grounding: ${grounding.prompt}`);
    }
  });

  console.log('\n📊 Final State:', processor.getState());
}
