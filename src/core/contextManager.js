/**
 * SP4 CONTEXT MANAGER v0.7.0
 * 
 * Implementácia agent locking z BAD Labs (Walter) spolupráce.
 * 
 * **Účel:**
 * - Zabráni chaotickému skákaniu medzi módmi
 * - Drží kontext rozhovoru (agent lock)
 * - Vyžaduje silnejší signál pre zmenu módu
 * 
 * **Algoritmus:**
 * 1. Prvý vstup → vyber mód podľa detekcie (bez locku)
 * 2. Ďalšie vstupy → drž locked mode, ak newConfidence < changeThreshold
 * 3. Lock slabne o 0.08 každou správou
 * 4. Ak newConfidence > lockStrength × 1.3 → unlock + zmena módu
 * 
 * **Príklad:**
 * - Msg 1: "Som smutný" → EMPATIA (lock 0.7)
 * - Msg 2: "Ako si?" → zostáva EMPATIA (weak signal)
 * - Msg 3: "Popiči kokot!" → POPICI (strong signal 0.9 > 0.7×1.3)
 * 
 * @author Kefyk (SP4 Community) + Walter (BAD Labs)
 * @version 0.7.0
 * @date 2025-11-17
 */

export class SP4ContextManager {
    constructor(config = {}) {
        // 🔧 KEFYK FIX v2.0: Lock strength znížený z 0.7 na 0.5
        // Dôvod: SP4 štýl konverzácie potrebuje citlivejší lock pre POPIČI mód
        this.initialLockStrength = config.initialLockStrength || 0.5; // bolo 0.7
        this.minLockStrength = config.minLockStrength || 0.2;
        this.lockDecayRate = config.lockDecayRate || 0.08; // per message
        this.changeThresholdMultiplier = config.changeThresholdMultiplier || 1.3;

        // Súčasný stav
        this.currentMode = null;
        this.modeLockStrength = 0;
        this.messagesSinceLastChange = 0;
        this.manualOverride = false; // v0.9.0: Prevents auto mode switching when user manually set mode
        this.lastUserInput = null; // 🔥 WALTER: User input tracking for debugging

        // História (max 20 záznamov)
        this.conversationHistory = [];
        this.maxHistorySize = config.maxHistorySize || 20;

        // Štatistiky
        this.stats = {
            totalModeChanges: 0,
            modeDistribution: {},
            averageLockDuration: 0,
            lastChangeReason: null
        };

        this._log('📋 SP4ContextManager initialized');
        this._log(`   Lock: ${this.initialLockStrength} → ${this.minLockStrength} (decay: ${this.lockDecayRate})`);
        this._log(`   Change threshold: ${this.changeThresholdMultiplier}x`);
    }

    _log(...args) {
        if (process.env.SP4_VERBOSE === '1' || process.env.SP4_DEBUG === 'true') {
            console.log(...args);
        }
    }

