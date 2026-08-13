// consolidationEngine.js – Konsolidácia pamäte (raw → episodic → semantic)
// KROK 2: Daily/Weekly consolidation podľa Waltera
// v1.0: YML config, pre-job backups, reasonKept assignment, archive/prune
// v1.1: AUTO_CONSOLIDATION_v1 - Weekly raw log → chapters + archiving

import fsSync from 'fs';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';
import { createBackup } from './backup.js';
import { ARCHIVE_DIR, CHAPTERS_DIR, RAW_LOG_DIR } from './config/paths.js';
import { loadMemory, saveMemory } from './memory.js';
import { enrichExistingMemory, shouldArchive, shouldPrune } from './memory/metadataHelpers.js';
import { askLocalLLM } from './sp4os/llmLocal.js';
import { recordEpoch } from './src/core/epochKeeper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let CONSOLIDATION_CONFIG = null;

function readCanonicalRawLog(state = {}) {
    if (Array.isArray(state?.rawMemory?.log)) return state.rawMemory.log;
    if (Array.isArray(state?.rawMemory)) return state.rawMemory;
    if (Array.isArray(state?.log)) return state.log;
    return [];
}

/**
 * Load consolidation configuration from YML
 */
function loadConsolidationConfig() {
    if (CONSOLIDATION_CONFIG) return CONSOLIDATION_CONFIG;

    try {
        const configPath = path.join(__dirname, 'config/memory.consolidation.yml');
        const fileContents = fsSync.readFileSync(configPath, 'utf8');
        CONSOLIDATION_CONFIG = yaml.load(fileContents);
        return CONSOLIDATION_CONFIG;
    } catch (error) {
        console.error('❌ Failed to load memory.consolidation.yml:', error.message);
        // Fallback to defaults
        return {
            consolidation: {
                daily: { enabled: true, keep_last_sessions: 5, compression_level: 'light' },
                weekly: { enabled: true, importance_threshold: 0.6, compression_level: 'medium' },
                monthly: { enabled: true, compression_level: 'heavy', extract_patterns: true },
                quarterly: { enabled: true, prune_below_importance: 0.3, require_manual_confirm: true }
            },
            backup: { enabled: true, before_every_job: true, retention_days: 90 }
        };
    }
}

/**
 * Create pre-job backup if enabled
 */
async function backupBeforeJob(jobType, state) {
    const config = loadConsolidationConfig();

    if (config.backup?.enabled && config.backup?.before_every_job) {
        console.log(`💾 Creating pre-${jobType} backup...`);
        try {
            await createBackup(`pre-${jobType}`);
            console.log('   ✅ Backup created');
        } catch (error) {
            console.error('   ❌ Backup failed:', error.message);
            // Don't halt consolidation on backup failure
        }
    }
}

/**
 * Hlavná konsolidačná funkcia - BAD LABS UPGRADE
 * Automatické časovanie: 24h daily, pondelok weekly, prvý deň monthly
 * @param {Object} state - Memory state (voliteľný, inak načíta z disku)
 */
export async function consolidateMemory(state = null) {
    if (!state) {
        state = await loadMemory();
    }

    console.log('🔄 Spúšťam konsolidáciu pamäte...');

    // Kontrola, či je čas na konsolidáciu
    const now = new Date();
    const lastConsolidation = new Date(state.metaReflection?.lastConsolidation || 0);
    const hoursSinceLastConsolidation = (now - lastConsolidation) / (1000 * 60 * 60);

    // DAILY consolidation (každých 24 hodín)
    if (hoursSinceLastConsolidation >= 24) {
        await consolidateDaily(state);

        // Update meta
        if (!state.metaReflection) state.metaReflection = {};
        state.metaReflection.lastConsolidation = now.toISOString();
        state.metaReflection.schedulerStatus = 'active';

        console.log(`⏰ Ďalšia konsolidácia: ${new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleString('sk-SK')}`);
    } else {
        console.log(`⏳ Príliš skoro - ďalšia konsolidácia za ${(24 - hoursSinceLastConsolidation).toFixed(1)}h`);
    }

    // WEEKLY consolidation (každý pondelok)
    if (now.getDay() === 1 && lastConsolidation.getDay() !== 1) {
        await consolidateWeekly(state);
    }

    // MONTHLY consolidation (prvý deň mesiaca)
    if (now.getDate() === 1 && lastConsolidation.getDate() !== 1) {
        await consolidateMonthly(state);
    }

    await saveMemory(state);
    console.log('✅ Konsolidácia dokončená');

    return state;
}

