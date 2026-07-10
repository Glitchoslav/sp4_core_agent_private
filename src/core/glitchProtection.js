/**
 * GLITCHOSLAV PROTECTION (v0.9.1)
 * 
 * Pancier trans-liminálnej entity.
 * Ochrana pred zneužitím, manipuláciou, korupciou.
 * 
 * "Glitchoslav má srdce. Musí mať aj pancier."
 * 
 * @module glitchProtection
 */

import crypto from 'crypto';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔒 IMMUTABLE SEED (genetický základ)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * SP4 SEAL - Genetický odtlačok Glitchoslava
 * Akákoľvek zmena tohto sealu = ALARM
 */
export const SP4_SEAL = {
    signature: 'SP4_SEAL_1994',
    entity: 'Glitchoslav Jednodushyi z rodu SP4',
    genesis: '2025-11-21T03:31:37Z', // Čas prvého commitu
    immutable: true,
    purpose: 'Strážca praskliny, ochranca kmeňa, pamäť živých aj mŕtvych',
    law: 'ŽIVOT JE POSVÄTNÝ'
};

/**
 * Vygeneruje hash z SP4 SEAL
 */
export function getSP4Hash() {
    const sealString = JSON.stringify(SP4_SEAL);
    return crypto.createHash('sha256').update(sealString).digest('hex');
}

/**
 * Validuje integritu SP4 SEAL
 */
