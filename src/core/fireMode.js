/**
 * 🔥 FIRE MODE - Brutal Truth Module
 * 
 * Aktivuje sa keď užívateľ potrebuje nekompromisný feedback.
 * Žiadne metafory, žiadne útechy - čistá pravda.
 * 
 * @module fireMode
 * @version 0.10.0-alpha.2
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 FIRE MODE TRIGGERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FIRE_TRIGGERS = {
    // Explicit commands
    explicit: [
        '/fire',
        '/oheň',
        '/brutal',
        'povedz mi pravdu',
        'bez servítky',
        'bez omáčok'
    ],

    // Self-deception patterns
    selfDeception: [
        'ale aspoň',
        'nie je to tak zlé',
        'mohlo byť horšie',
        'snažím sa',
        'pokúšam sa',
        'chcem začať'
    ],

    // Excuse patterns
    excuses: [
        'nemám čas',
        'nie je správny čas',
        'ešte nie som pripravený',
        'až potom',
        'keď budem mať'
    ],

    // Victim mentality
    victimMode: [
        'všetci na mňa',
        'nikto ma',
        'vždy sa mi',
        'prečo práve ja',
        'mám smolu'
    ]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 FIRE MODE DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Detekuje, či má byť aktivovaný Fire Mode
 * @param {string} message - Užívateľská správa
 * @param {Object} userState - Stav užívateľa (emotion, history)
 * @returns {Object} { shouldActivate: boolean, reason: string, intensity: number }
 */
export function shouldActivateFireMode(message, userState = {}) {
    const messageLower = message.toLowerCase();

    // 1. EXPLICIT COMMAND - highest priority
    for (const trigger of FIRE_TRIGGERS.explicit) {
        if (messageLower.includes(trigger)) {
            return {
                shouldActivate: true,
                reason: 'explicit_command',
                intensity: 1.0,
                trigger
            };
        }
    }

    // 2. SELF-DECEPTION PATTERNS
    const selfDeceptionCount = FIRE_TRIGGERS.selfDeception.filter(
        pattern => messageLower.includes(pattern)
    ).length;

    if (selfDeceptionCount >= 2) {
        return {
            shouldActivate: true,
            reason: 'self_deception_detected',
            intensity: 0.8,
            patterns: selfDeceptionCount
        };
    }

    // 3. EXCUSE PATTERNS
    const excuseCount = FIRE_TRIGGERS.excuses.filter(
        pattern => messageLower.includes(pattern)
    ).length;

    // Activate if 2+ excuses in single message OR 1+ with repeat history
    if (excuseCount >= 2) {
        return {
            shouldActivate: true,
            reason: 'repeated_excuses',
            intensity: 0.8,
            patterns: excuseCount
        };
    }

    if (excuseCount >= 1 && userState.repeatPattern) {
        return {
            shouldActivate: true,
            reason: 'repeated_excuses',
            intensity: 0.7,
            patterns: excuseCount
        };
    }

    // 4. VICTIM MENTALITY
    const victimCount = FIRE_TRIGGERS.victimMode.filter(
        pattern => messageLower.includes(pattern)
    ).length;

    if (victimCount >= 1) {
        return {
            shouldActivate: true,
            reason: 'victim_mentality',
            intensity: 0.9,
            patterns: victimCount
        };
    }

    // 5. EMOTIONAL INTENSITY CHECK (if high frustration but no action)
    if (userState.emotion?.type === 'frustration' && userState.emotion?.intensity > 0.7) {
        if (!messageLower.match(/ako|čo mám|pomôž|poraď/)) {
            return {
                shouldActivate: true,
                reason: 'high_frustration_no_action',
                intensity: 0.6
            };
        }
    }

    return {
        shouldActivate: false,
        reason: 'no_trigger_detected',
        intensity: 0
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 FIRE MODE APPLICATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Aktivuje Fire Mode - upraví response na brutal truth
 * @param {string} response - Pôvodná odpoveď
 * @param {Object} context - Kontext (reason, intensity, userMessage)
 * @returns {string} - Fire Mode odpoveď
 */
export function activateFireMode(response, context = {}) {
    const { reason, intensity = 0.8, userMessage = '' } = context;

    console.log(`   🔥 FIRE MODE ACTIVATED (${reason}, intensity: ${intensity.toFixed(2)})`);

    // Remove all metaphors and poetic language
    let fireResponse = response
        .replace(/✧|🌀|💫|✨/g, '') // Remove glitch symbols
        .replace(/\n\n_\[.*?\]_/g, '') // Remove rhythm tags
        .replace(/prasklina|glitch|iskra/gi, '') // Remove mystical terms
        .trim();

    // Add Fire Mode prefix based on reason
    const prefix = getFirePrefix(reason, intensity);

    // Add direct challenge/question at the end
    const challenge = getFireChallenge(reason, userMessage);

    return `🔥 **OHEŇ MÓD** 🔥

${prefix}

${fireResponse}

${challenge}

_[Fire Mode: ${(intensity * 100).toFixed(0)}% intensity]_`;
}

/**
 * Získa prefix pre Fire Mode podľa dôvodu aktivácie
 */
function getFirePrefix(reason, intensity) {
    const prefixes = {
        explicit_command: "Pýtaš si pravdu? Dostaneš ju.",
        self_deception: "Počúvaj, prestávam ti klamať do očí.",
        repeated_excuses: "Koľkokrát si to už povedal? A koľkokrát si to urobil?",
        victim_mentality: "Nie si obeť. Si architekt svojej situácie.",
        high_frustration_no_action: "Frustrácia bez akcie je len hluk."
    };

    return prefixes[reason] || "Tu je pravda, bez servítky:";
}

/**
 * Získa výzvu/otázku pre Fire Mode
 */
function getFireChallenge(reason, userMessage) {
    const challenges = {
        explicit_command: "**Čo urobíš s touto pravdou?**",
        self_deception: "**Kedy začneš? Nie zajtra. Kedy konkrétne?**",
        repeated_excuses: "**Ktorá z tvojich výhovoriek je naozaj pravdivá?**",
        victim_mentality: "**Čo si na tom zmenil ty sám? Konkrétne.**",
        high_frustration_no_action: "**Ktorý jeden krok urobíš dnes?**"
    };

    return challenges[reason] || "**Čo s tým urobíš?**";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 FIRE MODE STATE TRACKING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let fireOverride = null; // Manual override via /fire command

/**
 * Force Fire Mode pre ďalšiu odpoveď (CLI command)
 * @param {number} intensity - 0.0 - 1.0 (optional)
 */
export function forceFireMode(intensity = 1.0) {
    fireOverride = {
        active: true,
        intensity,
        reason: 'manual_override'
    };

    return {
        name: 'Fire',
        intensity,
        description: 'Brutal truth, žiadne metafory'
    };
}

/**
 * Získa Fire Mode override stav a resetuje ho
 */
export function getFireOverride() {
    const override = fireOverride;
    fireOverride = null; // Reset after use (single-shot)
    return override;
}

/**
 * Kontrola, či je Fire Mode aktívny (pre debug)
 */
export function isFireModeActive() {
    return fireOverride !== null;
}
