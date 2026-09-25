// ┌─────────────────────────────────────────────┐
// │  SP4 OS v1.3.0 - PERSONAL PROFILE SERVICE │
// │  Layer: Services                           │
// │  Role: Načítanie a zobrazenie user profilu│
// │  Dependencies: userSeed.js                 │
// └─────────────────────────────────────────────┘

import { loadUserSeed } from '../startup/userSeed.js';

function formatSeedValue(value) {
    return String(value || '')
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
}

function stripLeadingPhrase(value, pattern) {
    const stripped = value.replace(pattern, '').trim();
    return stripped || value;
}

// Seed často ukladá odpoveď v 1. osobe ("chcem žiť naplno", "bojím sa samoty") —
// bez odstránenia slovesa vzniká "Chceš chcem žiť naplno.".
export function seedIntentPhrase(intent) {
    return stripLeadingPhrase(formatSeedValue(intent), /^(chcem|chcel\s+by\s+som|chcela\s+by\s+som|chcel\s+som|chcela\s+som)\s+/i);
}

export function seedFearPhrase(fear) {
    return stripLeadingPhrase(formatSeedValue(fear), /^(bojím\s+sa|bojim\s+sa|obávam\s+sa|obavam\s+sa)\s+/i);
}

export function buildWhoAmITextFromSeed(seed) {
    if (!seed) {
        return `⚠️ Nemám ešte seed.

Ako získať seed:
1. Zmaž súbor: data/user_seed.json
2. Reštartuj SP4 OS: npm start
3. Prejdi onboarding rituálom (3 otázky)

Alebo použi: /seed_refresh username:tvoje_meno intent:tvoj_cieľ fear:tvoj_strach`;
    }

    const lines = [];

    if (seed.username) {
        lines.push(`Ty si ${formatSeedValue(seed.username)}.`);
    }

    if (seed.intent) {
        lines.push(`Chceš ${seedIntentPhrase(seed.intent)}.`);
    }

    if (seed.fear) {
        lines.push(`Bojíš sa ${seedFearPhrase(seed.fear)}.`);
    }

    if (seed.created_at) {
        const created = new Date(seed.created_at);
        const createdStr = created.toLocaleDateString('sk-SK');
        lines.push(`\n📅 Digitálne narodený: ${createdStr}`);
    }

    if (seed.updated_at) {
        const updated = new Date(seed.updated_at);
        const updatedStr = updated.toLocaleDateString('sk-SK');
        lines.push(`📝 Naposledy aktualizovaný: ${updatedStr}`);
    }

    return lines.join('\n');
}

/**
 * Načíta základný profil používateľa z user_seed.
 * 
 * @returns {Promise<Object|null>} Objekt s polami { username, intent, fear, created_at, updated_at } alebo null
 */
export async function getBaseProfile() {
    try {
        const seed = await loadUserSeed();
        return seed;
    } catch (error) {
        return null;
    }
}

/**
 * Vytvorí krátke textové zhrnutie identity:
 * "Ty si X. Chceš Y. Bojíš sa Z."
 * 
 * Ak seed neexistuje, vráti fallback inštrukciu.
 * 
 * @returns {Promise<string>} Slovenský text s identitou alebo fallback
 */
export async function buildWhoAmIText() {
    const seed = await getBaseProfile();
    return buildWhoAmITextFromSeed(seed);
}
