/**
 * 🧪 TEST: AUTO_CONSOLIDATION_v1
 * 
 * Quick test pre weekly consolidation bez čakania na nedeľu.
 */

import fs from 'fs/promises';
import path from 'path';
import { ARCHIVE_DIR, CHAPTERS_DIR, RAW_LOG_DIR } from './config/paths.js';
import { archiveRawLogs, consolidateWeek } from './consolidationEngine.js';

async function test() {
    console.log('🧪 AUTO_CONSOLIDATION_v1 TEST\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Vytvor dummy raw log pre testing
    console.log('📝 Creating dummy raw log...');

    await fs.mkdir(RAW_LOG_DIR, { recursive: true });

    const today = new Date().toISOString().split('T')[0];
    const dummyLogPath = path.join(RAW_LOG_DIR, `${today}.jsonl`);

    const dummyEntries = [
        { ts: new Date().toISOString(), input: 'Test message 1', metadata: { tags: ['test', 'consolidation'] } },
        { ts: new Date().toISOString(), input: 'Test message 2', metadata: { tags: ['test', 'sp4'] } },
        { ts: new Date().toISOString(), input: 'Ako funguje AUTO_CONSOLIDATION_v1?', metadata: { tags: ['consolidation', 'question'] } }
    ];

    const logContent = dummyEntries.map(e => JSON.stringify(e)).join('\n');
    await fs.writeFile(dummyLogPath, logContent, 'utf-8');
    console.log(`   ✅ Created: ${dummyLogPath}\n`);

    // 2. Spusti weekly consolidation
    console.log('🔄 Running weekly consolidation...\n');

    const result = await consolidateWeek();

    if (result.skipped) {
        console.log('❌ Consolidation skipped (no data)\n');
        return;
    }

    console.log('✅ Consolidation result:');
    console.log(`   Chapter ID: ${result.chapterId}`);
    console.log(`   Raw entries: ${result.rawCount}`);
    console.log(`   Chapter file: ${result.writtenPath}`);
    console.log(`   Summary: ${result.summary || 'N/A'}\n`);

    // 3. Archivuj raw logy
    console.log('📦 Archiving raw logs...\n');

    const archiveResult = await archiveRawLogs(result.archiveList || []);
    console.log(`   ✅ Archived: ${archiveResult.archived} files\n`);

    // 4. Zobraz vytvorený chapter
    console.log('📖 Chapter content:\n');
    const chapterContent = await fs.readFile(result.writtenPath, 'utf-8');
    const chapter = JSON.parse(chapterContent);
    console.log(JSON.stringify(chapter, null, 2));
    console.log('\n');

    // 5. Zobraz adresárovú štruktúru
    console.log('📂 Directory structure:\n');

    try {
        const rawFiles = await fs.readdir(RAW_LOG_DIR);
        console.log(`   RAW_LOG_DIR (${rawFiles.length} files):`, rawFiles.slice(0, 5));
    } catch (err) {
        console.log('   RAW_LOG_DIR: empty or not exists');
    }

    try {
        const chapterFiles = await fs.readdir(CHAPTERS_DIR);
        console.log(`   CHAPTERS_DIR (${chapterFiles.length} files):`, chapterFiles.slice(0, 5));
    } catch (err) {
        console.log('   CHAPTERS_DIR: empty or not exists');
    }

    try {
        const archiveFiles = await fs.readdir(ARCHIVE_DIR);
        console.log(`   ARCHIVE_DIR (${archiveFiles.length} files):`, archiveFiles.slice(0, 5));
    } catch (err) {
        console.log('   ARCHIVE_DIR: empty or not exists');
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ AUTO_CONSOLIDATION_v1 TEST COMPLETED\n');
}

test().catch(err => {
    console.error('❌ Test failed:', err.message);
    console.error(err.stack);
});
