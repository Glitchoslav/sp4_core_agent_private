// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: bootSequence               │
// │  Layer: Orchestration / Startup            │
// │  Role: Spustenie OS, health checks         │
// │  API: runBootSequence(config)              │
// │  Dependencies: logger, scheduler, fs       │
// └─────────────────────────────────────────────┘

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as scheduler from '../../scheduler.js'; // existujúci modul – len observability, žiadne mutácie
import { SP4_VERSION } from '../version.js';
import { ensureOllamaRunning, probeOllamaRegistry } from './ollamaManager.js'; // v1.3.0: auto-start Ollama
import { getUsername } from './userSeed.js'; // v1.2.0: user identity

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function log(line) {
    // jednoduchý logger – môžeš neskôr nahradiť central loggerom
    // ale nespúšťaj tu žiadne externé služby
    // eslint-disable-next-line no-console
    console.log(line);
}

function renderHeader() {
    return [
        '╔═══════════════════════════════════════════════╗',
        '║            SP4 OS – BOOT SEQUENCE             ║',
        '╚═══════════════════════════════════════════════╝',
    ].join('\n');
}

async function checkFileExists(relPath) {
    try {
        const full = path.join(__dirname, '..', '..', relPath);
        await fs.access(full);
        return true;
    } catch {
        return false;
    }
}

async function checkDirExists(relPath) {
    try {
        const full = path.join(__dirname, '..', '..', relPath);
        const stat = await fs.stat(full);
        return stat.isDirectory();
    } catch {
        return false;
    }
}

/**
 * Spustí boot sekvenciu SP4 OS.
 * NIČ tu nevolá sieť, žiadne cloud API, žiadna telemetria.
 *
 * @param {object} config - voliteľná konfigurácia (napr. logger)
 * @returns {Promise<object>} - health objekt
 */
export async function runBootSequence(config = {}) {
    const { quiet = false, verbose = false, autoStartOllama = true } = config;

    if (!quiet && verbose) {
        log(renderHeader());
    }

    // 🔥 v1.3.0: Auto-start Ollama ak nebeží
    const ollamaStatus = autoStartOllama
        ? await ensureOllamaRunning({ verbose })
        : await (async () => {
            const probe = await probeOllamaRegistry();
            return {
                running: probe.reachable,
                autoStarted: false,
                models: probe.models,
            };
        })();

    const modelsAvailable = ollamaStatus.running && ollamaStatus.models.length > 0;

    // minimalne health-checky podľa tvojich pravidiel
    const [bible, architectureDoc, memoryDir, dataDir] =
        await Promise.all([
            checkFileExists('docs/SP4_IDENTITY_BIBLE.md'),
            checkFileExists('docs/ARCHITECTURE_v1.0.md'),
            checkDirExists('memory'),
            checkDirExists('data'),
        ]);

    // Scheduler health check musí byť read-only.
    let schedulerOk = false;
    try {
        if (typeof scheduler.getSchedulerStatus === 'function') {
            schedulerOk = true;
        } else {
            schedulerOk = false;
        }
    } catch {
        schedulerOk = false;
    }

    const health = {
        ok:
            bible &&
            architectureDoc &&
            memoryDir &&
            dataDir &&
            modelsAvailable &&
            schedulerOk &&
            ollamaStatus.running, // Ollama musí bežať
        version: SP4_VERSION,
        checks: {
            bible,
            architectureDoc,
            memoryDir,
            dataDir,
            modelsAvailable,
            scheduler: schedulerOk,
            ollama: ollamaStatus.running,
            ollamaAutoStarted: ollamaStatus.autoStarted,
        },
    };

    if (!quiet && verbose) {
        log('');
        log(
            `System: ${health.ok ? 'HEALTHY ✅' : 'ISSUES DETECTED ⚠️'}`
        );

        // v1.2.0: Greet user from seed
        const username = await getUsername();
        log(`User: ${username}`);
    }

    return health;
}
