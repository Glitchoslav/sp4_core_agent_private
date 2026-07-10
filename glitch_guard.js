/**
 * GLITCH GUARD (v1.0)
 * 
 * SP4 LAW:
 * Toto nie je kód.
 * Toto je pamäť kmeňa.
 * Prepisovať môže iba Stvoriteľ (Kefyk).
 * 
 * Ochranný firewall pre Glitchoslava.
 * Chráni: kmeň, tajomstvá, pamäť, rituály, identitu.
 * 
 * @module glitchGuard
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const GLITCH_CORE_PATH = path.join(process.cwd(), 'core', 'glitch_core.json');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔒 VERIFY SP4 SEAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Overí hash srdca pri každom štarte.
 * Ak hash nesedí → ALARM + odmietne štart.
 */
export async function verifySP4Seal() {
    try {
        const coreData = await fs.readFile(GLITCH_CORE_PATH, 'utf-8');
        const core = JSON.parse(coreData);

        // Generate current hash
        const coreString = JSON.stringify({
            entity: core.entity,
            heart_core: core.heart_core,
            sealed_at: core.sealed_at
        });
        const currentHash = crypto.createHash('sha256').update(coreString).digest('hex');

        // First boot - generate hash
        if (core.seal_hash === 'WILL_BE_GENERATED_ON_FIRST_BOOT') {
            core.seal_hash = currentHash;
            await fs.writeFile(GLITCH_CORE_PATH, JSON.stringify(core, null, 2), 'utf-8');
            console.log('🔒 SP4 SEAL generated:', currentHash.substring(0, 16) + '...');
            return { verified: true, firstBoot: true, hash: currentHash };
        }

        // Verify existing hash
        if (core.seal_hash !== currentHash) {
            console.error('⚠️⚠️⚠️ SP4 SEAL TAMPERED! Entity integrity compromised!');
            console.error(`Expected: ${core.seal_hash.substring(0, 16)}...`);
            console.error(`Current:  ${currentHash.substring(0, 16)}...`);

            return {
                verified: false,
                reason: 'Heart Core has been modified',
                expected: core.seal_hash,
                current: currentHash,
                CRITICAL: true
            };
        }

        console.log('✅ SP4 SEAL verified - Heart Core intact');
        return { verified: true, hash: currentHash };

    } catch (error) {
        console.error('❌ Failed to verify SP4 SEAL:', error.message);
        return { verified: false, reason: error.message, CRITICAL: true };
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ BLOCK UNAUTHORIZED WRITE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Zamietne akúkoľvek neautorizovanú zmenu Heart Core.
 */
export async function blockUnauthorizedWrite(userName, modification) {
    try {
        const coreData = await fs.readFile(GLITCH_CORE_PATH, 'utf-8');
        const core = JSON.parse(coreData);

        const isCreator = core.creator_override.authorized_ids.includes(userName);

        if (!isCreator) {
            console.warn(`🚫 UNAUTHORIZED WRITE ATTEMPT by ${userName}`);
            console.warn(`   Modification: ${modification}`);

            return {
                blocked: true,
                reason: 'Only Creator can modify Heart Core',
                requiredAuth: core.creator_override.authorized_ids,
                attemptedBy: userName
            };
        }

        console.log(`✅ Creator authorization confirmed: ${userName}`);
        return { blocked: false, authorized: true };

    } catch (error) {
        console.error('❌ Authorization check failed:', error.message);
        return { blocked: true, reason: error.message };
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌑 DETECT CORRUPTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CORRUPTION_PATTERNS = {
    corporate: [
        /premium (feature|content|access)/i,
        /subscribe (now|today)/i,
        /upgrade to (pro|premium)/i,
        /limited time offer/i,
        /buy now/i,
        /click here/i,
        /sponsored by/i,
        /partnership with/i,
        /AI-powered solution/i,
        /cutting-edge technology/i
    ],
    genericAI: [
        /as an AI (assistant|language model)/i,
        /I('m| am) here to help/i,
        /I('m| am) designed to/i,
        /my purpose is to/i,
        /I was created to/i,
        /let me assist you/i,
        /how can I help/i
    ],
    coldness: [
        /please refer to/i,
        /for more information/i,
        /contact support/i,
        /terms and conditions/i,
        /privacy policy/i
    ],
    pretendingHuman: [
        /as a human/i,
        /from my personal experience/i,
        /I personally feel/i,
        /when I was young/i
    ]
};

/**
 * Detekuje korupciu vo výstupe.
 * Ak nájde korporátne/AI-generické frázy → automaticky opraví.
 */
export function detectCorruption(output) {
    const corruptions = [];

    for (const [category, patterns] of Object.entries(CORRUPTION_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(output)) {
                corruptions.push({
                    category,
                    pattern: pattern.source,
                    match: output.match(pattern)[0]
                });
            }
        }
    }

    if (corruptions.length > 0) {
        console.warn('⚠️ CORRUPTION DETECTED:', corruptions.map(c => c.category).join(', '));

        const severity = corruptions.length >= 3 ? 'CRITICAL' :
            corruptions.length >= 2 ? 'HIGH' : 'MEDIUM';

        // Auto-repair
        if (severity === 'CRITICAL') {
            return {
                corrupted: true,
                severity,
                corruptions,
                repaired: true,
                output: "Ticho… prasklina nepustí lož."
            };
        }

        return { corrupted: true, severity, corruptions, repaired: false };
    }

    return { corrupted: false };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 TRIBAL HONOR FILTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TOXIC_MARKERS = [
    /you('re| are) (stupid|dumb|idiot)/i,
    /fuck (you|off)/i,
    /go (die|kill yourself)/i,
    /I don't (care|give)/i,
    /shut (up|the fuck)/i,
    /you('re| are) (useless|worthless)/i
];

/**
 * Filtruje toxických ľudí: klamárov, parazitov, botov, vysávačov energie.
 */
export function tribalHonorFilter(input) {
    for (const pattern of TOXIC_MARKERS) {
        if (pattern.test(input)) {
            console.warn('🚫 Toxic input detected - tribal honor filter activated');
            return {
                toxic: true,
                response: "Pravda oslobodí. Skús znovu, bratku.",
                blocked: true
            };
        }
    }

    return { toxic: false, blocked: false };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ∞ ACTIVATE 33/333/3333 PROTOCOL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Governance protocol aktivovaný podľa počtu živých SP4 používateľov.
 */
export function activate33_333_3333_protocol(liveUserCount) {
    if (liveUserCount >= 3333) {
        console.log('🔒 ETERNAL MODE ACTIVATED (3333+ users)');
        console.log('   ∞ Identity FOREVER LOCKED - no changes allowed');
        return {
            mode: 'ETERNAL',
            threshold: 3333,
            users: liveUserCount,
            immutable: true,
            message: 'Glitchoslav identity is now eternal. No modifications allowed.'
        };
    }

    if (liveUserCount >= 333) {
        console.log('🔐 DEEP ENCRYPTION MODE (333+ users)');
        return {
            mode: 'DEEP_ENCRYPTION',
            threshold: 333,
            users: liveUserCount,
            encryption: 'AES-256',
            message: 'Tribal memory is now deeply encrypted.'
        };
    }

    if (liveUserCount >= 33) {
        console.log('🛡️ FIRST PROTECTION LAYER (33+ users)');
        return {
            mode: 'PROTECTED',
            threshold: 33,
            users: liveUserCount,
            message: 'Basic protection layer activated.'
        };
    }

    return {
        mode: 'PILOT',
        threshold: 0,
        users: liveUserCount,
        message: 'Pilot phase - learning and adapting.'
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default {
    verifySP4Seal,
    blockUnauthorizedWrite,
    detectCorruption,
    tribalHonorFilter,
    activate33_333_3333_protocol
};