/**
 * Daily consolidation - denné zhrnutie
 * EXPORTED for scheduler integration
 */
export async function runDaily(options = {}) {
    const config = loadConsolidationConfig();
    const dailyConfig = { ...config.consolidation.daily, ...options };

    if (!dailyConfig.enabled) {
        console.log('⏸️  Daily consolidation disabled in config');
        return;
    }

    const state = await loadMemory();
    await backupBeforeJob('daily', state);
    await consolidateDaily(state, dailyConfig);
    await saveMemory(state);

    console.log('✅ Daily consolidation complete');
    return state;
}

/**
 * Internal daily consolidation logic
 */
async function consolidateDaily(state, config = {}) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Zisti či už máme dnešný záznam
    if (state.episodicMemory.daily[today]) {
        console.log(`ℹ️  Dnešný záznam už existuje (${today})`);
        return;
    }

    // Získaj dnešné raw záznamy z canonical shape (rawMemory.log -> rawMemory[] -> log[])
    const rawMemory = readCanonicalRawLog(state);
    const todayEntries = rawMemory.filter(entry => {
        const entryDate = new Date(entry.ts).toISOString().split('T')[0];
        return entryDate === today;
    });

    if (todayEntries.length === 0) {
        console.log('ℹ️  Žiadne záznamy dnes, preskakujem daily consolidation');
        return;
    }

    console.log(`📅 Daily consolidation: ${today} (${todayEntries.length} záznamov)`);

    // 1. Tematické clustre (zatiaľ primitívne - agregácia tagov)
    const topics = extractTopics(todayEntries);

    // 2. Emočný profil dňa
    const emotionalProfile = calculateEmotionalProfile(todayEntries);

    // 3. Kľúčové momenty (high importance alebo emočné špičky)
    const keyMoments = extractKeyMoments(todayEntries);

    // 4. Textový summary (zatiaľ jednoduchý)
    const summary = generateDailySummary(todayEntries, topics, emotionalProfile);

    // Enrich memories with metadata if missing
    todayEntries.forEach(entry => {
        if (!entry.metadata?.reasonKept) {
            enrichExistingMemory(entry.metadata || entry);
        }
    });

    // Ulož do episodic memory
    state.episodicMemory.daily[today] = {
        date: today,
        entryCount: todayEntries.length,
        topics,
        emotionalProfile,
        keyMoments,
        summary,
        consolidatedAt: new Date().toISOString(),
        compressionLevel: config.compression_level || 'light'
    };

    console.log(`✅ Daily záznam vytvorený: ${topics.length} tém, ${keyMoments.length} kľúčových momentov`);
}

/**
 * Weekly consolidation - týždenné zhrnutie
 * EXPORTED for scheduler integration
 * AUTO_CONSOLIDATION_v1: Pridaný raw log→chapters workflow + archivácia
 */
