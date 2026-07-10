// ┌─────────────────────────────────────────────┐
// │  SP4 OS COMMAND: /seed_refresh             │
// │  Layer: Interface / Commands               │
// │  Role: Update user seed (intent, fear)     │
// │  Dependencies: userSeed.js                 │
// └─────────────────────────────────────────────┘

import { loadUserSeed, updateUserSeed } from '../startup/userSeed.js';

/**
 * Spracuje /seed_refresh príkaz.
 * 
 * Formát: /seed_refresh intent:TEXT fear:TEXT username:TEXT
 * 
 * Príklady:
 * - /seed_refresh intent:chcem žiť inak
 * - /seed_refresh fear:nesplniť poslanie username:Kefyk
 * - /seed_refresh intent:nájsť pokoj fear:vyhorieť
 * 
 * @param {string} rawInput - Celý user input
 * @returns {Promise<string>} Formátovaný výstup s aktualizovaným seedom
 */
export async function handleSeedRefreshCommand(rawInput) {
    // Odstráň command prefix
    const args = rawInput.replace('/seed_refresh', '').trim();

    if (!args) {
        return `📝 SEED REFRESH:

Použitie:
  /seed_refresh intent:TEXT fear:TEXT username:TEXT

Príklady:
  /seed_refresh intent:chcem žiť naplno
  /seed_refresh fear:stratiť smer username:Kefyk
  /seed_refresh intent:nájsť pokoj fear:vyhorieť

Môžeš updatovať jedno alebo viacero polí naraz.`;
    }

    // Jednoduchý parser: split podľa medzier, potom podľa ":"
    // Ale musíme rešpektovať, že value môže obsahovať medzery
    const partial = {};

    // Regex na extrakciu key:value dvojíc
    // Hľadáme: (username|intent|fear):(.+?)(?=\s+(?:username|intent|fear):|$)
    const validKeys = ['username', 'intent', 'fear'];

    for (const key of validKeys) {
        // Regex: key: následovaný textom až po ďalší key: alebo koniec
        const regex = new RegExp(`${key}:(.+?)(?=\\s+(?:username|intent|fear):|$)`, 'i');
        const match = args.match(regex);

        if (match && match[1]) {
            partial[key] = match[1].trim();
        }
    }

    if (Object.keys(partial).length === 0) {
        return `⚠️ Nenašiel som žiadne platné polia.

Povolené polia: username, intent, fear

Použitie:
  /seed_refresh intent:tvoj cieľ fear:tvoj strach username:tvoje meno`;
    }

    // Uprav seed
    try {
        await updateUserSeed(partial);
        const seed = await loadUserSeed();

        const lines = [];
        lines.push('📝 SEED REFRESH:');
        lines.push('');
        lines.push('✅ Seed aktualizovaný.');
        lines.push('');
        lines.push('🧬 Aktuálny seed:');

        if (seed.username) {
            lines.push(`   • Meno: ${seed.username}`);
        }
        if (seed.intent) {
            lines.push(`   • Intent: ${seed.intent}`);
        }
        if (seed.fear) {
            lines.push(`   • Fear: ${seed.fear}`);
        }

        if (seed.created_at) {
            const created = new Date(seed.created_at).toLocaleDateString('sk-SK');
            lines.push('');
            lines.push(`📅 Vytvorený: ${created}`);
        }

        if (seed.updated_at) {
            const updated = new Date(seed.updated_at).toLocaleDateString('sk-SK');
            lines.push(`📝 Aktualizovaný: ${updated}`);
        }

        return lines.join('\n');
    } catch (error) {
        return `❌ Chyba pri update seedu: ${error.message}`;
    }
}
