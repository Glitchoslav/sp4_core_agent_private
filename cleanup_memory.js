#!/usr/bin/env node
/**
 * 🧹 Memory Cleanup Script
 * Removes invalid log entries from memory.json
 * Run this if you get embedding errors
 */

import { loadMemory, saveMemory } from './memory.js';

console.log('🧹 SP4 Memory Cleanup Tool\n');

async function cleanMemory() {
    try {
        const mem = await loadMemory();

        if (!mem.rawMemory || !mem.rawMemory.log) {
            console.log('✅ No rawMemory.log found, nothing to clean');
            return;
        }

        const originalCount = mem.rawMemory.log.length;
        console.log(`📊 Original log entries: ${originalCount}`);

        // Filter out invalid entries
        const validEntries = mem.rawMemory.log.filter((entry, index) => {
            // Must be object
            if (typeof entry !== 'object' || entry === null) {
                console.log(`❌ Removing entry ${index}: not an object`);
                return false;
            }

            // Must have input/reply or user/agent
            const hasInput = entry.input || entry.user;
            const hasReply = entry.reply || entry.agent;

            if (!hasInput && !hasReply) {
                console.log(`❌ Removing entry ${index}: no content`);
                return false;
            }

            // Input/reply must be strings (not nested objects)
            if (entry.input && typeof entry.input !== 'string') {
                console.log(`❌ Removing entry ${index}: input is not string`);
                return false;
            }

            if (entry.reply && typeof entry.reply !== 'string') {
                console.log(`❌ Removing entry ${index}: reply is not string`);
                return false;
            }

            // 🔥 NEW: Metadata must be object or null/undefined (not string!)
            if (entry.metadata !== null && entry.metadata !== undefined && typeof entry.metadata !== 'object') {
                console.log(`❌ Removing entry ${index}: metadata is ${typeof entry.metadata} instead of object`);
                return false;
            }

            return true;
        });

        mem.rawMemory.log = validEntries;
        const removedCount = originalCount - validEntries.length;

        if (removedCount > 0) {
            await saveMemory(mem);
            console.log(`\n🗑️  Removed ${removedCount} invalid entries`);
            console.log(`✅ Cleaned log now has ${validEntries.length} valid entries`);
            console.log('\n💾 Memory saved!');
        } else {
            console.log('\n✅ No invalid entries found. Memory is clean!');
        }

    } catch (err) {
        console.error('\n❌ Cleanup failed:', err.message);
        process.exit(1);
    }
}

cleanMemory();