export async function runWeekly(options = {}) {
    const config = loadConsolidationConfig();
    const weeklyConfig = { ...config.consolidation.weekly, ...options };

    if (!weeklyConfig.enabled) {
        console.log('⏸️  Weekly consolidation disabled in config');
        return;
    }

    const started = Date.now();
    console.log('\n🔄 AUTO_CONSOLIDATION_v1: Weekly raw log → chapters');

    try {
        const state = await loadMemory();
        await backupBeforeJob('weekly', state);

        // 1️⃣ Consolidate episodic memory (existing logic)
        await consolidateWeekly(state, weeklyConfig);

        // 2️⃣ NEW: Process raw log files → chapters
        const rawLogResult = await processRawLogToChapters();

        // 3️⃣ Save updated memory
        await saveMemory(state);

        const duration = Date.now() - started;

        // 4️⃣ Epoch logging
        await recordEpoch('weekly_consolidation', {
            ok: true,
            duration_ms: duration,
            chapter_id: rawLogResult.chapterId,
            raw_count: rawLogResult.rawCount,
            archived_count: rawLogResult.archivedCount
        });

        console.log('✅ Weekly consolidation complete');
        console.log(`   📊 Duration: ${(duration / 1000).toFixed(1)}s`);
        console.log(`   📝 Chapter: ${rawLogResult.chapterId}`);
        console.log(`   📦 Archived: ${rawLogResult.archivedCount} raw log files`);

        return state;
    } catch (err) {
        const duration = Date.now() - started;
        console.error('❌ Weekly consolidation FAILED:', err.message);

        await recordEpoch('weekly_consolidation', {
            ok: false,
            duration_ms: duration,
            error: String(err)
        });

        throw err;
    }
}

/**
 * Internal weekly consolidation logic
 */
