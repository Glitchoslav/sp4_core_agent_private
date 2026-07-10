// export_training_data.js – v0.6.3
// Generuje JSONL dataset z memory.json pre budúci fine-tuning / LoRA
// Formát riadku: {"user":"...","agent":"...","timestamp":"...","rating":"good|mid|bad|null"}

import fs from 'fs';

async function run() {
    const memoryPath = 'data/memory.json';
    if (!fs.existsSync(memoryPath)) {
        console.error('❌ memory.json neexistuje');
        process.exit(1);
    }

    const raw = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
    const log = raw.rawMemory?.log || [];

    if (!log.length) {
        console.log('⚠️ Žiadne interakcie na export.');
        process.exit(0);
    }

    const outPath = 'dataset/sp4_dialogs.jsonl';
    const stream = fs.createWriteStream(outPath, { flags: 'w' });

    let count = 0;
    for (const entry of log) {
        const user = entry.user || entry.input;
        const agent = entry.agent || entry.reply;
        if (!user || !agent) continue; // preskoc nekompletne

        const line = {
            user: user.trim(),
            agent: agent.trim(),
            timestamp: entry.timestamp || entry.ts || null,
            rating: entry.rating || null
        };
        stream.write(JSON.stringify(line) + '\n');
        count++;
    }
    stream.end();

    console.log(`✅ Export hotový: ${outPath} (${count} diálogov)`);
    console.log('   Tip: Pre kontrolu prvých 5 riadkov:');
    console.log('       Get-Content dataset/sp4_dialogs.jsonl -TotalCount 5');
}

run().catch(e => {
    console.error('💥 Export zlyhal:', e.message);
    process.exit(1);
});
