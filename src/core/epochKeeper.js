/**
 * 🔥 SP4_EPOCH KEEPER v1.0
 * 
 * Modul na zapisovanie všetkých dôležitých zmien v systéme ako epochy.
 * Umožňuje zobraziť poslednú históriu systému.
 * 
 * @module epochKeeper
 * @version 1.0.0
 * @generated Full Autonomy v2.0 (Mission: m_20251125_625066)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { runtimeLog } from './runtimeLogging.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EPOCH_FILE = path.join(__dirname, '../../data/epochs.json');

/**
 * Reprezentácia jednej epochy (dôležitej zmeny v systéme)
 */
class Epoch {
    constructor(timestamp, description, data = {}) {
        this.timestamp = timestamp;
        this.description = description;
        this.data = data;
        this.id = `epoch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}

/**
 * Hlavný Epoch Keeper - správca epoch
 */
class EpochKeeper {
    constructor() {
        this.epochs = [];
        this.loaded = false;
    }

    /**
     * Inicializácia - načítanie epoch zo súboru
     */
    async initialize() {
        try {
            const data = await fs.readFile(EPOCH_FILE, 'utf-8');
            this.epochs = JSON.parse(data);
            this.loaded = true;
            runtimeLog(`✅ Epoch Keeper loaded: ${this.epochs.length} epochs`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Súbor neexistuje, vytvor nový
                this.epochs = [];
                await this.save();
                runtimeLog('✅ Epoch Keeper initialized (new file)');
            } else {
                console.error('❌ Epoch Keeper init failed:', error.message);
            }
            this.loaded = true;
        }
    }

    /**
     * Pridanie novej epochy
     */
    async addEpoch(description, data = {}) {
        if (!this.loaded) await this.initialize();

        const epoch = new Epoch(Date.now(), description, data);
        this.epochs.push(epoch);

        await this.save();

        runtimeLog(`🔥 EPOCH RECORDED: ${description}`);
        return epoch;
    }

    /**
     * Získanie posledných N epoch
     */
    getLatestEpochs(count = 10) {
        return this.epochs.slice(-count);
    }

    /**
     * Získanie všetkých epoch
     */
    getAllEpochs() {
        return this.epochs;
    }

    /**
     * Uloženie epoch do súboru
     */
    async save() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(EPOCH_FILE);
            await fs.mkdir(dataDir, { recursive: true });

            await fs.writeFile(EPOCH_FILE, JSON.stringify(this.epochs, null, 2), 'utf-8');
        } catch (error) {
            console.error('❌ Epoch save failed:', error.message);
        }
    }

    /**
     * Zobrazenie posledných epoch v konzole
     */
    displayLatest(count = 10) {
        const latest = this.getLatestEpochs(count);

        console.log(`\n🔥 === LATEST ${latest.length} EPOCHS ===\n`);

        latest.forEach((epoch, index) => {
            const date = new Date(epoch.timestamp).toLocaleString('sk-SK');
            console.log(`${latest.length - index}. [${date}]`);
            console.log(`   ${epoch.description}`);
            if (Object.keys(epoch.data).length > 0) {
                console.log(`   Data: ${JSON.stringify(epoch.data)}`);
            }
            console.log('');
        });
    }

    /**
     * Vyhľadanie epoch podľa popisu
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.epochs.filter(e =>
            e.description.toLowerCase().includes(lowerQuery)
        );
    }
}

// Singleton instance
let instance = null;

/**
 * Získanie globálnej inštancie Epoch Keepera
 */
export function getEpochKeeper() {
    if (!instance) {
        instance = new EpochKeeper();
    }
    return instance;
}

/**
 * Shortcut funkcie pre jednoduché použitie
 */
export async function recordEpoch(description, data = {}) {
    const keeper = getEpochKeeper();
    return await keeper.addEpoch(description, data);
}

export async function getLatestEpochs(count = 10) {
    const keeper = getEpochKeeper();
    if (!keeper.loaded) await keeper.initialize();
    return keeper.getLatestEpochs(count);
}

export async function displayEpochs(count = 10) {
    const keeper = getEpochKeeper();
    if (!keeper.loaded) await keeper.initialize();
    keeper.displayLatest(count);
}

export { Epoch, EpochKeeper };