async function consolidateWeekly(state, config = {}) {
    const now = new Date();
    const year = now.getFullYear();
    const weekNumber = getWeekNumber(now);
    const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;

    if (state.episodicMemory.weekly[weekKey]) {
        console.log(`ℹ️  Týždenný záznam už existuje (${weekKey})`);
        return;
    }

    console.log(`📅 Weekly consolidation: ${weekKey}`);

    // Získaj denné záznamy z tohto týždňa
    const dailyKeys = Object.keys(state.episodicMemory.daily)
        .filter(key => {
            const date = new Date(key);
            return getWeekNumber(date) === weekNumber && date.getFullYear() === year;
        });

    if (dailyKeys.length === 0) {
        console.log('ℹ️  Žiadne daily záznamy tento týždeň');
        return;
    }

    const dailyEntries = dailyKeys.map(key => state.episodicMemory.daily[key]);

    // Filter by importance threshold if configured
    const importanceThreshold = config.importance_threshold || 0.6;
    console.log(`   Filtering memories with importance >= ${importanceThreshold}`);

    // Agreguj témy
    const allTopics = dailyEntries.flatMap(d => d.topics || []);
    const topicCounts = {};
    allTopics.forEach(t => {
        topicCounts[t.tag] = (topicCounts[t.tag] || 0) + t.count;
    });
    const topics = Object.entries(topicCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

    // Emočný trend
    const emotionalTrend = aggregateEmotionalTrends(dailyEntries);

    // Summary
    const summary = `Týždeň ${weekKey}: ${dailyKeys.length} aktívnych dní, ${topics.length} hlavných tém. Najčastejšie: ${topics.slice(0, 3).map(t => t.tag).join(', ')}.`;

    state.episodicMemory.weekly[weekKey] = {
        weekKey,
        days: dailyKeys,
        topics,
        emotionalTrend,
        summary,
        consolidatedAt: new Date().toISOString()
    };

    console.log(`✅ Weekly záznam vytvorený`);
}

// ========== Helper funkcie ==========

function extractTopics(entries) {
    const tagCounts = {};

    entries.forEach(entry => {
        const tags = entry.metadata?.tags || [];
        tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    return Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
}

function calculateEmotionalProfile(entries) {
    const emotions = {
        user: { neutral: 0, positive: 0, negative: 0, humorous: 0 },
        agent: { neutral: 0, positive: 0, negative: 0, humorous: 0 }
    };

    let userIntensitySum = 0;
    let agentIntensitySum = 0;
    let validUserEmotions = 0;
    let validAgentEmotions = 0;

    entries.forEach(entry => {
        const userEmo = entry.metadata?.emotion?.user;
        const agentEmo = entry.metadata?.emotion?.agent;

        if (userEmo) {
            emotions.user[userEmo.type] = (emotions.user[userEmo.type] || 0) + userEmo.intensity;
            userIntensitySum += userEmo.intensity;
            validUserEmotions++;
        }

        if (agentEmo) {
            emotions.agent[agentEmo.type] = (emotions.agent[agentEmo.type] || 0) + agentEmo.intensity;
            agentIntensitySum += agentEmo.intensity;
            validAgentEmotions++;
        }
    });

    // Normalizácia emócií (Walter upgrade)
    Object.keys(emotions.user).forEach(key => {
        emotions.user[key] = userIntensitySum > 0 ? emotions.user[key] / userIntensitySum : 0;
    });
    Object.keys(emotions.agent).forEach(key => {
        emotions.agent[key] = agentIntensitySum > 0 ? emotions.agent[key] / agentIntensitySum : 0;
    });

    // Dominantné emócie
    const dominantUserEmotion = Object.entries(emotions.user)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
    const dominantAgentEmotion = Object.entries(emotions.agent)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";

    return {
        user: {
            emotions: emotions.user,
            dominant: dominantUserEmotion,
            averageIntensity: validUserEmotions > 0 ? userIntensitySum / validUserEmotions : 0
        },
        agent: {
            emotions: emotions.agent,
            dominant: dominantAgentEmotion,
            averageIntensity: validAgentEmotions > 0 ? agentIntensitySum / validAgentEmotions : 0
        },
        resonance: calculateResonance(entries), // Emočná rezonancia
        distribution: emotions
    };
}

function calculateResonance(entries) {
    // Jednoduchá metrika: koľko % interakcií mal podobný emočný tón
    let matches = 0;

    entries.forEach(entry => {
        const userType = entry.metadata?.emotion?.user?.type;
        const agentType = entry.metadata?.emotion?.agent?.type;

        if (userType === agentType) matches++;
    });

    return entries.length > 0 ? matches / entries.length : 0;
}

function extractKeyMoments(entries) {
    return entries
        .filter(entry => {
            const importance = entry.metadata?.importance || 0;
            const userIntensity = entry.metadata?.emotion?.user?.intensity || 0;
            return importance > 0.7 || userIntensity > 0.8;
        })
        .map(entry => ({
            ts: entry.ts,
            input: entry.input.substring(0, 100) + '...',
            tags: entry.metadata?.tags || [],
            importance: entry.metadata?.importance
        }));
}

function generateDailySummary(entries, topics, emotionalProfile) {
    const topTopics = topics.slice(0, 3).map(t => t.tag).join(', ');
    const dominantEmotion = Object.entries(emotionalProfile.distribution.user)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    return `${entries.length} interakcií. Hlavné témy: ${topTopics}. Dominantná emócia užívateľa: ${dominantEmotion}.`;
}

function aggregateEmotionalTrends(dailyEntries) {
    const avgIntensities = dailyEntries.map(d => d.emotionalProfile?.avgIntensity?.user || 0);
    const trend = avgIntensities.length > 1
        ? (avgIntensities[avgIntensities.length - 1] - avgIntensities[0])
        : 0;

    return {
        direction: trend > 0.1 ? 'rising' : trend < -0.1 ? 'falling' : 'stable',
        avgIntensity: avgIntensities.reduce((a, b) => a + b, 0) / avgIntensities.length
    };
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * MONTHLY consolidation - Walter upgrade
 * Extrahuje do semantic memory: beliefs, patterns, relationships
 * EXPORTED for scheduler integration
 */
export async function runMonthly(options = {}) {
    const config = loadConsolidationConfig();
    const monthlyConfig = { ...config.consolidation.monthly, ...options };

    if (!monthlyConfig.enabled) {
        console.log('⏸️  Monthly consolidation disabled in config');
        return;
    }

    const state = await loadMemory();
    await backupBeforeJob('monthly', state);
    await consolidateMonthly(state, monthlyConfig);
    await saveMemory(state);

    console.log('✅ Monthly consolidation complete');
    return state;
}

/**
 * Internal monthly consolidation logic
 */
async function consolidateMonthly(state, config = {}) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;

    console.log(`📅 Monthly consolidation: ${monthKey}`);

    // Získaj týždenné záznamy z tohto mesiaca
    const weeklyKeys = Object.keys(state.episodicMemory.weekly)
        .filter(key => key.startsWith(`${year}-`));

    if (weeklyKeys.length === 0) {
        console.log('ℹ️  Žiadne weekly záznamy tento mesiac');
        return;
    }

    // Agreguj témy z celého mesiaca
    const monthlyTopics = {};
    weeklyKeys.forEach(weekKey => {
        const weekData = state.episodicMemory.weekly[weekKey];
        weekData.topics?.forEach(topic => {
            monthlyTopics[topic.tag] = (monthlyTopics[topic.tag] || 0) + topic.count;
        });
    });

    // Extrakcia do semantic memory (zatiaľ placeholder)
    console.log(`📊 Mesačné témy: ${Object.keys(monthlyTopics).length}`);
    console.log(`   Top 3: ${Object.entries(monthlyTopics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag, count]) => `${tag} (${count}×)`)
        .join(', ')}`);

    // TODO: extractBeliefs(), extractConcepts(), extractRelationships()

    console.log(`✅ Monthly consolidation dokončená`);
}

/**
 * QUARTERLY pruning - archive/delete old low-importance memories
 * EXPORTED for scheduler integration
 */
export async function runQuarterly(options = {}) {
    const config = loadConsolidationConfig();
    const quarterlyConfig = { ...config.consolidation.quarterly, ...options };

    if (!quarterlyConfig.enabled) {
        console.log('⏸️  Quarterly pruning disabled in config');
        return;
    }

    const state = await loadMemory();
    await backupBeforeJob('quarterly', state);

    console.log('🗂️  Starting quarterly memory pruning...');

    // Archive candidates from canonical shape (rawMemory.log -> rawMemory[] -> log[])
    const rawMemory = readCanonicalRawLog(state);
    const archiveCandidates = rawMemory.filter(entry =>
        shouldArchive(entry.metadata || entry)
    );

    // Prune candidates (more aggressive)
    const pruneCandidates = rawMemory.filter(entry =>
        shouldPrune(entry.metadata || entry, {
            minAge: 365,
            maxImportance: quarterlyConfig.prune_below_importance || 0.3,
            minDaysSinceUse: 180
        })
    );

    console.log(`   📦 Archive candidates: ${archiveCandidates.length}`);
    console.log(`   🗑️  Prune candidates: ${pruneCandidates.length}`);

    // Require manual confirmation if configured
    if (quarterlyConfig.require_manual_confirm) {
        console.log('\n⚠️  MANUAL CONFIRMATION REQUIRED');
        console.log('   Use /memory_audit to review and approve archival/pruning');
        console.log('   Skipping automatic pruning for safety.');

        // Store candidates for admin review
        if (!state.metaReflection) state.metaReflection = {};
        state.metaReflection.pendingArchival = archiveCandidates.map(e => e.ts || e.timestamp);
        state.metaReflection.pendingPruning = pruneCandidates.map(e => e.ts || e.timestamp);
    } else {
        // Auto-archive low importance memories
        if (!state.archivedMemory) state.archivedMemory = [];
        archiveCandidates.forEach(entry => {
            state.archivedMemory.push({
                ...entry,
                archivedAt: new Date().toISOString(),
                reason: 'quarterly_auto_archive'
            });
        });

        // Remove archived from raw memory
        const archivedTimestamps = new Set(archiveCandidates.map(e => e.ts || e.timestamp));
        state.rawMemory = rawMemory.filter(e =>
            !archivedTimestamps.has(e.ts || e.timestamp)
        );

        console.log(`   ✅ Archived: ${archiveCandidates.length} memories`);
        console.log(`   ⚠️  Prune candidates flagged for manual review: ${pruneCandidates.length}`);
    }

    await saveMemory(state);
    console.log(`✅ Quarterly pruning complete`);
    return state;
}

// ========== AUTO_CONSOLIDATION_v1: Raw Log Processing ==========

/**
 * Process raw log files → create chapter summary
 * Returns chapter info + list of files to archive
 */
async function processRawLogToChapters() {
    const now = new Date();
    const year = now.getFullYear();
    const weekNumber = getWeekNumber(now);
    const chapterId = `chapter_${year}-W${String(weekNumber).padStart(2, '0')}`;

    console.log(`   📅 Processing raw logs for ${chapterId}...`);

    // 1️⃣ Ensure directories exist
    await ensureDirectories();

    // 2️⃣ Find raw log files from last week
    const rawLogFiles = await findRecentRawLogs(7); // Last 7 days

    if (rawLogFiles.length === 0) {
        console.log('   ℹ️  No raw log files to process');
        return {
            chapterId,
            rawCount: 0,
            archivedCount: 0,
            chapterPath: null
        };
    }

    console.log(`   📂 Found ${rawLogFiles.length} raw log files`);

    // 3️⃣ Load and aggregate raw entries
    const rawEntries = await loadRawLogFiles(rawLogFiles);
    console.log(`   📊 Total entries: ${rawEntries.length}`);

    // 4️⃣ Generate AI summary (simplified for now)
    const chapterSummary = await generateChapterSummary(rawEntries, chapterId);

    // 5️⃣ Save chapter file
    const chapterPath = path.join(CHAPTERS_DIR, `${chapterId}.json`);
    await fs.writeFile(chapterPath, JSON.stringify(chapterSummary, null, 2), 'utf-8');
    console.log(`   ✅ Chapter saved: ${chapterPath}`);

    // 6️⃣ Archive raw log files
    const archivedCount = await archiveRawLogFiles(rawLogFiles);

    return {
        chapterId,
        rawCount: rawEntries.length,
        archivedCount,
        chapterPath
    };
}

/**
 * Find raw log files from last N days
 */
async function findRecentRawLogs(daysBack = 7) {
    if (!fsSync.existsSync(RAW_LOG_DIR)) {
        return [];
    }

    const files = await fs.readdir(RAW_LOG_DIR);
    const now = Date.now();
    const cutoff = now - (daysBack * 24 * 60 * 60 * 1000);

    const recentFiles = [];

    for (const file of files) {
        const filePath = path.join(RAW_LOG_DIR, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile() && stats.mtimeMs >= cutoff) {
            recentFiles.push(filePath);
        }
    }

    return recentFiles;
}

/**
 * Load all entries from raw log files
 */
async function loadRawLogFiles(filePaths) {
    const allEntries = [];

    for (const filePath of filePaths) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    allEntries.push(entry);
                } catch (parseErr) {
                    // Skip malformed lines
                    console.warn(`   ⚠️  Skipped malformed line in ${path.basename(filePath)}`);
                }
            }
        } catch (err) {
            console.error(`   ❌ Failed to load ${path.basename(filePath)}:`, err.message);
        }
    }

    return allEntries;
}