    /**
     * Rozhodne, či zmeniť mód na základe novej detekcie.
     * 
     * @param {string} detectedMode - Novo detekovaný mód
     * @param {number} confidence - Confidence score (0-1)
     * @param {string} userInput - Text od užívateľa
     * @returns {Object} { shouldChange, finalMode, reason, lockStrength }
     */
    shouldChangeMode(detectedMode, confidence, userInput = '') {
        const timestamp = new Date().toISOString();

        // 🔥 WALTER: Track user input for debugging
        this.lastUserInput = userInput.substring(0, 100);

        // 🔥 v0.9.0: If manual override is active, ignore auto mode switching
        if (this.manualOverride) {
            this._log(`   🚫 Manual override active - keeping ${this.currentMode} (ignoring ${detectedMode})`);
            return {
                shouldChange: false,
                finalMode: this.currentMode,
                reason: 'Manual override active',
                lockStrength: this.modeLockStrength,
                isLocked: true,
                manualOverride: true
            };
        }

        // Prvý vstup → nastav mód bez locku
        if (this.currentMode === null) {
            this._setMode(detectedMode, confidence, 'FIRST_MESSAGE', userInput);
            return {
                shouldChange: true,
                finalMode: detectedMode,
                reason: 'First message - no lock',
                lockStrength: this.modeLockStrength,
                isLocked: false
            };
        }

        // Rovnaký mód → zostáva, refresh lock
        if (detectedMode === this.currentMode) {
            this._refreshLock();
            this._addToHistory(userInput, detectedMode, confidence, 'MODE_STAY');

            return {
                shouldChange: false,
                finalMode: this.currentMode,
                reason: 'Same mode detected',
                lockStrength: this.modeLockStrength,
                isLocked: true
            };
        }

        // Iný mód → kontrola threshold
        let changeThreshold = this.modeLockStrength * this.changeThresholdMultiplier;

        // 🔥 v0.10.3: EMOTIONAL QUERY OVERRIDE - znížiť lock strength
        // Level 1 bug fix: CORE context lock 0.62 blokoval GLITCHOSLAV pri existenciálnej otázke
        const emotionalKeywords = /\b(zmysel|existova|prečo\s+(žijem|som tu)|cítiť|bojím|tma|strata|trpím|zúfalstvo|prázdnota)\b/i;
        const isEmotional = emotionalKeywords.test(userInput);

        if (isEmotional && detectedMode === 'glitch') {
            const originalThreshold = changeThreshold;
            changeThreshold *= 0.6; // Znížiť threshold o 40% pre GLITCHOSLAV
            this._log(`   🌀 EMOTIONAL OVERRIDE: Znížený threshold ${originalThreshold.toFixed(2)} → ${changeThreshold.toFixed(2)} (GLITCH priority)`);
        }

        const shouldUnlock = confidence >= changeThreshold;

        if (shouldUnlock) {
            // UNLOCK → zmena módu
            const oldMode = this.currentMode;
            this._setMode(detectedMode, confidence, 'THRESHOLD_EXCEEDED', userInput);

            this._log(`   🔓 Mode unlock: ${oldMode} → ${detectedMode}`);
            this._log(`   📊 Confidence ${confidence.toFixed(2)} > threshold ${changeThreshold.toFixed(2)}`);

            return {
                shouldChange: true,
                finalMode: detectedMode,
                reason: `Confidence ${confidence.toFixed(2)} > ${changeThreshold.toFixed(2)}`,
                lockStrength: this.modeLockStrength,
                isLocked: false,
                previousMode: oldMode
            };
        } else {
            // LOCKED → zostáva starý mód
            this._weakenLock();
            this._addToHistory(userInput, this.currentMode, confidence, 'MODE_LOCKED');

            this._log(`   🔒 Mode locked: ${this.currentMode} (strength: ${this.modeLockStrength.toFixed(2)})`);
            this._log(`   📊 Detected ${detectedMode} (conf: ${confidence.toFixed(2)}) < threshold ${changeThreshold.toFixed(2)}`);

            return {
                shouldChange: false,
                finalMode: this.currentMode,
                reason: `Lock strength ${this.modeLockStrength.toFixed(2)} blocks ${detectedMode}`,
                lockStrength: this.modeLockStrength,
                isLocked: true,
                blockedMode: detectedMode
            };
        }
    }

    /**
     * Force unlock - nútená zmena módu (napr. pri /mode príkaze).
     * @param {boolean} setManualOverride - If true, enable manual override (default true)
     */
    forceUnlock(newMode, reason = 'MANUAL_OVERRIDE', setManualOverride = true) {
        const oldMode = this.currentMode;
        this.currentMode = newMode;
        this.modeLockStrength = this.initialLockStrength;
        this.messagesSinceLastChange = 0;
        this.manualOverride = setManualOverride; // v0.10.3: Configurable manual override

        this.stats.totalModeChanges++;
        this.stats.lastChangeReason = reason;

        this._log(`   ⚡ Force unlock: ${oldMode} → ${newMode} (${reason})`);
        if (setManualOverride) {
            this._log(`   🔒 Manual override ENABLED - auto mode switching disabled`);
        }

        return {
            success: true,
            oldMode,
            newMode,
            reason,
            manualOverride: setManualOverride
        };
    }

    /**
     * Nastav nový mód s plným lockom.
     * @private
     */
    _setMode(mode, confidence, reason, userInput = '') {
        const oldMode = this.currentMode;

        this.currentMode = mode;
        this.modeLockStrength = this.initialLockStrength;
        this.messagesSinceLastChange = 0;

        this.stats.totalModeChanges++;
        this.stats.modeDistribution[mode] = (this.stats.modeDistribution[mode] || 0) + 1;
        this.stats.lastChangeReason = reason;

        this._addToHistory(userInput, mode, confidence, reason);

        if (oldMode) {
            this._log(`   🔄 Mode change: ${oldMode} → ${mode} (${reason})`);
        }
    }

