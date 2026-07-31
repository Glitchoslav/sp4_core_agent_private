// index_v07.js – SP4_CORE_AGENT v0.8.0 CLI Interface
// Integration: v0.8 BAD Labs Edition (Hybrid Analyzer + dialectAnalyzer + contextManager + intensityDetection)

import fs from 'fs';
import path from 'path';
import readline from "readline";
import { fileURLToPath } from 'url';
import { createBackup } from "./backup.js";
import { getBridgeClientHeaders } from "./bridge-client-auth.js";
import { completeGoal, dropGoal, getGoals, setGoal } from "./goalsModel.js";
import { SP4IntegratedAgent } from "./integration.js";
import { getProfileSummary, getSummary, loadMemory, saveMemory } from "./memory.js";
import { buildPrompt } from "./multiVoice.js";
import { handleRitual } from "./rituals.js";
import { getSchedulerStatus, initScheduler } from "./scheduler.js";
import { registerAllJobs } from "./schedulerJobs.js"; // 🔥 AUTO_CONSOLIDATION_v1
import { checkOllamaHealth, getModelRegistry } from './sp4os/llmLocal.js';
import { SP4_VERSION } from './src/version.js';
// import { handleChaptersCommand } from './src/commands/chaptersCommand.js'; // TODO: implement
import { handlePulseCommand } from './src/commands/pulseCommand.js';
import { handleSeedRefreshCommand } from './src/commands/seedRefreshCommand.js';
import { handleSystemCommand } from './src/commands/systemCommand.js';
import { handleWhoAmICommand } from './src/commands/whoamiCommand.js';
import { contextManager } from "./src/core/contextManager.js";
import { pickMode } from "./src/core/modeCompass.js";
import { getRuntimeLoggingState, runtimeLog, setRuntimeLoggingEnabled, toggleRuntimeLogging } from './src/core/runtimeLogging.js';
import { printStatusBar } from './src/interface/statusBar.js';
import { resolvePolicy } from './src/policy/policy.js';
import { collectBootDashboardData, isBootVerbose, renderBootDashboard } from './src/startup/bootDashboard.js';
import { runBootSequence } from './src/startup/bootSequence.js';
import { isOnboardingComplete, runOnboarding } from './src/startup/onboarding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const agent = new SP4IntegratedAgent();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const BOOT_VERBOSE = isBootVerbose();

if (!BOOT_VERBOSE) {
    process.noDeprecation = true;
}