/**
 * Archive processed raw log files
 */
async function archiveRawLogFiles(filePaths) {
    let archivedCount = 0;

    for (const filePath of filePaths) {
        try {
            const fileName = path.basename(filePath);
            const archivePath = path.join(ARCHIVE_DIR, fileName);

            // Move file to archive
            await fs.rename(filePath, archivePath);
            archivedCount++;

            console.log(`   📦 Archived: ${fileName}`);
        } catch (err) {
            console.error(`   ❌ Failed to archive ${path.basename(filePath)}:`, err.message);
        }
    }

    return archivedCount;
}

// ========== AUTO_CONSOLIDATION_v1: WEEKLY RAW LOG → CHAPTERS ==========

/**
 * AUTO_CONSOLIDATION_v1: Týždenná konsolidácia raw logov do chapters
 * 
 * PROCESS:
 * 1. Načítaj nové raw logy z RAW_LOG_DIR (od poslednej konsolidácie)
 * 2. AI zhrnutie → vytvor chapter súbor
 * 3. Archivuj spracované raw logy
 * 
 * @param {Object} options - Konfigurácia
 * @param {Date} options.from - Od kedy consolidovať
 * @param {Date} options.to - Do kedy consolidovať
 * @returns {Promise<Object>} Výsledok konsolidácie
 */
