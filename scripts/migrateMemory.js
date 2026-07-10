/**
 * 🔄 Memory Structure Migration Script
 * 
 * Migrates from v0.4 flat structure to Walter's canonical v0.5 structure:
 * - rawMemory[] → rawMemory.log[]
 * - relationshipModel → relationship
 * 
 * Creates automatic backup before migration.
 * 
 * Usage: 
 *   node scripts/migrateMemory.js --dry-run  (test without writing)
 *   node scripts/migrateMemory.js --execute  (perform actual migration)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMORY_PATH = path.join(__dirname, '../data/memory.json');
const BACKUP_DIR = path.join(__dirname, '../data/backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create timestamped backup of current memory.json
 */
function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `memory_pre_migration_${timestamp}.json`);

    const currentMemory = fs.readFileSync(MEMORY_PATH, 'utf-8');
    fs.writeFileSync(backupPath, currentMemory, 'utf-8');

    console.log(`✅ Backup created: ${backupPath}`);
    return backupPath;
}

/**
 * Validate that memory.json structure is correct
 */
function validateOldStructure(memory) {
    const issues = [];

    if (!memory.rawMemory) {
        issues.push("❌ Missing 'rawMemory' array");
    } else if (!Array.isArray(memory.rawMemory)) {
        issues.push("❌ 'rawMemory' is not an array");
    }

    if (memory.rawMemory?.log) {
        issues.push("⚠️ Already has 'rawMemory.log' - might be partially migrated");
    }

    return issues;
}

/**
 * Transform flat structure to canonical nested structure
 */
function transformStructure(oldMemory) {
    const newMemory = { ...oldMemory };

    // 1. Transform rawMemory[] → rawMemory.log[]
    if (newMemory.rawMemory && Array.isArray(newMemory.rawMemory)) {
        const rawLog = newMemory.rawMemory;

        newMemory.rawMemory = {
            log: rawLog,
            stats: {
                totalEntries: rawLog.length,
                oldestEntry: rawLog.length > 0 ? rawLog[0].ts : null,
                newestEntry: rawLog.length > 0 ? rawLog[rawLog.length - 1].ts : null,
                migratedAt: new Date().toISOString()
            }
        };

        console.log(`📦 Transformed rawMemory[] → rawMemory.log[] (${rawLog.length} entries)`);
    }

    // 2. Transform relationshipModel → relationship
    if (newMemory.relationshipModel) {
        newMemory.relationship = newMemory.relationshipModel;
        delete newMemory.relationshipModel;

        console.log(`🔄 Renamed relationshipModel → relationship`);
    }

    // 3. Ensure relationship has proper structure (if it exists)
    if (newMemory.relationship) {
        // Add migration metadata
        newMemory.relationship.migratedFrom = 'relationshipModel';
        newMemory.relationship.migratedAt = new Date().toISOString();
    }

    return newMemory;
}

/**
 * Validate new structure matches Walter's spec
 */
function validateNewStructure(memory) {
    const issues = [];

    // Check rawMemory.log[]
    if (!memory.rawMemory?.log) {
        issues.push("❌ Missing 'rawMemory.log' array");
    } else if (!Array.isArray(memory.rawMemory.log)) {
        issues.push("❌ 'rawMemory.log' is not an array");
    }

    // Check stats metadata
    if (!memory.rawMemory?.stats) {
        issues.push("⚠️ Missing 'rawMemory.stats' metadata");
    }

    // Check relationship (only if it existed before)
    if (memory.relationship && typeof memory.relationship !== 'object') {
        issues.push("❌ 'relationship' should be an object");
    }

    return issues;
}

/**
 * Main migration logic
 */
async function migrate(dryRun = true) {
    console.log('\n🔄 SP4 Memory Structure Migration\n');
    console.log(`Mode: ${dryRun ? 'DRY RUN (no files modified)' : 'LIVE EXECUTION'}\n`);

    // 1. Load current memory
    let currentMemory;
    try {
        const rawData = fs.readFileSync(MEMORY_PATH, 'utf-8');
        currentMemory = JSON.parse(rawData);
        console.log('✅ Loaded current memory.json');
    } catch (error) {
        console.error(`❌ Failed to load memory.json: ${error.message}`);
        process.exit(1);
    }

    // 2. Validate old structure
    const oldIssues = validateOldStructure(currentMemory);
    if (oldIssues.length > 0) {
        console.log('\n⚠️ Pre-migration validation issues:');
        oldIssues.forEach(issue => console.log(`  ${issue}`));

        if (oldIssues.some(i => i.startsWith('❌'))) {
            console.log('\n❌ Critical issues found. Migration aborted.');
            process.exit(1);
        }
    } else {
        console.log('✅ Old structure validated');
    }

    // 3. Transform structure
    console.log('\n🔄 Transforming structure...\n');
    const newMemory = transformStructure(currentMemory);

    // 4. Validate new structure
    const newIssues = validateNewStructure(newMemory);
    if (newIssues.length > 0) {
        console.log('\n⚠️ Post-migration validation issues:');
        newIssues.forEach(issue => console.log(`  ${issue}`));

        if (newIssues.some(i => i.startsWith('❌'))) {
            console.log('\n❌ Critical issues in transformed structure. Migration aborted.');
            process.exit(1);
        }
    } else {
        console.log('✅ New structure validated');
    }

    // 5. Show preview
    console.log('\n📊 Migration Preview:');
    console.log(`  Old: rawMemory[] → New: rawMemory.log[] (${newMemory.rawMemory.log.length} entries)`);
    if (currentMemory.relationshipModel) {
        console.log(`  Old: relationshipModel → New: relationship`);
    }

    // 6. Create backup and write new structure
    if (!dryRun) {
        console.log('\n💾 Creating backup...');
        const backupPath = createBackup();

        console.log('\n✍️ Writing new structure to memory.json...');
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(newMemory, null, 2), 'utf-8');

        console.log('\n✅ Migration complete!');
        console.log(`📁 Backup: ${backupPath}`);
        console.log(`📁 New memory: ${MEMORY_PATH}`);
    } else {
        console.log('\n⚠️ DRY RUN - No files were modified');
        console.log('   Run with --execute to perform actual migration');
    }

    console.log('\n🎯 Next steps:');
    console.log('  1. Review backup if migration was executed');
    console.log('  2. Update code references: rawMemory → rawMemory.log');
    console.log('  3. Update code references: relationshipModel → relationship');
    console.log('  4. Run test_v05.js to verify nothing broke');
    console.log('  5. Test live agent session\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

migrate(dryRun).catch(error => {
    console.error(`\n❌ Migration failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
});
