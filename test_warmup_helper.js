/**
 * SP4 Test Warmup Helper (v1.4.2)
 * 
 * Purpose: Minimize first-test cold start latency by warming up Ollama.
 * Does NOT change timeout (intentionally hard to reveal flaky behavior).
 * 
 * Usage:
 *   import { warmupOllama } from './test_warmup_helper.js';
 *   await warmupOllama(); // Before first test case
 * 
 * Behavior:
 *   - Silent warmup (no log spam)
 *   - If fails, continues (doesn't block tests)
 *   - Uses minimal prompt ('ping')
 *   - Uses default model (llama3:8b)
 */

/**
 * Warm up Ollama with a minimal call (reduce cold start on first test)
 * 
 * @returns {Promise<boolean>} true if warmup succeeded, false if failed
 */
export async function warmupOllama() {
    try {
        const { askLocalLLM } = await import('./sp4os/llmLocal.js');

        // Silent warmup call (minimal prompt)
        await askLocalLLM('ping', 'llama3:8b', {
            num_predict: 10,
            temperature: 0.1
        });

        return true;
    } catch (err) {
        // Silent failure - don't block tests
        // Tests will still reveal problems if Ollama is broken
        return false;
    }
}

/**
 * Warmup with optional log
 * 
 * @param {boolean} verbose - Show warmup status
 * @returns {Promise<void>}
 */
export async function warmupWithLog(verbose = false) {
    if (verbose) {
        process.stdout.write('🔥 Warming up Ollama... ');
    }

    const success = await warmupOllama();

    if (verbose) {
        console.log(success ? '✅' : '⚠️  (skipped)');
    }
}