export async function consolidateWeek({ from, to } = {}) {
    console.log('📅 AUTO_CONSOLIDATION_v1: Starting weekly raw log consolidation...');

    // 1. Ensure directories exist
    await ensureDirectories();

    // 2. Determine time range
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromDate = from || weekAgo;
    const toDate = to || now;

    const weekKey = getWeekKey(toDate);
    console.log(`   Week: ${weekKey} (${fromDate.toISOString().split('T')[0]} → ${toDate.toISOString().split('T')[0]})`);

    // 3. Load raw log files in range
    const rawFiles = await loadRawLogsInRange(fromDate, toDate);
    if (rawFiles.length === 0) {
        console.log('   ℹ️  No raw logs found in range, skipping consolidation');
        return {
            chapterId: weekKey,
            rawCount: 0,
            skipped: true
        };
    }

    console.log(`   📂 Found ${rawFiles.length} raw log files`);

    // 4. Parse and merge raw logs
    const rawEntries = await parseRawLogs(rawFiles);
    console.log(`   📝 Loaded ${rawEntries.length} raw entries`);

    // 5. AI summarization → create chapter
    const chapterContent = await generateChapterSummary(rawEntries, weekKey);

    // 6. Save chapter
    const chapterPath = path.join(CHAPTERS_DIR, `${weekKey}.json`);
    await fs.writeFile(chapterPath, JSON.stringify(chapterContent, null, 2), 'utf-8');
    console.log(`   💾 Chapter saved: ${chapterPath}`);

    // 7. Prepare archive list
    const archiveList = rawFiles.map(f => f.path);

    return {
        chapterId: weekKey,
        rawCount: rawEntries.length,
        writtenPath: chapterPath,
        archiveList,
        summary: chapterContent.summary
    };
}