function ask(question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

function isHealthQuery(input) {
    const text = String(input || '').trim();

    if (!text || text.startsWith('/')) {
        return false;
    }

    if (/^(status|health)$/i.test(text)) {
        return true;
    }

    if (/\b(všetko|systém|agent)\b.*\b(funkčn|zdravý|ok|poriadku|v pohode)\b/i.test(text)) {
        return true;
    }

    if (/^ako\s+(si|ide|beží)\b(?:\s+(systém|agent|všetko))?\??$/i.test(text)) {
        return true;
    }

    if (/^ako\s+funguje\s+(systém|agent|všetko)\b.*$/i.test(text)) {
        return true;
    }

    return false;
}

// ──────────────────────────────
// HEALTH CHECK (shared between /health command and auto-detect)
// ──────────────────────────────

async function showHealthCheck() {
    const mem = await loadMemory();
    const fsp = await import('fs/promises');
    let identity = { auditLog: [] };
    try {
        const identityData = await fsp.readFile(path.join(__dirname, 'data', 'identity.json'), 'utf-8');
        identity = JSON.parse(identityData);
    } catch (_) { /* identity.json optional */ }

    const lastAudit = identity.auditLog?.length ? identity.auditLog[identity.auditLog.length - 1] : null;
    const similarityStr = lastAudit?.similarity ? `${(parseFloat(lastAudit.similarity) * 100).toFixed(1)}%` : 'N/A';
    const rawLogCount = mem.rawMemory?.log?.length || 0;
    let ollamaHealth = { healthy: false, models: [] };
    let ollamaCheckError = null;
    try {
        ollamaHealth = await checkOllamaHealth();
    } catch (err) {
        ollamaCheckError = err?.message || String(err);
    }
    const ollamaHealthy = !!ollamaHealth?.healthy;
    const modelCount = Array.isArray(ollamaHealth?.models) ? ollamaHealth.models.length : 0;
    const systemHealthy = ollamaHealthy;

    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║       SP4 SYSTEM HEALTH CHECK         ║');
    console.log('╚═══════════════════════════════════════╝\n');
    console.log('✅ Core Agent: RUNNING');
    console.log(`✅ Identity Similarity: ${similarityStr}`);
    console.log(`✅ Memory Seeds: ${mem.seeds?.length || 0}`);
    console.log(`✅ Raw Log: ${rawLogCount} entries`);
    console.log(`✅ Relationship: ${mem.relationship?.stage || 'stranger'}`);
    console.log(`✅ Interactions: ${rawLogCount}`);
    console.log(`✅ Current Mode: ${mem.preferences?.defaultMode || 'auto'}`);
    console.log(`${ollamaHealthy ? '✅' : '⚠️ '} Ollama: ${ollamaHealthy ? 'ONLINE' : 'OFFLINE/DEGRADED'} (${modelCount} modelov)`);
    if (!ollamaHealthy && ollamaCheckError) {
        console.log(`⚠️  Ollama detail: ${ollamaCheckError}`);
    }

    try {
        const { getLatestEpochs } = await import('./src/core/epochKeeper.js');
        const epochs = await getLatestEpochs(1);
        if (epochs.length > 0) {
            const lastEpoch = epochs[epochs.length - 1];
            const date = new Date(lastEpoch.timestamp).toLocaleString('sk-SK');
            console.log(`✅ Last Epoch: ${lastEpoch.description} (${date})`);
        }
    } catch (_) {
        console.log('⚠️  Epoch Keeper: not available');
    }

    console.log(`\n🔥 System: ${systemHealthy ? 'HEALTHY' : 'DEGRADED'}\n`);
}

// ──────────────────────────────
// BANNER
// ──────────────────────────────

function showBanner() {
    console.clear();
    if (BOOT_VERBOSE) {
        console.log(`🔥 SP4_CORE_AGENT v${SP4_VERSION} booting...\n`);
    }
}

// ──────────────────────────────
// COMMANDS
// ──────────────────────────────

const COMMANDS = {
    '/help': 'Zobrazí nápovedu',
    '/status': 'Stav systému (memory, emotion, identity, capability)',
    '/system': 'SP4 OS diagnostika (health checks, scheduler, models) [v1.1.0]',
    '/recovery': 'Manuálny recovery protokol',
    '/mode <name>': 'Prepni režim (auto, core, empatia, popici, glitch, human)',
    '/rhythm <mode>': 'Force response rhythm (short, long, rune, silence) [v0.10]',
    '/fire': 'Aktivuj Fire Mode - brutal truth bez servítky [v0.10]',
    '/birth': 'Začni Birth Ritual - onboarding ceremony (3 otázky) [v0.10]',
    '/context': 'Zobrazí context manager stav (agent locking) [v0.7]',
    '/unlock': 'Force unlock context manager [v0.7]',
    '/reset': 'Reset bot detection (ak si označený ako bot) [v1.0]',
    '/backup': 'Vytvor zálohu pamäte',
    '/profile': 'Zobrazí profil a zhrnutie',
    '/mirror [days]': 'Zrkadlo - čo si riešil posledných N dní',
    '/relationship': 'Stav vzťahu a progres',
    '/today': 'Čo dnes potrebuješ vyriešiť?',
    '/next': 'Ďalší krok v tvojom pláne',
    '/seeds': 'Zobraz kľúčové momenty',
    '/seed <text>': 'Zaznamená kľúčový moment',
    '/chapters [N]': 'Zobraz posledných N chapters (týždenné summaries) [AUTO_CONSOLIDATION_v1]',
    '/trinity <otázka>': 'Tri perspektívy na problém',
    '/goal': 'Zobraz aktívny cieľ + históriu',
    '/goal <text>': 'Nastav nový aktívny cieľ',
    '/goal done': 'Označ cieľ ako dokončený',
    '/goal drop': 'Dropni aktívny cieľ',
    '/goals': 'Alias pre /goal',
    '/rate <good|mid|bad>': 'Ohodnotí poslednú odpoveď agenta',
    '/consolidate': 'Info: manuálna konsolidácia nie je aktívna (scheduler/npm run consolidate)',
    '/memory_audit': 'Admin: prehliadka pamäte + archival control [v1.0]',
    '/idea <text>': 'Uloží myšlienku/snippet (okamžite) [v0.11.7]',
    '/remind <when> <text>': 'Naplánuj pripomienku (2h, 1d, ISO8601) [v0.11.7]',
    '': '',
    '🚀 FULL AUTONOMY [v2.0]': '',
    '/mission <goal>': 'Autonomne vykoná komplexnú misiu (web, code, campaign)',
    '': '',
    '🧬 PERSONAL RITUALS [v1.3.0]': '',
    '/whoami': 'Tvoja identita z user seedu (meno, intent, fear)',
    '/mirror': 'Zrkadlo posledných konverzácií (témy, vzory)',
    '/pulse': 'Rýchla náladová diagnostika (únava, stres, hnev)',
    '/seed_refresh': 'Update osobného seedu (intent:X fear:Y username:Z)',
    '': '',
    '🔥 SYSTEM EPOCH TRACKING': '',
    '/epochs': 'Zobraz posledných 20 epoch (systémových zmien)',
    '/epoch <popis>': 'Zaznam epochu (dôležitá zmena v systéme)',
    '/health': 'System health check (status všetkých komponentov)',
    '': '',
    '🛡️ OLLAMA HEALTH (TIMEOUT FIX v1.0)': '',
    '/ollama_status': 'Ollama health + retry config',
    '/reset_ollama': 'Reset Ollama health state (force reconnect)',
    '': '',
    '🇸🇰 LANGUAGE ENFORCER (v1.0.1)': '',
    '/language_stats': 'Štatistiky Slovak enforcement (retry/fallback)',
    '/logy [on|off|status]': 'Prepni runtime logy pre aktuálnu session',
    '': '',
    '/debug_modes': 'Debug: režimy + validátory',
    '/debug_memory': 'Debug: posledných 5 memory eventov',
    '/debug_engines': 'Debug: aktívne enginy + fallback',
    '/exit': 'Ukončiť',
    '': '',
    '🧠 DHZ KOLEKTÍVNA PAMÄŤ [v1.1]': '',
    '/zbor': 'Zobraz posledné insighty + tipy z pamäte zboru',
    '/zbor <query>': 'Hľadaj v kolektívnej pamäti (napr. /zbor hadica)',
    '/zbor teach "<tip>"': 'Pridaj tip do pamäte zboru manuálne',
    '/zbor policy': 'Zobraziť pravidlá dát a anonymizácie',
    '/zbor meta': 'Štatistiky kolektívnej pamäte (počty, posledná aktualizácia)'
};

async function showHelp() {
    // Load current user state
    const memory = await loadMemory();
    const userName = memory.userProfile?.name || 'Unknown';
    const currentMode = memory.preferences?.defaultMode || 'auto';
    const relationship = memory.relationship?.stage || 'stranger';
    const interactions = memory.relationship?.metrics?.interactionCount || 0;

    // Status bar
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log(`║  👤 User: ${userName.padEnd(15)} 🎭 Mode: ${currentMode.padEnd(10)} 📊 ${relationship} (${interactions})  ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝');

    console.log('\n📖 DOSTUPNÉ PRÍKAZY:\n');
    Object.entries(COMMANDS).forEach(([cmd, desc]) => {
        console.log(`  ${cmd.padEnd(20)} - ${desc}`);
    });
    console.log('\n🆕 v0.7 FEATURES:');
    console.log('  🗣️  Automatická detekcia eastern Slovak (→ POPICI)');
    console.log('  🔒 Agent locking (plynulé prepínanie módov)');
    console.log('  🔥 Intensity detection (kurvy/emoji → POPICI)');
    console.log('');
}

// ──────────────────────────────
// STARTUP
// ──────────────────────────────

async function init() {
    showBanner();

    // 🔥 v1.2.x: Onboarding - First Run Experience
    const onboardingDone = await isOnboardingComplete();
    if (!onboardingDone) {
        await runOnboarding();
        console.log('\n'); // Spacing before boot sequence
    }

    if (BOOT_VERBOSE) {
        console.log(`🔄 Inicializujem SP4_CORE_AGENT v${SP4_VERSION}...\n`);
    }

    // ========== BOOT SEQUENCE ==========
    // v1.3.0: Centralizovaná boot sekvencia (vrátane auto-start Ollama)
    const bootHealth = await runBootSequence({ quiet: true, verbose: BOOT_VERBOSE });

    if (!bootHealth.ok && BOOT_VERBOSE) {
        console.warn('\n⚠️  SP4 OS má problémy. Spusti /system pre diagnostiku.\n');
    }

    if (!bootHealth.checks.ollama && BOOT_VERBOSE) {
        console.log('⚠️ SP4 môže pokračovať, ale LLM funkcie nebudú fungovať.\n');
    }

    // Initialize agent (CRITICAL - musí byť pred použitím)
    const initResult = await agent.initialize();
    if (!initResult.success) {
        console.error('❌ Zlyhala inicializácia agenta:', initResult.error);
        process.exit(1);
    }

    // Layer distinction validator (pure JS, always available)
    const validatorStatus = { status: 'ok', detail: 'layerValidator aktívny' };
    if (BOOT_VERBOSE) {
        console.log('🛡️ Layer validator: ✅ aktívny\n');
    }

    // 🔥 AUTO_CONSOLIDATION_v1: Register all scheduler jobs (daily, weekly, monthly, quarterly)
    if (BOOT_VERBOSE) {
        console.log('⏰ Registering consolidation jobs...');
    }
    registerAllJobs(); // Replaces old registerDefaultConsolidationJobs

    // 🛡️ v1.0: Register Ollama health check job (MISSION: OLLAMA_TIMEOUT_FIX_v1)
    if (BOOT_VERBOSE) {
        console.log('🛡️ Registering Ollama health check job...');
    }
    const { registerOllamaHealthCheckJob } = await import('./scheduler.js');
    const { ollamaHealthCheck } = await import('./sp4os/llmLocal.js');
    registerOllamaHealthCheckJob(ollamaHealthCheck);

    if (BOOT_VERBOSE) {
        console.log('⏰ Starting scheduler...');
    }
    initScheduler();

    const memory = await loadMemory();
    const today = new Date().toISOString().split('T')[0];
    const lastSession = memory.sessionMetadata?.lastSessionDate;
    const sessionType = lastSession === today ? 'RESUMED' : 'NEW';

    const policy = resolvePolicy({});
    const modelRegistry = await getModelRegistry().catch(() => ({ available: [], healthy: false }));
    const schedulerStatus = getSchedulerStatus();
    const dashboardData = await collectBootDashboardData({
        projectRoot: __dirname,
        bootHealth,
        memory,
        schedulerStatus,
        policy,
        modelRegistry,
        validator: validatorStatus,
        sessionType,
    });

    console.log(renderBootDashboard(dashboardData, SP4_VERSION) + '\n');

    // v0.7: Context manager reset na začiatku session
    contextManager.reset();
    if (BOOT_VERBOSE) {
        console.log('🔒 Context manager: reset (nová session)\n');
    }

    // Auto-rituál /today pri prvom dennom spustení

    if (lastSession !== today) {
        if (BOOT_VERBOSE) {
            console.log('🌅 Prvé dnešné spustenie - spúšťam /today rituál...\n');
            const todayResult = await handleRitual('/today', '');
            console.log(todayResult + '\n');
        } else {
            console.log('🌅 Denný rituál je pripravený: /today\n');
        }

        // Ulož session metadata
        memory.sessionMetadata = { ...memory.sessionMetadata, lastSessionDate: today };
        const fs = await import('fs/promises');
        await fs.writeFile('data/memory.json', JSON.stringify(memory, null, 2));
    }

    let currentMode = memory.preferences.defaultMode || 'auto';

    // Event loop
    rl.on('line', async (input) => {
        const trimmed = input.trim();

        if (!trimmed) {
            return;
        }

        if (process.env.SP4_VERBOSE === '1') {
            console.log(`[RAW INPUT] "${trimmed}"`);
        }

        // ═══════════════════════════════════════════════════════════
        // COMMANDS
        // ═══════════════════════════════════════════════════════════

        // 🔍 Auto-detect health/status queries (HIGHEST PRIORITY - before all commands)
        if (isHealthQuery(trimmed)) {
            console.log('   🔍 Detekovaný health query → automaticky volám /health\n');
            await showHealthCheck();
            return;
        }

        if (trimmed === '/exit') {
            // Auto-rituál /mirror pred exitom
            console.log('\n🔄 Záverečná reflexia...\n');
            const mirrorResult = await handleRitual('/mirror', '3');
            console.log(mirrorResult + '\n');

            console.log('\n👋 Dovidenia! Zostávaj skutočný. Zostávaj slobodný.\n');

            // 🔥 v0.11.7: Scheduler graceful shutdown
            // (node-cron tasks auto-cleanup on process exit, no explicit shutdown needed)

            rl.close();
            process.exit(0);
        }

        if (trimmed === '/help') {
            showHelp();
            return;
        }

        if (trimmed === '/logy' || trimmed.startsWith('/logy ')) {
            const arg = trimmed.split(/\s+/)[1]?.toLowerCase() || 'toggle';
            let state;

            if (arg === 'on') {
                state = setRuntimeLoggingEnabled(true);
            } else if (arg === 'off') {
                state = setRuntimeLoggingEnabled(false);
            } else if (arg === 'status') {
                state = getRuntimeLoggingState();
            } else {
                state = toggleRuntimeLogging();
            }

            const statusLabel = state.enabled ? 'ON' : 'OFF';
            console.log(`\n🪵 Runtime logy: ${statusLabel} (verbose=${state.verbose ? '1' : '0'}, debug=${state.debug ? 'true' : 'false'})\n`);
            return;
        }

        if (trimmed === '/status') {
            const summary = await getSummary();
            console.log('\n📊 SYSTEM STATUS:\n');
            console.log(`Memory:        ${summary.memorySize || 0} entries`);
            console.log(`Relationship:  ${summary.relationshipStage || 'Unknown'}`);
            console.log(`Mode:          ${currentMode}`);
            console.log(`Capability:    ${summary.capabilityLevel || 'FULL'}`);
            console.log(`Emotion:       ${summary.emotionalState || 'neutral'}\n`);

            // v0.7: Context manager status
            const contextState = contextManager.getState();
            console.log('🔒 CONTEXT MANAGER (v0.7):\n');
            console.log(`Locked Mode:   ${contextState.currentMode || 'none'}`);
            console.log(`Lock Strength: ${contextState.lockStrength.toFixed(2)}`);
            console.log(`Threshold:     ${contextState.changeThreshold.toFixed(2)}`);
            console.log(`Mode Changes:  ${contextState.stats.totalModeChanges}`);
            console.log(`History Size:  ${contextState.historySize}/20\n`);
            return;
        }

        // v0.7: /context command
        if (trimmed === '/context') {
            const state = contextManager.getState();
            const history = contextManager.getHistory(10);

            console.log('\n🔒 CONTEXT MANAGER STATE:\n');
            console.log(`Current Mode:     ${state.currentMode || 'none'}`);
            console.log(`Lock Strength:    ${state.lockStrength.toFixed(2)}`);
            console.log(`Change Threshold: ${state.changeThreshold.toFixed(2)}`);
            console.log(`Mode Changes:     ${state.stats.totalModeChanges}`);
            console.log(`Messages Since:   ${state.messagesSinceLastChange}`);
            console.log(`Status:           ${state.status}\n`);

            console.log('📜 CONVERSATION HISTORY (last 10):\n');
            history.forEach((entry, i) => {
                const time = new Date(entry.timestamp).toLocaleTimeString('sk-SK');
                console.log(`${i + 1}. [${time}] [${entry.mode}] "${entry.userInput.substring(0, 50)}..."`);
                console.log(`   Confidence: ${entry.confidence.toFixed(2)}, Lock: ${entry.lockStrength.toFixed(2)}, Action: ${entry.action}\n`);
            });

            return;
        }

        // v0.7: /unlock command
        if (trimmed === '/unlock') {
            const state = contextManager.getState();
            if (!state.currentMode) {
                console.log('\n⚠️  Context manager nie je locked.\n');
                return;
            }

            contextManager.reset();
            console.log('\n🔓 Context manager unlocked! Ďalšia správa vyberie nový mód.\n');
            return;
        }

        // v1.0: /reset command - Reset bot detection
        if (trimmed === '/reset') {
            const { resetBotDetection } = await import('./src/protection/botKiller.js');
            resetBotDetection();
            console.log('\n🛡️ Bot detection reset! Môžeš pokračovať normálne.\n');
            return;
        }

        if (trimmed === '/backup') {
            try {
                const backupPath = await createBackup();
                console.log(`\n✅ Záloha vytvorená: ${backupPath}\n`);
            } catch (err) {
                console.log(`\n❌ Chyba pri zálohovaní: ${err.message}\n`);
            }
            return;
        }

        if (trimmed === '/profile') {
            const profile = await getProfileSummary();
            console.log('\n👤 PROFIL:\n');
            console.log(profile + '\n');
            return;
        }

        if (trimmed.startsWith('/mode ')) {
            const newMode = trimmed.split(' ')[1];
            if (!['auto', 'core', 'empatia', 'popici', 'glitch', 'glitchoslav', 'human'].includes(newMode)) {
                console.log('\n❌ Neznámy mód. Použi: auto, core, empatia, popici, glitch, glitchoslav, human\n');
                return;
            }

            currentMode = newMode;

            // v0.7: Force unlock context manager
            if (newMode !== 'auto') {
                contextManager.forceUnlock(newMode, 'USER_COMMAND');
                console.log(`\n✅ Mód prepnutý na: ${newMode} (context manager force unlocked)\n`);
            } else {
                contextManager.reset();
                console.log(`\n✅ Mód prepnutý na: AUTO (automatická detekcia)\n`);
            }

            return;
        }

        // 🎵 v0.10.0: /rhythm command
        if (trimmed.startsWith('/rhythm ')) {
            const rhythmMode = trimmed.split(' ')[1];
            const validModes = ['short', 'medium', 'long', 'rune', 'silence', 'šepot', 'echo', 'príbeh', 'ticho'];

            if (!validModes.includes(rhythmMode?.toLowerCase())) {
                console.log('\n❌ Neznámy rhythm mód.\n');
                console.log('💡 Dostupné módy:');
                console.log('  short/šepot   - max 20 slov');
                console.log('  medium/echo   - max 100 slov (default)');
                console.log('  long/príbeh   - max 300 slov');
                console.log('  rune          - len sacred rune');
                console.log('  silence/ticho - len prasklina symbol\n');
                return;
            }

            // Store rhythm override in agent state (will be used in next response)
            agent.rhythmOverride = rhythmMode.toLowerCase();
            console.log(`\n🎵 Response rhythm nastavený na: ${rhythmMode.toUpperCase()} (platí pre ďalšiu odpoveď)\n`);
            return;
        }

        // 🔥 SYSTEM HEALTH CHECK
        if (trimmed === '/health' || trimmed === '/status') {
            await showHealthCheck();
            return;
        }

        // 🔥 v0.10.0-alpha.2: /fire command
        if (trimmed === '/fire') {
            const { forceFireMode } = await import('./src/core/fireMode.js');
            const fireConfig = forceFireMode(1.0); // Max intensity
            console.log(`\n🔥 FIRE MODE aktivovaný (${(fireConfig.intensity * 100).toFixed(0)}% intensity)`);
            console.log('   Ďalšia odpoveď bude brutal truth - žiadne metafory, žiadne servítky.\n');
            console.log('💡 Pošli teraz správu, na ktorú chceš nekompromisný feedback.\n');
            return;
        }

        // 🌱 v0.10.0-alpha.3: /birth command
        if (trimmed === '/birth') {
            const { startBirthRitual } = await import('./src/rituals/birthRitual.js');
            const ritual = startBirthRitual();
            console.log(`\n${ritual.question}\n`);
            return;
        }

        // 🔮 RITUAL COMMANDS
        if (trimmed === '/today') {
            const result = await handleRitual('/today', '');
            console.log(`\n${result}\n`);
            return;
        }

        if (trimmed === '/next') {
            const result = await handleRitual('/next', '');
            console.log(`\n${result}\n`);
            return;
        }

        if (trimmed === '/seeds') {
            const result = await handleRitual('/seeds', '');
            console.log(`\n${result}\n`);
            return;
        }

        // ========== AUTO_CONSOLIDATION_v1: /chapters command ==========
        if (trimmed.startsWith('/chapters')) {
            // TODO: Implement chaptersCommand.js
            console.log('⚠️ /chapters command not yet implemented');
            return;
        }

        // 🔥 EPOCH KEEPER COMMANDS
        if (trimmed === '/epochs') {
            const { displayEpochs } = await import('./src/core/epochKeeper.js');
            await displayEpochs(20);
            return;
        }

        if (trimmed.startsWith('/epoch ')) {
            const description = trimmed.substring(7).trim();
            const { recordEpoch } = await import('./src/core/epochKeeper.js');
            await recordEpoch(description);
            return;
        }

        // 🛡️ OLLAMA HEALTH COMMANDS (MISSION: OLLAMA_TIMEOUT_FIX_v1)
        if (trimmed === '/reset_ollama') {
            const { resetOllamaHealth } = await import('./sp4os/llmLocal.js');
            resetOllamaHealth();
            console.log('\n✅ Ollama health state reset - trying fresh connection\n');
            return;
        }

        if (trimmed === '/ollama_status') {
            const { getOllamaHealthStatus, getOllamaConfig } = await import('./sp4os/llmLocal.js');
            const health = getOllamaHealthStatus();
            const config = getOllamaConfig();

            console.log('\n┌─────────────────────────────────────┐');
            console.log('│  🛡️ OLLAMA HEALTH STATUS            │');
            console.log('└─────────────────────────────────────┘\n');
            console.log(`   Status: ${health.unhealthy ? '❌ UNHEALTHY' : '✅ HEALTHY'}`);
            console.log(`   Consecutive failures: ${health.consecutiveFailures}`);
            console.log(`   Cooldown remaining: ${Math.round(health.cooldownMs / 1000)}s`);
            console.log(`   Last health check: ${health.lastHealthCheck || 'Never'}`);
            console.log('\n   Config:');
            console.log(`   Timeout: ${config.timeoutMs}ms`);
            console.log(`   Max retries: ${config.maxRetries}`);
            console.log(`   Host: ${config.host}\n`);
            return;
        }

        // 🇸🇰 LANGUAGE ENFORCER COMMANDS (MISSION: LANGUAGE_ENFORCER_v1)
        if (trimmed === '/language_stats') {
            const { getEnforcementStats } = await import('./src/core/languageEnforcer.js');
            const stats = getEnforcementStats();

            console.log('\n┌─────────────────────────────────────┐');
            console.log('│  🇸🇰 LANGUAGE ENFORCER STATS         │');
            console.log('└─────────────────────────────────────┘\n');
            console.log(`   Total checks: ${stats.totalChecks}`);
            console.log(`   English detected: ${stats.englishDetected}`);
            console.log(`   Retries successful: ${stats.retriesSuccessful}`);
            console.log(`   Fallbacks used: ${stats.fallbacksUsed}`);

            if (stats.totalChecks > 0) {
                const successRate = ((stats.retriesSuccessful / (stats.englishDetected || 1)) * 100).toFixed(1);
                console.log(`\n   Success rate: ${successRate}%`);
            }
            console.log('');
            return;
        }

        if (trimmed.startsWith('/mirror')) {
            const days = trimmed.split(' ')[1] || '7';
            const result = await handleRitual('/mirror', days);
            console.log(`\n${result}\n`);
            return;
        }

        if (trimmed.startsWith('/seed ')) {
            const text = trimmed.substring(6).trim();
            const result = await handleRitual('/seed', text);
            console.log(`\n${result}\n`);
            return;
        }

        if (trimmed.startsWith('/trinity ')) {
            const question = trimmed.substring(9).trim();
            const result = await handleRitual('/trinity', question);
            console.log(`\n${result}\n`);
            return;
        }

        if (trimmed === '/consolidate') {
            console.log('\n🔄 Manuálna konsolidácia nie je aktívna.\n');
            console.log('ℹ️  Konsolidácia pamäte prebieha automaticky cez scheduler (daily/weekly/monthly).\n');
            console.log('💡 Ak chceš spustiť konsolidáciu ručne, použi: npm run consolidate\n');
            return;
        }

        // 🎯 GOAL COMMANDS (v0.8.6.9)
        if (trimmed === '/goal' || trimmed === '/goals') {
            const { active, recent } = await getGoals();

            if (!active && recent.length === 0) {
                console.log('\n📌 Žiadne ciele.\n');
                console.log('💡 Použi: /goal <text> - nastaví nový cieľ\n');
                return;
            }

            if (active) {
                const age = Math.floor((Date.now() - new Date(active.created_at)) / (1000 * 60 * 60 * 24));
                console.log('\n🎯 AKTÍVNY CIEĽ:\n');
                console.log(`  "${active.text}"`);
                console.log(`  Vytvorený: ${new Date(active.created_at).toLocaleDateString('sk-SK')} (${age} dní)\n`);
            }

            if (recent.length > 1) {
                console.log('📜 HISTÓRIA CIEĽOV (posledných 10):\n');
                recent.forEach((g, i) => {
                    const statusEmoji = g.status === 'done' ? '✅' : g.status === 'dropped' ? '❌' : g.status === 'paused' ? '⏸️' : '🎯';
                    const date = new Date(g.created_at).toLocaleDateString('sk-SK');
                    console.log(`  ${i + 1}. ${statusEmoji} ${g.text} (${date}, ${g.status})`);
                });
                console.log('');
            }

            console.log('💡 Príkazy:');
            console.log('  /goal <text>  - nastav nový cieľ');
            console.log('  /goal done    - označ ako dokončený');
            console.log('  /goal drop    - dropni aktívny cieľ\n');
            return;
        }

        if (trimmed.startsWith('/goal ')) {
            const goalText = trimmed.substring(6).trim();

            if (goalText === 'done') {
                const result = await completeGoal();
                if (result.success) {
                    console.log(`\n✅ Cieľ dokončený: "${result.goal.text}"\n`);
                } else {
                    console.log(`\n❌ ${result.error}\n`);
                }
                return;
            }

            if (goalText === 'drop') {
                const result = await dropGoal();
                if (result.success) {
                    console.log(`\n🗑️  Cieľ dropnutý: "${result.goal.text}"\n`);
                } else {
                    console.log(`\n❌ ${result.error}\n`);
                }
                return;
            }

            // Nastaviť nový cieľ
            const result = await setGoal(goalText);
            if (result.success) {
                console.log(`\n🎯 Nový cieľ nastavený: "${result.goal.text}"\n`);
            } else {
                console.log(`\n❌ ${result.error}\n`);
            }
            return;
        }

        // 🔥 v0.11.7: ACTION SHORTCUTS (bypass LLM, execute directly)

        // /idea <text> - Save snippet immediately
        if (trimmed.startsWith('/idea ')) {
            const snippetText = trimmed.substring(6).trim();
            if (!snippetText) {
                console.log('\n❌ Použitie: /idea <text>\n   Príklad: /idea Skúsiť local-first AI šifrovaný messenger\n');
                return;
            }

            const { processResponseActions } = await import('./src/core/actionRouter.js');
            const actionPayload = {
                type: "SAVE_SNIPPET",
                payload: {
                    title: snippetText.substring(0, 50) + (snippetText.length > 50 ? '...' : ''),
                    content: snippetText,
                    category: "idea",
                    tags: ["user_command"]
                }
            };
            const actionJSON = JSON.stringify(actionPayload);

            // Debug log
            console.log('🐛 [DEBUG] Action JSON:', actionJSON);

            const result = await processResponseActions(`\`\`\`json\n${actionJSON}\n\`\`\``, {
                persona: 'core',
                userMessage: trimmed
            });

            if (result.executed > 0) {
                console.log('\n✅ Idea saved!\n');
            } else {
                console.log('\n❌ Idea save failed. Check logs.\n');
            }
            return;
        }

        // /remind <when> <text> - Schedule reminder immediately
        if (trimmed.startsWith('/remind ')) {
            const parts = trimmed.substring(8).trim().split(/\s+/);
            if (parts.length < 2) {
                console.log('\n❌ Použitie: /remind <when> <text>\n   Príklady:\n   /remind 2h Skontrolovať server\n   /remind 1d Backup data\n   /remind 2025-11-22T15:00Z Meeting s klientom\n');
                return;
            }

            const when = parts[0];
            const reminderText = parts.slice(1).join(' ');

            const { processResponseActions } = await import('./src/core/actionRouter.js');
            const actionJSON = JSON.stringify({
                type: "SCHEDULE_REMINDER",
                payload: {
                    when: when,
                    payload: reminderText
                }
            });

            const result = await processResponseActions(`\`\`\`json\n${actionJSON}\n\`\`\``, {
                persona: 'glitchoslav',
                userMessage: trimmed
            });

            if (result.executed > 0) {
                console.log('\n✅ Reminder scheduled!\n');
            } else {
                console.log('\n❌ Reminder scheduling failed. Check logs.\n');
            }
            return;
        }

        // 🧬 v1.3.0: Personal Rituals Commands
        if (trimmed === '/whoami') {
            const result = await handleWhoAmICommand();
            console.log(`\n${result}\n`);
            return;
        }



        if (trimmed === '/pulse') {
            const result = await handlePulseCommand();
            console.log(`\n${result}\n`);
            return;
        }

        if (trimmed.startsWith('/seed_refresh')) {
            const result = await handleSeedRefreshCommand(trimmed);
            console.log(`\n${result}\n`);
            return;
        }

        // /system - System diagnostics
        if (trimmed.startsWith('/system')) {
            await handleSystemCommand({
                reply: async (msg) => console.log(`\n🤖 SYSTEM:\n${msg}\n`)
            });
            return;
        }

        // ─── /zbor — DHZ kolektívna pamäť (v1.1) ─────────────────────
        if (trimmed === '/zbor' || trimmed.startsWith('/zbor ')) {
            const BRIDGE_BASE = (process.env.SP4_BRIDGE_URL || 'http://localhost:3002/api/bridge/ask')
                .replace(/\/api\/bridge\/ask$/, '');
            const zbArg = trimmed.slice(5).trim();

            const zbGet = async (path) => {
                try {
                    const r = await fetch(BRIDGE_BASE + path, {
                        headers: getBridgeClientHeaders(),
                        signal: AbortSignal.timeout(5000)
                    });
                    return r.json();
                } catch (e) { return { error: 'SP4 bridge nedostupný: ' + e.message }; }
            };
            const zbPost = async (path, body) => {
                try {
                    const r = await fetch(BRIDGE_BASE + path, {
                        method: 'POST', headers: getBridgeClientHeaders(),
                        body: JSON.stringify(body), signal: AbortSignal.timeout(5000)
                    });
                    return r.json();
                } catch (e) { return { error: 'SP4 bridge nedostupný: ' + e.message }; }
            };

            // /zbor policy
            if (zbArg === 'policy') {
                const data = await zbGet('/api/data-policy');
                if (data.error) { console.log('\n❌ ' + data.error + '\n'); return; }
                console.log('\n🔐 DATA POLICY — SP4 x DHZ organizmická pamäť:\n');
                if (Array.isArray(data.layers)) {
                    data.layers.forEach(l => console.log(`  Vrstva ${l.id}: ${l.name} — ${l.retention || l.description || ''}`.trim()));
                } else {
                    console.log(JSON.stringify(data, null, 2));
                }
                console.log();
                return;
            }

            // /zbor meta
            if (zbArg === 'meta') {
                const data = await zbGet('/api/collective/meta');
                if (data.error) { console.log('\n❌ ' + data.error + '\n'); return; }
                console.log('\n📊 KOLEKTÍVNA PAMÄŤ — meta:\n');
                console.log(`  💡 Insighty : ${data.insightCount ?? '?'}`);
                console.log(`  🔧 Tipy     : ${data.tipCount ?? '?'}`);
                console.log(`  📖 Príbehy  : ${data.storyCount ?? '?'}`);
                if (data.lastUpdated) {
                    console.log(`  🕐 Posledná aktualizácia: ${new Date(data.lastUpdated).toLocaleString('sk-SK')}`);
                }
                console.log();
                return;
            }

            // /zbor teach "<tip>"
            const teachMatch = zbArg.match(/^teach\s+["']?(.+?)["']?$/i);
            if (teachMatch) {
                const text = teachMatch[1].trim();
                const topicGuess = text.split(/\s+/).slice(0, 3).join(' ');
                const data = await zbPost('/api/collective/tip', { topic: topicGuess, text, author: 'kefyk-cli' });
                if (data.error) { console.log('\n❌ ' + data.error + '\n'); return; }
                console.log(data.ok ? '\n✅ Tip uložený do kolektívnej pamäte zboru.\n' : '\n⚠️ ' + JSON.stringify(data) + '\n');
                return;
            }

            // /zbor <query>
            if (zbArg) {
                const data = await zbGet('/api/collective/search?q=' + encodeURIComponent(zbArg));
                if (data.error) { console.log('\n❌ ' + data.error + '\n'); return; }
                const results = data.results || (Array.isArray(data) ? data : []);
                console.log(`\n🔍 Výsledky hľadania pre „${zbArg}":\n`);
                if (!results.length) {
                    console.log('  Nič nenájdené.\n');
                } else {
                    results.slice(0, 10).forEach((r, i) => {
                        const tag = r.type === 'tip' ? '🔧' : '💡';
                        const topic = r.topic ? ` [${r.topic}]` : '';
                        console.log(`  ${i + 1}. ${tag}${topic} ${r.text}`);
                    });
                    console.log();
                }
                return;
            }

            // /zbor — bez argumentu: posledné insighty + tipy
            const [ins, tipsD] = await Promise.all([
                zbGet('/api/collective/insights?limit=5'),
                zbGet('/api/collective/tips?limit=5')
            ]);
            console.log('\n🧠 KOLEKTÍVNA PAMÄŤ ZBORU:\n');
            const insArr = ins.insights || (Array.isArray(ins) ? ins : []);
            if (insArr.length) {
                console.log('💡 Insighty:');
                insArr.slice(0, 5).forEach((r, i) => {
                    console.log(`  ${i + 1}. ${r.topic ? '[' + r.topic + '] ' : ''}${r.text}`);
                });
                console.log();
            }
            const tipsArr = tipsD.tips || (Array.isArray(tipsD) ? tipsD : []);
            if (tipsArr.length) {
                console.log('🔧 Tipy:');
                tipsArr.slice(0, 5).forEach((r, i) => {
                    console.log(`  ${i + 1}. ${r.topic ? '[' + r.topic + '] ' : ''}${r.text}`);
                });
                console.log();
            }
            if (!insArr.length && !tipsArr.length) {
                console.log('  Pamäť zboru je zatiaľ prázdna. Florián začne zbierať insighty po prvých rozhovoroch.\n');
            }
            console.log('  → /zbor <query>  hľadaj  ·  /zbor teach "<tip>"  pridaj  ·  /zbor meta  štatistiky\n');
            return;
        }

        // Slash command routing — centralizovaný cez handleRitual
        if (trimmed.startsWith('/') && !trimmed.startsWith('/memory_audit')) {

            const parts = trimmed.split(' ');
            const command = parts[0].substring(1);
            const args = parts.slice(1).join(' ');

            if (process.env.SP4_VERBOSE === '1') {
                console.log(`[SLASH COMMAND] /${command} args="${args}"`);
            }

            try {
                const result = await handleRitual(command, args, { currentMode });
                if (process.env.SP4_VERBOSE === '1') {
                    console.log(`[COMMAND RESULT] ${String(result).substring(0, 80)}`);
                }
                console.log(`\n${result}\n`);
            } catch (err) {
                console.log(`\n❌ Chyba pri spracovaní príkazu /${command}: ${err.message}\n`);
            }
            return;
        }

        // ═══════════════════════════════════════════════════════════
        // MEMORY AUDIT COMMAND (v1.0 - Memory System Upgrade)
        // ═══════════════════════════════════════════════════════════

        if (trimmed === '/memory_audit' || trimmed.startsWith('/memory_audit ')) {
            const args = trimmed.split(' ').slice(1);
            const action = args[0]; // 'archive', 'prune', 'export'

            console.log('\n📊 MEMORY AUDIT - SP4 Memory System v1.0\n');

            const state = await loadMemory();
            const { getMemoryAge, getDaysSinceLastUse, shouldArchive, shouldPrune } =
                await import('./memory/metadataHelpers.js');

            const rawMemory = Array.isArray(state.rawMemory?.log) ? state.rawMemory.log :
                Array.isArray(state.rawMemory) ? state.rawMemory : [];

            // Calculate statistics
            const totalMemories = rawMemory.length;
            const byReasonKept = {};
            const importanceDistribution = { high: 0, medium: 0, low: 0 };

            rawMemory.forEach(entry => {
                const metadata = entry.metadata || entry;
                const reason = metadata.reasonKept || 'unknown';
                byReasonKept[reason] = (byReasonKept[reason] || 0) + 1;

                const importance = metadata.importance || 0.5;
                if (importance >= 0.7) importanceDistribution.high++;
                else if (importance >= 0.4) importanceDistribution.medium++;
                else importanceDistribution.low++;
            });

            // Find archive/prune candidates
            const archiveCandidates = rawMemory.filter(e => shouldArchive(e.metadata || e));
            const pruneCandidates = rawMemory.filter(e => shouldPrune(e.metadata || e));

            // Display overview
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📈 MEMORY OVERVIEW');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            console.log(`Total memories: ${totalMemories}`);
            console.log(`Archived: ${state.archivedMemory?.length || 0}`);
            console.log(`\n💡 Importance Distribution:`);
            console.log(`  High (0.7+):   ${importanceDistribution.high} (${((importanceDistribution.high / totalMemories) * 100).toFixed(1)}%)`);
            console.log(`  Medium (0.4+): ${importanceDistribution.medium} (${((importanceDistribution.medium / totalMemories) * 100).toFixed(1)}%)`);
            console.log(`  Low (<0.4):    ${importanceDistribution.low} (${((importanceDistribution.low / totalMemories) * 100).toFixed(1)}%)`);

            console.log(`\n🏷️  Memories by Reason Kept:`);
            Object.entries(byReasonKept)
                .sort((a, b) => b[1] - a[1])
                .forEach(([reason, count]) => {
                    console.log(`  ${reason.padEnd(20)} ${count}`);
                });

            console.log(`\n📦 Archive Candidates: ${archiveCandidates.length}`);
            console.log(`   (age >= 180 days, importance <= 0.3, unused >= 90 days)`);

            console.log(`\n🗑️  Prune Candidates: ${pruneCandidates.length}`);
            console.log(`   (age >= 365 days, importance <= 0.2, unused >= 180 days)`);

            // Episodic memory stats
            console.log(`\n📅 Episodic Memory:`);
            console.log(`  Daily entries:     ${Object.keys(state.episodicMemory?.daily || {}).length}`);
            console.log(`  Weekly entries:    ${Object.keys(state.episodicMemory?.weekly || {}).length}`);
            console.log(`  Monthly entries:   ${Object.keys(state.episodicMemory?.monthly || {}).length}`);

            // Action handling
            if (action === 'archive') {
                if (archiveCandidates.length === 0) {
                    console.log('\n✅ Žiadne memories na archival.\n');
                    return;
                }

                console.log(`\n⚠️  Archiving ${archiveCandidates.length} memories...`);

                if (!state.archivedMemory) state.archivedMemory = [];
                archiveCandidates.forEach(entry => {
                    state.archivedMemory.push({
                        ...entry,
                        archivedAt: new Date().toISOString(),
                        reason: 'manual_archive'
                    });
                });

                const archivedTimestamps = new Set(archiveCandidates.map(e => e.ts || e.timestamp));

                // Update rawMemory.log structure
                if (state.rawMemory?.log) {
                    state.rawMemory.log = rawMemory.filter(e => !archivedTimestamps.has(e.ts || e.timestamp));
                } else {
                    state.rawMemory = rawMemory.filter(e => !archivedTimestamps.has(e.ts || e.timestamp));
                }

                await saveMemory(state);
                console.log(`✅ Archived ${archiveCandidates.length} memories.\n`);
                return;
            }

            if (action === 'prune') {
                if (pruneCandidates.length === 0) {
                    console.log('\n✅ Žiadne memories na pruning.\n');
                    return;
                }

                console.log(`\n⚠️  DANGEROUS: Permanently deleting ${pruneCandidates.length} memories!`);
                console.log('   Type YES to confirm: ');

                // Note: In production, use readline for confirmation
                // For now, just show warning
                console.log('\n❌ Prune operation requires explicit confirmation (not implemented in CLI).');
                console.log('   Use /memory_audit archive instead, or modify code for production.\n');
                return;
            }

            if (action === 'export') {
                const exportData = {
                    exportedAt: new Date().toISOString(),
                    totalMemories,
                    byReasonKept,
                    importanceDistribution,
                    archiveCandidates: archiveCandidates.length,
                    pruneCandidates: pruneCandidates.length,
                    episodicMemory: {
                        daily: Object.keys(state.episodicMemory?.daily || {}).length,
                        weekly: Object.keys(state.episodicMemory?.weekly || {}).length,
                        monthly: Object.keys(state.episodicMemory?.monthly || {}).length
                    }
                };

                const exportPath = `./data/memory-audit-${Date.now()}.json`;
                fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
                console.log(`\n📄 Exported audit report to: ${exportPath}\n`);
                return;
            }

            // Default: just show stats
            console.log('\n💡 Actions:');
            console.log('  /memory_audit archive  - Archive low-importance memories');
            console.log('  /memory_audit prune    - Permanently delete very old memories');
            console.log('  /memory_audit export   - Export audit report to JSON\n');
            return;
        }

        // ═══════════════════════════════════════════════════════════
        // FULL AUTONOMY v2.0 - MISSION COMMAND
        // ═══════════════════════════════════════════════════════════

        if (trimmed.startsWith('/mission ')) {
            console.log('\n🚀 Spúšťam Full Autonomy v2.0...\n');

            try {
                const { SP4IntegratedAgent } = await import('./integration.js');
                const integrationService = new SP4IntegratedAgent();
                await integrationService.initialize(); // ← CRITICAL FIX

                const result = await integrationService.processMessage(trimmed);

                console.log(`\n${result.response}\n`);

                if (result.meta?.missionId) {
                    console.log(`\n📊 Mission Stats:`);
                    console.log(`  ID: ${result.meta.missionId}`);
                    console.log(`  Tasks: ${result.meta.tasksCompleted || 0}`);
                    console.log(`  Cost: $${(result.meta.totalCost || 0).toFixed(6)}`);
                    console.log(`  Time: ${((result.meta.totalTime || 0) / 60000).toFixed(1)} min\n`);
                }

                return;
            } catch (error) {
                console.error(`\n❌ Mission failed: ${error.message}\n`);
                return;
            }
        }

        // ═══════════════════════════════════════════════════════════
        // CHAT WITH AI (v0.7 INTEGRATED)
        // ═══════════════════════════════════════════════════════════

        // 🌱 v0.10.0-alpha.3: Birth Ritual intercept
        // If Birth Ritual is active, process message as ritual answer
        const { isBirthRitualActive, processBirthAnswer } = await import('./src/rituals/birthRitual.js');

        if (isBirthRitualActive()) {
            console.log('   🌱 Spracúvam Birth Ritual odpoveď...\n');

            const result = await processBirthAnswer(trimmed);

            if (result.error) {
                console.log(`\n❌ ${result.message}\n`);
                return;
            }

            if (result.complete) {
                // Ritual dokončený - zobraz ceremony completion
                console.log(`\n${result.message}\n`);
                return;
            } else {
                // Ďalšia otázka
                console.log(`\n${result.nextQuestion}\n`);
                return;
            }
        }

        try {
            const mem = await loadMemory();
            const profile = await getProfileSummary();

            // v0.7: AUTO MODE - use modeCompass with context manager
            let detectedMode = currentMode;

            if (currentMode === 'auto') {
                runtimeLog('   🧭 Detekujem mód...');
                detectedMode = pickMode(trimmed, true); // useContextLock = true
                runtimeLog(`   🎯 Zvolený mód: ${detectedMode.toUpperCase()}\n`);
            }

            // Build prompt
            const state = {
                relationshipModel: { level: mem.relationship?.stage || 'Stranger' },
                emotionalContext: { currentMood: 'neutral', intensity: 0 },
                metrics: { interactions: mem.rawMemory?.log?.length || 0 },
                capabilityLevel: 'FULL',
                user: { name: mem.userProfile?.name || 'Kefyk' }
            };

            const pkg = buildPrompt({
                mode: detectedMode,
                state,
                userMessage: trimmed,
                extraDirectives: ''
            });

            runtimeLog('   ⏳ Myslím...\n');

            // Use integrated agent (multi-agent council)
            const result = await agent.ask(trimmed, {
                mode: detectedMode,
                systemPrompt: pkg.systemPrompt
            });

            // Extract response and actual handler
            const reply = typeof result === 'string' ? result : result.response;
            const actualHandler = typeof result === 'object' ? result.handledBy : detectedMode;

            // 🐛 DEBUG: Log actualHandler
            if (typeof result === 'object' && result.handledBy) {
                runtimeLog(`   🎭 Actual handler: ${result.handledBy} (detected: ${detectedMode})`);
            }

            // 🎭 Persona header mapping (use ACTUAL handler, not detected mode)
            const personaHeaders = {
                core: '🧠 CORE',
                popici: '💥 POPIČI KOKOT',
                glitchoslav: '🌀 GLITCHOSLAV',
                glitch: '🌀 GLITCHOSLAV'  // Alias
            };
            const header = personaHeaders[actualHandler] || personaHeaders[detectedMode] || '🔥 SP4';

            console.log(`${header}: ${reply}\n`);

            // v1.2.0: Live status bar after each response (uses user seed)
            await printStatusBar({
                health: { version: '1.2.0', checks: { memoryDir: true, dataDir: true } },
                agents: ['CORE', 'GLITCH', 'POPIČI', 'VALID'],
                jobs: 4
            });

        } catch (err) {
            console.error(`\n❌ Chyba: ${err.message}\n`);
            console.log('💡 Skontroluj, či beží Ollama: ollama run llama3\n');
        }
    });
}

// Start
init().catch(console.error);
