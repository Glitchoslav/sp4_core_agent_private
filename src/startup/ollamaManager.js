// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: ollamaManager              │
// │  Layer: Startup                            │
// │  Role: Auto-start Ollama if not running   │
// │  API: ensureOllamaRunning()                │
// │  Dependencies: child_process, fetch        │
// └─────────────────────────────────────────────┘

import { spawn } from 'child_process';

const OLLAMA_API = 'http://localhost:11434/api/tags';
const OLLAMA_STARTUP_TIMEOUT = 15000; // 15 sekúnd na štart

function verboseLog(...args) {
    if (process.env.SP4_VERBOSE === '1' || process.env.SP4_DEBUG === 'true') {
        console.log(...args);
    }
}

export async function probeOllamaRegistry() {
    try {
        const response = await fetch(OLLAMA_API, {
            signal: AbortSignal.timeout(3000)
        });

        if (!response.ok) {
            return { reachable: false, models: [] };
        }

        const payload = await response.json();
        return {
            reachable: true,
            models: Array.isArray(payload?.models) ? payload.models : []
        };
    } catch {
        return { reachable: false, models: [] };
    }
}

/**
 * Skontroluje, či Ollama beží
 * @returns {Promise<boolean>}
 */
async function isOllamaRunning() {
    const probe = await probeOllamaRegistry();
    return probe.reachable;
}

/**
 * Spustí Ollama server v pozadí
 * @returns {Promise<{reachable: boolean, models: Array}>} - snapshot po úspešnom štarte alebo null-like stav pri timeout
 */
async function startOllama({ verbose = false } = {}) {
    return new Promise((resolve) => {
        if (verbose) {
            verboseLog('🚀 Spúšťam Ollama server...');
        }

        // Spustíme ollama serve v pozadí (detached proces)
        const ollamaProcess = spawn('ollama', ['serve'], {
            detached: true,
            stdio: 'ignore', // ignoruj output, beží na pozadí
            shell: true
        });

        // Odpojíme proces od parent procesu (aby bezel samostatne)
        ollamaProcess.unref();

        // Počkáme pár sekúnd a skontrolujeme či naštartovala
        const checkInterval = setInterval(async () => {
            const probe = await probeOllamaRegistry();
            if (probe.reachable) {
                clearInterval(checkInterval);
                clearTimeout(timeout);
                if (verbose) {
                    verboseLog('✅ Ollama server úspešne spustená');
                }
                resolve(probe);
            }
        }, 1000);

        // Timeout ak sa nepodarí naštartovať
        const timeout = setTimeout(() => {
            clearInterval(checkInterval);
            if (verbose) {
                verboseLog('⚠️ Ollama server sa nepodarilo spustiť (timeout)');
            }
            resolve({ reachable: false, models: [] });
        }, OLLAMA_STARTUP_TIMEOUT);
    });
}

/**
 * Hlavná funkcia - zabezpečí, že Ollama beží
 * Ak nebeží, pokúsi sa ju spustiť automaticky
 * 
 * @returns {Promise<{running: boolean, autoStarted: boolean, models: Array}>}
 */
export async function ensureOllamaRunning(options = {}) {
    const { verbose = false } = options;
    const initialProbe = await probeOllamaRegistry();

    if (initialProbe.reachable) {
        return { running: true, autoStarted: false, models: initialProbe.models };
    }

    // Pokús o automatický štart
    const startedProbe = await startOllama({ verbose });

    if (startedProbe.reachable) {
        return { running: true, autoStarted: true, models: startedProbe.models };
    } else {
        if (verbose) {
            verboseLog('');
            verboseLog('❌ Ollama: nedostupná');
            verboseLog('   ▶ Manuálne spusti:  ollama serve');
            verboseLog('');
        }
        return { running: false, autoStarted: false, models: [] };
    }
}

/**
 * Rýchla kontrola bez auto-startu (pre health checks)
 * @returns {Promise<boolean>}
 */
export async function checkOllamaHealth() {
    const probe = await probeOllamaRegistry();
    return probe.reachable;
}
