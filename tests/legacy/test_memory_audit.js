/**
 * TEST: /memory_audit export command
 * 
 * Simulates the /memory_audit export command to generate audit report.
 */

import fs from 'fs';
import { loadMemory } from './memory.js';
import { getDaysSinceLastUse, getMemoryAge, shouldArchive, shouldPrune } from './memory/metadataHelpers.js';

async function testMemoryAuditExport() {
    console.log('\n📊 MEMORY AUDIT - SP4 Memory System v1.0 (TEST)\n');

    const state = await loadMemory();
    const rawMemory = Array.isArray(state.rawMemory?.log) ? state.rawMemory.log :
        Array.isArray(state.rawMemory) ? state.rawMemory : [];

    // Calculate statistics
    const totalMemories = rawMemory.length;
    const byReasonKept = {};
    const importanceDistribution = { high: 0, medium: 0, low: 0 };

    rawMemory.forEach(entry => {
        const metadata = entry.metadata || entry;
        const reason = metadata.reasonKept || 'unknown';
        byReasonKept[reason] = (byReasonKept[reason] || 0) + 1;

        const importance = metadata.importance || 0.5;
        if (importance >= 0.7) importanceDistribution.high++;
        else if (importance >= 0.4) importanceDistribution.medium++;
        else importanceDistribution.low++;
    });

    // Find archive/prune candidates
    const archiveCandidates = rawMemory.filter(e => shouldArchive(e.metadata || e));
    const pruneCandidates = rawMemory.filter(e => shouldPrune(e.metadata || e));

    // Display overview
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 MEMORY OVERVIEW');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Total memories: ${totalMemories}`);
    console.log(`Archived: ${state.archivedMemory?.length || 0}`);
    console.log(`\n💡 Importance Distribution:`);
    console.log(`  High (0.7+):   ${importanceDistribution.high} (${((importanceDistribution.high / totalMemories) * 100).toFixed(1)}%)`);
    console.log(`  Medium (0.4+): ${importanceDistribution.medium} (${((importanceDistribution.medium / totalMemories) * 100).toFixed(1)}%)`);
    console.log(`  Low (<0.4):    ${importanceDistribution.low} (${((importanceDistribution.low / totalMemories) * 100).toFixed(1)}%)`);

    console.log(`\n🏷️  Memories by Reason Kept:`);
    Object.entries(byReasonKept)
        .sort((a, b) => b[1] - a[1])
        .forEach(([reason, count]) => {
            console.log(`  ${reason.padEnd(20)} ${count}`);
        });

    console.log(`\n📦 Archive Candidates: ${archiveCandidates.length}`);
    console.log(`   (age >= 180 days, importance <= 0.3, unused >= 90 days)`);

    console.log(`\n🗑️  Prune Candidates: ${pruneCandidates.length}`);
    console.log(`   (age >= 365 days, importance <= 0.2, unused >= 180 days)`);

    // Episodic memory stats
    console.log(`\n📅 Episodic Memory:`);
    console.log(`  Daily entries:     ${Object.keys(state.episodicMemory?.daily || {}).length}`);
    console.log(`  Weekly entries:    ${Object.keys(state.episodicMemory?.weekly || {}).length}`);
    console.log(`  Monthly entries:   ${Object.keys(state.episodicMemory?.monthly || {}).length}`);

    // Export action
    const exportData = {
        exportedAt: new Date().toISOString(),
        totalMemories,
        byReasonKept,
        importanceDistribution,
        archiveCandidates: archiveCandidates.length,
        pruneCandidates: pruneCandidates.length,
        episodicMemory: {
            daily: Object.keys(state.episodicMemory?.daily || {}).length,
            weekly: Object.keys(state.episodicMemory?.weekly || {}).length,
            monthly: Object.keys(state.episodicMemory?.monthly || {}).length
        },
        // Sample archive candidates (first 5)
        sampleArchiveCandidates: archiveCandidates.slice(0, 5).map(e => ({
            timestamp: e.ts || e.timestamp,
            input: e.input?.substring(0, 50) + '...',
            importance: e.metadata?.importance || e.importance,
            age: getMemoryAge(e.metadata || e),
            daysSinceLastUse: getDaysSinceLastUse(e.metadata || e)
        }))
    };

    const exportPath = `./data/memory-audit-${Date.now()}.json`;
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`\n✅ Exported audit report to: ${exportPath}`);

    // Also display sample
    console.log('\n📋 Sample Archive Candidates:');
    exportData.sampleArchiveCandidates.forEach((sample, i) => {
        console.log(`\n  ${i + 1}. Age: ${sample.age} days | Last used: ${sample.daysSinceLastUse} days ago`);
        console.log(`     Importance: ${sample.importance.toFixed(3)}`);
        console.log(`     "${sample.input}"`);
    });

    console.log('\n🔥 Memory Audit Complete!\n');
}

// Run test
testMemoryAuditExport().catch(console.error);