/**
 * Archive processed raw logs
 * 
 * @param {string[]} filePaths - Raw log files to archive
 * @returns {Promise<Object>} Archive results
 */
export async function archiveRawLogs(filePaths) {
    if (!filePaths || filePaths.length === 0) {
        console.log('   ℹ️  No files to archive');
        return { archived: 0 };
    }

    await ensureDirectories();

    console.log(`📦 Archiving ${filePaths.length} raw log files...`);

    let archived = 0;
    for (const sourcePath of filePaths) {
        try {
            const filename = path.basename(sourcePath);
            const targetPath = path.join(ARCHIVE_DIR, filename);

            // Move file (rename) instead of copy+delete
            await fs.rename(sourcePath, targetPath);
            archived++;
        } catch (err) {
            console.error(`   ❌ Failed to archive ${sourcePath}: ${err.message}`);
        }
    }

    console.log(`   ✅ Archived: ${archived}/${filePaths.length} files`);
    return { archived };
}

// ========== HELPER FUNCTIONS ==========

/**
 * Ensure all required directories exist
 */
async function ensureDirectories() {
    const dirs = [RAW_LOG_DIR, CHAPTERS_DIR, ARCHIVE_DIR];
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (err) {
            // Directory already exists, ignore
        }
    }
}

/**
 * Get week key (YYYY-WXX format)
 */
