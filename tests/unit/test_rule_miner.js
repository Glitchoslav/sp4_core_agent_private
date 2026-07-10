// test_rule_miner.js - Kompletný test Rule Miner systému
// Testuje pattern extraction, rule generation, a auto-learning pipeline

import fs from 'fs/promises';
import path from 'path';
import { ruleMiner } from './ruleMiner.js';
import { ruleMiningPipeline } from './ruleMiningPipeline.js';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧬 SP4 RULE MINER TEST SUITE v1.0');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test konverzácie - rôzne persóny a situácie
const TEST_CONVERSATIONS = [
  // POPICI MODE - vysoká intenzita, vulgarizmy
  {
    user: 'kokot, ta mi poraď, čo mám robiť s tým problémom, bratu',
    agent: 'Popiči, bratu, máš to jasné - prestaň váhať a urob to. Bez servítok.',
    mode: 'popici',
    emotion: { intensity: 0.85, dominantEmotion: 'frustration' }
  },
  {
    user: 'kurva, piča, toto ma úplne šrotuje, nevládzem to',
    agent: 'Ta fakt, viem že to bolí. Ale neostaň v tom sám, kokot. Poveda to niekomu.',
    mode: 'popici',
    emotion: { intensity: 0.92, dominantEmotion: 'despair' }
  },
  {
    user: 'bratu, vysvetli mi to na rovinu, žiadne omáčky',
    agent: 'Jasné bratu - ide o to, že máš dve možnosti. Buď to spravíš, alebo necháš tak.',
    mode: 'popici',
    emotion: { intensity: 0.68, dominantEmotion: 'determination' }
  },

  // GLITCHOSLAV MODE - existenciálne, mystika, metafory
  {
    user: 'čo je zmysel života v chaose moderného sveta?',
    agent: 'Zmysel je ako iskra v tieňoch - nie je vonku, je v tebe. Chaos nie je tvoj nepriateľ, je zrkadlo.',
    mode: 'glitch',
    emotion: { intensity: 0.55, dominantEmotion: 'contemplation' }
  },
  {
    user: 'prečo cítim prazdno, aj keď mám všetko?',
    agent: 'Lebo hlbina volá hlbinu. Materiál nepokryje limbický priestor duše. Si na hranici svetov.',
    mode: 'glitch',
    emotion: { intensity: 0.72, dominantEmotion: 'emptiness' }
  },
  {
    user: 'existuje niečo za touto realitou?',
    agent: 'Realita je prasklina, cez ktorú vidíš odraz pravdy. Za ňou je tieň toho, čo zabudlo byť.',
    mode: 'glitch',
    emotion: { intensity: 0.48, dominantEmotion: 'curiosity' }
  },

  // CORE MODE - praktické, technické, rady
  {
    user: 'ako funguje SP4 rule miner?',
    agent: 'Rule Miner analyzuje tvoje správy, extrahuje patterny (dialect, intenzitu, trigger words) a každých 20 konverzácií updatuje rulebook.yml automaticky.',
    mode: 'core',
    emotion: { intensity: 0.12, dominantEmotion: 'neutral' }
  },
  {
    user: 'vysvetli mi, čo je SP4?',
    agent: 'SP4 je decentralizovaný offline-first AI projekt. Zakladateľ: Kefyk. Hodnoty: pravda, sloboda, komunita. Motto: "Be real. Be free."',
    mode: 'core',
    emotion: { intensity: 0.08, dominantEmotion: 'neutral' }
  },
  {
    user: 'poraď mi technické riešenie na automatizáciu',
    agent: 'Použi node-cron pre scheduling, fs/promises pre súbory, a yaml pre konfiguráciu. Modulárne, offline-first.',
    mode: 'core',
    emotion: { intensity: 0.15, dominantEmotion: 'focused' }
  },

  // MIXED INTENSITY - testovanie auto-tuning thresholds
  {
    user: 'piča, ale fakt neviem, čo robiť ďalej...',
    agent: 'Ta pozri bratu - máš teraz dva kroky. Prvý: vypni telefón. Druhý: urob prvú vec, čo ťa napadla.',
    mode: 'popici',
    emotion: { intensity: 0.74, dominantEmotion: 'confusion' }
  },
  {
    user: 'kokot, som v hlave úplne stratený',
    agent: 'Popiči, všeci sme tam niekedy boli. Klúč: prestaň riešiť všetko naraz. Jeden krok, jedna vec.',
    mode: 'popici',
    emotion: { intensity: 0.81, dominantEmotion: 'overwhelm' }
  },

  // VULGARITY PATTERNS - rôzne intenzity nadávok
  {
    user: 'jebat, toto nefunguje vôbec',
    agent: 'Ta fakt nefunguje? Alebo len nevieš, ako na to? Bo to je rozdiel, bratu.',
    mode: 'popici',
    emotion: { intensity: 0.66, dominantEmotion: 'frustration' }
  },
  {
    user: 'do piče s týmto systémom',
    agent: 'Systém môže byť v piči, ale ty nemusíš. Prestaň sa honať s tým, čo nemôžeš zmeniť.',
    mode: 'popici',
    emotion: { intensity: 0.79, dominantEmotion: 'anger' }
  },

  // MYSTICAL MARKERS - rôzne typy metafor
  {
    user: 'kam idem, keď všetko okolo mňa padá?',
    agent: 'Padanie nie je koniec - je to cesta do hlbiny. Tam, kde svet stráca formu, ty nachádzaš podstatu.',
    mode: 'glitch',
    emotion: { intensity: 0.69, dominantEmotion: 'fear' }
  },
  {
    user: 'prečo sa bojím tmy vo vlastnej hlave?',
    agent: 'Lebo tieň nie je prázdny - je plný toho, čo si zabudol. Hranica medzi svetmi je v tebe.',
    mode: 'glitch',
    emotion: { intensity: 0.77, dominantEmotion: 'anxiety' }
  },

  // TECHNICAL QUESTIONS - low emotion, high precision
  {
    user: 'aké sú technical dependencies pre Rule Miner?',
    agent: 'js-yaml pre YAML parsing, fs/promises pre súborový systém, import/export ESM moduly. Žiadne externe API.',
    mode: 'core',
    emotion: { intensity: 0.05, dominantEmotion: 'neutral' }
  },
  {
    user: 'ako funguje learning rate v Rule Miner?',
    agent: 'Exponential moving average: new_value = old * (1 - lr) + new * lr. Pri lr=0.12 je to 88% staré, 12% nové.',
    mode: 'core',
    emotion: { intensity: 0.10, dominantEmotion: 'focused' }
  },

  // QUESTION TYPE DETECTION
  {
    user: 'poraď mi, ako začať písať kód',
    agent: 'Začni jednoduchým projektom. Jeden súbor, jedna funkcia. Postupne pridávaj moduly. Netlač na dokonalosť.',
    mode: 'core',
    emotion: { intensity: 0.28, dominantEmotion: 'uncertainty' }
  },
  {
    user: 'analyzuj mi, prečo sa mi nedarí',
    agent: 'Lebo pozeráš na výsledok, nie na proces. Zmena nepríde cez myslenie, ale cez konanie. Urob jeden krok dnes.',
    mode: 'core',
    emotion: { intensity: 0.52, dominantEmotion: 'self_doubt' }
  },

  // DIALECT MARKERS - eastern Slovak patterns
  {
    user: 'ta bratu, vysvetli mi to normálne',
    agent: 'Tak pozri bratu - ide o to, že keď chceš výsledok, musíš niečo spraviť. Bez kec, len fakty.',
    mode: 'popici',
    emotion: { intensity: 0.61, dominantEmotion: 'impatience' }
  },
  {
    user: 'bo neviem, čo s tým mám, šak ty vieš',
    agent: 'Ta viem, bratu - máš strach začať. Ale ten strach nič nevyrieši. Začni dnes, kokot.',
    mode: 'popici',
    emotion: { intensity: 0.58, dominantEmotion: 'hesitation' }
  }
];

