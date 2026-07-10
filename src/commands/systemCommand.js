import { SP4_VERSION } from '../version.js';
// ┌─────────────────────────────────────────────┐
// │  SP4 OS COMMAND: /system                   │
// │  Layer: Interface / Commands               │
// │  Role: Ukázať stav systému                 │
// │  Trigger: user message "/system"           │
// └─────────────────────────────────────────────┘

import firstAidManifest from '../../sp4_first_aid/logic_manifest.json' with { type: 'json' };
import { getSPGDiagnostics } from '../../sp4_first_aid/spg.js';
import { runBootSequence } from '../startup/bootSequence.js';

export function getModelsStatusLabel({ ollama = false, modelsAvailable = false } = {}) {
    if (!ollama) {
        return 'UNREACHABLE';
    }

    return modelsAvailable ? 'OK' : 'NO LOCAL MODELS';
}

export function buildSystemStatusText({ health = {}, spgDiag } = {}) {
    const diagnostics = spgDiag || getSPGDiagnostics(firstAidManifest);
    const {
        checks: {
            bible = false,
            architectureDoc = false,
            memoryDir = false,
            dataDir = false,
            modelsAvailable = false,
            scheduler = false,
            ollama = false,
        } = {},
    } = health || {};

    const lines = [
        'SP4 OS SYSTEM STATUS',
        '',
        `Version: ${SP4_VERSION}`,
        `Bible: ${bible ? 'OK' : 'MISSING'}`,
        `Architecture Doc: ${architectureDoc ? 'OK' : 'MISSING'}`,
        `Memory dir: ${memoryDir ? 'OK' : 'MISSING'}`,
        `Data dir: ${dataDir ? 'OK' : 'MISSING'}`,
        `Models: ${getModelsStatusLabel({ ollama, modelsAvailable })}`,
        `Scheduler: ${scheduler ? 'OK' : 'CHECK'}`,
        '',
        '🚨 FIRST AID SPG:',
        `   Status: ${diagnostics.enabled ? 'ENABLED ✅' : 'DISABLED ❌'}`,
        `   Version: ${diagnostics.version || 'unknown'}`,
        `   States: ${diagnostics.statesCount || 0} (${diagnostics.stateIds?.join(', ') || 'none'})`,
        `   Keywords: ${diagnostics.totalKeywords || 0}`,
        '',
        `System: ${health.ok ? 'HEALTHY ✅' : 'ISSUES DETECTED ⚠️'}`
    ];

    return lines.join('\n');
}

/**
 * Handler pre /system príkaz.
 *
 * Očakávame, že `context` má aspoň:
 * - context.reply(text: string): Promise<void>  // alebo podobnú funkciu
 *
 * @param {object} context
 */
export async function handleSystemCommand(context) {
    const reply =
        context?.reply ||
        (async (msg) => {
            // fallback – priame logovanie ak nie je reply API
            // eslint-disable-next-line no-console
            console.log(msg);
        });

    const health = await runBootSequence({ quiet: true, autoStartOllama: false });
    await reply(buildSystemStatusText({ health }));
}