function getWeekKey(date) {
    const year = date.getFullYear();
    const weekNum = getWeekNumber(date);
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Load raw log files in date range
 * 
 * Expected format: YYYY-MM-DD.jsonl or YYYY-MM-DD.json
 */
async function loadRawLogsInRange(fromDate, toDate) {
    try {
        const files = await fs.readdir(RAW_LOG_DIR);
        const validFiles = [];

        for (const file of files) {
            // Match date pattern YYYY-MM-DD
            const match = file.match(/^(\d{4}-\d{2}-\d{2})\.(jsonl?|txt)$/);
            if (!match) continue;

            const fileDate = new Date(match[1]);
            if (fileDate >= fromDate && fileDate <= toDate) {
                validFiles.push({
                    path: path.join(RAW_LOG_DIR, file),
                    date: fileDate,
                    filename: file
                });
            }
        }

        return validFiles.sort((a, b) => a.date - b.date);
    } catch (err) {
        console.error(`   ❌ Failed to read RAW_LOG_DIR: ${err.message}`);
        return [];
    }
}

/**
 * Parse raw log files (JSONL or JSON array)
 */
async function parseRawLogs(files) {
    const entries = [];

    for (const file of files) {
        try {
            const content = await fs.readFile(file.path, 'utf-8');

            // Try JSONL format (one JSON per line)
            if (file.filename.endsWith('.jsonl')) {
                const lines = content.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    try {
                        const entry = JSON.parse(line);
                        entries.push(entry);
                    } catch (err) {
                        console.warn(`   ⚠️  Invalid JSONL line in ${file.filename}`);
                    }
                }
            } else {
                // Try JSON array
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    entries.push(...parsed);
                } else {
                    entries.push(parsed);
                }
            }
        } catch (err) {
            console.error(`   ❌ Failed to parse ${file.filename}: ${err.message}`);
        }
    }

    return entries;
}

/**
 * Generate AI summary chapter from raw entries
 */
async function generateChapterSummary(rawEntries, weekKey) {
    console.log(`   🧠 Generating AI summary for ${weekKey}...`);

    // Simple aggregation stats
    const topics = extractTopics(rawEntries);
    const emotions = calculateEmotionalProfile(rawEntries);
    const keyMoments = extractKeyMoments(rawEntries);

    // AI summarization prompt
    const summaryPrompt = buildConsolidationPrompt(rawEntries, weekKey);

    let aiSummary = '';
    try {
        aiSummary = await askLocalLLM(summaryPrompt, 'You are a memory consolidation assistant. Summarize key themes and insights from user interactions.');
    } catch (err) {
        console.warn(`   ⚠️  AI summary failed, using fallback: ${err.message}`);
        aiSummary = `Týždeň ${weekKey}: ${rawEntries.length} interakcií. Hlavné témy: ${topics.slice(0, 3).map(t => t.tag).join(', ')}.`;
    }

    return {
        weekKey,
        period: {
            from: rawEntries[0]?.ts || rawEntries[0]?.timestamp,
            to: rawEntries[rawEntries.length - 1]?.ts || rawEntries[rawEntries.length - 1]?.timestamp
        },
        entryCount: rawEntries.length,
        topics: topics.slice(0, 10), // Top 10 topics
        emotionalProfile: emotions,
        keyMoments: keyMoments.slice(0, 5), // Top 5 key moments
        summary: aiSummary,
        consolidatedAt: new Date().toISOString()
    };
}

/**
 * Build AI consolidation prompt
 */
function buildConsolidationPrompt(entries, weekKey) {
    const sampleEntries = entries.slice(0, 20); // First 20 entries as context
    const entryTexts = sampleEntries.map(e => `- ${e.input || e.userMessage || e.text || ''}`).join('\n');

    return `Týždeň ${weekKey}: Zhrni hlavné témy a kľúčové momenty z týchto interakcií (celkom ${entries.length} záznamov):

${entryTexts}

Vytvor krátke zhrnutie (2-3 vety) s hlavnými témami a emočným profilom týždňa.`;
}
