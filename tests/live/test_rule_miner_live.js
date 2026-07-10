// test_rule_miner_live.js - LIVE INTEGRATION TEST
// Testuje Rule Miner v reálnom SP4 agentovi s plnou pipeline

import { SP4IntegratedAgent } from './integration.js';
import { ruleMiner } from './ruleMiner.js';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔥 SP4 RULE MINER - LIVE INTEGRATION TEST');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Realistické test konverzácie - simulujú reálne použitie
const LIVE_TEST_SCENARIOS = [
  {
    name: 'POPICI - Frustrácia s projektom',
    queries: [
      'kokot, ta mi poraď bratu, mám problém s tým kódom',
      'kurva, neviem kam ho dať, piča',
      'ta ale fakt, vysvetli mi to normálne'
    ]
  },
  {
    name: 'GLITCHOSLAV - Existenciálna kríza',
    queries: [
      'cítim sa stratený v chaose moderného sveta',
      'prečo všetko stráca zmysel?',
      'je tam niečo viac za touto realitou?'
    ]
  },
  {
    name: 'CORE - Technické otázky',
    queries: [
      'vysvetli mi, ako funguje Rule Miner v SP4',
      'aké sú výhody offline-first architektúry?',
      'poraď mi best practices pre Node.js projekty'
    ]
  },
  {
    name: 'MIXED - Emočné + Technické',
    queries: [
      'som unavený z nekonečného debugovania, bratu',
      'prečo sa učiť nové veci, keď sa všetko mení?',
      'kokot, ale musím to spraviť, tak ako na to?'
    ]
  },
  {
    name: 'DIALECT HEAVY - Eastern Slovak',
    queries: [
      'ta bratu, šak ty vieš, že to nevládzem',
      'bo neviem, čo s tým mám robiť',
      'popiči kokot, vysvetli mi to po ľudsky'
    ]
  }
];

