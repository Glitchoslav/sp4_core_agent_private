/**
 * ┌─────────────────────────────────────────────┐
 * │  SP4 OS CONFIG: paths                      │
 * │  Layer: Data                               │
 * │  Role: Centrálne cesty pre dáta            │
 * │  API: RAW_LOG_DIR, CHAPTERS_DIR, etc.      │
 * │  Dependencies: žiadne                      │
 * └─────────────────────────────────────────────┘
 * 
 * @module config/paths
 * @author SP4 AUTO_CONSOLIDATION_v1
 * @date 2025-11-25
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.SP4_DATA_ROOT || path.join(__dirname, '..', 'data');

/**
 * RAW LOG DIRECTORY
 * Nefiltrovaný log všetkých interakcií (čierna skrinka systému)
 */
export const RAW_LOG_DIR = process.env.SP4_RAW_LOG_DIR || path.join(ROOT, 'raw_log');

/**
 * CHAPTERS DIRECTORY
 * Týždenné / mesačné zhrnutia z raw logov (AI summary)
 */
export const CHAPTERS_DIR = process.env.SP4_CHAPTERS_DIR || path.join(ROOT, 'chapters');

/**
 * ARCHIVE DIRECTORY
 * Spracované raw logy (po konsolidácii)
 */
export const ARCHIVE_DIR = process.env.SP4_ARCHIVE_DIR || path.join(ROOT, 'archive_raw');

/**
 * SEEDS DIRECTORY
 * Kľúčové momenty extraované z chapters (long-term memory)
 */
export const SEEDS_DIR = process.env.SP4_SEEDS_DIR || path.join(ROOT, 'seeds');

/**
 * EPOCH LOG
 * Denník autonómnych jobov (scheduler, konsolidácia, atď.)
 */
export const EPOCH_LOG_PATH = process.env.SP4_EPOCH_LOG || path.join(ROOT, 'epochs.json');

/**
 * Všetky cesty v jednom objekte (pre debugging / logging)
 */
export const ALL_PATHS = {
    ROOT,
    RAW_LOG_DIR,
    CHAPTERS_DIR,
    ARCHIVE_DIR,
    SEEDS_DIR,
    EPOCH_LOG_PATH
};
