// supervisor.js

import { logError, logInfo, logWarn } from "./logger.js";

function verboseLog(...args) {
  if (process.env.SP4_VERBOSE === '1' || process.env.SP4_DEBUG === 'true') {
    console.log(...args);
  }
}

/**
 * Supervisor Agent
 * This module monitors the system state, allocates resources, detects errors, and manages fallback modes.
 */

export class Supervisor {
  constructor() {
    this.state = {
      systemHealth: "stable",
      resourceUsage: {},
      errorLog: [],
      fallbackMode: null,
    };
  }

  /**
   * Monitor system health and resource usage.
   */
  monitorSystem() {
    // Placeholder: Implement system health checks
    verboseLog("Monitoring system health...");
    logInfo("Supervisor monitoring tick");
  }

  /**
   * Detect and log errors.
   * @param {string} error - Error message.
   */
  detectError(error) {
    // 🔥 v1.4.2: Test mode awareness - don't alarm on test errors
    const isTestMode = process.env.SP4_TEST === 'true';
    const isInjectedTestError = error === 'Test error';

    // Ignore synthetic test injections unless explicit test mode is enabled
    if (!isTestMode && isInjectedTestError) {
      logWarn('Supervisor ignored injected test error outside test mode');
      return;
    }

    this.state.errorLog.push({
      timestamp: new Date().toISOString(),
      message: error,
    });

    if (isTestMode && isInjectedTestError) {
      console.log('🧪 TEST: Supervisor injected error (expected)');
      logInfo('Supervisor test error (expected in test mode)');
    } else {
      console.error('Error detected:', error);
      logError('Supervisor detected error', { error });
    }
  }

  /**
   * Activate fallback mode based on the severity of the issue.
   * @param {string} mode - Fallback mode to activate.
   * 🔥 v1.4.2: Skip activation in test mode (expected errors)
   */
  activateFallback(mode, options = {}) {
    // 🔥 v1.4.2: Don't activate fallback for test errors
    const isTestMode = process.env.SP4_TEST === 'true' || options.testMode === true;
    if (isTestMode) {
      console.log(`🧪 TEST: Fallback mode "${mode}" skipped (test environment)`);
      return;
    }

    this.state.fallbackMode = mode;
    console.warn(`Activating fallback mode: ${mode}`);
    logWarn("Activating fallback mode", { mode });
  }

  /**
   * Reset fallback mode and restore normal operations.
   */
  resetFallback() {
    this.state.fallbackMode = null;
    console.log("Fallback mode reset. Resuming normal operations.");
    logInfo("Fallback mode reset");
  }

  /**
   * Log the current state for debugging and analysis.
   */
  logState() {
    console.log("Supervisor State:", JSON.stringify(this.state, null, 2));
    logInfo("Supervisor state snapshot", this.state);
  }
}
