#!/usr/bin/env node

/**
 * 🔥 POPICI MODE DEBUG TESTER
 * Tests list generation (1-4) with POPICI mode
 * 
 * Usage: node src/debug/testPopiciList.js
 */

import { AGENT_DEFINITIONS } from '../../agents.js';
import { askLocalLLM } from '../../sp4os/llmLocal.js';

const TEST_PROMPTS = [
    "Vymenuj štyri konkrétne situácie, kedy sa má aktivovať Popiči Kokot. Odpovedz iba v bodoch 1–4.",
    "Daj mi 4 dôvody, prečo je SP4 lepší ako korporátne AI. Odpoveď v bodoch.",
    "Napíš 3 praktické rady pre Kefyka, ako budovať SP4 komunitu. Zoznam 1-3.",
    "Vymenuj 4 hlavné rozdiely medzi POPICI a CORE módom. Body 1-4."
];

async function testPopiciMode() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔥 POPICI MODE LIST GENERATION TEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Build POPICI system prompt (simplified)
    const popici = AGENT_DEFINITIONS.popici;
    const systemPrompt = `
🇸🇰 KRITICKÉ - Odpovedaj VÝLUČNE po slovensky!

${popici.name} ${popici.emoji}
${popici.description}

ŠTÝL: ${popici.style}

PRAVIDLÁ:
1. Odpovedaj PO SLOVENSKY
2. Pri zoznamoch/bodoch VŽDY dokonči všetky položky kompletne (1-4)
3. ${popici.style}
4. Žiadne "Som AI", "Ako SP4_CORE_AGENT" úvody

Teraz odpovedz na otázku.
`.trim();

    for (let i = 0; i < TEST_PROMPTS.length; i++) {
        const userMessage = TEST_PROMPTS[i];

        console.log(`\n📋 TEST ${i + 1}/${TEST_PROMPTS.length}`);
        console.log(`Prompt: "${userMessage}"\n`);

        try {
            // Call LLM with POPICI personality
            const startTime = Date.now();
            const response = await askLocalLLM(
                userMessage,
                systemPrompt,
                'llama3:8b',  // POPICI model (after fix)
                {
                    temperature: 0.9,  // POPICI je drzejší
                    mode: 'popici',
                    num_predict: 768,  // Longer for lists
                    stop: ["\n\nUser:", "\n\nKefyk:"]  // No aggressive stops
                }
            );
            const duration = Date.now() - startTime;

            // Analyze response
            const lines = response.split('\n').filter(l => l.trim().length > 0);
            const hasNumberedList = /^[1-4]\./.test(response);
            const listItemCount = (response.match(/^[1-4]\./gm) || []).length;
            const expectedItems = parseInt(userMessage.match(/(\d+)/)?.[1] || '4');
            const isComplete = listItemCount === expectedItems;

            // Display results
            console.log('📝 Response:');
            console.log('─'.repeat(50));
            console.log(response);
            console.log('─'.repeat(50));

            console.log('\n📊 Analysis:');
            console.log(`  Length: ${response.length} chars (${lines.length} lines)`);
            console.log(`  Duration: ${duration}ms`);
            console.log(`  Numbered list: ${hasNumberedList ? '✅' : '❌'}`);
            console.log(`  List items found: ${listItemCount}/${expectedItems}`);
            console.log(`  Status: ${isComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);

            if (!isComplete) {
                console.log(`\n⚠️  WARNING: Expected ${expectedItems} items, got ${listItemCount}`);
                console.log(`   Possible causes:`);
                console.log(`   - Model stopped too early`);
                console.log(`   - Prompt unclear`);
                console.log(`   - Stop sequences too aggressive`);
            }

        } catch (error) {
            console.log('❌ ERROR:', error.message);
        }

        console.log('\n' + '═'.repeat(50));
    }

    console.log('\n✅ Test suite complete!');
}

// Run tests
testPopiciMode().catch(console.error);