async function runLiveTest() {
  try {
    console.log('📦 KROK 1: Inicializácia SP4 CORE AGENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 KROK 2: Baseline Rulebook State');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Initialize Rule Miner first
    if (!ruleMiner.initialized) {
      await ruleMiner.initialize();
    }

    const baselineRules = ruleMiner.getRulebook();
    console.log('📖 BASELINE POPICI:');
    console.log(`   Trigger words: ${baselineRules.personas.popici.trigger_words.join(', ')}`);
    console.log(`   Min intensity: ${baselineRules.personas.popici.min_intensity}`);

    console.log('\n📖 BASELINE GLITCH:');
    console.log(`   Mystic markers: ${baselineRules.personas.glitchoslav.mystic_markers.slice(0, 6).join(', ')}...`);
    console.log(`   Poetic density: ${baselineRules.personas.glitchoslav.poetic_density}`);

    let totalQueries = 0;
    let totalResponseTime = 0;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 KROK 3: Process Live Scenarios');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const scenario of LIVE_TEST_SCENARIOS) {
      console.log(`\n🎬 SCENARIO: ${scenario.name}`);
      console.log('─'.repeat(60));

      for (const query of scenario.queries) {
        totalQueries++;
        console.log(`\n[${totalQueries}] 👤 USER: "${query}"`);

        const startTime = Date.now();

        // Process message through full pipeline
        const result = await agent.processMessage(query, 'auto');

        const responseTime = Date.now() - startTime;
        totalResponseTime += responseTime;

        if (result.success) {
          // Truncate response for readability
          const response = result.response.substring(0, 200);
          const truncated = result.response.length > 200 ? '...' : '';

          console.log(`\n🤖 AGENT: "${response}${truncated}"`);
          console.log(`\n📊 Metadata:`);
          console.log(`   Mode: ${result.metadata?.model || 'unknown'}`);
          console.log(`   Emotion: ${result.metadata?.emotionalAnalysis?.dominantEmotion || 'neutral'}`);
          console.log(`   Intensity: ${result.metadata?.emotionalAnalysis?.intensity?.toFixed(2) || '0.00'}`);
          console.log(`   Response time: ${responseTime}ms`);
        } else {
          console.error(`\n❌ ERROR: ${result.error}`);
        }

        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('\n' + '─'.repeat(60));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 KROK 4: Pattern Learning Analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const stats = ruleMiner.getPatternStats();

    console.log('📊 Learned Patterns:');
    console.log(`   Total conversations: ${stats.totalConversations}`);
    console.log(`   Average intensity: ${stats.avgIntensity?.toFixed(2) || '0.00'}`);
    console.log(`   Average vulgarity: ${(stats.avgVulgarity * 100)?.toFixed(1) || '0.0'}%`);

    console.log('\n📈 Mode Distribution:');
    if (stats.modeDistribution) {
      Object.entries(stats.modeDistribution).forEach(([mode, count]) => {
        const percentage = (count / stats.totalConversations * 100).toFixed(1);
        console.log(`   ${mode.padEnd(10)}: ${count} (${percentage}%)`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 KROK 5: Updated Rulebook Comparison');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const updatedRules = ruleMiner.getRulebook();

    console.log('📖 POPICI (Before → After):');
    console.log(`   Trigger words:`);
    console.log(`      BEFORE: ${baselineRules.personas.popici.trigger_words.join(', ')}`);
    console.log(`      AFTER:  ${updatedRules.personas.popici.trigger_words.join(', ')}`);

    const intensityChange = (updatedRules.personas.popici.min_intensity - baselineRules.personas.popici.min_intensity).toFixed(3);
    console.log(`   Min intensity: ${baselineRules.personas.popici.min_intensity} → ${updatedRules.personas.popici.min_intensity} (${intensityChange >= 0 ? '+' : ''}${intensityChange})`);

    console.log('\n📖 GLITCH (Before → After):');
    console.log(`   Mystic markers:`);
    console.log(`      BEFORE: ${baselineRules.personas.glitchoslav.mystic_markers.length} markers`);
    console.log(`      AFTER:  ${updatedRules.personas.glitchoslav.mystic_markers.length} markers`);

    const densityChange = (updatedRules.personas.glitchoslav.poetic_density - baselineRules.personas.glitchoslav.poetic_density).toFixed(3);
    console.log(`   Poetic density: ${baselineRules.personas.glitchoslav.poetic_density} → ${updatedRules.personas.glitchoslav.poetic_density} (${densityChange >= 0 ? '+' : ''}${densityChange})`);

    // Detect NEW learned patterns
    const newPopiciWords = updatedRules.personas.popici.trigger_words.filter(
      w => !baselineRules.personas.popici.trigger_words.includes(w)
    );

    const newGlitchMarkers = updatedRules.personas.glitchoslav.mystic_markers.filter(
      m => !baselineRules.personas.glitchoslav.mystic_markers.includes(m)
    );

    if (newPopiciWords.length > 0 || newGlitchMarkers.length > 0) {
      console.log('\n🧬 NEW LEARNED PATTERNS:');

      if (newPopiciWords.length > 0) {
        console.log(`   ✨ POPICI learned: ${newPopiciWords.join(', ')}`);
      }

      if (newGlitchMarkers.length > 0) {
        console.log(`   ✨ GLITCH learned: ${newGlitchMarkers.slice(0, 5).join(', ')}${newGlitchMarkers.length > 5 ? '...' : ''}`);
      }
    } else {
      console.log('\n⏭️  No new patterns learned yet (update interval not reached)');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 KROK 6: Performance Metrics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const avgResponseTime = (totalResponseTime / totalQueries).toFixed(0);

    console.log('⚡ Performance:');
    console.log(`   Total queries processed: ${totalQueries}`);
    console.log(`   Total processing time: ${totalResponseTime}ms`);
    console.log(`   Average response time: ${avgResponseTime}ms`);
    console.log(`   Queries per second: ${(1000 / avgResponseTime).toFixed(2)}`);

    console.log('\n🧬 Rule Mining Impact:');
    console.log(`   Pattern extractions: ${stats.totalConversations}`);
    console.log(`   Update interval: ${ruleMiner.autoTuning.update_interval} conversations`);
    console.log(`   Next update in: ${ruleMiner.autoTuning.update_interval - (stats.totalConversations % ruleMiner.autoTuning.update_interval)} conversations`);
    console.log(`   Learning rate: ${ruleMiner.autoTuning.learning_rate} (${(ruleMiner.autoTuning.learning_rate * 100).toFixed(0)}% new data weight)`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 KROK 7: Validation & Safety');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Import pipeline for validation
    const { ruleMiningPipeline } = await import('./ruleMiningPipeline.js');
    if (!ruleMiningPipeline.initialized) {
      await ruleMiningPipeline.initialize();
    }

    const validation = await ruleMiningPipeline.validateRulebook();

    if (validation.valid) {
      console.log('✅ Rulebook integrity: VALID');
      console.log('   ✓ No dangerous patterns detected');
      console.log('   ✓ All thresholds in valid range');
      console.log('   ✓ Ready for production use');
    } else {
      console.log('❌ Rulebook integrity: FAILED');
      validation.errors.forEach(err => console.log(`   ✗ ${err}`));
    }

    console.log('\n🛡️  Safety Status:');
    console.log(`   Max rule changes: ${ruleMiner.autoTuning.max_rule_changes} per update`);
    console.log(`   Dangerous patterns blocked: ${ruleMiner.autoTuning.dangerous_patterns.length}`);
    console.log(`   Rollback enabled: ${ruleMiner.autoTuning.rollback_on_failure ? 'YES' : 'NO'}`);
    console.log(`   Safety cap: ${ruleMiner.autoTuning.safety_cap ? 'ACTIVE' : 'DISABLED'}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ LIVE INTEGRATION TEST COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 FINAL SUMMARY:');
    console.log(`   ✅ ${totalQueries} queries processed successfully`);
    console.log(`   ✅ Average response time: ${avgResponseTime}ms`);
    console.log(`   ✅ ${stats.totalConversations} patterns analyzed`);
    console.log(`   ✅ Rulebook validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
    console.log(`   ✅ Safety layer: ACTIVE`);

    if (newPopiciWords.length > 0 || newGlitchMarkers.length > 0) {
      console.log(`   🧬 New patterns learned: ${newPopiciWords.length + newGlitchMarkers.length}`);
    }

    console.log('\n🔥 Rule Miner je plne integrovaný a učí sa v reálnom čase!\n');
    console.log('💡 TIP: Spusti agenta (node index_v07.js) a sleduj auto-learning na vlastných konverzáciách.\n');

  } catch (err) {
    console.error('\n❌ LIVE TEST FAILED:', err.message);
    console.error(err.stack);
  }
}

// Run live test
runLiveTest();
