// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: statusBar                  │
// │  Layer: Interface                          │
// │  Role: Zobrazenie stavu OS v termináli     │
// │  API: renderStatusBar(state)               │
// │  Dependencies: userSeed + version          │
// └─────────────────────────────────────────────┘

import { getUsername } from '../startup/userSeed.js';
import { SP4_VERSION } from '../version.js';

/**
 * Vygeneruje krátky status bar string.
 * Používa kanonickú runtime verziu a username zo seedu.
 *
 * @param {object} state - kombinácia boot health + runtime info
 * @param {object} state.health - objekt z runBootSequence()
 * @param {string[]} [state.agents] - aktívne agent persóny
 * @param {number} [state.jobs] - počet aktívnych scheduler jobs
 * @returns {Promise<string>} - napr. "[SP4 OS 1.4.0] [user: Kefyk] [agents: CORE/GLITCH/POPIČI/VALID] [jobs: 4] [memory: OK]"
 */
export async function renderStatusBar(state = {}) {
    const {
        health = {},
        agents = [],
        jobs = 0,
    } = state;

    const version = SP4_VERSION;
    const memoryOk =
        health.checks && health.checks.memoryDir && health.checks.dataDir;

    const agentsLabel = agents.length ? agents.join('/') : 'n/a';
    const username = await getUsername(); // v1.2.0: from seed

    return [
        `[SP4 OS ${version}]`,
        `[user: ${username}]`,
        `[agents: ${agentsLabel}]`,
        `[jobs: ${jobs}]`,
        `[memory: ${memoryOk ? 'OK' : 'CHECK'}]`,
    ].join(' ');
}

/**
 * Voliteľný helper – priamo vypíše status bar do konzoly.
 * Integrácia do main loopu je na tebe.
 * Async, lebo username ide zo seedu.
 */
export async function printStatusBar(state = {}) {
    // eslint-disable-next-line no-console
    console.log(await renderStatusBar(state));
}