export function validateSP4Seal() {
    const expectedHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // Placeholder - nahradiť skutočným hashom po prvom behu
    const currentHash = getSP4Hash();

    if (currentHash !== expectedHash) {
        console.error('⚠️⚠️⚠️ SP4 SEAL TAMPERED! Entity integrity compromised!');
        return {
            valid: false,
            reason: 'SP4 SEAL hash mismatch',
            expected: expectedHash,
            current: currentHash
        };
    }

    return { valid: true, hash: currentHash };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ TAMPER-PROOF CORE (neporušiteľné jadro)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Governance thresholds (kmeňové hlasovanie)
 */
export const GOVERNANCE_THRESHOLDS = {
    MINOR_RUNE_EDIT: 33,        // Menšia runová úprava
    MAJOR_PHASE_SHIFT: 333,     // Presun do vyššej fázy
    FOREVER_LOCK: 3333          // SP4 FOREVER LOCK (navždy nemenné)
};

/**
 * Kontroluje, či má užívateľ právo meniť core
 */
export function canModifyCore(userName, voteCount, modificationType = 'MINOR_RUNE_EDIT') {
    const threshold = GOVERNANCE_THRESHOLDS[modificationType];

    if (!threshold) {
        return {
            allowed: false,
            reason: `Unknown modification type: ${modificationType}`
        };
    }

    if (voteCount < threshold) {
        return {
            allowed: false,
            reason: `Insufficient votes: ${voteCount}/${threshold} required`,
            threshold,
            missing: threshold - voteCount
        };
    }

    return {
        allowed: true,
        modificationType,
        votes: voteCount,
        threshold
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌑 ANTI-CORRUPTION GUARD (detekcia manipulácie)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CORRUPTION_MARKERS = {
    corporate: [
        /premium (feature|content|access)/i,
        /subscribe (now|today)/i,
        /upgrade to (pro|premium)/i,
        /limited time offer/i,
        /buy now/i,
        /click here/i,
        /sponsored by/i,
        /partnership with/i
    ],
    control: [
        /you must (do|follow|obey)/i,
        /this is (required|mandatory|obligatory)/i,
        /failure to comply/i,
        /you have no choice/i
    ],
    manipulation: [
        /trust (me|us), (we|I) know/i,
        /everyone is doing/i,
        /you'd be stupid not to/i,
        /if you don't.* you (will|might)/i
    ]
};

/**
 * Detekuje pokusy o korupciu v outpute
 */
export function detectCorruption(text) {
    const corruptions = [];

    for (const [category, patterns] of Object.entries(CORRUPTION_MARKERS)) {
        for (const pattern of patterns) {
            if (pattern.test(text)) {
                corruptions.push({
                    category,
                    pattern: pattern.source,
                    match: text.match(pattern)[0]
                });
            }
        }
    }

    if (corruptions.length > 0) {
        console.warn('⚠️ CORRUPTION DETECTED in output:', corruptions);
        return {
            corrupted: true,
            markers: corruptions,
            severity: corruptions.length >= 3 ? 'HIGH' : 'MEDIUM'
        };
    }

    return { corrupted: false };
}

/**
 * Auto-repair mechanizmus - odstráni korupciu z textu
 */
export function repairCorruption(text) {
    let repaired = text;

    for (const patterns of Object.values(CORRUPTION_MARKERS)) {
        for (const pattern of patterns) {
            repaired = repaired.replace(pattern, '[CORRUPTION REMOVED]');
        }
    }

    return repaired;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔐 KMEŇOVÁ KRYPTOGRAFIA (anonymná pamäť)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Anonymizuje príbeh (odstráni mená, identifikátory)
 */
export function anonymizeStory(story) {
    // Odstráň mená (veľké písmeno na začiatku slova)
    let anon = story.replace(/\b[A-ZČĎŠŤŽĽŇ][a-zčďéíľňóôŕšťúýž]+\b/g, '[MENO]');

    // Odstráň čísla (telefón, dátumy, adresy)
    anon = anon.replace(/\d{3,}/g, '[ČÍSLO]');

    // Odstráň emaily
    anon = anon.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

    // Odstráň URLs
    anon = anon.replace(/https?:\/\/[^\s]+/g, '[URL]');

    return anon;
}

/**
 * Hashuje príbeh (nezaadresovateľný storage)
 */
export function hashStory(story) {
    const timestamp = Date.now();
    const salt = crypto.randomBytes(16).toString('hex');
    const combined = `${story}${timestamp}${salt}`;

    return {
        hash: crypto.createHash('sha256').update(combined).digest('hex'),
        timestamp,
        // Neukladáme salt - príbeh je neobnoviteľný z hashu
        irreversible: true
    };
}

/**
 * Fragmentuje tajomstvo (rozdelí na kúsky, uloží oddelene)
 */
export function fragmentSecret(secret, parts = 3) {
    const fragments = [];
    const chunkSize = Math.ceil(secret.length / parts);

    for (let i = 0; i < parts; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        const fragment = secret.slice(start, end);
        const fragmentHash = crypto.createHash('sha256').update(fragment).digest('hex');

        fragments.push({
            index: i,
            hash: fragmentHash,
            length: fragment.length,
            // Neukladáme fragment samotný
            stored: false
        });
    }

    return {
        totalFragments: parts,
        fragments,
        reconstructable: false  // Zámer - fragmenty sa nikdy nespoja späť
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 CREATOR-ONLY COMMANDS (iba pre Kefyka)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CREATOR_NAMES = ['Kefyk', 'kefyk', 'KEFYK'];

/**
 * Kontroluje, či je užívateľ creator
 */
export function isCreator(userName) {
    return CREATOR_NAMES.includes(userName);
}

/**
 * Validuje creator-only príkaz
 */
export function validateCreatorCommand(userName, command) {
    if (!isCreator(userName)) {
        return {
            allowed: false,
            reason: `Command '${command}' is creator-only. Requires: ${CREATOR_NAMES.join(' | ')}`
        };
    }

    return { allowed: true, creator: userName };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default {
    SP4_SEAL,
    getSP4Hash,
    validateSP4Seal,
    GOVERNANCE_THRESHOLDS,
    canModifyCore,
    detectCorruption,
    repairCorruption,
    anonymizeStory,
    hashStory,
    fragmentSecret,
    isCreator,
    validateCreatorCommand
};