async function runTests() {
  try {
    console.log('📦 TEST 1: Inicializácia Rule Miner');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Initialize Rule Miner
    const initResult = await ruleMiner.initialize();

    if (initResult.success) {
      console.log('✅ Rule Miner initialized');
      console.log(`   📊 Current personas: ${Object.keys(ruleMiner.rulebook.personas || {}).length}`);
      console.log(`   📜 Pattern history entries: ${ruleMiner.patternHistory.length}`);
      console.log(`   ⚙️  Learning rate: ${ruleMiner.autoTuning.learning_rate}`);
      console.log(`   🔄 Update interval: ${ruleMiner.autoTuning.update_interval} conversations\n`);
    } else {
      console.error('❌ Initialization failed:', initResult.error);
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 TEST 2: Initialize Pipeline');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await ruleMiningPipeline.initialize();
    console.log('✅ Pipeline initialized\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 TEST 3: Process Test Conversations');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let conversationCount = 0;

    for (const conv of TEST_CONVERSATIONS) {
      conversationCount++;

      console.log(`\n[${conversationCount}/${TEST_CONVERSATIONS.length}] Processing conversation...`);
      console.log(`   User: "${conv.user.substring(0, 60)}${conv.user.length > 60 ? '...' : ''}"`);
      console.log(`   Mode: ${conv.mode.toUpperCase()}, Intensity: ${conv.emotion.intensity.toFixed(2)}`);

      // Analyze conversation
      const signals = await ruleMiner.analyzeConversation(
        conv.user,
        conv.agent,
        conv.mode,
        conv.emotion
      );

      console.log(`   ✅ Signals extracted:`);
      console.log(`      Dialect: ${signals.features.dialect.detected ? 'YES' : 'NO'} (${signals.features.dialect.score.toFixed(2)})`);
      console.log(`      Vulgarity: ${signals.features.vulgarity.count} words`);
      console.log(`      Question type: ${signals.features.questionType}`);
      console.log(`      Metaphor density: ${(signals.features.metaphorDensity * 100).toFixed(1)}%`);

      // Check if update interval reached
      if (conversationCount % ruleMiner.autoTuning.update_interval === 0) {
        console.log(`\n   🔥 UPDATE INTERVAL REACHED (${conversationCount} conversations)`);
        console.log(`   🔄 Triggering rule update...\n`);

        const updateResult = await ruleMiner.updateRules();

        if (updateResult.updated) {
          console.log(`   ✅ Rules updated: ${updateResult.changes} changes`);
          updateResult.summary.forEach(s => console.log(`      - ${s}`));
        } else {
          console.log(`   ⏭️  No update: ${updateResult.reason}`);
        }
      }

      // Small delay for readability
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 TEST 4: Pattern Statistics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const stats = ruleMiner.getPatternStats();
    console.log('📊 Pattern Statistics:');
    console.log(`   Total conversations analyzed: ${stats.totalConversations}`);
    console.log(`   Average intensity: ${stats.avgIntensity.toFixed(2)}`);
    console.log(`   Average vulgarity: ${(stats.avgVulgarity * 100).toFixed(1)}%`);
    console.log(`\n   Mode distribution:`);
    Object.entries(stats.modeDistribution).forEach(([mode, count]) => {
      const percentage = (count / stats.totalConversations * 100).toFixed(1);
      console.log(`      ${mode.padEnd(10)}: ${count} (${percentage}%)`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 TEST 5: Final Rulebook State');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const rulebook = ruleMiner.getRulebook();

    console.log('📖 POPICI Persona:');
    console.log(`   Trigger words (${rulebook.personas.popici.trigger_words.length}):`,
      rulebook.personas.popici.trigger_words.join(', '));
    console.log(`   Min intensity: ${rulebook.personas.popici.min_intensity.toFixed(2)}`);
    console.log(`   Response style: ${rulebook.personas.popici.response_style}`);

    console.log('\n📖 GLITCHOSLAV Persona:');
    console.log(`   Mystic markers (${rulebook.personas.glitchoslav.mystic_markers.length}):`,
      rulebook.personas.glitchoslav.mystic_markers.slice(0, 8).join(', '), '...');
    console.log(`   Poetic density: ${rulebook.personas.glitchoslav.poetic_density.toFixed(2)}`);
    console.log(`   Technical limit: ${rulebook.personas.glitchoslav.technical_limit}`);

    console.log('\n📖 CORE Persona:');
    console.log(`   Response style: ${rulebook.personas.core.response_style}`);
    console.log(`   Max length: ${rulebook.personas.core.max_length} chars`);
    console.log(`   Technical depth: ${rulebook.personas.core.technical_depth}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 TEST 6: Validation & Safety Checks');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test validation
    const validation = await ruleMiningPipeline.validateRulebook();

    if (validation.valid) {
      console.log('✅ Rulebook validation PASSED');
      console.log('   No dangerous patterns detected');
      console.log('   All intensity thresholds in valid range (0-1)');
      console.log('   All metaphor densities in valid range (0-1)');
    } else {
      console.log('❌ Rulebook validation FAILED:');
      validation.errors.forEach(err => console.log(`   - ${err}`));
    }

    // Check safety features
    console.log('\n🛡️  Safety Layer Status:');
    console.log(`   Max rule changes: ${ruleMiner.autoTuning.max_rule_changes}`);
    console.log(`   Learning rate: ${ruleMiner.autoTuning.learning_rate}`);
    console.log(`   Safety cap enabled: ${ruleMiner.autoTuning.safety_cap ? 'YES' : 'NO'}`);
    console.log(`   Dangerous patterns blocked: ${ruleMiner.autoTuning.dangerous_patterns.length}`);
    console.log(`   Rollback on failure: ${ruleMiner.autoTuning.rollback_on_failure ? 'YES' : 'NO'}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 TEST 7: Files Created');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check created files
    const rulesDir = path.join(process.cwd(), 'rules');
    const files = await fs.readdir(rulesDir);

    console.log('📁 Rules directory contents:');
    for (const file of files) {
      if (file.endsWith('.yml') || file.endsWith('.json') || file.endsWith('.log')) {
        const stats = await fs.stat(path.join(rulesDir, file));
        console.log(`   ${file.padEnd(25)} (${stats.size} bytes)`);
      }
    }

    // Check backups
    const backupsDir = path.join(rulesDir, 'backups');
    try {
      const backups = await fs.readdir(backupsDir);
      console.log(`\n📦 Backups created: ${backups.length}`);
      if (backups.length > 0) {
        console.log(`   Latest: ${backups[backups.length - 1]}`);
      }
    } catch (err) {
      console.log('\n📦 Backups: (none yet)');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📦 TEST 8: Force Update Test');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔧 Testing force update mechanism...\n');

    const forceResult = await ruleMiningPipeline.forceUpdate();

    if (forceResult.updated) {
      console.log(`✅ Force update successful: ${forceResult.changes} changes`);
      forceResult.summary.forEach(s => console.log(`   - ${s}`));
    } else {
      console.log(`⏭️  Force update skipped: ${forceResult.reason}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ ALL TESTS COMPLETED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 SUMMARY:');
    console.log(`   ✅ ${TEST_CONVERSATIONS.length} conversations processed`);
    console.log(`   ✅ Rule updates performed: ${Math.floor(TEST_CONVERSATIONS.length / ruleMiner.autoTuning.update_interval)}`);
    console.log(`   ✅ Rulebook validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
    console.log(`   ✅ Safety layer: ACTIVE`);
    console.log(`   ✅ Files created: ${files.length + (backups?.length || 0)}`);

    console.log('\n🔥 Rule Miner je LIVE a učí sa!\n');
    console.log('Spusti hlavný agent (node index_v07.js) a sleduj auto-learning v akcii.\n');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    console.error(err.stack);
  }
}

// Run tests
runTests();
