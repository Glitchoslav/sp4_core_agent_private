#!/usr/bin/env node
/**
 * SP4 /note Command Test - POPIČI Edition
 * Testuje /note funkciu bez spustenia celého agenta
 */

import fs from 'fs';
import path from 'path';

const MEMORY_FILE = path.join(process.cwd(), 'data', 'memory.json');

async function testNoteCommand() {
    console.log('🔥 SP4 /note COMMAND TEST 🔥\n');

    // Load current memory
    let memory = {};
    if (fs.existsSync(MEMORY_FILE)) {
        const raw = fs.readFileSync(MEMORY_FILE, 'utf-8');
        memory = JSON.parse(raw);
    }

    // Initialize seeds if missing
    if (!memory.seeds) {
        memory.seeds = [];
    }

    console.log(`📊 Current seeds: ${memory.seeds.length}`);

    // Add note
    const noteText = process.argv.slice(2).join(' ') || 'nez reakcie';

    console.log(`\n📝 Adding note: "${noteText}"\n`);

    const newSeed = {
        id: `seed_${Date.now()}`,
        text: noteText,
        timestamp: new Date().toISOString(),
        tags: ['manual', 'note'],
        importance: 5,
        context: 'Manual note via /note command'
    };

    memory.seeds.push(newSeed);

    // Save
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf-8');

    console.log('✅ Seed pridaný do memory.json!');
    console.log(`\n📦 Seed detail:`);
    console.log(JSON.stringify(newSeed, null, 2));
    console.log(`\n📊 Total seeds now: ${memory.seeds.length}`);
    console.log('\n🔥 Hotovo! Skontroluj: python analyze_sp4_complete.py 🔥');
}

testNoteCommand().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