    /**
     * Refresh lock - znovu nastav plnú silu (rovnaký mód).
     * @private
     */
    _refreshLock() {
        this.modeLockStrength = this.initialLockStrength;
        this.messagesSinceLastChange++;
    }

    /**
     * Weaken lock - oslabenie o decay rate.
     * @private
     */
    _weakenLock() {
        this.modeLockStrength = Math.max(
            this.minLockStrength,
            this.modeLockStrength - this.lockDecayRate
        );
        this.messagesSinceLastChange++;
    }

    /**
     * Pridaj záznam do histórie.
     * 🔥 WALTER v2.0: Added user input tracking
     * @private
     */
    _addToHistory(userInput, mode, confidence, action) {
        const entry = {
            timestamp: new Date().toISOString(),
            userInput: userInput.substring(0, 100), // max 100 znakov
            mode,
            confidence,
            action,
            lockStrength: this.modeLockStrength,
            // 🔥 WALTER: Better debugging - show first 50 chars of input
            inputPreview: userInput ? userInput.substring(0, 50) + '...' : null
        };

        this.conversationHistory.push(entry);

        // Trim histórie
        if (this.conversationHistory.length > this.maxHistorySize) {
            this.conversationHistory.shift();
        }
    }

    /**
     * Získaj aktuálny stav.
     */
    getState() {
        return {
            currentMode: this.currentMode,
            lockStrength: this.modeLockStrength,
            messagesSinceLastChange: this.messagesSinceLastChange,
            changeThreshold: this.modeLockStrength * this.changeThresholdMultiplier,
            isLocked: this.currentMode !== null,
            stats: { ...this.stats },
            historySize: this.conversationHistory.length
        };
    }

    /**
     * ⚠️ v1.0.1: Check if mode is locked (manual OR automatic)
     * Returns true if:
     * - Manual override active (user used /mode command)
     * - Automatic lock active (mode has non-zero lock strength)
     */
    isLocked() {
        return this.manualOverride || (this.currentMode !== null && this.modeLockStrength > 0);
    }

    /**
     * ⚠️ v1.0.1: Get currently locked mode (if ANY lock active)
     */
    getLockedMode() {
        return (this.manualOverride || this.modeLockStrength > 0) ? this.currentMode : null;
    }

    /**
     * Získaj históriu (voliteľne filtrovanú).
     */
    getHistory(limit = 10) {
        return this.conversationHistory.slice(-limit);
    }

    /**
     * Reset context - vymaž všetko.
     */
    reset() {
        this.currentMode = null;
        this.modeLockStrength = 0;
        this.messagesSinceLastChange = 0;
        this.manualOverride = false; // v0.9.0: Clear manual override on reset
        this.conversationHistory = [];

        this._log('   🔄 Context manager reset');

        return { success: true };
    }

    /**
     * Export stavu pre debugging.
     */
    export() {
        return {
            config: {
                initialLockStrength: this.initialLockStrength,
                minLockStrength: this.minLockStrength,
                lockDecayRate: this.lockDecayRate,
                changeThresholdMultiplier: this.changeThresholdMultiplier,
                maxHistorySize: this.maxHistorySize
            },
            state: this.getState(),
            history: this.conversationHistory
        };
    }

    /**
     * Import stavu (pre recovery).
     */
    import(data) {
        if (data.state) {
            this.currentMode = data.state.currentMode;
            this.modeLockStrength = data.state.lockStrength;
            this.messagesSinceLastChange = data.state.messagesSinceLastChange;
        }

        if (data.history) {
            this.conversationHistory = data.history.slice(-this.maxHistorySize);
        }

        this._log('   📥 Context manager state imported');

        return { success: true };
    }
}

// Singleton instance pre globálne použitie
// 🔧 KEFYK FIX v2.0: initialLockStrength znížený z 0.7 na 0.5
export const contextManager = new SP4ContextManager({
    initialLockStrength: 0.5, // 🔧 KEFYK: bolo 0.7, znížené pre citlivejší POPIČI trigger
    minLockStrength: 0.2,
    lockDecayRate: 0.08,
    changeThresholdMultiplier: 1.3,
    maxHistorySize: 20
});
