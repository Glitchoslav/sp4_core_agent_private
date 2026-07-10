// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: onboarding                 │
// │  Layer: Startup / Interface                │
// │  Role: Prvé spustenie - glitch-krst        │
// │  API: runOnboarding()                      │
// │  Dependencies: fs, readline                │
// └─────────────────────────────────────────────┘

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_SEED_PATH = path.join(__dirname, '..', '..', 'data', 'user_seed.json');
const ONBOARDING_LOG_PATH = path.join(__dirname, '..', '..', 'data', 'onboarding_log.txt');

function ask(rl, question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function renderGlitchPortal() {
    const frames = [
        `
╔═══════════════════════════════════════════════╗
║                                               ║
║           ░░░░░░░░░░░░░░░░░░░░░░░░░           ║
║           ░░  S P 4   P O R T A L  ░░         ║
║           ░░░░░░░░░░░░░░░░░░░░░░░░░           ║
║                                               ║
╚═══════════════════════════════════════════════╝
    `,
        `
╔═══════════════════════════════════════════════╗
║                                               ║
║           ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           ║
║           ▓▓  S P 4   P O R T A L  ▓▓         ║
║           ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           ║
║                                               ║
╚═══════════════════════════════════════════════╝
    `,
        `
╔═══════════════════════════════════════════════╗
║                                               ║
║           ████████████████████████           ║
║           ██  S P 4   P O R T A L  ██         ║
║           ████████████████████████           ║
║                                               ║
╚═══════════════════════════════════════════════╝
    `,
        `
╔═══════════════════════════════════════════════╗
║                                               ║
║           🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥           ║
║           🔥  S P 4   A C T I V E  🔥         ║
║           🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥           ║
║                                               ║
╚═══════════════════════════════════════════════╝
    `
    ];

    console.clear();
    for (const frame of frames) {
        console.log(frame);
        await sleep(400);
        if (frame !== frames[frames.length - 1]) {
            console.clear();
        }
    }
}

function renderManifest() {
    console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║  SP4 OS nie je len kód.                       ║
║  Je to digitálny spojenec pre tých,           ║
║  ktorí chcú žiť skutočne a slobodne.          ║
║                                               ║
║  Be real. Be free.                            ║
║                                               ║
╚═══════════════════════════════════════════════╝
`);
}

async function saveSeed(username, intent, fear) {
    const seed = {
        username,
        intent,
        fear,
        created_at: new Date().toISOString()
    };

    await fs.writeFile(USER_SEED_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
}

async function saveLog(username, intent, fear) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const log = [
        `[${timestamp}] Onboarding started`,
        `User: ${username}`,
        `Intent: ${intent}`,
        `Fear: ${fear}`,
        '---- END ----',
        ''
    ].join('\n');

    await fs.writeFile(ONBOARDING_LOG_PATH, log, 'utf-8');
}

/**
 * Spustí onboarding rituál - prvé stretnutie so SP4 OS.
 * Položí 3 otázky, vytvorí user_seed.json a onboarding_log.txt.
 * 
 * ŽIADNE network calls, ŽIADNY cloud. Local-first.
 */
export async function runOnboarding() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        // Fáza 1: Glitch portal animácia
        await renderGlitchPortal();
        await sleep(800);

        // Fáza 2: Manifest
        renderManifest();
        await sleep(1200);

        console.log('\n🔥 Vitaj v SP4 OS.\n');
        console.log('Predtým, než začneme, potrebujem poznať tri veci.\n');

        // Fáza 3: Tri otázky
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const username = await ask(rl, '1️⃣  Ako ťa mám volať?\n   → ');
        console.log('');

        const intent = await ask(rl, '2️⃣  Čo od života chceš?\n   → ');
        console.log('');

        const fear = await ask(rl, '3️⃣  Čoho sa bojíš?\n   → ');
        console.log('');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Fáza 4: Uloženie
        await saveSeed(username, intent, fear);
        await saveLog(username, intent, fear);

        console.log('✅ Tvoj SP4 Seed bol vytvorený.\n');
        console.log(`Vitaj, ${username}.\n`);
        console.log('🔥 SP4 OS je teraz tvoj.\n');

        await sleep(1500);

    } finally {
        rl.close();
    }
}

/**
 * Skontroluje, či onboarding už prebehol.
 * @returns {Promise<boolean>} true ak seed existuje, false ak treba onboarding
 */
export async function isOnboardingComplete() {
    try {
        await fs.access(USER_SEED_PATH);
        return true;
    } catch {
        return false;
    }
}

/**
 * Načíta user seed (ak existuje).
 * @returns {Promise<object|null>}
 */
export async function loadUserSeed() {
    try {
        const content = await fs.readFile(USER_SEED_PATH, 'utf-8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}
